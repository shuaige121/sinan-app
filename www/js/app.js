/* 司南 Web —— UI 层 */
(function () {
  'use strict';
  const C = window.DaoCore;
  const $ = id => document.getElementById(id);
  // i18n 取词（zh 恒返回中文母本，接线后 zh 逐字不变；用 tt 而非 L —— L 是 Leaflet 全局）
  const tt = (k, v) => (window.I18N && window.I18N.t) ? window.I18N.t(k, v) : k;
  const isEN = () => !!(window.I18N && window.I18N.lang === 'en');   // EN 模式判定（zh 恒 false，行为逐字不变）
  const hasKey = (k) => !!(window.I18N && window.I18N.has && window.I18N.has(k));
  const EL_EN = { '金': 'Metal', '木': 'Wood', '水': 'Water', '火': 'Fire', '土': 'Earth' }; // 五行→英（§2.2）
  const elEN = (c) => EL_EN[c] || c;
  const elsEN = (arr) => (arr || []).map(elEN).join(', ');
  // ---- EN 数据 token → 汉字+拼音+英释映射（宪法 §2；zh 模式恒不取用，行为逐字不变）----
  const cap1 = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const STEM_PY = { 甲: 'jiǎ', 乙: 'yǐ', 丙: 'bǐng', 丁: 'dīng', 戊: 'wù', 己: 'jǐ', 庚: 'gēng', 辛: 'xīn', 壬: 'rén', 癸: 'guǐ' }; // §2.3
  const BRANCH_PY = { 子: 'zǐ', 丑: 'chǒu', 寅: 'yín', 卯: 'mǎo', 辰: 'chén', 巳: 'sì', 午: 'wǔ', 未: 'wèi', 申: 'shēn', 酉: 'yǒu', 戌: 'xū', 亥: 'hài' }; // §2.4
  const SHENGXIAO_EN = { 鼠: 'Rat', 牛: 'Ox', 虎: 'Tiger', 兔: 'Rabbit', 龙: 'Dragon', 蛇: 'Snake', 马: 'Horse', 羊: 'Goat', 猴: 'Monkey', 鸡: 'Rooster', 狗: 'Dog', 猪: 'Pig' }; // §2.4 生肖
  const DIR_EN = { 北: 'N', 东北: 'NE', 东: 'E', 东南: 'SE', 南: 'S', 西南: 'SW', 西: 'W', 西北: 'NW' }; // §4.2 方位
  const ELDIR_EN = { 东方: 'East', 南方: 'South', 中央: 'Center', 西方: 'West', 北方: 'North' };            // 五行方位（core.EL_DIR 值）
  const GROUP_EN = { '东四命': 'East Four Life group', '西四命': 'West Four Life group' };                  // §2.17
  const GOAL_EN = { 正财: '正财 Direct Wealth', 偏财: '偏财 Indirect Wealth', 官职: '官职 Career', 健康: '健康 Health', 姻缘: '姻缘 Marriage', 学业: '学业 Studies' }; // §2.5 + 大白话目标
  const WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];                                        // §4.2 星期（0=周日）
  const MOON_EN = { '朔·新月': 'New Moon', '蛾眉月': 'Waxing Crescent', '上弦月': 'First Quarter', '盈凸月': 'Waxing Gibbous', '望·满月': 'Full Moon', '亏凸月': 'Waning Gibbous', '下弦月': 'Last Quarter', '残月': 'Waning Crescent' };
  const JIEQI_EN = { // §2.14 UNESCO 英文（App 内不署译者名，§6.3）
    立春: ['Lìchūn', 'Beginning of Spring'], 雨水: ['Yǔshuǐ', 'Rain Water'], 惊蛰: ['Jīngzhé', 'Awakening of Insects'],
    春分: ['Chūnfēn', 'Spring Equinox'], 清明: ['Qīngmíng', 'Pure Brightness'], 谷雨: ['Gǔyǔ', 'Grain Rain'],
    立夏: ['Lìxià', 'Beginning of Summer'], 小满: ['Xiǎomǎn', 'Grain Buds'], 芒种: ['Mángzhòng', 'Grain in Ear'],
    夏至: ['Xiàzhì', 'Summer Solstice'], 小暑: ['Xiǎoshǔ', 'Minor Heat'], 大暑: ['Dàshǔ', 'Major Heat'],
    立秋: ['Lìqiū', 'Beginning of Autumn'], 处暑: ['Chǔshǔ', 'End of Heat'], 白露: ['Báilù', 'White Dew'],
    秋分: ['Qiūfēn', 'Autumn Equinox'], 寒露: ['Hánlù', 'Cold Dew'], 霜降: ['Shuāngjiàng', "Frost's Descent"],
    立冬: ['Lìdōng', 'Beginning of Winter'], 小雪: ['Xiǎoxuě', 'Minor Snow'], 大雪: ['Dàxuě', 'Major Snow'],
    冬至: ['Dōngzhì', 'Winter Solstice'], 小寒: ['Xiǎohán', 'Minor Cold'], 大寒: ['Dàhán', 'Major Cold'],
  };
  // 干支年拼音（丙午 → Bǐngwǔ）；生肖英；节气「汉字 拼音 (English)」显示串（缺表回落纯汉字）
  const ganzhiPY = (gz) => { const g = STEM_PY[gz && gz[0]], z = BRANCH_PY[gz && gz[1]]; return (g && z) ? cap1(g) + z : ''; };
  const sxEN = (sx) => SHENGXIAO_EN[sx] || sx;
  const jieqiDisp = (name) => { const j = JIEQI_EN[name]; return j ? `${name} ${j[0]} (${j[1]})` : name; };
  const branchHourEN = (zhi) => BRANCH_PY[zhi] ? `${zhi}时 ${cap1(BRANCH_PY[zhi])} hour` : `${zhi}时`; // §2.13
  // 术语英释（取 PLAIN_GLOSSARY_EN，供 EN 首现「汉字 English」内联；缺表回落纯汉字）
  const enTermGloss = (term) => { const e = (window.PLAIN_GLOSSARY_EN || {})[term]; return e && e.en ? e.en : ''; };
  const termDispEN = (term) => { const g = enTermGloss(term); return g ? term + ' ' + g : term; };

  // ===== 开屏：名言五行流光 =====
  function buildGlowQuote(container, text, fontSize, cycle) {
    container.innerHTML = '';
    cycle = (cycle && cycle.length) ? cycle : ['木', '火', '土', '金', '水'];
    const phrases = text.split(/[，。；！？、]/).filter(s => s.length);
    let gi = 0;
    phrases.forEach(ph => {
      const line = document.createElement('div');
      line.className = 'glow-line';
      for (const ch of ph) {
        const span = document.createElement('span');
        span.className = 'glow-char';
        span.textContent = ch;
        span.style.setProperty('--glow', C.EL_HEX[cycle[gi % cycle.length]]);
        span.style.animationDelay = `${0.6 + gi * 0.16}s`;
        if (fontSize) span.style.fontSize = fontSize;
        line.appendChild(span);
        gi++;
      }
      container.appendChild(line);
    });
    return 0.6 + gi * 0.16 + 0.8; // 总时长(秒)
  }
  // 开屏流光配色循环：
  //   未排盘 → 木火土金水（原样）。
  //   排盘 + 五行不均衡 → 喜用元素在序列里出现两次（配色向喜用倾斜，仍保持五色俱在）。
  //   排盘 + 五行均衡（复用 aura 判定 min/max≥0.5）→ 保持五色不加倍。
  function openingGlowCycle() {
    const base = ['木', '火', '土', '金', '水'];
    let fav = null, scores = null;
    try { const r = localStorage.getItem('bazi-fav'); if (r) { const p = JSON.parse(r); if (p && Array.isArray(p.favorable) && p.favorable.length) fav = p; } } catch (e) {}
    if (!fav) return base;                                 // 未排盘：不变
    try { const s = localStorage.getItem('bazi-wuxing'); if (s) scores = JSON.parse(s); } catch (e) {}
    if (scores && typeof scores === 'object') {            // 五行均衡 → 保持五色
      let mn = Infinity, mx = 0;
      C.ELEMENTS.forEach(e => { const v = Math.max(0, scores[e] || 0); if (v < mn) mn = v; if (v > mx) mx = v; });
      if (mx > 0 && (mn / mx) >= 0.5) return base;
    }
    const cycle = [];                                      // 喜用加倍，五色仍全
    base.forEach(e => { cycle.push(e); if (fav.favorable.indexOf(e) >= 0) cycle.push(e); });
    return cycle;
  }

  function initOpening() {
    const q = C.selectOpeningQuote();
    const total = buildGlowQuote($('opening-quote'), q.t, null, openingGlowCycle());
    const author = $('opening-author');
    author.textContent = `—— ${q.a}${q.s}`;
    // 进入 App：授权罗盘 + 进全屏 + 淡出开屏（整屏点击与「典」chip 共用；幂等，防双触发）。
    const openingEl = $('opening');
    let entered = false;
    function enterApp() {
      if (entered) return; entered = true;
      window._enterImmersive && window._enterImmersive(); // 借这次手势授权罗盘 + 进全屏
      openingEl.classList.add('closed');
      setTimeout(() => { if (openingEl && openingEl.parentNode) openingEl.remove(); maybeStartTour(); }, 1000);
    }
    // 名句可点：有锚点（q.book）才挂「典」chip；点击=进入 App 并打开引用弹层。
    //   chip 用 stopPropagation 免得整屏 click 再触发一次 enterApp；chip 自行调 enterApp
    //   淡出开屏（#opening z100 > 弹层 z60，须先淡出否则弹层被盖住），再开 CitePop 弹层。
    if (q.book && window.CitePop && window.CitePop.openCite) {
      const target = (q.i != null) ? { book: q.book, ch: q.ch, i: q.i } : { book: q.book };
      const chip = document.createElement('span');
      chip.className = 'cite-chip opening-cite-chip';
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('aria-label', '查看此句出处');
      chip.textContent = '典';
      const openIt = (e) => { e.stopPropagation(); e.preventDefault(); enterApp(); window.CitePop.openCite(target); };
      chip.addEventListener('click', openIt);
      chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openIt(e); });
      author.appendChild(document.createTextNode(' '));
      author.appendChild(chip);
    }
    // 选句依据行（仅个性化生效且所选句 el∈喜用时）：今日为阁下选『X』性句 · 今人方法
    const why = $('opening-why');
    if (why) {
      let fav = null;
      try { const r = localStorage.getItem('bazi-fav'); if (r) { const p = JSON.parse(r); if (p && Array.isArray(p.favorable)) fav = p; } } catch (e) {}
      if (fav && q.el && fav.favorable.indexOf(q.el) >= 0) {
        const cls = WX_CLASS[q.el] || '';
        why.innerHTML = `今日为阁下选<span class="${cls}">『${q.el}』</span>性句 · 今人方法`;
        why.dataset.on = '1';
      } else {
        why.textContent = '';
        why.dataset.on = '';
      }
    }
    setTimeout(() => {
      const a = $('opening-author'), h = $('opening-hint'), s = $('opening-sub'), w = $('opening-why');
      if (a) a.classList.add('shown');   // 开屏被快速点掉后 #opening 已移除，守一下空值
      if (h) h.classList.add('shown');
      if (s) s.classList.add('shown');   // 引文下方「历·堪·命」随作者一并浮现
      if (w && w.dataset.on === '1') w.classList.add('shown'); // 选句依据行随作者一并浮现
    }, total * 1000);
    openingEl.addEventListener('click', enterApp);
  }

  // ===== 关键字着色（晨语/断语/时卦断语行）=====
  // 只作用于这几个已知渲染点，不做全局正则替换。规则：五行单字（金木水火土，
  // 含纳音末字）→ 五行色；「」内若为卦名 → 金；黄历宜/忌另在 renderToday 处理。
  // 克制：单字着色不加粗不发光（样式见 .wx-* / .kw-gua）。
  const WX_CLASS = { 金: 'wx-jin', 木: 'wx-mu', 水: 'wx-shui', 火: 'wx-huo', 土: 'wx-tu' };
  const HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => HTML_ESC[c]); }
  // 已转义文本内：把裸露的五行单字包 span（供「」内纳音/杂字复用）
  function colorizeEls(escaped) {
    return escaped.replace(/[金木水火土]/g, c => `<span class="${WX_CLASS[c]}">${c}</span>`);
  }
  // 输入为纯文本；先整体转义，再单遍着色（「」块与裸五行字互斥，避免嵌套重包）。
  // opts.gua = 需染金的卦名数组（如时卦名/之卦名），仅在「」包裹时命中。
  function colorizeKeywords(text, opts) {
    const guaSet = new Set(((opts && opts.gua) || []).filter(Boolean));
    return escapeHtml(text).replace(/「([^」]{1,8})」|[金木水火土]/g, (m, inner) => {
      if (inner !== undefined) {
        return guaSet.has(inner)
          ? `「<span class="kw-gua">${inner}</span>」`
          : `「${colorizeEls(inner)}」`;
      }
      return `<span class="${WX_CLASS[m]}">${m}</span>`;
    });
  }

  // ===== 白话词条：显式挂点 renderTerm + 复用引用弹层骨架的 termPop =====
  // 铁律：只对语料（PLAIN_GLOSSARY）有键的术语生成可点 chip（墨灰点状下划线，与金虚线 cite-chip 区分）；
  //   无键 → 退回纯文本，绝不生成死交互。禁全局扫 DOM —— 一律在各渲染点显式调 renderTerm。
  function hasTerm(term) {
    return !!(window.PLAIN_GLOSSARY && Object.prototype.hasOwnProperty.call(window.PLAIN_GLOSSARY, term));
  }
  // term=词条键；display=呈现文字（默认=term，供「身强」显示但键取「身强身弱」等别名场景）。
  function renderTerm(term, display) {
    const txt = (display != null) ? String(display) : String(term);
    if (!hasTerm(term)) return escapeHtml(txt);       // 无键：纯文本（不挂交互）
    return `<span class="term-chip" data-term="${escapeHtml(term)}" role="button" tabindex="0">${escapeHtml(txt)}</span>`;
  }
  // 术语 → 可靠典籍（registry 已验证 book id）。仅确定关联者进表；有键才出「详见典籍阁」，book 级深链恒可达（非死链）。
  const TERM_BOOK = (function () {
    const m = {};
    const put = (id, terms) => terms.forEach(t => { m[t] = id; });
    put('yuanhai-ziping', ['十神', '正官', '七杀', '正财', '偏财', '正印', '偏印', '食神', '伤官', '比肩', '劫财',
      '八字', '四柱', '日主', '命盘', '排盘', '身强身弱', '喜用神', '喜用', '忌神', '纳音', '大运',
      '十二长生', '长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养',
      '神煞', '羊刃', '禄神', '天乙贵人', '桃花', '驿马', '华盖', '将星', '月德',
      '六冲', '六合', '三合', '三会', '六害', '三刑', '自刑', '天干五合', '旬空']);
    put('bazhai-mingjing', ['游年八星', '生气', '天医', '延年', '伏位', '绝命', '五鬼', '六煞', '祸害',
      '命卦', '东四命', '西四命', '八宅']);
    put('xinji-bianfang', ['建除十二神', '建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭',
      '值神', '黄道', '黑道', '青龙', '明堂', '金匮', '天德', '玉堂', '司命', '天刑', '朱雀', '白虎', '天牢', '玄武', '勾陈',
      '太岁', '岁破', '三煞', '五黄', '紫白', '月建', '月令', '二十四节气',
      '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
      '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒']);
    put('shenshi-xuankong', ['玄空', '飞星', '元运', '受气元运', '当运', '山星向星', '三元九运']);
    put('luojing-toujie', ['罗盘', '二十四山', '坐向', '坐山', '向首']);
    put('zangshu', ['堪舆', '风水', '阴宅', '穴', '砂水', '形煞', '四象']);
    put('yangzhai-sanyao', ['阳宅', '户型']);
    put('zhouyi', ['时卦', '卦', '爻', '八卦', '六十四卦']);
    return m;
  })();

  // ---- 词条浮层（复用 .cite-* 视觉骨架；独立单例，与出处弹层互不干扰）----
  let _termBd = null, _termBody = null;
  function termEnsureDom() {
    if (_termBd) return;
    _termBd = document.createElement('div');
    _termBd.className = 'cite-backdrop term-backdrop';
    _termBd.hidden = true;
    _termBd.innerHTML =
      '<div class="cite-pop term-pop" role="dialog" aria-modal="true" aria-label="' + (isEN() ? 'Term glossary' : '词条释义') + '">'
      + '<button class="cite-close" type="button" aria-label="' + escapeHtml(tt('common.close')) + '">✕</button>'
      + '<div class="cite-pop-body term-pop-body"></div>'
      + '</div>';
    document.body.appendChild(_termBd);
    _termBody = _termBd.querySelector('.term-pop-body');
    _termBd.addEventListener('click', e => { if (e.target === _termBd) termClose(); });
    _termBd.querySelector('.cite-close').addEventListener('click', termClose);
  }
  function termOnKey(e) { if (e.key === 'Escape') termClose(); }
  function termClose() {
    if (!_termBd || _termBd.hidden) return;
    _termBd.classList.remove('shown');
    document.removeEventListener('keydown', termOnKey);
    const b = _termBd;
    setTimeout(() => { if (b && !b.classList.contains('shown')) b.hidden = true; }, 260);
  }
  function termOpen(term) {
    const g = window.PLAIN_GLOSSARY && window.PLAIN_GLOSSARY[term];
    if (!g) return;                                    // 无键：不弹（renderTerm 本就不该生成 chip）
    termEnsureDom();
    const en = isEN();
    const eg = (window.PLAIN_GLOSSARY_EN || {})[term];
    const bookId = TERM_BOOK[term];
    let h = '<div class="cite-seal-row"><span class="cite-seal">' + (en ? 'Term' : '词条') + '</span>'
      + '<span class="cite-src-head">' + escapeHtml(en && eg ? eg.en : (g.domain || '')) + '</span></div>'
      + '<div class="cite-jian term-jian"><div class="term-title">' + escapeHtml(term) + '</div>';
    if (en && eg) h += '<div class="term-en"><b>' + escapeHtml(eg.en) + '</b> <span class="term-py">' + escapeHtml(eg.py) + '</span></div>';
    h += '<div class="term-plain">' + (en ? '<span class="term-lang">Chinese explanation · </span>' : '') + escapeHtml(g.plain) + '</div>';
    if (g.more) h += '<div class="term-more">' + escapeHtml(g.more) + '</div>';
    h += '</div>';
    h += '<div class="term-foot"><span class="term-editor">' + (en ? 'Modern editorial paraphrase' : '今人整理') + '</span>'
      + '<a class="term-go" href="#" target="_blank" rel="noopener" hidden>' + (en ? 'See in the Library ›' : '详见典籍阁 ›') + '</a></div>';
    _termBody.innerHTML = h;
    // 详见典籍阁：仅术语有 book 键时出；href 走同源 /dian（dev 回落线上 daos），book 级深链恒可达 → 杜绝死链。
    if (bookId && window.CitePop && window.CitePop.deepLink && window.CitePop.resolveDianBase) {
      const go = _termBody.querySelector('.term-go');
      if (go) {
        go.hidden = false;
        window.CitePop.resolveDianBase().then(base => { go.href = window.CitePop.deepLink(base, { book: bookId }); });
        go.addEventListener('click', () => setTimeout(termClose, 0));
      }
    }
    _termBd.hidden = false;
    requestAnimationFrame(() => _termBd.classList.add('shown'));
    document.addEventListener('keydown', termOnKey);
  }
  // 事件委托（capture 相：先于挂点容器自身 click，如时卦折叠钮 —— stopPropagation 免其连带触发）
  function handleTermChip(e) {
    const chip = e.target.closest && e.target.closest('.term-chip[data-term]');
    if (!chip) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    termOpen(chip.getAttribute('data-term'));
  }
  document.addEventListener('click', handleTermChip, true);
  document.addEventListener('keydown', handleTermChip, true);

  // ===== 首启四屏引导（Tour）=====
  // 铁律：博物馆讲解口吻——今人整理明标，不卖萌不装神秘，绝不算命断言。
  //   localStorage 'tour-seen' 无值且首入今日页 → 半透明墨底四屏；跳过/走完皆写 tour-seen；
  //   设置位「重看引导」随时重放；reduced-motion 直切无过渡（CSS 收敛 + 此处跳过 fade 延时）。
  const TOUR_REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // 四屏：s1 定位/本地算 · s2 spotlight 黄历卡 · s3 指向命 tab · s4 「典」句级出处。
  const TOUR_SCREENS = [
    { key: 's1', target: null },
    { key: 's2', target: () => document.getElementById('today-almanac-card') },
    { key: 's3', target: () => document.querySelector('.tabbar button[data-tab="bazi"]') },
    { key: 's4', target: null }
  ];
  let tourOpen = false, tourIdx = -1;

  function tourSetLine(el, key) {
    if (!el) return;
    if (hasKey(key)) { el.innerHTML = tt(key); el.hidden = false; }  // 语料为自有词表，innerHTML 可信（含 <b> 强调）
    else { el.textContent = ''; el.hidden = true; }
  }
  // 卡片锚位：有 spotlight 目标 → 挖洞压暗 + 卡放空位更大的一侧；无目标 → 全屏墨底居中卡。
  function layoutTour(s) {
    const card = $('tour-card'), spot = $('tour-spot'), scrim = $('tour-scrim');
    if (!card || !spot || !scrim) return;
    const tgt = s && s.target ? s.target() : null;
    card.style.top = ''; card.style.bottom = ''; card.style.transform = 'none';
    if (tgt && tgt.getBoundingClientRect) {
      const r = tgt.getBoundingClientRect();
      if (r.width && r.height) {
        const pad = 8;
        spot.style.left = Math.max(4, r.left - pad) + 'px';
        spot.style.top = Math.max(4, r.top - pad) + 'px';
        spot.style.width = Math.min(window.innerWidth - 8, r.width + pad * 2) + 'px';
        spot.style.height = (r.height + pad * 2) + 'px';
        spot.hidden = false; scrim.hidden = true;
        const roomAbove = r.top, roomBelow = window.innerHeight - r.bottom;
        if (roomBelow >= roomAbove) card.style.top = Math.round(r.bottom + 16) + 'px';
        else card.style.bottom = Math.round(window.innerHeight - r.top + 16) + 'px';
        return;
      }
    }
    spot.hidden = true; scrim.hidden = false;
    card.style.top = '50%'; card.style.transform = 'translateY(-50%)';
  }

  function showTourScreen(i, instant) {
    if (!tourOpen) return;
    if (i < 0) i = 0;
    if (i >= TOUR_SCREENS.length) { endTour(true); return; }
    const s = TOUR_SCREENS[i];
    const body = $('tour-body');
    const paint = () => {
      tourIdx = i;
      const title = $('tour-title'); if (title) title.innerHTML = tt('tour.' + s.key + '.title');
      tourSetLine($('tour-l1'), 'tour.' + s.key + '.l1');
      tourSetLine($('tour-l2'), 'tour.' + s.key + '.l2');
      tourSetLine($('tour-l3'), 'tour.' + s.key + '.l3');
      const dots = $('tour-dots');
      if (dots) for (let k = 0; k < dots.children.length; k++) dots.children[k].classList.toggle('on', k === i);
      const next = $('tour-next');
      if (next) next.textContent = tt(i === TOUR_SCREENS.length - 1 ? 'tour.done' : 'tour.next');
      layoutTour(s);
      if (body) body.classList.remove('swap');
    };
    if (instant || TOUR_REDUCE || tourIdx < 0) paint();
    else { if (body) body.classList.add('swap'); setTimeout(paint, 140); }
  }

  function tourKey(e) {
    if (!tourOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); endTour(true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); showTourScreen(tourIdx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); showTourScreen(tourIdx - 1); }
  }

  function startTour() {
    const root = $('tour');
    if (!root || tourOpen) return;
    tourOpen = true; tourIdx = -1;
    const dots = $('tour-dots');
    if (dots && dots.children.length !== TOUR_SCREENS.length) {
      dots.innerHTML = '';
      TOUR_SCREENS.forEach(() => { const d = document.createElement('i'); d.className = 'tour-dot'; dots.appendChild(d); });
    }
    const skip = $('tour-skip'); if (skip) skip.textContent = tt('tour.skip');
    root.hidden = false; root.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => root.classList.add('shown'));
    showTourScreen(0, true);
    document.addEventListener('keydown', tourKey);
    try { const nx = $('tour-next'); if (nx) nx.focus(); } catch (e) { /* no focus */ }
  }

  function endTour(markSeen) {
    if (markSeen) { try { localStorage.setItem('tour-seen', '1'); } catch (e) { /* 私密模式忽略 */ } }
    tourOpen = false; tourIdx = -1;
    document.removeEventListener('keydown', tourKey);
    const root = $('tour');
    if (!root) return;
    root.classList.remove('shown'); root.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (!tourOpen) root.hidden = true; }, TOUR_REDUCE ? 0 : 300);
  }

  // 首入今日页判定：无 tour-seen、今日页在场、无引用/词条弹层遮挡时才弹（否则本次不打扰，下次再弹）。
  function maybeStartTour() {
    let seen = null;
    try { seen = localStorage.getItem('tour-seen'); } catch (e) { /* 私密模式：视作首入，允许弹一次 */ }
    if (seen) return;
    if (tourOpen) return;
    const today = document.getElementById('page-today');
    if (!today || !today.classList.contains('active')) return;
    if (document.querySelector('.cite-backdrop.shown')) return;
    startTour();
  }
  function replayTour() { if (!tourOpen) startTour(); }
  window._replayTour = replayTour;  // 供验证脚本/手动重放

  (function wireTour() {
    const root = $('tour'); if (!root) return;
    const next = $('tour-next'), skip = $('tour-skip'), replay = $('tour-replay');
    if (next) next.addEventListener('click', () => showTourScreen(tourIdx + 1));
    if (skip) skip.addEventListener('click', () => endTour(true));
    if (replay) replay.addEventListener('click', () => replayTour());
    let sx = 0, sy = 0;
    root.addEventListener('touchstart', e => { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    root.addEventListener('touchend', e => {
      if (!tourOpen) return;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) showTourScreen(dx < 0 ? tourIdx + 1 : tourIdx - 1);
    }, { passive: true });
    window.addEventListener('resize', () => { if (tourOpen && tourIdx >= 0) layoutTour(TOUR_SCREENS[tourIdx]); });
  })();

  // ===== 黄历人话摘要：类目 → 大白话动词映射（今人整理·约定俗成，非典据）=====
  // 用于黄历卡「宜/忌」之上的第一眼摘要行；EN 给对应英文短词。未收录类目在摘要里回落原类目文字（数据 token）。
  const YI_VERB = {
    嫁娶: '办喜事', 纳采: '提亲', 订盟: '定亲', 纳婿: '招婿', 问名: '议婚', 冠笄: '成人礼', 会亲友: '走亲聚会',
    进人口: '添人口', 合帐: '备嫁妆', 归宁: '回娘家', 结婚姻: '结亲',
    动土: '动工', 破土: '破土开工', 修造: '修建', 起基: '打地基', 定磉: '立柱基', 竖柱: '立柱', 上梁: '上梁',
    盖屋: '盖房', 作梁: '备梁木', 架马: '搭架', 开柱眼: '开榫', 合脊: '封顶', 筑堤: '筑堤', 补垣: '补墙',
    坏垣: '拆墙', 修饰垣墙: '修墙', 平治道涂: '修路', 谢土: '谢土', 塞穴: '填坑', 造仓: '建粮仓', 修坟: '修坟',
    造庙: '建庙', 造桥: '修桥', 安葬: '下葬', 破屋: '拆房', 立碑: '立碑', 开生坟: '修寿坟', 修门: '修门',
    安门: '装门', 安床: '安床', 拆卸: '拆卸', 安碓磑: '装石磨', 安机械: '装机器',
    栽种: '种植', 牧养: '养牲口', 纳畜: '添牲口', 教牛马: '驯牲口', 造畜稠: '搭畜栏', 入学: '上学', 习艺: '学手艺',
    结网: '结网', 经络: '纺织', 裁衣: '做衣裳', 造船: '造船', 造车器: '造车',
    作灶: '修灶', 出火: '迁灶', 塑绘: '塑像绘画', 开光: '开光', 斋醮: '做法事', 普渡: '普度', 安香: '安神位',
    祭祀: '祭拜', 祈福: '祈福许愿', 求嗣: '求子', 入宅: '搬进新家', 安香火: '安神位', 竖旗: '立旗',
    出行: '出门远行', 乘船: '坐船', 取渔: '打渔', 捕捉: '捕猎', 畋猎: '打猎', 放水: '放水', 开池: '挖池',
    开渠: '挖渠', 掘井: '打井', 沐浴: '沐浴净身', 割蜜: '取蜂蜜', 断蚁: '除虫', 移徙: '搬家', 扫舍: '打扫',
    开市: '开业', 交易: '做买卖', 纳财: '收钱进财', 立券: '签约', 立契: '立契约', 出货财: '出货', 开仓: '开仓',
    置产: '置办产业', 雕刻: '雕刻', 理发: '理发', 整手足甲: '修指甲', 伐木: '砍树', 针灸: '针灸', 挂匾: '挂匾额',
    求医: '看病就医', 疗病: '看病', 词讼: '打官司', 会友: '会友', 除服: '除孝', 成服: '成服',
    余事勿取: '别的事先缓缓', 诸事不宜: '诸事宜缓',
  };
  const YI_VERB_EN = {
    嫁娶: 'weddings', 纳采: 'betrothal', 订盟: 'engagement', 会亲友: 'gatherings', 进人口: 'taking in members',
    归宁: 'visiting family',
    动土: 'breaking ground', 破土: 'groundbreaking', 修造: 'building', 起基: 'laying foundations', 竖柱: 'raising posts',
    上梁: 'raising the ridgepole', 盖屋: 'roofing', 平治道涂: 'road repair', 造桥: 'bridge-building', 修坟: 'tomb repair',
    安葬: 'burials', 立碑: 'setting a stele', 安床: 'setting the bed', 安门: 'hanging doors',
    栽种: 'planting', 牧养: 'raising livestock', 纳畜: 'taking in livestock', 入学: 'starting school', 习艺: 'learning a craft',
    裁衣: 'tailoring', 造船: 'boat-building',
    作灶: 'kitchen-stove work', 开光: 'consecration', 斋醮: 'rituals', 安香: 'placing an altar', 祭祀: 'offerings',
    祈福: 'praying for blessings', 求嗣: 'praying for children', 入宅: 'moving in', 安香火: 'placing an altar',
    出行: 'travel', 乘船: 'boating', 畋猎: 'hunting', 放水: 'releasing water', 掘井: 'digging a well', 沐浴: 'bathing',
    移徙: 'moving house', 扫舍: 'cleaning house',
    开市: 'opening for business', 交易: 'trade', 纳财: 'receiving wealth', 立券: 'signing contracts', 立契: 'contracts',
    置产: 'acquiring property', 雕刻: 'carving', 理发: 'a haircut', 伐木: 'felling timber', 针灸: 'acupuncture',
    挂匾: 'hanging a plaque', 求医: 'seeking treatment', 疗病: 'treating illness', 词讼: 'litigation',
    余事勿取: 'little else', 诸事不宜: 'little is favored',
  };
  // 组装摘要：宜取前 max 个能翻成动词者（去重），忌同理。未收录类目回落原文（保证行必现，acceptance 要求可见）。
  function pickVerbs(arr, max, en) {
    const map = en ? YI_VERB_EN : YI_VERB;
    const clean = (arr || []).filter(x => x && x !== '无');
    const out = [];
    // 先收已翻译者
    for (const x of clean) { const v = map[x]; if (v && out.indexOf(v) < 0) { out.push(v); if (out.length >= max) return out; } }
    // 不足再用原类目兜底（EN 亦保留汉字数据 token，与全站体例一致）
    for (const x of clean) { if (out.indexOf(x) < 0) { out.push(x); if (out.length >= max) break; } }
    return out;
  }
  function renderAlmanacPlain(elId, yiArr, jiArr) {
    const el = $(elId);
    if (!el) return;
    const en = isEN();
    const yi = pickVerbs(yiArr, 2, en);   // 宜取 2（2-3 区间取 2 以守单行·忌两项皆可见）
    const ji = pickVerbs(jiArr, 2, en);
    if (!yi.length && !ji.length) { el.hidden = true; el.innerHTML = ''; return; }
    const sep = '、', sepEN = ', ';
    let txt;
    if (en) {
      const parts = [];
      if (yi.length) parts.push('good for ' + yi.join(sepEN));
      if (ji.length) parts.push('avoid ' + ji.join(sepEN));
      txt = '<b>Today</b> · ' + parts.join('; ');
    } else {
      const parts = [];
      if (yi.length) parts.push('适合' + yi.join(sep));
      if (ji.length) parts.push('避开' + ji.join(sep));
      txt = '<b>今天</b>：' + parts.join('；');
    }
    el.innerHTML = txt;
    el.hidden = false;
  }

  // ===== 打字机 =====
  // token 失效机制：同一元素上重启打字机时，旧定时链立即作废，
  // 否则连续点击（如切换所求）会出现两条链竞写同一元素。
  // colorize：真值时打完（或点击吐全）在成段落地时套 colorizeKeywords；
  // 传对象则作为 opts（如 {gua:[...]} 供卦名染金）。逐字阶段仍走纯文本节点，兼容原动画。
  function typewriter(el, text, speed, colorize) {
    const token = (parseInt(el.dataset.tw || '0', 10) + 1);
    el.dataset.tw = String(token);
    el.textContent = '';                          // 清掉旧文本 + 旧光标
    // 正文走文本节点（不解析 HTML，沿用原 textContent 的安全性），
    // 墨色闪烁光标「▌」单独一个 span 跟在末尾，打完即摘——消除「半句截断」观感。
    const textNode = document.createTextNode('');
    const cursor = document.createElement('span');
    cursor.className = 'tw-cursor';
    cursor.textContent = '▌';
    el.appendChild(textNode);
    el.appendChild(cursor);
    let i = 0;
    el.style.cursor = 'pointer';
    const dropCursor = () => { if (cursor.parentNode) cursor.remove(); };
    const finish = () => {
      dropCursor();                                // 打完收光标
      if (colorize) el.innerHTML = colorizeKeywords(text, typeof colorize === 'object' ? colorize : null);
    };
    el.onclick = () => { if (el.dataset.tw === String(token)) { textNode.nodeValue = text; i = text.length + 1; finish(); el.onclick = null; } }; // 点一下立即吐全文，不必等
    const tick = () => {
      if (el.dataset.tw !== String(token)) return; // 已被新一轮接管
      if (i <= text.length) {
        textNode.nodeValue = text.slice(0, i);
        i++;
        setTimeout(tick, speed || 18);
      } else {
        finish();
        el.onclick = null;
      }
    };
    tick();
  }

  // ===== EN 结构化替身：长文学断语 → 结构行 + 折叠原文（诚实分层，不译不删）=====
  // 中文文学断语（masterBazi / masterGoal）在 EN 模式下折叠为「原文（中文）▸」<details>，
  //   上方给一行英文结构摘要（走术语体例）。zh 模式此函数不被调用（renderBazi 内 isEN() 分流）。
  function renderVerdictEN(el, enLine, zhOriginal, summaryKey) {
    if (!el) return;
    el.dataset.tw = String((parseInt(el.dataset.tw || '0', 10) + 1)); // 作废任何在跑的打字机链
    el.style.cursor = '';
    el.onclick = null;
    const d = document.createElement('details');
    d.className = 'verdict-zh';
    const sm = document.createElement('summary');
    sm.textContent = tt(summaryKey || 'en.verdict.original');
    const body = document.createElement('div');
    body.className = 'verdict-zh-body';
    body.innerHTML = colorizeKeywords(zhOriginal || '');
    d.appendChild(sm); d.appendChild(body);
    el.innerHTML = '';
    const line = document.createElement('div');
    line.className = 'verdict-en';
    line.textContent = enLine;
    el.appendChild(line);
    el.appendChild(d);
  }
  // 断语结构行（键日主·身强弱·喜用）
  function verdictLineEN(c) {
    return tt('en.verdict.line', {
      dm: c.dm,
      dmEl: elEN(c.dmEl),
      strength: c.isStrong ? '身强 shēnqiáng (strong)' : '身弱 shēnruò (weak)',
      fav: elsEN(c.favorable),
    });
  }
  // 所求建议结构行：goal/dir 译英（§2.5 + §4.2），target 五行译英；star 星名/color 色名保汉字（宪法未收，_queries）
  function goalLineEN(adv) {
    const dirEN = ELDIR_EN[adv.dir] ? `${ELDIR_EN[adv.dir]} (${adv.dir})` : adv.dir;
    return tt('en.goal.line', {
      goal: GOAL_EN[adv.goal] || adv.goal, star: adv.star, target: elEN(adv.target), dir: dirEN, color: adv.color,
    });
  }

  // ===== 金色涟漪：按钮按下的即时反馈（走 CSS 动画，prefers-reduced-motion 下自动收敛为无）=====
  function spawnRipple(ev) {
    const btn = ev.currentTarget;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const rp = document.createElement('span');
    rp.className = 'ripple';
    rp.style.width = rp.style.height = size + 'px';
    rp.style.left = ((ev.clientX || r.left + r.width / 2) - r.left) + 'px';
    rp.style.top = ((ev.clientY || r.top + r.height / 2) - r.top) + 'px';
    btn.appendChild(rp);
    setTimeout(() => rp.remove(), 550);
  }

  // ===== Tab 切换 =====
  let kanyuInited = false;
  function switchTab(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
    document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    if (name === 'kanyu') {
      if (!kanyuInited) { kanyuInited = true; initKanyu(); }
      else if (window._veinMap) setTimeout(() => { window._veinMap.invalidateSize(); drawLuopan(); recomputeKanyuTopOffset(); }, 60);
    } else {
      // 离堪舆页：收完整原句 overlay（teaser 随 #kanyu-top 隐于非激活页，无需单独处理）
      hideQuoteOverlay();
    }
    // 藏书阁：首次切入才 lazy 加载 iframe（已加载则常驻，保阅读进度）
    if (name === 'shuge') loadShuge();
    // 气韵粒子层：仅堪舆页运行，离页暂停省电
    if (window._qiField) window._qiField.setActive(name === 'kanyu');
    // 五行流光引擎：与粒子层同一生命周期（仅堪舆页且可见时活）
    auraSetActive(name === 'kanyu');
    // 五行方位微光环：同一生命周期（离页/隐藏暂停呼吸；进页按命盘分值重算光强）
    glowSetActive(name === 'kanyu');
    // 罗盘前后景特效：与地图粒子同生命周期，离页立即停帧。
    if (compassFx) compassFx.setActive(name === 'kanyu');
  }

  // ===== 藏书阁（典籍阁 iframe 分页）=====
  //   base 解析：localStorage['dian-base'] 覆写（本地测试可指向同源 /dian）→
  //     CitePop.resolveDianBase()（原生壳/生产同源 /dian，普通 dev 回落线上 daos）。与 rulekit/chartfacts 同源策略。
  //   同源判定（_shugeInline）：有效 base 为相对路径（/dian）时，出处 chip「入阁阅读」/原句卡「读上下文」
  //     改为「切书 tab + 内嵌 iframe 带同 hash」；跨源（线上 daos）维持默认新标签打开。
  let shugeInited = false, _shugeBaseP = null, _shugeInline = null;
  function shugeBaseP() {
    if (_shugeBaseP) return _shugeBaseP;
    let ov = null;
    try { ov = localStorage.getItem('dian-base'); } catch (e) {}
    if (ov) _shugeBaseP = Promise.resolve(ov);
    else _shugeBaseP = (window.CitePop && window.CitePop.resolveDianBase)
      ? window.CitePop.resolveDianBase() : Promise.resolve('/dian');
    return _shugeBaseP;
  }
  function shugeRoot(base) {
    const root = String(base).replace(/\/+$/, '') + '/';
    try {
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function'
          && window.Capacitor.isNativePlatform()) return root + 'index.html';
    } catch (e) {}
    return root;
  }
  function refreshShugeInline() {
    shugeBaseP().then(base => { _shugeInline = /^\/(?!\/)/.test(String(base)); });
  }
  function shugeInlineEnabled() { return _shugeInline === true; }
  function loadShuge(hash) {
    const frame = $('shuge-frame'), skel = $('shuge-skel'), wrap = frame && frame.closest('.shuge-wrap');
    if (!frame) return;
    if (shugeInited) { if (hash) updateShugeHash(hash); return; } // 已常驻：仅换 hash 复用句级高亮
    shugeInited = true;
    shugeBaseP().then(base => {
      frame.addEventListener('load', () => {
        if (wrap) wrap.classList.add('shuge-loaded');
        if (skel) setTimeout(() => { skel.hidden = true; }, 460);
      }, { once: true });
      frame.hidden = false;
      frame.src = shugeRoot(base) + (hash || '');
    });
  }
  // 同源内嵌典籍阁会报告当前空间层级；只用于微调外壳氛围，不读取书内内容。
  window.addEventListener('message', e => {
    const frame = $('shuge-frame');
    if (!frame || e.source !== frame.contentWindow || !e.data || e.data.type !== 'sinan-dian-route') return;
    const view = ['shelf', 'book', 'read', 'citations', 'marks'].includes(e.data.page) ? e.data.page : 'shelf';
    const wrap = frame.closest('.shuge-wrap');
    if (wrap) wrap.dataset.dianView = view;
  });
  // 已加载后再深链：同源直接改 iframe 内 hash（触发 SPA hashchange 重定位句级高亮，不整页重载、保进度）
  function updateShugeHash(hash) {
    const frame = $('shuge-frame');
    if (!frame || !hash) return;
    try {
      if (frame.contentWindow && frame.contentWindow.location) { frame.contentWindow.location.hash = hash; return; }
    } catch (e) { /* 跨源无权访问：退回换 src */ }
    shugeBaseP().then(base => { frame.src = shugeRoot(base) + hash; });
  }
  function openInShugeHash(hash) { loadShuge(hash); switchTab('shuge'); }
  // 全站出处深链联动：捕获阶段拦「入阁阅读」(.cite-go) 与原句卡「读上下文」(.bzq-ctx)。
  //   同源 → preventDefault + 关弹层 + 切书 tab 带同 hash；跨源 → 放行默认新标签打开。
  document.addEventListener('click', function (e) {
    const link = e.target.closest && e.target.closest('a.cite-go, a.bzq-ctx');
    if (!link) return;
    if (!shugeInlineEnabled()) return;                 // 跨源（线上 daos）：维持新标签打开
    const href = link.getAttribute('href') || '';
    const hIdx = href.indexOf('#');
    if (hIdx < 0) return;
    const hash = href.slice(hIdx);
    if (hash.length < 2) return;                        // 空 hash（尚未就绪）：放行默认
    e.preventDefault();
    if (window.CitePop && window.CitePop.closeCite) window.CitePop.closeCite();
    openInShugeHash(hash);
  }, true);

  // ===== 轻量提示条（无依赖，自动消失）=====
  function toast(msg, ms) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:9999;'
      + 'background:rgba(26,24,20,.94);color:#f2e9d4;border:1px solid rgba(201,162,39,.5);'
      + 'padding:9px 16px;border-radius:8px;font-size:13px;max-width:80vw;text-align:center;'
      + 'box-shadow:0 4px 16px rgba(0,0,0,.4);pointer-events:none;opacity:0;transition:opacity .25s';
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; });
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, ms || 2600);
  }

  // 定位回调：存储最近 GPS 位置供罗盘锁定 fallback 使用
  function applyHerePosition(lat, lon, accuracy) {
    window._lastHerePosition = { lat, lng: lon, accuracy: accuracy || 0 };
  }

  // ===== 流年方位（纯年份推算）：复用 core.js 已有流年公式（C.lyGetZhi/lyTaiSuiDir/
  //        lySanSha/lyNianPlate），与堪舆页 showLiunian 同一套公式，不复制两份。=====
  const GAN10 = '甲乙丙丁戊己庚辛壬癸';
  // 八卦宫 · 罗盘方向（0=正北，顺时针 45° 一宫）
  const GONG8 = [
    { key: 'N',  gong: '坎', dir: '正北' }, { key: 'NE', gong: '艮', dir: '东北' },
    { key: 'E',  gong: '震', dir: '正东' }, { key: 'SE', gong: '巽', dir: '东南' },
    { key: 'S',  gong: '离', dir: '正南' }, { key: 'SW', gong: '坤', dir: '西南' },
    { key: 'W',  gong: '兑', dir: '正西' }, { key: 'NW', gong: '乾', dir: '西北' },
  ];
  function gong8(deg) { return GONG8[Math.round((((deg % 360) + 360) % 360) / 45) % 8]; }
  // 立春切年 → 堪舆太阳年（与堪舆页 _autoLyYear 同源，用 core.js 立春边界）
  function liunianYearFor(date) {
    const d = date || new Date();
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const cst = new Date(utcMs + 8 * 3600000); // CST = UTC+8
    return C.lyChineseYear(cst.getFullYear(), cst.getMonth() + 1, cst.getDate());
  }
  // 汇总一年的太岁/岁破/三煞/年五黄方位（全部走 core.js 查表）
  function liunianInfo(date) {
    const year = liunianYearFor(date);
    const zhi = C.lyGetZhi(year);                 // 太岁地支
    const ts = C.lyTaiSuiDir(year);               // { suipoDeg }
    const sansha = C.lySanSha(year);              // [{name,deg}×3]
    const plate = C.lyNianPlate(year);            // 年紫白八宫
    const nianCenter = C.lyNianCenter(year);
    const yearGanZhi = GAN10[(((year - 4) % 10) + 10) % 10] + zhi.name;
    let wuhuangKey = null;
    Object.keys(plate).forEach(k => { if (plate[k] === 5 && k !== 'C') wuhuangKey = k; });
    const wuhuang = wuhuangKey ? GONG8.find(g => g.key === wuhuangKey) : null;
    return {
      year, yearGanZhi, zhi,
      taisui: gong8(zhi.deg),
      suipo: gong8(ts.suipoDeg),
      sansha: sansha.map(m => ({ name: m.name, g: gong8(m.deg) })),
      wuhuang, nianCenter,
    };
  }

  // 生肖 ↔ 地支（LY_BRANCHES 顺序对应）
  const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

  // 「今日与你」个性化卡（排盘后）：今日日干喜忌 / 今日八宅吉方 / 生肖与太岁关系
  function renderTodayPersonal(a, ly) {
    const host = $('today-personal');
    if (!host) return;
    const fit = baziFitData();                     // 复用缓存：{bz, bazi} 或 null
    const en = isEN();
    if (!fit) {
      renderTodayCharacterStory(null);
      // 未排盘：一行 CTA（样式借堪舆页 compass-cta），点击切「命」页
      host.innerHTML =
        '<div class="today-cta" role="button" tabindex="0">'
        + (en ? "Cast your chart, and this panel shows each day's fit with your natal profile → Cast chart" : '排八字后，此处每日展示与阁下命格的契合 → 去排盘')
        + '</div>';
      const cta = host.querySelector('.today-cta');
      const go = () => switchTab('bazi');
      cta.addEventListener('click', go);
      cta.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      return;
    }
    const bz = fit.bz, bazi = fit.bazi;
    // a. 今日日干支五行 vs 阁下喜用/忌神（今人方法）
    const dayGZ = (a.ganZhiText.split(' ')[2] || '').replace('日', ''); // 「甲子」
    const dGan = dayGZ[0], dGanEl = C.GAN_EL[dGan] || '';
    let dVerdict, dCls;
    if (bazi.favorable.indexOf(dGanEl) >= 0) { dVerdict = en ? 'matches your favorable elements' : '得阁下喜用'; dCls = 'kw-yi'; }
    else if (bazi.unfavorable.indexOf(dGanEl) >= 0) { dVerdict = en ? 'clashes with your unfavorable elements' : '犯阁下忌神'; dCls = 'kw-ji'; }
    else { dVerdict = en ? 'neutral to your favorable/unfavorable elements' : '于阁下喜忌俱平'; dCls = 'dim'; }
    const elCls = WX_CLASS[dGanEl] ? ` class="${WX_CLASS[dGanEl]}"` : '';
    // B2 流日十神：今日日干对阁下日主的十神（ChartFacts.shiShen·今人按五行阴阳推，非典据；无 cite-map 子平键，
    //   宁标「今人整理」不挂 dead chip → 铁律「删优于编」）。
    let tenShenLine = '';
    if (window.ChartFacts && typeof ChartFacts.shiShen === 'function' && dGan && bazi.dm) {
      const tg = ChartFacts.shiShen(bazi.dm, dGan);
      if (tg) tenShenLine = en
        ? `<p class="tp-line tp-full tp-tenshen">Today's <b${elCls}>${escapeHtml(dGan)} ${escapeHtml(elEN(dGanEl))}</b> is your <b>${renderTerm(tg, termDispEN(tg))}</b>.`
          + `<span class="tp-tag">${renderTerm('十神')} · ${escapeHtml(tt('common.modern_synthesis'))}</span></p>`
        : `<p class="tp-line tp-full tp-tenshen">今日<b${elCls}>${escapeHtml(dGan)}${escapeHtml(dGanEl)}</b>，为阁下之<b>${renderTerm(tg)}</b>。`
          + `<span class="tp-tag">${renderTerm('十神')}·今人整理</span></p>`;
    }
    // B5 本命日：今日干支 == 阁下日柱干支（60 日一遇，古称伏吟）。伏吟一词无语料可锚 → 今人整理，不挂 chip。
    const userDayGZ = bazi.pillars && bazi.pillars[2] ? bazi.pillars[2].gz : '';
    const isBenming = (window.PersonalCalendar && PersonalCalendar.isFuyinDay)
      ? PersonalCalendar.isFuyinDay(dayGZ, userDayGZ)
      : !!(dayGZ && userDayGZ && dayGZ === userDayGZ);
    const benmingTag = isBenming ? `<span class="tp-benming">${en ? escapeHtml(tt('common.benming_day')) : '本命日'}</span>` : '';
    const fuyinLine = isBenming
      ? (en
        ? `<p class="tp-line tp-full tp-fuyin">Today's stem-branch matches your Day Pillar (<b>${escapeHtml(userDayGZ)}</b>) — traditionally <b>${renderTerm('伏吟', '伏吟 fúyín')}</b>.<span class="tp-tag">${escapeHtml(tt('common.modern_synthesis'))}</span></p>`
        : `<p class="tp-line tp-full tp-fuyin">今日干支与阁下日柱相同（<b>${escapeHtml(userDayGZ)}</b>），古称<b>${renderTerm('伏吟')}</b>。<span class="tp-tag">今人整理</span></p>`)
      : '';
    // b. 今日吉方（八宅生气/天医）
    const dirOf = star => {
      const t = Object.keys(bz.stars).find(k => bz.stars[k] === star);
      if (!t) return '—';
      return en ? `${DIR_EN[C.TRIGRAMS[t].dir] || C.TRIGRAMS[t].dir} (${t}宫)` : `${C.TRIGRAMS[t].dir}（${t}宫）`;
    };
    // c. 生肖与流年太岁（值/冲/偏），纯描述、无恐吓词
    const uIdx = SHENGXIAO.indexOf(bazi.shengXiao);
    const yIdx = ly.zhi.idx;
    let sxLine, sxLineHtml = null;
    const sxAnimal = bazi.shengXiao, tsZhi = ly.zhi.name;
    const tsZhiEN = BRANCH_PY[tsZhi] ? `${tsZhi} ${cap1(BRANCH_PY[tsZhi])}` : tsZhi;
    if (uIdx === yIdx) {
      sxLine = `阁下属${bazi.shengXiao}，与今年太岁同支（${ly.zhi.name}），古称「值太岁」（本命年）。《协纪辨方书》谓值年之支宜静守、宜顺时调摄。`;
      if (en) sxLineHtml = `You are born in the year of the ${sxEN(sxAnimal)} (${escapeHtml(sxAnimal)}); your branch coincides with this year's ${renderTerm('太岁', '太岁 Tàisuì')} branch (${escapeHtml(tsZhiEN)}) — the natal-branch year (本命年). The 《协纪辨方书》 counsels a settled, seasonally attuned year.`;
    } else if (uIdx >= 0 && (uIdx + 6) % 12 === yIdx) {
      sxLine = `阁下属${bazi.shengXiao}，与今年太岁（${ly.zhi.name}）相对为「冲太岁」。古法以安分守常、多加调摄为宜。`;
      if (en) sxLineHtml = `You are born in the year of the ${sxEN(sxAnimal)} (${escapeHtml(sxAnimal)}); your branch opposes this year's ${renderTerm('太岁', '太岁 Tàisuì')} (${escapeHtml(tsZhiEN)}) — traditionally a clash with 太岁. Classical counsel is to keep to routine and take care.`;
    } else {
      sxLine = `阁下属${bazi.shengXiao}，与今年太岁（${ly.zhi.name}）无直接刑冲，古称「不犯」。`;
      if (en) sxLineHtml = `You are born in the year of the ${sxEN(sxAnimal)} (${escapeHtml(sxAnimal)}); it has no direct clash or punishment with this year's ${renderTerm('太岁', '太岁 Tàisuì')} (${escapeHtml(tsZhiEN)}) — traditionally unafflicted.`;
    }
    // 紧凑双列排布：日干喜忌 / 今日吉方 并列成两栏，生肖太岁一句沉底占满宽；chips 缩小一号（.tp-tag）
    if (en) {
      host.innerHTML =
        '<div class="card tp-card">'
        + '<div class="tp-title"><span class="seal">今日</span><b class="gold">Today &amp; You</b>' + benmingTag
        + `<span class="dim">${renderTerm('命卦')} ${escapeHtml(bz.mingGua)} (${escapeHtml(GROUP_EN[bz.groupName] || bz.groupName)}) · ${renderTerm('日主')} ${escapeHtml(bazi.dm)} ${escapeHtml(elEN(bazi.dmEl))}</span></div>`
        + '<div class="tp-grid">'
        + `<p class="tp-line tp-col">Today's <b${elCls}>${escapeHtml(dGan)} ${escapeHtml(elEN(dGanEl))}</b> — <b class="${dCls}">${dVerdict}</b>.<span class="tp-tag">${escapeHtml(tt('common.modern_method'))}</span></p>`
        + `<p class="tp-line tp-col">Auspicious: ${renderTerm('生气', termDispEN('生气'))} <b class="kw-yi">${dirOf('生气')}</b> · ${renderTerm('天医', termDispEN('天医'))} <b class="kw-yi">${dirOf('天医')}</b><span class="tp-tag cite-chip" data-cite="bazhai-dayouniange" role="button" tabindex="0">《八宅明镜》 Bāzhái Míngjìng</span></p>`
        + `<p class="tp-line tp-full">${sxLineHtml}<span class="tp-tag cite-chip" data-cite="xinji-bianfang" role="button" tabindex="0">《钦定协纪辨方书》 Qīndìng Xiéjì Biànfāng Shū</span></p>`
        + tenShenLine
        + fuyinLine
        + '</div>'
        + '</div>';
    } else {
      host.innerHTML =
        '<div class="card tp-card">'
        + '<div class="tp-title"><span class="seal">今日</span><b class="gold">今日与你</b>' + benmingTag
        + `<span class="dim">${renderTerm('命卦')}${escapeHtml(bz.mingGua)}（${escapeHtml(bz.groupName)}）· ${renderTerm('日主')}${escapeHtml(bazi.dm)}${escapeHtml(bazi.dmEl)}</span></div>`
        + '<div class="tp-grid">'
        + `<p class="tp-line tp-col">今日<b${elCls}>${escapeHtml(dGan)}${dGanEl}</b>，<b class="${dCls}">${dVerdict}</b>。<span class="tp-tag">今人方法</span></p>`
        + `<p class="tp-line tp-col">吉方：${renderTerm('生气')}<b class="kw-yi">${dirOf('生气')}</b>·${renderTerm('天医')}<b class="kw-yi">${dirOf('天医')}</b><span class="tp-tag cite-chip" data-cite="bazhai-dayouniange" role="button" tabindex="0">《八宅明镜》游年八星</span></p>`
        + `<p class="tp-line tp-full">${escapeHtml(sxLine)}<span class="tp-tag cite-chip" data-cite="xinji-bianfang" role="button" tabindex="0">《钦定协纪辨方书》口径</span></p>`
        + tenShenLine
        + fuyinLine
        + '</div>'
        + '</div>';
    }
    renderTodayTrigger(host.querySelector('.card')); // 今日触发：流年规则挂卡尾（无则不挂）
    renderTodayCharacterStory(bazi);
  }

  // 流年卡（纯年份推算，与 GPS 无关）：太岁/岁破/三煞/年五黄 + 八方位九宫示意
  function renderTodayLiunian(ly) {
    const host = $('today-liunian');
    if (!host) return;
    // 八方位九宫：外八格标方位 + 流年角色（优先级 太岁>岁破>三煞>五黄），中宫标年
    const role = {}; // key → { cls, label }
    if (ly.wuhuang) role[ly.wuhuang.key] = { cls: 'tl-wuhuang', label: '五黄' };
    ly.sansha.forEach(s => { role[s.g.key] = { cls: 'tl-sansha', label: '三煞' }; });
    role[ly.suipo.key] = { cls: 'tl-suipo', label: '岁破' };
    role[ly.taisui.key] = { cls: 'tl-taisui', label: '太岁' };
    const dirZh = { N: '北', NE: '东北', E: '东', SE: '东南', S: '南', SW: '西南', W: '西', NW: '西北' };
    const layout = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];
    let grid = '<div class="tl-grid">';
    layout.forEach(k => {
      if (k === 'C') {
        grid += `<div class="tl-cell tl-center"><span class="tl-dir">${ly.yearGanZhi}</span><span class="tl-role">年</span></div>`;
        return;
      }
      const r = role[k];
      grid += `<div class="tl-cell${r ? ' ' + r.cls : ''}"><span class="tl-dir">${dirZh[k]}</span>`
        + `<span class="tl-role">${r ? r.label : '·'}</span></div>`;
    });
    grid += '</div>';
    const ssTxt = ly.sansha.map(s => `${s.name}（${s.g.gong}宫）`).join('、');
    const ssDir = ly.sansha.map(s => s.g.dir).filter((v, i, arr) => arr.indexOf(v) === i).join('·');
    host.innerHTML =
      '<div class="tl-head"><span class="seal">流年</span>'
      + `<span class="tl-year">${ly.yearGanZhi}年</span></div>`
      + grid
      + '<p class="ly-section-title">太岁与岁破</p>'
      + '<div class="ly-item ly-taisui"><span>🟡</span><span>'
      + `<b>太岁在${ly.zhi.name}·${ly.taisui.gong}宫·${ly.taisui.dir}</b><br>`
      + '<span style="font-size:11px;color:var(--paper-dim)">此方位宜静不宜动土（《协纪辨方书》）</span></span></div>'
      + '<div class="ly-item ly-suipo"><span>🔶</span><span>'
      + `<b>岁破在${C.LY_BRANCHES[(ly.zhi.idx + 6) % 12]}·${ly.suipo.gong}宫·${ly.suipo.dir}</b>（太岁对冲）</span></div>`
      + '<p class="ly-src">出处：<span class="cite-chip" data-cite="xinji-bianfang" role="button" tabindex="0">《钦定协纪辨方书》</span>卷三·论太岁（清乾隆四年重修，何国宗、梅瑴成编纂）；二十四山15°支位</p>'
      + `<p class="ly-section-title">三煞（${ly.sansha.map(s => s.name).join('·')}三山·${ssDir}）</p>`
      + '<div class="ly-item ly-sansha"><span>⚠️</span><span>'
      + `<b>三煞方位：${ssTxt}</b><br>`
      + '<span style="font-size:11px;color:var(--paper-dim)">三煞方不可坐向，修造须避（《协纪辨方书》）</span></span></div>'
      + '<p class="ly-src">出处：<span class="cite-chip" data-cite="xinji-bianfang" role="button" tabindex="0">《钦定协纪辨方书》</span>卷三（劫煞/灾煞/岁煞，15°三山，乾隆四年重修，何国宗、梅瑴成）</p>'
      + (ly.wuhuang
        ? '<p class="ly-section-title">年五黄方</p>'
          + '<div class="ly-item ly-wuhuang"><span>🔴</span><span>'
          + `<b>五黄在${ly.wuhuang.gong}宫·${ly.wuhuang.dir}</b><br>`
          + '<span style="font-size:11px;color:var(--paper-dim)">此方年内宜静，修造/安床宜避；45°八宫精度</span></span></div>'
          + `<p class="ly-src">年紫白：${C.LY_STAR_NAMES[ly.nianCenter]}入中顺飞</p>`
        : '');
  }

  // ===== 节气临界卡 =====
  // 24 节气 → 四季（以四立为界）；供「当季」《素问·四气调神大论》配句
  const JIEQI_SEASON = {
    立春: '春', 雨水: '春', 惊蛰: '春', 春分: '春', 清明: '春', 谷雨: '春',
    立夏: '夏', 小满: '夏', 芒种: '夏', 夏至: '夏', 小暑: '夏', 大暑: '夏',
    立秋: '秋', 处暑: '秋', 白露: '秋', 秋分: '秋', 寒露: '秋', 霜降: '秋',
    立冬: '冬', 小雪: '冬', 大雪: '冬', 冬至: '冬', 小寒: '冬', 大寒: '冬',
  };
  // 《黄帝内经·素问·四气调神大论篇第二》春夏秋冬四段首句（繁体·原文精确子串，
  //   已对 daos/data/texts/huangdi-suwen.json ch02 逐字校验；出处 chip 走书级 CitePop）。
  const SUWEN_SEASON = {
    春: '春三月，此謂發陳。天地俱生，萬物以榮。',
    夏: '夏三月，此謂蕃秀。天地氣交，萬物華實。',
    秋: '秋三月，此謂容平。天氣以急，地氣以明。',
    冬: '冬三月，此謂閉藏。水冰地坼，無擾乎陽。',
  };
  // 节气推算（下一节气名 + 精确交节时刻 + 倒计时粒度）：供节气卡与「岁时」摘要共用，不重复两份。
  // lunar-js 直取 getNextJieQi/getPrevJieQi（与黄历卡同源）；交节时刻由 JieQi.getSolar() 组 JS Date。
  function computeJieqi(now) {
    now = now || new Date();
    if (typeof Solar === 'undefined') return null;
    let nextName = '', curName = '', jqDate = null;
    try {
      const lunar = Solar.fromDate(now).getLunar();
      const nj = lunar.getNextJieQi(true), pj = lunar.getPrevJieQi(true);
      nextName = nj.getName(); curName = pj.getName();
      const s = nj.getSolar();
      jqDate = new Date(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(),
        typeof s.getSecond === 'function' ? s.getSecond() : 0);
    } catch (e) { return null; }
    if (!nextName || !jqDate || isNaN(jqDate.getTime())) return null;
    const diffMs = jqDate.getTime() - now.getTime();
    const whenStr = `${jqDate.getMonth() + 1}月${jqDate.getDate()}日 ${pad2(jqDate.getHours())}:${pad2(jqDate.getMinutes())} 交节`;
    let countStr, countShort, countShortEN;                        // countShortEN：EN 摘要专用（zh 恒不取用）
    if (diffMs <= 0) { countStr = '此刻交节'; countShort = '此刻交节'; countShortEN = 'now'; }
    else {
      const totalMin = Math.floor(diffMs / 60000);
      const days = Math.floor(totalMin / 1440);
      const rem = totalMin - days * 1440;
      const sc = Math.floor(rem / 120);            // 一时辰 = 2 小时 = 120 分
      const mn = rem - sc * 120;
      if (days > 0) { countStr = `还有 ${days} 天 ${sc} 时辰`; countShort = `${days}天后`; countShortEN = `in ${days} day${days > 1 ? 's' : ''}`; }
      else if (sc > 0) { countStr = `还有 ${sc} 时辰 ${mn} 分`; countShort = `${sc}时辰后`; countShortEN = `in ${sc} double-hour${sc > 1 ? 's' : ''}`; }
      else { countStr = `还有 ${mn} 分`; countShort = `${mn}分后`; countShortEN = `in ${mn} min`; }
    }
    const critical = diffMs > 0 && diffMs < 48 * 3600 * 1000;   // <48h 临界
    return { nextName, curName, jqDate, diffMs, whenStr, countStr, countShort, countShortEN, critical };
  }

  // 节气临界卡（收纳于「岁时」展开区）：下一节气 + 精确交节时刻 + 倒计时；<48h 临界态金边呼吸。
  function renderJieqiCard(now) {
    const host = $('jieqi-card');
    if (!host) return;
    const info = computeJieqi(now || new Date());
    if (!info) { host.hidden = true; return; }
    host.hidden = false;
    // 一次性委托：素问出处 chip → 书级 CitePop（不占 CITE_MAP，直呼 openCite，与开屏引文同法）
    if (!host._suwenWired) {
      host._suwenWired = true;
      const openSuwen = e => {
        const chip = e.target.closest && e.target.closest('.jieqi-cite');
        if (!chip) return;
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (window.CitePop && window.CitePop.openCite) window.CitePop.openCite({ book: 'huangdi-suwen' });
      };
      host.addEventListener('click', openSuwen);
      host.addEventListener('keydown', openSuwen);
    }
    host.classList.toggle('jieqi-critical', info.critical);
    const season = JIEQI_SEASON[info.curName];
    const quote = season ? SUWEN_SEASON[season] : null;          // 抽不到合格句则不配引文（宁缺毋滥）
    let html = '<div class="jieqi-head"><span class="seal">节气</span>'
      + `<b class="gold">下一节气 · ${renderTerm(info.nextName)}</b>`
      + (info.critical ? '<span class="jieqi-flag">临界</span>' : '')
      + '</div>'
      + `<div class="jieqi-when">${escapeHtml(info.whenStr)}</div>`
      + `<div class="jieqi-count">${escapeHtml(info.countStr)}</div>`;
    if (quote) {
      html += `<p class="jieqi-quote">${escapeHtml(quote)}`
        + '<span class="jieqi-cite cite-chip" role="button" tabindex="0">《素问·四气调神大论》</span></p>';
    }
    host.innerHTML = html;
  }

  // ===== B3 三伏 / 数九卡（岁时展开区·节气卡之后） =====
  // 数据源：lunar-js getFu()（初/中/末伏）· getShuJiu()（一九..九九），皆非空才显；否则完全隐藏（补充口径）。
  //   getName()=名（如「中伏」「三九」）、getIndex()=期内第几天（1 基）。伏=夏、数九=冬 → 复用节气卡已验证的
  //   SUWEN_SEASON 四季映射配《素问》句（不新增引文）；素问 chip 与节气卡同法（直呼 CitePop 书级·不占 CITE_MAP）。
  function computeFuShu(now) {
    if (typeof Solar === 'undefined') return null;
    let fu = null, sj = null;
    try {
      const lunar = Solar.fromDate(now || new Date()).getLunar();
      if (typeof lunar.getFu === 'function') { const f = lunar.getFu(); if (f && typeof f.getName === 'function') fu = f; }
      if (typeof lunar.getShuJiu === 'function') { const s = lunar.getShuJiu(); if (s && typeof s.getName === 'function') sj = s; }
    } catch (e) { return null; }
    if (!fu && !sj) return null;
    // 同一天不会既伏又九；伏→夏、九→冬
    const obj = fu || sj;
    const season = fu ? '夏' : '冬';
    let idx = '';
    try { idx = typeof obj.getIndex === 'function' ? obj.getIndex() : ''; } catch (e) { idx = ''; }
    return { name: obj.getName(), index: idx, season, kind: fu ? 'fu' : 'shujiu' };
  }
  function fuShuLabel(fs) {
    return fs.name + (fs.index ? '第' + fs.index + '天' : '');
  }
  function renderFuCard(now) {
    const host = $('fu-card');
    if (!host) return;
    const fs = computeFuShu(now || new Date());
    if (!fs) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    // 素问出处 chip：一次性委托 → 书级 CitePop（与节气卡同法，不占 CITE_MAP，不新增引文）
    if (!host._suwenWired) {
      host._suwenWired = true;
      const openSuwen = e => {
        const chip = e.target.closest && e.target.closest('.jieqi-cite');
        if (!chip) return;
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (window.CitePop && window.CitePop.openCite) window.CitePop.openCite({ book: 'huangdi-suwen' });
      };
      host.addEventListener('click', openSuwen);
      host.addEventListener('keydown', openSuwen);
    }
    const quote = SUWEN_SEASON[fs.season];    // 复用节气卡四季映射（伏→夏·九→冬），抽不到则不配句
    const seal = fs.kind === 'fu' ? '三伏' : '数九';
    let html = '<div class="jieqi-head"><span class="seal">' + seal + '</span>'
      + `<b class="gold">${escapeHtml(fuShuLabel(fs))}</b></div>`
      + `<div class="jieqi-count">${escapeHtml(fuShuLabel(fs))}</div>`;
    if (quote) {
      html += `<p class="jieqi-quote">${escapeHtml(quote)}`
        + '<span class="jieqi-cite cite-chip" role="button" tabindex="0">《素问·四气调神大论》</span></p>';
    }
    host.innerHTML = html;
  }

  // 「岁时」横条摘要（收起态一行）：下一节气倒计时 · 流年岁破方。点开即见完整节气卡 + 流年九宫。
  function renderSuishiSummary(now, ly) {
    const el = $('suishi-summary');
    if (!el) return;
    now = now || new Date();
    const jq = computeJieqi(now);
    ly = ly || liunianInfo(now);
    const en = isEN();
    const parts = [];
    if (jq) parts.push(en
      ? `<b class="gold">${renderTerm(jq.nextName, jieqiDisp(jq.nextName))}</b> <span class="suishi-count">${escapeHtml(jq.countShortEN || jq.countShort)}</span>`
      : `<b class="gold">${renderTerm(jq.nextName)}</b> <span class="suishi-count">${escapeHtml(jq.countShort)}</span>`);
    const fs = computeFuShu(now);   // B3：伏九期内于收起摘要露一段（同行·无高度增量），非伏九期不加
    if (fs) parts.push(`<span class="suishi-fu">${escapeHtml(fuShuLabel(fs))}</span>`); // 三伏/数九 folk 名保汉字（未收宪法表）
    const dir = (ly && ly.suipo && ly.suipo.dir ? ly.suipo.dir : '').replace('正', '');
    if (ly) parts.push(en
      ? `<b>${escapeHtml(ly.yearGanZhi)} ${ganzhiPY(ly.yearGanZhi)} year</b> ${renderTerm('岁破')} ${escapeHtml(DIR_EN[dir] || dir)}`
      : `<b>${escapeHtml(ly.yearGanZhi)}年</b> 岁破${escapeHtml(dir)}`);
    el.innerHTML = parts.join('<span class="suishi-sep"> · </span>');
  }

  // ===== C1 黄历宜忌探源 + C3 个性化金点 =====
  // 值神/建除均直取 lunar-js（getDayTianShen/getDayTianShenType/getZhiXing = 事实源，本层不自判类）；
  // 方法缺失（如 e2e stub 的简化 lunar）→ almanacDerive 返回 null，宜忌回落纯文本渲染，行为与改前一致。
  const ZHIXING_ORDER = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
  const ZHI12_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  // 地支本气五行 / 五行生克（今人整理·通行口径）
  const ZHI_WUXING = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  const WX_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const WX_KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  // 地支关系查表（镜像 daos/data/rules/tables/branch-relations.json·今人整理通行口径）：月建 vs 日支
  const BRANCH_LIUHE = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
  const BRANCH_LIUCHONG = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
  const BRANCH_LIUHAI = [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']];
  function branchPairIn(list, a, b) {
    return list.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
  }
  function branchRelation(mz, dz) {
    if (!mz || !dz) return '';
    if (branchPairIn(BRANCH_LIUHE, mz, dz)) return `${mz}${dz}相合（六合）`;
    if (branchPairIn(BRANCH_LIUCHONG, mz, dz)) return `${mz}${dz}相冲（六冲）`;
    if (branchPairIn(BRANCH_LIUHAI, mz, dz)) return `${mz}${dz}相害（六害）`;
    const em = ZHI_WUXING[mz], ed = ZHI_WUXING[dz];
    if (em && ed) {
      if (em === ed) return `五行皆${em}（比和）`;
      if (WX_SHENG[em] === ed) return `月建${em}生日支${ed}`;
      if (WX_SHENG[ed] === em) return `日支${ed}生月建${em}`;
      if (WX_KE[em] === ed) return `月建${em}克日支${ed}`;
      if (WX_KE[ed] === em) return `日支${ed}克月建${em}`;
    }
    return '';
  }
  // 黄历宜忌逐日推导：值神(名+黄道/黑道)、建除、月令(月建-日支位次)。全部 lunar-js 直算，缺方法即 null。
  function almanacDerive(now) {
    if (typeof Solar === 'undefined') return null;
    try {
      const lunar = Solar.fromDate(now || new Date()).getLunar();
      if (typeof lunar.getDayTianShen !== 'function' || typeof lunar.getZhiXing !== 'function') return null;
      const zhiShen = lunar.getDayTianShen();
      const zhiXing = lunar.getZhiXing();
      if (!zhiShen || !zhiXing) return null;
      const zhiShenType = typeof lunar.getDayTianShenType === 'function' ? lunar.getDayTianShenType() : '';
      const monthZhi = typeof lunar.getMonthZhi === 'function' ? lunar.getMonthZhi() : '';
      const dayZhi = typeof lunar.getDayZhi === 'function' ? lunar.getDayZhi() : '';
      let pos = -1;
      const mi = ZHI12_ORDER.indexOf(monthZhi), di = ZHI12_ORDER.indexOf(dayZhi);
      if (mi >= 0 && di >= 0) pos = ((di - mi) % 12 + 12) % 12; // 自「建」(0) 顺数位次
      return { zhiShen, zhiShenType, zhiXing, monthZhi, dayZhi, pos, rel: branchRelation(monthZhi, dayZhi) };
    } catch (e) { return null; }
  }
  let _almanacDerive = null;

  // C3 类目→五行映射（今人整理·约定俗成，非典据）：宜项活动的五行取象，用于「与阁下喜用相合」金点提示。
  //   口径为今人按活动性质单一归类（诸家取象本有异同，此处只取一说）；卡角小字明示「今人方法」。
  const YI_WUXING = {
    // 土：动土兴造·墙垣道路·坟茔堤仓
    动土: '土', 破土: '土', 修造: '土', 起基: '土', 定磉: '土', 筑堤: '土', 补垣: '土', 坏垣: '土',
    修饰垣墙: '土', 平治道涂: '土', 谢土: '土', 塞穴: '土', 造仓: '土', 修坟: '土', 造庙: '土',
    造桥: '土', 安葬: '土', 破屋: '土', 立碑: '土', 开生坟: '土', 修门: '土', 安门: '土',
    // 木：栽植梁柱·畜牧文教·织造·婚姻人事（生发结合归木）
    栽种: '木', 上梁: '木', 作梁: '木', 竖柱: '木', 架马: '木', 盖屋: '木', 开柱眼: '木', 合脊: '木',
    牧养: '木', 纳畜: '木', 教牛马: '木', 造畜稠: '木', 入学: '木', 习艺: '木', 结网: '木', 经络: '木',
    裁衣: '木', 造船: '木', 造车器: '木',
    嫁娶: '木', 纳采: '木', 纳婿: '木', 问名: '木', 订盟: '木', 冠笄: '木', 会亲友: '木', 进人口: '木', 合帐: '木',
    // 火：灶火祭祀·塑绘开光·斋醮
    作灶: '火', 出火: '火', 塑绘: '火', 开光: '火', 斋醮: '火', 普渡: '火', 安香: '火', 祭祀: '火',
    祈福: '火', 求嗣: '火', 入宅: '火', 安香火: '火',
    // 水：出行舟渔·沟渠井池·沐浴放水·迁徙（流动归水）
    出行: '水', 乘船: '水', 取渔: '水', 捕捉: '水', 畋猎: '水', 放水: '水', 开池: '水', 开渠: '水',
    掘井: '水', 沐浴: '水', 归岫: '水', 割蜜: '水', 断蚁: '水', 归宁: '水', 移徙: '水',
    // 金：财货交易·金属器械·裁断理容
    开市: '金', 交易: '金', 纳财: '金', 立券: '金', 出货财: '金', 开仓: '金', 置产: '金', 安机械: '金',
    安碓磑: '金', 雕刻: '金', 理发: '金', 整手足甲: '金', 拆卸: '金', 伐木: '金', 针灸: '金', 挂匾: '金',
  };
  // 排盘态：读 bazi-fav 喜用，宜项五行∈喜用 → 金点集合；无盘/无喜用 → null（未排盘不个性化）。
  function yiGoldSet(items) {
    let fav = null;
    try {
      const r = localStorage.getItem('bazi-fav');
      if (r) { const p = JSON.parse(r); if (p && Array.isArray(p.favorable) && p.favorable.length) fav = p.favorable; }
    } catch (e) {}
    if (!fav) return null;
    const set = new Set();
    items.forEach(x => { const el = YI_WUXING[x]; if (el && fav.indexOf(el) >= 0) set.add(x); });
    return set;
  }
  // 渲染宜/忌一行：有 derive 时每项为可点按钮（探源）；宜列排盘态按 C3 加金点并排前（忌列不动）。
  // 返回该行金点数（供角注显隐）。derive 缺失（stub）→ 回落纯文本 span + ` · ` 分隔，与改前逐字一致。
  function renderYiJiRow(elId, items, isJi) {
    const el = $(elId);
    if (!el) return 0;
    if (!items || !items.length) { el.innerHTML = '——'; return 0; }
    const clickable = !!_almanacDerive;
    const cls = isJi ? 'kw-ji' : 'kw-yi'; // 忌=淡朱 · 宜=淡金
    let list = items.slice();
    let goldSet = null;
    if (!isJi) {                                   // C3 只作用于宜列
      goldSet = yiGoldSet(items);
      if (goldSet && goldSet.size) {
        list.sort((a, b) => (goldSet.has(b) ? 1 : 0) - (goldSet.has(a) ? 1 : 0)); // 金点排前·稳定保序
      }
    }
    const html = list.map(x => {
      const gold = goldSet && goldSet.has(x) ? '<i class="yj-gold" aria-hidden="true"></i>' : '';
      if (clickable) {
        return `<button type="button" class="yj-item ${cls}" data-term="${escapeHtml(x)}" data-ji="${isJi ? 1 : 0}">${gold}${escapeHtml(x)}</button>`;
      }
      return `<span class="${cls}">${gold}${escapeHtml(x)}</span>`;
    }).join(clickable ? '<span class="yj-sep">·</span>' : ' · ');
    el.innerHTML = html;
    return goldSet ? goldSet.size : 0;
  }
  // 探源手风琴面板内容：值神/建除/月令三行 + 每行《协纪辨方书》书级 chip + 底部通则小字。
  function renderYiJiDerive(term, isJi) {
    const d = _almanacDerive, panel = $('yj-derive');
    if (!panel || !d) return;
    const chip = '<span class="cite-chip" data-cite="xinji-bianfang" role="button" tabindex="0">《协纪辨方书》</span>';
    const posName = (d.pos >= 0 ? ZHIXING_ORDER[d.pos] : '') || d.zhiXing;
    let h = `<div class="yj-dv-head"><b class="${isJi ? 'kw-ji' : 'kw-yi'}">「${escapeHtml(term)}」</b>`
      + `<span class="dim"> · 今日所${isJi ? '忌' : '宜'}之一，溯其历理</span></div>`;
    h += `<div class="yj-dv-row"><span class="yj-dv-tag">${renderTerm('值神')}</span><span class="yj-dv-body">`
      + `今日值神 <b>${renderTerm(d.zhiShen)}</b>${d.zhiShenType ? `（<b>${renderTerm(d.zhiShenType)}</b>日）` : ''}。`
      + `十二值神逐日轮值，古历据以别宜忌之纲。${chip}</span></div>`;
    h += `<div class="yj-dv-row"><span class="yj-dv-tag">${renderTerm('建除十二神', '建除')}</span><span class="yj-dv-body">`
      + `今日 <b>${renderTerm(d.zhiXing)}</b>日。建除十二神（建·除·满·平·定·执·破·危·成·收·开·闭）循月建递转。${chip}</span></div>`;
    if (d.monthZhi && d.dayZhi && d.pos >= 0) {
      h += `<div class="yj-dv-row"><span class="yj-dv-tag">月令</span><span class="yj-dv-body">`
        + `月建 <b>${escapeHtml(d.monthZhi)}</b>、日支 <b>${escapeHtml(d.dayZhi)}</b>，自「建」顺数第 <b>${d.pos + 1}</b> 位得「<b>${escapeHtml(posName)}</b>」。`
        + `${d.rel ? `<span class="dim"> ${escapeHtml(d.rel)}·今人整理</span>` : ''}${chip}</span></div>`;
    }
    h += `<p class="yj-dv-foot">推导依据为传统历法通则（今人实现），具体取舍诸历有异。</p>`;
    panel.innerHTML = h;
  }
  // 手风琴开合（同时只开一项）：委托挂在黄历卡上，一次性；点同项收起，点异项换内容。
  function wireYiJi(cardEl) {
    if (!cardEl || cardEl._yjWired) return;
    cardEl._yjWired = true;
    cardEl.addEventListener('click', e => {
      const btn = e.target.closest && e.target.closest('.yj-item');
      if (!btn || !cardEl.contains(btn)) return;
      const panel = $('yj-derive');
      if (!panel || !_almanacDerive) return;
      const term = btn.getAttribute('data-term') || '';
      const isJi = btn.getAttribute('data-ji') === '1';
      const active = cardEl.querySelector('.yj-item.active');
      if (active === btn && !panel.hidden) {          // 再点当前项 → 收起
        panel.hidden = true; btn.classList.remove('active'); btn.setAttribute('aria-expanded', 'false');
        return;
      }
      if (active) { active.classList.remove('active'); active.setAttribute('aria-expanded', 'false'); }
      btn.classList.add('active'); btn.setAttribute('aria-expanded', 'true');
      renderYiJiDerive(term, isJi);
      panel.hidden = false;
    });
  }

  // ===== 今日 =====
  let renderedDay = '';
  function renderToday() {
    const now = new Date();
    // key 纳入 bazi-input：排盘/焚盘后（即便同一小时）也重渲个性化区
    const bkey = localStorage.getItem('bazi-input') || '';
    const key = now.toDateString() + ':' + now.getHours() + ':' + bkey;
    if (key === renderedDay) return;
    renderedDay = key;
    const a = C.dailyAlmanac(now);
    // 干支纪年月日：三组，每组的干支两字挂「干支」词条（纪年/月/日字保留纯文本）
    $('today-ganzhi').innerHTML = (a.ganZhiText || '').split(' ')
      .map(g => renderTerm('干支', g.slice(0, 2)) + escapeHtml(g.slice(2))).join(' ');
    $('today-shengxiao').textContent = `属${a.shengXiao}年`;
    $('today-jieqi').textContent = a.jieQiToday
      ? `今日交节：${a.jieQiToday}`
      : `「${a.currentJieQi}」气中 · ${a.nextJieQiDate}交${a.nextJieQi}`;
    // 黄历人话摘要（小白第一眼）：宜/忌类目翻成大白话动词，字号略大于宜忌行
    renderAlmanacPlain('today-plain', a.yi, a.ji);
    // 黄历宜忌：C1 每项可点探源（值神/建除/月令）+ C3 排盘态宜列金点并排前；忌列不动。
    _almanacDerive = almanacDerive(now);
    const goldCount = renderYiJiRow('today-yi', a.yi, false);
    renderYiJiRow('today-ji', a.ji, true);
    const goldNote = $('yj-goldnote');
    if (goldNote) goldNote.hidden = !(goldCount > 0);        // 角注仅在有金点时常驻（未排盘/无命中即隐）
    const derivePanel = $('yj-derive');
    if (derivePanel) {                                        // 重渲染后收起旧探源面板，避免残留他日推导
      derivePanel.hidden = true; derivePanel.innerHTML = '';
    }
    const yiEl = $('today-yi');
    if (yiEl) wireYiJi(yiEl.closest('.card'));                // 手风琴委托挂黄历卡·一次性
    // 个性化区 + 流年卡
    const ly = liunianInfo(now);
    renderTodayPersonal(a, ly);
    renderTodayLiunian(ly);     // 收纳于「岁时」展开区
    renderJieqiCard(now);       // 节气临界卡（收纳于「岁时」展开区）
    renderFuCard(now);          // B3 三伏/数九卡（节气卡之后·非伏九期完全隐藏）
    renderSuishiSummary(now, ly); // 岁时横条一行摘要
    updateHoursBand(now);       // 喜用时辰带（排盘后·随今日页刷新即时出现）
    // 时卦
    const h = a.hexagram;
    $('hex-name').textContent = h.name;
    $('hex-sub').textContent = `${C.TRIGRAMS[h.upper].symbol}${h.upper}上 ${C.TRIGRAMS[h.lower].symbol}${h.lower}下 · ${h.moving}爻动`;
    $('hex-meaning').innerHTML = colorizeKeywords(h.meaning); // 时卦断语行着色
    if ($('hex-zhigua')) $('hex-zhigua').innerHTML = h.changedName ? colorizeKeywords(`动变→之卦：${h.changedName}·${h.changedMeaning}`, { gua: [h.changedName] }) : '';
    const hexEl = $('hex-lines');
    hexEl.innerHTML = '';
    for (let i = 5; i >= 0; i--) { // 视图自上而下=六爻自上而下
      const row = document.createElement('div');
      row.className = 'hex-line' + (h.lines[i] ? ' yang' : ' yin') + (h.moving === i + 1 ? ' moving' : '');
      row.style.animationDelay = `${(5 - i) * 0.18}s`;
      row.innerHTML = h.lines[i] ? '<i></i>' : '<i></i><i></i>';
      hexEl.appendChild(row);
    }
    // 导读（原晨语）：压缩为两行，打字机 + 关键字着色沿用（卦名染金·五行单字套色）；日落后转暮语（B4）
    typewriter($('today-master'), daoduText(a, now), undefined, { gua: [h.name, h.changedName] });
  }
  // B4 日落判定：已定位取 SunCalc 日落时刻，未定位 19:00 兜底（补充口径）。clockSunTimes 于运行时早已就绪。
  function isAfterSunset(now) {
    const ss = clockSunTimes && clockSunTimes.sunset;
    if (ss instanceof Date && !isNaN(ss.getTime()) && ss.toDateString() === now.toDateString()) {
      return now.getTime() > ss.getTime();
    }
    return now.getHours() >= 19;
  }
  // 导读文本（原「晨语」卡精简）：晨与暮两态共存于「导读」两行（补充：替换文案而非新增卡）。
  //   晨：晨起观历引子 + 节气气令；暮（日落后）：回顾今日已行 + 明日宜忌预告（lunar-js 直算明日）。
  function daoduText(a, now) {
    now = now || new Date();
    const gz = (a.ganZhiText || '').replace(/\s+/g, '');
    if (isEN()) return daoduTextEN(a, now); // EN：晨语两行 → 一行结构化摘要（干支+节气+top宜忌）
    if (isAfterSunset(now)) {
      let t = `暮色既临，今日${gz}已历。`;
      let tomo = null;
      try { tomo = C.dailyAlmanac(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0)); } catch (e) {}
      if (tomo) {
        const tgz = ((tomo.ganZhiText || '').split(/\s+/)[2] || '').replace('日', '');
        const noNil = arr => (arr || []).filter(x => x && x !== '无').slice(0, 2).join('·'); // 滤 lunar-js「无」空占位
        const yi = noNil(tomo.yi), ji = noNil(tomo.ji);
        t += `明日${tgz ? tgz + '日' : ''}`;
        if (yi) t += `，宜「${yi}」`;
        if (ji) t += `${yi ? '、' : '，'}忌「${ji}」`;
        t += yi || ji ? '，可预为筹计。' : '，宜忌俱平，安心度日。';
      } else {
        t += '安歇养神，明日再观历书。';
      }
      return t;
    }
    let t = `晨起检点历书，今日${gz}。`;
    t += a.jieQiToday
      ? `恰逢「${a.jieQiToday}」交节，天地气机一转，宜顺时调摄。`
      : `时下「${a.currentJieQi}」气中，${a.nextJieQiDate}交「${a.nextJieQi}」，作息且随之调。`;
    return t;
  }
  // EN 导读结构行：干支 + 节气 + top 宜忌（数据 token 保留汉字，英文框架，走术语体例）
  function daoduTextEN(a, now) {
    const noNil = arr => (arr || []).filter(x => x && x !== '无').slice(0, 2).join(' · ');
    const gzc = (a.ganZhiText || '').replace(/\s+/g, ' ').trim();
    if (isAfterSunset(now)) {
      let tomo = null;
      try { tomo = C.dailyAlmanac(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0)); } catch (e) {}
      let tomoStr = '';
      if (tomo) {
        const tyi = noNil(tomo.yi), tji = noNil(tomo.ji);
        tomoStr = ' · tomorrow' + (tyi ? ' appropriate: ' + tyi : '') + (tji ? '; avoid: ' + tji : '');
      }
      return tt('en.daodu.evening', { gz: gzc, tomo: tomoStr });
    }
    const jq = a.jieQiToday
      ? '節 ' + a.jieQiToday + ' begins today'
      : (a.currentJieQi ? 'in the 節 ' + a.currentJieQi + ' solar term' : '');
    const yi = noNil(a.yi), ji = noNil(a.ji);
    let yiji = '';
    if (yi) yiji += ' · appropriate: ' + yi;
    if (ji) yiji += ' · avoid: ' + ji;
    return tt('en.daodu.morning', { gz: gzc, jieqi: jq ? ' · ' + jq : '', yiji: yiji });
  }
  // 跨天回访自动刷新
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderToday(); });

  // 今日页折叠抽屉通用开合（时卦抽屉 / 岁时展开区）：展开态不计入首屏高度指标
  function wireCollapse(btnId, panelId) {
    const btn = $(btnId), panel = $(panelId);
    if (!btn || !panel || btn._collapseWired) return;
    btn._collapseWired = true;
    btn.addEventListener('click', () => {
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      btn.classList.toggle('open', willOpen);
    });
  }
  function wireTodayDrawers() {
    wireCollapse('ch-hexline', 'hex-drawer');   // hero 时卦抽屉
    wireCollapse('suishi-bar', 'suishi-detail'); // 岁时展开区（节气卡 + 流年九宫）
  }

  // ===== 天文钟 hero（太阳日照弧 + 大号时钟 + 时辰/时卦 + 双历月相）=====
  // 数据源：时间/时辰=本机时钟；时卦=C.meihuaByDate（复用梅花时卦，不重复实现）；
  //   日出/日落/太阳位置/月相=SunCalc（vendor，BSD-2，无运行时 CDN）。
  // GPS：已授权→静默取位；未决→「点亮日照」按钮点击才请求；拒绝/失败→隐藏日照仅留钟+双历。
  // 位置天级缓存 localStorage['clock-geo']。每分钟对齐整分刷新。
  const ZHI12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  // SunCalc getMoonIllumination.phase (0..1) → [月相名, emoji]；八相写死映射（朔·上弦·望·下弦+四中间相）
  function moonPhaseLabel(phase) {
    const p = ((phase % 1) + 1) % 1;
    if (p < 0.0625 || p >= 0.9375) return ['朔·新月', '🌑'];
    if (p < 0.1875) return ['蛾眉月', '🌒'];
    if (p < 0.3125) return ['上弦月', '🌓'];
    if (p < 0.4375) return ['盈凸月', '🌔'];
    if (p < 0.5625) return ['望·满月', '🌕'];
    if (p < 0.6875) return ['亏凸月', '🌖'];
    if (p < 0.8125) return ['下弦月', '🌗'];
    return ['残月', '🌘'];
  }
  const pad2 = n => (n < 10 ? '0' + n : '' + n);
  const fmtHM = date => pad2(date.getHours()) + ':' + pad2(date.getMinutes());
  // 当前时辰地支：优先 lunar-javascript（与时卦同一算法，永不背离），降级整点映射
  function shichenZhi(now) {
    try {
      if (typeof Solar !== 'undefined') return Solar.fromDate(now).getLunar().getTimeZhi();
    } catch (e) { /* 降级 */ }
    return ZHI12[Math.floor(((now.getHours() + 1) % 24) / 2)];
  }

  // ===== 喜用时辰带（天文钟 hero 底部；今人方法）=====
  // 排盘后：今日 12 时辰各自干支五行（lunar-js 时柱取干支，时支本气五行定归类），
  //   五行∈喜用者金亮、当前时辰描边；并给「下一喜用时段」一行（时刻范围·五行）。未排盘隐藏。
  // 时辰 → 起始钟点（子=23）与钟表区间（申=15:00–17:00）；时支本气五行 = C.ZHI_EL[支]。
  const SHICHEN_RANGES = [
    ['子', 23, '23:00', '01:00'], ['丑', 1, '01:00', '03:00'], ['寅', 3, '03:00', '05:00'],
    ['卯', 5, '05:00', '07:00'], ['辰', 7, '07:00', '09:00'], ['巳', 9, '09:00', '11:00'],
    ['午', 11, '11:00', '13:00'], ['未', 13, '13:00', '15:00'], ['申', 15, '15:00', '17:00'],
    ['酉', 17, '17:00', '19:00'], ['戌', 19, '19:00', '21:00'], ['亥', 21, '21:00', '23:00'],
  ];
  const SHICHEN_CENTER = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]; // 各时辰中点钟点（供 lunar-js 时柱取干支）
  // 下一喜用时辰起始（严格晚于 now，24h 内最近）
  function nextShichenStart(now, h) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0);
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
    return d;
  }
  let hoursBandKey = '';
  function updateHoursBand(now) {
    const host = $('ch-hours');
    if (!host) return;
    now = now || new Date();
    const data = baziFitData();
    if (!data) { host.hidden = true; host.innerHTML = ''; hoursBandKey = ''; return; }
    host.hidden = false;
    const fav = data.bazi.favorable;
    // 12 格结构（喜用格金亮）按「日期+喜用」缓存，仅每日重建一次；当前时辰描边/下一时段每分钟更新
    const dayKey = now.toDateString() + '|' + fav.join('');
    if (hoursBandKey !== dayKey) {
      hoursBandKey = dayKey;
      let cells = '<div class="ch-hours-band" role="list">';
      for (let i = 0; i < 12; i++) {
        const zhi = ZHI12[i];
        const el = C.ZHI_EL[zhi] || '';
        const on = fav.indexOf(el) >= 0;
        let gz = zhi;
        try {                                     // lunar-js 时柱（供 title 悬浮，honor「lunar-js 时柱」口径）
          const ec = Solar.fromYmdHms(now.getFullYear(), now.getMonth() + 1, now.getDate(), SHICHEN_CENTER[i], 0, 0)
            .getLunar().getEightChar();
          gz = ec.getTimeGan() + ec.getTimeZhi();
        } catch (e) { /* lunar 未就绪：退回地支 */ }
        cells += `<span class="ch-hour${on ? ' ch-hour-fav' : ''}" data-zhi="${zhi}" role="listitem"`
          + ` title="${escapeHtml(gz + '时 · ' + el + (on ? ' · 喜用' : ''))}">`
          + `<i class="ch-hour-dot"></i><em class="ch-hour-lb">${zhi}</em></span>`;
      }
      cells += '</div><div class="ch-hours-next" id="ch-hours-next"></div>';
      host.innerHTML = cells;
    }
    // 当前时辰描边
    const curZhi = shichenZhi(now);
    host.querySelectorAll('.ch-hour').forEach(c =>
      c.classList.toggle('ch-hour-now', c.getAttribute('data-zhi') === curZhi));
    // 下一喜用时段（严格晚于 now 的最近喜用时辰起始）
    const nextEl = $('ch-hours-next');
    if (nextEl) {
      let best = null;
      for (let i = 0; i < 12; i++) {
        const el = C.ZHI_EL[ZHI12[i]] || '';
        if (fav.indexOf(el) < 0) continue;
        const start = nextShichenStart(now, SHICHEN_RANGES[i][1]);
        if (!best || start < best.start) best = { i, el, start };
      }
      if (isEN()) {
        nextEl.innerHTML = best
          ? `Next favorable hour: ${branchHourEN(SHICHEN_RANGES[best.i][0])} ${SHICHEN_RANGES[best.i][2]}–${SHICHEN_RANGES[best.i][3]} · ${elEN(best.el)}`
            + `<span class="ch-hours-note">${escapeHtml(tt('common.modern_method'))}</span>`
          : `No favorable hour today<span class="ch-hours-note">${escapeHtml(tt('common.modern_method'))}</span>`;
      } else {
        nextEl.innerHTML = best
          ? `下一喜用时段：${SHICHEN_RANGES[best.i][0]}时 ${SHICHEN_RANGES[best.i][2]}–${SHICHEN_RANGES[best.i][3]} · ${best.el}`
            + '<span class="ch-hours-note">今人方法</span>'
          : '今日无喜用时段<span class="ch-hours-note">今人方法</span>';
      }
    }
  }

  let clockGeo = null;          // { lat, lng }
  let clockSunTimes = null;     // { sunrise, sunset }（Date）
  let clockArcState = 'off';    // 'located' | 'prompt' | 'off'
  let clockTimer = null;

  function loadCachedGeo() {
    try {
      const g = JSON.parse(localStorage.getItem('clock-geo') || 'null');
      if (!g || typeof g.lat !== 'number' || typeof g.lng !== 'number') return null;
      if (!g.ts || Date.now() - g.ts > 864e5) return null; // 天级缓存
      return { lat: g.lat, lng: g.lng };
    } catch (e) { return null; }
  }
  function saveGeo(lat, lng) {
    try { localStorage.setItem('clock-geo', JSON.stringify({ lat, lng, ts: Date.now() })); } catch (e) { /* 私密模式忽略 */ }
  }
  let clockSunDay = '';         // 日出日落对应的自然日（防跨零点陈旧）
  // 应用位置 → 算当日日出日落；成功置 located，失败/无效（极昼夜）降级 off
  function applyGeo(lat, lng, now) {
    const d = now || new Date();
    clockGeo = { lat, lng };
    if (window.SunCalc) {
      const t = SunCalc.getTimes(d, lat, lng);
      if (t.sunrise instanceof Date && !isNaN(t.sunrise) && t.sunset instanceof Date && !isNaN(t.sunset)) {
        clockSunTimes = { sunrise: t.sunrise, sunset: t.sunset };
        clockSunDay = d.toDateString();
        clockArcState = 'located';
        return true;
      }
    }
    clockSunTimes = null;
    clockArcState = 'off';
    return false;
  }

  // 弧几何：viewBox 100×40，弧 cx=50 baseY=34 R=30；白昼金点落弧、夜间弧顶悬月
  function positionArc(now) {
    const arc = $('ch-arc');
    if (!arc) return;
    const sunEl = $('ch-sun'), moonArcEl = $('ch-moon-arc');
    const riseEl = $('ch-sunrise'), setEl = $('ch-sunset'), btn = $('ch-locate');
    if (clockArcState === 'off') { arc.hidden = true; return; }
    arc.hidden = false;
    if (clockArcState === 'prompt' || !clockSunTimes) {
      arc.classList.add('ch-arc-idle');                 // 装饰弧 + 点亮按钮，无时刻无日月
      if (sunEl) sunEl.hidden = true;
      if (moonArcEl) moonArcEl.hidden = true;
      if (riseEl) riseEl.hidden = true;
      if (setEl) setEl.hidden = true;
      if (btn) btn.hidden = false;
      return;
    }
    arc.classList.remove('ch-arc-idle');
    if (btn) btn.hidden = true;
    const sr = clockSunTimes.sunrise, ss = clockSunTimes.sunset;
    if (riseEl) { riseEl.hidden = false; riseEl.textContent = '☀ ' + fmtHM(sr); }
    if (setEl) { setEl.hidden = false; setEl.textContent = fmtHM(ss) + ' ☾'; }
    const t = now.getTime();
    if (t >= sr.getTime() && t <= ss.getTime()) {
      const f = (t - sr.getTime()) / (ss.getTime() - sr.getTime());
      const theta = f * Math.PI;
      const x = 50 - 30 * Math.cos(theta);              // viewBox 单位（=百分比）
      const y = 34 - 30 * Math.sin(theta);
      if (sunEl) { sunEl.hidden = false; sunEl.style.left = x + '%'; sunEl.style.top = (y / 40 * 100) + '%'; }
      if (moonArcEl) moonArcEl.hidden = true;
    } else {
      if (sunEl) sunEl.hidden = true;
      if (moonArcEl && window.SunCalc) {
        const mp = moonPhaseLabel(SunCalc.getMoonIllumination(now).phase);
        moonArcEl.hidden = false;
        moonArcEl.innerHTML = '<span class="ch-ma-ico">' + mp[1] + '</span><span class="ch-ma-name">' + escapeHtml(mp[0]) + '</span>';
      }
    }
  }

  // B5/B6 天文钟节律状态：交时换牌用上一时辰去重；本命日金标随日刷新。
  let lastShichenZhi = null;
  // B6 交时辰仪式：时辰字 + 时卦名 墨→金渐变换牌（reduced-motion 直切无动画）+ 2s 轻提示「交X时」（仅今日页在场）。
  function shichenChangeCeremony(zhi) {
    const page = $('page-today');
    const onToday = !!(page && page.classList.contains('active'));
    if (!onToday) return;                                // 不在今日页不打扰（hero 不可见）
    if (!AURA_REDUCE) {
      const scEl = $('ch-sc-name'), hxEl = $('ch-hexline-txt');
      if (scEl) { scEl.classList.remove('ch-sc-swap'); void scEl.offsetWidth; scEl.classList.add('ch-sc-swap'); }
      if (hxEl && hxEl.textContent) { hxEl.classList.remove('ch-hexline-swap'); void hxEl.offsetWidth; hxEl.classList.add('ch-hexline-swap'); }
    }
    toast(tt('toast.cross_hour', { zhi: zhi }), 2000);
  }
  // B5 本命日金标：今日日柱干支 == 用户日柱干支（排盘后·60 日一遇）。未排盘/lunar 未就绪 → 隐藏。
  function updateBenmingBadge(now) {
    const bm = $('ch-benming');
    if (!bm) return;
    let isBM = false;
    const fit = baziFitData();
    if (fit && fit.bazi && fit.bazi.pillars && fit.bazi.pillars[2]) {
      try {
        if (typeof Solar !== 'undefined') {
          const gz = Solar.fromDate(now || new Date()).getLunar().getDayInGanZhi();
          isBM = (window.PersonalCalendar && PersonalCalendar.isFuyinDay)
            ? PersonalCalendar.isFuyinDay(gz, fit.bazi.pillars[2].gz)
            : !!gz && gz === fit.bazi.pillars[2].gz;
        }
      } catch (e) { isBM = false; }
    }
    bm.hidden = !isBM;
  }

  function renderClock(now) {
    now = now || new Date();
    const timeEl = $('ch-time');
    if (!timeEl) return;                                 // 无 hero（防御）
    // 跨零点：已定位则用缓存坐标重算当日日出日落，避免弧陈旧
    if (clockGeo && clockArcState === 'located' && clockSunDay !== now.toDateString()) {
      applyGeo(clockGeo.lat, clockGeo.lng, now);
    }
    timeEl.textContent = fmtHM(now);
    timeEl.setAttribute('datetime', now.toISOString());
    const zhi = shichenZhi(now);
    const prevZhi = lastShichenZhi;      // B6：交时辰瞬间换牌 + 轻提示（首帧 prevZhi=null 不触发）
    $('ch-sc-name').textContent = zhi + '时';
    $('ch-sc-ke').textContent = zhi + (now.getHours() % 2 === 1 ? '初' : '正'); // 初=时辰前一时·正=后一时
    let hexName = '';
    try { hexName = C.meihuaByDate(now).name; } catch (e) { /* lunar 未就绪 */ }
    // 时卦行（hero 内嵌抽屉的触发）：有卦名才显；文本进 txt 子节点（保留 chevron 不被覆写）。
    //   「时卦」二字挂词条（点击出白话释义；capture 相 stopPropagation 免连带展开抽屉）；卦名保留纯文本。
    const hexBtn = $('ch-hexline'), hexTxt = $('ch-hexline-txt');
    if (hexTxt) {
      hexTxt.innerHTML = hexName
        ? renderTerm('时卦', isEN() ? 'Hour hexagram' : '时卦') + ' · ' + escapeHtml(hexName)
        : '';
    }
    if (hexBtn) hexBtn.hidden = !hexName;
    // 时卦大意（极小一行·今人整理）：hexagram-plain 有此卦才显；EN 附卦名+中文大意（数据缺拼音，标注为今人白话）。
    const gistEl = $('ch-hex-gist');
    if (gistEl) {
      const gist = hexName && window.HEXAGRAM_PLAIN ? window.HEXAGRAM_PLAIN[hexName] : '';
      if (gist) {
        gistEl.innerHTML = isEN()
          ? '<span class="chg-label">Gist · </span>' + escapeHtml(hexName) + ' — ' + escapeHtml(gist) + '<span class="chg-note"> (editor’s plain note)</span>'
          : '此卦大意：' + escapeHtml(gist);
        gistEl.hidden = false;
      } else { gistEl.hidden = true; gistEl.textContent = ''; }
    }
    if (prevZhi !== null && prevZhi !== zhi) shichenChangeCeremony(zhi); // B6 交时换牌仪式
    lastShichenZhi = zhi;
    updateBenmingBadge(now);             // B5 本命日金标（今日日柱==用户日柱·60 日一遇）
    let solarText = '', weekText = '', lunarText = '';
    try {
      const a = C.dailyAlmanac(now);
      solarText = a.solarText; weekText = a.weekText; lunarText = a.lunarText;
    } catch (e) { /* lunar 未就绪 */ }
    if (isEN()) {
      // §4.2：公历 ISO + 星期缩写 + 农历（干支年拼音·历种标注，农历月日保汉字）
      const iso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
      let lunEN = '';
      try {
        const lu = Solar.fromDate(now).getLunar();
        const gzY = lu.getYearInGanZhi();
        lunEN = `lunar ${gzY} ${ganzhiPY(gzY)} year · ${lu.getMonthInChinese()}月${lu.getDayInChinese()}`;
      } catch (e) { /* lunar 未就绪：省略农历 */ }
      $('ch-date').textContent = `${iso} (${WEEK_EN[now.getDay()]})` + (lunEN ? ' · ' + lunEN : '');
    } else {
      $('ch-date').textContent = [solarText, weekText].filter(Boolean).join(' ') + (lunarText ? ' · ' + lunarText : '');
    }
    if (window.SunCalc) {
      const mp = moonPhaseLabel(SunCalc.getMoonIllumination(now).phase);
      $('ch-moon').innerHTML = '<span class="ch-moon-ico">' + mp[1] + '</span>' + escapeHtml(isEN() ? (MOON_EN[mp[0]] || mp[0]) : mp[0]);
    }
    positionArc(now);
    updateHoursBand(now);   // 喜用时辰带随钟同步（每分钟：当前时辰描边/下一喜用时段推进）
    updateDialMarks(now);   // 盘缘小件随日/定位刷新（每日吉神·月建；日出日落定位后）；内部签名去重，只内容变才重建
    updateDizhiBoard(now);  // 地支棋盘随钟刷：每交时辰重算当下三支与关系（签名去重·内容变才重建）
  }

  // 每分钟对齐整分刷新（每 tick 重新对齐，抗休眠漂移）
  function clockLoop() {
    renderClock();
    renderJieqiCard();                                 // 节气倒计时每分钟推进（天/时辰粒度）
    renderFuCard();                                    // B3 三伏/数九卡随日推进（跨入/出伏九期即时显隐）
    renderSuishiSummary();                             // 岁时摘要倒计时随分推进
    shichenUpdate();                                   // 时辰游标每分钟推进（24h 绕盘一圈）
    const now = new Date();
    const msToNextMin = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    clockTimer = setTimeout(clockLoop, msToNextMin + 20);
  }

  function locateForClock(silent) {
    const btn = $('ch-locate');
    if (!navigator.geolocation) { clockArcState = 'off'; renderClock(); return; }
    if (!silent && btn) { btn.disabled = true; btn.textContent = tt('clock.locating'); }
    navigator.geolocation.getCurrentPosition(
      pos => {
        saveGeo(pos.coords.latitude, pos.coords.longitude);
        applyGeo(pos.coords.latitude, pos.coords.longitude);
        if (btn) { btn.disabled = false; btn.textContent = tt('clock.locate'); }
        renderClock();
      },
      () => {                                            // 拒绝/失败：隐藏日照，仅钟+双历（无解释文案）
        clockArcState = 'off';
        if (btn) { btn.disabled = false; btn.textContent = tt('clock.locate'); }
        renderClock();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 864e5 }
    );
  }

  function initClock() {
    if (!$('clock-hero')) return;
    const btn = $('ch-locate');
    if (btn) btn.addEventListener('click', () => locateForClock(false));
    const cached = loadCachedGeo();
    if (cached) {
      applyGeo(cached.lat, cached.lng);                  // 缓存位置优先
    } else if (navigator.permissions && navigator.permissions.query) {
      clockArcState = 'off';                             // 判定前不显弧/按钮，避免闪
      navigator.permissions.query({ name: 'geolocation' }).then(st => {
        if (st.state === 'granted') locateForClock(true);         // 已授权：静默取位
        else if (st.state === 'denied') { clockArcState = 'off'; renderClock(); } // 已拒：优雅降级
        else { clockArcState = 'prompt'; renderClock(); }         // 未决：显示点亮按钮
      }).catch(() => { clockArcState = 'prompt'; renderClock(); });
    } else {
      clockArcState = 'prompt';                          // 无 permissions API：显示按钮（不自动弹权限）
    }
    clockLoop();                                         // 立即渲染一次并对齐分钟循环
  }

  // ===== 罗盘核心（HUD：固定像素、盘北随朝向旋转）=====
  let heading = 0;          // 连续化角度
  let lastRaw = null;
  let sensorOn = false;
  let lockedHeading = null; // 定盘：非 null 时冻结朝向，传感器/滑杆皆不动
  let onHeadingChange = null; // 由堪舆页挂载：朝向变 → 地图随罗盘转（heading-up）
  const canvas = () => $('luopan-hud');
  let compassFx = null;

  // ===== 罗盘多层特效引擎 =====
  // back：气场、三重光弧、扫描扇、八方射线、二十四山星点、五彩棱光、山门、坐向轴、阴阳潮汐。
  // front：白色天池、北针尾迹、星尘轨道、转向拖尾、方向残影、偏差弧、过山火花、共鸣爆发、定盘锁阵、归位印。
  // 仅堪舆页运行；30fps 上限、DPR≤2、离页/后台暂停；reduced-motion 只绘一张静态帧。
  function createCompassFx() {
    const back = $('compass-fx-back'), front = $('compass-fx-front'), page = $('page-kanyu');
    if (!back || !front || !page) return null;
    const bctx = back.getContext('2d'), fctx = front.getContext('2d');
    if (!bctx || !fctx) return null;
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const TAU = Math.PI * 2;
    const FIVE = ['#64aa78', '#d96b4f', '#c8aa59', '#d9d5c6', '#5c9ec4'];
    let dpr = 1, active = false, raf = 0, lastFrame = 0, lastBoundary = null, lastCenteredMountain = null;
    let turnEnergy = 0, turnDir = 1, locked = false, resonating = false, cleared = false;
    let bursts = [], headingEchoes = [];
    const YANG_MOUNTAINS = new Set(['壬', '甲', '丙', '庚', '艮', '巽', '坤', '乾', '寅', '巳', '申', '亥']);
    const motes = Array.from({ length: 30 }, (_, i) => ({
      a: (i / 30) * TAU + Math.random() * .18,
      r: .18 + Math.random() * .27,
      s: (.035 + Math.random() * .055) * (i % 2 ? 1 : -1),
      z: .55 + Math.random() * 1.35,
      p: Math.random() * TAU,
    }));

    function color() { return auraRGB || AURA_GOLD; }
    function rgba(c, a) { return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
    function polar(cx, cy, r, deg) {
      const a = deg * Math.PI / 180;
      return [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
    }
    function fitCanvas(cv, ctx) {
      const rect = cv.getBoundingClientRect();
      const size = Math.round(rect.width);
      if (!size) return 0;
      const bw = Math.round(size * dpr);
      if (cv.width !== bw || cv.height !== bw) { cv.width = bw; cv.height = bw; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return size;
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      fitCanvas(back, bctx); fitCanvas(front, fctx);
      cleared = false;
      if (reduce) draw(performance.now(), 0, true);
    }
    function clear() {
      [back, front].forEach((cv, i) => {
        const ctx = i ? fctx : bctx;
        if (!cv.width || !cv.height) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
      });
      cleared = true;
    }
    function suppressed() {
      return document.hidden || page.classList.contains('hud-collapsed') || page.classList.contains('dial-flipped') || page.classList.contains('fp-wizard-active');
    }
    function addBurst(kind, angle) {
      if (reduce) { draw(performance.now(), 0, true); return; }
      const c = kind === 'north' ? { r: 214, g: 72, b: 48 }
        : kind === 'lock' ? { r: 255, g: 247, b: 220 }
          : kind === 'center' ? { r: 255, g: 232, b: 166 }
          : kind === 'auspicious' ? { r: 236, g: 199, b: 86 } : color();
      bursts.push({ kind, angle: angle || 0, age: 0, life: kind === 'lock' ? 1050 : kind === 'center' ? 920 : 760, color: c });
      if (bursts.length > 8) bursts.shift();
    }

    function drawBack(now, dt, still) {
      const size = fitCanvas(back, bctx); if (!size) return;
      const ctx = bctx, cx = size / 2, cy = size / 2, R = size * .47, c = color();
      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'lighter';

      // 1. 外缘气场：低透明径向晕，随共鸣/定盘增强。
      const halo = ctx.createRadialGradient(cx, cy, R * .52, cx, cy, R);
      halo.addColorStop(0, rgba(c, 0));
      halo.addColorStop(.72, rgba(c, resonating ? .055 : .025));
      halo.addColorStop(.93, rgba(c, resonating ? .15 : .075));
      halo.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();

      // 2. 八方射线：保持方位结构，转动时亮度随速度上升。
      for (let i = 0; i < 8; i++) {
        const deg = i * 45 - heading;
        const p1 = polar(cx, cy, R * .66, deg), p2 = polar(cx, cy, R * (.88 + .025 * Math.sin(now / 760 + i)) , deg);
        const ray = ctx.createLinearGradient(p1[0], p1[1], p2[0], p2[1]);
        ray.addColorStop(0, rgba(c, 0)); ray.addColorStop(1, rgba(c, .08 + turnEnergy * .08));
        ctx.strokeStyle = ray; ctx.lineWidth = i % 2 ? .65 : 1;
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      }

      // 3. 三层错速旋转光弧：一正两反，形成“盘外还有盘”的纵深。
      const arcBands = [
        { r: .94, speed: .000055, span: .42, alpha: .18, width: 1.15 },
        { r: .86, speed: -.000038, span: .23, alpha: .12, width: .8 },
        { r: .76, speed: .000026, span: .14, alpha: .08, width: .65 },
      ];
      arcBands.forEach((band, bi) => {
        const phase = still ? bi * .7 : now * band.speed + bi * .8;
        ctx.strokeStyle = rgba(c, band.alpha + (resonating ? .07 : 0)); ctx.lineWidth = band.width;
        ctx.lineCap = 'round';
        for (let j = 0; j < 6; j++) {
          const a = phase + j * TAU / 6 + heading * Math.PI / 180 * (bi === 1 ? .2 : -.12);
          ctx.beginPath(); ctx.arc(cx, cy, R * band.r, a, a + band.span + .05 * Math.sin(now / 900 + j)); ctx.stroke();
        }
      });

      // 4. 反向符纹虚线环。
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((still ? 0 : -now * .000025) + heading * Math.PI / 540);
      ctx.setLineDash([1.5, 5.4]); ctx.lineDashOffset = still ? 0 : -now * .006;
      ctx.strokeStyle = rgba(c, locked ? .25 : .105); ctx.lineWidth = .75;
      ctx.beginPath(); ctx.arc(0, 0, R * .815, 0, TAU); ctx.stroke(); ctx.restore();

      // 5. 扫描扇：由多根衰减光线组成，慢速掠过盘面。
      if (!still) {
        const scan = now * .00019;
        for (let i = 0; i < 18; i++) {
          const a = scan - i * .012;
          const alpha = .055 * (1 - i / 18) * (resonating ? 1.65 : 1);
          ctx.strokeStyle = rgba(c, alpha); ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * .2, cy + Math.sin(a) * R * .2);
          ctx.lineTo(cx + Math.cos(a) * R * .91, cy + Math.sin(a) * R * .91); ctx.stroke();
        }
      }

      // 6. 二十四山星点：每过一山会由 front 层爆发，此处给出常驻坐标感。
      for (let i = 0; i < 24; i++) {
        const deg = i * 15 - heading, p = polar(cx, cy, R * .90, deg);
        const tw = .5 + .5 * Math.sin(now / 430 + i * 1.7);
        ctx.fillStyle = rgba(c, .08 + tw * .09 + turnEnergy * .07);
        ctx.beginPath(); ctx.arc(p[0], p[1], i % 3 === 0 ? 1.25 : .75, 0, TAU); ctx.fill();
      }

      // 7. 五行俱全时的五色棱光，只出现在最外缘，不把盘面染成彩虹。
      if (auraRainbow) {
        FIVE.forEach((hex, i) => {
          ctx.strokeStyle = hex + (resonating ? '55' : '2d'); ctx.lineWidth = 1.2;
          const a = (still ? 0 : now * .00004) + i * TAU / 5;
          ctx.beginPath(); ctx.arc(cx, cy, R * .985, a, a + .34); ctx.stroke();
        });
      }

      const facingMountain = C.mountainAt(C.norm(heading));
      const centerOffset = ((facingMountain.center - C.norm(heading) + 540) % 360) - 180;
      const centerFit = 1 - Math.min(1, Math.abs(centerOffset) / 7.5);

      // 15. 当前山门：正前方固定展开十五度扇区；越靠近本山中心，门缝越亮。
      const gateR = R * .69, gateA = -Math.PI / 2;
      ctx.fillStyle = rgba(c, .012 + centerFit * .035);
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, gateR, gateA - Math.PI / 24, gateA + Math.PI / 24); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(c, .07 + centerFit * .16); ctx.lineWidth = .8 + centerFit * .45;
      [-1, 1].forEach(side => {
        const a = gateA + side * Math.PI / 24;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * .49, cy + Math.sin(a) * R * .49);
        ctx.lineTo(cx + Math.cos(a) * gateR, cy + Math.sin(a) * gateR); ctx.stroke();
      });

      // 16. 坐向轴：一线贯通向首与坐山；定盘后加亮，强调“向/坐”不是两个孤立读数。
      const axis = ctx.createLinearGradient(cx, cy - R * .68, cx, cy + R * .68);
      axis.addColorStop(0, rgba(c, locked ? .32 : .13));
      axis.addColorStop(.48, rgba(c, .015)); axis.addColorStop(.52, rgba(c, .015));
      axis.addColorStop(1, 'rgba(205,215,226,' + (locked ? '.25' : '.09') + ')');
      ctx.strokeStyle = axis; ctx.lineWidth = locked ? 1.05 : .65;
      ctx.beginPath(); ctx.moveTo(cx, cy - R * .69); ctx.lineTo(cx, cy - R * .16);
      ctx.moveTo(cx, cy + R * .16); ctx.lineTo(cx, cy + R * .69); ctx.stroke();

      // 17. 二十四山阴阳潮汐：依玄空十二阴山/十二阳山改变内弧流向，视觉化顺逆之别。
      const tideDir = YANG_MOUNTAINS.has(facingMountain.name) ? 1 : -1;
      const tidePhase = still ? 0 : now * .00010 * tideDir;
      for (let i = 0; i < 2; i++) {
        const a = tidePhase + i * Math.PI + centerOffset * Math.PI / 360;
        ctx.strokeStyle = i ? 'rgba(213,221,229,.085)' : rgba(c, .11 + centerFit * .05);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, R * .535, a, a + tideDir * .72, tideDir < 0); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawFront(now, dt, still) {
      const size = fitCanvas(front, fctx); if (!size) return;
      const ctx = fctx, cx = size / 2, cy = size / 2, R = size * .47, c = color();
      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'lighter';

      // 8. 白色天池：五色在中心短暂叠成无属性白光。
      const corePulse = still ? .75 : .68 + .16 * Math.sin(now / 620);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .082);
      core.addColorStop(0, `rgba(255,252,237,${.72 * corePulse})`);
      core.addColorStop(.22, rgba(c, .26 * corePulse));
      core.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, R * .082, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,246,217,${locked ? .45 : .16})`; ctx.lineWidth = .75;
      ctx.beginPath(); ctx.arc(cx, cy, R * (.07 + .006 * corePulse), 0, TAU); ctx.stroke();

      // 9. 磁北朱砂尾迹：北针之后留下逐级消散的红色微点。
      const northDeg = -heading;
      for (let i = 0; i < 9; i++) {
        const p = polar(cx, cy, R * (.14 + i * .032), northDeg + i * .8 * turnDir);
        ctx.fillStyle = `rgba(218,72,47,${(.24 - i * .021).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(.55, 1.45 - i * .09), 0, TAU); ctx.fill();
      }

      // 10. 内外双向星尘轨道；转动越快，粒子越亮、越长。
      motes.forEach((m, i) => {
        if (!still) m.a += m.s * dt / 1000 * (1 + turnEnergy * 2.2);
        const rr = R * (m.r + .012 * Math.sin(now / 650 + m.p));
        const deg = m.a * 180 / Math.PI - heading * .16;
        const p = polar(cx, cy, rr, deg), tail = polar(cx, cy, rr, deg - m.s * 210 * (1 + turnEnergy));
        ctx.strokeStyle = rgba(c, .07 + m.z * .045 + turnEnergy * .12); ctx.lineWidth = m.z;
        ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      });

      // 11. 转向拖尾：设备快速转动时，盘缘出现同向流线，静止后自然收束。
      if (!still && turnEnergy > .025) {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * TAU + now * .00008 * turnDir;
          const span = (.045 + turnEnergy * .11) * turnDir;
          ctx.strokeStyle = rgba(c, (.035 + .09 * turnEnergy) * (1 - i / 25));
          ctx.lineWidth = .65 + turnEnergy * 1.15;
          ctx.beginPath(); ctx.arc(cx, cy, R * (.70 + (i % 3) * .045), a, a + span, turnDir < 0); ctx.stroke();
        }
      }

      // 12. 定盘锁阵：四象准线 + 二十四山内扣刻，定盘后保持。
      if (locked) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-heading * Math.PI / 180);
        ctx.strokeStyle = 'rgba(255,244,205,.22)'; ctx.lineWidth = .7;
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -R * .13); ctx.lineTo(0, -R * .30); ctx.stroke();
        }
        for (let i = 0; i < 24; i++) {
          ctx.rotate(TAU / 24); ctx.beginPath(); ctx.moveTo(0, -R * .57); ctx.lineTo(0, -R * (i % 3 === 0 ? .62 : .595)); ctx.stroke();
        }
        ctx.restore();
      }

      // 13. 五行/吉方共鸣：八颗气珠绕天池提速，持续状态但不快闪。
      if (resonating) {
        for (let i = 0; i < 8; i++) {
          const a = (still ? 0 : now * .00072) + i * TAU / 8;
          const p = [cx + Math.cos(a) * R * .115, cy + Math.sin(a) * R * .115];
          ctx.fillStyle = rgba(c, .30 + .18 * Math.sin(now / 390 + i));
          ctx.beginPath(); ctx.arc(p[0], p[1], 1.3 + (i % 2) * .45, 0, TAU); ctx.fill();
        }
      }

      // 18. 方向记忆残影：保留最近几次真实朝向，转身时能看见“从哪里转来”。
      const liveEchoes = [];
      headingEchoes.forEach(e => {
        if (!still) e.age += dt;
        const p = Math.min(1, e.age / 900), fade = Math.pow(1 - p, 1.5);
        if (p < 1) liveEchoes.push(e);
        const echoDeg = ((e.heading - heading + 540) % 360) - 180;
        const ep = polar(cx, cy, R * (.49 + p * .07), echoDeg);
        ctx.fillStyle = rgba(c, fade * .19);
        ctx.beginPath(); ctx.arc(ep[0], ep[1], .6 + fade * 1.35, 0, TAU); ctx.fill();
      });
      headingEchoes = liveEchoes;

      // 19. 山心偏差弧：在天心附近显示当前朝向距本山中心的正负偏差，归中时收成一点。
      const fm = C.mountainAt(C.norm(heading));
      const offset = ((fm.center - C.norm(heading) + 540) % 360) - 180;
      const offRad = Math.max(-7.5, Math.min(7.5, offset)) * Math.PI / 180;
      ctx.strokeStyle = Math.abs(offset) < 1 ? 'rgba(255,238,186,.42)' : rgba(c, .20);
      ctx.lineWidth = 1.15; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, R * .155, -Math.PI / 2, -Math.PI / 2 + offRad, offRad < 0); ctx.stroke();

      // 20. 山心归位印：进入每山中心 ±0.75° 时，只触发一次菱印与双环，不随传感器抖动连闪。

      // 14. 事件爆发：过二十四山、进入吉方、五行共鸣、定盘各有不同波形。
      const alive = [];
      bursts.forEach(b => {
        if (!still) b.age += dt;
        const p = Math.min(1, b.age / b.life), fade = Math.pow(1 - p, 1.35);
        if (p < 1 || still) alive.push(b);
        const rr = R * (.10 + p * (b.kind === 'lock' ? .48 : .38));
        ctx.strokeStyle = rgba(b.color, fade * (b.kind === 'mountain' ? .34 : .48));
        ctx.lineWidth = b.kind === 'lock' ? 1.5 : 1;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke();
        if (b.kind === 'mountain') {
          const bp = polar(cx, cy, R * .63, b.angle);
          ctx.fillStyle = rgba(b.color, fade * .75); ctx.beginPath(); ctx.arc(bp[0], bp[1], 1.5 + 2.8 * fade, 0, TAU); ctx.fill();
        } else if (b.kind === 'lock') {
          for (let i = 0; i < 8; i++) {
            const p1 = polar(cx, cy, rr * .45, i * 45), p2 = polar(cx, cy, rr, i * 45);
            ctx.strokeStyle = rgba(b.color, fade * .22); ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
          }
        } else if (b.kind === 'center') {
          const cp = polar(cx, cy, R * .61, 0), s = 3 + fade * 5;
          ctx.save(); ctx.translate(cp[0], cp[1]); ctx.rotate(Math.PI / 4);
          ctx.strokeStyle = rgba(b.color, fade * .72); ctx.lineWidth = 1;
          ctx.strokeRect(-s / 2, -s / 2, s, s); ctx.restore();
          ctx.strokeStyle = rgba(b.color, fade * .20);
          ctx.beginPath(); ctx.arc(cx, cy, rr * .72, 0, TAU); ctx.stroke();
        }
      });
      bursts = alive;
      turnEnergy *= Math.pow(.90, Math.max(.5, dt / 16.7));
      ctx.globalCompositeOperation = 'source-over';
    }

    function draw(now, dt, still) {
      if (suppressed()) { if (!cleared) clear(); return; }
      cleared = false;
      drawBack(now, dt, still); drawFront(now, dt, still);
    }
    function frame(now) {
      raf = 0;
      if (!active || document.hidden) return;
      raf = requestAnimationFrame(frame);
      if (now - lastFrame < 33) return; // 约 30fps，避免与地图和主盘抢帧
      const dt = Math.min(50, lastFrame ? now - lastFrame : 16.7); lastFrame = now;
      draw(now, dt, false);
    }
    function start() { if (!reduce && active && !raf && !document.hidden) raf = requestAnimationFrame(frame); }
    function setActive(on) {
      active = !!on;
      if (!active) { if (raf) cancelAnimationFrame(raf); raf = 0; clear(); return; }
      resize();
      if (reduce) draw(performance.now(), 0, true); else start();
    }
    function onHeading(prev, next, initial) {
      const delta = Math.max(-40, Math.min(40, next - prev));
      if (!initial && Math.abs(delta) > .12) {
        turnDir = delta < 0 ? -1 : 1;
        turnEnergy = Math.min(1.35, turnEnergy + Math.abs(delta) / 12);
        if (Math.abs(delta) > .55) {
          headingEchoes.push({ heading: prev, age: 0 });
          if (headingEchoes.length > 9) headingEchoes.shift();
        }
      }
      const boundary = Math.floor((C.norm(next) + 7.5) / 15) % 24;
      if (!initial && lastBoundary !== null && boundary !== lastBoundary) {
        addBurst('mountain', boundary * 15 - next);
      }
      lastBoundary = boundary;
      const m = C.mountainAt(C.norm(next));
      const centerDelta = Math.abs(((m.center - C.norm(next) + 540) % 360) - 180);
      if (!initial && centerDelta <= .75 && lastCenteredMountain !== m.index) {
        addBurst('center', 0); lastCenteredMountain = m.index;
      } else if (centerDelta > 2 && lastCenteredMountain === m.index) {
        lastCenteredMountain = null;
      }
      if (reduce) draw(performance.now(), 0, true);
    }
    function setLocked(on) {
      locked = !!on; page.classList.toggle('fx-locked', locked);
      if (locked) addBurst('lock');
      if (reduce) draw(performance.now(), 0, true);
    }
    function setResonating(on) {
      on = !!on;
      if (on && !resonating) addBurst('resonance');
      resonating = on; page.classList.toggle('fx-resonating', on);
      if (reduce) draw(performance.now(), 0, true);
    }
    function refresh() { if (reduce && active) draw(performance.now(), 0, true); }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
      else start();
    });
    window.addEventListener('resize', resize);
    return { setActive, onHeading, setLocked, setResonating, burst: addBurst, resize, refresh };
  }

  function setHeading(raw) {
    if (lockedHeading !== null) return;
    const previousHeading = heading;
    const initialHeading = lastRaw === null;
    if (lastRaw === null) { heading = raw; }
    else {
      let delta = raw - lastRaw;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      heading += delta;
    }
    lastRaw = raw;
    if (compassFx) compassFx.onHeading(previousHeading, heading, initialHeading);
    drawLuopan();
    updateCompassCard();
    ratchetTick();                     // A5 棘轮触觉：跨二十四山界轻震（能力检测 + 开关内部把关）
    if (onHeadingChange) onHeadingChange(heading);
  }

  // 盘面本命标注图层（三态：off/bazhai/xiyong；默认八宅，仅排盘后可选）。
  // 八宅层=命卦游年八星（吉金分级/凶墨青·宜伏）；喜用层=日主喜用/忌神（宫位五行取用，今人方法）；关=不染。
  let bzLayer = localStorage.getItem('bz-layer') || (localStorage.getItem('bz-shade') === '0' ? 'off' : 'bazhai');
  if (['off', 'bazhai', 'xiyong'].indexOf(bzLayer) < 0) bzLayer = 'bazhai';
  let qiFlowBearing = null; // 生气方罗盘方位（0=北），供气韵粒子层整体流向；未排盘为 null
  // ===== 五行流光引擎（气色全由真五行分值驱动，无任何硬编码情绪色）=====
  // 命格五行分值 → 归一加权混合五色 = 基础气色；朝向变 → 混入当前宫位五行色（~18%，微调不夺主色）；
  // 五行俱全（min/max≥0.5）→ 色相缓慢循环（≥8s）。未排盘=金；reduced-motion=静态色不闪；
  // 生命周期挂在气韵粒子层同一开关（仅堪舆页且可见时活）。呈现面见 CSS #luopan-hud.aura-*。
  const AURA_GOLD = { r: 201, g: 162, b: 39 };   // 未排盘沿用的现状金
  let auraBaseRGB = null;    // 命格基础气色（未混朝向）；null=未排盘
  let auraRGB = null;        // 当前呈现气色（含朝向调制/五彩循环）；粒子层读取，null=金
  let auraRainbow = false;   // 五彩态（五行俱全 min/max≥0.5）
  let auraActive = false;    // 生命周期：仅堪舆页且可见时活
  let auraRainbowTimer = null;
  let auraFacingTrig = null; // 当前朝向宫（供朝向调制 / 五彩循环时叠一点朝向色）
  let auraLastApply = 0;     // 朝向调制节流戳（~100ms）
  const AURA_REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // 命格×朝向呼应的排盘缓存：档案不变不重算，滑杆/磁力计高频更新只查表
  let fitCache = { key: null, bz: null, bazi: null };
  function baziFitData() {
    const saved = localStorage.getItem('bazi-input');
    if (!saved) { fitCache = { key: null, bz: null, bazi: null }; return null; }
    if (fitCache.key !== saved) {
      try {
        const input = JSON.parse(saved);
        fitCache = { key: saved, bz: C.computeBaZhai(input), bazi: C.computeBazi(input) };
      } catch (e) { return null; }
    }
    return fitCache.bz ? fitCache : null;
  }

  // ===== 顶部合一卡下移：躲开 Leaflet 角钮（左上缩放 / 右上图层）=====
  // 根因：#veinmap z-index:0 成层叠上下文，内部 z-800 的 Leaflet 控件整体低于 #kanyu-top(z-8)，
  // 故 #kanyu-top 会盖住图层钮/缩放钮。修法：把顶偏移下移到两枚角钮下缘 +8px 之后（运行时量
  // .leaflet-control-zoom / .leaflet-control-layers 的 boundingBox 取 max bottom，退化默认 64px）。
  // --kanyu-top-offset 同时驱动 #kanyu-top 的 top 与 max-height，故容器整体下移、底边仍卡在罗盘上缘之上。
  let _kanyuOffsetRaf = 0;
  function recomputeKanyuTopOffset() {
    if (_kanyuOffsetRaf) return;
    _kanyuOffsetRaf = requestAnimationFrame(() => {
      _kanyuOffsetRaf = 0;
      const page = $('page-kanyu'); if (!page) return;
      const pageTop = page.getBoundingClientRect().top;      // top 偏移基准（#page-kanyu 顶）
      let maxBottom = 0;
      ['.leaflet-control-zoom', '.leaflet-control-layers'].forEach(sel => {
        const el = page.querySelector(sel); if (!el) return;
        const cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
        const rect = el.getBoundingClientRect();
        if (rect.height <= 0) return;
        const rel = rect.bottom - pageTop;
        if (rel > maxBottom) maxBottom = rel;
      });
      const off = maxBottom > 0 ? Math.round(maxBottom + 8) : 64; // 退化默认 64px
      page.style.setProperty('--kanyu-top-offset', off + 'px');
    });
  }
  window._recomputeKanyuTopOffset = recomputeKanyuTopOffset;   // 供 initKanyu 内底图切换/定尺后调用

  function updateCompassCard() {
    const d = C.norm(heading);
    const r = C.directionReading(d);
    $('compass-face').textContent = tt('kanyu.facing_read', { deg: Math.round(d * 10) / 10, name: r.facing.name, trigram: r.trigram });
    $('compass-sub').textContent = tt('kanyu.wuxing_read', { el: r.facing.el, zuoxiang: r.zuoXiang });
    $('compass-sub').style.color = C.EL_HEX[r.facing.el];
    // 实时契合：双声部并列——八宅（键命卦·游年八星）+ 子平（键日主·喜用神）
    const fitEl = $('compass-fit');
    if (!fitEl) return;
    const data = baziFitData();
    const cta = $('compass-cta');
    const fitRow = $('kanyu-fit-row'), layerRow = $('bz-layer-row'), legend = $('bz-layer-legend');
    const identEl = $('compass-ident'), divBtn = $('fit-diverge-btn'), divPop = $('fit-diverge-pop');
    if (data) {
      if (cta) cta.style.display = 'none';
      if (fitRow) fitRow.style.display = 'block';
      if (layerRow) layerRow.style.display = 'flex';
      if (legend) { legend.style.display = 'block'; legend.innerHTML = layerLegendText(data); } // innerHTML：图例内含「典」cite-chip（《八宅明镜》），须渲染为可点元素而非字面标签
      { const wxLg = $('wx-glow-legend'); if (wxLg) wxLg.style.display = 'block'; }   // 微光图例仅排盘态显示
      const star = C.bazhaiStar(data.bz.mingGua, r.trigram);
      const lucky = C.BAZHAI_STARS[star][1];
      const el = r.facing.el;
      const fit = data.bazi.favorable.includes(el) ? '合喜用'
        : data.bazi.unfavorable.includes(el) ? '犯忌神' : '气性平';
      // 两法相左：八宅凶×子平得喜用，或八宅吉×子平犯忌神（各有典据，不相为裁）
      const diverge = (!lucky && fit === '合喜用') || (lucky && fit === '犯忌神');
      // 术语精确：命卦（东/西四命）· 日主（干·强弱），不裸写「X命」；关键术语挂白话词条
      const enK = isEN();
      if (identEl) identEl.innerHTML = enK
        ? `${renderTerm('命卦')} ${escapeHtml(data.bz.mingGua)} (${escapeHtml(GROUP_EN[data.bz.groupName] || data.bz.groupName)}) · ${renderTerm('日主')} ${escapeHtml(data.bazi.dm)} ${escapeHtml(elEN(data.bazi.dmEl))} · ${renderTerm('身强身弱', data.bazi.isStrong ? '身强 strong' : '身弱 weak')}`
        : `${renderTerm('命卦')}${escapeHtml(data.bz.mingGua)}（${escapeHtml(data.bz.groupName)}）· ${renderTerm('日主')}${escapeHtml(data.bazi.dm)}${escapeHtml(data.bazi.dmEl)}·${renderTerm('身强身弱', data.bazi.isStrong ? '身强' : '身弱')}`;
      // 契合行双声部并列（废整行按八宅吉凶染红绿的旧逻辑）：八宅一句、子平一句，各署所据；游年星名挂词条
      fitEl.innerHTML = fitVoicesHtml(star, fit, el);
      if (divBtn) divBtn.hidden = !diverge;
      if (!diverge && divPop) { divPop.hidden = true; if (divBtn) divBtn.setAttribute('aria-expanded', 'false'); }
      // 入吉方共鸣：转进本命吉星宫位（尤其生气）→ 断语行金色脉冲 + 轻震（能力检测）
      updateAuspicious(r.trigram, star, lucky);
      // 原句 teaser：常驻单行摘要实时跟随朝向（overlay 开着时随宫/层平滑换完整卡内容）
      updateTeaser(data, r, star, lucky, fit);
      // 三重共振：facing 变化即算三证（八宅游年×今人喜用×流年支），俱吉增辉+金标、俱敛墨青标
      renderTriple(computeTriple(r, lucky, fit), r, star, fit);
    } else {
      // 未排盘：占位读数隐去，独立 CTA 上场（与真实数据态彻底分离）
      if (fitRow) fitRow.style.display = 'none';
      fitEl.innerHTML = '';
      if (identEl) identEl.textContent = '';
      if (divBtn) divBtn.hidden = true;
      if (divPop) divPop.hidden = true;
      if (cta) cta.style.display = 'block';
      if (layerRow) layerRow.style.display = 'none';
      if (legend) legend.style.display = 'none';
      { const wxLg = $('wx-glow-legend'); if (wxLg) wxLg.style.display = 'none'; }   // 未排盘：隐微光图例
      updateAuspicious(null, null, false);
      renderTriple(null);                                   // 未排盘/焚盘：清三证标与增辉
      hideQuoteOverlay(); hideTeaser();                     // 焚盘/未排盘：收 overlay + 清 teaser
    }
    updateResonance(data, d);
    updateTianshiLine();
    refreshQiFlow();
    auraUpdateFacing(r.trigram); // 五行流光：朝向变→当前宫位五行色混入气色（节流 ~100ms）
    glowRecompute();             // 五行微光环：光强跟随命盘分值（排盘/焚盘即时反映；无盘落 0.04）
    updateDialMarks();           // 盘缘本命支：排盘/焚盘即时显隐（签名去重，heading 变不重建）
    updateDizhiBoard();          // 地支棋盘第四子（用户日支·青玉）：排盘/焚盘即时显隐
  }
  // 子平声部短语（键日主喜用）；EN 下五行 token 译英（zh 恒传中文，行为逐字不变）
  function zipingVerdict(fit, el) {
    const e = isEN() ? elEN(el) : el;
    return fit === '合喜用' ? tt('kanyu.ziping_match', { el: e }) : fit === '犯忌神' ? tt('kanyu.ziping_clash', { el: e }) : tt('kanyu.ziping_neutral', { el: e });
  }
  // 契合行双声部渲染（八宅键游年星 · 子平键喜用；各署所据）——实时读数卡与「方位档案」抽屉共用一处，保双声部宪法一致。
  function fitVoicesHtml(star, fit, el) {
    const enK = isEN();
    return `<span class="voice"><span class="voice-tag">八宅</span>${renderTerm(star)}${enK ? ' sector' : '方'}<span class="voice-cite cite-chip" data-cite="bazhai-dayouniange" role="button" tabindex="0">《八宅明镜》</span></span>`
      + `<span class="voice-dot">·</span>`
      + `<span class="voice"><span class="voice-tag">子平</span>${zipingVerdict(fit, el)}<span class="voice-cite">${enK ? escapeHtml(tt('common.modern_method')) : '今人方法'}</span></span>`;
  }
  // EN-only 子平短语（五行译英，纯英文，供 EN 引文卡结构行用）
  function zipingVerdictEN(fit, el) {
    return fit === '合喜用' ? 'draws on favorable element ' + elEN(el)
      : fit === '犯忌神' ? 'clashes with unfavorable element ' + elEN(el)
        : 'is Five-Phase neutral (' + elEN(el) + ')';
  }
  // 图层图例文案（跟随当前图层）
  function layerLegendText(data) {
    if (bzLayer === 'off') return tt('kanyu.legend_off');
    if (bzLayer === 'xiyong') {
      return tt('kanyu.legend_xiyong', { fav: data.bazi.favorable.join(''), unf: data.bazi.unfavorable.join('') });
    }
    return tt('kanyu.legend_bazhai');
  }

  // ===== 入吉方共鸣（八宅游年·吉星宫）=====
  // 现有 wuxingResonance（补最薄之气）之外，另设「转进本命吉星宫」的一次性反馈：
  // 断语行金色脉冲 + navigator.vibrate?.(生气更强) + 盘缘辉光。凶方零动效零发光（克制清单②）。
  let lastAuspTrigram = null;
  let auspGlow = false;                // 吉方辉光标志：由 updateResonance 与五行共鸣合并落到盘缘 class
  function updateAuspicious(trigram, star, lucky) {
    auspGlow = !!lucky;
    if (lucky && trigram !== lastAuspTrigram) { // 新转进一个吉方 → 一次性脉冲 + 轻震
      const fitEl = $('compass-fit');
      if (fitEl) { fitEl.classList.remove('bzq-pulse'); void fitEl.offsetWidth; fitEl.classList.add('bzq-pulse'); }
      if (compassFx) compassFx.burst('auspicious');
      if (navigator.vibrate) navigator.vibrate(star === '生气' ? [30, 40, 30] : 30);
    }
    lastAuspTrigram = trigram;
  }

  // ===== 三重共振（八宅游年 × 今人喜用 × 流年支）=====
  // 三证：a) 该宫游年星 ∈ 四吉（lucky·现成）；b) 宫位五行 ∈ 喜用（fit==='合喜用'·现成）；
  //       c) facing 所在山（地支）∉ 今年 太岁/岁破/三煞 支集（core.js lyTaiSuiDir/lySanSha 现成算年支集）。
  // 三证俱吉 → 盘缘辉光增强一档（.triple-boost）+ 原句卡「三证俱吉」金标；
  // 三证俱敛（凶星＋忌神＋犯流年支）→ 卡头「宜伏敛」墨青标，用途框架不恐吓。
  // 卡内三行各署所据：《八宅明镜》游年 / 今人方法·喜用 / 《钦定协纪辨方书》流年（后者书级 chip）。
  let tripleYearCache = { year: null, set: null, taisui: '', suipo: '', sansha: [] };
  function yearBadBranches() {
    const year = liunianYearFor();
    if (tripleYearCache.year !== year) {
      const zhi = C.lyGetZhi(year);                        // 太岁支
      const ts = C.lyTaiSuiDir(year);                      // { suipoDeg }
      const suipo = ZHI12[Math.round(ts.suipoDeg / 30) % 12]; // 岁破支（对冲）
      const sansha = C.lySanSha(year).map(s => s.name);    // 三煞三支
      tripleYearCache = { year, set: new Set([zhi.name, suipo].concat(sansha)), taisui: zhi.name, suipo, sansha };
    }
    return tripleYearCache;
  }
  function tripleYearRole(mtn) {
    const y = yearBadBranches();
    if (mtn === y.taisui) return '太岁';
    if (mtn === y.suipo) return '岁破';
    if (y.sansha.indexOf(mtn) >= 0) return '三煞';
    return null;
  }
  function computeTriple(r, lucky, fit) {
    const cPass = !yearBadBranches().set.has(r.facing.name); // 未犯流年支
    if (lucky && fit === '合喜用' && cPass) return 'good';
    if (!lucky && fit === '犯忌神' && !cPass) return 'calm';
    return null;                                            // 三证不一致：不加标、不增辉光
  }
  // 原句卡上懒建的三重共振元素（index.html 只改图例一行，故标/块由 JS 注入）
  function tripleEls() {
    const card = $('bazhai-quote-card'); if (!card) return null;
    const ink = card.querySelector('.bzq-ink'); if (!ink) return null;
    let badge = $('bzq-triple-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'bzq-triple-badge'; badge.className = 'bzq-triple-badge'; badge.hidden = true;
      ink.appendChild(badge);                              // 落墨面头部（断/结论之后）
    }
    let block = $('bzq-triple');
    if (!block) {
      block = document.createElement('div');
      block.id = 'bzq-triple'; block.className = 'bzq-triple'; block.hidden = true;
      if (ink.nextSibling) card.insertBefore(block, ink.nextSibling); else card.appendChild(block);
    }
    // 三证卡头分享小钮（仅俱吉态显示）：懒建于墨面头部，点击生成三证时刻卡
    let share = $('bzq-triple-share');
    if (!share) {
      share = document.createElement('button');
      share.type = 'button'; share.id = 'bzq-triple-share'; share.className = 'bzq-triple-share'; share.hidden = true;
      share.textContent = tt('share.btn');
      share.setAttribute('aria-label', tt('share.share_proof_aria'));
      share.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.ShareCard && _lastProofPayload) { try { window.ShareCard.openProof(_lastProofPayload); } catch (err) {} }
      });
      ink.appendChild(share);
    }
    return { badge, block, share };
  }
  let _lastProofPayload = null;   // 当前「三证俱吉」态的分享 payload（renderTriple good 分支刷新）
  function tripleLine(text, srcLabel, citeKey) {
    const src = citeKey
      ? '<span class="bzq-triple-src cite-chip" data-cite="' + escapeHtml(citeKey) + '" role="button" tabindex="0">' + escapeHtml(srcLabel) + '</span>'
      : '<span class="bzq-triple-src plain">' + escapeHtml(srcLabel) + '</span>';
    return '<div class="bzq-triple-line"><span class="bzq-triple-txt">' + escapeHtml(text) + '</span>' + src + '</div>';
  }
  let tripleState = null;
  function renderTriple(state, r, star, fit) {
    tripleState = state;
    const dial = $('luopan-hud');
    if (dial) dial.classList.toggle('triple-boost', state === 'good'); // 辉光增强一档（叠 aura/resonate 之上）
    const els = tripleEls(); if (!els) return;
    const { badge, block, share } = els;
    if (!state) { badge.hidden = true; block.hidden = true; if (share) share.hidden = true; _lastProofPayload = null; return; }
    const el = r.facing.el, mtn = r.facing.name;
    if (state === 'good') {
      badge.hidden = false; badge.className = 'bzq-triple-badge good'; badge.textContent = '三证俱吉';
      block.hidden = false; block.className = 'bzq-triple good';
      block.innerHTML =
        tripleLine('游年『' + star + '』· 属四吉', '《八宅明镜》游年', 'bazhai-dayouniange')
        + tripleLine('此向属' + el + ' · 正合喜用', '今人方法 · 喜用', null)
        + tripleLine(mtn + '山 · 今岁未犯太岁·岁破·三煞', '《钦定协纪辨方书》流年', 'xinji-bianfang');
      // 三证时刻卡分享 payload（与上三行同源；卡内三行各署出处书名）
      const tri = C.TRIGRAMS[r.trigram] || {};
      _lastProofPayload = {
        facingName: r.facing.name, facingEl: r.facing.el,
        trigram: r.trigram, trigramSymbol: tri.symbol || '', trigramDir: tri.dir || '',
        deg: r.deg, zuoXiang: r.zuoXiang,
        rows: [
          { text: '游年『' + star + '』· 属四吉', src: '《八宅明镜》游年' },
          { text: '此向属' + el + ' · 正合喜用', src: '今人方法·喜用' },
          { text: mtn + '山 · 今岁未犯太岁·岁破·三煞', src: '《钦定协纪辨方书》流年' }
        ]
      };
      if (share) share.hidden = false;
    } else {
      if (share) share.hidden = true; _lastProofPayload = null;   // 非俱吉：不提供三证卡分享
      const role = tripleYearRole(mtn) || '流年凶方';
      badge.hidden = false; badge.className = 'bzq-triple-badge calm'; badge.textContent = '宜伏敛';
      block.hidden = false; block.className = 'bzq-triple calm';
      block.innerHTML =
        tripleLine('游年『' + star + '』· 属四凶，宜伏', '《八宅明镜》游年', 'bazhai-dayouniange')
        + tripleLine('此向属' + el + ' · 落于忌神', '今人方法 · 喜用', null)
        + tripleLine(mtn + '山 · 值今岁' + role + '，此向宜守静、动土安床宜暂避', '《钦定协纪辨方书》流年', 'xinji-bianfang');
    }
  }

  // ===== 原句 teaser（常驻单行）+ 完整原句 overlay（点开临时层）=====
  // 结构性根治「纸面空白/剪切」：常驻只留读数卡 + 一行 teaser（永不换行永不剪切）；
  // 完整古籍原句改由 teaser 点击弹 overlay（fixed 临时层、随手可关）。旧「dwell 自动弹高卡」已废。
  const BZQ_SCHOOL = { 'yangzhai-sanyao': '阳宅 · 三要', 'bazhai-mingjing': '八宅 · 游年', 'yangzhai-shishu': '阳宅 · 十书' };
  const TEASER_MAX = 14;                        // teaser 原句摘要字数上限（超出加省略号）
  let quoteOverlayShown = false, bzqTrigram = null, bzqLayer = null;
  // EN 引文卡辅助：原句照排 + site translation 行（§5.1）；八星站方注英译；无译文回落 forthcoming。
  function quoteSiteTrEN(orig) {
    if (!orig) return '';
    const k = 'en.quote.tr.' + orig;
    return hasKey(k) ? (tt('en.quote.site_tr_prefix') + tt(k)) : tt('en.quote.forthcoming');
  }
  function bzqStarNoteEN(star, fallback) {
    const k = 'en.bazhai.star.' + star;
    return hasKey(k) ? tt(k) : (fallback || '');
  }
  // 原句卡框架：从「此方好/坏」改「此方古法如何用」，声部跟随当前激活图层（bzLayer）。
  function populateQuoteCard(data, r, star, lucky, fit) {
    bzqLayer = bzLayer; // 记录当前声部所属图层（供图层切换时判重填）
    const conc = $('bzq-conc'), yifu = $('bzq-yifu');
    const slot = $('bzq-slot'), dian = $('bzq-dian'), ctxLink = $('bzq-ctx');
    if (conc) conc.classList.remove('neg'); // 凶≠坏，废除旧的凶方置灰语义
    if (bzLayer === 'xiyong') {
      // 喜用层：纸面显「今人方法：喜用取用」说明，不引古籍；不显宜伏、不显典/深链
      const en = isEN();
      if (conc) conc.textContent = en
        ? `日主 ${data.bazi.dm} ${elEN(data.bazi.dmEl)} · ${data.bazi.isStrong ? 'strong' : 'weak'} · this facing ${zipingVerdictEN(fit, r.facing.el)}`
        : `日主${data.bazi.dm}${data.bazi.dmEl}·${data.bazi.isStrong ? '身强' : '身弱'} · 此向${zipingVerdict(fit, r.facing.el)}`;
      if (yifu) yifu.hidden = true;
      $('bzq-orig').textContent = en ? 'Modern method · favorable-element selection' : '今人方法：喜用取用';
      $('bzq-bai').textContent = en
        ? `Favorable elements ${elsEN(data.bazi.favorable)}; unfavorable ${elsEN(data.bazi.unfavorable)}. This facing is ${elEN(r.facing.el)} — ${fit === '合喜用' ? 'matches your favorable elements; suited as a desk-facing here, drawing on its color to reinforce' : fit === '犯忌神' ? 'falls on an unfavorable element; better avoided — choose a favorable sector instead' : 'neutral to both favorable and unfavorable elements'}.`
        : `以日主强弱定喜用神：喜用${data.bazi.favorable.join('、')}，忌${data.bazi.unfavorable.join('、')}。此向五行属${r.facing.el}——${fit === '合喜用' ? '正合喜用，此向宜作书桌坐向、取其色以补益' : fit === '犯忌神' ? '落于忌神，补益宜避此向、另择喜用方' : '喜用忌神俱不涉，气性平'}。`;
      $('bzq-note').textContent = '';
      $('bzq-cite').textContent = '';
      $('bzq-school').textContent = en ? 'Modern method · favorable elements' : '今人方法 · 喜用取用';
      if (ctxLink) ctxLink.style.display = 'none';
      if (dian) dian.style.display = 'none';
      if (slot) slot.classList.add('open');
      return;
    }
    // 八宅层（含 off 时的默认声部）：吉星引床首句；凶星纸面留空 + 宜伏 + 站方注
    const q = window.QUOTES_BAZHAI && window.QUOTES_BAZHAI.forStar(star, data.bz.mingGua);
    const enq = isEN();
    if (conc) conc.textContent = enq
      ? `命卦 (natal trigram) ${data.bz.mingGua} · this sector is 「${star}」`
      : `命卦${data.bz.mingGua}（${data.bz.groupName}）· 此方为「${star}」`;
    if (yifu) yifu.hidden = lucky; // 四凶方标「宜伏」
    if (!q || !q.orig) { // 凶星：语料无用途句，纸面留空，仅显站方注 + 宜伏
      $('bzq-orig').textContent = '';
      $('bzq-bai').textContent = '';
      $('bzq-note').textContent = enq ? bzqStarNoteEN(star, q && q.note) : ((q && q.note) || '');
      $('bzq-cite').textContent = '';
      $('bzq-school').textContent = '八宅 · 游年';
      if (ctxLink) ctxLink.style.display = 'none';
      if (dian) { dian.style.display = 'none'; dian.classList.remove('on'); }
      if (slot) slot.classList.add('open'); // 展开以显站方注（宜伏之由）
      return;
    }
    $('bzq-orig').textContent = q.orig;                                  // 原句照排（永不译替，§1.3）
    $('bzq-bai').textContent = enq ? quoteSiteTrEN(q.orig) : (q.bai || ''); // EN：其下 site translation 行
    $('bzq-note').textContent = enq ? bzqStarNoteEN(star, q.note) : (q.note || '');
    $('bzq-cite').textContent = `${q.title} · ${q.chapterLabel}`;
    $('bzq-school').textContent = BZQ_SCHOOL[q.book] || '';
    if (ctxLink) {
      ctxLink.style.display = '';
      // 深链改走同源 /dian/（dev 无 /dian/ 时由 CitePop 回退线上 daos）；无 CitePop 兜底直连线上
      if (window.CitePop && window.CitePop.setDeepLink) window.CitePop.setDeepLink(ctxLink, { book: q.book, ch: q.ch, i: q.i });
      else ctxLink.href = `https://daos.leonardchow.work/#/read/${q.book}/${encodeURIComponent(q.ch)}/s${q.i}`;
    }
    // 首现即抽笺（0 击见原句·设计规范「首卡自动展开」），典 chip 落「已启」
    if (slot) slot.classList.add('open');
    if (dian) { dian.style.display = ''; dian.classList.add('on'); }
  }
  // ===== teaser 内容：与 populateQuoteCard 同源分支，保证 24 山全朝向恒非空、恒单行 =====
  function teaserSourceText(data, r, star, lucky, fit) {
    let s = '';
    const en = isEN();
    if (bzLayer === 'xiyong') {
      s = en ? ('This facing ' + zipingVerdictEN(fit, r.facing.el)) : ('此向' + zipingVerdict(fit, r.facing.el)); // 今人喜用：结论句
    } else {
      const q = window.QUOTES_BAZHAI && window.QUOTES_BAZHAI.forStar(star, data.bz.mingGua);
      if (q && q.orig) s = q.orig;                            // 吉星：床首原句（原文照排·EN 亦不译替）
      else if (q && q.note) s = en ? (star + ' · best left dormant') : q.note; // 凶星：EN 短式（宜伏），zh 九星配属注
      else s = en ? (star + ' · ' + (lucky ? 'auspicious sector' : 'best left dormant')) : (star + ' · ' + (lucky ? '四吉方' : '四凶方 · 宜伏'));
    }
    if (!s) s = en ? (r.facing.name + ' Mountain · ' + elEN(r.facing.el)) : (r.facing.name + '山 · 此向属' + r.facing.el); // 末位兜底
    return s;
  }
  function teaserClip(s, n) {
    s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    if (!s) return '';
    const arr = Array.from(s);                                // 按码点截断（防割裂代理对）
    return arr.length > n ? arr.slice(0, n).join('') + '…' : s;
  }
  function updateTeaser(data, r, star, lucky, fit) {
    const teaser = $('kanyu-teaser'), txt = $('kanyu-teaser-txt');
    if (teaser && txt) {
      txt.textContent = teaserClip(teaserSourceText(data, r, star, lucky, fit), TEASER_MAX);
      teaser.hidden = false;
    }
    // overlay 开着时随宫/层平滑换完整卡内容（同宫同层不重填；三证标由 renderTriple 每帧同步）
    if (quoteOverlayShown && (r.trigram !== bzqTrigram || bzLayer !== bzqLayer)) {
      bzqTrigram = r.trigram;
      populateQuoteCard(data, r, star, lucky, fit);
    }
  }
  function hideTeaser() {
    const teaser = $('kanyu-teaser'), txt = $('kanyu-teaser-txt');
    if (teaser) teaser.hidden = true;
    if (txt) txt.textContent = '';
  }
  // ===== 完整原句 overlay（fixed 临时层，点 teaser 弹出；点外/✕/Esc 关闭）=====
  function onQuoteOverlayKey(e) { if (e.key === 'Escape') hideQuoteOverlay(); }
  function showQuoteOverlay() {
    const ov = $('bzq-overlay'); if (!ov) return;
    ov.hidden = false;
    requestAnimationFrame(() => ov.classList.add('shown'));
    document.addEventListener('keydown', onQuoteOverlayKey);
    quoteOverlayShown = true;
  }
  function hideQuoteOverlay() {
    const ov = $('bzq-overlay');
    if (!ov || ov.hidden) { quoteOverlayShown = false; return; } // 已收：零副作用早退
    quoteOverlayShown = false;
    ov.classList.remove('shown');
    document.removeEventListener('keydown', onQuoteOverlayKey);
    setTimeout(() => { if (!ov.classList.contains('shown')) ov.hidden = true; }, 240);
  }
  // teaser 点击：按当前朝向填完整卡 + 三证标，弹 overlay
  function openQuoteOverlay() {
    const data = baziFitData(); if (!data) return;
    const rr = C.directionReading(C.norm(heading));
    const s2 = C.bazhaiStar(data.bz.mingGua, rr.trigram);
    const l2 = C.BAZHAI_STARS[s2][1];
    const f2 = data.bazi.favorable.includes(rr.facing.el) ? '合喜用'
      : data.bazi.unfavorable.includes(rr.facing.el) ? '犯忌神' : '气性平';
    bzqTrigram = rr.trigram;
    populateQuoteCard(data, rr, s2, l2, f2);
    renderTriple(computeTriple(rr, l2, f2), rr, s2, f2);
    showQuoteOverlay();
  }

  // ===== 气韵粒子层朝向：排盘后取「生气方」罗盘方位（真规则），供装饰粒子整体流向 =====
  function refreshQiFlow() {
    const data = baziFitData();
    let b = null;
    if (data && data.bz && data.bz.stars) {
      for (const t in data.bz.stars) { if (data.bz.stars[t] === '生气') { b = C.TRIGRAMS[t].hou; break; } }
    }
    qiFlowBearing = b;
  }

  // ===== 五行流光：工具 + 生命周期 =====
  function auraHexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function auraMix(a, b, t) {
    return { r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) };
  }
  function auraCss(c) { return 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')'; }
  // HSL→RGB（五彩态色相循环用）
  function auraHsl(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    return { r: Math.round(f(h + 1 / 3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1 / 3) * 255) };
  }
  function auraRgbToHsl(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s, l };
  }
  // 提纯：五色线性混合天然发灰，色相是真数据、但饱和度太低看不出色——给饱和度下限、亮度落在耐看区间，
  // 只调 S/L 不改 H（H 完全由五行分值决定），让「木多→绿」「转火→微红」肉眼可辨。
  function auraVivid(rgb) {
    const hsl = auraRgbToHsl(rgb);
    return auraHsl(hsl.h, Math.max(hsl.s, 0.46), Math.min(Math.max(hsl.l, 0.5), 0.64));
  }
  // 读命格五行分值：优先实时 baziFitData，退回持久化 bazi-wuxing，皆无→null
  function auraScores() {
    const data = baziFitData();
    if (data && data.bazi && data.bazi.scores) return data.bazi.scores;
    try { const s = JSON.parse(localStorage.getItem('bazi-wuxing') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {}
    return null;
  }
  // 命格基础气色：五行分值归一加权混合五色；同时判五彩（min/max≥0.5）
  function recomputeBaseAura() {
    const scores = auraScores();
    if (!scores) { auraBaseRGB = null; auraRainbow = false; return; }
    let sum = 0, mn = Infinity, mx = 0;
    C.ELEMENTS.forEach(e => { const v = Math.max(0, scores[e] || 0); sum += v; if (v < mn) mn = v; if (v > mx) mx = v; });
    if (sum <= 0) { auraBaseRGB = null; auraRainbow = false; return; }
    let r = 0, g = 0, b = 0;
    C.ELEMENTS.forEach(e => {
      const w = Math.max(0, scores[e] || 0) / sum, c = auraHexToRgb(C.EL_HEX[e]);
      r += c.r * w; g += c.g * w; b += c.b * w;
    });
    auraBaseRGB = { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
    auraRainbow = mx > 0 && (mn / mx) >= 0.5;   // 五行俱全：最弱/最盛 ≥ 0.5
  }
  // 把当前气色落到 DOM：CSS 变量供盘体辉光，auraRGB 供粒子层
  function auraApply(rgb) {
    auraRGB = auraVivid(rgb);   // 提纯饱和度后落地（H 仍由五行分值决定）
    rgb = auraRGB;
    const dial = $('luopan-hud');
    if (!dial) return;
    dial.style.setProperty('--aura-color', auraCss(rgb));
    dial.classList.add('aura-on');
    dial.classList.toggle('aura-rainbow', auraRainbow && !AURA_REDUCE);
    if (compassFx) compassFx.refresh();
  }
  // 朝向调制：当前宫位五行色按 ~18% 混入基础气色（节流 ~100ms）；五彩态由循环驱动，不覆盖
  function auraUpdateFacing(trigram, force) {
    auraFacingTrig = trigram;
    if (!auraActive || auraBaseRGB == null) return;   // 未激活/未排盘：不接管（维持金）
    if (auraRainbow && !AURA_REDUCE) return;           // 五彩由循环驱动
    const now = Date.now();
    if (!force && now - auraLastApply < 100) return;
    auraLastApply = now;
    let rgb = auraBaseRGB;
    const el = trigram && C.TRIGRAMS[trigram] && C.TRIGRAMS[trigram].el;
    if (el && C.EL_HEX[el]) rgb = auraMix(auraBaseRGB, auraHexToRgb(C.EL_HEX[el]), 0.18);
    auraApply(rgb);
  }
  // 五彩循环：辉光色相缓慢循环（≥8s 一圈），叠一点当前朝向色保留「随转向微调」的手感
  function auraRainbowTick() {
    auraRainbowTimer = null;
    if (!auraActive || !auraRainbow || AURA_REDUCE) return;
    const c = auraHsl(Date.now() / 9000 * 360, 0.55, 0.62);   // 9s 一圈，缓，禁快闪
    const el = auraFacingTrig && C.TRIGRAMS[auraFacingTrig] && C.TRIGRAMS[auraFacingTrig].el;
    const rgb = (el && C.EL_HEX[el]) ? auraMix(c, auraHexToRgb(C.EL_HEX[el]), 0.18) : c;
    auraApply(rgb);
    auraRainbowTimer = setTimeout(auraRainbowTick, 120);
  }
  // 生命周期：随堪舆页 + 可见性（与气韵粒子层同一开关）
  function auraSetActive(on) {
    auraActive = !!on;
    const dial = $('luopan-hud');
    if (auraRainbowTimer) { clearTimeout(auraRainbowTimer); auraRainbowTimer = null; }
    if (!auraActive) return;   // 离页/隐藏：停循环即可，气色留存（不闪）
    recomputeBaseAura();
    if (auraBaseRGB == null) { // 未排盘：撤下 aura 接管，维持现状金色
      if (dial) { dial.classList.remove('aura-on', 'aura-rainbow'); dial.style.removeProperty('--aura-color'); }
      auraRGB = null;
      return;
    }
    // 排盘：以当前朝向落一次基础气色，再按状态起循环
    const r0 = C.directionReading(C.norm(heading));
    auraFacingTrig = r0.trigram;
    if (auraRainbow && !AURA_REDUCE) auraRainbowTick();
    else auraUpdateFacing(auraFacingTrig, true);
  }
  // 隐藏页时停五彩循环（离堪舆 tab 由 switchTab 调 auraSetActive(false)）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (auraRainbowTimer) { clearTimeout(auraRainbowTimer); auraRainbowTimer = null; } }
    else if (auraActive && auraRainbow && !AURA_REDUCE && !auraRainbowTimer) auraRainbowTick();
  });

  // ===== 五行方位微光环（常驻氛围层·DOM/SVG 叠罗盘外圈度环带；非切换图层）=====
  // 八卦各宫按其五行属性发淡光（乾兑金/坎水/艮坤土/震巽木/离火，色 EL_HEX）；光强 --g 绑命盘分值：
  // 有盘 0.035+0.10×(该宫五行分值/最大分值)、未排盘统一 0.04；呼吸微闪 ±30%·周期 4–6s·相位错开。
  // 落最外度环带（canvas bzLayer 数据带 0.42–0.86R 之外）→ 光是氛围·染色是数据，视觉可区分。
  // 呈现/动效/reduced-motion 见 CSS #wuxing-glow / .wx-glow-sector；离页·隐藏挂 .wx-paused 暂停。
  const GLOW_NS = 'http://www.w3.org/2000/svg';
  let glowSvg = null, glowRot = null, glowSectors = [], glowActive = false;
  let scSvg = null, scRot = null, scPin = null, scLabel = null; // 时辰游标（金针·真实时间绕盘·随 heading 同链旋转）
  // 极坐标→viewBox(100)点：北为上、顺时针（与 canvas drawLuopan 同一约定）
  function glowPt(aDeg, r) { const a = aDeg * Math.PI / 180; return [50 + r * Math.sin(a), 50 - r * Math.cos(a)]; }
  function glowSectorPath(houDeg) {
    const rI = 41, rO = 49, half = 21;               // 外度环带；宫间留 3° 缝，八方各自成光
    const a0 = houDeg - half, a1 = houDeg + half;
    const [ix0, iy0] = glowPt(a0, rI), [ox0, oy0] = glowPt(a0, rO);
    const [ox1, oy1] = glowPt(a1, rO), [ix1, iy1] = glowPt(a1, rI);
    return 'M' + ix0.toFixed(2) + ' ' + iy0.toFixed(2)
      + 'L' + ox0.toFixed(2) + ' ' + oy0.toFixed(2)
      + 'A' + rO + ' ' + rO + ' 0 0 1 ' + ox1.toFixed(2) + ' ' + oy1.toFixed(2)
      + 'L' + ix1.toFixed(2) + ' ' + iy1.toFixed(2)
      + 'A' + rI + ' ' + rI + ' 0 0 0 ' + ix0.toFixed(2) + ' ' + iy0.toFixed(2) + 'Z';
  }
  function buildWuxingGlow() {
    if (glowSvg) return;
    const cv = $('luopan-hud');
    if (!cv || !C.TRIGRAMS) return;
    glowSvg = document.createElementNS(GLOW_NS, 'svg');
    glowSvg.setAttribute('id', 'wuxing-glow');
    glowSvg.setAttribute('viewBox', '0 0 100 100');
    glowSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    glowSvg.setAttribute('aria-hidden', 'true');
    glowRot = document.createElementNS(GLOW_NS, 'g');
    glowRot.setAttribute('id', 'wuxing-glow-rot');
    glowSectors = [];
    let i = 0;
    Object.entries(C.TRIGRAMS).forEach(([name, t]) => {
      const p = document.createElementNS(GLOW_NS, 'path');
      p.setAttribute('class', 'wx-glow-sector');
      p.setAttribute('data-trig', name);
      p.setAttribute('data-el', t.el);
      p.setAttribute('d', glowSectorPath(t.hou));
      p.setAttribute('fill', C.EL_HEX[t.el] || '#c9a227');
      // 周期 4–6s + 相位错开（负 delay 立即错相，禁同步/快闪）；两值定值不随帧变
      const dur = 4 + (i % 4) * 0.55 + (i >= 4 ? 0.25 : 0);   // 4.00–5.90s，八宫两两不同
      p.style.setProperty('--wx-dur', dur.toFixed(2) + 's');
      p.style.setProperty('--wx-delay', (-(i * 0.7)).toFixed(2) + 's');
      p.style.setProperty('--g', '0.0400');
      p.setAttribute('data-glow', '0.0400');
      glowRot.appendChild(p);
      glowSectors.push(p);
      i++;
    });
    glowSvg.appendChild(glowRot);
    cv.insertAdjacentElement('afterend', glowSvg);   // 紧随 canvas 之后 → 同 z 叠其上、承 heading 旋转
    buildShichenCursor(cv);                          // 时辰游标叠于微光环之上（同一 heading 变换链）
    buildDialMarks(cv);                              // 盘缘小件（吉神/月建/本命支/日出日落）+ 盘背铭文，同一变换链
    buildDizhiBoard(cv);                             // 地支时空棋盘（当下三支落子 + 关系连线），同一变换链
    glowUpdateRotation();
    glowRecompute();
    glowUpdatePlayState();
  }
  // ===== 时辰游标（金针·罗盘最外缘）=====
  // 尖端指向「当前时辰」方位角：子=0°北、丑=30°…每支 30°，由真实时间连续映射
  //   angle = ((h + m/60)/24)*360（子中 00:00→0°北、午中 12:00→180°南），每分钟更新、24h 绕盘一圈。
  // 随 heading 与盘面同步旋转——旋转量由 glowUpdateRotation() 与五行微光环「同一次写入」（同一变换链）。
  // 形态=日晷针脚（rim 圆钮 + 内向针身）＋极小地支标注。无 CSS 动效：heading 转与分钟跳位皆直接改属性 →
  //   reduced-motion 天然静态跳位不动画。出处口径：干支纪时·地支方位（历法常识，不用 chip）。
  function shichenAngle(now) { return ((now.getHours() + now.getMinutes() / 60) / 24) * 360; }
  function buildShichenCursor(cv) {
    if (scSvg || !cv || !glowSvg) return;
    scSvg = document.createElementNS(GLOW_NS, 'svg');
    scSvg.setAttribute('id', 'shichen-cursor');
    scSvg.setAttribute('viewBox', '0 0 100 100');
    scSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    scSvg.setAttribute('aria-hidden', 'true');
    scRot = document.createElementNS(GLOW_NS, 'g');  // heading 旋转（与 glowRot 同值）
    scRot.setAttribute('id', 'shichen-cursor-rot');
    scPin = document.createElementNS(GLOW_NS, 'g');   // 时辰方位角旋转（每分钟更新）
    scPin.setAttribute('id', 'shichen-cursor-pin');
    const blade = document.createElementNS(GLOW_NS, 'path'); // bearing 0（盘顶·正北）绘制：rim→内向针身
    blade.setAttribute('class', 'sc-blade');
    blade.setAttribute('d', 'M48.95 2.6 L51.05 2.6 L50 9.4 Z');
    const knob = document.createElementNS(GLOW_NS, 'circle');
    knob.setAttribute('class', 'sc-knob');
    knob.setAttribute('cx', '50'); knob.setAttribute('cy', '2.4'); knob.setAttribute('r', '1.25');
    scLabel = document.createElementNS(GLOW_NS, 'text');
    scLabel.setAttribute('id', 'shichen-cursor-label');
    scLabel.setAttribute('class', 'sc-zhi');
    scLabel.setAttribute('x', '50'); scLabel.setAttribute('y', '-2.4'); // rim 外侧极小标注
    scLabel.setAttribute('text-anchor', 'middle');
    scLabel.setAttribute('dominant-baseline', 'middle');
    scLabel.textContent = '子';
    scPin.appendChild(blade); scPin.appendChild(knob); scPin.appendChild(scLabel);
    scRot.appendChild(scPin);
    scSvg.appendChild(scRot);
    glowSvg.insertAdjacentElement('afterend', scSvg); // 叠五行微光环之上、罗盘同层
    shichenUpdate();
  }
  // 时辰方位角 + 地支标注每分钟推进（真实时间）；地支与天文钟 shichenZhi 同源，永不背离
  function shichenUpdate(now) {
    if (!scPin) return;
    now = now || new Date();
    scPin.setAttribute('transform', 'rotate(' + shichenAngle(now).toFixed(3) + ' 50 50)');
    if (scLabel) scLabel.textContent = shichenZhi(now);
  }
  // 光强绑定命盘分值：有盘 0.035+0.10×(该宫五行分值/最大分值)，未排盘统一 0.04
  function glowRecompute() {
    if (!glowSectors.length) return;
    const scores = auraScores();
    let mx = 0;
    if (scores) C.ELEMENTS.forEach(e => { const v = Math.max(0, scores[e] || 0); if (v > mx) mx = v; });
    glowSectors.forEach(p => {
      let g = 0.04;
      if (scores && mx > 0) g = 0.035 + 0.10 * (Math.max(0, scores[p.getAttribute('data-el')] || 0) / mx);
      p.style.setProperty('--g', g.toFixed(4));
      p.setAttribute('data-glow', g.toFixed(4));      // 供验证/读数（getComputedStyle('--g') 或 attr）
    });
  }
  // 随 heading 旋转（与 canvas 盘面同步：北上·顺时针·当前朝向居上）；时辰游标同一次写入 → 共一变换链
  function glowUpdateRotation() {
    const rot = 'rotate(' + (-heading).toFixed(2) + ' 50 50)';
    if (glowRot) glowRot.setAttribute('transform', rot);
    if (scRot) scRot.setAttribute('transform', rot);
    if (dmRot) { dmRot.setAttribute('transform', rot); orientDialMarks(); } // 盘缘小件同链：整层随 heading 转、各标反旋保持正立
    if (dzRot) { dzRot.setAttribute('transform', rot); orientDizhiPieces(); } // 地支棋盘同链：连线随盘转、各子反旋保持支字正立
  }
  function glowUpdatePlayState() { if (glowSvg) glowSvg.classList.toggle('wx-paused', !glowActive || document.hidden); }
  // 生命周期：随堪舆页 + 页面可见性（与气韵粒子层/五行流光同一开关）
  function glowSetActive(on) {
    glowActive = !!on;
    if (glowActive) { glowRecompute(); glowUpdateRotation(); shichenUpdate(); updateDialMarks(); updateDizhiBoard(); }
    glowUpdatePlayState();
  }
  document.addEventListener('visibilitychange', glowUpdatePlayState);

  // ===== 盘缘小件游标层（A1 每日吉神 / A2 月建 / A3 日出日落 / A4 本命支）=====
  // 与时辰游标·五行微光环共一 heading 变换链（同一 rotate(-heading) 整层写入）；
  //   防拥挤：各类按半径分层错开落在盘缘（时辰针内缘之外的空环），同宫吉神再叠半径；
  //   各标反旋保持屏幕正立（读性优先，同「北」字口径）。
  // 数据源皆事实源、无发明：吉神=lunar-js getDayPositionCai/Xi/Fu/YangGui/YinGui（八卦方位→C.TRIGRAMS.hou，
  //   《协纪辨方书》体系·今人实现）；月建=lunar-js 当月月支×30°；本命支=用户年支×30°（排盘后）；
  //   日出/日落=SunCalc 方位角（复用天文钟惰性授权状态·未定位隐藏）。
  const GLOW_NS_DM = GLOW_NS;
  const ZHI_ORDER = ZHI12; // 子..亥（子=0=正北），与时辰游标/天文钟同源
  const DM_R = { benmingTag: 48.0, yuejian: 49.4, benming: 51.2, jishen: 53.2, sun: 54.9 }; // 分层半径（viewBox 单位·中心 50）
  let dmSvg = null, dmRot = null;
  let dialMarkOrient = [];          // [{el, gx, gy}] 每标反旋保持正立
  let dmSig = '';                   // 重建签名（内容变才重建；heading 变只走 orient）
  let jishenOn = (localStorage.getItem('dial-jishen') !== '0'); // 吉神一组开关·默认开

  function bearingZhi(deg) { return ZHI_ORDER[((Math.round(C.norm(deg) / 30) % 12) + 12) % 12]; }

  function buildDialMarks(cv) {
    if (dmSvg || !cv || !scSvg) return;
    dmSvg = document.createElementNS(GLOW_NS_DM, 'svg');
    dmSvg.setAttribute('id', 'dial-marks');
    dmSvg.setAttribute('viewBox', '0 0 100 100');
    dmSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    dmSvg.setAttribute('aria-hidden', 'true');
    dmRot = document.createElementNS(GLOW_NS_DM, 'g');
    dmRot.setAttribute('id', 'dial-marks-rot');
    dmSvg.appendChild(dmRot);
    scSvg.insertAdjacentElement('afterend', dmSvg); // 叠时辰游标之上·罗盘同层
    buildDialBack(cv);                              // A7 盘背铭文层 + 盘心长按热区
    wireDialToggles();                              // 吉神/棘轮 开关接线
    updateDialMarks();
  }

  // A1：每日吉神方位（八卦名 → 角度），返回 [{key,label,trig,deg}] 或 null
  // 全 lunar 调用同一 try：lunar 未就绪/降级实现（无 getDayPosition*）时整体返回 null → 优雅隐藏
  function jishenPositions(now) {
    if (typeof Solar === 'undefined') return null;
    let raw;
    try {
      const lunar = Solar.fromDate(now).getLunar();
      if (typeof lunar.getDayPositionCai !== 'function') return null;
      raw = [
        ['cai', '财', lunar.getDayPositionCai()],
        ['xi', '喜', lunar.getDayPositionXi()],
        ['fu', '福', lunar.getDayPositionFu()],
        ['yg', '贵₁', lunar.getDayPositionYangGui()], // 贵₁=阳贵
        ['yy', '贵₂', lunar.getDayPositionYinGui()],  // 贵₂=阴贵
      ];
    } catch (e) { return null; }
    const out = [];
    raw.forEach(function (r) {
      const t = C.TRIGRAMS[r[2]];
      if (!t) return;                     // 中宫/未知 → 优雅跳过（删优于编）
      out.push({ key: r[0], label: r[1], trig: r[2], deg: t.hou });
    });
    return out;
  }
  // A2：当月月支（月建）
  function monthJianZhi(now) {
    if (typeof Solar === 'undefined') return null;
    try { return Solar.fromDate(now).getLunar().getMonthZhi(); } catch (e) { return null; }
  }
  // A3：日出/日落罗盘方位角（SunCalc·南为 0 顺时针 → +180 转正北基准）；无定位返回 null
  function sunBearings() {
    if (!clockGeo || !clockSunTimes || !window.SunCalc) return null;
    try {
      const pr = SunCalc.getPosition(clockSunTimes.sunrise, clockGeo.lat, clockGeo.lng);
      const ps = SunCalc.getPosition(clockSunTimes.sunset, clockGeo.lat, clockGeo.lng);
      return { rise: C.norm(pr.azimuth * 180 / Math.PI + 180), set: C.norm(ps.azimuth * 180 / Math.PI + 180) };
    } catch (e) { return null; }
  }

  function makeMark(cls, label, deg, r) {
    const p = glowPt(deg, r), gx = p[0], gy = p[1];
    const t = document.createElementNS(GLOW_NS_DM, 'text');
    t.setAttribute('class', 'dm-txt ' + cls);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.textContent = label;
    dmRot.appendChild(t);
    dialMarkOrient.push({ el: t, gx: gx, gy: gy });
  }
  // 内容变才重建（date/吉神开关/排盘/定位）；heading 高频变只调 orientDialMarks
  function updateDialMarks(now) {
    if (!dmRot) return;
    now = now || new Date();
    const data = baziFitData();
    const js = jishenOn ? jishenPositions(now) : null;
    const mjZhi = monthJianZhi(now);
    const bmZhi = data && data.bazi && data.bazi.pillars[0] ? data.bazi.pillars[0].zhi : null;
    const sun = sunBearings();
    const sig = [now.toDateString(), jishenOn ? '1' : '0',
      js ? js.map(function (x) { return x.trig; }).join('') : '-',
      mjZhi || '-', bmZhi || '-',
      sun ? (Math.round(sun.rise) + ',' + Math.round(sun.set)) : '-'].join('|');
    if (sig === dmSig) return;
    dmSig = sig;
    while (dmRot.firstChild) dmRot.removeChild(dmRot.firstChild);
    dialMarkOrient = [];
    // A2 月建
    if (mjZhi) makeMark('dm-yuejian', '建', ZHI_ORDER.indexOf(mjZhi) * 30, DM_R.yuejian);
    // A4 本命支（排盘后）：年支字 + 极小「本命」微标
    if (bmZhi) {
      const bd = ZHI_ORDER.indexOf(bmZhi) * 30;
      makeMark('dm-benming', bmZhi, bd, DM_R.benming);
      makeMark('dm-benming dm-benming-tag', '本命', bd, DM_R.benmingTag);
    }
    // A1 吉神（同宫位堆叠错半径防重叠）
    if (js) {
      const byHou = {};
      js.forEach(function (m) { (byHou[m.deg] = byHou[m.deg] || []).push(m); });
      Object.keys(byHou).forEach(function (hou) {
        byHou[hou].forEach(function (m, i) { makeMark('dm-jishen', m.label, +hou, DM_R.jishen + i * 1.7); });
      });
    }
    // A3 日出/日落（定位后）
    if (sun) {
      makeMark('dm-sun dm-sun-rise', '☀↑', sun.rise, DM_R.sun);
      makeMark('dm-sun dm-sun-set', '☀↓', sun.set, DM_R.sun);
    }
    orientDialMarks();
    updateDialLegends(sun);
  }
  // 各标反旋：整层 rotate(-heading)，故每标 translate 到位后 rotate(+heading) 抵消 → 屏幕正立
  function orientDialMarks() {
    const h = heading.toFixed(2);
    for (let i = 0; i < dialMarkOrient.length; i++) {
      const m = dialMarkOrient[i];
      m.el.setAttribute('transform', 'translate(' + m.gx.toFixed(2) + ' ' + m.gy.toFixed(2) + ') rotate(' + h + ')');
    }
  }
  // HUD 图例：日出日落方位注（天文事实 vs 古法分至口径），排盘/定位随之显隐
  function updateDialLegends(sun) {
    const note = $('dm-sun-note');
    if (!note) return;
    if (sun) {
      note.style.display = 'block';
      note.textContent = '今日日出【' + bearingZhi(sun.rise) + '】位 · 日落【' + bearingZhi(sun.set) + '】位（古法卯酉为分至口径）';
    } else { note.style.display = 'none'; note.textContent = ''; }
  }

  // ===== 地支时空棋盘（当下三支落子 + 关系连线） =====
  // 罗盘内环点亮「今年年支 / 今日日支 / 当前时辰支」三枚小圆环（形制别于盘缘游标·色分年·日·时），
  //   落各自地支方位；排盘后加第四子「用户日支」（青玉）。三/四支间若命中 branch-relations
  //   （六合/三合/半合/六冲/三刑）→ 盘面画淡金(合)/淡朱(冲刑)连线 + HUD 展开区一行
  //   「今日亥卯半合木（今人整理·据《渊海子平》口径）」。每交时辰随分钟刷（签名去重）。
  // 出处：镜像 daos/data/rules/tables/branch-relations.json（今人整理通行口径；basis 归子平通说/《渊海子平》）；
  //   书级出处 chip 直呼 CitePop.openCite({book:'yuanhai-ziping'})（registry 已验证 id·不占 CITE_MAP·与素问同法）。
  // 防拥挤：落内环 DZ_R（错开盘缘游标 48–55 层）；连线常态不画，只在 HUD 展开或点子时闪现 2.5s 后淡出（守盘面克制）。
  // 与五行微光/时辰针/盘缘小件共一 heading 变换链（glowUpdateRotation 同一次写入）；各子反旋保持支字正立。
  const DZ_NS = GLOW_NS;
  const DZ_R = 34;      // 内环半径（viewBox 单位·中心 50），错开盘缘游标（48–55）
  const DZ_STACK = 4.4; // 同支多子叠放的半径步长（防同位重叠）
  // 三合局（长生-帝旺-墓库；members[1]=帝旺/四正，半合须含之）与三刑（镜像 branch-relations.json·确定性）
  const BRANCH_SANHE = [
    { members: ['申', '子', '辰'], element: '水' },
    { members: ['亥', '卯', '未'], element: '木' },
    { members: ['寅', '午', '戌'], element: '火' },
    { members: ['巳', '酉', '丑'], element: '金' },
  ];
  const BRANCH_SANXING = [
    { members: ['子', '卯'], name: '无礼之刑' },
    { members: ['寅', '巳', '申'], name: '无恩之刑' },
    { members: ['丑', '戌', '未'], name: '恃势之刑' },
  ];
  const DZ_KIND = {
    year: { cls: 'dz-year' }, day: { cls: 'dz-day' }, hour: { cls: 'dz-hour' }, userday: { cls: 'dz-userday' },
  };
  // 关系类型 → 英文标签 + 合/冲刑取向（连线色）。半合无词条，本地双语；余四型 PLAIN_GLOSSARY 有键。
  const DZ_REL_EN = { '六合': 'Six Harmonies', '三合': 'Three Harmonies', '半合': 'Half-harmony', '六冲': 'Six Clashes', '三刑': 'Three Punishments' };

  let dzSvg = null, dzRot = null, dzLines = null, dzPieces = null;
  let dzPieceOrient = [];                        // [{g, gx, gy}] 各子反旋保持支字正立
  let dzSig = '';                                // 重建签名（三/四支集合或关系变才重建）
  let dzModel = { pieces: [], relations: [] };   // 供验证钩子 + HUD 文案
  let dzFlashTimer = null;

  // 当前三支（+排盘用户日支）→ [{zhi, kind}]，缺失项优雅跳过（删优于编·不发明）
  function dizhiPieceData(now) {
    now = now || new Date();
    const out = [];
    try { const yz = C.lyGetZhi(liunianYearFor(now)); if (yz && yz.name) out.push({ zhi: yz.name, kind: 'year' }); } catch (e) { /* 优雅跳过 */ }
    try {
      if (typeof Solar !== 'undefined') {
        const lunar = Solar.fromDate(now).getLunar();
        const dz = typeof lunar.getDayZhi === 'function' ? lunar.getDayZhi() : '';
        if (dz) out.push({ zhi: dz, kind: 'day' });
      }
    } catch (e) { /* 优雅跳过 */ }
    const hz = shichenZhi(now);
    if (hz) out.push({ zhi: hz, kind: 'hour' });
    const fit = baziFitData();
    const uz = fit && fit.bazi && fit.bazi.pillars && fit.bazi.pillars[2] ? fit.bazi.pillars[2].zhi : null;
    if (uz) out.push({ zhi: uz, kind: 'userday' });
    return out;
  }
  // 关系扫描：只认任务列出的 5 型；成组齐备才算（半合须含帝旺·三刑须整组齐；partial 一律不发明）
  function dizhiRelations(pieces) {
    const present = {};
    pieces.forEach(p => { present[p.zhi] = true; });
    const has = z => !!present[z];
    const rels = [];
    BRANCH_LIUHE.forEach(pr => { if (has(pr[0]) && has(pr[1])) rels.push({ type: '六合', zhis: [pr[0], pr[1]], sign: 'he' }); });
    BRANCH_LIUCHONG.forEach(pr => { if (has(pr[0]) && has(pr[1])) rels.push({ type: '六冲', zhis: [pr[0], pr[1]], sign: 'chong' }); });
    BRANCH_SANHE.forEach(g => {
      const inz = g.members.filter(has);
      if (inz.length === 3) rels.push({ type: '三合', zhis: g.members.slice(), element: g.element, sign: 'he' });
      else if (inz.length === 2 && has(g.members[1])) rels.push({ type: '半合', zhis: inz, element: g.element, sign: 'he' }); // 须含帝旺 members[1]
    });
    BRANCH_SANXING.forEach(g => {
      const inz = g.members.filter(has);
      if (inz.length === g.members.length) rels.push({ type: '三刑', zhis: g.members.slice(), name: g.name, sign: 'chong' });
    });
    return rels;
  }
  function dzAllPairs(arr) { const o = []; for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) o.push([arr[i], arr[j]]); return o; }

  function buildDizhiBoard(cv) {
    if (dzSvg || !cv || !scSvg) return;
    dzSvg = document.createElementNS(DZ_NS, 'svg');
    dzSvg.setAttribute('id', 'dizhi-board');
    dzSvg.setAttribute('viewBox', '0 0 100 100');
    dzSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    dzSvg.setAttribute('aria-hidden', 'true');
    dzRot = document.createElementNS(DZ_NS, 'g');
    dzRot.setAttribute('id', 'dizhi-board-rot');
    dzLines = document.createElementNS(DZ_NS, 'g');
    dzLines.setAttribute('class', 'dz-lines');   // 连线层（在子之下·常态透明）
    dzPieces = document.createElementNS(DZ_NS, 'g');
    dzPieces.setAttribute('class', 'dz-pieces');
    dzRot.appendChild(dzLines);
    dzRot.appendChild(dzPieces);
    dzSvg.appendChild(dzRot);
    (dmSvg || scSvg).insertAdjacentElement('afterend', dzSvg); // 叠盘缘小件之上·同 heading 变换链
    updateDizhiBoard();
  }
  // 内容变才重建（三/四支集合或关系变）；heading 高频变只调 orientDizhiPieces
  function updateDizhiBoard(now) {
    if (!dzPieces) return;
    now = now || new Date();
    const pieces = dizhiPieceData(now);
    const rels = dizhiRelations(pieces);
    dzModel = { pieces: pieces, relations: rels };
    updateDizhiNote(rels);                          // HUD 文案每次刷（随语言/关系变）
    const sig = pieces.map(p => p.kind + p.zhi).join(',') + '|' + rels.map(r => r.type + r.zhis.join('')).join(',');
    if (sig === dzSig) return;
    dzSig = sig;
    while (dzPieces.firstChild) dzPieces.removeChild(dzPieces.firstChild);
    while (dzLines.firstChild) dzLines.removeChild(dzLines.firstChild);
    dzPieceOrient = [];
    const byDeg = {}, zhiPt = {};                   // zhi→基准点（连线端点，取基准半径）
    pieces.forEach(p => {
      const deg = ZHI_ORDER.indexOf(p.zhi) * 30;
      const stackI = (byDeg[deg] = (byDeg[deg] || 0)); byDeg[deg]++;
      const pt = glowPt(deg, DZ_R + stackI * DZ_STACK);
      if (!zhiPt[p.zhi]) zhiPt[p.zhi] = glowPt(deg, DZ_R);
      makeDizhiPiece(p, pt[0], pt[1]);
    });
    const seen = {};
    rels.forEach(r => {
      (r.zhis.length <= 2 ? [r.zhis] : dzAllPairs(r.zhis)).forEach(pr => {
        const a = zhiPt[pr[0]], b = zhiPt[pr[1]];
        if (!a || !b) return;
        const key = pr.slice().sort().join('') + r.sign;
        if (seen[key]) return; seen[key] = true;
        makeDizhiLine(a, b, r.sign);
      });
    });
    orientDizhiPieces();
  }
  function makeDizhiPiece(p, gx, gy) {
    const k = DZ_KIND[p.kind] || DZ_KIND.hour;
    const g = document.createElementNS(DZ_NS, 'g');
    g.setAttribute('class', 'dz-piece ' + k.cls);
    const hit = document.createElementNS(DZ_NS, 'circle'); // 放大点击热区（透明）
    hit.setAttribute('class', 'dz-hit'); hit.setAttribute('cx', '0'); hit.setAttribute('cy', '0'); hit.setAttribute('r', '5.2');
    const ring = document.createElementNS(DZ_NS, 'circle');
    ring.setAttribute('class', 'dz-ring'); ring.setAttribute('cx', '0'); ring.setAttribute('cy', '0'); ring.setAttribute('r', '3.5');
    const txt = document.createElementNS(DZ_NS, 'text');
    txt.setAttribute('class', 'dz-zhi'); txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('dominant-baseline', 'central');
    txt.textContent = p.zhi;
    g.appendChild(hit); g.appendChild(ring); g.appendChild(txt);
    g.addEventListener('click', function (e) { e.stopPropagation(); flashDizhiLines('piece'); });
    dzPieces.appendChild(g);
    dzPieceOrient.push({ g: g, gx: gx, gy: gy });
  }
  function makeDizhiLine(a, b, sign) {
    const ln = document.createElementNS(DZ_NS, 'line');
    ln.setAttribute('class', 'dz-line dz-line-' + sign);
    ln.setAttribute('x1', a[0].toFixed(2)); ln.setAttribute('y1', a[1].toFixed(2));
    ln.setAttribute('x2', b[0].toFixed(2)); ln.setAttribute('y2', b[1].toFixed(2));
    dzLines.appendChild(ln);
  }
  // 各子反旋（整层 rotate(-heading)，各子 translate 到位后 rotate(+heading) 抵消 → 支字屏幕正立）
  function orientDizhiPieces() {
    const h = heading.toFixed(2);
    for (let i = 0; i < dzPieceOrient.length; i++) {
      const m = dzPieceOrient[i];
      m.g.setAttribute('transform', 'translate(' + m.gx.toFixed(2) + ' ' + m.gy.toFixed(2) + ') rotate(' + h + ')');
    }
  }
  // 连线闪现：显 2.5s 后淡出（reduced-motion 由 CSS 收敛为直显直隐）；无线不闪
  function flashDizhiLines(reason) {
    if (!dzSvg || !dzLines || !dzLines.firstChild) return;
    dzSvg.classList.add('dz-lines-show');
    if (dzFlashTimer) clearTimeout(dzFlashTimer);
    dzFlashTimer = setTimeout(function () { if (dzSvg) dzSvg.classList.remove('dz-lines-show'); dzFlashTimer = null; }, 2500);
  }
  window._dizhiFlashLines = flashDizhiLines;
  // HUD 展开区一行：关系文案 + 书级出处 chip；无关系优雅隐藏
  function updateDizhiNote(rels) {
    const note = $('dz-relate-note');
    if (!note) return;
    if (!rels || !rels.length) { note.style.display = 'none'; note.innerHTML = ''; return; }
    const en = isEN();
    const parts = rels.map(function (r) {
      const zhis = escapeHtml(r.zhis.join(''));
      if (en) {
        const lab = DZ_REL_EN[r.type] || r.type;
        return zhis + ' ' + escapeHtml(lab) + (r.element ? ' (' + escapeHtml(elEN(r.element)) + ')' : '') + (r.name ? ' · ' + escapeHtml(r.name) : '');
      }
      return zhis + escapeHtml(r.type) + escapeHtml(r.element || '') + (r.name ? '·' + escapeHtml(r.name) : '');
    });
    const cite = en
      ? ' <span class="dz-cite cite-chip" role="button" tabindex="0">(modern synthesis · after 《渊海子平》)</span>'
      : '（今人整理·据<span class="dz-cite cite-chip" role="button" tabindex="0">《渊海子平》</span>口径）';
    note.innerHTML = (en ? 'Today ' : '今日') + parts.join(en ? '; ' : '、') + cite;
    note.style.display = 'block';
    wireDizhiCite(note);
  }
  // 出处 chip 一次性委托 → 书级 CitePop（不占 CITE_MAP·registry 已验证 yuanhai-ziping·与素问同法）
  function wireDizhiCite(host) {
    if (host._yhWired) return;
    host._yhWired = true;
    const open = function (e) {
      const chip = e.target.closest && e.target.closest('.dz-cite');
      if (!chip) return;
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (window.CitePop && window.CitePop.openCite) window.CitePop.openCite({ book: 'yuanhai-ziping' });
    };
    host.addEventListener('click', open);
    host.addEventListener('keydown', open);
  }
  // 验证钩子（e2e/截图脚本）：强制按 now 重算并回读盘面模型
  window._dizhiBoardDebug = function () {
    updateDizhiBoard(new Date());
    return {
      pieces: dzModel.pieces.slice(),
      relations: dzModel.relations.map(function (r) { return { type: r.type, zhis: r.zhis.slice(), element: r.element || '', name: r.name || '', sign: r.sign }; }),
      noteHtml: ($('dz-relate-note') || {}).innerHTML || '',
      lineCount: dzLines ? dzLines.childElementCount : 0,
      linesShown: !!(dzSvg && dzSvg.classList.contains('dz-lines-show')),
    };
  };

  // ===== A5 棘轮触觉：heading 跨 15°（二十四山界）→ 轻震 =====
  const RATCHET_REDUCE = AURA_REDUCE; // reduced-motion 下默认关
  let ratchetOn = (function () { const s = localStorage.getItem('ratchet-haptic'); return s === null ? !RATCHET_REDUCE : s === '1'; })();
  let lastRatchetBucket = null;
  function ratchetTick() {
    if (!ratchetOn || !navigator.vibrate) return;
    const page = $('page-kanyu');
    if (!page || !page.classList.contains('active')) return; // 仅堪舆页在场时触觉
    const b = Math.floor(C.norm(heading) / 15);
    if (lastRatchetBucket === null) { lastRatchetBucket = b; return; }
    if (b !== lastRatchetBucket) { lastRatchetBucket = b; try { navigator.vibrate(8); } catch (e) { /* 能力检测已过·忽略 */ } }
  }

  // ===== A7 盘背铭文：长按盘心 1.2s → 3D 翻面露各环文献依据 =====
  let dbPanel = null, dbFlipped = false;
  function buildDialBack(cv) {
    const page = cv.parentNode;
    if (!page || $('dial-back')) return;
    const hit = document.createElement('button'); // 盘心长按热区（天池·pointer-events auto；余盘透传地图）
    hit.id = 'dial-center-hit';
    hit.type = 'button';
    hit.setAttribute('aria-label', '长按盘心 · 看盘背铭文');
    page.appendChild(hit);
    dbPanel = document.createElement('div');
    dbPanel.id = 'dial-back';
    dbPanel.setAttribute('role', 'dialog');
    dbPanel.setAttribute('aria-label', '盘背铭文 · 各环文献依据');
    dbPanel.setAttribute('aria-hidden', 'true');
    dbPanel.innerHTML = dialBackHtml();
    page.appendChild(dbPanel);
    const x = dbPanel.querySelector('.db-close');
    if (x) x.addEventListener('click', function () { flipDial(false); });
    attachLongPress(hit, function () { flipDial(!dbFlipped); });     // 长按盘心翻面
    attachLongPress(dbPanel, function () { flipDial(false); });       // 再长按盘背翻回
    if (window.L && L.DomEvent) { L.DomEvent.disableClickPropagation(dbPanel); L.DomEvent.disableScrollPropagation(dbPanel); L.DomEvent.disableClickPropagation(hit); }
    wireDirArchiveLongPress();                                        // 盘面环带长按 0.8s → 方位档案（避开盘心翻面区）
  }
  // 依据行：只用 cite-map 已有键（找不到键者退纯文本·不新造引用·删优于编）
  function dialBackHtml() {
    const rows = [
      ['二十四山向环', '罗盘定向通则', null, '今人整理'],
      ['游年八星环', '《八宅明镜》', 'bazhai-dayouniange', ''],
      ['流年方位弧', '《协纪辨方书》卷三', 'xinji-bianfang', ''],
      ['宜忌 · 吉神体系', '《协纪辨方书》', 'xinji-bianfang', '今人实现'],
      ['时辰 · 月建游标', '干支纪时 · 历法通则', null, '今人整理'],
    ];
    let h = '<button class="db-close" type="button" aria-label="翻回盘面">✕</button>';
    h += '<div class="db-seal">盘背铭文</div><div class="db-sub">各环所据文献</div><div class="db-list">';
    rows.forEach(function (r) {
      h += '<div class="db-row"><span class="db-ring">' + r[0] + '</span><span class="db-src">';
      h += r[2] ? '<span class="cite-chip" data-cite="' + r[2] + '" role="button" tabindex="0">' + r[1] + '</span>' : r[1];
      if (r[3]) h += '<span class="db-note">' + r[3] + '</span>';
      h += '</span></div>';
    });
    h += '</div>';
    return h;
  }
  function flipDial(on) {
    dbFlipped = !!on;
    const page = $('page-kanyu');
    if (!page) return;
    page.classList.toggle('dial-flipped', dbFlipped);
    if (dbPanel) dbPanel.setAttribute('aria-hidden', dbFlipped ? 'false' : 'true');
  }
  function attachLongPress(el, fn) {
    let timer = null, sx = 0, sy = 0, fired = false;
    const clear = function () { if (timer) { clearTimeout(timer); timer = null; } };
    el.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      fired = false; sx = e.clientX; sy = e.clientY; clear();
      timer = setTimeout(function () { fired = true; timer = null; fn(); }, 1200);
    });
    el.addEventListener('pointermove', function (e) {
      if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) clear();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { el.addEventListener(ev, clear); });
    el.addEventListener('click', function (e) { if (fired) { e.preventDefault(); e.stopPropagation(); fired = false; } });
  }

  // ===== 长按问方位 · 方位档案 =====
  // 长按罗盘环带 0.8s（避开盘心天池·翻面热区）→ 底部抽屉：24山头 + 排盘契合（复用契合行）+ G2 历书方位规则命中。
  // 数据全走 core.js / RuleKit（确定性·出处）；命中 0 优雅显「本方位今年无历书条目」，绝不发明。
  // G2 只过滤 RuleKit 已加载的库（不重新 fetch）；协纪年方规则（钦定协纪辨方书·流年方位）第一次得到消费入口。
  const ASKDIR_PREDS = ['facing_mountain', 'sitting_mountain', 'facing_gua', 'annual_sha_at'];
  // 今年干支（立春切年·与流年方位同源）；window._askdirYearGZ 仅供验证脚本驱动库内已覆盖的年份，生产恒取真流年。
  function askdirYearGZ() {
    const ov = window._askdirYearGZ;
    if (typeof ov === 'string' && ov.length === 2) return { gan: ov[0], zhi: ov[1], gz: ov };
    const year = liunianYearFor();
    const gan = GAN10[(((year - 4) % 10) + 10) % 10];
    const zhi = C.lyGetZhi(year).name;
    return { gan, zhi, gz: gan + zhi };
  }
  // 该方位的坐向事实（向山/坐山/向卦/坐卦）——G2 谓词求值的唯一输入（纯查表）。
  function askdirDirFacts(bearing) {
    const fm = C.mountainAt(bearing).name, sm = C.mountainAt(bearing + 180).name;
    const fg = C.trigramAt(bearing), sg = C.trigramAt(bearing + 180);
    const dirSet = {}; dirSet[fm] = 1; dirSet[sm] = 1; dirSet[fg] = 1; dirSet[sg] = 1;
    return { fm, sm, fg, sg, dirSet };
  }
  // 罗盘方位版谓词求值（八字盘 RuleKit.evaluate 在能力门跳过 compass/annual_sha；此处按该方位+今年干支逐谓词查表）。
  // annual_sha_at{shan}：该山/卦此年是否值某煞——年方查表既已由 year 守卫锁定，本方位落在 shan 上即真（与配对的坐/向山谓词同锁）。
  function askdirEval(node, f, yg, yz) {
    if (!node || typeof node !== 'object') return false;
    if (node.p) {
      const a = node.args || {};
      switch (node.p) {
        case 'year_zhi': return a.zhi === yz;
        case 'year_gan': return a.gan === yg;
        case 'facing_mountain': return a.shan === f.fm;
        case 'sitting_mountain': return a.shan === f.sm;
        case 'facing_gua': return a.gua === f.fg;
        case 'sitting_gua': return a.gua === f.sg;
        case 'annual_sha_at': return !!f.dirSet[a.shan];
        default: return false;                       // 其余谓词（八字域）不参与方位匹配
      }
    }
    let saw = false, res = true;
    if (node.all) { saw = true; res = res && node.all.every(function (x) { return askdirEval(x, f, yg, yz); }); }
    if (node.any) { saw = true; res = res && node.any.some(function (x) { return askdirEval(x, f, yg, yz); }); }
    if (node.not) { saw = true; res = res && !askdirEval(node.not, f, yg, yz); }
    return saw ? res : false;
  }
  // 该方位在今年干支下命中的方位类规则（库内过滤·不重新 fetch）。异步回调 res={loaded,hits,disputed,year}。
  function askdirRuleHits(bearing, cb) {
    const yr = askdirYearGZ();
    if (!window.RuleKit || typeof RuleKit.load !== 'function') { cb({ loaded: false, hits: [], disputed: [], year: yr }); return; }
    RuleKit.load().then(function (rules) {
      if (!rules || !Array.isArray(rules)) { cb({ loaded: false, hits: [], disputed: [], year: yr }); return; }
      const f = askdirDirFacts(bearing);
      const hits = [], disputed = [];
      rules.forEach(function (r) {
        if (r.unreviewed === true) return;                                  // 待复核不参与
        if (!RuleKit.usesPredicate(r, ASKDIR_PREDS)) return;                 // 非方位类规则跳过（同 RuleKit 谓词收集口径）
        let ok = false; try { ok = askdirEval(r.when, f, yr.gan, yr.zhi); } catch (e) { ok = false; }
        if (!ok) return;
        (r.status === 'disputed' ? disputed : hits).push(r);
      });
      cb({ loaded: true, hits: hits, disputed: disputed, year: yr });
    }).catch(function () { cb({ loaded: false, hits: [], disputed: [], year: yr }); });
  }

  // ---- 抽屉呈现 ----
  let askdirWired = false, askdirToken = 0, askdirShownAt = 0;
  function askdirEnsure() {
    const sheet = $('askdir-sheet'), bd = $('askdir-backdrop');
    if (!sheet || sheet._wired) return;
    sheet._wired = true;
    const x = $('askdir-close'); if (x) x.addEventListener('click', askdirClose);
    // 背幕点击关闭：忽略长按刚开屉那一下的合成 click（松指落在背幕上，否则一开即关）
    if (bd) bd.addEventListener('click', function () { if (Date.now() - askdirShownAt > 300) askdirClose(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') askdirClose(); });
    if (window.L && L.DomEvent) { L.DomEvent.disableClickPropagation(sheet); L.DomEvent.disableScrollPropagation(sheet); if (bd) L.DomEvent.disableClickPropagation(bd); }
  }
  function askdirClose() {
    const sheet = $('askdir-sheet'), bd = $('askdir-backdrop');
    if (bd) bd.classList.remove('shown');
    if (sheet) { sheet.classList.remove('shown'); sheet.setAttribute('aria-hidden', 'true'); }
  }
  function fmtDeg(d) { return String(Math.round(C.norm(d) * 10) / 10); }
  // 头：山名（词条）+ 度数区间 + 八卦宫（词条）+ 宫位五行（染色）+ 坐向读数
  function askdirHeaderHtml(r, en) {
    const t = C.TRIGRAMS[r.trigram] || {};
    const deg = fmtDeg(r.facing.center - 7.5) + '°–' + fmtDeg(r.facing.center + 7.5) + '°';
    const elHex = C.EL_HEX[r.facing.el] || 'var(--paper)';
    return '<div class="askdir-headrow">'
      + '<span class="askdir-mtn">' + renderTerm(r.facing.name) + (en ? ' Mtn' : '山') + '</span>'
      + '<span class="askdir-deg">' + deg + '</span></div>'
      + '<div class="askdir-palace">' + escapeHtml(t.symbol || '') + ' ' + renderTerm(r.trigram) + (en ? ' Palace' : '宫')
      + ' · <span style="color:' + elHex + '">' + (en ? 'palace phase ' + elEN(r.facing.el) : '宫位五行 ' + r.facing.el) + '</span></div>'
      + '<div class="askdir-zx">' + escapeHtml(r.zuoXiang) + '</div>';
  }
  // 排盘态：该宫游年星（吉金/凶墨青）+ 双声部行（复用契合行渲染，含宫五行 vs 喜用忌神）
  function askdirFitHtml(r, en) {
    const data = baziFitData();
    if (!data) return '<p class="askdir-note">' + (en ? 'Cast your chart to see this sector’s fit with your natal profile.' : '排盘后此处显示该方位与本命的契合。') + '</p>';
    const star = C.bazhaiStar(data.bz.mingGua, r.trigram);
    const lucky = !!(C.BAZHAI_STARS[star] && C.BAZHAI_STARS[star][1]);
    const el = r.facing.el;
    const fit = data.bazi.favorable.includes(el) ? '合喜用' : data.bazi.unfavorable.includes(el) ? '犯忌神' : '气性平';
    const starLbl = en ? (lucky ? 'auspicious' : 'best left dormant') : (lucky ? '四吉' : '四凶 · 宜伏');
    return '<div class="askdir-fit">'
      + '<div class="askdir-star ' + (lucky ? 'good' : 'calm') + '">' + (en ? 'Roaming-year star ' : '该宫游年星 ') + renderTerm(star) + ' · ' + starLbl + '</div>'
      + '<div class="askdir-voices">' + fitVoicesHtml(star, fit, el) + '</div>'
      + '</div>';
  }
  function askdirG2Head(yr, en) {
    return '<div class="askdir-g2-head">' + (en ? 'Almanac · sector' : '历书方位')
      + '<span class="askdir-gz">' + escapeHtml(yr.gz) + (en ? ' yr' : '年') + '</span></div>';
  }
  function askdirG2Html(res, en) {
    const head = askdirG2Head(res.year, en);
    if (!res.loaded) return head + '<p class="askdir-note">' + (en ? 'Rule library not ready.' : '规则库未就绪。') + '</p>';
    const all = (res.hits || []).concat(res.disputed || []);
    if (!all.length) return head + '<p class="askdir-note askdir-empty">' + (en ? 'No almanac entry for this sector this year.' : '本方位今年无历书条目') + '</p>';
    all.sort(function (a, b) { return ruleWeight(b) - ruleWeight(a); });
    const src = '<p class="askdir-g2-src">' + (en ? 'From ' : '据 ')
      + '<span class="cite-chip" data-cite="xinji-bianfang" role="button" tabindex="0">《钦定协纪辨方书》</span>'
      + (en ? ' annual directions · deterministic at runtime' : '流年方位 · 运行时确定') + '</p>';
    return head + '<div class="askdir-g2-list">' + all.map(renderRuleItem).join('') + '</div>' + src;
  }
  function askdirOpen(bearing) {
    askdirEnsure();
    const sheet = $('askdir-sheet'), bd = $('askdir-backdrop'), body = $('askdir-body');
    if (!sheet || !body) return;
    const en = isEN();
    const tk = ++askdirToken;
    const r = C.directionReading(C.norm(bearing));
    const seal = $('askdir-seal'); if (seal) seal.textContent = en ? 'Sector Dossier' : '方位档案';
    sheet.setAttribute('aria-label', en ? 'Sector dossier' : '方位档案');
    const title = $('askdir-title'); if (title) title.innerHTML = renderTerm(r.facing.name) + (en ? ' Mtn' : '山');
    body.innerHTML = askdirHeaderHtml(r, en) + askdirFitHtml(r, en)
      + '<div id="askdir-g2">' + askdirG2Head(askdirYearGZ(), en) + '<p class="askdir-note">' + (en ? 'Checking almanac…' : '查历书中…') + '</p></div>';
    body.scrollTop = 0;
    askdirRuleHits(bearing, function (res) {
      if (tk !== askdirToken) return;                       // 已切到别的方位：丢弃过期结果
      const g2 = $('askdir-g2'); if (g2) g2.innerHTML = askdirG2Html(res, en);
    });
    if (bd) bd.classList.add('shown');
    sheet.classList.add('shown');
    sheet.setAttribute('aria-hidden', 'false');
    askdirShownAt = Date.now();
  }
  window._askdirOpen = askdirOpen;   // 供验证脚本按方位驱动（度数→抽屉）

  // 盘心天池半径（翻面热区）：取 #dial-center-hit 实测半宽，缺省 31（= 62px 直径的一半），环带自此往外起。
  function askdirCenterR() {
    const hit = $('dial-center-hit');
    if (hit) { const rr = hit.getBoundingClientRect(); if (rr.width > 0) return rr.width / 2; }
    return 31;
  }
  // 长按环带 0.8s → 弹方位档案。捕获相位挂 #page-kanyu：罗盘 canvas pointer-events:none，拖动透传地图；
  // 静止长按不触发地图平移，移动>阈值即取消（拖动地图不触发）；盘心翻面区（<天池半径）与控件目标一律不认。
  function wireDirArchiveLongPress() {
    if (askdirWired) return;
    const page = $('page-kanyu'); if (!page) return;
    askdirWired = true;
    let timer = null, sx = 0, sy = 0, pending = 0;
    function clear() {
      if (timer) { clearTimeout(timer); timer = null; }
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', clear, true);
      document.removeEventListener('pointercancel', clear, true);
    }
    function onMove(e) { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) clear(); }
    page.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      if (page.classList.contains('dial-flipped') || page.classList.contains('hud-collapsed')) return; // 翻面/收盘：不认
      if (e.target && e.target.closest && e.target.closest(
        '#kanyu-ctrl,#kanyu-top,#kanyu-read,#yangzhai-toolbar,#sim-row,#compass-cta,#kanyu-teaser,#dial-center-hit,#dial-back,#hud-puck,.leaflet-control,.fp-marker,button,a,input,select,textarea,label'
      )) return;                                                        // 交互控件/翻面热区/地图标记：让其自理
      const cv = $('luopan-hud'); if (!cv) return;
      const rect = cv.getBoundingClientRect();
      const R = rect.width / 2; if (R <= 0) return;
      const cx = rect.left + R, cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy, dist = Math.hypot(dx, dy);
      if (dist < askdirCenterR() || dist > R) return;                   // 只认盘面环带（天池外·盘缘内）
      const bearing = C.norm(heading + Math.atan2(dx, -dy) * 180 / Math.PI); // 屏点→罗盘方位（盘北随 heading 旋转）
      sx = e.clientX; sy = e.clientY; pending = bearing; clear();
      timer = setTimeout(function () {
        timer = null;
        try { if (navigator.vibrate) navigator.vibrate(18); } catch (_) {}
        askdirOpen(pending);
      }, 800);
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', clear, true);
      document.addEventListener('pointercancel', clear, true);
    }, true);
  }

  // 吉神一组开关 + 棘轮触觉开关接线（复用现有 checkbox 样式·持久化）
  function wireDialToggles() {
    const js = $('kanyu-jishen');
    if (js) {
      js.checked = jishenOn;
      js.addEventListener('change', function () {
        jishenOn = js.checked;
        try { localStorage.setItem('dial-jishen', jishenOn ? '1' : '0'); } catch (e) { /* 私密模式忽略 */ }
        updateDialMarks();
      });
    }
    const rt = $('kanyu-ratchet');
    if (rt) {
      rt.checked = ratchetOn;
      rt.addEventListener('change', function () {
        ratchetOn = rt.checked;
        try { localStorage.setItem('ratchet-haptic', ratchetOn ? '1' : '0'); } catch (e) { /* 私密模式忽略 */ }
        lastRatchetBucket = null;
      });
    }
  }

  // 调试/验证钩子（e2e：断言吉神方位与 lunar-js 一致、棘轮/翻面态可读）
  window._dialMarksDebug = function () {
    const now = new Date();
    const d = baziFitData();
    return {
      jishenOn: jishenOn,
      jishen: jishenPositions(now),
      yuejianZhi: monthJianZhi(now),
      benmingZhi: d && d.bazi && d.bazi.pillars[0] ? d.bazi.pillars[0].zhi : null,
      sun: sunBearings(),
      markCount: dialMarkOrient.length,
      ratchetOn: ratchetOn,
      ratchetBucket: lastRatchetBucket,
      flipped: dbFlipped,
    };
  };
  window._dialFlip = flipDial; // 供验证脚本驱动翻面（reduced-motion 直切）

  // 今日天时五行（按时辰缓存，避免高频重算 EightChar）；勾选「纳今日天时」后并入共鸣测算
  let dayElCache = { key: '', scores: null };
  function todayElements() {
    const now = new Date();
    const key = now.toDateString() + ':' + now.getHours();
    if (dayElCache.key !== key) {
      try { dayElCache = { key, scores: C.dayElements(now).scores }; } catch (e) { dayElCache = { key, scores: null }; }
    }
    return dayElCache.scores;
  }
  function tianshiOn() { const c = $('kanyu-tianshi'); return !!(c && c.checked); }
  function updateTianshiLine() {
    const line = $('kanyu-tianshi-line'); if (!line) return;
    const ds = tianshiOn() ? todayElements() : null;
    if (!ds) { line.textContent = ''; return; }
    let top = C.ELEMENTS[0]; C.ELEMENTS.forEach(e => { if (ds[e] > ds[top]) top = e; });
    line.textContent = `今日天时：${C.ELEMENTS.map(e => e + ds[e].toFixed(1)).join('·')} → 当令${top}气，已并入测算`;
    line.style.color = C.EL_HEX[top];
  }

  // 五行共鸣：盘中五行+此向之气+此地之气(+可选今日天时) → 实时数值；转到恰补最薄之气的方向即共鸣（辉光+震动）
  let lastResonate = false;
  function updateResonance(data, d) {
    const wxEl = $('compass-wuxing');
    const posEl = $('compass-pos');
    const card = $('kanyu-read');
    const dial = $('luopan-hud');
    if (!wxEl || !posEl) return;
    if (!data) {
      wxEl.style.display = 'none';
      posEl.textContent = '';
      if (card) card.classList.remove('resonate');
      if (dial) dial.classList.remove('resonate-dial');
      if (compassFx) compassFx.setResonating(false);
      lastResonate = false;
      return;
    }
    const res = C.wuxingResonance(data.bazi, d, tianshiOn() ? todayElements() : null);
    wxEl.style.display = 'flex';
    wxEl.innerHTML = C.ELEMENTS.map(e => {
      const mark = e === res.dirEl ? '▲' : (e === res.weakest ? '▽' : '');
      return `<span style="color:${C.EL_HEX[e]}">${e}${res.scores[e].toFixed(1)}${mark}</span>`;
    }).join('');
    const ss = C.shishenOfDirection(data.bazi, d);
    let posText = `此向为您的「${ss.tag}」· 五行平衡 ${res.balance}%`;
    if (res.resonate) {
      const w = res.weakest;
      const variants = [
        `✦ 此向恰补盘中最薄之${w}气，五行趋全 · `,
        `✦ 盘中${w}气最薄，此向恰补其缺，五局向圆 · `,
        `✦ 转得此向，恰补${w}气之薄，五行渐次归衡 · `,
        `✦ ${w}为盘中短板，此向恰补一笔，气象为之一全 · `,
      ];
      posText = variants[C.stableHash(data.bazi.pillars.map(p => p.gz).join('') + w) % variants.length] + posText;
    }
    posEl.textContent = posText + '（依五行生克推演）';
    posEl.style.color = res.resonate || ss.major ? 'var(--gold)' : 'var(--paper-dim)';
    if (card) card.classList.toggle('resonate', res.resonate);
    if (dial) dial.classList.toggle('resonate-dial', res.resonate || auspGlow); // 五行共鸣或入吉方任一即辉光
    if (compassFx) compassFx.setResonating(res.resonate || auspGlow);
    if (res.resonate && !lastResonate && navigator.vibrate) navigator.vibrate([40, 60, 40]);
    lastResonate = res.resonate;
  }

  function drawLuopan() {
    const cv = canvas();
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // 封顶 2：3× 屏上 340px 盘不必铺 1020px 背板
    const size = cv.clientWidth;
    if (size <= 0) return; // tab 隐藏时 clientWidth=0，负半径会让 ctx.arc 抛异常
    if (cv.width !== size * dpr) { cv.width = size * dpr; cv.height = size * dpr; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2, R = size / 2 - 4;
    const screen = deg => (deg - heading) * Math.PI / 180;
    const pt = (deg, r) => [cx + r * Math.sin(screen(deg)), cy - r * Math.cos(screen(deg))];

    // 盘底
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, '#332f28'); grad.addColorStop(1, '#1b1813');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    // 金圈
    [[R, 0.8, 1.6], [R * 0.86, 0.3, 0.7], [R * 0.64, 0.3, 0.7], [R * 0.42, 0.3, 0.7], [R * 0.2, 0.3, 0.7]]
      .forEach(([r, a, w]) => {
        ctx.strokeStyle = `rgba(201,162,39,${a})`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
      });
    // 八卦宫本命标注（排盘后·图层切换：关/八宅/喜用）。落 R*0.42–0.86 环带，fill 低透，字/刻度仍压其上可读。
    // canvas 角 θ(deg)=screen(deg)-π/2（screen 为「自北顺时针」量，canvas 角自 +x 顺时针）。
    //   八宅层：四吉宫淡金按吉级分亮（生气最亮→伏位最淡）；四凶宫低饱和墨青+「宜伏」小标，按凶级调深浅（绝命>五鬼>六煞>祸害）。朱红专属流年。
    //   喜用层：宫位五行∈喜用染金、∈忌神染暗墨（今人方法：喜用取用）。
    const shadeData = bzLayer !== 'off' ? baziFitData() : null;
    if (shadeData && shadeData.bz && shadeData.bz.stars) {
      const rIn = R * 0.42, rOut = R * 0.86;
      const LUCK_ALPHA = { 生气: .28, 天医: .21, 延年: .15, 伏位: .10 };
      const XIONG_ALPHA = { 绝命: .30, 五鬼: .24, 六煞: .18, 祸害: .12 };
      const fav = shadeData.bazi.favorable, unfav = shadeData.bazi.unfavorable;
      Object.entries(C.TRIGRAMS).forEach(([name, t]) => {
        const th0 = screen(t.hou - 22.5) - Math.PI / 2, th1 = screen(t.hou + 22.5) - Math.PI / 2;
        let fill = null, hairline = null, yifu = false;
        if (bzLayer === 'bazhai') {
          const star = shadeData.bz.stars[name];
          const lucky = !!(C.BAZHAI_STARS[star] && C.BAZHAI_STARS[star][1]);
          if (lucky) { fill = `rgba(201,162,39,${LUCK_ALPHA[star] || .12})`; hairline = 'rgba(201,162,39,.5)'; }
          else { fill = `rgba(58,96,96,${XIONG_ALPHA[star] || .16})`; yifu = true; } // 低饱和墨青，零发光；标「宜伏」
        } else { // 喜用层：按宫位五行取喜用/忌神
          const pel = t.el;
          if (fav.indexOf(pel) >= 0) { fill = 'rgba(201,162,39,.20)'; hairline = 'rgba(201,162,39,.5)'; }
          else if (unfav.indexOf(pel) >= 0) { fill = 'rgba(70,84,98,.34)'; } // 暗墨（冷调），零发光
        }
        if (!fill) return;
        ctx.beginPath();
        ctx.arc(cx, cy, rOut, th0, th1, false);
        ctx.arc(cx, cy, rIn, th1, th0, true);
        ctx.closePath();
        ctx.fillStyle = fill; ctx.fill();
        if (hairline) { ctx.strokeStyle = hairline; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(cx, cy, rOut, th0, th1, false); ctx.stroke(); }
        if (yifu) drawRotated(ctx, '宜伏', pt(t.hou, R * 0.66), screen(t.hou), '9px "Songti SC",serif', 'rgba(150,196,196,.9)');
      });
    }
    // 度数刻度
    for (let deg = 0; deg < 360; deg += 5) {
      const major = deg % 30 === 0;
      const [x1, y1] = pt(deg, R * 0.985), [x2, y2] = pt(deg, R * (major ? 0.93 : 0.955));
      ctx.strokeStyle = `rgba(201,162,39,${major ? 0.9 : 0.45})`;
      ctx.lineWidth = major ? 1.4 : 0.7;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (major) drawRotated(ctx, String(deg), pt(deg, R * 0.895), screen(deg), '9px serif', 'rgba(214,205,180,.8)');
    }
    // 二十四山
    const facing = C.mountainAt(C.norm(heading));
    C.MOUNTAINS.forEach((m, i) => {
      const deg = i * 15;
      const isFacing = i === facing.index;
      drawRotated(ctx, m, pt(deg, R * 0.76), screen(deg),
        `${isFacing ? '700' : '500'} 17px "Songti SC","Noto Serif SC",serif`,
        isFacing ? '#c24428' : '#ece5d0');
      const b = deg + 7.5;
      const [bx1, by1] = pt(b, R * 0.64), [bx2, by2] = pt(b, R * 0.86);
      ctx.strokeStyle = 'rgba(201,162,39,.25)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
    });
    // 八卦
    Object.entries(C.TRIGRAMS).forEach(([name, t]) => {
      drawRotated(ctx, t.symbol, pt(t.hou, R * 0.54), screen(t.hou), '15px serif', '#c9a227');
      drawRotated(ctx, name, pt(t.hou, R * 0.45), screen(t.hou), '11px "Songti SC",serif', 'rgba(214,205,180,.75)');
    });
    // 天池指北针
    const [nx, ny] = pt(0, R * 0.17), [sx2, sy2] = pt(180, R * 0.17);
    ctx.strokeStyle = '#c24428'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(sx2, sy2); ctx.lineTo(nx, ny); ctx.stroke();
    ctx.fillStyle = '#c24428';
    ctx.beginPath(); ctx.arc(nx, ny, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9a227';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill();
    drawRotated(ctx, '北', pt(0, R * 0.27), screen(0), '10px "Songti SC",serif', '#c24428');
    glowUpdateRotation();   // 五行微光环随 heading 同步旋转（外圈氛围层，非 canvas 绘制）
    if (window._yangzhaiUpdatePositions) window._yangzhaiUpdatePositions();
  }
  function drawRotated(ctx, text, [x, y], rad, font, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rad);
    ctx.font = font; ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // 罗盘传感器：能免授权的环境（Android 等）进站即自动启动；
  // iOS 要求一次用户手势才肯放行方向传感器——把「轻触入境」那一下顺便用作授权，
  // 用户无感知。桌面端等 2.5s 收不到任何方向事件，才静默亮出模拟滑杆。
  let sensorAttached = false;
  let lastSensorTs = 0;
  function startSensor() {
    if (sensorAttached) return;
    sensorAttached = true;
    sensorOn = true;
    window.addEventListener('deviceorientation', e => {
      if (!sensorOn) return;
      let raw = null;
      if (typeof e.webkitCompassHeading === 'number') raw = e.webkitCompassHeading;           // iOS：磁北顺时针
      else if (e.absolute && typeof e.alpha === 'number') raw = C.norm(360 - e.alpha);        // Android 绝对方位
      if (raw !== null) {
        lastSensorTs = Date.now();
        $('sim-row').classList.remove('shown');
        setHeading(raw);
      }
    }, true);
  }
  const needsGesture = typeof DeviceOrientationEvent !== 'undefined'
    && typeof DeviceOrientationEvent.requestPermission === 'function';
  function requestSensorViaGesture() {
    if (sensorAttached) return;
    DeviceOrientationEvent.requestPermission()
      .then(r => { if (r === 'granted') startSensor(); })
      .catch(() => { /* 拒绝则静默退回滑杆 */ });
  }
  function enterImmersive() {
    if (needsGesture) requestSensorViaGesture();
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }
  window._enterImmersive = enterImmersive;

  // HUD 罗盘 + 控制条接线（由 initKanyu 调用，onHome=「回我」定位回调）
  function wireCompassHud(onHome) {
    if (!compassFx) compassFx = createCompassFx();
    if (compassFx) compassFx.setActive(true);
    buildWuxingGlow();   // 常驻五行微光环（叠罗盘外圈；先于首绘建好，drawLuopan 末尾同步旋转）
    drawLuopan();
    // 透明度：只调罗盘盘 alpha（不暗化卫星图，否则气流看不清），localStorage 持久
    const op = $('hud-opacity');
    const savedOp = localStorage.getItem('hud-opacity');
    if (savedOp !== null) op.value = savedOp;
    const applyOp = () => { $('luopan-hud').style.opacity = String(Math.max(0.15, op.value / 100)); localStorage.setItem('hud-opacity', op.value); };
    op.addEventListener('input', applyOp); applyOp();
    // 控件不触发地图手势
    if (window.L && L.DomEvent) {
      ['kanyu-ctrl', 'kanyu-read', 'sim-row'].forEach(id => {
        const el = $(id); if (el) { L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el); }
      });
    }
    // 模拟朝向滑杆（无传感器时浮现）
    $('compass-slider').addEventListener('input', e => {
      sensorOn = false;
      if (lockedHeading !== null) { lockedHeading = null; $('btn-lock').textContent = '定盘'; $('btn-lock').classList.remove('locked'); $('lock-panel').classList.remove('shown'); if (compassFx) compassFx.setLocked(false); } // 拖滑杆即释盘，按钮态同步，别留「释盘」假象
      setHeading(parseFloat(e.target.value));
    });
    // 定盘 / 释盘：真冻结朝向 + 描金静止针 + 延伸读数
    $('btn-lock').addEventListener('click', () => {
      if (lockedHeading === null) {
        lockedHeading = heading; sensorOn = false;
        $('btn-lock').textContent = '释盘'; $('btn-lock').classList.add('locked');
        if (compassFx) compassFx.setLocked(true);
        const r = C.directionReading(C.norm(heading));
        $('lock-zuoxiang').textContent = r.zuoXiang;
        const t = C.TRIGRAMS[r.trigram];
        $('lock-sub').textContent = `${t.symbol} ${r.trigram}宫 · 五行属${r.facing.el}`;
        $('lock-sub').style.color = C.EL_HEX[r.facing.el];
        $('lock-panel').classList.add('shown');
        // 玄空飞星九宫格：以当前朝向为向首，计算九运三盘（Phase 7）
        try {
          const xk = buildXkForHeading(C.norm(heading));
          $('lock-xk').innerHTML = xk.html;
        } catch (e) { $('lock-xk').innerHTML = ''; }
        typewriter($('lock-reading'), C.masterDirection(r), 22);
        drawLuopan();
      } else {
        lockedHeading = null; sensorOn = true; lastRaw = null;
        $('btn-lock').textContent = '定盘'; $('btn-lock').classList.remove('locked');
        $('lock-panel').classList.remove('shown');
        if (compassFx) compassFx.setLocked(false);
      }
    });
    $('lock-close').addEventListener('click', () => $('lock-panel').classList.remove('shown'));
    // 回我（统一定位）/ 收放 HUD / 读数展开
    $('btn-home').addEventListener('click', onHome);
    const toggleHud = () => $('page-kanyu').classList.toggle('hud-collapsed');
    $('hud-puck').addEventListener('click', toggleHud);
    $('btn-collapse').addEventListener('click', toggleHud);
    // 「阳宅」开关：默认收起室内工具栏(加床/门/窗/灶·形煞·砂水·户型)，点开才展开 → 堪舆默认只留 地图+罗盘，保持干净
    const yzToggle = $('btn-yangzhai');
    if (yzToggle) yzToggle.addEventListener('click', () => {
      const open = $('yangzhai-toolbar').classList.toggle('open');
      yzToggle.classList.toggle('locked', open);
      $('page-kanyu').classList.toggle('yz-open', open); // 底部阳宅横条展开时隐朝向模拟条（避免底部三条相叠）
      // 进勘察模式（展开阳宅工具栏）：水墨底自动切卫星供勘察（见 initKanyu 内 _kanyuEnsureTileForSurvey）
      if (open && window._kanyuEnsureTileForSurvey) window._kanyuEnsureTileForSurvey();
    });
    $('kanyu-expand').addEventListener('click', () => {
      $('kanyu-read').classList.toggle('expanded'); // 详读展开：#kanyu-top 统一滚动，无需再重定位原句卡
      // HUD 展开 → 地支棋盘连线闪现 2.5s（常态盘面不留线，守克制）
      if ($('kanyu-read').classList.contains('expanded') && window._dizhiFlashLines) window._dizhiFlashLines('hud');
    });
    // 未排盘 CTA：切「命」页排盘（复用 tabbar 切换逻辑）
    const cta = $('compass-cta');
    if (cta) {
      const goBazi = () => switchTab('bazi');
      cta.addEventListener('click', goBazi);
      cta.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goBazi(); } });
    }
    // 盘面本命标注图层三态：关/八宅/喜用（持久化，默认八宅）
    function paintLayerSeg() {
      document.querySelectorAll('#bz-layer-row .bz-layer-btn').forEach(b => {
        const on = b.dataset.layer === bzLayer;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    document.querySelectorAll('#bz-layer-row .bz-layer-btn').forEach(b => {
      b.addEventListener('click', () => {
        bzLayer = b.dataset.layer;
        try { localStorage.setItem('bz-layer', bzLayer); } catch (e) {}
        paintLayerSeg();
        const lg = $('bz-layer-legend'), d = baziFitData();
        if (lg && d) lg.innerHTML = layerLegendText(d); // 同上：图例含 cite-chip，用 innerHTML
        drawLuopan();
        updateCompassCard(); // 原句卡声部跟随图层
      });
    });
    paintLayerSeg();
    // 两法异说小浮层：宅法键命卦、命法键日主，所据之「命」不同（今人整理，非古籍仲裁）
    const divBtn = $('fit-diverge-btn'), divPop = $('fit-diverge-pop');
    if (divPop) divPop.textContent = '宅法（八宅）以命卦定八方吉凶，命法（子平）以日主强弱定喜用五行；两者所据之「命」不同——一为命卦（生年所属），一为日主（生日之天干）。故同一方位可一法断凶、一法断得用，各有典据，不相为裁。（今人整理，非古籍仲裁）';
    if (divBtn && divPop) divBtn.addEventListener('click', () => {
      const open = divPop.hidden;
      divPop.hidden = !open;
      divBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // 原句 teaser 点击 → 弹完整原句 overlay；overlay 点外/✕/Esc 关闭
    const teaserBtn = $('kanyu-teaser');
    if (teaserBtn) teaserBtn.addEventListener('click', openQuoteOverlay);
    const bzqOverlay = $('bzq-overlay');
    if (bzqOverlay) bzqOverlay.addEventListener('click', e => { if (e.target === bzqOverlay) hideQuoteOverlay(); });
    // overlay 内原句卡：典 chip 抽笺开/收（重看/收起纸面）
    const dian = $('bzq-dian');
    if (dian) dian.addEventListener('click', () => {
      const slot = $('bzq-slot'); if (!slot) return;
      const open = !slot.classList.contains('open');
      slot.classList.toggle('open', open);
      dian.classList.toggle('on', open);
    });
    const bzqX = $('bzq-dismiss');
    if (bzqX) bzqX.addEventListener('click', () => hideQuoteOverlay());
    // 今日天时纳入（黄历干支·时卦五行，持久化）
    const ts = $('kanyu-tianshi');
    if (localStorage.getItem('kanyu-tianshi') === '1') ts.checked = true;
    ts.addEventListener('change', () => { localStorage.setItem('kanyu-tianshi', ts.checked ? '1' : '0'); updateCompassCard(); });
    // 传感器：已在开屏授权则沿用；iOS 未授权则就地露「校准罗盘」；其余自动启动
    if (sensorAttached) { /* 开屏已授权启动 */ }
    else if (needsGesture) {
      const cal = $('btn-calibrate'); cal.style.display = '';
      cal.addEventListener('click', () => { requestSensorViaGesture(); cal.style.display = 'none'; });
    } else { startSensor(); }
    setTimeout(() => { if (Date.now() - lastSensorTs > 2400 && lockedHeading === null) $('sim-row').classList.add('shown'); }, 2600);
    window.addEventListener('resize', () => { drawLuopan(); recomputeKanyuTopOffset(); });
    updateCompassCard();
  }

  // ===== 玄空飞星九宫格 HTML 构建（Phase 7）=====
  // 出处：清·沈竹礽《沈氏玄空学》约1891年；九运·离火 2024–2043
  const XK_GRID_DIRS  = ['NW','N','NE','W','C','E','SW','S','SE'];
  const XK_DIR_ZH = {NW:'乾·西北',N:'坎·北',NE:'艮·东北',W:'兑·西',C:'中宫',E:'震·东',SW:'坤·西南',S:'离·南',SE:'巽·东南'};
  function xkVigorClass(s, yun) {
    const v = C.xkStarVigor(s, yun);
    if (v === '当旺') return 'xk-wang';
    if (v === '生气') return 'xk-sheng';
    if (v === '退气') return 'xk-tui';
    if (v === '五黄煞') return 'xk-five';
    return 'xk-si';
  }
  function buildXkGrid(chart, pat, mtnLabel, year, monthIdx) {
    const yun = chart.yun;
    const subTag = chart.isSubstitute ? ' <span class="xk-sub-tag">替卦</span>' : '';
    let h = `<div class="xk-grid">`;
    XK_GRID_DIRS.forEach(d => {
      const iF = d === chart.facingDir, iS = d === chart.sittingDir;
      const mS = d === 'C' ? (chart.mountain ? chart.mountain[d] : '') : chart.mountain[d];
      const fS = d === 'C' ? (chart.facing ? chart.facing[d] : '') : chart.facing[d];
      const pS = chart.period[d];
      const extra = iF ? ' xk-facing' : (iS ? ' xk-sitting' : '');
      h += `<div class="xk-cell${extra}">`;
      h += `<div class="xk-dir">${XK_DIR_ZH[d]}${iF ? '→' : iS ? '←' : ''}</div>`;
      h += `<div><span class="${xkVigorClass(mS, yun)}" title="山星（人丁）">▲${mS||'—'}</span>&nbsp;<span class="${xkVigorClass(fS, yun)}" title="向星（财运）">▼${fS||'—'}</span></div>`;
      h += `<div class="xk-period">${pS}运</div>`;
      h += `</div>`;
    });
    h += `</div>`;
    const patCol = pat === '旺山旺向' ? 'var(--gold)' : pat === '上山下水' ? 'var(--cinnabar)' : 'var(--paper-dim)';
    const mtnNote = mtnLabel ? `${mtnLabel}${subTag} · ` : '';
    // v2-P23: 动态年运注释（YUN_GUA 表驱动，非硬编码；违反铁律①②的修复）
    // 公式: yunStart = 1864 + (yun-1)×20；出处：清·沈竹礽《沈氏玄空学》约1891年
    // 数值算例: yun=9 → yunStart=2024, yunEnd=2043, '第9运·离火（2024–2043）' ✓
    //           yun=8 → yunStart=2004, yunEnd=2023, '第8运·艮土（2004–2023）' ✓
    const yunStart = 1864 + (yun - 1) * 20;
    const yunNote  = `第${yun}运·${YUN_GUA[yun] || ''}（${yunStart}–${yunStart + 19}）`;
    h += `<p class="xk-note">${mtnNote}格局：<b style="color:${patCol}">${pat}</b> · ▲山星·人丁 ▼向星·财运 · ${yunNote}<br>出处：清·沈竹礽<span class="cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span>约1891年；五黄煞⚠各运皆凶</p>`;
    // v2-P32: 合十局（xkHeShiPattern；来源：《沈氏玄空学》约1891年；铁律①②：同盘恒同输出·不断言吉凶）
    if (C.xkHeShiPattern) {
      var hs = C.xkHeShiPattern(chart);
      var hsCol = hs.type === '无合十' ? 'var(--paper-dim)' : 'var(--gold)';
      var pairStr = hs.pairs.length > 0
        ? ' · 合十宫：' + hs.pairs.map(function(d) { return XK_DIR_ZH[d]; }).join('·')
        : '';
      h += '<p class="xk-note">合十局：<b style="color:' + hsCol + '">' + hs.type + '</b>' + pairStr + ' · <span class="dim cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span></p>';
    }
    // v2-P33: 连珠三般卦（xkLianzhuSanBan；来源：《沈氏玄空学》约1891年；铁律①②：同盘恒同输出·不断言吉凶）
    if (C.xkLianzhuSanBan) {
      var lz = C.xkLianzhuSanBan(chart);
      var lzCol = lz.isLianzhu ? 'var(--gold)' : 'var(--paper-dim)';
      var lzTxt = lz.isLianzhu ? lz.group : '无';
      h += '<p class="xk-note">连珠三般卦：<b style="color:' + lzCol + '">' + lzTxt + '</b>'
         + ' · <span class="dim cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span></p>';
    }
    // v2-P36: 父母三般卦（xkFuMuSanBan；来源：《沈氏玄空学》约1891年；三般组{1,4,7}/{2,5,8}/{3,6,9}；铁律①②：同盘恒同输出·不断言吉凶）
    // 数学证明：全局或全无（向星入中/山星入中/当运数三者差值在全9宫恒等，无需逐宫检测）
    if (C.xkFuMuSanBan) {
      var fm = C.xkFuMuSanBan(chart);
      var fmCol = fm.isFuMu ? 'var(--gold)' : 'var(--paper-dim)';
      var fmTxt = fm.isFuMu ? fm.group : '无';
      h += '<p class="xk-note">父母三般卦：<b style="color:' + fmCol + '">' + fmTxt + '</b>'
         + ' · <span class="dim cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span></p>';
    }
    // v2-P39: 格局详解（xkDoubleStarPattern；来源：《沈氏玄空学》约1891年；铁律①②③：同盘恒同输出·出处明注·不断言吉凶）
    // 数学定理：八卦正向×全运期→恒为上山下水（见 core.js F-v2-P39 证明注释，待 Codex P39-C1 复核）
    if (C.xkDoubleStarPattern) {
      var dsp = C.xkDoubleStarPattern(chart);
      var dspCol = dsp.pattern === '旺山旺向' ? 'var(--gold)'
                 : dsp.pattern === '上山下水' ? 'var(--cinnabar)'
                 : dsp.pattern === '诸格不显' ? 'var(--paper-dim)' : 'var(--jade)';
      h += '<p class="xk-note">格局详解：<b style="color:' + dspCol + '">' + dsp.pattern + '</b>'
         + ' · ' + dsp.context
         + ' · <span class="dim cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span></p>';
    }
    // v2-P40: 交剑煞检测（xkJiaoJianSha；五黄廉贞在向首/坐山；《沈氏玄空学》待核实；铁律①②③）
    // 数值算例：五运·午向S → typeB触发（mountain[S]=5·facing[N]=5·由P39定理保证）
    if (C.xkJiaoJianSha) {
      var jjs = C.xkJiaoJianSha(chart);
      var jjsCol = jjs.isJiaoJian ? 'var(--cinnabar)'
                 : (jjs.wuHuangAtFacing || jjs.wuHuangAtSitting) ? 'var(--gold)'
                 : 'var(--paper-dim)';
      var jjsTxt = jjs.isJiaoJian ? '交剑煞⚠ ' + jjs.notes.join('·')
                 : (jjs.wuHuangAtFacing || jjs.wuHuangAtSitting) ? jjs.notes.join('·')
                 : '无';
      h += '<p class="xk-note">五黄交剑：<b style="color:' + jjsCol + '">' + jjsTxt + '</b>'
         + ' · <span class="dim cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">廉贞五黄·《沈氏玄空学》</span></p>';
    }
    // v2-P41: 令星零正格局（xkLingZhengPattern；令星=当运数·正神方=洛书yun位·零神方=正神对宫；《沈氏玄空学》令星论；铁律①②③）
    // 数值算例：九运·午向S→正神方S(洛书[S]=9)·mountain[S]=9=令星·facing[N]=9=令星 → 零正得位
    //   一运·子向N→正神方N(洛书[N]=1)·mountain[N]=1·facing[S]=1 → 零正得位（P41-C2待Codex独立验证）
    if (C.xkLingZhengPattern) {
      var lzp = C.xkLingZhengPattern(chart);
      // v2 UX: 令星零正值对比度修复——失位暗红/部分得位暗色在 #211e18 面板上贴底，提亮一级（保持色相）
      var lzpCol = lzp.isDeWei   ? 'var(--gold)'
                 : lzp.isShiWei  ? '#e2694e'
                 : (lzp.zhengHasMtn || lzp.lingHasFacing) ? '#7fb383'
                 : 'var(--paper-dim)';
      var lzpDirStr = lzp.zhengDir
        ? '（正神' + (XK_DIR_ZH[lzp.zhengDir] || lzp.zhengDir) + '宜山·零神' + (XK_DIR_ZH[lzp.lingDir] || lzp.lingDir) + '宜水）'
        : '';
      h += '<p class="xk-note" style="font-size:12px">令星零正：<b style="color:' + lzpCol + '">' + lzp.type + '</b>'
         + lzpDirStr
         + ' · <span class="dim cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》令星论</span></p>';
    }
    // v2-P42: 城门诀检测（xkChengMenJue；向首侧宫向星=1为正城门；《沈氏玄空学》城门章·P42-C1待核实；铁律①②③）
    // 数值算例：九运午向S → 侧宫SW向星=1 → type='城门得水（向星1）'
    //   七运午向S → 侧宫SE向星=1 → type='城门得水（向星1）'
    //   九运子向N → 侧宫NW向星=6、NE向星=8 → type='无城门'
    if (C.xkChengMenJue) {
      var cmj = C.xkChengMenJue(chart);
      var cmjCol = cmj.active && cmj.delingActive ? 'var(--gold)'
                 : cmj.active                     ? 'var(--ink)'
                 : cmj.delingActive               ? 'var(--ink)'
                 : 'var(--paper-dim)';
      var cmjGateStr = '';
      if (cmj.zhengMen.length > 0) {
        cmjGateStr += '（正城门：' + cmj.zhengMen.map(function(g) {
          return (XK_DIR_ZH[g.dir] || g.dir) + '向星' + g.facingStar;
        }).join('·') + '）';
      }
      if (cmj.delingMen.length > 0) {
        cmjGateStr += '（当令：' + cmj.delingMen.map(function(g) {
          return (XK_DIR_ZH[g.dir] || g.dir) + '向星' + g.facingStar;
        }).join('·') + '）';
      }
      h += '<p class="xk-note">城门诀：<b style="color:' + cmjCol + '">' + cmj.type + '</b>'
         + cmjGateStr
         + ' · <span class="dim cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》城门章</span></p>';
    }
    // v2-P43: 催旺建议（xkCuiWang；旺山星方宜砂实·旺向星方宜水虚；《沈氏玄空学》山向论·待核实P43-C1；铁律①②③）
    // 关键数学事实：任意yun×8纯向→恒为上山下水（穷举72组验证）；isSelfCatalyzed仅见于mock或替卦场景
    if (C.xkCuiWang) {
      var cw = C.xkCuiWang(chart);
      var cwCol = cw.isSelfCatalyzed ? 'var(--gold)' : cw.isReversed ? 'var(--cinnabar)' : 'var(--ink)';
      var cwMtnStr = cw.wangMtnDirs.map(function(d) {
        var rel = d===chart.facingDir?'向首':d===chart.sittingDir?'坐山':'侧宫';
        return (XK_DIR_ZH[d]||d)+'·'+rel+'宜砂实▲';
      }).join('·');
      var cwFacStr = cw.wangFacingDirs.map(function(d) {
        var rel = d===chart.facingDir?'向首':d===chart.sittingDir?'坐山':'侧宫';
        return (XK_DIR_ZH[d]||d)+'·'+rel+'宜水虚▼';
      }).join('·');
      var cwEnvStr = [cwMtnStr, cwFacStr].filter(Boolean).join(' · ');
      h += '<p class="xk-note">催旺建议：<b style="color:' + cwCol + '">' + cw.cuiStatus + '</b>'
         + (cwEnvStr ? ' · ' + cwEnvStr : '')
         + ' · <span class="dim cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》山向论</span></p>';
    }
    // v2-P34: 伏吟/反吟年盘诊断（xkFuyinFanyin；来源：《沈氏玄空学》约1891年；铁律①②：同输入恒同输出·不断言吉凶）
    if (C.xkFuyinFanyin && year && year >= 1864 && year <= 2100) {
      var ffy = C.xkFuyinFanyin(chart, year);
      var ffYear = String(year) + '（' + ffy.nianStarName + '）';
      function ffDirList(dirs) {
        if (!dirs || dirs.length === 0) return '无';
        return dirs.map(function(d) { return XK_DIR_ZH[d] || d; }).join('·');
      }
      var fFu  = ffy.facing.fuyin,   fFan  = ffy.facing.fanyin;
      var mFu  = ffy.mountain.fuyin, mFan  = ffy.mountain.fanyin;
      var fFullFu  = ffy.facing.fullFuyin,   fFullFan  = ffy.facing.fullFanyin;
      var mFullFu  = ffy.mountain.fullFuyin, mFullFan  = ffy.mountain.fullFanyin;
      var fFuTxt  = fFullFu  ? '全局伏吟' : (fFu.length  ? '向盘伏吟·' + ffDirList(fFu)  : '');
      var fFanTxt = fFullFan ? '全局反吟' : (fFan.length ? '向盘反吟·' + ffDirList(fFan) : '');
      var mFuTxt  = mFullFu  ? '全局伏吟' : (mFu.length  ? '山盘伏吟·' + ffDirList(mFu)  : '');
      var mFanTxt = mFullFan ? '全局反吟' : (mFan.length ? '山盘反吟·' + ffDirList(mFan) : '');
      var ffParts = [fFuTxt, fFanTxt, mFuTxt, mFanTxt].filter(Boolean);
      var ffMain  = ffParts.length ? ffParts.join(' · ') : '无';
      var ffCol   = ffParts.length ? 'var(--cinnabar)' : 'var(--paper-dim)';
      h += '<p class="xk-note">伏吟/反吟 ' + ffYear + '：<b style="color:' + ffCol + '">' + ffMain + '</b>'
         + ' · <span class="dim cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span></p>';
    }
    // v2-P35: 月盘伏吟/反吟（xkMonthFuyinFanyin；来源：《沈氏玄空学》约1891年；铁律①②：同输入恒同输出·不断言吉凶）
    // 数值算例：九运午向facingEntryStar=4，2026辰月(idx=2): monthCenter=6，6+4=10→向盘全局反吟 ✓
    var MFY_MONTH_SHORT = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
    if (C.xkMonthFuyinFanyin && year && year >= 1864 && year <= 2100
        && monthIdx != null && monthIdx >= 0 && monthIdx <= 11) {
      var mff = C.xkMonthFuyinFanyin(chart, year, monthIdx);
      var mffLabel = MFY_MONTH_SHORT[monthIdx] + '月（' + mff.monthStarName + '）';
      function mffDirList(dirs) {
        if (!dirs || dirs.length === 0) return '无';
        return dirs.map(function(d) { return XK_DIR_ZH[d] || d; }).join('·');
      }
      var mfFu  = mff.facing.fuyin,    mfFan  = mff.facing.fanyin;
      var mmFu  = mff.mountain.fuyin,  mmFan  = mff.mountain.fanyin;
      var mffParts = [];
      if (mff.facing.fullFuyin)   mffParts.push('月向盘全局伏吟');
      else if (mfFu.length)       mffParts.push('月向盘伏吟·' + mffDirList(mfFu));
      if (mff.facing.fullFanyin)  mffParts.push('月向盘全局反吟');
      else if (mfFan.length)      mffParts.push('月向盘反吟·' + mffDirList(mfFan));
      if (mff.mountain.fullFuyin) mffParts.push('月山盘全局伏吟');
      else if (mmFu.length)       mffParts.push('月山盘伏吟·' + mffDirList(mmFu));
      if (mff.mountain.fullFanyin) mffParts.push('月山盘全局反吟');
      else if (mmFan.length)       mffParts.push('月山盘反吟·' + mffDirList(mmFan));
      var mffMain = mffParts.length ? mffParts.join(' · ') : '无';
      var mffCol  = mffParts.length ? 'var(--cinnabar)' : 'var(--paper-dim)';
      h += '<p class="xk-note">月盘伏/反吟 ' + mffLabel + '：<b style="color:' + mffCol + '">' + mffMain + '</b>'
         + ' · <span class="dim cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span></p>';
    }
    return h;
  }
  // v2-P26: 八宅速览卡常量（design-target §02·底部生气/天医/五鬼位）
  // 出处：清初《八宅明镜》（通行本）游年八星法（4吉/4凶，按重要性排序）
  // 铁律①：同 baseTri 恒同输出；铁律②：只输出星名+方位，不断言吉凶建议
  // 数值算例（坎命）：
  //   吉：生气·巽·东南，延年·离·南，天医·震·东，伏位·坎·北
  //   凶：绝命·坤·西南，五鬼·艮·东北，六煞·乾·西北，祸害·兑·西
  //   ✓ 与《八宅明镜》（通行本）坎宅游年八星图一致
  var BZ_SUM_DIRS = [
    {tri:'乾',zh:'西北'},{tri:'坎',zh:'北'},{tri:'艮',zh:'东北'},{tri:'震',zh:'东'},
    {tri:'巽',zh:'东南'},{tri:'离',zh:'南'},{tri:'坤',zh:'西南'},{tri:'兑',zh:'西'},
  ];
  var BZ_SUM_LUCKY_ORDER   = ['生气','延年','天医','伏位'];
  var BZ_SUM_UNLUCKY_ORDER = ['绝命','五鬼','六煞','祸害'];

  function buildBzSummary(baseTri) {
    if (!baseTri || !C.bazhaiStar || !C.BAZHAI_STARS) return '';
    var lucky = [], unlucky = [];
    BZ_SUM_DIRS.forEach(function(d) {
      var star = C.bazhaiStar(baseTri, d.tri);
      if (!star) return;
      var isLucky = C.BAZHAI_STARS[star] && C.BAZHAI_STARS[star][1];
      var item = { star: star, zh: d.zh };
      if (isLucky) lucky.push(item); else unlucky.push(item);
    });
    lucky.sort(function(a,b) { return BZ_SUM_LUCKY_ORDER.indexOf(a.star) - BZ_SUM_LUCKY_ORDER.indexOf(b.star); });
    unlucky.sort(function(a,b) { return BZ_SUM_UNLUCKY_ORDER.indexOf(a.star) - BZ_SUM_UNLUCKY_ORDER.indexOf(b.star); });
    function chips(items, cls) {
      return items.map(function(it) {
        return '<span class="bz-sum-chip ' + cls + '">' + it.star + '<i>·' + it.zh + '</i></span>';
      }).join('');
    }
    return '<div class="bz-sum-block">'
      + '<div class="bz-sum-hd">八宅速览 <span class="dim cite-chip" data-cite="bazhai-dayouniange" role="button" tabindex="0">（《八宅明镜》游年八星法）</span></div>'
      + '<div class="bz-sum-row"><b class="bz-sum-lbl bz-lbl-lucky">吉位</b>'
      + chips(lucky, 'bz-lucky') + '</div>'
      + '<div class="bz-sum-row"><b class="bz-sum-lbl bz-lbl-unlucky">凶位</b>'
      + chips(unlucky, 'bz-unlucky') + '</div>'
      + '</div>';
  }

  // v2-P27: 玄空当运速览卡常量（design-target §01·底部当运面板·当运之星/方位/时间）
  // 出处：清·沈竹礽《沈氏玄空学》约1891年；F23 旺衰分级（当旺=运星编号=当运，生气=下一运）
  // 铁律①：同 chart 对象恒同输出（chart 由确定性 xkComputeXuanKong24 生成）
  // 铁律③：只输出旺衰+方位，App 不断言吉凶
  // 数值算例（九运·坐N向S·facingDir=S，任意 yun=9）：
  //   山星9 落某方 → 该方向显示「当旺·▲山」
  //   向星9 落某方 → 该方向显示「当旺·▼向」
  //   生气星（10%9+1=1号星）落某方 → 「生气·▲山」或「生气·▼向」
  var XK_YUN_DIRS8 = ['NW','N','NE','W','E','SW','S','SE'];
  var XK_YUN_DIR_ZH = {NW:'西北',N:'北',NE:'东北',W:'西',E:'东',SW:'西南',S:'南',SE:'东南'};

  function buildXkYunSummary(chart) {
    if (!chart || !C.xkStarVigor) return '';
    var yun = chart.yun;
    var wangMtn = [], wangFac = [], shengMtn = [], shengFac = [];
    XK_YUN_DIRS8.forEach(function(d) {
      var mS = chart.mountain[d], fS = chart.facing[d];
      var mV = (mS != null) ? C.xkStarVigor(mS, yun) : null;
      var fV = (fS != null) ? C.xkStarVigor(fS, yun) : null;
      var zh = XK_YUN_DIR_ZH[d];
      if (mV === '当旺') wangMtn.push(zh);
      if (fV === '当旺') wangFac.push(zh);
      if (mV === '生气') shengMtn.push(zh);
      if (fV === '生气') shengFac.push(zh);
    });
    var yunStart = 1864 + (yun - 1) * 20;
    var yunEnd   = yunStart + 19;
    var yunLabel = '第' + yun + '运·' + (YUN_GUA[yun] || '') + '（' + yunStart + '–' + yunEnd + '）';
    function dirChips(dirs, cls) {
      if (!dirs.length) return '<span class="xk-yun-none dim">—</span>';
      return dirs.map(function(z) {
        return '<span class="xk-yun-chip ' + cls + '">' + z + '</span>';
      }).join('');
    }
    var rows = [
      '<div class="xk-yun-row"><b class="xk-yun-lbl xk-yun-lbl-wang">当旺</b>'
        + '<span class="xk-yun-sub dim">▲山</span>' + dirChips(wangMtn, 'xk-yun-mtn')
        + '<span class="xk-yun-sub dim">▼向</span>' + dirChips(wangFac, 'xk-yun-fac') + '</div>',
      '<div class="xk-yun-row"><b class="xk-yun-lbl xk-yun-lbl-sheng">生气</b>'
        + '<span class="xk-yun-sub dim">▲山</span>' + dirChips(shengMtn, 'xk-yun-mtn')
        + '<span class="xk-yun-sub dim">▼向</span>' + dirChips(shengFac, 'xk-yun-fac') + '</div>',
    ].join('');
    return '<div class="xk-yun-block">'
      + '<div class="xk-yun-hd">当运速览 <span class="dim">（' + yunLabel + '）</span></div>'
      + rows
      + '</div>';
  }

  // v2-P44: 年盘飞星速览卡（buildXkNianSummary·年紫白与宅盘对比·旺/凶/注意/吉星方徽章行）
  // 出处：清末沈竹礽《沈氏玄空学》约1891年，年紫白论（待核实P44-C1）
  // 铁律①：同(chart,year)恒同输出；铁律③：显示「App 不断言吉凶」
  // 数值算例（九运·午向S·2026·一白入中）：
  //   SE=9=yun → 催旺徽章；NW=2/S=5 → 凶方徽章；W=3/SW=7 → 注意徽章；N=6/NE=4/E=8 → 吉星徽章
  function buildXkNianSummary(chart, year) {
    if (!chart || !year || !C.xkAnnualPlateOverview) return '';
    var ov = C.xkAnnualPlateOverview(chart, year);
    if (!ov) return '';
    var DIR_ZH = {N:'北',NE:'东北',E:'东',SE:'东南',S:'南',SW:'西南',W:'西',NW:'西北'};
    function dirChips(dirs, cls) {
      if (!dirs || !dirs.length) return '<span class="xk-yun-none dim">—</span>';
      return dirs.map(function(d) {
        return '<span class="xk-yun-chip ' + cls + '">' + (DIR_ZH[d] || d) + '</span>';
      }).join('');
    }
    var nianLabel = year + '年盘·' + ov.nianStarName + '入中';
    var rows = [
      '<div class="xk-yun-row"><b class="xk-yun-lbl xk-yun-lbl-wang">催旺</b>'
        + dirChips(ov.cuiWangDirs, 'xk-yun-fac')
        + '<span class="xk-yun-sub dim">（年令星' + ov.nianCenter + '=' + ov.yun + '运）</span></div>',
      '<div class="xk-yun-row"><b class="xk-yun-lbl xk-nian-xiong">凶方</b>'
        + dirChips(ov.xiongDirs, 'xk-nian-sha')
        + '<span class="xk-yun-sub dim">（二黑·五黄）</span></div>',
      '<div class="xk-yun-row"><b class="xk-yun-lbl xk-nian-zhuyi">注意</b>'
        + dirChips(ov.zhuyiDirs, 'xk-nian-zhuyi-chip')
        + '<span class="xk-yun-sub dim">（三碧·七赤）</span></div>',
      '<div class="xk-yun-row"><b class="xk-yun-lbl xk-yun-lbl-sheng">吉星</b>'
        + dirChips(ov.jiDirs, 'xk-nian-ji')
        + '</div>',
    ].join('');
    return '<div class="xk-yun-block">'
      + '<div class="xk-yun-hd">年盘速览 <span class="dim">（' + nianLabel + '）</span></div>'
      + rows
      + '<p class="xk-note dim" style="font-size:10px">出处：清末沈竹礽<span class="cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span>约1891年·年紫白论</p>'
      + '</div>';
  }

  // v2-P45: 月盘飞星速览卡（buildXkYueSummary·月紫白与宅盘对比·旺/凶/注意/吉星方·年月双凶/双吉徽章行）
  // 出处：清末沈竹礽《沈氏玄空学》约1891年，月紫白论（待核实P45-C1）
  // 铁律①：同(chart,year,monthIdx)恒同输出；铁律③：显示「App 不断言」
  // 数值算例（九运·午向S·2026·午月monthIdx=4·四绿入中）：
  //   N=9=yun→催旺；NW(5)/E(2)→月凶；NE(7)/SE(3)→注意；W(6)/S(8)/SW(1)→吉
  //   doubleXiongDirs=[NW]（年NW=2·月NW=5·同宫双凶）；doubleJiDirs=[]
  function buildXkYueSummary(chart, year, monthIdx) {
    if (!chart || !year || monthIdx == null || !C.xkMonthPlateOverview) return '';
    var ov = C.xkMonthPlateOverview(chart, year, monthIdx);
    if (!ov) return '';
    var DIR_ZH = {N:'北',NE:'东北',E:'东',SE:'东南',S:'南',SW:'西南',W:'西',NW:'西北'};
    var MONTH_ZH = ['寅月','卯月','辰月','巳月','午月','未月','申月','酉月','戌月','亥月','子月','丑月'];
    function dirChips(dirs, cls) {
      if (!dirs || !dirs.length) return '<span class="xk-yun-none dim">—</span>';
      return dirs.map(function(d) {
        return '<span class="xk-yun-chip ' + cls + '">' + (DIR_ZH[d] || d) + '</span>';
      }).join('');
    }
    var mLabel = year + '年·' + (MONTH_ZH[monthIdx] || ('月' + monthIdx)) + '·' + ov.monthStarName + '入中';
    var rows = [
      '<div class="xk-yun-row"><b class="xk-yun-lbl xk-yun-lbl-wang">月催旺</b>'
        + dirChips(ov.cuiWangDirs, 'xk-yun-fac')
        + '<span class="xk-yun-sub dim">（月令星' + ov.monthCenter + '=' + ov.yun + '运）</span></div>',
      '<div class="xk-yun-row"><b class="xk-yun-lbl xk-nian-xiong">月凶方</b>'
        + dirChips(ov.xiongDirs, 'xk-nian-sha')
        + '<span class="xk-yun-sub dim">（月二黑·五黄）</span></div>',
      '<div class="xk-yun-row"><b class="xk-yun-lbl xk-nian-zhuyi">月注意</b>'
        + dirChips(ov.zhuyiDirs, 'xk-nian-zhuyi-chip')
        + '<span class="xk-yun-sub dim">（月三碧·七赤）</span></div>',
      '<div class="xk-yun-row"><b class="xk-yun-lbl xk-yun-lbl-sheng">月吉星</b>'
        + dirChips(ov.jiDirs, 'xk-nian-ji') + '</div>',
    ];
    if (ov.doubleXiongDirs.length) {
      rows.push('<div class="xk-yun-row xk-yue-double-xiong"><b class="xk-yun-lbl xk-nian-xiong">年月双凶</b>'
        + dirChips(ov.doubleXiongDirs, 'xk-nian-sha')
        + '<span class="xk-yun-sub dim">（年月同宫均2/5）</span></div>');
    }
    if (ov.doubleJiDirs.length) {
      rows.push('<div class="xk-yun-row"><b class="xk-yun-lbl xk-yun-lbl-sheng">年月双吉</b>'
        + dirChips(ov.doubleJiDirs, 'xk-nian-ji') + '</div>');
    }
    return '<div class="xk-yun-block">'
      + '<div class="xk-yun-hd">月盘速览 <span class="dim">（' + mLabel + '）</span></div>'
      + rows.join('')
      + '<p class="xk-note dim" style="font-size:10px">出处：清末沈竹礽<span class="cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span>约1891年·月紫白论</p>'
      + '</div>';
  }

  // v2-P46: 年月宅三盘叠合速览卡（buildXkTriplateSummary·宅盘五黄/当运旺方 × 年月紫白叠合）
  // 出处：清末沈竹礽《沈氏玄空学》约1891年（待核实P46-C1·三盘叠合章节）
  // 铁律①：同(chart,year,monthIdx)恒同输出；铁律③：显示「App 不断言」
  // 数值算例（九运·午向S·yun=9·2026·午月monthIdx=4）：
  //   宅向星N=9·S=8·NW=5（NW=五黄）；宅山星S=9·SW=2
  //   tripleXiongDirs=['NW']（宅fac=5·年=2·月=5·三重叠凶）
  //   tripleWangDirs=[]（N:宅旺+月催旺 BUT ∉年催旺；三盘共旺本例不可达）
  //   zhaiWuhuangDirs=['NW']；zhaiWangDirs=['N','S']
  function buildXkTriplateSummary(chart, year, monthIdx) {
    if (!chart || !year || monthIdx == null || !C.xkTriplateOverview) return '';
    var ov = C.xkTriplateOverview(chart, year, monthIdx);
    if (!ov) return '';
    var DIR_ZH = {N:'北',NE:'东北',E:'东',SE:'东南',S:'南',SW:'西南',W:'西',NW:'西北'};
    function dirChips(dirs, cls) {
      if (!dirs || !dirs.length) return '<span class="xk-yun-none dim">—</span>';
      return dirs.map(function(d) {
        return '<span class="xk-yun-chip ' + cls + '">' + (DIR_ZH[d] || d) + '</span>';
      }).join('');
    }
    var rows = [];
    if (ov.tripleXiongDirs.length) {
      rows.push('<div class="xk-yun-row xk-tri-triple-xiong"><b class="xk-yun-lbl xk-nian-xiong">三重凶方</b>'
        + dirChips(ov.tripleXiongDirs, 'xk-nian-sha')
        + '<span class="xk-yun-sub dim">（宅五黄+年凶+月凶）</span></div>');
    }
    if (ov.tripleWangDirs.length) {
      rows.push('<div class="xk-yun-row xk-tri-triple-wang"><b class="xk-yun-lbl xk-yun-lbl-wang">三盘旺方</b>'
        + dirChips(ov.tripleWangDirs, 'xk-yun-fac')
        + '<span class="xk-yun-sub dim">（宅当运+年催旺+月催旺）</span></div>');
    }
    if (ov.doubleXiongDirs.length) {
      rows.push('<div class="xk-yun-row"><b class="xk-yun-lbl xk-nian-xiong">年月双凶</b>'
        + dirChips(ov.doubleXiongDirs, 'xk-nian-sha')
        + '<span class="xk-yun-sub dim">（年月均2/5·同P45）</span></div>');
    }
    if (ov.doubleJiDirs.length) {
      rows.push('<div class="xk-yun-row"><b class="xk-yun-lbl xk-yun-lbl-sheng">年月双吉</b>'
        + dirChips(ov.doubleJiDirs, 'xk-nian-ji')
        + '</div>');
    }
    if (ov.zhaiWuhuangDirs.length) {
      rows.push('<div class="xk-yun-row"><b class="xk-yun-lbl xk-nian-xiong">宅五黄方</b>'
        + dirChips(ov.zhaiWuhuangDirs, 'xk-nian-sha')
        + '<span class="xk-yun-sub dim">（山星或向星=5·廉贞）</span></div>');
    }
    if (ov.zhaiWangDirs.length) {
      rows.push('<div class="xk-yun-row"><b class="xk-yun-lbl xk-yun-lbl-wang">宅旺方</b>'
        + dirChips(ov.zhaiWangDirs, 'xk-yun-fac')
        + '<span class="xk-yun-sub dim">（山星或向星=运数' + ov.yun + '）</span></div>');
    }
    if (!rows.length) {
      rows.push('<div class="xk-yun-row"><span class="dim">本期宅年月三盘无特殊叠合</span></div>');
    }
    return '<div class="xk-yun-block">'
      + '<div class="xk-yun-hd">三盘叠合速览 <span class="dim">（宅/年/月·' + year + '年）</span></div>'
      + rows.join('')
      + '<p class="xk-note dim" style="font-size:10px">出处：清末沈竹礽<span class="cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span>约1891年·三盘叠合</p>'
      + '</div>';
  }

  // v2-P3: 受气元运（CODEX-REVIEW.md 必修2）
  // rcvYear: 宅盘受气年（建造/入伙年）；null则用当日年（流年）
  // 立春切年由 xkGetYun 内部处理（现按公历年，精确版需配合八字排盘的立春时刻）
  const YUN_NAMES = {1:'坎·一白',2:'坤·二黑',3:'震·三碧',4:'巽·四绿',
    5:'廉贞·五黄',6:'乾·六白',7:'兑·七赤',8:'艮·八白',9:'离·九紫'};
  // v2-P23: 卦名（含五行），用于 XK 面板动态年运注释；同 floorplan.js XK_GUANAME_FP
  // 出处：清·沈竹礽《沈氏玄空学》约1891年；锚点1864甲子年，每运20年
  const YUN_GUA = {1:'坎水',2:'坤土',3:'震木',4:'巽木',5:'廉贞土',6:'乾金',7:'兑金',8:'艮土',9:'离火'};
  function yunZh(yun) { return YUN_NAMES[yun] || ('第' + yun + '运'); }

  function buildXkForHeading(facingDeg, rcvYear, monthIdx) {
    const year = (rcvYear && rcvYear >= 1864 && rcvYear <= 2100) ? rcvYear : new Date().getFullYear();
    const yun  = C.xkGetYun(year);
    const result24 = C.xkComputeXuanKong24(yun, facingDeg);
    const { normal, sub, facingMtn, sittingMtn } = result24;
    const mtnLabel = `${sittingMtn.n}山${facingMtn.n}向`;
    const pat = C.xkChartPattern(normal);
    const mIdx = (monthIdx != null && monthIdx >= 0 && monthIdx <= 11) ? monthIdx : null;
    let html = buildXkGrid(normal, pat, mtnLabel, year, mIdx);
    if (sub) {
      const subPat = C.xkChartPattern(sub);
      html += `<details class="xk-sub-section"><summary>替卦盘（${sub.subLabel}）</summary>`;
      html += buildXkGrid(sub, subPat, sub.subLabel, year, mIdx);
      html += `<p class="xk-note dim">替卦：边山兼向时借邻卦入中；出处同<span class="cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span>替卦章</p></details>`;
    }
    return { chart: normal, pat, html, facingMtn, sittingMtn };
  }

  // ===== 阳宅加点（Phase 2）：交互罗盘 MVP =====
  // 用户在罗盘极坐标系中放置床/门/灶/窗，可拖拽重定位 + 点选朝向；
  // 八宅吉凶判据：《八宅明镜》游年八星法（bazhaiStar 引擎已在 core.js 就绪）。
  function initYangzhaiOverlay() {
    const TYPES = {
      bed:    { ch: '床', fullName: '床位', rule: '床首宜朝吉星方（《阳宅三要》·"主"）' },
      door:   { ch: '门', fullName: '宅门', rule: '门向宜纳吉星气（《阳宅三要》·"门"）' },
      stove:  { ch: '灶', fullName: '厨灶', rule: '灶口宜向吉星方（《阳宅三要》·"灶"）' },
      window: { ch: '窗', fullName: '采光窗', rule: '窗宜朝吉星方纳气（同阳宅纳气原则）' },
    };
    const DIR_LABELS = ['正北','东北','正东','东南','正南','西南','正西','西北'];
    const DIR_DEGS   = [0, 45, 90, 135, 180, 225, 270, 315];

    let markers = [];
    let nextId = 1;
    let addMode = null;
    let selectedId = null;
    let dragState = null; // { id, _moved }
    window._outdoorShaLayers = []; // v2-P4: 室外形煞 Leaflet 图层，解锁时清除

    function saveMarkers() {
      try { localStorage.setItem('yz-markers', JSON.stringify(markers)); } catch(e) {}
    }

    const layer    = $('yangzhai-markers-layer');
    const panel    = $('yangzhai-panel');
    const panelCt  = $('yz-panel-content');
    const hintEl   = $('yangzhai-hint');
    if (!layer || !panel) return;

    // ----- coordinate utilities -----
    function cSize() { const cv = canvas(); return cv ? cv.clientWidth : 340; }

    function compassCenter() {
      const cv = canvas(), pg = $('page-kanyu');
      if (!cv || !pg) return null;
      const cr = cv.getBoundingClientRect(), pr = pg.getBoundingClientRect();
      return { cx: cr.left - pr.left + cr.width / 2, cy: cr.top - pr.top + cr.height / 2 };
    }

    function polarToXY(theta, r) {
      const S = cSize(), R = S / 2 - 4;
      const rad = (theta - heading) * Math.PI / 180;
      const cc = compassCenter();
      if (!cc) return { x: 0, y: 0 };
      return { x: cc.cx + R * r * Math.sin(rad), y: cc.cy - R * r * Math.cos(rad) };
    }

    function clientToPolar(cx, cy) {
      // cx, cy in viewport pixels → {theta°, r} relative to compass
      const cv = canvas(); if (!cv) return null;
      const cr = cv.getBoundingClientRect();
      const S = cSize(), R = S / 2 - 4;
      const dx = cx - (cr.left + cr.width / 2);
      const dy = cy - (cr.top  + cr.height / 2);
      const r = Math.hypot(dx, dy) / R;
      const theta = C.norm(Math.atan2(dx, -dy) * 180 / Math.PI + heading);
      return { theta, r, withinCompass: r <= 0.95 };
    }

    // ----- marker DOM management -----
    function getEl(id) { return layer.querySelector(`[data-yz-id="${id}"]`); }

    function createEl(m) {
      const div = document.createElement('div');
      div.className = 'yz-marker';
      div.dataset.yzId = m.id;
      div.innerHTML = `<span class="yz-icon">${TYPES[m.type].ch}</span><div class="yz-arrow"></div>`;
      layer.appendChild(div);
      if (window.L && L.DomEvent) { L.DomEvent.disableClickPropagation(div); L.DomEvent.disableScrollPropagation(div); }
      bindDragEl(div, m.id);
    }

    function posEl(m) {
      const div = getEl(m.id); if (!div) return;
      const { x, y } = polarToXY(m.theta, m.r);
      div.style.left = x + 'px';
      div.style.top  = y + 'px';
      div.querySelector('.yz-arrow').style.transform = `rotate(${m.facing - heading}deg)`;
      div.classList.toggle('selected', m.id === selectedId);
    }

    function refreshAll() { markers.forEach(posEl); }
    window._yangzhaiUpdatePositions = refreshAll;

    // ----- drag (global handlers registered once) -----
    function bindDragEl(div, id) {
      div.addEventListener('touchstart', e => {
        const t = e.touches[0];
        selectedId = id;
        dragState = { id, cx: t.clientX, cy: t.clientY, _moved: false };
      }, { passive: true });

      div.addEventListener('mousedown', e => {
        selectedId = id;
        dragState = { id, cx: e.clientX, cy: e.clientY, _moved: false };
        e.preventDefault();
      });
    }

    document.addEventListener('touchmove', e => {
      if (!dragState) return;
      e.preventDefault();
      const t = e.touches[0];
      const { cx: sx, cy: sy } = dragState;
      if (!dragState._moved && Math.hypot(t.clientX - sx, t.clientY - sy) > 5) dragState._moved = true;
      if (!dragState._moved) return;
      const p = clientToPolar(t.clientX, t.clientY); if (!p) return;
      const mk = markers.find(m => m.id === dragState.id); if (!mk) return;
      mk.theta = p.theta;
      mk.r = Math.max(0.18, Math.min(p.r, 0.92));
      posEl(mk);
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (!dragState) return;
      if (dragState._moved) { saveMarkers(); }
      else { const mk = markers.find(m => m.id === dragState.id); if (mk) showPanel(mk); }
      dragState = null;
    });

    document.addEventListener('mousemove', e => {
      if (!dragState || !(e.buttons & 1)) return;
      if (!dragState._moved && Math.hypot(e.clientX - dragState.cx, e.clientY - dragState.cy) > 5) dragState._moved = true;
      if (!dragState._moved) return;
      const p = clientToPolar(e.clientX, e.clientY); if (!p) return;
      const mk = markers.find(m => m.id === dragState.id); if (!mk) return;
      mk.theta = p.theta;
      mk.r = Math.max(0.18, Math.min(p.r, 0.92));
      posEl(mk);
    });

    document.addEventListener('mouseup', () => {
      if (!dragState) return;
      if (dragState._moved) { saveMarkers(); }
      else { const mk = markers.find(m => m.id === dragState.id); if (mk) showPanel(mk); }
      dragState = null;
    });

    // ----- add / remove markers -----
    function addMarker(theta, r) {
      const m = { id: nextId++, type: addMode, theta, r: Math.max(0.18, Math.min(r, 0.88)), facing: theta };
      markers.push(m);
      createEl(m);
      posEl(m);
      selectedId = m.id;
      addMode = null;
      hintEl.style.display = 'none';
      updateToolbar();
      showPanel(m);
      saveMarkers();
    }

    function removeMarker(id) {
      const el = getEl(id); if (el) el.remove();
      markers = markers.filter(m => m.id !== id);
      if (selectedId === id) { selectedId = null; panel.classList.remove('shown'); refreshAll(); }
      saveMarkers();
    }

    // ----- info panel -----
    function showPanel(m) {
      selectedId = m.id;
      refreshAll();
      const data = baziFitData();
      const trig = C.trigramAt(m.theta);
      const mtn  = C.mountainAt(m.theta);

      let h = `<div style="font-size:21px;font-weight:700;color:var(--gold);margin:4px 0 2px">${TYPES[m.type].ch} · ${TYPES[m.type].fullName}</div>`;
      h += `<p class="dim" style="font-size:13px;margin-bottom:8px">位于 ${Math.round(m.theta)}° · ${mtn.name}山 · ${trig}宫（五行属${mtn.el}）</p>`;

      if (data) {
        const star  = C.bazhaiStar(data.bz.mingGua, trig);
        const lucky = C.BAZHAI_STARS[star][1];
        const starMeta = C.BAZHAI_STARS[star];
        const col  = lucky ? 'var(--gold)' : 'var(--cinnabar)';
        h += `<div style="padding:9px;background:rgba(0,0,0,.25);border-radius:8px;margin-bottom:9px">`;
        h += `<p style="font-size:15px;color:${col};margin-bottom:4px">${data.bz.mingGua}命 → 此位落「${star}」${lucky ? '✦ 吉' : '✕ 凶'}</p>`;
        h += `<p class="dim" style="font-size:12px">九星属${starMeta[0]}。${TYPES[m.type].rule}。`;
        if (!lucky) h += `宜调整${TYPES[m.type].fullName}位置，移至吉星方位。`;
        h += `</p></div>`;
        // 床头朝向单独判断（《阳宅三要》·"主"：床首宜朝吉星方）
        if (m.type === 'bed') {
          const faceTrig  = C.trigramAt(m.facing);
          const faceStar  = C.bazhaiStar(data.bz.mingGua, faceTrig);
          const faceLucky = C.BAZHAI_STARS[faceStar][1];
          const faceCol   = faceLucky ? 'var(--gold)' : 'var(--cinnabar)';
          h += `<div style="padding:7px 9px;background:rgba(0,0,0,.18);border-radius:7px;margin-bottom:9px">`;
          h += `<p style="font-size:13px;color:${faceCol};margin-bottom:3px">床头朝向 ${Math.round(m.facing)}°（${faceTrig}宫）→「${faceStar}」${faceLucky ? '✦ 吉' : '✕ 凶'}</p>`;
          h += `<p class="dim" style="font-size:11px">床首朝吉星方为宜（<span class="cite-chip" data-cite="yangzhai-anchuang" role="button" tabindex="0">《阳宅三要》·卷下「论安床」</span>）。${faceLucky ? '' : '宜调整床头朝向至吉星方。'}</p></div>`;
        }
        // 8-direction quick-look grid
        h += `<p class="dim" style="font-size:11px;margin-bottom:5px">${data.bz.mingGua}命八方速查（点格可设朝向）：</p>`;
        h += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:10px">`;
        Object.entries(C.TRIGRAMS).forEach(([tri, t]) => {
          const s = C.bazhaiStar(data.bz.mingGua, tri);
          const lk = C.BAZHAI_STARS[s][1];
          const isThis = tri === trig;
          const bg = isThis ? (lk ? 'rgba(201,162,39,.22)' : 'rgba(194,68,40,.22)') : 'rgba(0,0,0,.15)';
          const bc = isThis ? (lk ? 'var(--gold)' : 'var(--cinnabar)') : 'rgba(201,162,39,.15)';
          h += `<div style="text-align:center;padding:5px 2px;border-radius:5px;font-size:11px;`;
          h += `background:${bg};border:1px solid ${bc};cursor:pointer" data-yz-dir="${t.hou}">`;
          h += `<div style="color:${lk ? 'var(--gold)' : 'var(--cinnabar)'}">${t.dir}</div>`;
          h += `<div style="color:var(--paper-dim)">${s.slice(0, 2)}</div></div>`;
        });
        h += `</div>`;
        // 三要联动（门·主·灶三者同时放置时显示）
        const doorMk  = markers.find(x => x.type === 'door');
        const bedMk   = markers.find(x => x.type === 'bed');
        const stoveMk = markers.find(x => x.type === 'stove');
        if (doorMk && bedMk && stoveMk) {
          const doorStar  = C.bazhaiStar(data.bz.mingGua, C.trigramAt(doorMk.theta));
          const bedStar   = C.bazhaiStar(data.bz.mingGua, C.trigramAt(bedMk.theta));
          const stoveStar = C.bazhaiStar(data.bz.mingGua, C.trigramAt(stoveMk.theta));
          const doorOK   = C.BAZHAI_STARS[doorStar][1];
          const bedOK    = C.BAZHAI_STARS[bedStar][1];
          const stoveOK  = C.BAZHAI_STARS[stoveStar][1];
          const okCount  = [doorOK, bedOK, stoveOK].filter(Boolean).length;
          let verdict, vCol;
          if (okCount === 3)        { verdict = '三要俱吉，大吉之局';     vCol = 'var(--gold)'; }
          else if (doorOK && bedOK) { verdict = '门主合命，灶位待调';     vCol = 'var(--gold)'; }
          else if (doorOK)          { verdict = '门合命，主灶待调';        vCol = 'rgba(201,162,39,.7)'; }
          else                      { verdict = '三要欠配，宜综合调整';    vCol = 'var(--cinnabar)'; }
          const houseTrig   = C.trigramAt(doorMk.theta);
          const EAST4 = ['坎', '震', '巽', '离'];
          const houseIsEast = EAST4.includes(houseTrig);
          const matchYZ = houseIsEast === data.bz.isEast;
          h += `<div style="padding:9px;background:rgba(0,0,0,.25);border-radius:8px;margin-bottom:9px;border-left:3px solid ${vCol}">`;
          h += `<p style="font-size:13px;font-weight:700;color:${vCol};margin-bottom:4px">三要联动：${verdict}</p>`;
          h += `<p class="dim" style="font-size:11px">门${doorOK?'✦':'✕'}${doorStar} · 主${bedOK?'✦':'✕'}${bedStar} · 灶${stoveOK?'✦':'✕'}${stoveStar}</p>`;
          h += `<p class="dim" style="font-size:11px">宅向（${houseTrig}宫）属${houseIsEast?'东':'西'}四宅，${data.bz.mingGua}命属${data.bz.isEast?'东':'西'}四命 → ${matchYZ?'宅命相配 ✦':'宅命不配，宜换宅向'}</p>`;
          h += `<p class="dim" style="font-size:10px">出处：清·赵九峰<span class="cite-chip" data-cite="yangzhai-sanyao-zong" role="button" tabindex="0">《阳宅三要》卷一「门乃宅之口，主乃宅之主，灶乃宅之腹」</span></p>`;
          h += `</div>`;
        }
      } else {
        h += `<p class="dim" style="font-size:12px;margin-bottom:10px">排八字后，此处实时显示此位与阁下命卦的吉凶断语（<span class="cite-chip" data-cite="bazhai-dayouniange" role="button" tabindex="0">《八宅明镜》游年八星法</span>）</p>`;
      }

      // 玄空飞星方位判断（Phase 7）：以定盘朝向为宅向，标注该位置的山星/向星旺衰
      const xkFacing = lockedHeading !== null ? lockedHeading : heading;
      try {
        const xk = buildXkForHeading(C.norm(xkFacing));
        const mDir = C.XK_TRIG_DIR[trig]; // 标记所在宫的方位缩写
        if (mDir && xk.chart.mountain[mDir] != null) {
          const mStar = xk.chart.mountain[mDir], fStar = xk.chart.facing[mDir], pStar = xk.chart.period[mDir];
          const yun = xk.chart.yun;
          const mVigor = C.xkStarVigor(mStar, yun), fVigor = C.xkStarVigor(fStar, yun);
          const mCol = mVigor === '当旺' ? 'var(--gold)' : mVigor === '五黄煞' ? 'var(--cinnabar)' : 'var(--paper-dim)';
          const fCol = fVigor === '当旺' ? 'var(--gold)' : fVigor === '五黄煞' ? 'var(--cinnabar)' : 'var(--paper-dim)';
          const src = lockedHeading !== null ? '（以定盘朝向为宅向）' : '（以当前罗盘朝向为宅向）';
          h += `<div style="padding:7px 9px;background:rgba(0,0,0,.2);border-radius:7px;margin-bottom:9px;border-left:3px solid rgba(201,162,39,.3)">`;
          // v2-P23: 动态年运（不硬编码，yun 来自 xk.chart.yun）
          const yunTagInMk = `第${yun}运·${YUN_GUA[yun] || ''}`;
          h += `<p style="font-size:12px;font-weight:700;color:var(--paper-dim);margin-bottom:4px">玄空飞星（${yunTagInMk}）${src}</p>`;
          h += `<p style="font-size:12px;margin-bottom:3px">此位${trig}宫：山星▲<b style="color:${mCol}">${mStar}（${mVigor}）</b>&nbsp;向星▼<b style="color:${fCol}">${fStar}（${fVigor}）</b>&nbsp;运星${pStar}</p>`;
          h += `<p class="dim" style="font-size:10px">山星主人丁·向星主财运 · 宅格局：${xk.pat} · 出处：清·沈竹礽<span class="cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span>约1891年</p>`;
          h += `</div>`;
        }
      } catch (e) { /* 飞星计算失败静默省略 */ }

      // Phase 8: 形煞几何检测（仅宅门，OSM Overpass 浏览器端直调）
      if (m.type === 'door') {
        h += `<div style="margin:4px 0 8px">`;
        h += `<button id="yz-sha-btn" style="width:100%;padding:8px;background:rgba(0,0,0,.3);border:1px solid rgba(201,162,39,.25);border-radius:8px;color:var(--paper);font-size:12px;cursor:pointer;text-align:left">`;
        h += `🧿 检测周边形煞（OSM 地理数据·需先定位）</button>`;
        h += `<div id="yz-sha-result" style="margin-top:5px"></div>`;
        h += `</div>`;
      }

      // Facing direction selector
      h += `<p class="dim" style="font-size:11px;margin-bottom:4px">朝向（${TYPES[m.type].ch}面朝方向）：</p>`;
      h += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:10px">`;
      DIR_LABELS.forEach((lbl, i) => {
        const deg = DIR_DEGS[i];
        const active = Math.abs(C.norm(m.facing - deg + 180) - 180) < 23;
        h += `<button class="yz-dir-btn${active ? ' on' : ''}" data-yz-facing="${deg}">${lbl}</button>`;
      });
      h += `</div>`;
      h += `<button class="yz-del-btn" data-yz-del="${m.id}">删除此标记</button>`;

      panelCt.innerHTML = h;
      panel.classList.add('shown');

      panelCt.querySelectorAll('[data-yz-facing]').forEach(btn => btn.addEventListener('click', () => {
        const mk = markers.find(x => x.id === selectedId); if (!mk) return;
        mk.facing = parseInt(btn.dataset.yzFacing, 10); saveMarkers(); refreshAll(); showPanel(mk);
      }));
      panelCt.querySelectorAll('[data-yz-dir]').forEach(btn => btn.addEventListener('click', () => {
        const mk = markers.find(x => x.id === selectedId); if (!mk) return;
        mk.facing = parseInt(btn.dataset.yzDir, 10); saveMarkers(); refreshAll(); showPanel(mk);
      }));
      panelCt.querySelectorAll('[data-yz-del]').forEach(btn => btn.addEventListener('click', () => {
        removeMarker(parseInt(btn.dataset.yzDel, 10));
      }));

      // Phase 8: 形煞检测按钮（仅宅门）
      const shaBtn = $('yz-sha-btn');
      if (shaBtn) {
        const mk0 = m; // 捕获当前标记，避免异步后 m 变化
        shaBtn.addEventListener('click', async function () {
          if (!window.XingSha) { this.textContent = '形煞模块未加载，请刷新页面'; return; }
          const shaRes = $('yz-sha-result');
          const btn = this;
          btn.disabled = true;
          btn.textContent = '⏳ 获取位置中…';
          try {
            // 优先取地图中心（用户已定位则 = GPS 位置），否则调 Geolocation
            let lat, lng;
            if (window._veinMap) {
              const c = window._veinMap.getCenter();
              lat = c.lat; lng = c.lng;
            } else {
              const pos = await new Promise((res, rej) =>
                navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }));
              lat = pos.coords.latitude; lng = pos.coords.longitude;
            }
            btn.textContent = '📡 查询 OSM 地理数据中…';
            const rs = await window.XingSha.detectAllXingsha(lat, lng, mk0.facing);
            let rh = '';
            if (!rs.length) {
              rh = `<p style="font-size:12px;color:var(--gold);padding:4px 0">✦ 半径 200m 内未检测到明显形煞</p>`;
            } else {
              for (const r of rs) {
                const col = r.severity === '强' ? 'var(--cinnabar)' : 'rgba(200,110,40,.9)';
                rh += `<div style="padding:7px;background:rgba(0,0,0,.2);border-radius:6px;border-left:3px solid ${col};margin-bottom:5px">`;
                rh += `<p style="font-size:12px;color:${col};font-weight:700;margin-bottom:2px">${r.type}${r.modern ? ' ⚠️' : ''}（${r.severity}）</p>`;
                rh += `<p style="font-size:11px;color:var(--paper-dim);margin-bottom:2px">${r.desc}</p>`;
                rh += `<p style="font-size:10px;color:rgba(201,162,39,.4)">${r.source}</p>`;
                rh += `</div>`;
              }
            }
            rh += `<p style="font-size:10px;color:rgba(201,162,39,.35);margin-top:6px">⚠️ = 现代形煞名称（20世纪香港/台湾命名，无明清典籍直接依据）；其余标有古籍出处。</p>`;
            shaRes.innerHTML = rh;
            btn.textContent = '🔄 重新检测';
            btn.disabled = false;
          } catch (e) {
            shaRes.innerHTML = `<p style="font-size:12px;color:var(--cinnabar)">检测失败：${e.message || '请确认网络连接与定位权限'}</p>`;
            btn.textContent = '🧿 检测周边形煞（重试）';
            btn.disabled = false;
          }
        });
      }
    }

    // ----- toolbar -----
    function updateToolbar() {
      document.querySelectorAll('[data-yz-add]').forEach(b =>
        b.classList.toggle('locked', b.dataset.yzAdd === addMode));
    }

    document.querySelectorAll('[data-yz-add]').forEach(btn => btn.addEventListener('click', () => {
      addMode = addMode === btn.dataset.yzAdd ? null : btn.dataset.yzAdd;
      const isFPLocked = fpOverlay && fpOverlay.isLocked() && fpActive;
      hintEl.textContent = addMode
        ? (isFPLocked
            ? `点击户型图，放置「${TYPES[addMode].ch}」（户型图坐标）`
            : `点击罗盘盘面，放置「${TYPES[addMode].ch}」`)
        : '';
      hintEl.style.display = addMode ? '' : 'none';
      updateToolbar();
    }));

    const clrBtn = $('yz-clear');
    if (clrBtn) clrBtn.addEventListener('click', () => {
      const n = markers.length;
      if (n === 0) { toast(tt('toast.no_marks')); return; }        // 无标记不弹框
      if (!confirm(tt('confirm.clear_marks', { n: n }))) return; // 破坏性操作，写明数量
      markers.slice().forEach(m => removeMarker(m.id));
      addMode = null; hintEl.style.display = 'none'; updateToolbar();
    });

    const pClose = $('yz-panel-close');
    if (pClose) pClose.addEventListener('click', () => {
      panel.classList.remove('shown'); selectedId = null; refreshAll();
    });

    if (window.L && L.DomEvent) {
      ['yangzhai-toolbar', 'yangzhai-hint'].forEach(id => {
        const el = $(id); if (el) { L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el); }
      });
    }

    // ===== 查形煞（Phase 8）：F7 路冲煞 + F11 穿心煞 =====
    // 数据：OSM Overpass（浏览器直调，CORS 已实测 2026-06-25）。
    // 算法：C.shaCheckLuChong / C.shaCheckChuanXin（core.js，纯几何确定性）。
    const OVERPASS_EPS = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];
    function fetchOSMRoads(lat, lng, radiusM, onDone, onFail) {
      const q = `[out:json][timeout:12];(way["highway"](around:${radiusM},${lat.toFixed(6)},${lng.toFixed(6)}););out body;>;out skel qt;`;
      let tried = 0;
      function attempt() {
        if (tried >= OVERPASS_EPS.length) { onFail('OSM 数据源均无响应，请检查网络'); return; }
        const ep = OVERPASS_EPS[tried++];
        fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout ? AbortSignal.timeout(14000) : undefined })
          .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
          .then(json => {
            const nodeMap = {};
            (json.elements || []).forEach(el => { if (el.type === 'node') nodeMap[el.id] = { lat: el.lat, lng: el.lon }; });
            const ways = (json.elements || [])
              .filter(el => el.type === 'way' && el.nodes && el.nodes.length >= 2)
              .map(w => ({ id: w.id, tags: w.tags || {}, nodes: w.nodes.map(id => nodeMap[id]).filter(Boolean) }))
              .filter(w => w.nodes.length >= 2);
            onDone(ways);
          }).catch(attempt);
      }
      attempt();
    }

    const shaPanel = $('sha-panel');
    const shaCt   = $('sha-panel-content');

    function showShaResult(luChong, chuanXin, bear) {
      if (!shaCt) return;
      const trig = C.trigramAt(bear), mtn = C.mountainAt(bear);
      let h = `<p class="dim" style="font-size:12px;margin-bottom:10px">门向 ${Math.round(bear)}°（${trig}宫·${mtn.name}山），扫描半径 200 m</p>`;
      let anyFound = false;
      if (luChong.found) {
        anyFound = true;
        const cls = luChong.level === 'strong' ? '' : ' sha-weak';
        h += `<div class="sha-item${cls}"><b>${luChong.name}</b>　${luChong.desc}`;
        h += `<div class="sha-src">出处：${luChong.src}</div></div>`;
      }
      if (chuanXin.found) {
        anyFound = true;
        h += `<div class="sha-item"><b>${chuanXin.name}</b>　${chuanXin.desc}`;
        h += `<div class="sha-src">出处：${chuanXin.src}</div></div>`;
      }
      if (!anyFound) h += `<div class="sha-item sha-clear">✓ 200 m 内未检出路冲煞或穿心煞</div>`;
      h += `<p class="dim" style="font-size:11px;margin-top:8px">阈值为工程经验值，待实地验证。</p>`;
      shaCt.innerHTML = h;
    }

    // v2-P28: SHA综合评估卡（design-target §03「底部综合评估」）
    // F-v2-P28-01: 铁律①确定性：同 shaArr 恒同输出（total/strong/weak → 等级）
    // 铁律②诚实：只报数量+术语，不断言「凶/危险/必有灾」
    // 数值算例：sha=[{severity:'强'},{severity:'弱'}]
    //   → strong=1, weak=1, total=2 → level=2 → HTML含sha-sum-lvl2和"需关注"
    // 数值算例：sha=[] → level=0 → HTML含sha-sum-lvl0和"清朗"
    function buildShaSummary(shaArr) {
      if (!shaArr) return '';
      var strong = shaArr.filter(function(r) { return r.severity === '强'; }).length;
      var weak   = shaArr.filter(function(r) { return r.severity === '弱'; }).length;
      var total  = shaArr.length;
      var level, badge, desc;
      if (total === 0) {
        level = 0; badge = '✓ 形煞清朗'; desc = '200m 范围内未检出明显形煞';
      } else if (strong === 0 && total <= 2) {
        level = 1; badge = '◎ 轻微形煞'; desc = '弱煞 ' + weak + ' 处，影响相对较小';
      } else if (strong === 0) {
        level = 2; badge = '⚡ 需关注'; desc = '弱煞 ' + weak + ' 处，多点共发';
      } else {
        level = strong >= 2 ? 3 : 2;
        badge = level === 3 ? '⚡⚡ 重点关注' : '⚡ 需关注';
        desc = '强煞 ' + strong + ' 处' + (weak > 0 ? '·弱煞 ' + weak + ' 处' : '');
      }
      return '<div class="sha-sum sha-sum-lvl' + level + '">'
        + '<span class="sha-sum-badge">' + badge + '</span>'
        + '<span class="sha-sum-desc">' + desc + '</span>'
        + '</div>';
    }

    const shaBtn = $('yz-sha-btn');
    if (shaBtn) shaBtn.addEventListener('click', () => {
      if (!shaPanel || !shaCt) return;
      panel.classList.remove('shown'); // 关闭阳宅面板
      shaPanel.classList.add('shown');
      shaCt.innerHTML = '<p class="dim" style="text-align:center;padding:14px">正在获取位置并查询周边道路…</p>';
      const bear = lockedHeading !== null ? lockedHeading : heading;
      function run(lat, lng) {
        fetchOSMRoads(lat, lng, 200,
          ways => showShaResult(C.shaCheckLuChong(ways, lat, lng, bear), C.shaCheckChuanXin(ways, lat, lng, bear), bear),
          msg => { shaCt.innerHTML = `<p style="color:var(--cinnabar);padding:10px">${msg}</p>`; }
        );
      }
      if (!navigator.geolocation) { shaCt.innerHTML = '<p style="color:var(--cinnabar)">此设备不支持 GPS 定位</p>'; return; }
      navigator.geolocation.getCurrentPosition(
        p => run(p.coords.latitude, p.coords.longitude),
        () => { shaCt.innerHTML = '<p style="color:var(--cinnabar)">定位失败：请先点「回我」授权位置权限</p>'; }
      );
    });
    const shaPClose = $('sha-panel-close');
    if (shaPClose) shaPClose.addEventListener('click', () => shaPanel.classList.remove('shown'));
    if (window.L && L.DomEvent && shaPanel) {
      L.DomEvent.disableClickPropagation(shaPanel);
      L.DomEvent.disableScrollPropagation(shaPanel);
    }

    // ===== 查砂水（Phase 9）：F13-F18 砂法/水法前端化 =====
    // 砂法：Terrarium 地形高程（自然地表）或 OSM 建筑加权高度（城市模式，自动降级）
    // 水法：OSM 道路来去方向 × 命卦游年吉凶；玉带水（弧形道路凹侧）；水口关锁
    const swPanel = $('sandwater-panel');
    const swCt    = $('sw-panel-content');

    function showSandwaterResult(sandResult, sandMethod, waterRows, jadeBelt, waterLock, mingGuaName, doorBear) {
      if (!swCt) return;
      const trig = C.trigramAt(doorBear), mtn = C.mountainAt(doorBear);
      let h = `<p class="dim" style="font-size:11px;margin:0 0 8px">门向 ${Math.round(doorBear)}°（${trig}宫·${mtn.name}山）／砂法：${sandMethod}</p>`;

      // 砂法四象
      h += `<div class="sw-section"><span class="seal">砂法</span> <span class="dim" style="font-size:12px">${sandResult.score}/${sandResult.maxScore} 护穴</span>`;
      for (const item of sandResult.items) {
        const cls = item.ok === true ? 'sw-good' : item.ok === false ? 'sw-bad' : 'sw-neutral';
        h += `<div class="sw-item ${cls}"><b>${item.label}</b>　${item.text}</div>`;
      }
      h += `<p class="sw-src">${sandResult.src}</p></div>`;

      // 水法
      if (waterRows && waterRows.length) {
        h += `<div class="sw-section"><span class="seal">水法</span> <span class="dim" style="font-size:11px">命卦 ${mingGuaName}</span>`;
        for (const r of waterRows) {
          const cls = r.status === 'good' ? 'sw-good' : r.status === 'bad' ? 'sw-bad' : 'sw-neutral';
          h += `<div class="sw-item ${cls}">${r.text} <span class="dim" style="font-size:11px">（${r.dist} m${r.isPrimary ? '·主干道' : ''}）</span></div>`;
        }
        h += `<p class="sw-src">明·徐善继/徐善述《地理人子须知》卷一（约万历年间1573–1620）；游年吉凶依<span class="cite-chip" data-cite="bazhai-dayouniange" role="button" tabindex="0">《八宅明镜》</span></p></div>`;
      } else if (!mingGuaName) {
        h += `<div class="sw-section"><span class="seal">水法</span><p class="dim" style="font-size:12px;margin:6px 0">请先在「命」页排盘，水法将结合命卦判断来去方位。</p></div>`;
      }

      // 玉带水 + 水口关锁
      if (jadeBelt.found || waterLock.found) {
        h += `<div class="sw-section">`;
        if (jadeBelt.found) {
          h += `<div class="sw-item sw-good">${jadeBelt.text}</div>`;
          h += `<p class="sw-src">${jadeBelt.src}</p>`;
        }
        if (waterLock.found) {
          h += `<div class="sw-item sw-good">${waterLock.text}</div>`;
          h += `<p class="sw-src">${waterLock.src}</p>`;
        }
        h += `</div>`;
      } else {
        h += `<div class="sw-item sw-neutral">300 m 内未检出玉带水或水口关锁格局（路形几何中性）。</div>`;
      }

      swCt.innerHTML = h;
      swPanel.classList.add('shown');

      // v2-P12: 砂水四神叠色 → 户型画布（同步到 FloorplanOverlay 九格）
      // 原理: sandResult.items[i].label → F-v2-P12-01 方位映射 → svgAngle → 9格方向码
      // ok=true→绿, ok=false→琥珀(区别于形煞红), ok=null→蓝灰(龙虎均衡)
      // 出处: 晋·郭璞《葬书》四象护穴原则
      if (fpOverlay && fpOverlay.isLocked && fpOverlay.isLocked()
          && typeof fpOverlay.showSandwaterOverlay === 'function') {
        fpOverlay.showSandwaterOverlay(sandResult.items, doorBear);
      }
    }

    const swBtn = $('yz-sw-btn');
    if (swBtn) swBtn.addEventListener('click', () => {
      if (!window.SandWater) { if (swCt) swCt.innerHTML = '<p style="color:var(--cinnabar);padding:10px">砂水模块未加载，请刷新页面</p>'; return; }
      panel.classList.remove('shown');
      swPanel.classList.add('shown');
      swCt.innerHTML = '<p class="dim" style="text-align:center;padding:14px">⏳ 正在获取位置…</p>';
      const doorBear = lockedHeading !== null ? lockedHeading : heading;

      function runAnalysis(lat, lng) {
        swCt.innerHTML = '<p class="dim" style="text-align:center;padding:14px">📡 查询 OSM 地图数据中（建筑 + 道路）…</p>';
        window.SandWater.fetchBuildingsAndRoads(lat, lng, 300, ({ roads, bldgs }) => {
          // v2-P6: OSM 稀疏降级（GEO-ACCURACY.md §OSM 中国覆盖）
          if (roads.length === 0 && bldgs.length === 0) {
            swCt.innerHTML = '<div style="padding:14px;text-align:center">'
              + '<p style="color:var(--cinnabar);margin-bottom:8px">⚠️ 当地 OSM 数据稀疏，砂法/水法检测不可用</p>'
              + '<p class="dim" style="font-size:11px">说明：OSM 中国建筑数据覆盖有限（约16%城市人口），该区域可能无数据</p></div>';
            return;
          }
          swCt.innerHTML = '<p class="dim" style="text-align:center;padding:14px">🗺 正在采样地形高程…</p>';
          const waterLock = window.SandWater.detectWaterMouthLock(roads, bldgs, lat, lng, doorBear);
          const jadeBelt  = window.SandWater.detectJadeBelt(roads, lat, lng, doorBear);
          const fit = baziFitData ? baziFitData() : null;
          const mingGuaName = fit && fit.bz ? fit.bz.mingGua : null;
          const waterRows = mingGuaName ? window.SandWater.judgeWaterMethod(roads, lat, lng, mingGuaName) : [];

          window.SandWater.sampleElevation4Dir(lat, lng)
            .then(elevs => {
              const hasElev = Object.values(elevs).some(v => v !== null && !isNaN(v));
              const sandResult = hasElev
                ? window.SandWater.judgeSandTerrain(elevs, doorBear)
                : window.SandWater.judgeSandUrban(bldgs, lat, lng, doorBear);
              const method = hasElev ? 'Terrarium 卫星高程' : 'OSM 楼群均高（城市模式）';
              showSandwaterResult(sandResult, method, waterRows, jadeBelt, waterLock, mingGuaName, doorBear);
            })
            .catch(() => {
              const sandResult = window.SandWater.judgeSandUrban(bldgs, lat, lng, doorBear);
              showSandwaterResult(sandResult, 'OSM 楼群均高（城市模式，地形瓦片不可用）', waterRows, jadeBelt, waterLock, mingGuaName, doorBear);
            });
        }, msg => {
          swCt.innerHTML = `<p style="color:var(--cinnabar);padding:10px">${msg}</p>`;
        });
      }

      if (window._veinMap) {
        const c = window._veinMap.getCenter();
        runAnalysis(c.lat, c.lng);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          p => runAnalysis(p.coords.latitude, p.coords.longitude),
          () => { swCt.innerHTML = '<p style="color:var(--cinnabar);padding:10px">定位失败：请先点「回我」授权位置权限</p>'; }
        );
      } else {
        swCt.innerHTML = '<p style="color:var(--cinnabar);padding:10px">此设备不支持 GPS 定位</p>';
      }
    });

    const swPClose = $('sw-panel-close');
    if (swPClose) swPClose.addEventListener('click', () => swPanel.classList.remove('shown'));
    if (window.L && L.DomEvent && swPanel) {
      L.DomEvent.disableClickPropagation(swPanel);
      L.DomEvent.disableScrollPropagation(swPanel);
    }

    // ===== 流年方位（v2-P7）：太岁/三煞/年紫白 =====
    // CODEX-REVIEW.md 必修3：太岁/三煞用24山15°支位，非45°八宫
    // GEO-ACCURACY.md §③ cos(lat) 修正：扇形多边形计算
    // 出处：formulas.md F-LY-01 至 F-LY-05
    const lyPanel = $('ly-panel');
    const lyCt    = $('ly-panel-content');
    window._lyLayers = []; // 地图叠层（太岁/三煞扇形）

    // 清除地图叠层
    function clearLyLayers() {
      const map = window._veinMap;
      (window._lyLayers || []).forEach(l => { try { map.removeLayer(l); } catch (e) { /**/ } });
      window._lyLayers = [];
    }

    // 绘制方位扇形（15°扇面，WGS-84，GEO-ACCURACY.md §③ cos(lat) 修正）
    // 参数：lat/lng=中心，bearDeg=方位角中心，halfDeg=半宽度°，radiusM=半径m
    function drawSector15(lat, lng, bearDeg, halfDeg, radiusM, opts) {
      const map = window._veinMap;
      if (!map) return null; // P16-C2: null guard（initKanyu 未完成时跳过）
      const steps = 10;
      const cosLat = Math.cos(lat * Math.PI / 180); // GEO-ACCURACY.md §③ cos(lat) 修正
      const pts = [[lat, lng]];
      for (let i = -steps; i <= steps; i++) {
        const b = (bearDeg + halfDeg * i / steps) * Math.PI / 180;
        const dLat = radiusM * Math.cos(b) / 111320;
        const dLng = radiusM * Math.sin(b) / (111320 * cosLat);
        pts.push([lat + dLat, lng + dLng]);
      }
      pts.push([lat, lng]);
      const poly = L.polygon(pts, opts).addTo(map);
      window._lyLayers.push(poly);
      return poly;
    }

    // v2-P25: ES5 兼容 tooltip 帮函数（替换 ?.bindTooltip，支持 Android Chrome 67+ / iOS Safari 9+）
    // 出处：MDN Optional chaining，Chrome 80+ 才支持；目标平台含旧 Android 8/9，故用 if-guard 替代
    // 数值验证：addTT(null,'msg') → 无异常；addTT(layer,'msg') → layer.bindTooltip('msg') ✓
    function addTT(lyr, msg, opts) { if (lyr && lyr.bindTooltip) lyr.bindTooltip(msg, opts); }

    // XK_TRIG_DIR 反向查（方位缩写 → 中心角度）
    const LY_DIR_DEG = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

    // 年星名称与颜色
    const LY_STAR_COL = {
      1: '#5489cc', 2: '#8b4513', 3: '#3a7a3a', 4: '#5a9a5a',
      5: '#cc2222', 6: '#b8a060', 7: '#8b6565', 8: '#c8a84b', 9: '#c8504b',
    };

    // v2-P8: 立春切年自动检测（F-v2-P8, CODEX-REVIEW.md 必修2精确化）
    // 用 core.js LICHUN_FEB3 + lyChineseYear，精确到日
    // 说明：_autoLyYear 为页面加载时一次性计算，不在每次 showLiunian 重算（确定性）
    // 数值算例：currentDate=2026-02-03 < 立春Feb4 → _autoLyYear=2025
    const _lyNow = (() => {
      // 读取当前时间（CST, UTC+8）用于立春切年
      // 注：此处 Date 仅用于确定「今天是哪天」，输出对同一天是确定性的
      const d = new Date();
      const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
      const cst   = new Date(utcMs + 8 * 3600000); // CST = UTC+8
      return { y: cst.getFullYear(), m: cst.getMonth() + 1, d: cst.getDate() };
    })();
    const _autoLyYear = C.lyChineseYear(_lyNow.y, _lyNow.m, _lyNow.d);
    // v2-P14: 节月自动检测（F-v2-P14精确版，已录入年份±0天；2031+降级±1-2天）
    // 数值算例：2026-06-25 → 芒种effDay=6(JIEQI_EARLY[4]无2026) → idx=4 午月 ✓
    //           2025-03-05 → 惊蛰effDay=5(JIEQI_EARLY[1]有2025) → idx=1 卯月 ✓
    const _autoMonthIdx = C.lyCurrentMonthIdx(_lyNow.y, _lyNow.m, _lyNow.d);

    // 年份输入器 DOM
    const lyYearInput = $('ly-year-input');
    const lyYearHint  = $('ly-year-hint');
    if (lyYearInput && !lyYearInput.value) lyYearInput.value = _autoLyYear;

    // v2-P10: 月份选择器 DOM（正月=0…腊月=11）
    const lyMonthSel  = $('ly-month-select');
    const lyMonthHint = $('ly-month-hint');
    if (lyMonthSel && lyMonthSel.value === '') lyMonthSel.value = String(_autoMonthIdx);
    // 月份节月名称数组（对应 JIEQI_MONTH 索引）
    const LY_MONTH_NAMES = ['正月(寅)','二月(卯)','三月(辰)','四月(巳)','五月(午)','六月(未)',
                             '七月(申)','八月(酉)','九月(戌)','十月(亥)','十一月(子)','腊月(丑)'];

    // 元运名称（第N运·卦名）用于动态显示
    const YUN_NAMES_LY = ['','一运','二运','三运','四运','五运','六运','七运','八运','九运'];
    const YUN_GUA_LY   = ['','坎水','坤土','震木','巽木','中宫','乾金','兑金','艮土','离火'];
    function yunNameLy(year) {
      const yun = C.xkGetYun(year);
      const start = 1864 + (yun - 1) * 20;
      return `第${YUN_NAMES_LY[yun]}·${YUN_GUA_LY[yun]}（${start}–${start + 19}）`;
    }

    function showLiunian() {
      const map = window._veinMap;
      if (!map) return;           // P16-C2: null guard（也保护 addLySeal 闭包）
      if (!lyPanel || !lyCt) return;
      panel.classList.remove('shown');
      lyPanel.classList.add('shown');
      clearLyLayers();

      // v2-P8: 从年份输入器读年份；未填则用立春切年自动值
      const yearRaw = lyYearInput ? parseInt(lyYearInput.value, 10) : _autoLyYear;
      const year = (isNaN(yearRaw) || yearRaw < 1864 || yearRaw > 2100) ? _autoLyYear : yearRaw;
      if (lyYearInput) lyYearInput.value = year; // 纠正非法值

      // 立春切年 hint（v2-P8，CODEX-REVIEW.md 必修2）
      const isAutoYear = (year === _autoLyYear);
      const lichunDay  = C.LICHUN_FEB3.has(_lyNow.y) ? 3 : 4;
      if (lyYearHint) {
        if (isAutoYear && _lyNow.m === 2 && _lyNow.d < lichunDay) {
          lyYearHint.textContent = `（${_lyNow.y}年立春前，堪舆仍为${_autoLyYear}年）`;
        } else if (isAutoYear) {
          lyYearHint.textContent = `（立春切年，今日 ${_lyNow.y}/${_lyNow.m}/${_lyNow.d}）`;
        } else {
          lyYearHint.textContent = `（手动查询）`;
        }
      }

      const zhi = C.lyGetZhi(year);
      const tsInfo = C.lyTaiSuiDir(year);
      const sansha = C.lySanSha(year);
      const nianCenter = C.lyNianCenter(year);
      const plate = C.lyNianPlate(year);

      // v2-P10: 月紫白（F-v2-P10-01/02）
      const monthIdxRaw = lyMonthSel ? parseInt(lyMonthSel.value, 10) : _autoMonthIdx;
      const monthIdx = (isNaN(monthIdxRaw) || monthIdxRaw < 0 || monthIdxRaw > 11) ? _autoMonthIdx : monthIdxRaw;
      if (lyMonthSel) lyMonthSel.value = String(monthIdx);
      if (lyMonthHint) {
        lyMonthHint.textContent = (monthIdx === _autoMonthIdx) ? '(当前节月)' : '(手动查询)';
      }
      const monthCenter = C.lyMonthCenter(year, monthIdx);
      const monthPlate  = C.lyMonthPlate(year, monthIdx);

      // v2-P8: 锚点优先级：锁定户型中心 > GPS > 地图中心
      // 出处：STOREYSG-FLOORPLAN-INTEGRATION.md §联动锚点
      let anchor, anchorLabel;
      if (fpOverlay && fpOverlay.isLocked()) {
        const ls = fpOverlay.getLockedState();
        anchor = { lat: ls.anchor.lat, lng: ls.anchor.lng };
        anchorLabel = '户型锁定锚点';
      } else if (window._lastHerePosition) {
        anchor = { lat: window._lastHerePosition.lat, lng: window._lastHerePosition.lng };
        anchorLabel = 'GPS定位';
      } else {
        anchor = { lat: map.getCenter().lat, lng: map.getCenter().lng };
        anchorLabel = '地图中心';
      }
      const radius = 300; // 方位扇形半径（m），城市尺度参考值

      // 绘制太岁扇形（金色，15°宽）
      // v2-P25: addTT 替代 ?.bindTooltip，兼容旧 Android Chrome 67+（ES5 if-guard）
      addTT(drawSector15(anchor.lat, anchor.lng, zhi.deg, 7.5, radius, {
        color: '#c8a84b', fillColor: '#c8a84b', fillOpacity: 0.18, weight: 2,
      }), `太岁 ${zhi.name}山 ${zhi.deg}°`, { direction: 'top' });

      // 绘制岁破扇形（橙色，15°宽）
      const suipoName = C.LY_BRANCHES[(zhi.idx + 6) % 12];
      addTT(drawSector15(anchor.lat, anchor.lng, tsInfo.suipoDeg, 7.5, radius, {
        color: '#d08020', fillColor: '#d08020', fillOpacity: 0.12, weight: 1,
      }), `岁破 ${suipoName}山 ${tsInfo.suipoDeg}°`, { direction: 'top' });

      // 绘制三煞扇形（红色，15°宽）
      sansha.forEach(m => {
        addTT(drawSector15(anchor.lat, anchor.lng, m.deg, 7.5, radius, {
          color: '#c22020', fillColor: '#c22020', fillOpacity: 0.20, weight: 2,
        }), `三煞 ${m.name}山 ${m.deg}°`, { direction: 'top' });
      });

      // 绘制五黄/二黑大扇形（45°宽，年紫白八宫）
      const dirKeys = Object.keys(LY_DIR_DEG);
      dirKeys.forEach(dk => {
        const s = plate[dk];
        if (s === 5) { // 五黄煞（最凶）
          addTT(drawSector15(anchor.lat, anchor.lng, LY_DIR_DEG[dk], 22.5, radius * 1.2, {
            color: '#880000', fillColor: '#880000', fillOpacity: 0.14, weight: 1, dashArray: '6,4',
          }), `五黄煞 ${dk}宫 ${LY_DIR_DEG[dk]}°`, { direction: 'top' });
        } else if (s === 2) { // 二黑病符
          addTT(drawSector15(anchor.lat, anchor.lng, LY_DIR_DEG[dk], 22.5, radius, {
            color: '#704030', fillColor: '#704030', fillOpacity: 0.10, weight: 1, dashArray: '4,4',
          }), `二黑病符 ${dk}宫 ${LY_DIR_DEG[dk]}°`, { direction: 'top' });
        }
      });

      // v2-P10: 月紫白凶方小扇形（半径=0.65×年扇形，颜色更暗，虚线间距更密）
      // 出处：F-v2-P10-02 月紫白飞布；GEO-ACCURACY.md §③ cos(lat) 修正由 drawSector15 内处理
      // 数值算例：radius=300m, mRadius=195m, 2026午月(4)五黄在南(S=180°) 月五黄煞
      const mRadius = Math.round(radius * 0.65);
      dirKeys.forEach(dk => {
        const ms = monthPlate[dk];
        if (ms === 5) {
          addTT(drawSector15(anchor.lat, anchor.lng, LY_DIR_DEG[dk], 22.5, mRadius, {
            color: '#440000', fillColor: '#440000', fillOpacity: 0.12, weight: 1, dashArray: '3,5',
          }), `月五黄煞 ${dk}宫（月紫白·${LY_MONTH_NAMES[monthIdx]}）`, { direction: 'top' });
        } else if (ms === 2) {
          addTT(drawSector15(anchor.lat, anchor.lng, LY_DIR_DEG[dk], 22.5, Math.round(mRadius * 0.9), {
            color: '#3a2010', fillColor: '#3a2010', fillOpacity: 0.09, weight: 1, dashArray: '2,5',
          }), `月二黑病符 ${dk}宫（月紫白·${LY_MONTH_NAMES[monthIdx]}）`, { direction: 'top' });
        }
      });

      // ── v2-P9: 罗盘刻度圈 + 流年凶方印（design-target 04-liunian-fangwei.png）──
      // cos(lat) 修正（GEO-ACCURACY.md §③）
      const cosA = Math.cos(anchor.lat * Math.PI / 180);

      // 罗盘刻度圈：虚线金圈，半径 = 0.82 × sector半径
      // 数值算例：radius=300m, ringR=246m, lat=22.3° → cos(lat)=0.9252（修正经度方向）
      const ringR = Math.round(radius * 0.82);
      window._lyLayers.push(
        L.circle([anchor.lat, anchor.lng], {
          radius: ringR, color: 'rgba(200,168,64,.32)', fill: false,
          weight: 1, dashArray: '3,8',
        }).addTo(map)
      );

      // 8方位刻度文字标签（置于刻度圈上，不遮挡扇形）
      // 公式: dLat = r×cos(b)/111320, dLng = r×sin(b)/(111320×cos(lat))  ← cos(lat) 修正
      const DIR8 = [['北',0],['东北',45],['东',90],['东南',135],
                    ['南',180],['西南',225],['西',270],['西北',315]];
      DIR8.forEach(function(dv) {
        const b = dv[1] * Math.PI / 180;
        const dLat = ringR * Math.cos(b) / 111320;
        const dLng = ringR * Math.sin(b) / (111320 * cosA);
        window._lyLayers.push(
          L.marker([anchor.lat + dLat, anchor.lng + dLng], {
            icon: L.divIcon({
              className: 'ly-dir-lbl-icon',
              html: '<span class="ly-dir-lbl">' + dv[0] + '</span>',
              iconSize: [28, 14],
              iconAnchor: [14, 7],
            }),
            interactive: false,
            zIndexOffset: -20,
          }).addTo(map)
        );
      });

      // ── v2-P21: 24山刻度（design-target.md §04 罗盘刻度圈精化）──
      // 每15°一山；地元卦（isCenter=true）用长刻度+亮标签，其余短刻度+暗标签。
      // 出处：C.XK_MTN24 二十四山数据（core.js，依据《沈氏玄空学》二十四山体系）
      // cos(lat) 修正：同上已声明的 cosA（GEO-ACCURACY.md §③ 必修）。
      // 数值算例：mtn.c=0°(子)，ringR=246m，tickInner=231m，tickOuter=261m
      //   iLat=anchor.lat+231×cos(0)/111320，iLng=anchor.lng（正北方向 ✓）
      // v2-P22（P21-C1）: zoom<15 时 24山标签间距约 7-10px 容易重叠，只渲染刻度线；
      //   zoom>=15 时渲染完整标签；zoomend 事件会触发 showLiunian() 重渲染（见下方绑定）
      if (C && C.XK_MTN24) {
        var tickInner = ringR * 0.94;
        var tickOuter = ringR * 1.06;
        var lblR24    = ringR * 1.14;
        var show24Lbl = (map.getZoom() >= 15); // P22: 阈值=15（P21-C1建议值）
        C.XK_MTN24.forEach(function(mtn) {
          var b24 = mtn.c * Math.PI / 180;
          var tI  = mtn.isCenter ? tickInner * 0.96 : tickInner;
          var tO  = mtn.isCenter ? tickOuter * 1.03 : tickOuter;
          var lR  = mtn.isCenter ? lblR24    * 1.03 : lblR24;
          var iLat24 = anchor.lat + tI * Math.cos(b24) / 111320;
          var iLng24 = anchor.lng + tI * Math.sin(b24) / (111320 * cosA);
          var oLat24 = anchor.lat + tO * Math.cos(b24) / 111320;
          var oLng24 = anchor.lng + tO * Math.sin(b24) / (111320 * cosA);
          window._lyLayers.push(
            L.polyline([[iLat24, iLng24], [oLat24, oLng24]], {
              color:  mtn.isCenter ? 'rgba(200,168,64,.70)' : 'rgba(200,168,64,.35)',
              weight: mtn.isCenter ? 1.5 : 0.8,
              interactive: false,
            }).addTo(map)
          );
          if (show24Lbl) {
            var llLat = anchor.lat + lR * Math.cos(b24) / 111320;
            var llLng = anchor.lng + lR * Math.sin(b24) / (111320 * cosA);
            window._lyLayers.push(
              L.marker([llLat, llLng], {
                icon: L.divIcon({
                  className: 'ly-mtn-lbl-icon',
                  html: '<span class="ly-mtn-lbl' + (mtn.isCenter ? ' ly-mtn-center' : '') + '">'
                      + mtn.n + '</span>',
                  iconSize: [12, 12],
                  iconAnchor: [6, 6],
                }),
                interactive: false,
                zIndexOffset: -30,
              }).addTo(map)
            );
          }
        });
      }

      // 流年凶方印：圆形印章，置于各方位扇形 55% 处
      // 出处：design-target.md §04「红金小印」视觉约定
      // 数值算例：radius=300m, dist=165m, bearDeg=180°, lat=22.3°
      //   dLat = 165×cos(π)/111320 = -0.001482°（正南），dLng≈0 ✓
      function addLySeal(bearDeg, text, bgCol, bdCol) {
        const b   = bearDeg * Math.PI / 180;
        const dist = radius * 0.55;
        const dLat = dist * Math.cos(b) / 111320;
        const dLng = dist * Math.sin(b) / (111320 * cosA);  // cos(lat) 修正
        window._lyLayers.push(
          L.marker([anchor.lat + dLat, anchor.lng + dLng], {
            icon: L.divIcon({
              className: 'ly-seal-icon',
              html: '<div class="ly-seal" style="background:' + bgCol
                  + ';border-color:' + bdCol + '">' + text + '</div>',
              iconSize: [36, 36],
              iconAnchor: [18, 18],
            }),
            interactive: false,
            zIndexOffset: 50,
          }).addTo(map)
        );
      }

      addLySeal(zhi.deg,         '太岁', 'rgba(180,130,20,.90)', '#c8a84b');
      addLySeal(tsInfo.suipoDeg, '岁破', 'rgba(180,60,20,.80)',  '#d04020');
      sansha.forEach(function(m) {
        addLySeal(m.deg,         '三煞', 'rgba(160,20,20,.85)',  '#cc2020');
      });
      dirKeys.forEach(function(dk) {
        if (plate[dk] === 5)
          addLySeal(LY_DIR_DEG[dk], '五黄', 'rgba(120,15,15,.90)', '#880000');
        else if (plate[dk] === 2)
          addLySeal(LY_DIR_DEG[dk], '二黑', 'rgba(90,45,25,.85)',  '#704030');
      });

      // ===== 构建面板内容 =====
      // 天干（取年份配天干：1864甲子，10年周期）
      const GAN10 = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
      const gan = GAN10[((year - 1864) % 10 + 10) % 10];
      let h = `<div class="ly-year-bar">
        <span class="ly-yname">${year}年 ${gan}${zhi.name}</span>
        <span class="ly-ydesc">${yunNameLy(year)}<br>年紫白：${C.LY_STAR_NAMES[nianCenter]}入中·锚点：${anchorLabel}</span>
      </div>`;

      // v2-P9: 凶方速览徽章行（太岁/岁破/三煞/五黄/二黑·快速一览）
      let badgeHtml = '<div class="ly-badge-row">';
      badgeHtml += `<span class="ly-badge" style="background:rgba(200,140,30,.18);border-color:#c8a84b">太岁 ${zhi.name}山</span>`;
      badgeHtml += `<span class="ly-badge" style="background:rgba(194,68,40,.12);border-color:rgba(194,68,40,.7)">岁破 ${suipoName}山</span>`;
      sansha.forEach(m => {
        badgeHtml += `<span class="ly-badge" style="background:rgba(194,68,40,.15);border-color:#c22020">三煞 ${m.name}山</span>`;
      });
      dirKeys.forEach(dk => {
        if (plate[dk] === 5)
          badgeHtml += `<span class="ly-badge" style="background:rgba(140,20,20,.20);border-color:#cc2222">五黄 ${dk}宫</span>`;
        else if (plate[dk] === 2)
          badgeHtml += `<span class="ly-badge" style="background:rgba(100,50,30,.15);border-color:#704030">二黑 ${dk}宫</span>`;
      });
      badgeHtml += '</div>';
      h += badgeHtml;

      // 年紫白九宫格（3×3，以 SVG+九宫方位为序）
      // 九宫格排列：行0=北(NW/N/NE), 行1=中(W/C/E), 行2=南(SW/S/SE)
      const gridDef = [
        [{dir:'NW',label:'乾·西北'},{dir:'N',label:'坎·北'},{dir:'NE',label:'艮·东北'}],
        [{dir:'W', label:'兑·西'},{dir:'C',label:'中宫'},{dir:'E', label:'震·东'}],
        [{dir:'SW',label:'坤·西南'},{dir:'S',label:'离·南'},{dir:'SE',label:'巽·东南'}],
      ];
      h += `<p class="ly-section-title">年紫白九宫（${year}年）</p>`;
      h += '<div class="ly-grid">';
      gridDef.forEach(row => {
        row.forEach(cell => {
          const s = cell.dir === 'C' ? nianCenter : plate[cell.dir];
          const isBad  = C.LY_STAR_BAD.has(s);
          const isGood = C.LY_STAR_GOOD.has(s);
          const isCenter = cell.dir === 'C';
          const cls = isCenter ? 'ly-cell ly-center' : isBad ? 'ly-cell ly-bad' : isGood ? 'ly-cell ly-good' : 'ly-cell';
          const col = LY_STAR_COL[s] || '#c8a84b';
          h += `<div class="${cls}">
            <div class="ly-dir">${cell.label}</div>
            <div class="ly-star" style="color:${col}">${s}</div>
            <div style="font-size:10px;color:var(--paper-dim)">${C.LY_STAR_NAMES[s].replace(/[一二三四五六七八九]/, '')}</div>
          </div>`;
        });
      });
      h += '</div>';

      // v2-P10: 月紫白九宫格（紧凑版，与年盘对比）
      // 出处：F-v2-P10-01 月紫白入中；F-v2-P10-02 月飞布（顺飞通行约定）
      h += `<p class="ly-section-title">月紫白九宫（${year}年·${LY_MONTH_NAMES[monthIdx]}）</p>`;
      h += `<div style="font-size:10px;color:var(--paper-dim);margin:-4px 0 4px;padding:0 2px">月${C.LY_STAR_NAMES[monthCenter]}入中·地图已标注月五黄/二黑内圈虚线扇形</div>`;
      h += '<div class="ly-mgrid">';
      gridDef.forEach(row => {
        row.forEach(cell => {
          const ms = cell.dir === 'C' ? monthCenter : monthPlate[cell.dir];
          const misBad  = C.LY_STAR_BAD.has(ms);
          const misGood = C.LY_STAR_GOOD.has(ms);
          const misCenter = cell.dir === 'C';
          const mcls = misCenter ? 'ly-mgrid-cell m-center' : misBad ? 'ly-mgrid-cell m-bad' : misGood ? 'ly-mgrid-cell m-good' : 'ly-mgrid-cell';
          const mcol = LY_STAR_COL[ms] || '#c8a84b';
          h += `<div class="${mcls}">
            <div style="font-size:9px;color:var(--paper-dim)">${cell.dir === 'C' ? '中' : cell.label.split('·')[0]}</div>
            <div style="font-size:14px;font-weight:700;color:${mcol}">${ms}</div>
          </div>`;
        });
      });
      h += '</div>';
      // 月五黄/二黑快速提示
      let mBadItems = [];
      dirKeys.forEach(dk => {
        if (monthPlate[dk] === 5) mBadItems.push(`月五黄 ${dk}宫`);
        else if (monthPlate[dk] === 2) mBadItems.push(`月二黑 ${dk}宫`);
      });
      if (mBadItems.length) {
        h += `<div class="ly-item" style="background:rgba(80,10,10,.15);border-color:rgba(180,40,40,.3);margin-bottom:4px">
          <span>⚠️</span>
          <span style="font-size:12px"><b>${mBadItems.join('、')}</b><br>
          <span style="font-size:10px;color:var(--paper-dim)">月紫白凶方，地图内圈虚线标注；结合年紫白综合判断</span></span>
        </div>`;
      }
      h += `<p class="ly-src">月紫白出处：<span class="cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span>月星（清末沈竹礽著述，后人整理/增广）；天干阴阳寅月基准·每月递减；顺/逆飞等价</p>`;

      // 太岁/岁破
      h += `<p class="ly-section-title">太岁与岁破</p>`;
      h += `<div class="ly-item ly-taisui">
        <span>🟡</span>
        <span><b>太岁在${zhi.name}山 ${zhi.deg}°</b><br>
        <span style="font-size:11px;color:var(--paper-dim)">地图已标注金色扇形；此方位宜静不宜动土（《协纪辨方书》）</span></span>
      </div>`;
      h += `<div class="ly-item ly-suipo">
        <span>🔶</span>
        <span><b>岁破在${suipoName}山 ${tsInfo.suipoDeg}°</b>（太岁对冲）<br>
        <span style="font-size:11px;color:var(--paper-dim)">地图已标注橙色扇形</span></span>
      </div>`;
      h += `<p class="ly-src">出处：<span class="cite-chip" data-cite="xinji-bianfang" role="button" tabindex="0">《钦定协纪辨方书》</span>卷三·论太岁（清乾隆四年重修，何国宗、梅瑴成编纂）；二十四山15°支位</p>`;

      // 三煞
      h += `<p class="ly-section-title">三煞（${sansha.map(m=>m.name).join('·')}三山）</p>`;
      const ssNames = sansha.map(m => `${m.name}山 ${m.deg}°`).join('、');
      h += `<div class="ly-item ly-sansha">
        <span>⚠️</span>
        <span><b>三煞方位：${ssNames}</b><br>
        <span style="font-size:11px;color:var(--paper-dim)">地图已标注红色扇形；三煞方不可坐向，修造须避（《协纪辨方书》）</span></span>
      </div>`;
      h += `<p class="ly-src">出处：<span class="cite-chip" data-cite="xinji-bianfang" role="button" tabindex="0">《钦定协纪辨方书》</span>卷三（劫煞/灾煞/岁煞，15°三山，乾隆四年重修，何国宗、梅瑴成）；三煞三山以15°支位显示</p>`;

      // 年紫白凶方提示（五黄/二黑）
      let wuhuangDir = '', erbeiDir = '';
      dirKeys.forEach(dk => {
        if (plate[dk] === 5) wuhuangDir = `${dk}宫 ${LY_DIR_DEG[dk]}°`;
        if (plate[dk] === 2) erbeiDir   = `${dk}宫 ${LY_DIR_DEG[dk]}°`;
      });
      h += `<p class="ly-section-title">年紫白凶方</p>`;
      if (wuhuangDir) h += `<div class="ly-item ly-wuhuang">
        <span>🔴</span>
        <span><b>五黄煞在${wuhuangDir}</b>（地图虚线深红扇形）<br>
        <span style="font-size:11px;color:var(--paper-dim)">五黄为年内最凶流年星，此方修造/安床皆宜避；45°八宫精度（年紫白用八宫，非15°）</span></span>
      </div>`;
      if (erbeiDir) h += `<div class="ly-item ly-sansha" style="background:rgba(120,60,30,.12);border-color:rgba(194,68,40,.4)">
        <span>🟠</span>
        <span><b>二黑病符在${erbeiDir}</b>（地图虚线棕色扇形）<br>
        <span style="font-size:11px;color:var(--paper-dim)">主病符，宜减少在此宫停留（年紫白八宫精度）</span></span>
      </div>`;
      h += `<p class="ly-src">年紫白：${C.LY_STAR_NAMES[nianCenter]}入中顺飞</p>`;

      lyCt.innerHTML = h;
      map.setView([anchor.lat, anchor.lng], Math.max(map.getZoom(), 15));
    }

    const lyBtn = $('yz-ly-btn');
    if (lyBtn) lyBtn.addEventListener('click', showLiunian);
    const lyClose = $('ly-panel-close');
    if (lyClose) lyClose.addEventListener('click', () => {
      lyPanel.classList.remove('shown');
      clearLyLayers();
    });
    // v2-P8: 年份输入器事件绑定（立春切年，CODEX-REVIEW.md 必修2）
    // change 事件：用户修改年份后重新计算并渲染
    if (lyYearInput) {
      lyYearInput.addEventListener('change', () => {
        if (lyPanel.classList.contains('shown')) showLiunian();
      });
    }
    // ◀/▶ 步进按钮
    const lyPrev = $('ly-year-prev');
    const lyNext = $('ly-year-next');
    if (lyPrev) lyPrev.addEventListener('click', () => {
      if (!lyYearInput) return;
      const v = parseInt(lyYearInput.value, 10);
      if (!isNaN(v) && v > 1864) { lyYearInput.value = v - 1; showLiunian(); }
    });
    if (lyNext) lyNext.addEventListener('click', () => {
      if (!lyYearInput) return;
      const v = parseInt(lyYearInput.value, 10);
      if (!isNaN(v) && v < 2100) { lyYearInput.value = v + 1; showLiunian(); }
    });
    // v2-P10: 月份选择器事件绑定
    if (lyMonthSel) {
      lyMonthSel.addEventListener('change', () => {
        if (lyPanel && lyPanel.classList.contains('shown')) showLiunian();
      });
    }
    const lyMonthPrev = $('ly-month-prev');
    const lyMonthNext = $('ly-month-next');
    if (lyMonthPrev) lyMonthPrev.addEventListener('click', () => {
      if (!lyMonthSel) return;
      const v = parseInt(lyMonthSel.value, 10);
      lyMonthSel.value = String(((v - 1 + 12) % 12));
      showLiunian();
    });
    if (lyMonthNext) lyMonthNext.addEventListener('click', () => {
      if (!lyMonthSel) return;
      const v = parseInt(lyMonthSel.value, 10);
      lyMonthSel.value = String((v + 1) % 12);
      showLiunian();
    });
    if (window.L && L.DomEvent && lyPanel) {
      L.DomEvent.disableClickPropagation(lyPanel);
      L.DomEvent.disableScrollPropagation(lyPanel);
    }

    // ===== v2-P13: 叠层图例面板 =====
    // 为 BZ/XK/SHA/SW 四个叠层提供可收叠颜色说明，帮助用户理解叠层含义
    // 铁律②诚实：仅说明颜色/规则/出处，不做吉凶断言
    const lgdPanel = $('fp-legend-panel');
    const lgdBtn   = $('yz-fp-legend');
    const lgdClose = $('fp-legend-close');
    if (lgdBtn && lgdPanel) {
      lgdBtn.addEventListener('click', () => {
        lgdPanel.classList.toggle('shown');
      });
    }
    if (lgdClose && lgdPanel) {
      lgdClose.addEventListener('click', () => lgdPanel.classList.remove('shown'));
    }
    if (window.L && L.DomEvent && lgdPanel) {
      L.DomEvent.disableClickPropagation(lgdPanel);
      L.DomEvent.disableScrollPropagation(lgdPanel);
    }
    if (window.L && L.DomEvent && lgdBtn) {
      L.DomEvent.disableClickPropagation(lgdBtn);
    }

    // ===== 户型叠地图（v2.1）：FloorplanOverlay =====
    // 架构: docs/auto/yangzhai-luopan/STOREYSG-FLOORPLAN-INTEGRATION.md
    // 朝向来源: 用户将户型图对齐卫星楼顶轮廓 → 自动读出 WGS-84 真北顺时针方位角
    // GEO-ACCURACY.md §②: 从对齐读出的朝向比浏览器罗盘更稳定（不漂移/不受室内磁场干扰）
    // GEO-ACCURACY.md §③ cos(lat) 修正已在 floorplan.js pxPerM() 内置
    let fpOverlay = null;
    let fpActive  = false;

    // HUD 信息条
    const fpHUD = document.createElement('div');
    fpHUD.id = 'fp-hud';
    fpHUD.style.cssText = 'display:none;position:absolute;bottom:138px;left:50%;'
      + 'transform:translateX(-50%);background:rgba(18,11,0,.88);color:#c8a84b;'
      + 'padding:5px 14px;border-radius:10px;font-size:12px;z-index:510;'
      + 'pointer-events:none;text-align:center;font-family:serif;white-space:nowrap';
    const kanyuPageEl = $('page-kanyu');
    if (kanyuPageEl) kanyuPageEl.appendChild(fpHUD);
    if (window.L && L.DomEvent && fpHUD) L.DomEvent.disableClickPropagation(fpHUD);

    // v2-P49: 接收 zoom 参数以显示室内/室外尺度标识
    // zoom≥17=室内尺度（叠层可见）；zoom<17=室外尺度（仅轮廓）；GEO-ACCURACY.md §⑥ 无额外精度要求
    window._fpUpdateHUD = (rot, mpm, locked, zoom) => {
      // 向导期抽屉是屏上唯一浮层：户型信息进抽屉（提示行/结果卡），浮动 HUD 一律隐去
      if (window._fpWizardActive) { fpHUD.style.display = 'none'; return; }
      const bear  = Math.round(rot);
      const scale = Math.round(1 / mpm);
      const isIn  = (zoom != null && zoom >= 17);
      const zStr  = (zoom != null) ? ('z' + Math.round(zoom)) : '';
      fpHUD.textContent = locked
        ? (isIn
            ? `🔒 室内尺度 · 坐向 ${bear}° · WGS-84 真北顺时针`
            : `🔒 室外尺度${zStr} · 坐向 ${bear}° · 放大 zoom 17+ 查室内叠层`)
        : `户型叠图 · 上方朝向 ${bear}° · 比例约 1:${scale}（拖缩/旋转对齐楼顶）`;
      fpHUD.style.display = '';
    };

    // 「叠户型」= 打开/退出三步向导。户型层不在此创建（在第 1 步「选户型」时入场），
    // 打开即隐右侧阳宅按钮列，屏上只留 地图+户型层+抽屉（见 fpWizardOpen）。
    function fpToggle() {
      if (!window.FloorplanOverlay) { toast(tt('toast.fp_module_missing')); return; }
      if (!window._veinMap)         { toast(tt('toast.enter_kanyu_first')); return; }
      if (!fpActive) {
        fpActive = true;
        $('yz-fp-btn').textContent = '关户型';
        fpWizardOpen();
        fpWizardStep(1);
      } else {
        fpDeactivate();
      }
    }

    // 退出向导：移除户型层、收抽屉、复位 #yz-fp-btn 文案
    function fpDeactivate() {
      fpActive = false;
      if (fpOverlay) { fpOverlay.remove(); fpOverlay = null; }
      fpHUD.style.display = 'none';
      $('yz-fp-btn').textContent = '叠户型';
      window._fpLocked  = false;
      window._fpBearing = null;
      const bBtn2 = $('yz-fp-bazhai');
      if (bBtn2) bBtn2.style.display = 'none';
      fpWizardClose();
    }

    // 第 1 步创建户型层（示例或导入前都需先有层）
    function fpEnsureOverlay() {
      if (fpOverlay) return fpOverlay;
      if (!window.FloorplanOverlay || !window._veinMap) return null;
      fpActive  = true;
      fpOverlay = new window.FloorplanOverlay();
      fpOverlay.addTo(window._veinMap);
      fpOverlay._onTransform = fpWizardSyncAlignHint;
      return fpOverlay;
    }

    // v2-P6: 锁定后 UI 更新（提取为共享函数，供卫星对齐锁定和罗盘 fallback 锁定共用）
    // compassFallback=false : 卫星对齐 WGS-84 真北（最精确）
    // compassFallback='magnetic'    : 罗盘磁北，未校正，误差±2°–5°
    // compassFallback='declination' : 罗盘磁北 + 磁偏角换算 ≈ 近似真北，误差±1°–2°
    //   公式(v2-P50·GEO-ACCURACY.md §②): 真北 ≈ 磁北 + 磁偏角(东偏为正)
    //   数值算例: 上海磁偏角≈-5.7°(西偏), 磁北350°→真北≈344.3°; 24山壬山(337.5-352.5°) ✓
    function fpAfterLock(compassFallback) {
      $('yz-fp-lock').textContent = '解锁户型';
      if (window._fpBearing === null || window._fpBearing === undefined) return;
      var bear = Math.round(window._fpBearing);
      lockedHeading = window._fpBearing;
      $('btn-lock').textContent = '释盘';
      $('btn-lock').classList.add('locked');
      if (compassFx) compassFx.setLocked(true);
      var curMIdx = lyMonthSel && lyMonthSel.value !== '' ? parseInt(lyMonthSel.value, 10) : null;
      var xkResult = buildXkForHeading(C.norm(window._fpBearing), null, curMIdx);
      // v2-P31: 24山坐向精度徽章（facingMtn/sittingMtn 来自 xkComputeXuanKong24）
      // 公式：sitBear = (bear+180)%360；正卦=facing.isCenter&&sitting.isCenter
      // 出处：清·沈竹礽《沈氏玄空学》替卦章；XK_MTN24.isCenter 标注地元卦/边山
      // 算例：bear=180°→午(isCenter=true)·坐子(isCenter=true)→正卦 ✓
      //       bear=190°→丁(isCenter=false)·坐癸(isCenter=false)→兼向 ✓
      var fMtn31 = xkResult.facingMtn;
      var sMtn31 = xkResult.sittingMtn;
      var sitBear31 = Math.round(((bear + 180) % 360 + 360) % 360);
      // 供向导结果卡读取的 24 山名（可能为 null → 结果卡回落到纯角度）
      window._fpLockMtn = { sit: sMtn31 && sMtn31.n, face: fMtn31 && fMtn31.n };
      if (fMtn31 && sMtn31) {
        var isJian31 = !fMtn31.isCenter || !sMtn31.isCenter;
        var jiXiangLbl31 = isJian31
          ? ' <span style="color:#c8a84b;font-size:10px">兼向·有替卦</span>'
          : ' <span style="color:rgba(100,190,80,.85);font-size:10px">正卦</span>';
        // v2-P50: 三种朝向来源的标注（GEO-ACCURACY.md §② 三档精度）
        var compassNote = compassFallback === 'declination'
          ? '罗盘磁北+磁偏角≈近似真北 · 误差±1°–2°'
          : compassFallback
            ? '罗盘磁北 · 误差±2°–5°'
            : 'WGS-84 真北 · 卫星楼顶对齐读出，不依赖罗盘';
        $('lock-zuoxiang').innerHTML = '<b>坐' + sMtn31.n + '山&nbsp;向' + fMtn31.n + '山</b>'
          + jiXiangLbl31
          + '<span class="dim" style="font-size:11px;display:block;margin-top:2px">'
          + compassNote + '</span>';
        $('lock-sub').textContent = '坐' + sMtn31.n + '(' + sitBear31 + '°) 向' + fMtn31.n + '(' + bear + '°)';
      } else {
        $('lock-zuoxiang').textContent = compassFallback === 'declination'
          ? '建筑坐向 ' + bear + '°（磁北+磁偏角≈近似真北 · 误差±1°–2°）'
          : compassFallback
            ? '建筑坐向 ' + bear + '°（罗盘磁北 · 误差±2°–5°）'
            : '建筑坐向 ' + bear + '°（从卫星楼顶对齐读出，WGS-84 真北）';
        $('lock-sub').textContent = '户型已锁定 · 飞星宅向 ' + bear + '°';
      }
      $('lock-reading').innerHTML = compassFallback === 'declination'
        ? '<span style="color:#c8a84b">罗盘+磁偏角</span>——真北 ≈ 磁北 + 磁偏角（东偏为正）· 误差±1°–2°<br>'
          + '<span class="dim" style="font-size:11px">建议：仍优先用卫星楼顶对齐取 WGS-84 真北最准确；磁偏角查询 NOAA WMM2025 计算器。</span>'
        : compassFallback
          ? '<span style="color:var(--cinnabar)">⚠️ 罗盘模式</span>——朝向来自设备磁北，误差±2°–5°<br>'
            + '<span class="dim" style="font-size:11px">建议：输入本地磁偏角可将误差降至±1°–2°；查询 NOAA WMM2025 计算器；或用卫星楼顶对齐取真北。</span>'
          : '<span class="gold">朝向来自卫星对齐</span>——不依赖罗盘，不漂移，不受室内磁场干扰<br>'
            + '<span class="dim" style="font-size:11px">玄空飞星流派建议取真北；此值来自 WGS-84 真北系，无需磁偏角换算。</span>';
      $('lock-xk').innerHTML = xkResult.html;
      // v2-P27: 玄空当运速览卡（design-target §01·底部当运面板）
      var xkYunEl = $('lock-xk-yun');
      if (xkYunEl) { xkYunEl.innerHTML = buildXkYunSummary(xkResult.chart); xkYunEl.style.display = ''; }
      // v2-P44: 年盘飞星速览卡（年紫白对宅盘·催旺/凶/注意/吉星方）
      var xkNianEl = $('lock-xk-nian');
      if (xkNianEl) {
        xkNianEl.innerHTML = buildXkNianSummary(xkResult.chart, new Date().getFullYear());
        xkNianEl.style.display = '';
      }
      // v2-P45: 月盘飞星速览卡（月紫白对宅盘·催旺/凶/注意/吉星方·年月双凶/双吉方）
      var xkYueEl = $('lock-xk-yue');
      if (xkYueEl) {
        if (curMIdx != null) {
          xkYueEl.innerHTML = buildXkYueSummary(xkResult.chart, new Date().getFullYear(), curMIdx);
          xkYueEl.style.display = '';
        } else {
          xkYueEl.innerHTML = '';
          xkYueEl.style.display = 'none';
        }
      }
      // v2-P46: 三盘叠合速览卡（宅五黄/旺方 × 年月紫白·三重凶/双凶/三盘旺方）
      var xkTriEl = $('lock-xk-tri');
      if (xkTriEl) {
        if (curMIdx != null) {
          xkTriEl.innerHTML = buildXkTriplateSummary(xkResult.chart, new Date().getFullYear(), curMIdx);
          xkTriEl.style.display = '';
        } else {
          xkTriEl.innerHTML = '';
          xkTriEl.style.display = 'none';
        }
      }
      // v2-P47: 年月叠煞画布叠色（三重凶/年月双凶/宅五黄/宅旺方默认叠显；需已有月份选择）
      var fpNmsBtn = $('yz-fp-niansha');
      if (C.xkTriplateOverview && xkResult && xkResult.chart && curMIdx != null) {
        var nmOv = C.xkTriplateOverview(xkResult.chart, new Date().getFullYear(), curMIdx);
        if (fpOverlay && fpOverlay.showNianMonthOv) fpOverlay.showNianMonthOv(nmOv);
        if (fpNmsBtn) { fpNmsBtn.textContent = '隐藏年月煞'; fpNmsBtn.style.display = ''; }
      } else {
        if (fpNmsBtn) fpNmsBtn.style.display = 'none';
      }
      // v2-P48: 流年凶方叠层按钮（CODEX-REVIEW 必修3·24山15°弧形）
      var fpLyBtn = $('yz-fp-linian');
      if (fpLyBtn) { fpLyBtn.style.display = ''; fpLyBtn.textContent = '流年凶方'; }
      // 结果进向导抽屉的结果卡（第 3 步）；不再弹独立 #lock-panel（保持抽屉为唯一浮层）。
      // 富文本坐向/飞星/八宅速览仍已写入隐藏的 #lock-panel，可由「定盘」另行查看。
      fpWizardShowResult();
      fpWizardStep(3);

      // v2-P2: 室内八宅九宫格叠色（《八宅明镜》游年八星法）
      var fit2    = baziFitData();
      var mgua2   = fit2 && fit2.bz ? fit2.bz.mingGua : null;
      var baseTri = mgua2 || C.trigramAt(C.norm(window._fpBearing + 180));
      fpOverlay.showBazhai(baseTri);
      var bazhaiBtn = $('yz-fp-bazhai');
      if (bazhaiBtn) { bazhaiBtn.textContent = '隐藏八宅'; bazhaiBtn.style.display = ''; }
      var bzSrc = mgua2 ? '命卦·' + mgua2 + '命' : '宅卦·' + baseTri + '(门向' + Math.round((bear+180)%360) + '°)';
      // v2-P26: 八宅速览卡（design-target §02·底部生气/天医/五鬼位）
      var bzSumEl = $('lock-bz-summary');
      if (bzSumEl) { bzSumEl.innerHTML = buildBzSummary(baseTri); bzSumEl.style.display = ''; }

      // v2-P3: 受气元运 UI（CODEX-REVIEW.md 必修2）
      var rcvRow = $('lock-rcv-row');
      if (rcvRow) rcvRow.style.display = '';
      var rcvInput = $('lock-rcv-year');
      if (rcvInput && !rcvInput.value) rcvInput.value = new Date().getFullYear();
      var curYun = C.xkGetYun(new Date().getFullYear());
      var rcvLabel = $('lock-rcv-yun-label');
      if (rcvLabel) rcvLabel.textContent = '当前 = 第' + curYun + '运（' + yunZh(curYun) + '）';
      var fpXkBtn = $('yz-fp-xk');
      if (fpXkBtn) fpXkBtn.style.display = '';

      var mtnLabel31 = (fMtn31 && sMtn31) ? tt('toast.fp_mtn_label', { s: sMtn31.n, f: fMtn31.n }) : '';
      toast(compassFallback
        ? tt('toast.fp_lock_compass', { label: mtnLabel31, bear: bear, bzSrc: bzSrc })
        : tt('toast.fp_lock_sat', { label: mtnLabel31, bear: bear, bzSrc: bzSrc }));

      // v2-P4: 室外形煞自动扫描
      var geo4 = fpOverlay.getLockedState ? fpOverlay.getLockedState()
               : (fpOverlay.getGeoreference ? fpOverlay.getGeoreference() : null);
      var geo4ctr = geo4 && (geo4.anchor || geo4.center);
      if (geo4ctr) runOutdoorAnalysis(geo4ctr.lat, geo4ctr.lng, C.norm(window._fpBearing));
      applyZoomVisibility();

      // v2-P5: 挂载户型画布标记回调
      fpOverlay._onFPTap = function (xMm, yMm, hitId) {
        if (hitId !== null) { showFPMarkerPanel(hitId); return; }
        if (addMode === null) return;
        var type = addMode; addMode = null;
        hintEl.textContent = ''; hintEl.style.display = 'none';
        updateToolbar();
        var mkId = fpOverlay.addFPMarker(type, xMm, yMm);
        showFPMarkerPanel(mkId);
        toast(tt('toast.placed_marker', { ch: TYPES[type].ch }));
      };
    }

    function fpLockToggle() {
      if (!fpOverlay) return;
      if (!fpOverlay.isLocked()) {
        fpOverlay.lock();
        fpAfterLock(false);
      } else {
        fpOverlay.unlock();
        fpOverlay.hideBazhai();
        fpOverlay.hideXuanKong && fpOverlay.hideXuanKong();
        $('yz-fp-lock').textContent = '锁定户型';
        var bazhaiBtn = $('yz-fp-bazhai');
        if (bazhaiBtn) { bazhaiBtn.style.display = 'none'; bazhaiBtn.textContent = '八宅叠图'; }
        var fpXkBtn = $('yz-fp-xk');
        if (fpXkBtn) { fpXkBtn.style.display = 'none'; fpXkBtn.textContent = '飞星叠图'; }
        var rcvRow = $('lock-rcv-row');
        if (rcvRow) rcvRow.style.display = 'none';
        var bzSumElU = $('lock-bz-summary');
        if (bzSumElU) { bzSumElU.innerHTML = ''; bzSumElU.style.display = 'none'; }
        var xkYunElU = $('lock-xk-yun');
        if (xkYunElU) { xkYunElU.innerHTML = ''; xkYunElU.style.display = 'none'; }
        var xkNianElU = $('lock-xk-nian');
        if (xkNianElU) { xkNianElU.innerHTML = ''; xkNianElU.style.display = 'none'; }
        var xkYueElU = $('lock-xk-yue');
        if (xkYueElU) { xkYueElU.innerHTML = ''; xkYueElU.style.display = 'none'; }
        var xkTriElU = $('lock-xk-tri');
        if (xkTriElU) { xkTriElU.innerHTML = ''; xkTriElU.style.display = 'none'; }
        // v2-P47: 年月叠煞解锁时清除
        if (fpOverlay.hideNianMonthOv) fpOverlay.hideNianMonthOv();
        var fpNmsElU = $('yz-fp-niansha');
        if (fpNmsElU) { fpNmsElU.style.display = 'none'; fpNmsElU.textContent = '年月叠煞'; }
        // v2-P48: 流年凶方解锁时清除
        if (fpOverlay.hideLiuNian) fpOverlay.hideLiuNian();
        var fpLyBtnU = $('yz-fp-linian');
        if (fpLyBtnU) { fpLyBtnU.style.display = 'none'; fpLyBtnU.textContent = '流年凶方'; }
        clearOutdoorLayers();
        var hadFPMk = fpOverlay.getFPMarkers && fpOverlay.getFPMarkers().length > 0;
        if (fpOverlay.clearFPMarkers) fpOverlay.clearFPMarkers();
        if (hadFPMk) toast(tt('toast.fp_unlocked'));
        var hintClr = $('yangzhai-hint');
        if (hintClr) hintClr.textContent = '';
        var lp = $('lock-panel'); if (lp) lp.classList.remove('shown');
        fpWizardStep(2);   // 回到第 2 步·对齐
      }
    }

    const fpBtn       = $('yz-fp-btn');
    const fpLockBtn   = $('yz-fp-lock');
    const fpFileInput = $('yz-fp-file');
    if (fpBtn)     fpBtn.addEventListener('click', fpToggle);
    if (fpLockBtn) fpLockBtn.addEventListener('click', fpLockToggle);

    // 未完成功能旗标（2026-07-04 用户拍板：户型叠图/砂水/形煞识别未打磨完不上线）。
    // 代码保留为隐藏态；开发与 e2e 用 localStorage ff-unfinished=1 恢复入口。
    if (localStorage.getItem('ff-unfinished') !== '1') {
      ['yz-fp-btn', 'yz-sw-btn', 'yz-sha-btn'].forEach(id => {
        const b = $(id); if (b) b.style.display = 'none';
      });
    }

    // ===== 户型叠图·三步向导壳（驱动 FloorplanOverlay；抽屉是屏上唯一浮层） =====
    const fpWiz = $('fp-wizard');
    window._fpWizardActive = false;
    window._fpWizardStep   = 0;
    if (window.L && L.DomEvent && fpWiz) {
      L.DomEvent.disableClickPropagation(fpWiz);
      L.DomEvent.disableScrollPropagation(fpWiz);
    }

    function fpWizardOpen() {
      window._fpWizardActive = true;
      const pk = $('page-kanyu'); if (pk) pk.classList.add('fp-wizard-active');
      if (fpWiz) fpWiz.classList.add('shown');
      fpHUD.style.display = 'none';
    }
    function fpWizardClose() {
      window._fpWizardActive = false;
      const pk = $('page-kanyu'); if (pk) pk.classList.remove('fp-wizard-active');
      if (fpWiz) fpWiz.classList.remove('shown');
    }
    function fpWizardStep(n) {
      window._fpWizardStep = n;
      if (!fpWiz) return;
      fpWiz.querySelectorAll('.fpw-body').forEach(function (b) {
        b.classList.toggle('on', +b.dataset.step === n);
      });
      fpWiz.querySelectorAll('.fpw-dot').forEach(function (d) {
        const s = +d.dataset.s;
        d.classList.toggle('on',   s === n);
        d.classList.toggle('done', s < n);
      });
    }
    // 第 2 步对齐时，把当前图北偏角回显到提示行（拖/旋/缩后由 _onTransform 触发）
    function fpWizardSyncAlignHint() {
      if (!fpWiz || window._fpWizardStep !== 2) return;
      const h = fpWiz.querySelector('.fpw-body[data-step="2"] .fpw-hint');
      if (!h) return;
      const bear = Math.round((((window._fpBearing || 0) % 360) + 360) % 360);
      h.textContent = '拖动户型对齐你家楼顶，再锁定 · 图北偏 ' + bear + '°';
    }
    // 第 3 步结果卡：已锁定 / 图北→卫星真北偏角 / 坐向候选 / 中心坐标（文案不出现 WGS-84）
    function fpWizardShowResult() {
      const el = $('fpw-result');
      if (!el || !fpOverlay || !fpOverlay.isLocked || !fpOverlay.isLocked()) return;
      const ls = fpOverlay.getLockedState() || {};
      const bear = Math.round((((ls.bearing || 0) % 360) + 360) % 360);
      const face = Math.round(((bear + 180) % 360 + 360) % 360);   // 图南 = 向首候选
      const c = ls.anchor || {};
      const mtn = window._fpLockMtn;
      const zx = (mtn && mtn.sit && mtn.face)
        ? '坐<b>' + mtn.sit + '</b>山 · 向<b>' + mtn.face + '</b>山'
        : '向 <b>' + face + '°</b> · 坐 ' + bear + '°';
      const lat = (c.lat != null) ? c.lat.toFixed(5) : '—';
      const lng = (c.lng != null) ? c.lng.toFixed(5) : '—';
      el.innerHTML =
        '<div class="fpw-lock-t">已锁定</div>'
        + '<div class="fpw-kv"><span class="k">图北 → 卫星真北</span><span class="v"><b>+' + bear + '°</b></span></div>'
        + '<div class="fpw-kv"><span class="k">坐向候选</span><span class="v">' + zx + '</span></div>'
        + '<div class="fpw-kv"><span class="k">中心坐标</span><span class="v">' + lat + ', ' + lng + '</span></div>'
        + '<div class="fpw-src">坐向来自卫星真北对齐 · 不依赖罗盘磁北</div>';
    }

    // 把叠层开关（八宅/飞星/年月/流年）迁入结果卡 chips 行；罗盘锁定/磁偏角迁入高级区。
    // appendChild 会保留各按钮既有 addEventListener，故引擎逻辑不动，仅换壳。
    (function fpWizardMount() {
      const chips = $('fpw-chips');
      if (chips) ['yz-fp-bazhai', 'yz-fp-xk', 'yz-fp-niansha', 'yz-fp-linian'].forEach(function (id) {
        const b = $(id); if (b) chips.appendChild(b);
      });
      const advIn = $('fpw-adv-in');
      if (advIn) {
        const cl = $('yz-fp-compass-lock');
        const declRow = $('fp-decl-row');
        if (cl) {
          cl.style.display = '';   // 高级区常驻可用（在折叠 details 内，默认收起）
          if (declRow) advIn.insertBefore(cl, declRow);
          else advIn.appendChild(cl);
        }
      }
    })();

    // ── 第 1 步：选户型 ──
    const fpwExample = $('fpw-example');
    if (fpwExample) fpwExample.addEventListener('click', function () {
      const ov = fpEnsureOverlay();
      if (!ov) { toast(tt('toast.map_not_ready')); return; }
      ov._isExample = true;
      try {
        const mc = window._veinMap.getContainer();
        ov.setDisplayWidthPx(Math.round((mc ? mc.clientWidth : 360) * 0.45));
      } catch (e) { /* 尺寸兜底：保持默认入场宽 */ }
      fpWizardSyncAlignHint();
      fpWizardStep(2);
    });
    const fpwImport = $('fpw-import');
    if (fpwImport) fpwImport.addEventListener('click', function () {
      const ov = fpEnsureOverlay();
      if (!ov) { toast(tt('toast.map_not_ready')); return; }
      const fi = $('yz-fp-file'); if (fi) fi.click();   // 复用既有文件选择（导入成功后 change 回调转第 2 步）
    });

    // ── 第 2 步：对齐工具条 ──
    const fpwBind = function (id, fn) { const b = $(id); if (b) b.addEventListener('click', fn); };
    fpwBind('fpw-rot-m5', function () { if (fpOverlay) fpOverlay.rotateBy(-5); });
    fpwBind('fpw-rot-m1', function () { if (fpOverlay) fpOverlay.rotateBy(-1); });
    fpwBind('fpw-rot-p1', function () { if (fpOverlay) fpOverlay.rotateBy(1);  });
    fpwBind('fpw-rot-p5', function () { if (fpOverlay) fpOverlay.rotateBy(5);  });
    fpwBind('fpw-scale-m', function () { if (fpOverlay) fpOverlay.scaleBy(0.85); });
    fpwBind('fpw-scale-p', function () { if (fpOverlay) fpOverlay.scaleBy(1 / 0.85); });
    fpwBind('fpw-lock', function () { if (fpOverlay && !fpOverlay.isLocked()) fpLockToggle(); });

    // ── 第 3 步：解锁 / 换户型 / 完成 ──
    fpwBind('fpw-unlock', function () { if (fpOverlay && fpOverlay.isLocked()) fpLockToggle(); });
    fpwBind('fpw-rechoose', function () {
      if (fpOverlay && fpOverlay.isLocked()) fpLockToggle();   // 先解锁再撤层
      if (fpOverlay) { fpOverlay.remove(); fpOverlay = null; }
      window._fpBearing = null; window._fpLocked = false;
      fpHUD.style.display = 'none';
      fpWizardStep(1);
    });
    fpwBind('fpw-done', function () {
      // 完成：收起抽屉、恢复右侧阳宅按钮列；已锁定的户型层与叠层保留在地图上
      fpWizardClose();
      const tb = $('yangzhai-toolbar'); if (tb) tb.classList.add('open');
      const yzb = $('btn-yangzhai'); if (yzb) yzb.classList.add('locked');
    });
    fpwBind('fpw-close', function () { fpToggle(); });   // ✕ = 关户型（退出向导 + 撤层）

    // v2-P2: 八宅叠图 切换按钮
    const fpBazhaiBtn = $('yz-fp-bazhai');
    if (fpBazhaiBtn) {
      fpBazhaiBtn.addEventListener('click', function () {
        if (!fpOverlay || !fpOverlay.isLocked()) return;
        // 切换八宅：若 XK 在显示则同步清除其按钮状态
        if (fpOverlay._overlayMode === 'bz') {
          fpOverlay.hideBazhai();
          fpBazhaiBtn.textContent = '八宅叠图';
        } else {
          const fit3   = baziFitData();
          const mgua3  = fit3 && fit3.bz ? fit3.bz.mingGua : null;
          const base3  = mgua3 || C.trigramAt(C.norm(window._fpBearing + 180));
          fpOverlay.showBazhai(base3); // showBazhai 已清除 XK overlay
          fpBazhaiBtn.textContent = '隐藏八宅';
          const fpXkBtn2 = $('yz-fp-xk'); if (fpXkBtn2) fpXkBtn2.textContent = '飞星叠图';
        }
      });
    }

    // v2-P3: 飞星叠图按钮
    // 叠加玄空飞星九宫格（三元龙阴阳顺逆·CODEX-REVIEW.md 必修1；受气元运·必修2）
    // 与八宅叠图互斥；使用 _buildXuanKongGrid 生成的 SVG 覆层
    const fpXkBtn = $('yz-fp-xk');
    if (fpXkBtn) {
      fpXkBtn.addEventListener('click', function () {
        if (!fpOverlay || !fpOverlay.isLocked()) return;
        if (fpOverlay._overlayMode === 'xk') {
          fpOverlay.hideXuanKong();
          fpXkBtn.textContent = '飞星叠图';
        } else {
          // 取受气年（用户输入）；无则用当前年（流年模式）
          const rcvInput = $('lock-rcv-year');
          const rcvYear  = rcvInput && rcvInput.value ? parseInt(rcvInput.value) : null;
          const year     = (rcvYear && rcvYear >= 1864 && rcvYear <= 2100)
                         ? rcvYear : new Date().getFullYear();
          const yun      = C.xkGetYun(year);
          const fpXkMIdx = lyMonthSel && lyMonthSel.value !== '' ? parseInt(lyMonthSel.value, 10) : null;
          const xkResult = buildXkForHeading(C.norm(window._fpBearing), year, fpXkMIdx);
          fpOverlay.showXuanKong(xkResult.chart, yun); // showXuanKong 已清除 BZ overlay
          fpXkBtn.textContent = '隐藏飞星';
          const bzBtn3 = $('yz-fp-bazhai'); if (bzBtn3) bzBtn3.textContent = '八宅叠图';
          const isRcv = rcvYear && rcvYear !== new Date().getFullYear();
          const smN = xkResult.sittingMtn ? xkResult.sittingMtn.n : '';
          const fmN = xkResult.facingMtn  ? xkResult.facingMtn.n  : '';
          toast(tt('toast.fp_xk', { sm: smN, fm: fmN, yun: yun, yunZh: yunZh(yun), rcv: isRcv ? tt('toast.fp_xk_rcv', { year: rcvYear }) : tt('toast.fp_xk_cur') }));
        }
      });
    }

    // v2-P47: 年月叠煞切换按钮
    const fpNmsBtn2 = $('yz-fp-niansha');
    if (fpNmsBtn2) {
      fpNmsBtn2.addEventListener('click', function () {
        if (!fpOverlay || !fpOverlay.isLocked()) return;
        if (fpOverlay._showNianMonth) {
          fpOverlay.hideNianMonthOv();
          fpNmsBtn2.textContent = '年月叠煞';
        } else {
          if (fpOverlay._nianMonthOv) fpOverlay.showNianMonthOv(fpOverlay._nianMonthOv);
          fpNmsBtn2.textContent = '隐藏年月煞';
        }
      });
    }

    // v2-P48: 流年凶方叠图切换按钮（CODEX-REVIEW.md 必修3：太岁/三煞用15°弧形，非45°八宫）
    const fpLyBtn2 = $('yz-fp-linian');
    if (fpLyBtn2) {
      fpLyBtn2.addEventListener('click', function () {
        if (!fpOverlay || !fpOverlay.isLocked()) return;
        if (fpOverlay._showLiuNian) {
          fpOverlay.hideLiuNian();
          fpLyBtn2.textContent = '流年凶方';
        } else {
          const lyIn = $('ly-year-input');
          var lyYr = lyIn && lyIn.value ? parseInt(lyIn.value, 10) : new Date().getFullYear();
          if (isNaN(lyYr) || lyYr < 1864 || lyYr > 2100) lyYr = new Date().getFullYear();
          fpOverlay.showLiuNian(lyYr);
          fpLyBtn2.textContent = '隐藏流年';
          // v2-P54C: 中宫五黄年（如2031·2022·每9年一周期）特殊提示
          // F-v2-P54-01: wuhuangDir=null ↔ 年紫白中宫=5；无方位弧，仅于平面中心绘菱形标注
          // 铁律③：提示仅描述方位事实，不含吉凶断语
          if (fpOverlay._lyData && fpOverlay._lyData.wuhuangDir === null) {
            var hintLyEl = $('yangzhai-hint');
            if (hintLyEl) hintLyEl.textContent = lyYr + '年五黄在中宫（无特定方位弧，已于图面中心标注）';
          }
        }
      });
    }

    // v2-P3: 受气年输入 → 动态更新 lock-panel XK 盘 + 飞星叠图
    // 出处：CODEX-REVIEW.md 必修2·宅盘用受气元运
    const rcvYearInput = $('lock-rcv-year');
    if (rcvYearInput) {
      rcvYearInput.addEventListener('input', function () {
        const yr  = parseInt(rcvYearInput.value);
        const rcvLabel = $('lock-rcv-yun-label');
        if (!isFinite(yr) || yr < 1864 || yr > 2100) {
          if (rcvLabel) rcvLabel.textContent = '（无效年份）';
          return;
        }
        const yun  = C.xkGetYun(yr);
        if (rcvLabel) rcvLabel.textContent = '= 第' + yun + '运（' + yunZh(yun) + '）';
        if (!fpOverlay || !fpOverlay.isLocked() || window._fpBearing == null) return;
        const facingDeg = C.norm(window._fpBearing);
        // 更新 lock-panel 的九宫格（宅盘运）
        const rcvMIdx = lyMonthSel && lyMonthSel.value !== '' ? parseInt(lyMonthSel.value, 10) : null;
        const xkRes = buildXkForHeading(facingDeg, yr, rcvMIdx);
        $('lock-xk').innerHTML = xkRes.html;
        var xkYunElR = $('lock-xk-yun');
        if (xkYunElR) xkYunElR.innerHTML = buildXkYunSummary(xkRes.chart);
        // v2-P44: 年盘速览卡同步更新（宅盘运更新时年盘不变，但保持显示）
        var xkNianElR = $('lock-xk-nian');
        if (xkNianElR) xkNianElR.innerHTML = buildXkNianSummary(xkRes.chart, new Date().getFullYear());
        // v2-P45: 月盘速览卡同步更新
        var xkYueElR = $('lock-xk-yue');
        if (xkYueElR && rcvMIdx != null) {
          xkYueElR.innerHTML = buildXkYueSummary(xkRes.chart, new Date().getFullYear(), rcvMIdx);
        }
        // v2-P46: 三盘叠合速览卡同步更新
        var xkTriElR = $('lock-xk-tri');
        if (xkTriElR && rcvMIdx != null) {
          xkTriElR.innerHTML = buildXkTriplateSummary(xkRes.chart, new Date().getFullYear(), rcvMIdx);
        }
        // v2-P47: 年月叠煞同步更新（受气年变化·宅盘重算·年月叠合重算）
        if (fpOverlay && fpOverlay._showNianMonth && C.xkTriplateOverview && rcvMIdx != null) {
          var nmOvR = C.xkTriplateOverview(xkRes.chart, new Date().getFullYear(), rcvMIdx);
          fpOverlay.showNianMonthOv(nmOvR);
        }
        // 若飞星叠图正在显示，同步更新覆层
        if (fpOverlay._overlayMode === 'xk') {
          fpOverlay.showXuanKong(xkRes.chart, yun);
        }
      });
    }

    if (fpFileInput) fpFileInput.addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f || !fpOverlay) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const err = fpOverlay.importSceneDoc(ev.target.result);
        if (err) { toast(tt('toast.import_fail', { err: err })); return; }
        toast(tt('toast.fp_imported'));
        // 导入成功：入场尺寸对齐视口宽 ~45%，并推进到第 2 步·对齐
        try {
          const mc = window._veinMap && window._veinMap.getContainer();
          if (fpOverlay.setDisplayWidthPx) fpOverlay.setDisplayWidthPx(Math.round((mc ? mc.clientWidth : 360) * 0.45));
        } catch (e2) { /* 尺寸兜底 */ }
        if (typeof fpWizardStep === 'function') { fpWizardSyncAlignHint(); fpWizardStep(2); }
      };
      reader.readAsText(f);
      e.target.value = '';
    });
    if (window.L && L.DomEvent) {
      ['yz-fp-btn', 'yz-fp-lock', 'yz-fp-import-label', 'yz-fp-bazhai', 'yz-fp-xk', 'yz-fp-niansha', 'yz-fp-linian', 'yz-fp-compass-lock'].forEach(id => {
        const el = $(id); if (el) L.DomEvent.disableClickPropagation(el);
      });
    }

    // v2-P6: 罗盘模式 fallback（GEO-ACCURACY.md §② 降级阶梯第2级）
    // 楼顶不可见/影像糊时：用设备罗盘磁北 + GPS锚点直接锁定，跳过卫星楼顶对齐
    // 注意：浏览器仅给磁北（GEO-ACCURACY.md §②），UI 须显示"⚠️ 磁北近似，误差±2°–5°"
    var fpCompassLockBtn = $('yz-fp-compass-lock');
    if (fpCompassLockBtn) {
      fpCompassLockBtn.addEventListener('click', function () {
        if (!fpOverlay) { toast(tt('toast.load_fp_first')); return; }
        if (fpOverlay.isLocked()) { toast(tt('toast.fp_locked_switch')); return; }
        // 朝向: 罗盘磁北（DeviceOrientationEvent，浏览器无法给真北·GEO-ACCURACY.md §②）
        var bear = (typeof heading === 'number' && isFinite(heading)) ? heading : 0;
        // GPS 锚点: 优先用上次定位坐标，降级用地图中心
        var llPos = null, acc = null;
        if (window._lastHerePosition) {
          llPos = { lat: window._lastHerePosition.lat, lng: window._lastHerePosition.lng };
          acc   = window._lastHerePosition.accuracy;
        } else if (window._veinMap) {
          var mc = window._veinMap.getCenter();
          llPos  = { lat: mc.lat, lng: mc.lng };
        }
        if (!llPos) { toast(tt('toast.need_location')); return; }
        // GPS 精度警告（GEO-ACCURACY.md §③ accuracy 驱动降级）
        var hintEl2 = $('yangzhai-hint');
        if (acc && acc > 50) {
          if (hintEl2) hintEl2.textContent = '⚠️ GPS 精度 ' + Math.round(acc) + 'm（>50m），锚点位置仅供参考，建议先手动移动地图对准楼顶';
        } else if (acc && acc > 10) {
          if (hintEl2) hintEl2.textContent = 'GPS 精度 ' + Math.round(acc) + 'm · 罗盘磁北近似，误差±2°–5°';
        }
        // v2-P50: 磁偏角换算（GEO-ACCURACY.md §② 真北 = 磁北 + 磁偏角，东偏为正）
        // 算例: 上海(2026) 磁偏角约-5.7°; 设备磁北=350° → 近似真北=344.3°; 24山壬(337.5°–352.5°)
        // 查询: NOAA WMM2025 计算器 ngdc.noaa.gov/geomag/calculators/magcalc.shtml
        var declInputEl = document.getElementById('fp-decl-deg');
        var declDeg = declInputEl ? (parseFloat(declInputEl.value) || 0) : 0;
        declDeg = Math.max(-30, Math.min(30, declDeg));  // 限制到±30°（全球磁偏角实际范围）
        var trueBear = ((bear + declDeg) % 360 + 360) % 360;
        fpOverlay.lockByBearing(trueBear, llPos.lat, llPos.lng);
        var compassMode = Math.abs(declDeg) < 0.05 ? 'magnetic' : 'declination';
        fpAfterLock(compassMode);  // 'magnetic'→⚠️磁北; 'declination'→✓近似真北
      });
    }

    // ===== v2-P5: 户型画布标记面板 =====
    // 标记位于 SceneDoc mm 坐标系；通过 _lockedState.mmToLL 得真实 WGS-84 坐标
    // 方位角: dx=xMm-cx,dy=yMm-cy → svgBear=atan2(dx,-dy) → geoBear=(svgBear+_rot)%360
    // 显示：八宅游星（《八宅明镜》）+ 玄空飞星旺衰（宅盘向星）
    function showFPMarkerPanel(mkId) {
      if (!fpOverlay || !fpOverlay.isLocked()) return;
      var ls = fpOverlay.getLockedState();
      if (!ls || !ls.mmToLL) return;
      var mk = null;
      fpOverlay.getFPMarkers().forEach(function (m) { if (m.id === mkId) mk = m; });
      if (!mk) return;

      // 方位角: 包围盒中心 → 标记，SVG本地坐标 → 地理方位角
      var markerLL = ls.mmToLL(mk.xMm, mk.yMm);
      var lat0 = ls.anchor.lat, lng0 = ls.anchor.lng;
      var cosLat0 = Math.cos(lat0 * Math.PI / 180);
      var dNorth  = (markerLL.lat - lat0) * 111320;
      var dEast   = (markerLL.lng - lng0) * 111320 * cosLat0;
      var bearing = C.norm(Math.atan2(dEast, dNorth) * 180 / Math.PI);
      var trig = C.trigramAt(bearing);
      var mtn  = C.mountainAt(bearing);

      var data = baziFitData();
      var h = '<div style="font-size:21px;font-weight:700;color:var(--gold);margin:4px 0 2px">'
        + TYPES[mk.type].ch + ' · ' + TYPES[mk.type].fullName + '</div>';
      h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        + '<p class="dim" style="font-size:13px;margin:0">'
        + Math.round(bearing) + '° · ' + mtn.name + '山 · ' + trig + '宫（五行属' + mtn.el + '）<br>'
        + '<span style="font-size:11px">WGS-84: '
        + markerLL.lat.toFixed(5) + '°N, ' + markerLL.lng.toFixed(5) + '°E</span></p>'
        + '<button class="yz-fp-mk-del" data-mkid="' + mkId + '" '
        + 'style="background:rgba(200,50,50,.18);border:1px solid rgba(200,50,50,.35);'
        + 'color:var(--cinnabar);padding:4px 10px;border-radius:6px;font-size:12px;'
        + 'cursor:pointer;white-space:nowrap;flex-shrink:0">删除</button></div>';

      if (data) {
        var star     = C.bazhaiStar(data.bz.mingGua, trig);
        var lucky    = C.BAZHAI_STARS[star][1];
        var starMeta = C.BAZHAI_STARS[star];
        var col      = lucky ? 'var(--gold)' : 'var(--cinnabar)';
        h += '<div style="padding:9px;background:rgba(0,0,0,.25);border-radius:8px;margin-bottom:9px">';
        h += '<p style="font-size:15px;color:' + col + ';margin-bottom:4px">'
          + data.bz.mingGua + '命 → 此位落「' + star + '」' + (lucky ? '✦ 吉' : '✕ 凶') + '</p>';
        h += '<p class="dim" style="font-size:12px">九星属' + starMeta[0] + '。' + TYPES[mk.type].rule;
        if (!lucky) h += ' 宜调整' + TYPES[mk.type].fullName + '位置，移至吉星方位。';
        h += '</p></div>';
      } else {
        h += '<p class="dim" style="font-size:12px;margin-bottom:10px">'
          + '排八字后，此处实时显示此位与命卦的吉凶断语（<span class="cite-chip" data-cite="bazhai-dayouniange" role="button" tabindex="0">《八宅明镜》游年八星法</span>）</p>';
      }

      // 玄空飞星：该宫山星/向星旺衰
      try {
        var xkFacing5 = lockedHeading !== null ? lockedHeading : window._fpBearing;
        if (xkFacing5 !== null && xkFacing5 !== undefined) {
          var xk5  = buildXkForHeading(C.norm(xkFacing5));
          var mDir5 = C.XK_TRIG_DIR && C.XK_TRIG_DIR[trig];
          if (mDir5 && xk5.chart.mountain[mDir5] != null) {
            var mStar5 = xk5.chart.mountain[mDir5], fStar5 = xk5.chart.facing[mDir5];
            var yun5   = xk5.chart.yun;
            var mVig5 = C.xkStarVigor(mStar5, yun5), fVig5 = C.xkStarVigor(fStar5, yun5);
            var mc5 = mVig5 === '当旺' ? 'var(--gold)' : mVig5 === '五黄煞' ? 'var(--cinnabar)' : 'var(--paper-dim)';
            var fc5 = fVig5 === '当旺' ? 'var(--gold)' : fVig5 === '五黄煞' ? 'var(--cinnabar)' : 'var(--paper-dim)';
            h += '<div style="padding:7px 9px;background:rgba(0,0,0,.2);border-radius:7px;'
              + 'margin-bottom:9px;border-left:3px solid rgba(201,162,39,.3)">';
            h += '<p style="font-size:12px;font-weight:700;color:var(--paper-dim);margin-bottom:4px">'
              + '玄空飞星（宅向 ' + Math.round(xkFacing5) + '°）</p>';
            h += '<p style="font-size:12px;margin-bottom:3px">' + trig + '宫：'
              + '山星▲<b style="color:' + mc5 + '">' + mStar5 + '（' + mVig5 + '）</b>&nbsp;'
              + '向星▼<b style="color:' + fc5 + '">' + fStar5 + '（' + fVig5 + '）</b></p>';
            h += '<p class="dim" style="font-size:10px">山星主人丁·向星主财运 · '
              + '出处：清·沈竹礽<span class="cite-chip" data-cite="shenshi-xuankong" role="button" tabindex="0">《沈氏玄空学》</span>约1891年</p></div>';
          }
        }
      } catch (e5) { /* 飞星计算失败静默省略 */ }

      h += '<p class="dim" style="font-size:10px;margin-top:8px">'
        + '标记在户型图画布上（户型图坐标）· 解锁户型时清除 · 可拖移重定位</p>';

      panelCt.innerHTML = h;
      panel.classList.add('shown');

      // 删除按钮
      var delBtn = panelCt.querySelector('.yz-fp-mk-del');
      if (delBtn) {
        delBtn.addEventListener('click', function () {
          fpOverlay && fpOverlay.removeFPMarker(+this.dataset.mkid);
          panel.classList.remove('shown');
        });
      }
    }

    // ===== v2-P4: 室外形煞叠层（锁定户型后自动触发）=====
    // 机制：以 getGeoreference().center（WGS-84）调 XingSha.detectAllXingsha（F7–F11）
    //       → 各形煞源 geo 坐标叠 Leaflet circleMarker + polyline，不进 SceneDoc mm 坐标系
    // 坐标：xingsha.js xy2ll 逆变换（cos(lat) 修正，GEO-ACCURACY.md §③）
    // 降级：Overpass 403（cloud 环境预期）→ 优雅降级显示提示，浏览器端直连可用

    function clearOutdoorLayers() {
      const map = window._veinMap;
      (window._outdoorShaLayers || []).forEach(l => {
        try { if (map) map.removeLayer(l); } catch (e) { /* ignore */ }
      });
      window._outdoorShaLayers = [];
      // v2-P11: 同步清除户型画布形煞向格叠色
      if (fpOverlay && typeof fpOverlay.clearShaOverlay === 'function') {
        fpOverlay.clearShaOverlay();
      }
      // v2-P12: 同步清除户型画布砂水四神叠色
      if (fpOverlay && typeof fpOverlay.clearSandwaterOverlay === 'function') {
        fpOverlay.clearSandwaterOverlay();
      }
    }

    // 缩放级别 ≥ INDOOR_ZOOM 时室内叠层高亮，形煞标注淡化；反之室外形煞高亮
    var INDOOR_ZOOM = 16;

    function applyZoomVisibility() {
      var map = window._veinMap;
      if (!map || !fpOverlay || !fpOverlay.isLocked()) return;
      var z = map.getZoom();
      var isIndoor = z >= INDOOR_ZOOM;
      // 形煞标注：室外高亮，室内淡化
      (window._outdoorShaLayers || []).forEach(function (l) {
        if (l.setStyle) l.setStyle({ opacity: isIndoor ? 0.2 : 0.8, fillOpacity: isIndoor ? 0.15 : 0.55 });
      });
      // 提示（复用 yangzhai-hint 元素）
      var hintEl2 = $('yangzhai-hint');
      if (hintEl2) {
        // v2-P49: 两阶梯提示: zoom≥16形煞淡化; zoom≥17室内SVG叠层可见（INDOOR_ZOOM各自独立）
        hintEl2.textContent = isIndoor
          ? (z >= 17
              ? '室内视角（zoom ' + z + '）：八宅/飞星叠图可见；形煞标注已淡化'
              : '室内视角（zoom ' + z + '）：形煞已淡化；继续放大至 zoom 17 查室内叠图')
          : 'zoom ' + z + ' 室外视角：形煞标注高亮 · 放大至 zoom 17+ 查室内叠图';
      }
    }

    // v2-P24: 形煞→穴位连线在穴位处的 V 形箭头翼点（design-target §03「路冲煞红箭直冲」）
    // 公式：bearFwd=atan2(dEast,dNorth)（WGS-84 真北顺时针 rad）
    //   翼点 = anchor ± 18m × [cos(bearFwd+π±30°), sin()/cosLat]（GEO-ACCURACY.md §③）
    // 数值算例（正北来煞·lat=1.35°·cosLat=0.9997）：
    //   sha.geo=(1.34,103.8) anchor=(1.35,103.8) bearFwd=0°(正北)
    //   wingL: a=150° → dLat=18cos150°/111320=-0.000140°(南) dLng=18sin150°/(111320×0.9997)=+0.000081°(东) ✓
    //   wingR: a=210° → dLat=18cos210°/111320=-0.000140°(南) dLng=18sin210°/(111320×0.9997)=-0.000081°(西) ✓
    function _shaArrowHead(gLat, gLng, aLat, aLng, armM, cosLat) {
      var dNorth  = (aLat - gLat) * 111320;
      var dEast   = (aLng - gLng) * 111320 * cosLat;
      var bearFwd = Math.atan2(dEast, dNorth); // 0=N 顺时针 radians
      var spread  = 30 * Math.PI / 180;        // ±30° 翼角
      function wingPt(sign) {
        var a = bearFwd + Math.PI + sign * spread;
        return [aLat + armM * Math.cos(a) / 111320,
                aLng + armM * Math.sin(a) / (111320 * cosLat)];
      }
      return [wingPt(-1), [aLat, aLng], wingPt(+1)]; // V 形：左翼→尖端(锚点)→右翼
    }

    // runOutdoorAnalysis: 锁定后以真实经纬度扫描周边形煞并叠 Leaflet 图层
    // facingDeg: 宅门朝向（WGS-84 真北顺时针，由 floorplan getGeoreference().facingDeg 读出）
    // 数值验证：oLat=1.3°, lx=50m → geo.lng=oLng+50/(6371000×cos(1.3°)×π/180)=+0.000450° ✓
    async function runOutdoorAnalysis(lat, lng, facingDeg) {
      var map = window._veinMap;
      if (!map || !window.XingSha) return;
      clearOutdoorLayers();

      // 穴位中心金色小圆标记
      var ctrMark = L.circleMarker([lat, lng], {
        radius: 5, color: '#c8a040', fillColor: '#c8a040', fillOpacity: 0.9, weight: 2,
      }).addTo(map);
      ctrMark.bindTooltip('穴位（锁定坐标·WGS-84）', { direction: 'top', permanent: false });
      window._outdoorShaLayers.push(ctrMark);

      var shaCt2 = $('sha-panel-content');
      var shaPanel2 = $('sha-panel');
      if (shaCt2) shaCt2.innerHTML = '<p class="dim" style="text-align:center;padding:10px">⏳ 查询 OSM 形煞数据（Overpass API）…</p>';
      // 向导期不弹形煞面板（保持抽屉为屏上唯一浮层）；扫描照常跑，结果进画布叠层，
      // 完成后经「查形煞」再看面板。结果仍写入隐藏的 #sha-panel-content。
      if (shaPanel2 && !window._fpWizardActive) shaPanel2.classList.add('shown');

      try {
        var sha = await window.XingSha.detectAllXingsha(lat, lng, facingDeg);

        // v2-P24: 渲染各形煞：文字标签(DivIcon) + 实线连线 + V 形箭头（design-target §03 对齐）
        // 原：circleMarker + 虚线 polyline；新：文字标签 + 实线 + 箭头，视觉更清晰
        // cos(lat) 修正：GEO-ACCURACY.md §③，_shaArrowHead 内已含 cosLat 因子
        var cosLat24 = Math.cos(lat * Math.PI / 180);
        sha.forEach(function (r) {
          if (!r.geo) return;
          var col = r.severity === '强' ? '#cc2222' : '#cc7722';

          // 文字标签 DivIcon（在煞源处标注类型名称，替代原 circleMarker）
          var lblHtml = '<div class="sha-map-lbl' + (r.severity === '强' ? ' sha-map-lbl-strong' : '') + '">'
            + (r.modern ? '⚠' : '⚡') + r.type + '</div>';
          var lblMk = L.marker([r.geo.lat, r.geo.lng], {
            icon: L.divIcon({ html: lblHtml, className: 'sha-lbl-icon', iconSize: null, iconAnchor: null }),
            interactive: true,
          }).addTo(map);
          lblMk.bindPopup(
            '<b style="color:' + col + '">' + r.type + (r.modern ? ' ⚠️' : '') + '（' + r.severity + '）</b>'
            + '<br><span style="font-size:12px">' + r.desc + '</span>'
            + '<br><span style="font-size:10px;color:#888">' + r.source + '</span>'
          );

          // 实线连线（形煞源 → 穴位，替代原虚线：更清晰显示威胁方向）
          var ln = L.polyline([[r.geo.lat, r.geo.lng], [lat, lng]], {
            color: col, weight: 2, opacity: 0.72,
          }).addTo(map);

          // V 形箭头（在穴位处，指向穴位，表示形煞威胁来向；cos(lat) 修正已含）
          var arrowPts = _shaArrowHead(r.geo.lat, r.geo.lng, lat, lng, 18, cosLat24);
          var arrowLn = L.polyline(arrowPts, {
            color: col, weight: 2, opacity: 0.88,
          }).addTo(map);

          window._outdoorShaLayers.push(lblMk, ln, arrowLn);
        });

        // 更新形煞面板（复用 sha-panel）
        if (shaCt2) {
          var trig2 = C.trigramAt(facingDeg);
          var mtn2  = C.mountainAt(facingDeg);
          var h2 = '<p class="dim" style="font-size:11px;margin-bottom:8px">'
            + '穴位 ' + lat.toFixed(5) + '°N, ' + lng.toFixed(5) + '°E · 门向 '
            + Math.round(facingDeg) + '°（' + trig2 + '宫·' + mtn2.name + '山）'
            + ' · 朝向基准：WGS-84 真北</p>';
          h2 += buildShaSummary(sha);
          if (!sha.length) {
            // v2-P6: noData flag → OSM 该区域无道路/建筑数据（区别于"有数据但无形煞"）
            if (sha.noData) {
              h2 += '<div class="sha-item sha-weak">⚠️ 当地 OSM 数据稀疏，形煞检测不可用'
                + '<br><span style="font-size:10px">说明：OSM 中国建筑数据覆盖有限（约16%城市人口），该区域可能无数据</span></div>';
            } else {
              h2 += '<div class="sha-item sha-clear">✦ 200m 半径内未检测到明显形煞</div>';
            }
          } else {
            sha.forEach(function (r) {
              var col2 = r.severity === '强' ? 'var(--cinnabar)' : 'rgba(200,110,40,.9)';
              h2 += '<div class="sha-item">';
              h2 += '<p style="font-size:12px;color:' + col2 + ';font-weight:700;margin-bottom:2px">'
                + r.type + (r.modern ? ' ⚠️' : '') + '（' + r.severity + '）</p>';
              h2 += '<p style="font-size:11px;color:var(--paper-dim);margin-bottom:2px">' + r.desc + '</p>';
              h2 += '<p class="sha-src">' + r.source + '</p>';
              h2 += '</div>';
            });
          }
          h2 += '<p class="dim" style="font-size:10px;margin-top:8px">⚠️ = 现代形煞名称（20世纪香港/台湾命名，无明清典籍直接依据）；其余标有古籍出处。<br>判据：道路/建筑几何关系；OSM 数据 © OpenStreetMap (ODbL)</p>';
          shaCt2.innerHTML = h2;
        }
        // v2-P11: 形煞向格叠色 — 将检测结果同步到户型画布
        // 原理：sha[i].lx/ly(局部米坐标·x=东/y=北) → atan2 → WGS-84方位角 → SVG帧角 → 9格方向
        // cos(lat)修正：detectAllXingsha内部 ll2xy/xy2ll 已处理，此处 atan2 纯方向无需再修正
        if (fpOverlay && fpOverlay.isLocked && fpOverlay.isLocked()
            && typeof fpOverlay.showShaOverlay === 'function') {
          fpOverlay.showShaOverlay(sha);  // sha.length===0 时调用亦可，自动清空叠色
        }
        toast(tt('toast.sha_result', { body: sha.length ? tt('toast.sha_count', { n: sha.length }) : tt('toast.sha_none') }));
      } catch (e) {
        if (shaCt2) {
          shaCt2.innerHTML = '<p class="dim" style="text-align:center;padding:10px">'
            + 'OSM 数据获取失败（当前网络可能无法访问地图数据服务，浏览器端可重试）<br>'
            + (e.message || '') + '<br>'
            + '<span style="font-size:10px">说明：OSM 中国建筑数据覆盖有限（约16%城市人口），该区域可能无数据</span></p>';
        }
        toast(tt('toast.sha_query_fail'));
      }
      applyZoomVisibility();
    }

    // 绑定地图缩放事件（window._veinMap 已在 initKanyu 第 1637 行设置，早于本函数调用）
    if (window._veinMap) {
      window._veinMap.on('zoomend', applyZoomVisibility);
      // v2-P22（P21-C1）: 流年面板开着时，zoom 变化后重渲染（24山标签 zoom<15 隐藏→zoom>=15 显现）
      window._veinMap.on('zoomend', function() {
        if (lyPanel && lyPanel.classList.contains('shown')) showLiunian();
      });
    }

    // ----- capture tap for placement (capture phase → intercepts before Leaflet) -----
    const pageEl = $('page-kanyu');
    function onCaptureTap(e) {
      if (addMode === null) return;
      // v2-P5: 户型锁定时手势由 SVG canvas 处理，跳过罗盘极坐标路径
      if (fpOverlay && fpOverlay.isLocked() && fpActive) return;
      const t = e.type === 'touchend' ? (e.changedTouches && e.changedTouches[0]) : e;
      if (!t) return;
      const p = clientToPolar(t.clientX, t.clientY);
      if (!p || !p.withinCompass) return;
      e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
      addMarker(p.theta, p.r);
    }
    pageEl.addEventListener('touchend', onCaptureTap, { capture: true });
    pageEl.addEventListener('click',    onCaptureTap, { capture: true });

    // ----- 恢复上次标记（localStorage 持久化）-----
    try {
      const saved = localStorage.getItem('yz-markers');
      if (saved) {
        const arr = JSON.parse(saved);
        arr.forEach(mk => {
          if (!mk || !mk.type || !TYPES[mk.type]) return;
          mk.id = mk.id || nextId;
          if (mk.id >= nextId) nextId = mk.id + 1;
          markers.push(mk);
          createEl(mk);
          posEl(mk);
        });
      }
    } catch(e) { localStorage.removeItem('yz-markers'); }
  }

  // ===== 八字 =====
  function initBazi() {
    let savedInput = null;
    try { savedInput = JSON.parse(localStorage.getItem('bazi-input') || 'null'); }
    catch (e) { localStorage.removeItem('bazi-input'); }
    const birthSegments = [
      { el: $('bazi-year'), size: 4, min: 1600, max: new Date().getFullYear() },
      { el: $('bazi-month'), size: 2, min: 1, max: 12 },
      { el: $('bazi-day'), size: 2, min: 1, max: 31 },
      { el: $('bazi-hour'), size: 2, min: 0, max: 23 },
      { el: $('bazi-minute'), size: 2, min: 0, max: 59 }
    ];
    function syncBirthDateTime(markInvalid) {
      const values = birthSegments.map(part => part.el.value);
      const complete = values.every((value, index) => value.length === birthSegments[index].size);
      let valid = complete && birthSegments.every((part, index) => {
        const value = +values[index];
        return value >= part.min && value <= part.max;
      });
      if (valid) {
        const y = +values[0], m = +values[1], d = +values[2], h = +values[3], minute = +values[4];
        const check = new Date(y, m - 1, d, h, minute);
        valid = check.getFullYear() === y && check.getMonth() === m - 1 && check.getDate() === d
          && check.getHours() === h && check.getMinutes() === minute;
      }
      $('bazi-datetime').value = valid
        ? `${values[0]}-${values[1]}-${values[2]}T${values[3]}:${values[4]}`
        : '';
      if (markInvalid) birthSegments.forEach((part, index) => {
        const value = part.el.value;
        const numeric = +value;
        part.el.classList.toggle('is-invalid', !!value && (value.length !== part.size || numeric < part.min || numeric > part.max));
      });
      updatePaipanState();
      return valid;
    }
    function setBirthSegments(input) {
      const pad = n => String(n == null ? 0 : n).padStart(2, '0');
      const values = [String(input.year).padStart(4, '0'), pad(input.month), pad(input.day), pad(input.hour), pad(input.minute || 0)];
      birthSegments.forEach((part, index) => {
        part.el.value = values[index];
        part.el.classList.remove('is-invalid');
      });
      syncBirthDateTime(false);
    }
    birthSegments.forEach((part, index) => {
      part.el.addEventListener('input', () => {
        part.el.value = part.el.value.replace(/\D/g, '').slice(0, part.size);
        part.el.classList.remove('is-invalid');
        syncBirthDateTime(false);
        if (part.el.value.length === part.size && birthSegments[index + 1]) {
          requestAnimationFrame(() => { birthSegments[index + 1].el.focus(); birthSegments[index + 1].el.select(); });
        }
      });
      part.el.addEventListener('blur', () => {
        if (part.size === 2 && part.el.value.length === 1) part.el.value = part.el.value.padStart(2, '0');
        syncBirthDateTime(true);
      });
      part.el.addEventListener('keydown', event => {
        if (event.key === 'Backspace' && !part.el.value && birthSegments[index - 1]) {
          birthSegments[index - 1].el.focus();
        }
      });
    });
    $('bazi-datetime-segments').addEventListener('paste', event => {
      const digits = (event.clipboardData && event.clipboardData.getData('text') || '').replace(/\D/g, '');
      if (digits.length < 8) return;
      event.preventDefault();
      const chunks = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8), digits.slice(8, 10) || '00', digits.slice(10, 12) || '00'];
      birthSegments.forEach((part, index) => { part.el.value = chunks[index]; part.el.classList.remove('is-invalid'); });
      syncBirthDateTime(true);
      birthSegments[Math.min(4, Math.floor(Math.min(digits.length, 12) / 2))].el.focus();
    });

    const countrySel = $('bazi-country'), citySel = $('bazi-city');
    const birthPlaces = Array.isArray(window.SinanBirthPlaces) ? window.SinanBirthPlaces : [];
    const placeLabel = item => isEN() ? item.en : item.zh;
    function fillBirthCountries(selected) {
      countrySel.innerHTML = `<option value="">${isEN() ? 'Select country / region' : '选择国家/地区'}</option>`;
      birthPlaces.forEach(country => countrySel.add(new Option(placeLabel(country), country.code)));
      if (selected && birthPlaces.some(country => country.code === selected)) countrySel.value = selected;
    }
    function fillBirthCities(countryCode, selected) {
      const country = birthPlaces.find(item => item.code === countryCode);
      citySel.innerHTML = `<option value="">${isEN() ? 'Select city' : '选择城市'}</option>`;
      citySel.disabled = !country;
      if (!country) return;
      country.cities.forEach(city => citySel.add(new Option(isEN() ? city[2] : city[1], city[0])));
      if (selected && country.cities.some(city => city[0] === selected)) citySel.value = selected;
    }
    function selectedBirthCity() {
      const country = birthPlaces.find(item => item.code === countrySel.value);
      return country && country.cities.find(city => city[0] === citySel.value);
    }
    fillBirthCountries('');
    fillBirthCities('', '');
    countrySel.addEventListener('change', () => {
      fillBirthCities(countrySel.value, '');
      $('bazi-lng').value = '';
    });
    citySel.addEventListener('change', () => {
      const city = selectedBirthCity();
      $('bazi-lng').value = city ? city[3].toFixed(1) : '';
    });
    // 排盘可用性：阳历模式须填生辰才放行（默认置空→灰态）；农历模式选择器恒有值，放行。
    function updatePaipanState() {
      const lunarOn = $('bazi-islunar').checked;
      $('btn-paipan').disabled = !(lunarOn || $('bazi-datetime').value);
    }
    $('bazi-islunar').addEventListener('change', () => {
      const lunarOn = $('bazi-islunar').checked;
      $('bazi-solar-row').style.display = lunarOn ? 'none' : '';
      $('bazi-lunar-row').style.display = lunarOn ? '' : 'none';
      updatePaipanState();
    });
    $('bazi-datetime').addEventListener('input', updatePaipanState);
    updatePaipanState();
    // 农历选择器填充
    const ySel = $('lunar-year'), mSel = $('lunar-month'), dSel = $('lunar-day'), scSel = $('lunar-shichen');
    for (let y = 2026; y >= 1920; y--) ySel.add(new Option(y, y));
    const LY = window.LunarYear, LM = window.LunarMonth;
    function fillDays(y, m) {
      const prev = dSel.value; dSel.innerHTML = '';
      let cnt = 30;
      try { if (LM) cnt = LM.fromYm(y, m).getDayCount(); } catch (e) { cnt = 30; } // 小月 29 天，不再多出不存在的三十
      for (let d = 1; d <= cnt; d++) dSel.add(new Option(d + '日', d));
      if (+prev >= 1 && +prev <= cnt) dSel.value = prev;
    }
    function fillMonths(y) {
      const prev = mSel.value; mSel.innerHTML = '';
      let leap = 0;
      try { if (LY) leap = LY.fromYear(y).getLeapMonth(); } catch (e) { leap = 0; } // 0=无闰
      for (let m = 1; m <= 12; m++) {       // 正月..腊月，闰月（负数值）紧随其月之后
        mSel.add(new Option(m + '月', m));
        if (leap === m) mSel.add(new Option('闰' + m + '月', -m));
      }
      if (Array.prototype.some.call(mSel.options, o => o.value === prev)) mSel.value = prev;
      fillDays(y, +mSel.value);
    }
    ySel.addEventListener('change', () => fillMonths(+ySel.value));
    mSel.addEventListener('change', () => fillDays(+ySel.value, +mSel.value));
    const sc = ['子时 23-01', '丑时 01-03', '寅时 03-05', '卯时 05-07', '辰时 07-09', '巳时 09-11', '午时 11-13', '未时 13-15', '申时 15-17', '酉时 17-19', '戌时 19-21', '亥时 21-23'];
    sc.forEach((s, i) => scSel.add(new Option(s, i)));
    ySel.value = 1995; fillMonths(1995);
    if (Array.prototype.some.call(mSel.options, o => +o.value === 6)) mSel.value = 6;
    fillDays(1995, +mSel.value);
    if (Array.prototype.some.call(dSel.options, o => +o.value === 15)) dSel.value = 15;
    scSel.value = 6;

    // 结果页可随时回来修改：旧盘在成功重排前继续保留，表单完整回填上次输入。
    function populateBaziForm(input) {
      if (!input) return;
      const gender = document.querySelector(`input[name=gender][value="${input.gender === '坤造' ? '坤造' : '乾造'}"]`);
      if (gender) gender.checked = true;
      const lunarOn = !!input.isLunar;
      $('bazi-islunar').checked = lunarOn;
      $('bazi-solar-row').style.display = lunarOn ? 'none' : '';
      $('bazi-lunar-row').style.display = lunarOn ? '' : 'none';
      if (lunarOn) {
        if (Array.prototype.some.call(ySel.options, o => +o.value === +input.year)) ySel.value = input.year;
        fillMonths(+ySel.value);
        if (Array.prototype.some.call(mSel.options, o => +o.value === +input.month)) mSel.value = input.month;
        fillDays(+ySel.value, +mSel.value);
        if (Array.prototype.some.call(dSel.options, o => +o.value === +input.day)) dSel.value = input.day;
        const scIndex = +input.hour === 0 ? 0 : Math.max(0, Math.min(11, Math.round(+input.hour / 2)));
        scSel.value = scIndex;
      } else {
        setBirthSegments(input);
        const hasLng = typeof input.longitude === 'number' && isFinite(input.longitude);
        if ($('bazi-lng')) $('bazi-lng').value = hasLng ? input.longitude : '';
        fillBirthCountries(input.country || '');
        fillBirthCities(input.country || '', input.city || '');
        if ($('bazi-solar-toggle')) $('bazi-solar-toggle').checked = !!(input.solarTime && hasLng);
        const adv = $('bazi-solar-adv'); if (adv) adv.open = !!(input.solarTime || hasLng);
      }
      updatePaipanState();
    }
    if (savedInput) {
      populateBaziForm(savedInput);
      renderBazi(savedInput);
    }
    // 「用当前定位填入」：点击才请求 GPS（复用天文钟惰性授权模式，开屏不弹权限）
    const lngLocateBtn = $('bazi-lng-locate');
    if (lngLocateBtn) lngLocateBtn.addEventListener('click', () => {
      if (!navigator.geolocation) { toast(tt('toast.geo_unsupported')); return; }
      const orig = lngLocateBtn.textContent;
      lngLocateBtn.disabled = true; lngLocateBtn.textContent = '定位中…';
      navigator.geolocation.getCurrentPosition(
        pos => {
          if ($('bazi-lng')) $('bazi-lng').value = Math.round(pos.coords.longitude * 100) / 100;
          countrySel.value = '';
          fillBirthCities('', '');
          lngLocateBtn.disabled = false; lngLocateBtn.textContent = orig;
          const adv = $('bazi-solar-adv'); if (adv) adv.open = true;
        },
        () => { lngLocateBtn.disabled = false; lngLocateBtn.textContent = orig; toast(tt('toast.geo_fail_denied')); },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 864e5 }
      );
    });
    // 结果页「两法异说」chip：复用 diverge 浮层开合（一次性接线）
    const solarDivBtn = $('bazi-solar-diverge-btn'), solarDivPop = $('bazi-solar-diverge-pop');
    if (solarDivBtn && solarDivPop) solarDivBtn.addEventListener('click', () => {
      const open = solarDivPop.hidden;
      solarDivPop.hidden = !open;
      solarDivBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    const editBtn = $('btn-edit-bazi');
    if (editBtn) editBtn.addEventListener('click', () => {
      let input = savedInput;
      try { input = JSON.parse(localStorage.getItem('bazi-input') || 'null') || input; } catch (e) {}
      if (input) populateBaziForm(input);
      $('bazi-result').style.display = 'none';
      $('bazi-form').style.display = '';
      try { $('bazi-form').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      toast(tt('toast.birth_loaded'));
    });

    $('btn-paipan').addEventListener('click', (ev) => {
      spawnRipple(ev);
      const gender = document.querySelector('input[name=gender]:checked').value;
      let input;
      if ($('bazi-islunar').checked) {
        const i = parseInt(scSel.value, 10);
        input = { gender, isLunar: true, year: +ySel.value, month: +mSel.value, day: +dSel.value, hour: i === 0 ? 0 : i * 2, minute: 0 };
      } else {
        const v = $('bazi-datetime').value;
        if (!v) return;
        const dt = new Date(v);
        input = { gender, isLunar: false, year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(), hour: dt.getHours(), minute: dt.getMinutes() };
        // 高级·真太阳时：仅公历输入生效；经度缺省即视同关（不换算）。持久化进 bazi-input，下游 ChartFacts/规则命中跟随所选时刻。
        const solarOn = $('bazi-solar-toggle') && $('bazi-solar-toggle').checked;
        const lngRaw = $('bazi-lng') ? $('bazi-lng').value.trim() : '';
        const lng = lngRaw === '' ? NaN : parseFloat(lngRaw);
        input.longitude = isFinite(lng) ? lng : null;
        input.solarTime = !!(solarOn && input.longitude != null);
        input.country = countrySel.value || null;
        input.city = citySel.value || null;
      }
      localStorage.setItem('bazi-input', JSON.stringify(input));
      savedInput = input;
      renderBazi(input);
      renderToday(); // 排盘后刷新今日页个性化区（bazi-input 已变，绕过同小时缓存）
    });
    $('btn-burn').addEventListener('click', () => {
      if (!confirm(tt('confirm.burn_chart'))) return;
      localStorage.removeItem('bazi-input');
      localStorage.removeItem('bazi-wuxing'); // 焚盘：清五行流光气色，回落金
      localStorage.removeItem('bazi-fav');    // 焚盘：清喜用/忌神，开屏选句回落全池
      savedInput = null;
      $('bazi-result').style.display = 'none';
      $('bazi-form').style.display = '';
      toast(tt('toast.chart_burned'));
      renderToday(); // 焚盘后个性化区回落为去排盘 CTA
    });
  }

  // ===== 古籍论断（RuleKit 命中 → 双声部卡）+ 今日触发 =====
  // 声部宪法：墨面结论行=引擎（then.text），纸面缩略=古人（quote 繁体原字）；出处 chip 走 CitePop 句级锚点。
  // 极性以极小衡符呈现（无红章、负面零动效）；命中 0 或规则库加载失败整卡静默隐藏。
  const CONSEQ_ORDER = ['富贵功名', '婚姻', '子嗣', '六亲祖业', '性情', '寿健', '方位宜忌', '择时宜忌', '中性其他'];
  const CONSEQ_FRIENDLY_ZH = {
    '富贵功名': '事业与成就', '婚姻': '关系与相处', '子嗣': '家庭延续', '六亲祖业': '家庭背景',
    '性情': '性格倾向', '寿健': '身心状态', '方位宜忌': '环境与方位', '择时宜忌': '时间选择', '中性其他': '其他线索'
  };
  const CONSEQ_FRIENDLY_EN = {
    '富贵功名': 'Work & achievement', '婚姻': 'Relationships', '子嗣': 'Family continuity', '六亲祖业': 'Family background',
    '性情': 'Temperament', '寿健': 'Wellbeing', '方位宜忌': 'Place & direction', '择时宜忌': 'Timing', '中性其他': 'Other patterns'
  };
  const POL_MARK = { '2': 'gjl-p2', '1': 'gjl-p1', '0': 'gjl-z', '-1': 'gjl-n1', '-2': 'gjl-n2' };
  const POL_LABEL = { '2': '上吉', '1': '小吉', '0': '平', '-1': '有碍', '-2': '相悖' };
  const COMPASS_PREDS = ['facing_mountain', 'sitting_mountain', 'facing_gua', 'sitting_gua', 'younian_star', 'annual_sha_at'];

  function registerRuleCite(rule) {
    try {
      const s = rule.src; if (!s || !s.book || s.ch == null || s.i == null) return null;
      const key = 'g1:' + s.book + '/' + s.ch + '/' + s.i;
      if (window.CITE_MAP && !window.CITE_MAP[key]) window.CITE_MAP[key] = { book: s.book, ch: s.ch, i: s.i };
      return key;
    } catch (e) { return null; }
  }
  function ruleWeight(r) { return Math.abs(r.polarity || 0) * (r.weight || 0); }
  function shortenText(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }
  function polMark(p) {
    const cls = POL_MARK[String(p)] || 'gjl-z';
    const lab = POL_LABEL[String(p)] || '平';
    return `<span class="gjl-pol ${cls}" title="衡：${lab}" aria-label="衡${lab}"></span>`;
  }
  function friendlyConsequence(cls) {
    return (isEN() ? CONSEQ_FRIENDLY_EN : CONSEQ_FRIENDLY_ZH)[cls] || cls || (isEN() ? 'Other patterns' : '其他线索');
  }
  function plainRuleZh(value) {
    let s = String(value == null ? '' : value).trim();
    if (/^忌倒食[（(]偏印夺食[）)]/.test(s)) {
      return '传统上提醒：直觉与非传统思路过强时，可能压住表达和创造的一面。';
    }
    const phrases = [
      ['精华喜于外泄', '也善于把能力表达出来'],
      ['旺盛', '能量较强'], ['衰弱', '能量偏弱'],
      ['则可为卿相', '传统上会理解为可能承担重要职责'],
      ['可为卿相', '可能承担重要职责'],
      ['祖宗荣华显贵', '家庭背景可能较有资源'],
      ['慷慨聪明', '思路开阔'],
      ['见识过人', '观察力与判断力较强'],
      ['主人', '传统上会解读为：你'],
      ['命主', '你'],
      ['此命', '你的命盘']
    ];
    phrases.forEach(([from, to]) => { s = s.split(from).join(to); });
    const terms = [
      ['偏印', '偏印（直觉与非传统学习）'], ['正印', '正印（学习与支持）'], ['印绶', '印绶（学习与支持）'],
      ['七杀', '七杀（压力与行动力）'], ['正官', '正官（规则与责任）'], ['官星', '官星（责任与事业）'],
      ['伤官', '伤官（表达与突破）'], ['食神', '食神（表达与创造）'],
      ['偏财', '偏财（机会型资源）'], ['正财', '正财（稳定资源）'], ['财星', '财星（资源与现实成果）'],
      ['比劫', '比劫（同伴与竞争）'], ['日干', '日主（代表你自身）']
    ];
    terms.forEach(([from, to]) => { s = s.split(from).join(to); });
    if (/^若/.test(s)) s = s.replace(/^若/, '如果');
    s = s.split('，则').join('，就').split(',则').join('，就');
    s = s.split('预示').join('传统上会解读为');
    if (/^忌/.test(s)) s = s.replace(/^忌/, '传统上提醒留意：');
    if (/^宜/.test(s)) s = s.replace(/^宜/, '传统上认为适合：');
    return s;
  }
  function renderRuleItem(r, cls) {
    const key = registerRuleCite(r);
    const citeAttr = key ? ` data-cite="${escapeHtml(key)}" role="button" tabindex="0"` : '';
    const school = escapeHtml(r.school || '');
    const quote = escapeHtml(r.quote || '');
    const plainRaw = isEN() ? quoteSiteTrEN(r.quote) : plainRuleZh(r.bai || ((r.then && r.then.text) || ''));
    const plain = escapeHtml(shortenText(plainRaw, isEN() ? 180 : 88));
    const topic = escapeHtml(friendlyConsequence(cls || ((r.then && r.then.consequence_class) || '中性其他')));
    const confTag = r.conf === 'medium' ? '<span class="gjl-conf">孤证待校</span>' : '';
    const you = isEN() ? 'For you' : '与你有关';
    const lead = plain;
    const evidence = isEN() ? `View the source in 《${school}》` : `查看《${school}》典籍依据`;
    return '<article class="gjl-item">'
      + `<div class="gjl-personal-head">${polMark(r.polarity)}<span class="gjl-you">${you}</span><span class="gjl-topic">${topic}</span></div>`
      + `<p class="gjl-personal-text">${lead}</p>`
      + `<details class="gjl-evidence"><summary>${evidence}</summary><div class="gjl-jian">`
      + `<div class="gjl-orig">${quote}</div>`
      + `<div class="gjl-cite"><span class="cite-chip gjl-src"${citeAttr}>《${school}》</span>${confTag}</div>`
      + '</div></details>'
      + '</article>';
  }

  // ===== 异说对峙卡（同前件·反极性 → 对称双笺）=====
  // §1.4 双声部语法：两枚同规格纸笺并列，各带书派印；中缝一枚「对」字金描边小印（非朱砂·不是警告）；
  //   笺底各标极性小符；卡底「两说并存，存录备考，不计入衡（诸家异说）」。绝无红章/胜负暗示/平均分。
  //   左右次序按成书年代（registry.dynasty）——年代早者居左；同代或查不到 → 按 id 升序（左=小 id）。
  const DYNASTY_RANK = (function () {
    const seq = ['先秦', '周', '春秋', '战国', '秦', '汉', '三国', '魏', '晋', '南北朝', '隋', '唐', '五代', '宋', '辽', '金', '元', '明', '清', '民国', '近代', '现代'];
    const m = {}; seq.forEach((d, i) => { m[d] = i; }); return m;
  })();
  function eraRankOf(dynasty) {
    if (!dynasty) return Infinity;
    const s = String(dynasty);
    // 先按前缀（dynasty 字段恒以朝代名起首，如「宋（约10-13世纪）」「明」），再按包含，避免误配
    for (const d in DYNASTY_RANK) { if (s.indexOf(d) === 0) return DYNASTY_RANK[d]; }
    for (const d in DYNASTY_RANK) { if (s.indexOf(d) >= 0) return DYNASTY_RANK[d]; }
    return Infinity;
  }
  let _bookEraP = null;
  function loadBookEra() {
    if (_bookEraP) return _bookEraP;
    const baseP = (window.CitePop && CitePop.resolveDianBase) ? CitePop.resolveDianBase() : Promise.resolve('/dian');
    _bookEraP = baseP
      .then(base => fetch(base + '/data/registry.json'))
      .then(r => (r && r.ok) ? r.json() : null)
      .then(reg => {
        const m = {};
        if (reg && Array.isArray(reg.books)) reg.books.forEach(b => { if (b && b.id) m[b.id] = eraRankOf(b.dynasty); });
        return m;
      })
      .catch(() => ({}));   // registry 取不到：全回落 id 排序（下方 orderPairByEra 处理）
    return _bookEraP;
  }
  // 一对（已按 id 升序）→ 据成书年代定左右；年代不可比则维持 id 升序（a 在左）
  function orderPairByEra(pair, bookEra) {
    const a = pair[0], b = pair[1];
    const ra = bookEra[a.src && a.src.book], rb = bookEra[b.src && b.src.book];
    if (ra != null && rb != null && isFinite(ra) && isFinite(rb) && ra !== rb) {
      return ra < rb ? [a, b] : [b, a];   // 成书早者居左
    }
    return [a, b];
  }
  function dpLeaf(r) {
    const key = registerRuleCite(r);
    const citeAttr = key ? ` data-cite="${escapeHtml(key)}" role="button" tabindex="0"` : '';
    const school = escapeHtml(r.school || '');
    const quote = escapeHtml(r.quote || '');
    // EN：对峙笺白话 → site translation 行（原句照排；对峙卡为 §5 人工英译目标，无译文回落 forthcoming）
    const bai = isEN()
      ? `<div class="gjl-bai gjl-sitetr">${escapeHtml(quoteSiteTrEN(r.quote))}</div>`
      : (r.bai ? `<div class="gjl-bai">${escapeHtml(shortenText(r.bai, 40))}</div>` : '');
    return '<div class="gjl-dp-leaf">'
      + `<div class="gjl-dp-book"><span class="gjl-dp-seal">《${school}》</span></div>`
      + `<div class="gjl-orig">${quote}</div>${bai}`
      + `<div class="gjl-dp-cite"><span class="cite-chip gjl-src"${citeAttr}>原句</span></div>`
      + `<div class="gjl-dp-pol">${polMark(r.polarity)}</div>`
      + '</div>';
  }
  function renderDisputePair(left, right) {
    return '<div class="gjl-dp">'
      + '<div class="gjl-dp-leaves">'
      + dpLeaf(left)
      + '<div class="gjl-dp-seam" aria-hidden="true"><span class="gjl-dp-dui">对</span></div>'
      + dpLeaf(right)
      + '</div>'
      + `<p class="gjl-dp-foot">${isEN() ? 'Both readings stand — recorded for reference, not weighed against each other (诸家异说, divergence among schools).' : '两说并存，存录备考，不计入衡（诸家异说）'}</p>`
      + '</div>';
  }
  function hasSentenceCite(r) {
    return !!(r && r.src && r.src.book != null && r.src.ch != null && r.src.i != null);
  }

  function renderGujiCard(input) {
    const box = $('bazi-guji');
    if (!box || !window.RuleKit || !window.ChartFacts) return;
    box.style.display = 'none';
    box.innerHTML = '';
    const eff = C.solarAdjustInput(input); // 真太阳时：以重排后的盘喂 ChartFacts/规则（幂等，flag 已清，ChartFacts 内 computeBazi 不再二次换算）
    Promise.all([RuleKit.load(), ChartFacts.buildAsync(eff), loadBookEra()]).then(([rules, facts, bookEra]) => {
      if (!rules || !RuleKit.isLoaded() || !facts) return;           // 规则库加载失败 → 静默隐藏
      const res = RuleKit.evaluate(facts);
      const natal = res.hits.filter(r => !RuleKit.usesPredicate(r, ['year_zhi', 'year_gan']));
      if (!natal.length) return;                                      // 命中 0 → 隐藏
      const groups = {};
      natal.forEach(r => { const k = (r.then && r.then.consequence_class) || '中性其他'; (groups[k] = groups[k] || []).push(r); });
      const enG = isEN();
      Object.values(groups).forEach(arr => arr.sort((a, b) => ruleWeight(b) - ruleWeight(a)));
      // 第一屏最多四条，并优先覆盖不同生活主题；其余连同古籍原文统一收进考据区。
      const highlights = Object.entries(groups)
        .map(([cls, arr]) => ({ cls, rule: arr[0] }))
        .sort((a, b) => ruleWeight(b.rule) - ruleWeight(a.rule))
        .slice(0, 4);
      if (highlights.length < 4) {
        const used = new Set(highlights.map(x => x.rule));
        natal.slice().sort((a, b) => ruleWeight(b) - ruleWeight(a)).forEach(rule => {
          if (highlights.length >= 4 || used.has(rule)) return;
          highlights.push({ cls: (rule.then && rule.then.consequence_class) || '中性其他', rule });
          used.add(rule);
        });
      }
      const highlighted = new Set(highlights.map(x => x.rule));
      const remainingCount = natal.length - highlighted.size;
      let html = '<div class="gjl-head"><span class="seal">' + (enG ? 'For You' : '与你有关') + '</span>'
        + `<span class="gjl-sub">${enG ? 'How traditional readers might read your chart · every source remains traceable' : '你的命盘，古人会怎么看 · 每条都可追溯'}</span></div>`
        + `<p class="gjl-intro">${enG ? '<b>Plain language first.</b> Source text stays folded until you want to inspect it.' : '<b>先说人话，再谈古籍。</b>以下是与你这张命盘直接对应的重点，原文默认收起。'}</p>`
        + '<div class="gjl-highlights">'
        + highlights.map(x => renderRuleItem(x.rule, x.cls)).join('')
        + '</div>';
      const hasLibrary = remainingCount > 0 || res.disputed.length > 0;
      if (hasLibrary) {
        const total = remainingCount + res.disputed.length;
        html += `<details class="gjl-library"><summary>${enG ? 'Continue to ' + total + ' source notes and divergent readings' : '继续查看其余 ' + total + ' 条典籍依据与异说'}</summary>`;
        CONSEQ_ORDER.forEach(cls => {
          const arr = (groups[cls] || []).filter(r => !highlighted.has(r));
          if (!arr.length) return;
          html += `<div class="gjl-group"><div class="gjl-group-title">${escapeHtml(friendlyConsequence(cls))}<em>${arr.length}</em></div>`;
          html += arr.map(r => renderRuleItem(r, cls)).join('');
          html += '</div>';
        });
      }
      if (res.disputed.length) {
        // 同前件·反极性 → 对峙对（对称双笺）；未配对 disputed 维持既有单条渲染。
        const dp = RuleKit.pairDisputed(res.disputed);
        const singles = dp.unpaired.slice();
        let pairHtml = '';
        dp.pairs.forEach(pair => {
          if (!hasSentenceCite(pair[0]) || !hasSentenceCite(pair[1])) {  // 任一笺无句级出处 → 不成卡，回落单条
            singles.push(pair[0]); singles.push(pair[1]); return;
          }
          const ord = orderPairByEra(pair, bookEra || {});
          pairHtml += renderDisputePair(ord[0], ord[1]);
        });
        html += `<details class="gjl-disputed"><summary>${enG ? 'Divergence among schools (' + res.disputed.length + ')' : '诸家异说（' + res.disputed.length + '）'}</summary>`
          + `<p class="gjl-disputed-note">${enG ? 'Each of these readings has its own source; recorded for reference, not weighed in.' : '此数说各有所本，存录备考，不计入衡。'}</p>`
          + pairHtml
          + singles.map(r => renderRuleItem(r, (r.then && r.then.consequence_class) || '中性其他')).join('')
          + '</details>';
      }
      if (hasLibrary) html += '</details>';
      const held = res.stats.held + res.stats.skippedRequires + res.stats.skippedCapability;
      html += `<p class="gjl-foot">${enG ? 'A cultural interpretation, not a scientific diagnosis or a promise of outcomes. A further ' + held + ' rules did not take part because they require a compass bearing or await review.' : '传统文化视角，不是科学诊断，也不承诺现实结果。另有 ' + held + ' 条规则因需罗盘方位／待复核未参与。'}</p>`;
      box.innerHTML = html;
      box.style.display = '';
    }).catch(() => { /* 静默降级：不显卡、不报错 */ });
  }

  // 今日触发：把「今年 X 支/干」触发的纯八字流年规则挂到「今日与你」卡尾（无则不挂）
  function renderTodayTrigger(cardEl) {
    if (!cardEl || !window.RuleKit || !window.ChartFacts) return;
    let input;
    try { input = JSON.parse(localStorage.getItem('bazi-input') || 'null'); } catch (e) { input = null; }
    if (!input) return;
    const eff = C.solarAdjustInput(input); // 真太阳时：今日触发规则同样跟随重排后的盘（幂等）
    Promise.all([RuleKit.load(), ChartFacts.buildAsync(eff)]).then(([rules, facts]) => {
      if (!rules || !RuleKit.isLoaded() || !facts || !cardEl.isConnected) return;
      const res = RuleKit.evaluate(facts);
      const yearHits = res.hits.filter(r =>
        RuleKit.usesPredicate(r, ['year_zhi', 'year_gan']) && !RuleKit.usesPredicate(r, COMPASS_PREDS));
      if (!yearHits.length) return;                                   // 没有就隐藏，不硬凑
      const yGZ = facts.year ? (facts.year.gan + facts.year.zhi) : '';
      yearHits.sort((a, b) => ruleWeight(b) - ruleWeight(a));
      const sec = document.createElement('div');
      sec.className = 'gjl-today';
      let h = '<p class="gjl-today-title">今日触发</p>';
      yearHits.slice(0, 3).forEach(r => {
        const key = registerRuleCite(r);
        const citeAttr = key ? ` data-cite="${escapeHtml(key)}" role="button" tabindex="0"` : '';
        h += `<p class="tp-line">今年${escapeHtml(yGZ)}，触发《${escapeHtml(r.school || '')}》：`
          + `${escapeHtml(shortenText((r.then && r.then.text) || '', 34))}`
          + `<span class="tp-tag cite-chip"${citeAttr}>原句</span></p>`;
      });
      sec.innerHTML = h;
      cardEl.appendChild(sec);
    }).catch(() => { /* 静默 */ });
  }

  // 真太阳时结果呈现：钟表时 vs 真太阳时的时柱地支双行对照。
  // 时辰相异 → 双行 + 「两法异说」chip；相同 → 单行 + 小注「两法同时辰」；未开启/无经度 → 整块隐去。
  // 本 App 两法并列不裁决（今人整理）。四柱盘随所选时刻（input.solarTime）已在 computeBazi 内换算。
  function renderSolarLine(input) {
    const box = $('bazi-solar-line');
    if (!box) return;
    const dual = $('bazi-solar-dual');
    const divBtn = $('bazi-solar-diverge-btn'), divPop = $('bazi-solar-diverge-pop');
    const resetDiv = () => { if (divBtn) { divBtn.hidden = true; divBtn.setAttribute('aria-expanded', 'false'); } if (divPop) divPop.hidden = true; };
    const active = input.solarTime === true && !input.isLunar
      && typeof input.longitude === 'number' && isFinite(input.longitude);
    if (!active) { box.style.display = 'none'; resetDiv(); return; }
    let clockZhi = '', solarZhi = '';
    try { clockZhi = C.computeBazi(Object.assign({}, input, { solarTime: false })).pillars[3].zhi; } catch (e) {}
    try { solarZhi = C.computeBazi(Object.assign({}, input, { solarTime: true })).pillars[3].zhi; } catch (e) {}
    if (!clockZhi || !solarZhi) { box.style.display = 'none'; resetDiv(); return; }
    box.style.display = '';
    if (clockZhi === solarZhi) {
      dual.innerHTML = `<span class="bz-solar-tag">钟表时＝真太阳时</span><span class="bz-solar-zhi">${escapeHtml(solarZhi)}时</span>`
        + `<span class="bz-solar-note">两法同时辰</span>`;
      resetDiv();
    } else {
      dual.innerHTML = `<div><span class="bz-solar-tag">钟表时</span><span class="bz-solar-zhi">${escapeHtml(clockZhi)}时</span></div>`
        + `<div><span class="bz-solar-tag">真太阳时</span><span class="bz-solar-zhi">${escapeHtml(solarZhi)}时</span></div>`;
      if (divPop) { divPop.textContent = '命理界排盘用时，钟表时与真太阳时（按经度、均时差校正的地方真太阳时）两派并存，各有师承。本 App 两法并列、以所选时刻排盘而不作裁决——今人整理。'; divPop.hidden = true; }
      if (divBtn) { divBtn.hidden = false; divBtn.setAttribute('aria-expanded', 'false'); }
    }
  }

  // ===== B1 生辰黄历回放卡（命盘卡之后）=====
  // 出生当日 干支/宜忌/时卦/节气，lunar-js 以出生日期回算；真太阳时口径跟随现有排盘（复用 C.solarAdjustInput）。
  // 出处同黄历卡：宜忌=lunar-js 黄历（协纪辨方书体系，chip 走既有 xinji-bianfang 键）；时卦=梅花易数（今人方法）。
  function renderBirthdayCard(input, c) {
    const host = $('bazi-birthday');
    if (!host) return;
    host.innerHTML = '';
    if (typeof Solar === 'undefined' || typeof Lunar === 'undefined') return;   // lunar 未就绪 → 优雅隐藏
    let bdate, blunar, alm, hex;
    try {
      const inp = (C.solarAdjustInput ? C.solarAdjustInput(input) : input);      // 真太阳时口径跟随排盘（幂等）
      let solar;
      if (inp.isLunar) solar = Lunar.fromYmdHms(inp.year, inp.month, inp.day, inp.hour, inp.minute || 0, 0).getSolar();
      else solar = Solar.fromYmdHms(inp.year, inp.month, inp.day, inp.hour, inp.minute || 0, 0);
      bdate = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute(), 0);
      if (isNaN(bdate.getTime())) return;
      blunar = Solar.fromDate(bdate).getLunar();
      alm = C.dailyAlmanac(bdate);
      hex = C.meihuaByDate(bdate);
    } catch (e) { return; }                                                       // 回算失败静默隐藏
    const yearGZ = (c && c.pillars && c.pillars[0]) ? c.pillars[0].gz : blunar.getYearInGanZhi();
    const timeZhi = (c && c.pillars && c.pillars[3]) ? c.pillars[3].zhi : '';
    const monthCn = blunar.getMonthInChinese(), dayCn = blunar.getDayInChinese();
    const yi = (alm.yi || []).slice(0, 2), ji = (alm.ji || []).slice(0, 2);
    if (isEN()) {
      const bIso = `${bdate.getFullYear()}-${pad2(bdate.getMonth() + 1)}-${pad2(bdate.getDate())}`;
      let sentence = `You were born on <b>${escapeHtml(yearGZ)} ${ganzhiPY(yearGZ)} year, ${escapeHtml(monthCn)}月${escapeHtml(dayCn)}, ${escapeHtml(branchHourEN(timeZhi))}</b>.`;
      const bits = [];
      if (yi.length) bits.push(`the day's almanac favored <b class="kw-yi">${escapeHtml(yi.join(' · '))}</b>`);
      if (hex && hex.name) bits.push(`the hour hexagram was <b class="gold">${escapeHtml(hex.name)}</b>`);
      if (bits.length) sentence += ' On that day, ' + bits.join('; ') + '.';
      const jieqiPosEN = alm.jieQiToday
        ? `${jieqiDisp(alm.jieQiToday)} began that day`
        : `within ${jieqiDisp(alm.currentJieQi)}`;
      let meta = `<span class="bday-k">Solar term</span>${escapeHtml(jieqiPosEN)}`;
      if (ji.length) meta += ` <span class="bday-k" style="margin-left:12px">忌 (jì)</span><span class="kw-ji">${escapeHtml(ji.join(' · '))}</span>`;
      host.innerHTML =
        '<div class="card bday-card">'
        + '<div class="bday-head"><span class="seal">生辰</span><b class="gold">Day of Birth</b>'
        + `<span class="dim">${escapeHtml(bIso)}</span></div>`
        + `<p class="bday-phrase">${sentence}</p>`
        + `<p class="bday-meta">${meta}</p>`
        + '<div class="bday-foot"><span>Yí / jì follow the almanac <span class="cite-chip" data-cite="xinji-bianfang" role="button" tabindex="0" style="margin:0 3px">《协纪辨方书》</span> tradition · hour hexagram by 梅花易数 Méihuā Yìshù (' + escapeHtml(tt('common.modern_method')) + ')</span>'
        + '<span class="bday-share">Press and hold to screenshot · share with a friend</span></div>'
        + '</div>';
      return;
    }
    let sentence = `阁下降生于<b>${escapeHtml(yearGZ)}年${escapeHtml(monthCn)}月${escapeHtml(dayCn)}${escapeHtml(timeZhi)}时</b>。`;
    if (yi.length) sentence += `是日宜<b class="kw-yi">${escapeHtml(yi.join('·'))}</b>`;
    if (hex && hex.name) sentence += `${yi.length ? '，' : '是日'}时卦<b class="gold">${escapeHtml(hex.name)}</b>`;
    sentence += '。';
    const jieqiPos = alm.jieQiToday ? `是日交「${alm.jieQiToday}」` : `时在「${alm.currentJieQi}」气中`;
    let meta = `<span class="bday-k">节气</span>${escapeHtml(jieqiPos)}`;
    if (ji.length) meta += ` <span class="bday-k" style="margin-left:12px">忌</span><span class="kw-ji">${escapeHtml(ji.join('·'))}</span>`;
    host.innerHTML =
      '<div class="card bday-card">'
      + '<div class="bday-head"><span class="seal">生辰</span><b class="gold">降生之日</b>'
      + `<span class="dim">${escapeHtml(alm.solarText)}</span></div>`
      + `<p class="bday-phrase">${sentence}</p>`
      + `<p class="bday-meta">${meta}</p>`
      + '<div class="bday-foot"><span>宜忌本乎黄历<span class="cite-chip" data-cite="xinji-bianfang" role="button" tabindex="0" style="margin:0 3px">《协纪辨方书》</span>体系 · 时卦梅花易数（今人方法）</span>'
      + '<span class="bday-share">长按截图 · 可赠友人</span></div>'
      + '</div>';
  }

  // ===== D1 个人历热力图（六因子独立呈现；核心计算见 personal-calendar.js）=====
  let pcalState = { key: null, base: null, cursor: null, chart: null, branchRequested: false };
  function pcalTodayMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
  }
  function pcalDateLabel(day) {
    return isEN()
      ? `${day.iso}${day.lunarLabel ? ' · lunar ' + day.lunarLabel : ''}`
      : `${day.year}年${day.month}月${day.day}日${day.lunarLabel ? ' · 农历' + day.lunarLabel : ''}`;
  }
  function pcalList(arr) {
    const a = (arr || []).filter(Boolean).slice(0, 3);
    return a.length ? a.map(escapeHtml).join(isEN() ? ', ' : '、') : escapeHtml(tt('pcal.none'));
  }
  function pcalSource(kind) {
    if (kind === 'branch') {
      return '<span class="pcal-src cite-chip" data-cite="yuanhai-ziping" role="button" tabindex="0">branch-relations · 《渊海子平》</span>'
        + '<span class="pcal-src cite-chip" data-cite="sanming-tonghui" role="button" tabindex="0">《三命通会》</span>';
    }
    if (kind === 'calendar') return `<span class="pcal-src">${escapeHtml(tt('pcal.source_calendar'))}</span>`;
    if (kind === 'fuyin') return `<span class="pcal-src">${escapeHtml(tt('pcal.source_fuyin'))} · ${escapeHtml(tt('pcal.source_synthesis'))}</span>`;
    return `<span class="pcal-src">${escapeHtml(tt('pcal.source_modern'))}</span>`;
  }
  function pcalFactorValue(day, key) {
    const f = day.factors[key];
    const c = day.chart || {};
    if (key === 'favorable') {
      return tt(f.hit ? 'pcal.fav_value' : 'pcal.fav_miss', {
        gan: day.dayGan || '', el: day.dayGanEl || '', list: (c.favorable || []).join(isEN() ? ', ' : '、')
      });
    }
    if (key === 'unfavorable') {
      return tt(f.hit ? 'pcal.unfav_value' : 'pcal.unfav_miss', {
        gan: day.dayGan || '', el: day.dayGanEl || '', list: (c.unfavorable || []).join(isEN() ? ', ' : '、')
      });
    }
    if (key === 'fuyin') return tt(f.hit ? 'pcal.fuyin_value' : 'pcal.fuyin_miss', { gz: c.dayPillar || '' });
    if (key === 'clash') return tt(f.hit ? 'pcal.clash_value' : 'pcal.clash_miss', { natal: c.dayBranch || '', day: day.dayZhi || '' });
    if (key === 'combine') {
      if (!f.hit) return tt('pcal.combine_miss', { natal: c.dayBranch || '', day: day.dayZhi || '' });
      return tt(f.rel === '三合' ? 'pcal.combine_sanhe' : 'pcal.combine_liuhe', {
        natal: c.dayBranch || '', day: day.dayZhi || '', element: f.element || ''
      });
    }
    if (key === 'solarTerm') return tt(f.hit ? 'pcal.solarterm_value' : 'pcal.solarterm_miss', { name: f.name || '' });
    return '';
  }
  function pcalFactorRows(day) {
    const defs = [
      ['favorable', 'pcal.factor_favorable', 'modern'],
      ['unfavorable', 'pcal.factor_unfavorable', 'modern'],
      ['fuyin', 'pcal.factor_fuyin', 'fuyin'],
      ['clash', 'pcal.factor_clash', 'branch'],
      ['combine', 'pcal.factor_combine', 'branch'],
      ['solarTerm', 'pcal.factor_solarterm', 'calendar']
    ];
    return defs.map(([key, labelKey, source]) => {
      const f = day.factors[key] || { hit: false };
      return `<div class="pcal-factor ${f.hit ? 'on' : ''}">`
        + `<div><b>${escapeHtml(tt(labelKey))}</b><span>${escapeHtml(pcalFactorValue(day, key))}</span></div>`
        + `<em>${escapeHtml(tt(f.hit ? 'pcal.hit' : 'pcal.miss'))}</em>${pcalSource(source)}</div>`;
    }).join('');
  }
  let pcalBackdrop = null, pcalSheet = null;
  function pcalCloseDrawer() {
    if (!pcalSheet || !pcalBackdrop) return;
    pcalBackdrop.classList.remove('shown');
    pcalSheet.classList.remove('shown');
    pcalSheet.setAttribute('aria-hidden', 'true');
  }
  function pcalEnsureDrawer() {
    if (pcalSheet) return;
    pcalBackdrop = document.createElement('div');
    pcalBackdrop.id = 'pcal-backdrop';
    pcalSheet = document.createElement('div');
    pcalSheet.id = 'pcal-sheet';
    pcalSheet.setAttribute('role', 'dialog');
    pcalSheet.setAttribute('aria-modal', 'true');
    pcalSheet.setAttribute('aria-label', tt('pcal.drawer_aria'));
    pcalSheet.setAttribute('aria-hidden', 'true');
    document.body.appendChild(pcalBackdrop);
    document.body.appendChild(pcalSheet);
    pcalBackdrop.addEventListener('click', pcalCloseDrawer);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') pcalCloseDrawer(); });
  }
  function pcalOpenDrawer(day) {
    pcalEnsureDrawer();
    pcalSheet.innerHTML =
      '<div class="fpw-head">'
      + `<span class="seal">${escapeHtml(tt('pcal.seal'))}</span>`
      + `<b class="pcal-sheet-title">${escapeHtml(pcalDateLabel(day))}</b>`
      + `<button class="panel-close" id="pcal-close" aria-label="${escapeHtml(tt('pcal.close_drawer'))}">✕</button>`
      + '</div>'
      + '<div class="pcal-detail">'
      + `<div class="pcal-info-row"><b>${escapeHtml(tt('pcal.ganzhi'))}</b><span>${escapeHtml(day.dayGz || '')}</span>${pcalSource('calendar')}</div>`
      + `<div class="pcal-info-row"><b>${escapeHtml(tt('pcal.yi_top'))}</b><span>${pcalList(day.yi)}</span>${pcalSource('calendar')}</div>`
      + `<div class="pcal-info-row"><b>${escapeHtml(tt('pcal.ji_top'))}</b><span>${pcalList(day.ji)}</span>${pcalSource('calendar')}</div>`
      + '<div class="pcal-factor-list">' + pcalFactorRows(day) + '</div>'
      + `<button class="fpw-primary pcal-export" id="pcal-export" type="button">${escapeHtml(tt('pcal.export_day'))}</button>`
      + '<p class="pcal-export-status" id="pcal-export-status" aria-live="polite"></p>'
      + '</div>';
    pcalSheet.querySelector('#pcal-close').addEventListener('click', pcalCloseDrawer);
    pcalSheet.querySelector('#pcal-export').addEventListener('click', () => {
      const status = pcalSheet.querySelector('#pcal-export-status');
      if (!window.PersonalCalendar || typeof PersonalCalendar.downloadSingleDayIcs !== 'function') {
        if (status) status.textContent = tt('pcal.export_fail');
        return;
      }
      PersonalCalendar.downloadSingleDayIcs(day).then(res => {
        const msg = tt('pcal.export_done', { filename: res.filename });
        if (status) status.textContent = msg;
        toast(msg);
      }).catch(() => {
        if (status) status.textContent = tt('pcal.export_fail');
        toast(tt('pcal.export_fail'));
      });
    });
    pcalBackdrop.classList.add('shown');
    pcalSheet.classList.add('shown');
    pcalSheet.setAttribute('aria-hidden', 'false');
  }
  function pcalRenderGrid(host) {
    const PC = window.PersonalCalendar;
    if (!PC || !pcalState.chart || typeof Solar === 'undefined') { host.hidden = true; return; }
    const month = PC.computeMonth(pcalState.cursor.getFullYear(), pcalState.cursor.getMonth() + 1, pcalState.chart);
    const base = pcalState.base;
    const dist = PC.monthDistance(pcalState.cursor, base);
    const todayIso = (() => { const n = new Date(); return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`; })();
    const monthText = isEN() ? pad2(month.month) : month.month;
    const weeks = tt('pcal.weekdays').split('|');
    let html = '<div class="card pcal-card">'
      + '<div class="pcal-head">'
      + '<div><span class="seal">' + escapeHtml(tt('pcal.seal')) + '</span><b class="gold">' + escapeHtml(tt('pcal.title')) + '</b>'
      + '<p class="dim">' + escapeHtml(tt('pcal.subtitle')) + '</p></div>'
      + '<div class="pcal-navs">'
      + `<button type="button" class="pcal-nav" data-dir="-1" aria-label="${escapeHtml(tt('pcal.prev_aria'))}" ${dist <= -12 ? 'disabled' : ''}>‹</button>`
      + `<span class="pcal-month">${escapeHtml(tt('pcal.month_title', { year: month.year, month: monthText }))}</span>`
      + `<button type="button" class="pcal-nav" data-dir="1" aria-label="${escapeHtml(tt('pcal.next_aria'))}" ${dist >= 12 ? 'disabled' : ''}>›</button>`
      + '</div></div>'
      + '<div class="pcal-legend">'
      + `<span><i class="pcal-swatch favorable"></i>${escapeHtml(tt('pcal.legend_favorable'))}</span>`
      + `<span><i class="pcal-swatch unfavorable"></i>${escapeHtml(tt('pcal.legend_unfavorable'))}</span>`
      + `<span><i class="pcal-swatch neutral"></i>${escapeHtml(tt('pcal.legend_neutral'))}</span>`
      + '</div><div class="pcal-week">';
    weeks.forEach(w => { html += `<span>${escapeHtml(w)}</span>`; });
    html += '</div><div class="pcal-grid">';
    for (let i = 0; i < month.leadingBlanks; i++) html += '<span class="pcal-blank"></span>';
    month.days.forEach(day => {
      const markerHtml = day.markers.map(m => `<i>${escapeHtml(m.symbol)}</i>`).join('');
      html += `<button type="button" class="pcal-day ${day.bgState} ${day.iso === todayIso ? 'today' : ''}" data-iso="${escapeHtml(day.iso)}">`
        + `<span class="pcal-num">${day.day}</span><span class="pcal-gz">${escapeHtml(day.dayGz || '')}</span>`
        + `<span class="pcal-markers">${markerHtml}</span></button>`;
    });
    html += '</div>'
      + `<p class="pcal-cache dim">${escapeHtml(tt('pcal.cache_note', { ms: month.computedMs.toFixed ? month.computedMs.toFixed(2) : month.computedMs }))}</p>`
      + '</div>';
    host.innerHTML = html;
    host.hidden = false;
    host.querySelectorAll('.pcal-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        pcalState.cursor = PC.addMonths(pcalState.cursor, parseInt(btn.dataset.dir, 10));
        pcalRenderGrid(host);
      });
    });
    host.querySelectorAll('.pcal-day').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = month.days.find(d => d.iso === btn.dataset.iso);
        if (day) pcalOpenDrawer(day);
      });
    });
  }
  function pcalRequestBranchRelations(host) {
    if (pcalState.branchRequested || !window.ChartFacts || typeof ChartFacts.loadTables !== 'function') return;
    pcalState.branchRequested = true;
    ChartFacts.loadTables().then(tables => {
      if (tables && tables.branch && window.PersonalCalendar) {
        PersonalCalendar.setBranchRelationsTable(tables.branch, 'chartfacts-branch-relations');
        if (host && !host.hidden) pcalRenderGrid(host);
      }
    }).catch(() => {});
  }
  function renderPersonalCalendar(input, c) {
    const host = $('bazi-personal-calendar');
    if (!host) return;
    if (!input || !c || !window.PersonalCalendar) { host.hidden = true; return; }
    PersonalCalendar.registerI18n && PersonalCalendar.registerI18n();
    PersonalCalendar.registerCiteKeys && PersonalCalendar.registerCiteKeys();
    const key = JSON.stringify(input);
    if (pcalState.key !== key) {
      pcalState.key = key;
      pcalState.base = pcalTodayMonth();
      pcalState.cursor = pcalTodayMonth();
    }
    pcalState.chart = c;
    pcalRenderGrid(host);
    pcalRequestBranchRelations(host);
  }

  // ===== 司南十象：五行 × 阴阳 = 十天干角色 =====
  // 只挂八字结果页；堪舆页继续保持罗盘/地图工具界面。人格名与文案为现代文化创作，非科学诊断。

  const CharacterSystem = window.SinanCharacters || null;
  let currentCharacterChart = null;

  function selectedThemeStem() {
    if (!CharacterSystem) return null;
    try {
      const stem = localStorage.getItem('changming-theme-stem');
      return CharacterSystem.get(stem) ? stem : null;
    } catch (e) { return null; }
  }

  function characterText(item, key, en) {
    if (!item || !CharacterSystem) return '';
    return CharacterSystem.text(item, key, en ? 'en' : 'zh');
  }

  function setCharacterImageState(image, host) {
    if (!image || !host) return;
    const ready = () => {
      host.classList.remove('image-missing');
      host.classList.add('asset-ready');
    };
    const missing = () => {
      host.classList.remove('asset-ready');
      host.classList.add('image-missing');
    };
    if (image.complete) (image.naturalWidth ? ready : missing)();
    else {
      image.addEventListener('load', ready, { once: true });
      image.addEventListener('error', missing, { once: true });
    }
  }

  function renderBaziArchetype(c) {
    const host = $('bazi-archetype');
    const guide = c && CharacterSystem && CharacterSystem.guideFor(c);
    const selfStem = c && c.dm;
    const self = selfStem && CharacterSystem && CharacterSystem.get(selfStem);
    const themeStem = selectedThemeStem();
    const displayStem = themeStem || selfStem;
    const a = displayStem && CharacterSystem && CharacterSystem.get(displayStem);
    if (!host || !self || !a || !guide) { if (host) host.hidden = true; return; }
    const en = isEN();
    const element = en ? elEN(a.element) : a.element;
    const polarity = en ? (a.yang ? 'Yang' : 'Yin') : (a.yang ? '阳' : '阴');
    const stem = en ? `${cap1(STEM_PY[displayStem] || displayStem)} ${element}` : `${displayStem}${a.element}`;
    const name = characterText(a, 'name', en);
    const role = characterText(a, 'role', en);
    const tags = en ? a.tagsEn : a.tagsZh;
    const desc = characterText(a, 'desc', en);
    const pairZh = (guide.pair && guide.pair.length ? guide.pair : [selfStem]);
    const pairEn = pairZh.map(s => cap1(STEM_PY[s] || s));
    const relationCards = CharacterSystem.relationCards(selfStem, en ? 'en' : 'zh');
    const output = relationCards.find(card => card.key === 'output');
    const combine = relationCards.find(card => card.kind === 'combine');
    const clash = relationCards.find(card => card.kind === 'clash');
    const kicker = en ? 'WHO YOU ARE · WHO ENTERS YOUR STORY' : '你是谁 · 谁走进你的故事';
    const plain = themeStem
      ? (en
        ? `${cap1(STEM_PY[displayStem] || displayStem)} is your chosen theme character. Your Day Master remains ${cap1(STEM_PY[selfStem] || selfStem)}.`
        : `你选择${displayStem}·${name}作为主题人物；命盘日主仍是${selfStem}。`)
      : (en
        ? `Your story begins with Day Master ${cap1(STEM_PY[selfStem] || selfStem)}.`
        : `你的命盘从日主${selfStem}出发，常明城也先从这里展开。`);
    const basis = guide.balanced
      ? (en
        ? 'The five phases are close, so no single phase is shown as the lower pair.'
        : '五行相近，没有单独出现的较少五行人物。')
      : (en
        ? `${elEN(guide.element)} is relatively lower, so both ${pairEn.join(' and ')} appear: the Yang and Yin faces of the same phase.`
        : `${guide.element}相对较少，所以同属${guide.element}的${pairZh.join('、')}一起出现：一位是阳${guide.element}，一位是阴${guide.element}。`);
    const alt = en ? `${stem}, ${name}, ${role}, in Changming City` : `${stem}·${name}·${role}在常明城中的完整场景`;
    const archHex = C.EL_HEX[a.element] || '#c9a227';
    const archNum = parseInt(archHex.slice(1), 16);
    const sceneCard = ({ kind, label, title, note, asset, openStem, focus }) => asset ? `<button type="button" class="bazi-cast-card is-${kind}" data-changming-open data-stem="${escapeHtml(openStem || selfStem)}">
      <img src="${escapeHtml(asset)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" style="--scene-focus:${escapeHtml(focus || '50% 50%')}">
      <span class="bazi-cast-shade" aria-hidden="true"></span>
      <span class="bazi-cast-copy"><small>${escapeHtml(label)}</small><b>${escapeHtml(title)}</b><em>${escapeHtml(note)}</em></span>
    </button>` : '';
    const weakNames = CharacterSystem.namesFor(pairZh, en ? 'en' : 'zh');
    const weakScene = CharacterSystem.sceneForElement(guide.element);
    const outputNames = output && output.relatedDetails
      ? output.relatedDetails.map(detail => {
        const item = CharacterSystem.get(detail.stem);
        return `${detail.stem}·${characterText(item, 'name', en)}·${detail.role}`;
      }).join(en ? ' / ' : ' · ')
      : (output ? output.related : '');
    const outputFirst = output && CharacterSystem.get(output.relatedStems[0]);
    const outputScene = output && (output.scene || (outputFirst && CharacterSystem.sceneForElement(outputFirst.element)));
    const combinePerson = combine && CharacterSystem.get(combine.relatedStems[0]);
    const clashPerson = clash && CharacterSystem.get(clash.relatedStems[0]);
    const castCards = [
      sceneCard({
        kind: 'weak',
        label: guide.balanced ? (en ? 'PHASES EVEN' : '五行接近') : (en ? `LOWEST · ${elEN(guide.element)}` : `较少 · ${guide.element}`),
        title: guide.balanced ? (en ? 'No single missing-phase cast' : '没有单独缺口') : weakNames,
        note: guide.balanced ? (en ? 'Begin with your Day Master' : '先从日主认识自己') : (en ? 'Both polarities appear together' : '两位同行人物一起出现'),
        asset: guide.balanced ? self.heroScene : weakScene,
        openStem: guide.balanced ? selfStem : pairZh[0],
        focus: guide.balanced ? self.heroFocus : '50% 50%'
      }),
      output && sceneCard({
        kind: 'output', label: en ? 'I GENERATE · OUTPUT' : '我生 · 食神 / 伤官', title: outputNames,
        note: en ? 'Two forms of what you give outward' : '同一份输出的两种表达',
        asset: outputScene, openStem: selfStem
      }),
      combine && combinePerson && sceneCard({
        kind: 'combine', label: combine.label, title: `${combine.related} · ${combine.title}`,
        note: en ? 'Opposing motions interlock' : '相反动作互锁，形成第三种状态',
        asset: combine.scene || combinePerson.heroScene, openStem: selfStem, focus: combine.scene ? '50% 50%' : combinePerson.heroFocus
      }),
      clash && clashPerson && sceneCard({
        kind: 'clash', label: clash.label, title: `${clash.related} · ${clash.title}`,
        note: en ? 'A face-off without a villain' : '正面对冲，但没有固定反派',
        asset: clash.scene || clashPerson.heroScene, openStem: selfStem, focus: clash.scene ? '50% 50%' : clashPerson.heroFocus
      })
    ].filter(Boolean).join('');
    host.style.setProperty('--arch-color', archHex);
    host.style.setProperty('--arch-rgb', `${(archNum >> 16) & 255}, ${(archNum >> 8) & 255}, ${archNum & 255}`);
    host.dataset.stem = displayStem;
    host.classList.remove('awaken', 'image-missing', 'asset-ready');
    host.innerHTML = `
      <article class="bazi-persona-hero">
        <img class="bazi-persona-art" src="${escapeHtml(a.heroScene || a.background)}" alt="${escapeHtml(alt)}" decoding="async" style="--scene-focus:${escapeHtml(a.heroFocus || '50% 50%')}">
        <span class="bazi-persona-shade" aria-hidden="true"></span>
        <div class="bazi-arch-copy">
        <span class="bazi-arch-kicker">${escapeHtml(kicker)}</span>
        <h2 class="bazi-arch-title"><b>${escapeHtml(stem)}</b><small>${escapeHtml(polarity + ' ' + element + ' · ' + name + ' · ' + role)}</small></h2>
        <div class="bazi-arch-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
        <p class="bazi-arch-plain">${escapeHtml(plain)}</p>
        <p class="bazi-arch-desc">${escapeHtml(desc)}</p>
        <button type="button" class="bazi-arch-enter" data-changming-open data-stem="${escapeHtml(displayStem)}"><span>${en ? `Enter Changming with ${cap1(STEM_PY[displayStem] || displayStem)}` : `从${displayStem}开始，进入常明城`}</span><b aria-hidden="true">↗</b></button>
        </div>
      </article>
      <div class="bazi-cast-heading"><span>${en ? 'PEOPLE IN YOUR STORY' : '走进你故事里的人'}</span><p>${en ? 'Your Day Master, the lower phase pair, what you generate, combination, and clash.' : '从你的日主出发，看看较少的五行、你所生、与你合与冲的人。'}</p></div>
      <div class="bazi-cast-grid">${castCards}</div>
      <details class="bazi-arch-basis"><summary>${en ? 'Why do these people appear?' : '为什么是这些人？'}</summary><p>${escapeHtml(basis)}</p></details>`;
    host.hidden = false;
    setCharacterImageState(host.querySelector('.bazi-persona-art'), host);
    requestAnimationFrame(() => {
      void host.offsetWidth;
      host.classList.add('awaken');
    });
  }

  function renderTodayCharacterStory(c) {
    const host = $('today-character-story');
    const guideStem = c && (selectedThemeStem() || c.dm);
    const a = guideStem && CharacterSystem && CharacterSystem.get(guideStem);
    if (!host || !a) { if (host) host.hidden = true; return; }
    const en = isEN();
    const isTheme = guideStem !== c.dm;
    const label = isTheme
      ? (en ? `YOUR THEME · DAY MASTER ${cap1(STEM_PY[c.dm] || c.dm)}` : `你的主题人物 · 日主仍是${c.dm}`)
      : (en ? 'YOUR DAY MASTER · A LIFE IN PROGRESS' : '你的日主 · 人物小传');
    const headings = en
      ? ['The unspoken wound', 'An irreplaceable moment', 'Still unfolding']
      : ['没有说出口的事', '不可替代的高光', '仍在发生'];
    const storyAsset = a.heroScene || a.background;
    const storyAlt = en
      ? `${characterText(a, 'name', true)} character-story pose`
      : `${characterText(a, 'name', false)}人物志动作`;
    const comic = a.comic;
    const comicTitle = comic ? (en ? comic.titleEn : comic.titleZh) : '';
    const comicMarkup = comic ? `<figure class="character-story-comic">
      <figcaption><span>${en ? 'WORDLESS COMIC · OPEN ENDING' : '无字人物志 · 未完待续'}</span><b>《${escapeHtml(comicTitle)}》</b></figcaption>
      <img src="${escapeHtml(comic.asset)}" alt="${escapeHtml(en ? `${characterText(a, 'name', true)} wordless four-panel comic` : `${characterText(a, 'name', false)}无字四格人物志`)}" loading="lazy" decoding="async">
    </figure>` : '';
    host.innerHTML = `<div class="card character-story-card">
      <div class="character-story-head">
        <span class="seal">${escapeHtml(label)}</span>
        <h3><b>${escapeHtml(guideStem + '·' + characterText(a, 'name', en))}</b><small>${escapeHtml(characterText(a, 'role', en))}</small></h3>
      </div>
      <div class="character-story-visual is-full-scene">
        <img class="character-story-person" src="${escapeHtml(storyAsset)}" alt="${escapeHtml(storyAlt)}" loading="lazy" decoding="async" style="--scene-focus:${escapeHtml(a.heroFocus || '50% 50%')}">
      </div>
      <div class="character-story-grid">
        <article class="character-story-beat is-scar"><span>${escapeHtml(headings[0])}</span><p>${escapeHtml(characterText(a, 'scar', en))}</p></article>
        <article class="character-story-beat is-highlight"><span>${escapeHtml(headings[1])}</span><p>${escapeHtml(characterText(a, 'highlight', en))}</p></article>
        <article class="character-story-beat is-open"><span>${escapeHtml(headings[2])}</span><p>${escapeHtml(characterText(a, 'ongoing', en))}</p></article>
      </div>
      <button type="button" class="character-world-link" data-changming-open data-stem="${escapeHtml(guideStem)}"><span>${en ? `See ${cap1(STEM_PY[guideStem] || guideStem)} in Changming` : `看${guideStem}在常明城里的故事`}</span><b aria-hidden="true">↗</b></button>
      ${comicMarkup}
    </div>`;
    const storyImage = host.querySelector('.character-story-person');
    const imageMissing = () => host.classList.add('story-image-missing');
    host.classList.remove('story-image-missing');
    if (storyImage.complete) { if (!storyImage.naturalWidth) imageMissing(); }
    else storyImage.addEventListener('error', imageMissing, { once: true });
    const comicImage = host.querySelector('.character-story-comic img');
    if (comicImage) comicImage.addEventListener('error', () => comicImage.closest('.character-story-comic').remove(), { once: true });
    host.hidden = false;
  }

  function renderBaziRelations(c) {
    const host = $('bazi-character-relations');
    const cards = c && CharacterSystem ? CharacterSystem.relationCards(c.dm, isEN() ? 'en' : 'zh') : [];
    if (!host || !cards.length) { if (host) host.hidden = true; return; }
    const en = isEN();
    const title = en ? 'Stories between you and the other nine' : '你与另外九人的故事';
    const sub = en
      ? 'Every relation is a shared event between two or three characters. Open one to see how they change each other.'
      : '每一种关系，都是两个人或三个人共同经历的一件事。点开看看他们怎样彼此改变。';
    host.innerHTML = `<div class="card character-relations-card">
      <span class="seal">${en ? 'FIVE-PHASE RELATION MAP' : '五行关系图谱'}</span>
      <h3>${escapeHtml(title)}</h3><p class="dim">${escapeHtml(sub)}</p>
      <button type="button" class="character-world-link is-compact relation-city-entry" data-changming-open data-stem="${escapeHtml(c.dm)}" data-cm-view="relations"><span>${en ? 'Browse every relation in Changming' : '进入常明城 · 看全城关系'}</span><b aria-hidden="true">↗</b></button>
      <div class="character-relation-tabs" role="tablist">${cards.map((card, index) => `<button type="button" role="tab" aria-selected="${index === 0}" class="${index === 0 ? 'active' : ''}" data-index="${index}">${escapeHtml(card.label)}</button>`).join('')}</div>
      <div class="character-relation-panel" role="tabpanel" aria-live="polite"></div>
    </div>`;
    const panel = host.querySelector('.character-relation-panel');
    const paint = card => {
      panel.dataset.kind = card.kind;
      const sceneStems = [c.dm].concat((card.relatedStems || []).filter(stem => stem !== c.dm));
      const people = sceneStems.map((stem, index) => {
        const person = CharacterSystem.get(stem);
        if (!person) return '';
        const asset = person.heroScene || person.background;
        const name = `${stem}·${characterText(person, 'name', en)}`;
        return `<figure class="relation-character${index === 0 ? ' is-self' : ''}" data-stem="${escapeHtml(stem)}">
          <img src="${escapeHtml(asset)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async" style="--scene-focus:${escapeHtml(person.heroFocus || '50% 50%')}">
          <figcaption>${index === 0 ? (en ? 'YOU · ' : '我 · ') : ''}${escapeHtml(name)}</figcaption>
        </figure>`;
      }).join('');
      const visual = card.scene
        ? `<figure class="relation-story-scene"><img src="${escapeHtml(card.scene)}" alt="${escapeHtml(card.title + ' · ' + sceneStems.join('、'))}" loading="lazy" decoding="async"></figure>`
        : `<div class="relation-character-scene is-cinematic" aria-label="${escapeHtml(sceneStems.join('、'))}">${people}</div>`;
      const narrative = card.title && card.story
        ? `<div class="relation-story-copy"><b>${escapeHtml(card.title)}</b><p>${escapeHtml(card.story)}</p></div>`
        : '';
      const relatedLine = card.relatedDetails
        ? card.relatedDetails.map(detail => `${detail.stem}·${detail.role}`).join(' · ')
        : card.related;
      panel.innerHTML = `${visual}${narrative}
        <div class="relation-panel-meta"><span>${escapeHtml(card.term)}</span><b>${escapeHtml(relatedLine)}</b></div>
        <p class="relation-plain">${escapeHtml(card.plain)}</p>
        <button type="button" class="character-world-link is-compact" data-changming-open data-stem="${escapeHtml(c.dm)}" data-cm-view="relations"><span>${en ? 'Read this relation in Changming' : '进入常明城看这段关系'}</span><b aria-hidden="true">↗</b></button>`;
      panel.querySelectorAll('.relation-character img').forEach(image => {
        image.addEventListener('error', () => image.closest('.relation-character')?.classList.add('image-missing'), { once: true });
      });
    };
    paint(cards[0]);
    host.querySelectorAll('.character-relation-tabs button').forEach(button => {
      button.addEventListener('click', () => {
        host.querySelectorAll('.character-relation-tabs button').forEach(item => {
          const selected = item === button;
          item.classList.toggle('active', selected);
          item.setAttribute('aria-selected', String(selected));
        });
        paint(cards[parseInt(button.dataset.index, 10)] || cards[0]);
      });
    });
    host.hidden = false;
  }

  function renderBazi(input) {
    let c;
    try { c = C.computeBazi(input); } catch (e) { return; }
    currentCharacterChart = c;
    $('bazi-form').style.display = 'none';
    const box = $('bazi-result');
    box.style.display = '';
    box.classList.remove('reveal'); void box.offsetWidth; box.classList.add('reveal'); // 重触发错峰淡入
    setTimeout(() => { try { box.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }, 60); // 修「点了排盘没反应」（结果在视口外）
    // 头部回显：阳历输入时补一段公历生辰，农历输入则由 lunarText 自带
    const pad = n => String(n).padStart(2, '0');
    if (isEN()) {
      // §4.2：公历标 solar + ISO；农历干支年拼音、月日保汉字、时辰 §2.13；乾造/坤造 §3 保技术标签
      const genderEN = tt(input.gender === '坤造' ? 'bazi.gender_female' : 'bazi.gender_male');
      const solarEchoEN = input.isLunar ? '' : `solar ${input.year}-${pad(input.month)}-${pad(input.day)} ${pad(input.hour)}:${pad(input.minute || 0)} · `;
      let lunEN = c.lunarText;
      const m = c.lunarText.match(/^农历(.{2})年(.+)月(.+?) (.)时$/);
      if (m) lunEN = `lunar ${m[1]} ${ganzhiPY(m[1])} year · ${m[2]}月${m[3]} · ${branchHourEN(m[4])}`;
      $('bazi-head').textContent = `${genderEN} · ${solarEchoEN}${lunEN} · ${sxEN(c.shengXiao)} (属${c.shengXiao})`;
    } else {
      const solarEcho = input.isLunar ? '' : `公历${input.year}-${pad(input.month)}-${pad(input.day)} ${pad(input.hour)}:${pad(input.minute || 0)} · `;
      $('bazi-head').textContent = `${input.gender} · ${solarEcho}${c.lunarText} · 属${c.shengXiao}`;
    }
    renderSolarLine(input); // 真太阳时开启则双行呈现钟表时/真太阳时时辰（异说 chip 复用 diverge 浮层）
    renderBaziArchetype(c); // 日主作为「你」；五行相对较少项以阴阳两位共同出现
    // 四柱
    const pr = $('bazi-pillars');
    pr.innerHTML = '';
    c.pillars.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'pillar' + (i === 2 ? ' daymaster' : '');
      card.style.animationDelay = `${i * 0.22}s`;
      card.innerHTML = `<small>${p.pos}</small>
        <b style="color:${C.EL_HEX[p.ganEl]};text-shadow:0 0 8px ${C.EL_HEX[p.ganEl]}66">${p.gan}</b>
        <b style="color:${C.EL_HEX[p.zhiEl]};text-shadow:0 0 8px ${C.EL_HEX[p.zhiEl]}66">${p.zhi}</b>
        <small class="nayin">${renderTerm('纳音', p.naYin)}</small>`;
      pr.appendChild(card);
    });
    renderBirthdayCard(input, c);   // B1 生辰黄历回放卡（命盘卡之后）
    // 五行条
    const bars = $('bazi-bars');
    bars.innerHTML = '';
    const max = Math.max(...C.ELEMENTS.map(e => c.scores[e]), 0.1);
    C.ELEMENTS.forEach(e => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = `<span style="color:${C.EL_HEX[e]}">${e}</span>
        <div class="bar"><i style="background:${C.EL_HEX[e]};box-shadow:0 0 6px ${C.EL_HEX[e]}88"></i></div>
        <em>${c.scores[e].toFixed(1)}</em>`;
      bars.appendChild(row);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        row.querySelector('i').style.width = (c.scores[e] / max * 100) + '%';
      }));
    });
    try { localStorage.setItem('bazi-wuxing', JSON.stringify(c.scores)); } catch (e) {} // 五行分值持久化，供堪舆页五行流光引擎
    try { localStorage.setItem('bazi-fav', JSON.stringify({ favorable: c.favorable, unfavorable: c.unfavorable })); } catch (e) {} // 喜用/忌神持久化，供开屏个性化选句 + 流光配色
    $('bazi-strength').innerHTML = isEN()
      ? `${renderTerm('日主')} ${escapeHtml(c.dm)} ${escapeHtml(elEN(c.dmEl))} · ${renderTerm('身强身弱', c.isStrong ? '身强 strong' : '身弱 weak')} · ${renderTerm('喜用')} ${escapeHtml(elsEN(c.favorable))}`
      : `${renderTerm('日主')}：${escapeHtml(c.dm)}${escapeHtml(c.dmEl)}·${renderTerm('身强身弱', c.isStrong ? '身强' : '身弱')} · ${renderTerm('喜用')}：${escapeHtml(c.favorable.join(' '))}`;
    try {
      const bz = C.computeBaZhai(input);
      const tri = C.TRIGRAMS[bz.mingGua];
      const groupEN = { '东四命': 'East Four Life group', '西四命': 'West Four Life group' };
      $('bazi-minggua').innerHTML = isEN()
        ? `${renderTerm('命卦')} (natal trigram): ${escapeHtml(tri.symbol)} ${escapeHtml(bz.mingGua)} (${escapeHtml(groupEN[bz.groupName] || bz.groupName)}) · per 《八宅明镜》 Bāzhái Míngjìng, birth year reckoned from ${renderTerm('立春', '立春 Lìchūn')} (Beginning of Spring)`
        : `${renderTerm('命卦')}：${escapeHtml(tri.symbol)} ${escapeHtml(bz.mingGua)}（${escapeHtml(bz.groupName)}）（八宅明镜，出生年以${renderTerm('立春')}为界）`;
    } catch (e) { $('bazi-minggua').textContent = ''; }
    if (isEN()) renderVerdictEN($('bazi-master'), verdictLineEN(c), C.masterBazi(c), 'en.verdict.original');
    else typewriter($('bazi-master'), C.masterBazi(c), 24, true); // 断语关键字着色（五行/纳音）
    renderBaziRelations(c);
    renderPersonalCalendar(input, c); // D1 个人历：排盘后显示，六因子独立月视图
    renderGujiCard(input); // 古籍论断卡（RuleKit 命中 → 双声部；异步加载，失败静默隐藏）
    if (window.AIReading && typeof AIReading.mount === 'function') AIReading.mount(input); // AI 深度解盘（试验）：藏于 ff-ai 旗标后，旗标未开则零痕迹
    // 所求
    const goals = $('bazi-goals');
    goals.innerHTML = '';
    C.GOALS.forEach(g => {
      const btn = document.createElement('button');
      btn.textContent = isEN() ? (GOAL_EN[g] || g) : g;
      btn.addEventListener('click', () => {
        goals.querySelectorAll('button').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        const adv = C.adviseGoal(c, g, input.gender);
        const gaEl = $('goal-advice');
        gaEl.style.display = '';
        if (isEN()) renderVerdictEN(gaEl, goalLineEN(adv), C.masterGoal(adv, c), 'en.goal.original');
        else typewriter(gaEl, C.masterGoal(adv, c), 20, true); // 断语关键字着色（五行/纳音）
        // 断语可能在视口外（所求 chip 在结果卡尾部）：滚入可视，与排盘结果同款交互
        setTimeout(() => { try { gaEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {} }, 60);
      });
      goals.appendChild(btn);
    });
    $('goal-advice').style.display = 'none';
  }

  // ===== 气韵粒子层（纯装饰）=====
  // 贴地 canvas，叠地图与 HUD 罗盘之间；未排盘=稀疏金色微粒缓慢漂移，
  // 排盘后=整体向本命「生气方」缓缓流动（方向由 qiFlowBearing 真规则给出，暗示「往哪走」）。
  // 无任何文字宣称。移动端 ≤120 粒；页面隐藏/离堪舆页暂停；prefers-reduced-motion 禁用。
  function createQiField(map) {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 2); // 可变：跨屏 DPR 变化时 resize() 重取
    const isMobile = (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) || ('ontouchstart' in window);
    const container = map.getContainer();
    const cv = document.createElement('canvas');
    cv.className = 'qi-canvas';
    cv.style.zIndex = 450; // 高于瓦片(200)/矢量(400)，低于标记(600)——装饰不挡交互
    container.appendChild(cv);
    const ctx = cv.getContext('2d');
    let active = false, paused = false, rafId = null, parts = [], tms = 0, ambient = 0.6;

    function dims() { return { w: cv.width / dpr, h: cv.height / dpr }; }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2); // 每次重取 dpr（codex P2：DPR 变化跟进）
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
      if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; } // 宽高任一变即重置背板（codex P2：高度单变亦跟进）
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function targetCount() {
      const { w, h } = dims();
      const cap = isMobile ? 120 : 200;         // 移动端硬顶 120 粒
      return Math.max(30, Math.min(cap, Math.round(w * h / 7000)));
    }
    function spawn(p) {
      const { w, h } = dims();
      p.x = Math.random() * w; p.y = Math.random() * h; p.age = 0;
      p.life = 120 + (Math.random() * 180 | 0); p.j = (Math.random() - 0.5); p.sp = 0.25 + Math.random() * 0.4;
    }
    function reseed() { const n = targetCount(); parts = []; for (let k = 0; k < n; k++) { const p = {}; spawn(p); p.age = Math.random() * p.life | 0; parts.push(p); } }
    // 流向：排盘后指生气方（罗盘方位→屏幕角，随 heading 旋转贴地）；未排盘缓慢环绕漂移
    function flowVec() {
      if (qiFlowBearing != null) { const s = (qiFlowBearing - heading) * Math.PI / 180; return { vx: Math.sin(s), vy: -Math.cos(s), on: true }; }
      return { vx: Math.cos(ambient), vy: Math.sin(ambient), on: false };
    }
    function frame() {
      if (!active || paused) { rafId = null; return; } // codex P2：暂停即停止调度，不留空转 RAF
      rafId = requestAnimationFrame(frame);
      const { w, h } = dims();
      if (!w || !h) return;
      tms++; ambient += 0.0009;                 // 环境角缓慢漂移
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(0, 0, w, h); // 拖尾，不暗化底图
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const f = flowVec(), speedMul = f.on ? 1.35 : 0.7;
      const ac = auraRGB || AURA_GOLD, acPfx = ac.r + ',' + ac.g + ',' + ac.b + ','; // 五行流光：粒子染当前气色（未排盘=金）
      for (let k = 0; k < parts.length; k++) {
        const p = parts[k];
        const vx = f.vx + p.j * 0.35, vy = f.vy + p.j * 0.35, sp = p.sp * speedMul;
        const nx = p.x + vx * sp, ny = p.y + vy * sp;
        const alpha = (f.on ? 0.10 : 0.055) + 0.05 * Math.sin((tms + k * 13) * 0.02);
        ctx.strokeStyle = 'rgba(' + acPfx + Math.max(0, alpha).toFixed(3) + ')';
        ctx.lineWidth = f.on ? 1.1 : 0.8;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; p.age++;
        if (p.age > p.life || p.x < -4 || p.x > w + 4 || p.y < -4 || p.y > h + 4) spawn(p);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function start() { if (reduceMotion) return; if (active && !paused && !rafId) rafId = requestAnimationFrame(frame); }
    document.addEventListener('visibilitychange', () => {
      paused = document.hidden;
      if (paused) { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } } // codex P2：隐藏即取消已调度 RAF
      else start();
    });
    const onResize = () => { resize(); if (parts.length !== targetCount()) reseed(); };
    map.on('resize', onResize); window.addEventListener('resize', onResize);
    resize(); reseed();
    return {
      setActive(on) {
        active = on && !reduceMotion;
        if (active) { resize(); if (!parts.length) reseed(); start(); }
        else if (rafId) { cancelAnimationFrame(rafId); rafId = null; const { w, h } = dims(); ctx.clearRect(0, 0, w, h); }
      },
    };
  }

  // ===== 堪舆合并页：Leaflet 地图打底 + 悬浮 HUD 罗盘 =====
  function initKanyu() {
    // rotate/touchRotate 由 leaflet-rotate 插件提供（未加载则被忽略，退回北上不旋转）
    const map = L.map('veinmap', { zoomControl: true, rotate: true, rotateControl: false, touchRotate: true, bearing: 0 }).setView([1.3521, 103.8198], 13);
    window._veinMap = map;
    const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/', esriAttr = 'Tiles © Esri';
    // 水墨底＝默认视觉：空 layerGroup，不挂任何瓦片；#veinmap 常驻水墨 CSS 渐变即底（无瓦片请求）
    const ink = L.layerGroup();
    const esri = L.tileLayer(ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: esriAttr + ' — Source: Esri, Maxar, Earthstar Geographics' });
    const relief = L.tileLayer(ESRI + 'Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: esriAttr + ' — 晕渲地貌' });        // 显山形
    const darkmap = L.tileLayer(ESRI + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: esriAttr + ' — 暗灰画布' });
    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenTopoMap (CC-BY-SA) · © OpenStreetMap' });
    const oneDay = L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', { minZoom: 11, maxZoom: 19, attribution: '© OneMap · © SLA' });
    const oneNight = L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Night/{z}/{x}/{y}.png', { minZoom: 11, maxZoom: 19, attribution: '© OneMap · © SLA' });
    // 稳定 id ↔ 图层：持久化存 id 而非展示名（改名不失效）。ink 置顶为默认选中
    const BASEMAPS = { ink: ink, esri: esri, relief: relief, dark: darkmap, topo: topo, oneday: oneDay, onenight: oneNight };
    const baseIdOf = (layer) => { for (const k in BASEMAPS) if (BASEMAPS[k] === layer) return k; return null; };
    const mapContainer = map.getContainer();
    let currentBasemap = null; // 追踪当前底图 id（不用 map.hasLayer——e2e stub 无此法）
    // 水墨态 chrome：隐藏缩放键/比例尺（对空底无意义），切瓦片层即恢复；地图拖动始终可用（只隐控件）
    function applyBasemapChrome(id) {
      mapContainer.classList.toggle('ink-basemap', id === 'ink');
      recomputeKanyuTopOffset(); // 水墨↔瓦片切换会增删缩放钮 → 重算顶偏移，保证 #kanyu-top 恒在角钮之下
    }
    // 程序化切底图：移除其余 base、挂目标、记 chrome + 持久化（瓦片类另记 kanyu-basemap-tile 供勘察联动）
    function setBasemap(id, persist) {
      if (!BASEMAPS[id]) id = 'ink';
      const target = BASEMAPS[id];
      for (const k in BASEMAPS) { if (k !== id) map.removeLayer(BASEMAPS[k]); }
      map.addLayer(target);
      currentBasemap = id;
      applyBasemapChrome(id);
      if (persist !== false) {
        try { localStorage.setItem('kanyu-basemap', id); } catch (e) {}
        if (id !== 'ink') { try { localStorage.setItem('kanyu-basemap-tile', id); } catch (e) {} }
      }
    }
    // 初始：恢复上次选择；老用户/未存过一律回落水墨（产品决策，不迁就旧默认卫星行为）
    let savedBasemap = 'ink';
    try { const s = localStorage.getItem('kanyu-basemap'); if (s && BASEMAPS[s]) savedBasemap = s; } catch (e) {}
    setBasemap(savedBasemap, false); // 恢复不回写（避免无谓 write）
    L.control.layers({
      '水墨 · 空相': ink,
      '卫星 · Esri': esri,
      '晕渲地势 · 显山形': relief,
      '墨色 · 暗地图': darkmap,
      '地形 · 等高线': topo,
      'OneMap·日 (SG)': oneDay,
      'OneMap·夜 (SG)': oneNight,
    }, null, { position: 'topright', collapsed: true }).addTo(map);
    // 用户在图层控件里切底图：Leaflet 仅在 UI 点击时 fire baselayerchange（程序切换不 fire）→ 持久化 + chrome
    map.on('baselayerchange', (e) => {
      const id = baseIdOf(e.layer) || 'ink';
      currentBasemap = id;
      applyBasemapChrome(id);
      try { localStorage.setItem('kanyu-basemap', id); } catch (er) {}
      if (id !== 'ink') { try { localStorage.setItem('kanyu-basemap-tile', id); } catch (er) {} }
    });
    // 勘察联动：进「阳宅」时若为水墨（无瓦片），自动挂上次瓦片类底图（无记录→Esri 卫星）+ HUD toast；退出不自动切回
    window._kanyuEnsureTileForSurvey = function () {
      if (currentBasemap !== 'ink') return;
      let tileId = 'esri';
      try { const t = localStorage.getItem('kanyu-basemap-tile'); if (t && BASEMAPS[t] && t !== 'ink') tileId = t; } catch (e) {}
      setBasemap(tileId, true);
      toast(tt('toast.switched_satellite'));
    };

    // 气韵粒子层（纯装饰，叠地图与 HUD 之间）：进堪舆页即活
    try { window._qiField = createQiField(map); window._qiField.setActive(true); } catch (e) { window._qiField = null; }

    // 当前位置：蓝点 + 精度圈（WGS-84 直接落点，无需纠偏）
    let posDot = null, posRing = null;
    function showPosition(lat, lon, accuracy, recenter) {
      const ll = [lat, lon];
      if (posRing) { map.removeLayer(posRing); posRing = null; }
      if (posDot) { map.removeLayer(posDot); posDot = null; }
      if (accuracy > 0) posRing = L.circle(ll, { radius: accuracy, color: '#4aa3c7', weight: 1, opacity: .35, fillColor: '#4aa3c7', fillOpacity: .1 }).addTo(map);
      posDot = L.circleMarker(ll, { radius: 7, color: '#fff', weight: 2, fillColor: '#4aa3c7', fillOpacity: 1 }).addTo(map);
      if (recenter) { if (posRing) map.fitBounds(posRing.getBounds(), { maxZoom: 16 }); else map.setView(ll, 16); }
    }
    function locate(opts) {
      opts = opts || {};
      if (!navigator.geolocation) { if (!opts.silent) toast(tt('toast.geo_unsupported')); return; }
      navigator.geolocation.getCurrentPosition(
        p => { showPosition(p.coords.latitude, p.coords.longitude, p.coords.accuracy, true); applyHerePosition(p.coords.latitude, p.coords.longitude, p.coords.accuracy); },
        err => { if (!opts.silent) toast(err.code === 1 ? tt('toast.geo_denied') : tt('toast.geo_retry')); },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }

    // HUD 罗盘 + 控制条（「回我」= 统一定位）
    wireCompassHud(() => locate());

    // 地图随罗盘转（heading-up）：默认图北上；点「图北」切「随身转」，朝向变即转地图（节流>2°）
    let rotateWithHeading = false, lastBearing = 0;
    function applyBearing(hd) {
      if (!map.setBearing || !rotateWithHeading) return;
      if (!$('page-kanyu').classList.contains('active')) return; // 离开堪舆页就别再转隐藏的地图，省电
      if (Math.abs(((hd - lastBearing + 540) % 360) - 180) < 2) return; // 节流，省瓦片重渲染
      lastBearing = hd; map.setBearing(C.norm(hd));
    }
    onHeadingChange = applyBearing;
    const rotBtn = $('btn-rotate');
    if (rotBtn) rotBtn.addEventListener('click', () => {
      if (!map.setBearing) { toast(tt('toast.rotate_unsupported')); return; }
      rotateWithHeading = !rotateWithHeading;
      rotBtn.classList.toggle('locked', rotateWithHeading);
      rotBtn.textContent = rotateWithHeading ? '随身转' : '图北';
      $('mapnorth-tick').style.display = rotateWithHeading ? 'none' : '';
      if (rotateWithHeading) { lastBearing = -999; applyBearing(heading); }
      else { map.setBearing(0); lastBearing = 0; } // 复位北上
    });

    // 进页：定尺 → 画盘 → 静默定位落点
    setTimeout(() => { try { map.invalidateSize(); drawLuopan(); locate({ silent: true }); recomputeKanyuTopOffset(); } catch (e) { /* 首化失败静默 */ } }, 200);

    initYangzhaiOverlay();

    // ─── 户型叠图·旧 FPLayer 浮层已退役 ────────────────────────────────────────
    // 旧路径（fpLayerCreate + #fp-ctrl 浮层 + 开页即挂 12m×10m 巨型示例）造成
    // 「巨型户型糊满全屏 / 浮层压按钮列 / 调整锁定导入磁偏角挤一面板」三大病灶，
    // 已整体退役。户型叠图统一走 FloorplanOverlay + #fp-wizard 三步向导（见 fpToggle/fpWizard*）。
    window._fpLayer = null;
  }

  // ===== 非八字分享卡：黄历 payload 组装 + 入口挂接 =====
  // 八字命盘不提供分享；这里只为黄历卡准备本地 canvas 数据。
  function sharePlainSummary(yi, ji) {
    const en = isEN();
    const yv = pickVerbs(yi, 2, en), jv = pickVerbs(ji, 2, en);
    if (!yv.length && !jv.length) return '';
    if (en) {
      const parts = [];
      if (yv.length) parts.push('good for ' + yv.join(', '));
      if (jv.length) parts.push('avoid ' + jv.join(', '));
      return 'Today · ' + parts.join('; ');
    }
    const parts = [];
    if (yv.length) parts.push('适合' + yv.join('、'));
    if (jv.length) parts.push('避开' + jv.join('、'));
    return '今天：' + parts.join('；');
  }
  function shareJieqiLine(a) {
    if (isEN()) {
      return a.jieQiToday ? ('節 ' + a.jieQiToday + ' begins today')
        : (a.currentJieQi ? ('in 節 ' + a.currentJieQi + ' · ' + a.nextJieQiDate + ' → ' + a.nextJieQi) : '');
    }
    return a.jieQiToday ? ('今日交节：' + a.jieQiToday)
      : ('「' + a.currentJieQi + '」气中 · ' + a.nextJieQiDate + '交' + a.nextJieQi);
  }
  function shareAlmanacPayload() {
    const now = new Date();
    const a = C.dailyAlmanac(now);
    const pad = n => String(n).padStart(2, '0');
    return {
      solarText: isEN() ? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` : a.solarText,
      weekText: isEN() ? (WEEK_EN[now.getDay()] || '') : a.weekText,
      lunarText: a.lunarText,                 // 农历… 保中文数据 token（两语一致）
      ganZhiText: a.ganZhiText,
      jieqiLine: shareJieqiLine(a),
      plain: sharePlainSummary(a.yi, a.ji),
      yi: (a.yi || []).slice(0, 4),
      ji: (a.ji || []).slice(0, 4)
    };
  }
  function wireShareCards() {
    if (!window.ShareCard) return;                 // 脚本缺失则静默（不报错·优雅降级）
    const aBtn = $('share-almanac-btn');
    if (aBtn && !aBtn._wired) {
      aBtn._wired = true;
      aBtn.addEventListener('click', () => { try { window.ShareCard.openAlmanac(shareAlmanacPayload()); } catch (e) {} });
    }
  }

  // ===== 启动 =====
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    document.querySelectorAll('.disclaimer').forEach(el => { el.textContent = C.DISCLAIMER; });
    refreshShugeInline();  // 解析 dian base 是否同源，决定深链走内嵌 iframe 还是新标签
    initOpening();
    renderToday();
    wireTodayDrawers();
    initClock();
    initBazi();
    wireShareCards();
    document.addEventListener('changming-theme-change', () => {
      let chart = currentCharacterChart;
      if (!chart) {
        try {
          const input = JSON.parse(localStorage.getItem('bazi-input') || 'null');
          if (input) chart = C.computeBazi(input);
        } catch (e) { chart = null; }
      }
      if (chart) {
        currentCharacterChart = chart;
        renderBaziArchetype(chart);
        renderTodayCharacterStory(chart);
      }
    });
  });
})();
