// RuleKit —— 古籍规则库运行时解释器（纯查表，无 eval、无 LLM、无随机）。
//
// 数据：daos/data/rules/rules.v1.json（G1 首批 384 条，句级溯源）。
// 加载：localStorage['rulekit-base'] 覆写 → CitePop.resolveDianBase()（生产同源 /dian，dev 回落线上 daos）；内存缓存。
// 求值：evaluate(facts)（facts 由 window.ChartFacts 产出）逐规则判 when 谓词树；
//   规则 requires 或其谓词所需能力不在 facts.capabilities → 该规则跳过并计数（不误判为不命中）。
//   命中按 status 分流：active→hits（古籍论断），disputed→disputed（诸家异说）；unreviewed=true 规则不参与（held）。
(function (global) {
  'use strict';

  var C = global.DaoCore;

  // 谓词 → 所需能力（facts.capabilities 的键）
  var PRED_CAP = {
    gender: 'bazi', day_master: 'bazi', day_master_element: 'bazi', day_master_strength: 'strength',
    has_stem: 'bazi', has_branch: 'bazi', has_element: 'bazi', pillar_gan: 'bazi', pillar_zhi: 'bazi',
    nayin: 'nayin', month_branch: 'bazi', season: 'season',
    ten_god_present: 'shishen', ten_god_at: 'shishen', ten_god_count: 'shishen',
    twelve_stage: 'dishi',
    branch_relation: 'branchrel', stem_combo: 'branchrel',
    gaitou: 'bazi', tougan: 'bazi', xunkong: 'xunkong',
    shensha: 'shensha',
    luck_ten_god: 'dayun', luck_element: 'dayun', luck_twelve_stage: 'dayun',
    ming_gua: 'minggua', ming_gua_group: 'minggua',
    facing_mountain: 'compass', sitting_mountain: 'compass', facing_gua: 'compass', sitting_gua: 'compass', younian_star: 'compass',
    year_zhi: 'liunian', year_gan: 'liunian',
    annual_sha_at: 'annual_sha'
  };

  // requires 原始 token（编译期噪声较多）→ 规范能力名
  function normReq(tok) {
    if (/shishen/.test(tok)) return 'shishen';
    if (/dayun/.test(tok)) return 'dayun';
    if (/branchrel/.test(tok)) return 'branchrel';
    if (/shensha/.test(tok)) return 'shensha';
    if (/dishi/.test(tok)) return 'dishi';
    if (/xinji|annual/.test(tok)) return 'annual_sha';
    return null;
  }

  // ---- 加载 ----
  function dataBase() {
    try { var o = localStorage.getItem('rulekit-base'); if (o) return Promise.resolve(o); } catch (_) {}
    return (global.CitePop && global.CitePop.resolveDianBase) ? global.CitePop.resolveDianBase() : Promise.resolve('/dian');
  }
  var _rulesP = null, _rules = null;
  function load() {
    if (_rulesP) return _rulesP;
    _rulesP = dataBase().then(function (base) {
      return fetch(base + '/data/rules/rules.v1.json').then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();                       // 非 JSON（如 dev 回落命中 SPA HTML）→ 抛错 → 下方 catch → null
      });
    }).then(function (data) {
      _rules = (data && Array.isArray(data.rules)) ? data.rules : [];
      return _rules;
    }).catch(function () { _rules = null; return null; });
    return _rulesP;
  }

  // ---- 谓词求值 ----
  function anyStem(facts, gan) { return facts.stems.indexOf(gan) >= 0; }
  function anyBranch(facts, zhi) { return facts.branches.indexOf(zhi) >= 0; }
  function tenGodPresent(facts, god, where) {
    if (where && where !== 'any') {
      if (facts.tenGodGan[where] === god) return true;
      return (facts.tenGodZhi[where] || []).indexOf(god) >= 0;
    }
    var pos = ['year', 'month', 'day', 'hour'];
    for (var i = 0; i < 4; i++) {
      var p = pos[i];
      if (facts.tenGodGan[p] === god) return true;
      if ((facts.tenGodZhi[p] || []).indexOf(god) >= 0) return true;
    }
    return false;
  }
  function countGod(facts, god) {
    var n = 0; for (var i = 0; i < facts.tenGodAll.length; i++) if (facts.tenGodAll[i] === god) n++; return n;
  }
  function cmpOp(a, op, b) { return op === '>=' ? a >= b : op === '<=' ? a <= b : a === b; }
  function elementCount(facts, el) {
    var n = 0;
    facts.stems.forEach(function (g) { if (C.GAN_EL[g] === el) n++; });
    facts.branches.forEach(function (z) { if (C.ZHI_EL[z] === el) n++; });
    return n;
  }

  function evalPred(node, facts) {
    var a = node.args || {};
    switch (node.p) {
      case 'gender': return facts.gender === a.v;
      case 'day_master': return facts.dayMaster === a.gan;
      case 'day_master_element': return facts.dayMasterElement === a.el;
      case 'day_master_strength': return facts.strength === a.v;
      case 'has_stem': return (a.where && a.where !== 'any') ? (facts.pillars[a.where] && facts.pillars[a.where].gan === a.gan) : anyStem(facts, a.gan);
      case 'has_branch': return (a.where && a.where !== 'any') ? (facts.pillars[a.where] && facts.pillars[a.where].zhi === a.zhi) : anyBranch(facts, a.zhi);
      case 'has_element': return elementCount(facts, a.el) >= (a.min || 1);
      case 'pillar_gan': return facts.pillars[a.pos] && facts.pillars[a.pos].gan === a.gan;
      case 'pillar_zhi': return facts.pillars[a.pos] && facts.pillars[a.pos].zhi === a.zhi;
      case 'nayin': return facts.pillars[a.pos] && facts.pillars[a.pos].naYin === a.v;
      case 'month_branch': return facts.monthBranch === a.zhi;
      case 'season': return !!(facts.seasonSet && facts.seasonSet[a.v]);
      case 'ten_god_present': return tenGodPresent(facts, a.god, a.where);
      case 'ten_god_at': return facts.tenGodGan[a.pos] === a.god;
      case 'ten_god_count': return cmpOp(countGod(facts, a.god), a.cmp, a.n);
      case 'twelve_stage': {
        var pos = ['year', 'month', 'day', 'hour'];
        for (var i = 0; i < 4; i++) {
          var p = pos[i];
          if (facts.pillars[p].zhi === a.zhi && facts.twelveStage[p] === a.stage) return true;
        }
        return false;
      }
      case 'branch_relation': {
        var cnt = {}; facts.branches.forEach(function (z) { cnt[z] = (cnt[z] || 0) + 1; });
        var need = {}; (a.members || []).forEach(function (z) { need[z] = (need[z] || 0) + 1; });
        return Object.keys(need).every(function (z) { return (cnt[z] || 0) >= need[z]; });
      }
      case 'stem_combo': return anyStem(facts, a.pair[0]) && anyStem(facts, a.pair[1]);
      case 'gaitou': {
        return ['year', 'month', 'day', 'hour'].some(function (p) {
          var pl = facts.pillars[p];
          return pl.gan === a.gan && pl.zhi === a.zhi && C.CONTROLS[C.GAN_EL[a.gan]] === C.ZHI_EL[a.zhi];
        });
      }
      case 'tougan': return anyStem(facts, a.gan) && hiddenHas(facts, a.gan);
      case 'xunkong': return facts.xunkong.indexOf(a.zhi) >= 0;
      case 'shensha': return !!(facts.shensha && facts.shensha[a.name]);
      case 'luck_ten_god': return !!facts.luck && facts.luck.tenGodGan === a.god;
      case 'luck_element': return !!facts.luck && (facts.luck.ganEl === a.el || facts.luck.zhiEl === a.el);
      case 'luck_twelve_stage': return !!facts.luck && facts.luck.twelveStage === a.stage;
      case 'ming_gua': return facts.mingGua === a.gua;
      case 'ming_gua_group': return facts.mingGuaGroup === a.v;
      case 'year_zhi': return !!facts.year && facts.year.zhi === a.zhi;
      case 'year_gan': return !!facts.year && facts.year.gan === a.gan;
      // compass / annual_sha 谓词：八字盘不提供该能力，规则已在能力门被跳过，不应抵达此处
      default: return false;
    }
  }
  function hiddenHas(facts, gan) {
    return ['year', 'month', 'day', 'hour'].some(function (p) {
      return (facts.pillars[p].hidden || []).indexOf(gan) >= 0;
    });
  }

  function evalNode(node, facts) {
    if (node.p) return evalPred(node, facts);
    var saw = false, res = true;
    if (node.all) { saw = true; res = res && node.all.every(function (x) { return evalNode(x, facts); }); }
    if (node.any) { saw = true; res = res && node.any.some(function (x) { return evalNode(x, facts); }); }
    if (node.not) { saw = true; res = res && !evalNode(node.not, facts); }
    return saw ? res : false;
  }

  // 收集规则 when 树内全部谓词名
  function collectPreds(node, set) {
    if (!node || typeof node !== 'object') return set;
    if (node.p) set[node.p] = true;
    ['all', 'any', 'not'].forEach(function (k) {
      if (node[k] != null) {
        var v = node[k];
        (Array.isArray(v) ? v : [v]).forEach(function (x) { collectPreds(x, set); });
      }
    });
    return set;
  }

  function missingCaps(rule, caps) {
    var out = { req: [], pred: [] };
    (rule.requires || []).forEach(function (tok) {
      var cap = normReq(tok);
      if (cap && !caps[cap] && out.req.indexOf(cap) < 0) out.req.push(cap);
    });
    var pset = collectPreds(rule.when, {});
    Object.keys(pset).forEach(function (p) {
      var cap = PRED_CAP[p];
      if (cap && !caps[cap] && out.pred.indexOf(cap) < 0) out.pred.push(cap);
    });
    return out;
  }

  // 该规则是否引用某组谓词（供「今日触发」筛流年规则）
  function usesPredicate(rule, names) {
    var pset = collectPreds(rule.when, {});
    return names.some(function (n) { return pset[n]; });
  }

  function evaluate(facts) {
    var stats = { total: 0, held: 0, skippedRequires: 0, skippedCapability: 0, notMatched: 0, matchedActive: 0, matchedDisputed: 0 };
    var hits = [], disputed = [];
    if (!_rules) return { hits: hits, disputed: disputed, stats: stats, loaded: false };
    var caps = facts.capabilities || {};
    for (var i = 0; i < _rules.length; i++) {
      var r = _rules[i];
      stats.total++;
      if (r.unreviewed === true) { stats.held++; continue; }
      var miss = missingCaps(r, caps);
      if (miss.req.length) { stats.skippedRequires++; continue; }
      if (miss.pred.length) { stats.skippedCapability++; continue; }
      var ok = false;
      try { ok = evalNode(r.when, facts); } catch (_) { ok = false; }
      if (!ok) { stats.notMatched++; continue; }
      if (r.status === 'disputed') { disputed.push(r); stats.matchedDisputed++; }
      else { hits.push(r); stats.matchedActive++; }
    }
    return { hits: hits, disputed: disputed, stats: stats, loaded: true };
  }

  // ---- 异说配对（同前件·反极性 → 对峙对）----
  // 语义：两条 disputed 规则的 when 树「结构等价」（谓词集合相同·序无关）且极性反号，构成对峙对。
  // 铁律：只在「同一前件下恰好两说、且一褒一贬」时成对——组内 >2 条、同号、含 0（无号）、或单条，
  //   一律不成对（保 §1.4「两枚绝对对称纸笺」与克制清单#7「不偷偷背书」：任何取舍/合并都会隐性背书），
  //   维持既有单条列表。纯查表，无裁决。
  function stableArgs(a) {
    if (a == null || typeof a !== 'object') return '';
    return Object.keys(a).sort().map(function (k) {
      var v = a[k];
      return k + '=' + (Array.isArray(v) ? v.slice().sort().join('+') : String(v));
    }).join(';');
  }
  // when 树 → 规范签名：谓词写作 P{p:args}，all/any 子节点排序后入括号，not 保留；
  //   同一谓词集合、无论书写次序，签名恒等。
  function whenSignature(node) {
    if (!node || typeof node !== 'object') return '';
    if (node.p) return 'P{' + node.p + ':' + stableArgs(node.args) + '}';
    var parts = [];
    ['all', 'any'].forEach(function (k) {
      if (node[k] != null) {
        var arr = (Array.isArray(node[k]) ? node[k] : [node[k]]).map(whenSignature).sort();
        parts.push(k + '[' + arr.join(',') + ']');
      }
    });
    if (node.not != null) parts.push('not(' + whenSignature(node.not) + ')');
    return parts.sort().join('&');
  }
  function polSign(p) { p = +p || 0; return p > 0 ? 1 : (p < 0 ? -1 : 0); }

  // disputed 列表 → { pairs:[[a,b],…], unpaired:[…] }。
  //   pairs：每对为同前件·反极性的两条，组内先按 id 升序（渲染层再据成书年代定左右）。
  //   unpaired：其余 disputed，保持传入顺序（既有单条渲染）。
  function pairDisputed(disputed) {
    disputed = disputed || [];
    var groups = {}, order = [];
    disputed.forEach(function (r) {
      var sig = whenSignature(r.when);
      if (!groups[sig]) { groups[sig] = []; order.push(sig); }
      groups[sig].push(r);
    });
    var pairs = [], pairedIds = {};
    order.forEach(function (sig) {
      var g = groups[sig];
      if (g.length === 2 && polSign(g[0].polarity) * polSign(g[1].polarity) < 0) {
        var pair = g.slice().sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
        pairs.push(pair);
        pairedIds[pair[0].id] = true; pairedIds[pair[1].id] = true;
      }
    });
    var unpaired = disputed.filter(function (r) { return !pairedIds[r.id]; });
    return { pairs: pairs, unpaired: unpaired };
  }

  global.RuleKit = {
    load: load,
    evaluate: evaluate,
    usesPredicate: usesPredicate,
    pairDisputed: pairDisputed,
    whenSignature: whenSignature,
    isLoaded: function () { return !!_rules; },
    _predCap: PRED_CAP
  };
})(typeof window !== 'undefined' ? window : this);
