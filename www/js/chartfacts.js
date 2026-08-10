// ChartFacts —— 八字事实层（命理域 RuleKit 谓词的唯一输入）。
//
// 输入：排盘 input（{gender:'乾造'|'坤造', isLunar, year, month, day, hour, minute}）。
// 依赖：全局 Lunar/Solar（lunar-javascript，提供十神/十二长生/大运）+ window.DaoCore（五行表、computeBazi、computeBaZhai）。
// 产出：一个纯数据 facts 对象，供 RuleKit.evaluate 逐谓词查表求值（无 DOM、无判断）。
//
// 能力声明（capabilities）：facts 自报能提供哪些谓词族的证据。
//   恒有（由 lunar/core 直接算得）：bazi/strength/season/nayin/xunkong/minggua/shishen/dishi/dayun/liunian。
//   条件（需查表文件加载成功）：branchrel（地支关系/天干五合）、shensha（神煞）。
//   不提供（八字盘无罗盘/年神方位）：compass、annual_sha —— 相关规则由 RuleKit 按能力跳过。
// 查表文件（daos/data/rules/tables/*.json）为权威源，运行时 fetch + 内存缓存；加载失败则静默降级、撤销对应能力。
(function (global) {
  'use strict';

  var C = global.DaoCore;
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  // 日干长生宫（阳干顺行、阴干逆行推十二长生）——与 lunar EightChar.getXxxDiShi 同口径（已对预置盘四柱逐一比对一致）
  var CHANGSHENG = { 甲: '亥', 丙: '寅', 戊: '寅', 庚: '巳', 壬: '申', 乙: '午', 丁: '酉', 己: '酉', 辛: '子', 癸: '卯' };
  var YANG_GAN = '甲丙戊庚壬';
  // 月支 → 所属季节集合（辰未戌丑 兼属四季月）
  var SEASON_MAIN = { 寅: '春', 卯: '春', 辰: '春', 巳: '夏', 午: '夏', 未: '夏', 申: '秋', 酉: '秋', 戌: '秋', 亥: '冬', 子: '冬', 丑: '冬' };
  var SIJI_MONTHS = { 辰: 1, 未: 1, 戌: 1, 丑: 1 };
  var POS_KEYS = ['year', 'month', 'day', 'hour'];

  function twelveStageAt(dayGan, zhi) {
    var start = ZHI.indexOf(CHANGSHENG[dayGan]);
    var zi = ZHI.indexOf(zhi);
    if (start < 0 || zi < 0) return null;
    var diff = (YANG_GAN.indexOf(dayGan) >= 0) ? (zi - start) : (start - zi);
    return STAGES[((diff % 12) + 12) % 12];
  }

  // ---- 查表文件加载（与 rulekit.js 同源策略：localStorage 覆写 → CitePop.resolveDianBase）----
  function dataBase() {
    try { var o = localStorage.getItem('rulekit-base'); if (o) return Promise.resolve(o); } catch (_) {}
    return (global.CitePop && global.CitePop.resolveDianBase) ? global.CitePop.resolveDianBase() : Promise.resolve('/dian');
  }
  var _tablesP = null;
  function loadTables() {
    if (_tablesP) return _tablesP;
    _tablesP = dataBase().then(function (base) {
      function one(rel) {
        return fetch(base + rel).then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.json();
        }).catch(function () { return null; });   // 单表失败不拖垮另一表
      }
      return Promise.all([
        one('/data/rules/tables/branch-relations.json'),
        one('/data/rules/tables/shensha.json')
      ]).then(function (arr) { return { branch: arr[0], shensha: arr[1] }; });
    }).catch(function () { return { branch: null, shensha: null }; });
    return _tablesP;
  }

  // ---- 地支关系扫描 ----
  function branchCount(branches) {
    var m = {};
    branches.forEach(function (z) { m[z] = (m[z] || 0) + 1; });
    return m;
  }
  function membersPresent(members, cnt) {
    var need = {};
    members.forEach(function (z) { need[z] = (need[z] || 0) + 1; });
    return Object.keys(need).every(function (z) { return (cnt[z] || 0) >= need[z]; });
  }
  function scanBranchRelations(tbl, branches, stems) {
    var hits = [];
    if (!tbl) return hits;
    var cnt = branchCount(branches);
    ['六冲', '六合', '六害', '自刑'].forEach(function (rel) {
      (tbl[rel] || []).forEach(function (mem) {
        if (membersPresent(mem, cnt)) hits.push({ rel: rel, members: mem.slice() });
      });
    });
    ['三合', '三会'].forEach(function (rel) {
      (tbl[rel] || []).forEach(function (o) {
        if (membersPresent(o.members, cnt)) hits.push({ rel: rel, members: o.members.slice(), element: o.element });
      });
    });
    (tbl['三刑'] || []).forEach(function (o) {
      if (membersPresent(o.members, cnt)) hits.push({ rel: '三刑', members: o.members.slice(), name: o.name });
    });
    var stemSet = {};
    stems.forEach(function (g) { stemSet[g] = true; });
    var combos = [];
    (tbl['天干五合'] || []).forEach(function (o) {
      if (stemSet[o.pair[0]] && stemSet[o.pair[1]]) combos.push({ pair: o.pair.slice(), element: o.element });
    });
    return { relations: hits, stemCombos: combos };
  }

  // ---- 神煞扫描 ----
  var ZHI_GROUP = { 申: '申子辰', 子: '申子辰', 辰: '申子辰', 寅: '寅午戌', 午: '寅午戌', 戌: '寅午戌', 巳: '巳酉丑', 酉: '巳酉丑', 丑: '巳酉丑', 亥: '亥卯未', 卯: '亥卯未', 未: '亥卯未' };
  function scanShensha(tbl, dayGan, yearZhi, dayZhi, monthZhi, branches, stems) {
    var hit = {};
    if (!tbl) return hit;
    var brSet = {}; branches.forEach(function (z) { brSet[z] = true; });
    var stSet = {}; stems.forEach(function (g) { stSet[g] = true; });
    function markIf(name, target) { if (target != null && (brSet[target] || stSet[target])) hit[name] = true; }
    // byDayGan（单支 or 多支）
    ['羊刃', '禄神', '天乙贵人'].forEach(function (name) {
      var def = tbl[name]; if (!def || def.method !== 'byDayGan') return;
      var t = def.byDayGan[dayGan];
      if (Array.isArray(t)) { if (t.some(function (z) { return brSet[z]; })) hit[name] = true; }
      else markIf(name, t);
    });
    // byZhiGroup：年支或日支所属三合局
    ['桃花', '驿马', '华盖', '将星'].forEach(function (name) {
      var def = tbl[name]; if (!def || def.method !== 'byZhiGroup') return;
      [yearZhi, dayZhi].forEach(function (z) {
        var g = ZHI_GROUP[z]; if (g && brSet[def.byZhiGroup[g]]) hit[name] = true;
      });
    });
    // 天德（按月支）
    (function () { var def = tbl['天德']; if (def && def.method === 'byMonthZhi') markIf('天德', def.byMonthZhi[monthZhi]); })();
    // 月德（按月支三合局）
    (function () { var def = tbl['月德']; if (def && def.method === 'byMonthGroup') { var g = ZHI_GROUP[monthZhi]; if (g) markIf('月德', def.byMonthGroup[g]); } })();
    // 倒戈（天干含戊，spec 封闭口径）
    (function () { var def = tbl['倒戈']; if (def && def.method === 'stemHas' && stSet[def.stemHas]) hit['倒戈'] = true; })();
    return hit;
  }

  // ---- 主构建 ----
  function build(input, opts) {
    opts = opts || {};
    var tables = opts.tables || { branch: null, shensha: null };
    var solar = input.isLunar
      ? Lunar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute || 0, 0).getSolar()
      : Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute || 0, 0);
    var lunar = solar.getLunar();
    var ec = lunar.getEightChar();
    var bz = C.computeBazi(input);
    var bazhai = null;
    try { bazhai = C.computeBaZhai(input); } catch (_) {}

    var pillars = {
      year: bz.pillars[0], month: bz.pillars[1], day: bz.pillars[2], hour: bz.pillars[3]
    };
    var stems = [pillars.year.gan, pillars.month.gan, pillars.day.gan, pillars.hour.gan];
    var branches = [pillars.year.zhi, pillars.month.zhi, pillars.day.zhi, pillars.hour.zhi];
    var dayGan = bz.dm;

    // 十神
    var tenGodGan = {
      year: ec.getYearShiShenGan(), month: ec.getMonthShiShenGan(),
      day: ec.getDayShiShenGan(), hour: ec.getTimeShiShenGan()
    };
    var tenGodZhi = {
      year: ec.getYearShiShenZhi() || [], month: ec.getMonthShiShenZhi() || [],
      day: ec.getDayShiShenZhi() || [], hour: ec.getTimeShiShenZhi() || []
    };
    var tenGodAll = [];
    POS_KEYS.forEach(function (p) {
      if (tenGodGan[p] && tenGodGan[p] !== '日主') tenGodAll.push(tenGodGan[p]);
      (tenGodZhi[p] || []).forEach(function (g) { tenGodAll.push(g); });
    });

    // 十二长生（自算，任意支可查；已与 lunar getXxxDiShi 对齐）
    var twelveStage = {};
    POS_KEYS.forEach(function (p) { twelveStage[p] = twelveStageAt(dayGan, pillars[p].zhi); });

    // 旬空
    var xkStr = bz.xunKong || '';
    var xunkong = xkStr.split('').filter(function (c) { return ZHI.indexOf(c) >= 0; });

    // 大运（当前）
    var luck = null;
    try {
      var yun = ec.getYun(input.gender === '乾造' ? 1 : 0);
      var list = yun.getDaYun(10);
      var now = opts.now || new Date();
      var nowEc = Solar.fromDate(now).getLunar().getEightChar();
      var calYear = now.getFullYear();
      var cur = null;
      for (var i = 0; i < list.length; i++) {
        var d = list[i];
        if (d.getGanZhi() && d.getStartYear() <= calYear && calYear <= d.getEndYear()) { cur = d; break; }
      }
      if (cur) {
        var gz = cur.getGanZhi();
        var lg = gz[0], lz = gz[1];
        luck = {
          ganzhi: gz, gan: lg, zhi: lz,
          ganEl: C.GAN_EL[lg], zhiEl: C.ZHI_EL[lz],
          tenGodGan: shiShen(dayGan, lg),
          twelveStage: twelveStageAt(dayGan, lz),
          startYear: cur.getStartYear(), endYear: cur.getEndYear(), startAge: cur.getStartAge()
        };
      }
    } catch (_) { luck = null; }

    // 流年（当前立春年）
    var year = null;
    try {
      var yEc = (opts.now ? Solar.fromDate(opts.now) : Solar.fromDate(new Date())).getLunar().getEightChar();
      year = { gan: yEc.getYearGan(), zhi: yEc.getYearZhi(), calYear: (opts.now || new Date()).getFullYear() };
    } catch (_) { year = null; }

    // 地支关系 / 天干五合
    var br = scanBranchRelations(tables.branch, branches, stems);
    var branchRelations = (br && br.relations) || [];
    var stemCombos = (br && br.stemCombos) || [];

    // 神煞
    var shensha = scanShensha(tables.shensha, dayGan, pillars.year.zhi, pillars.day.zhi, pillars.month.zhi, branches, stems);

    // 能力集
    var caps = { bazi: 1, strength: 1, season: 1, nayin: 1, xunkong: 1, minggua: !!bazhai, shishen: 1, dishi: 1, dayun: !!luck, liunian: !!year };
    if (tables.branch) caps.branchrel = 1;
    if (tables.shensha) caps.shensha = 1;

    var seasonSet = {};
    if (SEASON_MAIN[pillars.month.zhi]) seasonSet[SEASON_MAIN[pillars.month.zhi]] = 1;
    if (SIJI_MONTHS[pillars.month.zhi]) seasonSet['四季月'] = 1;

    return {
      capabilities: caps,
      gender: input.gender === '乾造' ? 'male' : 'female',
      dayMaster: dayGan,
      dayMasterElement: bz.dmEl,
      strength: bz.isStrong ? 'strong' : 'weak',
      favorable: bz.favorable, unfavorable: bz.unfavorable,
      pillars: pillars,
      stems: stems, branches: branches,
      monthBranch: pillars.month.zhi,
      seasonSet: seasonSet,
      xunkong: xunkong,
      nayin: { year: pillars.year.naYin, month: pillars.month.naYin, day: pillars.day.naYin, hour: pillars.hour.naYin },
      tenGodGan: tenGodGan, tenGodZhi: tenGodZhi, tenGodAll: tenGodAll,
      twelveStage: twelveStage,
      branchRelations: branchRelations, stemCombos: stemCombos,
      shensha: shensha,
      mingGua: bazhai ? bazhai.mingGua : null,
      mingGuaGroup: bazhai ? (bazhai.isEast ? 'east' : 'west') : null,
      luck: luck,
      year: year
    };
  }

  // 十神：日干 vs 目标干（复用 lunar 口径通过临时 EightChar 不便，故本地按五行阴阳推）
  var GAN_EL = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  var GAN_YANG = { 甲: 1, 丙: 1, 戊: 1, 庚: 1, 壬: 1, 乙: 0, 丁: 0, 己: 0, 辛: 0, 癸: 0 };
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  var KE = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
  function shiShen(dayGan, other) {
    var de = GAN_EL[dayGan], oe = GAN_EL[other];
    var same = GAN_YANG[dayGan] === GAN_YANG[other];
    if (de === oe) return same ? '比肩' : '劫财';
    if (SHENG[de] === oe) return same ? '食神' : '伤官';       // 我生
    if (KE[de] === oe) return same ? '偏财' : '正财';          // 我克
    if (KE[oe] === de) return same ? '七杀' : '正官';          // 克我
    if (SHENG[oe] === de) return same ? '偏印' : '正印';       // 生我
    return '';
  }

  // 一步到位：加载查表后构建（供 UI 直接 await）
  function buildAsync(input, opts) {
    return loadTables().then(function (tables) {
      var o = opts || {}; o.tables = tables;
      return build(input, o);
    });
  }

  global.ChartFacts = {
    build: build,
    buildAsync: buildAsync,
    loadTables: loadTables,
    twelveStageAt: twelveStageAt,
    shiShen: shiShen
  };
})(typeof window !== 'undefined' ? window : this);
