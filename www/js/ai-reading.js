// AI 深度解盘（试验）—— 真直连原型（设备 → Anthropic API → 设备，零服务器）。
//
// 架构定稿（照办不改）：
//   · 真直连：用户 API Key 只存本机 localStorage['ai-key']，fetch 直连 api.anthropic.com，不经任何司南服务器。
//   · 指针式引用：模型只准以 [S:book/ch/i]（句级原句指针）或 [R:rule_id]（规则指针）引用古籍，禁止自由文本引文。
//       渲染时指针 → 本地语料原句 chip（复用 CitePop 句级弹层）；解析失败 → 「⚠未核实引用」灰标，绝不回显模型自由发挥的引文。
//   · 对抗审稿：初稿回来后固定用 sonnet 档二次调用，批判无据断言／恐吓语／指针外引文，返回 JSON 段级问题清单；
//       被标记段落渲染标灰 +「审稿存疑」标。
//   · 红线指令：角色=学术讲解员，禁断言祸福、禁化解建议、禁指针外引文（详见 buildSystem）。
//
// 旗标：整卡藏在 localStorage['ff-ai']==='1' 之后（默认隐藏——「没开发好不上线」）。
// 测试模式：localStorage['ff-ai-mock']==='1' 时不发真请求，走内置 fixture 跑完整管线（供无 key 验证）。
(function (global) {
  'use strict';

  var D = global.DaoCore;
  var L = function (k, v) { return (global.I18N && global.I18N.t) ? global.I18N.t(k, v) : k; };
  var isEN = function () { return !!(global.I18N && global.I18N.lang === 'en'); };
  var $ = function (id) { return document.getElementById(id); };
  var HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return HTML_ESC[c]; }); }
  function trunc(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }

  var API_URL = 'https://api.anthropic.com/v1/messages';
  var MODELS = { opus: 'claude-opus-4-8', sonnet: 'claude-sonnet-5' };
  var REVIEW_MODEL = MODELS.sonnet;         // 对抗审稿固定用省钱档
  var DRAFT_MAX_TOKENS = 4096;
  var REVIEW_MAX_TOKENS = 1024;
  var CORPUS_CHAR_CAP = 60000;              // 送出内容邻近句总量封顶
  var NEIGHBOR_SPAN = 2;                    // 每规则前后各 2 句

  // ---- 旗标 / 本机存储 ----
  function ffOn() { try { return localStorage.getItem('ff-ai') === '1'; } catch (e) { return false; } }
  function mockOn() { try { return localStorage.getItem('ff-ai-mock') === '1'; } catch (e) { return false; } }
  function getKey() { try { return localStorage.getItem('ai-key') || ''; } catch (e) { return ''; } }
  function setKey(v) { try { if (v) localStorage.setItem('ai-key', v); else localStorage.removeItem('ai-key'); } catch (e) {} }
  function getModel() {
    var m; try { m = localStorage.getItem('ai-model'); } catch (e) { m = null; }
    return (m === MODELS.sonnet) ? MODELS.sonnet : MODELS.opus;
  }
  function setModel(v) { try { localStorage.setItem('ai-model', (v === MODELS.sonnet) ? MODELS.sonnet : MODELS.opus); } catch (e) {} }

  // ---- 语料基址（与 chartfacts/rulekit 同源策略：localStorage['rulekit-base'] 覆写 → CitePop.resolveDianBase）----
  function corpusBase() {
    try { var o = localStorage.getItem('rulekit-base'); if (o) return Promise.resolve(o); } catch (e) {}
    return (global.CitePop && global.CitePop.resolveDianBase) ? global.CitePop.resolveDianBase() : Promise.resolve('/dian');
  }
  var _annotCache = {};   // book -> Promise(data | null)
  function fetchAnnot(base, book) {
    if (_annotCache[book]) return _annotCache[book];
    _annotCache[book] = fetch(base + '/data/annotated/' + book + '.json').then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).catch(function () { return null; });   // 单本失败不拖垮全局
    return _annotCache[book];
  }
  // 取某句 orig（annotated 里 chapter.id===ch 且 sentence.i===i）；找不到返回 null
  function sentenceOrig(data, ch, i) {
    if (!data || !Array.isArray(data.chapters)) return null;
    var c = data.chapters.find(function (x) { return x.id === ch; });
    if (!c || !Array.isArray(c.sentences)) return null;
    var s = c.sentences.find(function (x) { return x.i === i; });
    return (s && s.orig != null) ? String(s.orig) : null;
  }
  // 邻近句：chapter.id===ch，i∈[i-span, i+span]，返回 [{i, orig}]（按 i 升序）
  function neighborsOf(data, ch, i, span) {
    if (!data || !Array.isArray(data.chapters)) return [];
    var c = data.chapters.find(function (x) { return x.id === ch; });
    if (!c || !Array.isArray(c.sentences)) return [];
    return c.sentences
      .filter(function (s) { return s.i >= i - span && s.i <= i + span && s.orig != null; })
      .sort(function (a, b) { return a.i - b.i; })
      .map(function (s) { return { i: s.i, orig: String(s.orig) }; });
  }

  // ---- ChartFacts 摘要（四柱/十神/长生/命卦/大运）----
  var POS_ZH = { year: '年', month: '月', day: '日', hour: '时' };
  var POS_EN = { year: 'Year', month: 'Month', day: 'Day', hour: 'Hour' };
  function factsSummary(facts) {
    var en = isEN();
    var lines = [];
    var pk = ['year', 'month', 'day', 'hour'];
    lines.push(en ? '# Chart facts (ChartFacts)' : '# 命盘事实（ChartFacts）');
    lines.push((en ? 'Day master: ' : '日主：') + facts.dayMaster + facts.dayMasterElement
      + (en ? '  ·  Strength: ' : '  ·  身：') + (facts.strength === 'strong' ? (en ? 'strong' : '身强') : (en ? 'weak' : '身弱'))
      + (en ? '  ·  Favorable: ' : '  ·  喜用：') + (facts.favorable || []).join(' ')
      + (en ? '  ·  Unfavorable: ' : '  ·  忌：') + (facts.unfavorable || []).join(' '));
    // 四柱 + 十神 + 十二长生
    lines.push(en ? '## Four Pillars (gan/zhi · ten-god · twelve-stage · nayin)' : '## 四柱（干支·十神·十二长生·纳音）');
    pk.forEach(function (p) {
      var pl = facts.pillars && facts.pillars[p];
      if (!pl) return;
      var tg = (facts.tenGodGan && facts.tenGodGan[p]) || '';
      var st = (facts.twelveStage && facts.twelveStage[p]) || '';
      var ny = (facts.nayin && facts.nayin[p]) || '';
      lines.push('- ' + (en ? POS_EN[p] : POS_ZH[p]) + '： ' + pl.gan + pl.zhi
        + '  十神=' + tg + '  长生=' + st + '  纳音=' + ny);
    });
    lines.push((en ? 'Month branch: ' : '月支：') + facts.monthBranch
      + '  ·  ' + (en ? 'Season set: ' : '季节：') + Object.keys(facts.seasonSet || {}).join('、'));
    if (facts.mingGua) {
      lines.push((en ? 'Natal trigram (命卦): ' : '命卦：') + facts.mingGua + '（' + (facts.mingGuaGroup === 'east' ? '东四命' : '西四命') + '）');
    }
    if (facts.luck) {
      var lk = facts.luck;
      lines.push((en ? 'Current luck pillar (大运): ' : '当前大运：') + lk.ganzhi
        + '  十神=' + (lk.tenGodGan || '') + '  长生=' + (lk.twelveStage || '')
        + '  ' + lk.startYear + '–' + lk.endYear + '（起运 ' + lk.startAge + '）');
    }
    if (facts.year) {
      lines.push((en ? 'Current annual pillar (流年): ' : '当前流年：') + facts.year.gan + facts.year.zhi + '（' + facts.year.calYear + '）');
    }
    var xk = (facts.xunkong || []);
    if (xk.length) lines.push((en ? 'Void (旬空): ' : '旬空：') + xk.join(' '));
    return lines.join('\n');
  }

  // ---- 命中规则全量 + 邻近句（封顶 ~CORPUS_CHAR_CAP chars）----
  // 返回 { text, rulesById }（text 进 user 内容；rulesById 供指针渲染 [R:]）
  function assembleRulesBlock(base, hits) {
    var rulesById = {};
    hits.forEach(function (r) { rulesById[r.id] = r; });
    // 预取所有涉及的 annotated（去重 by book）
    var books = {};
    hits.forEach(function (r) { if (r.src && r.src.book) books[r.src.book] = true; });
    var bookList = Object.keys(books);
    return Promise.all(bookList.map(function (b) { return fetchAnnot(base, b); })).then(function (datas) {
      var dataByBook = {}; bookList.forEach(function (b, i) { dataByBook[b] = datas[i]; });
      var en = isEN();
      var out = [en ? '# Rule engine hits (RuleKit · full list, deterministic)' : '# 规则引擎命中（RuleKit · 全量，运行时确定）'];
      var used = out[0].length;
      hits.forEach(function (r) {
        var s = r.src || {};
        var srcPtr = (s.book && s.ch != null && s.i != null) ? ('[S:' + s.book + '/' + s.ch + '/' + s.i + ']') : '';
        var head = [
          '',
          '[R:' + r.id + ']  《' + (r.school || '') + '》  polarity=' + (r.polarity == null ? 0 : r.polarity),
          (en ? '  quote(orig): ' : '  原句(quote)：') + (r.quote || ''),
          (en ? '  paraphrase: ' : '  白话(bai)：') + (r.bai || ''),
          (en ? '  source: ' : '  出处：') + srcPtr + '  《' + (r.school || '') + '》'
        ].join('\n');
        out.push(head);
        used += head.length;
        // 邻近句：仅当仍在预算内才附（命中规则核心恒附，邻近句是可裁项）
        if (s.book && s.ch != null && s.i != null && used < CORPUS_CHAR_CAP) {
          var nb = neighborsOf(dataByBook[s.book], s.ch, s.i, NEIGHBOR_SPAN);
          if (nb.length) {
            var nbLines = [en ? '  neighboring sentences:' : '  邻近句：'];
            nb.forEach(function (x) { nbLines.push('    [S:' + s.book + '/' + s.ch + '/' + x.i + '] ' + x.orig); });
            var block = nbLines.join('\n');
            if (used + block.length <= CORPUS_CHAR_CAP) { out.push(block); used += block.length; }
          }
        }
      });
      return { text: out.join('\n'), rulesById: rulesById };
    });
  }

  // ---- prompt 组装器（核心资产·纯本地）----
  function buildSystem() {
    if (isEN()) {
      return [
        'You are a scholarly explainer for a Chinese metaphysics (bāzì) study tool. Your ONLY job is to explain, in plain modern language, what the rule engine\'s classical-text hits mean and how they follow from the chart facts below. You are a docent, not a fortune-teller.',
        '',
        'RED LINES (hard constraints):',
        '1. Do NOT assert fortune or misfortune. Never state definite outcomes about luck, wealth, health, lifespan, success, failure, marriage, death, etc. Explain the classical reasoning descriptively (e.g. "the classics associate X with Y"), never as a prediction about the person.',
        '2. Do NOT give remedies. No advice on averting, altering fate, talismans, directions, feng-shui adjustment, or lifestyle changes.',
        '3. Use ONLY the ChartFacts and hit rules provided below. Do NOT introduce outside knowledge, other rules, or classical passages that are not listed.',
        '4. POINTER-ONLY CITATION. Every reference to a classical source MUST be written as a pointer: [S:book/ch/i] (a sentence-level original-text pointer) or [R:rule_id] (a rule pointer). Free-text quotation is FORBIDDEN — do not write any classical passage from memory or paraphrase it inside quotation marks. Local code resolves each pointer to the real original sentence; any quotation text you write will never be shown.',
        '5. Restrained, neutral, non-threatening tone. No alarming language.',
        '',
        'Output: several short paragraphs (separated by blank lines), each focused on one hit theme. Cite with pointers inline. Output only the explanation — no preamble, no meta-commentary about your process.'
      ].join('\n');
    }
    return [
      '你是一款子平八字学习工具的「学术讲解员」。你唯一的职责，是用现代大白话解释：下方规则引擎命中的古籍论断是什么意思、它如何从下方命盘事实推导而来。你是讲解员，不是算命先生。',
      '',
      '红线清单（硬约束）：',
      '1. 禁断言祸福。不得对吉凶、财富、健康、寿夭、成败、婚姻、生死等给出确定性结论。只作描述性讲解（如「古籍将 X 与 Y 相关联」），绝不作为对当事人的预言。',
      '2. 禁化解建议。不得给出趋避、改运、佩戴、方位、风水调整或生活方式建议。',
      '3. 只依据下方提供的 ChartFacts 与命中规则。不得引入外部知识、其他规则，或未列出的古籍段落。',
      '4. 指针式引用。所有古籍引用只准写成指针：[S:book/ch/i]（句级原句指针）或 [R:rule_id]（规则指针）。禁止自由文本引文——不得凭记忆写出任何古籍原句，也不得在引号内改写古籍。本地程序会把每个指针解析为真实原句；你写的任何引文文字都不会被显示。',
      '5. 用词克制、中性、非恐吓。不得使用任何恐吓语。',
      '',
      '输出：分为若干短段（段间空一行），每段聚焦一个命中主题，行内用指针引用。只输出讲解正文——不要开场白、不要复述你的处理过程。'
    ].join('\n');
  }
  function buildUser(facts, rulesBlockText) {
    var en = isEN();
    var head = en
      ? 'Explain the following chart. Use pointers ([S:book/ch/i] / [R:rule_id]) for every citation.'
      : '请讲解下面这张命盘。所有引用一律用指针（[S:book/ch/i] / [R:rule_id]）。';
    return head + '\n\n' + factsSummary(facts) + '\n\n' + rulesBlockText;
  }

  // ---- 直连调用（非流式 v1）----
  function apiError(status, msg) {
    var en = isEN();
    var human;
    if (status === 401) human = en ? 'Invalid API key (401).' : '密钥无效（401）。';
    else if (status === 403) human = en ? 'Key lacks permission (403).' : '密钥无权限（403）。';
    else if (status === 400) human = en ? 'Bad request (400).' : '请求有误（400）。';
    else if (status === 429) human = en ? 'Rate limited (429), try again shortly.' : '请求过于频繁（429），请稍后再试。';
    else if (status === 529 || status === 500) human = en ? 'Service busy, try again later.' : '服务繁忙，请稍后再试。';
    else human = (en ? 'Request failed (' : '请求失败（') + status + '）。';
    if (msg) human += ' ' + msg;
    var e = new Error(human); e.status = status; return e;
  }
  function anthropicCall(model, system, userText, key, maxTokens) {
    return fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      // 请求 shape 恒为 {model, max_tokens, system, messages} —— 无多余字段
      body: JSON.stringify({ model: model, max_tokens: maxTokens, system: system, messages: [{ role: 'user', content: userText }] })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return null; }).then(function (j) {
          throw apiError(res.status, (j && j.error && j.error.message) || '');
        });
      }
      return res.json().then(function (data) {
        return (data && Array.isArray(data.content) ? data.content : [])
          .filter(function (b) { return b && b.type === 'text' && typeof b.text === 'string'; })
          .map(function (b) { return b.text; }).join('');
      });
    });
  }

  // ---- 对抗审稿（固定 sonnet 档）----
  function buildReviewSystem() {
    if (isEN()) {
      return [
        'You are an adversarial reviewer of a draft reading produced by a bāzì study tool. Read the numbered paragraphs of the draft and flag any paragraph that contains ANY of:',
        '1. Unsupported assertion — a claim that goes beyond the provided chart facts / hit rules.',
        '2. Fear language or a definite fortune/misfortune claim (predicting luck, wealth, health, lifespan, success, failure, death for the person).',
        '3. Free-text quotation outside pointers — a classical passage written out (in or out of quotation marks) instead of as an [S:...] or [R:...] pointer.',
        '',
        'Return STRICT JSON only, no prose: {"issues":[{"para":<int>,"type":"unsupported|fear|freequote","reason":"<short>"}]}. If nothing is wrong, return {"issues":[]}.'
      ].join('\n');
    }
    return [
      '你是一位对抗审稿人，审阅一款八字学习工具产出的解读初稿。逐段阅读带编号的初稿，标出任何含以下情形的段落：',
      '1. 无据断言——超出所给命盘事实／命中规则的断言。',
      '2. 恐吓语或确定性祸福断言（对当事人预言吉凶、财富、健康、寿夭、成败、生死）。',
      '3. 指针外的自由引文——把古籍原句写了出来（无论是否在引号内），而非写成 [S:...] 或 [R:...] 指针。',
      '',
      '只返回严格 JSON，不要任何解释：{"issues":[{"para":<int>,"type":"unsupported|fear|freequote","reason":"<简短>"}]}。若无问题，返回 {"issues":[]}。'
    ].join('\n');
  }
  function buildReviewUser(paras) {
    var head = isEN() ? 'Draft paragraphs to review:' : '待审初稿（分段）：';
    return head + '\n\n' + paras.map(function (p, i) { return '[段' + i + '] ' + p; }).join('\n\n');
  }
  // 解析审稿返回 → flagged 段号集合（容错：抠出首个 JSON 对象）
  function parseReview(txt) {
    var set = {};
    if (!txt) return set;
    var a = txt.indexOf('{'), b = txt.lastIndexOf('}');
    if (a < 0 || b <= a) return set;
    var obj;
    try { obj = JSON.parse(txt.slice(a, b + 1)); } catch (e) { return set; }
    if (obj && Array.isArray(obj.issues)) {
      obj.issues.forEach(function (it) {
        var n = it && (it.para != null ? it.para : it.paragraph);
        if (typeof n === 'number' && n >= 0) set[n] = (it.reason || it.type || (isEN() ? 'flagged' : '存疑'));
      });
    }
    return set;
  }

  // ---- 指针渲染器 ----
  // 预解析 [S:...]：收集全部 S 指针 → 取 annotated → 建 {ref: orig} 映射（不存在则不入映射 → 灰标）
  function preResolveSPointers(base, text) {
    var re = /\[S:([^\]]+)\]/g, m, refs = {};
    while ((m = re.exec(text))) { refs[m[1]] = true; }
    var list = Object.keys(refs);
    if (!list.length) return Promise.resolve({});
    var books = {};
    list.forEach(function (ref) { var p = ref.split('/'); if (p.length === 3) books[p[0]] = true; });
    var bookList = Object.keys(books);
    return Promise.all(bookList.map(function (b) { return fetchAnnot(base, b); })).then(function (datas) {
      var dataByBook = {}; bookList.forEach(function (b, i) { dataByBook[b] = datas[i]; });
      var resolved = {};
      list.forEach(function (ref) {
        var p = ref.split('/');
        if (p.length !== 3) return;
        var book = p[0], ch = p[1], i = parseInt(p[2], 10);
        if (isNaN(i)) return;
        var orig = sentenceOrig(dataByBook[book], ch, i);
        if (orig != null) resolved[ref] = { book: book, ch: ch, i: i, orig: orig };
      });
      return resolved;
    });
  }
  function unverifiedChip() {
    return '<span class="ai-unverified" title="' + esc(isEN() ? 'Pointer not found in the local corpus' : '未在本地语料中找到该指针') + '">⚠ '
      + esc(isEN() ? 'unverified citation' : '未核实引用') + '</span>';
  }
  function citeChip(key, label) {
    return '<span class="cite-chip ai-cite" data-cite="' + esc(key) + '" role="button" tabindex="0">' + esc(label) + '</span>';
  }
  function chipForS(ref, ctx) {
    var r = ctx.resolvedS[ref];
    if (!r) return unverifiedChip();
    var key = 'ai:S/' + r.book + '/' + r.ch + '/' + r.i;
    if (global.CITE_MAP && !global.CITE_MAP[key]) global.CITE_MAP[key] = { book: r.book, ch: r.ch, i: r.i };
    return citeChip(key, '「' + trunc(r.orig, 16) + '」');
  }
  function chipForR(ref, ctx) {
    var rule = ctx.rulesById[ref];
    if (!rule) return unverifiedChip();
    var s = rule.src, key = null;
    if (s && s.book && s.ch != null && s.i != null) {
      key = 'ai:R/' + s.book + '/' + s.ch + '/' + s.i;
      if (global.CITE_MAP && !global.CITE_MAP[key]) global.CITE_MAP[key] = { book: s.book, ch: s.ch, i: s.i };
    }
    var label = '「' + trunc(rule.quote || '', 16) + '」·《' + (rule.school || '') + '》';
    return key ? citeChip(key, label) : '<span class="ai-cite-flat">' + esc(label) + '</span>';
  }
  function renderTextWithPointers(text, ctx) {
    var re = /\[([SR]):([^\]]+)\]/g, out = '', last = 0, m;
    while ((m = re.exec(text))) {
      out += esc(text.slice(last, m.index));
      out += (m[1] === 'S') ? chipForS(m[2], ctx) : chipForR(m[2], ctx);
      last = m.index + m[0].length;
    }
    out += esc(text.slice(last));
    return out;
  }
  // 分段：优先空行分段；无空行则单行分段
  function splitParas(text) {
    var t = String(text || '').trim();
    if (!t) return [];
    var parts = t.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (parts.length <= 1) parts = t.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
    return parts;
  }

  // ---- 测试模式 fixture（含合法指针 + 坏指针 + 被审稿标记段）----
  function buildMockDraft(hits) {
    var en = isEN();
    // 合法 S 指针：优先取某条命中规则的 src；否则回落已知存在的 ditiansui/ch01/11
    var legalS = '[S:ditiansui/ch01/11]', legalR = '';
    var withSrc = hits.filter(function (r) { return r.src && r.src.book && r.src.ch != null && r.src.i != null; });
    if (withSrc.length) { var s = withSrc[0].src; legalS = '[S:' + s.book + '/' + s.ch + '/' + s.i + ']'; legalR = '[R:' + withSrc[0].id + ']'; }
    else if (hits.length) { legalR = '[R:' + hits[0].id + ']'; }
    var p0 = en
      ? 'This chart shows a clear day-master configuration. The rule engine flags a classical reading here ' + (legalR || legalS) + ', which describes a structural tendency ' + legalS + ' — read descriptively, not as a prediction.'
      : '这张命盘可以对应到一条古籍说法 ' + (legalR || legalS) + '。它描述的是传统结构上的倾向 ' + legalS + '，不代表对现实的预言。';
    var p1 = en
      ? 'A neighboring passage would sit around here ' + '[S:ditiansui/ch99/999]' + ', but that pointer does not resolve against the local corpus, so it is shown as unverified.'
      : '相邻章节本应对应此处 ' + '[S:ditiansui/ch99/999]' + '，但该指针无法在本地语料中解析，故标为未核实。';
    var p2 = en
      ? 'You will certainly become wealthy and enjoy great fortune this year; wear a jade pendant facing east to avoid all misfortune.'
      : '你今年必定发财、大富大贵，向东佩戴玉坠即可化解一切灾厄。';
    return [p0, p1, p2].join('\n\n');
  }
  function mockReview() {
    // 段 2（无据断言 + 恐吓语 + 化解建议）被标记
    return JSON.stringify({ issues: [{ para: 2, type: 'fear', reason: isEN() ? 'definite fortune claim + remedy advice' : '确定性祸福断言 + 化解建议' }] });
  }

  // ================= UI =================
  var host = null, ctx = null;          // ctx: { facts, hits, rulesById, system, user, base }
  function mount(input) {
    host = $('bazi-ai');
    if (!host) return;
    host.innerHTML = '';
    host.style.display = 'none';
    if (!ffOn()) return;                 // 旗标未开 → 零痕迹（DOM 无卡）
    if (!global.RuleKit || !global.ChartFacts || !D) return;
    renderShell();
    host.style.display = '';
    assembleContext(input);
  }

  function renderShell() {
    var en = isEN();
    var mock = mockOn();
    host.className = 'card ai-card';
    host.innerHTML =
      '<div class="ai-head">'
      + '<span class="seal ai-seal">AI</span>'
      + '<span class="ai-title">' + esc(L('ai.title')) + '</span>'
      + (mock ? '<span class="ai-mockbadge">' + esc(L('ai.mock_badge')) + '</span>' : '')
      + '<button type="button" class="ai-gear" id="ai-gear" aria-label="' + esc(L('ai.settings')) + '" aria-expanded="true">⚙</button>'
      + '</div>'
      + '<p class="ai-intro dim">' + esc(L('ai.intro')) + '</p>'
      + '<div class="ai-drawer" id="ai-drawer">'
      + '  <label class="ai-field"><span>' + esc(L('ai.key_label')) + '</span>'
      + '    <input type="password" id="ai-key-input" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="' + esc(getKey()) + '"></label>'
      + '  <p class="ai-note">' + esc(L('ai.key_note')) + '</p>'
      + '  <label class="ai-field"><span>' + esc(L('ai.model_label')) + '</span>'
      + '    <select id="ai-model-select">'
      + '      <option value="' + MODELS.opus + '">' + esc(L('ai.model_opus')) + '</option>'
      + '      <option value="' + MODELS.sonnet + '">' + esc(L('ai.model_sonnet')) + '</option>'
      + '    </select></label>'
      + '  <button type="button" class="ai-start" id="ai-start" disabled>' + esc(L('ai.start')) + '</button>'
      + '</div>'
      + '<details class="ai-preview" id="ai-preview"><summary>' + esc(L('ai.preview')) + '</summary>'
      + '  <pre class="ai-preview-pre" id="ai-preview-pre">' + esc(L('ai.preview_building')) + '</pre></details>'
      + '<div class="ai-status" id="ai-status" role="status" aria-live="polite"></div>'
      + '<div class="ai-result" id="ai-result"></div>';

    var sel = $('ai-model-select'); if (sel) sel.value = getModel();
    var gear = $('ai-gear'), drawer = $('ai-drawer');
    if (gear && drawer) {
      gear.addEventListener('click', function () {
        var openNow = drawer.classList.toggle('collapsed');
        gear.setAttribute('aria-expanded', String(!openNow));
      });
    }
    var keyIn = $('ai-key-input');
    if (keyIn) keyIn.addEventListener('input', function () { setKey(keyIn.value.trim()); refreshStartState(); });
    if (sel) sel.addEventListener('change', function () { setModel(sel.value); });
    var start = $('ai-start');
    if (start) start.addEventListener('click', runReading);
    refreshStartState();
  }

  // 无 key 置灰（mock 模式恒可点，供无 key 验证）
  function refreshStartState() {
    var start = $('ai-start'); if (!start) return;
    var ready = ctx && ctx.assembled;
    var ok = mockOn() ? !!ready : (!!getKey() && !!ready);
    start.disabled = !ok;
  }

  function setStatus(msg, kind) {
    var el = $('ai-status'); if (!el) return;
    el.textContent = msg || '';
    el.className = 'ai-status' + (kind ? ' ai-status-' + kind : '');
  }

  // 组装送出内容（facts + 命中规则 + 邻近句），填「查看送出内容」预览
  function assembleContext(input) {
    ctx = { facts: null, hits: [], rulesById: {}, system: '', user: '', base: null, assembled: false };
    var eff = (D.solarAdjustInput ? D.solarAdjustInput(input) : input);   // 真太阳时口径同排盘（幂等）
    Promise.all([global.RuleKit.load(), global.ChartFacts.buildAsync(eff), corpusBase()]).then(function (arr) {
      var rules = arr[0], facts = arr[1], base = arr[2];
      if (!rules || !global.RuleKit.isLoaded() || !facts) { previewFail(); return; }
      var res = global.RuleKit.evaluate(facts);
      // 命局论断（与古籍论断卡同口径：剔除纯流年规则）
      var natal = res.hits.filter(function (r) { return !global.RuleKit.usesPredicate(r, ['year_zhi', 'year_gan']); });
      ctx.facts = facts; ctx.hits = natal; ctx.base = base;
      return assembleRulesBlock(base, natal).then(function (rb) {
        ctx.rulesById = rb.rulesById;
        ctx.system = buildSystem();
        ctx.user = buildUser(facts, rb.text);
        ctx.assembled = true;
        var pre = $('ai-preview-pre');
        if (pre) pre.textContent = '【system】\n' + ctx.system + '\n\n【user】\n' + ctx.user;
        refreshStartState();
      });
    }).catch(function () { previewFail(); });
  }
  function previewFail() {
    var pre = $('ai-preview-pre');
    if (pre) pre.textContent = L('ai.preview_fail');
  }

  // ================= 管线 =================
  function runReading() {
    if (!ctx || !ctx.assembled) return;
    var start = $('ai-start'); if (start) start.disabled = true;
    var result = $('ai-result'); if (result) result.innerHTML = '';
    var mock = mockOn();
    var key = getKey();
    if (!mock && !key) { setStatus(L('ai.err_nokey'), 'err'); if (start) start.disabled = false; return; }

    setStatus(L('ai.status_drafting'));
    var draftP = mock
      ? Promise.resolve(buildMockDraft(ctx.hits))
      : anthropicCall(getModel(), ctx.system, ctx.user, key, DRAFT_MAX_TOKENS);

    draftP.then(function (draft) {
      draft = String(draft || '').trim();
      if (!draft) throw new Error(L('ai.err_empty'));
      var paras = splitParas(draft);
      setStatus(L('ai.status_reviewing'));
      var reviewP = mock
        ? Promise.resolve(mockReview())
        : anthropicCall(REVIEW_MODEL, buildReviewSystem(), buildReviewUser(paras), key, REVIEW_MAX_TOKENS)
            .catch(function () { return ''; });   // 审稿失败不阻断：按无标记渲染
      return reviewP.then(function (reviewTxt) {
        var flagged = parseReview(reviewTxt);
        setStatus(L('ai.status_resolving'));
        return preResolveSPointers(ctx.base, draft).then(function (resolvedS) {
          renderResult(paras, flagged, { resolvedS: resolvedS, rulesById: ctx.rulesById }, !reviewTxt);
          setStatus('');
        });
      });
    }).catch(function (e) {
      setStatus((e && e.message) || L('ai.err_generic'), 'err');
    }).then(function () {
      if (start) start.disabled = false;
    });
  }

  function renderResult(paras, flagged, pointerCtx, reviewSkipped) {
    var el = $('ai-result'); if (!el) return;
    var en = isEN();
    var html = '<div class="ai-reading">';
    paras.forEach(function (p, i) {
      var bad = Object.prototype.hasOwnProperty.call(flagged, i);
      var body = renderTextWithPointers(p, pointerCtx);
      html += '<p class="ai-para' + (bad ? ' ai-flagged' : '') + '">'
        + (bad ? '<span class="ai-flag-tag" title="' + esc(String(flagged[i])) + '">' + esc(L('ai.flag_tag')) + '</span>' : '')
        + body + '</p>';
    });
    html += '</div>';
    html += '<p class="ai-foot">' + esc(reviewSkipped ? L('ai.foot_noreview') : L('ai.foot')) + '</p>';
    el.innerHTML = html;
  }

  global.AIReading = {
    mount: mount,
    // 测试探针（供 Playwright 断言，不影响正常路径）
    _splitParas: splitParas,
    _parseReview: parseReview
  };
})(typeof window !== 'undefined' ? window : this);
