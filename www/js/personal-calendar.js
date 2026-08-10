/* 司南 · 个人历热力图核心
   六因子逐项查表：喜用日 / 五行忌神日 / 伏吟 / 冲 / 合 / 节气。
   UI 层在 app.js；本文件只做数据、缓存和既有 ICS 生成器适配。 */
(function (global) {
  'use strict';

  var GAN_EL_FALLBACK = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  var DEFAULT_BRANCH_RELATIONS = {
    '六冲': [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']],
    '六合': [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']],
    '三合': [
      { members: ['申', '子', '辰'], element: '水' },
      { members: ['亥', '卯', '未'], element: '木' },
      { members: ['寅', '午', '戌'], element: '火' },
      { members: ['巳', '酉', '丑'], element: '金' }
    ]
  };
  var MARKER_ORDER = ['fuyin', 'solarTerm', 'clash', 'combine'];
  var MARKER_SYMBOL = { fuyin: '伏', solarTerm: '节', clash: '冲', combine: '合' };
  var monthCache = new Map();
  var branchRelations = DEFAULT_BRANCH_RELATIONS;
  var branchVersion = 'fallback';

  var ZH = {
    'pcal.seal': '个人历',
    'pcal.title': '个人历',
    'pcal.subtitle': '六因子逐项呈现，不合成总分',
    'pcal.prev_aria': '上个月',
    'pcal.next_aria': '下个月',
    'pcal.weekdays': '一|二|三|四|五|六|日',
    'pcal.month_title': '{year}年{month}月',
    'pcal.legend_favorable': '喜用日',
    'pcal.legend_unfavorable': '五行忌神日',
    'pcal.legend_neutral': '中性日',
    'pcal.factor_favorable': '喜用日',
    'pcal.factor_unfavorable': '五行忌神日',
    'pcal.factor_fuyin': '伏吟',
    'pcal.factor_clash': '冲',
    'pcal.factor_combine': '合',
    'pcal.factor_solarterm': '节气',
    'pcal.hit': '命中',
    'pcal.miss': '未命中',
    'pcal.ganzhi': '干支',
    'pcal.yi_top': '黄历宜前三项',
    'pcal.ji_top': '黄历避项前三',
    'pcal.none': '无',
    'pcal.source_modern': '今人方法',
    'pcal.source_synthesis': '今人整理',
    'pcal.source_branch': 'branch-relations',
    'pcal.source_calendar': '历法通则',
    'pcal.source_fuyin': '伏吟口径同本命日',
    'pcal.export_day': '导出此日到日历',
    'pcal.export_done': '已导出 {filename}',
    'pcal.export_fail': '单日导出暂不可用：既有 ICS 生成器未就绪',
    'pcal.drawer_aria': '个人历明细',
    'pcal.close_drawer': '关闭个人历明细',
    'pcal.today': '今日',
    'pcal.cache_note': '本月计算 {ms}ms · 已缓存',
    'pcal.fav_value': '{gan}{el} 属喜用（{list}）',
    'pcal.fav_miss': '{gan}{el} 不属喜用（{list}）',
    'pcal.unfav_value': '{gan}{el} 属五行忌神（{list}）',
    'pcal.unfav_miss': '{gan}{el} 不属五行忌神（{list}）',
    'pcal.fuyin_value': '日柱同为 {gz}',
    'pcal.fuyin_miss': '阁下日柱 {gz}',
    'pcal.clash_value': '{natal}{day} 六冲',
    'pcal.clash_miss': '日支 {day} 不冲阁下日支 {natal}',
    'pcal.combine_liuhe': '{natal}{day} 六合',
    'pcal.combine_sanhe': '{natal}{day} 同属三合{element}局',
    'pcal.combine_miss': '日支 {day} 与阁下日支 {natal} 未合',
    'pcal.solarterm_value': '是日交 {name}',
    'pcal.solarterm_miss': '非交节日',
    'pcal.ics_summary': '司南个人历：{date} {gz}',
    'pcal.ics_factor_prefix': '命中'
  };
  var EN = {
    'pcal.seal': 'Personal Calendar',
    'pcal.title': 'Personal Calendar',
    'pcal.subtitle': 'Six factors shown independently; no aggregate score',
    'pcal.prev_aria': 'Previous month',
    'pcal.next_aria': 'Next month',
    'pcal.weekdays': 'Mon|Tue|Wed|Thu|Fri|Sat|Sun',
    'pcal.month_title': '{year}-{month}',
    'pcal.legend_favorable': 'Favorable-element day',
    'pcal.legend_unfavorable': 'Unfavorable Five-Phase day',
    'pcal.legend_neutral': 'Neutral day',
    'pcal.factor_favorable': 'Favorable-element day',
    'pcal.factor_unfavorable': 'Unfavorable Five-Phase day',
    'pcal.factor_fuyin': '伏吟 fúyín',
    'pcal.factor_clash': 'Clash',
    'pcal.factor_combine': 'Combine',
    'pcal.factor_solarterm': 'Solar term',
    'pcal.hit': 'Active',
    'pcal.miss': 'Not active',
    'pcal.ganzhi': 'Stem-branch',
    'pcal.yi_top': 'Top almanac appropriate items',
    'pcal.ji_top': 'Top almanac avoid items',
    'pcal.none': 'None',
    'pcal.source_modern': 'modern method',
    'pcal.source_synthesis': 'modern synthesis',
    'pcal.source_branch': 'branch-relations',
    'pcal.source_calendar': 'calendar convention',
    'pcal.source_fuyin': 'same rule as Day-Pillar Return',
    'pcal.export_day': 'Export this day',
    'pcal.export_done': 'Exported {filename}',
    'pcal.export_fail': 'Single-day export is unavailable: existing ICS generator is not ready',
    'pcal.drawer_aria': 'Personal calendar details',
    'pcal.close_drawer': 'Close personal calendar details',
    'pcal.today': 'Today',
    'pcal.cache_note': 'Month computed in {ms}ms · cached',
    'pcal.fav_value': '{gan} {el} is in favorable elements ({list})',
    'pcal.fav_miss': '{gan} {el} is not in favorable elements ({list})',
    'pcal.unfav_value': '{gan} {el} is in unfavorable elements ({list})',
    'pcal.unfav_miss': '{gan} {el} is not in unfavorable elements ({list})',
    'pcal.fuyin_value': 'Day Pillar also {gz}',
    'pcal.fuyin_miss': 'Your Day Pillar is {gz}',
    'pcal.clash_value': '{natal}-{day} six-clash',
    'pcal.clash_miss': 'Day branch {day} does not clash with your day branch {natal}',
    'pcal.combine_liuhe': '{natal}-{day} six-combine',
    'pcal.combine_sanhe': '{natal}-{day} share the Three-Combine {element} frame',
    'pcal.combine_miss': 'Day branch {day} does not combine with your day branch {natal}',
    'pcal.solarterm_value': '{name} begins today',
    'pcal.solarterm_miss': 'Not a solar-term day',
    'pcal.ics_summary': 'Sinan Personal Calendar: {date} {gz}',
    'pcal.ics_factor_prefix': 'Active'
  };

  function addKeys(target, values) {
    if (!target) return;
    Object.keys(values).forEach(function (k) {
      if (target[k] === undefined) target[k] = values[k];
    });
  }
  function registerI18n() {
    addKeys(global.I18N_ZH, ZH);
    addKeys(global.I18N_EN, EN);
  }
  function registerCiteKeys() {
    if (!global.CITE_MAP) return;
    if (!global.CITE_MAP['yuanhai-ziping']) global.CITE_MAP['yuanhai-ziping'] = { book: 'yuanhai-ziping' };
    if (!global.CITE_MAP['sanming-tonghui']) global.CITE_MAP['sanming-tonghui'] = { book: 'sanming-tonghui' };
  }
  registerI18n();
  registerCiteKeys();

  function L(k, vars) {
    return (global.I18N && global.I18N.t) ? global.I18N.t(k, vars) : interpolate(ZH[k] || k, vars);
  }
  function interpolate(str, vars) {
    if (!vars) return str;
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m;
    });
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }
  function compactYmd(y, m, d) { return '' + y + pad2(m) + pad2(d); }
  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
  function mondayOffset(y, m) { return (new Date(y, m - 1, 1).getDay() + 6) % 7; }
  function nowMs() {
    return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now();
  }
  function ganElement(gan) {
    var table = (global.DaoCore && global.DaoCore.GAN_EL) || GAN_EL_FALLBACK;
    return table[gan] || '';
  }
  function stemOrElementValue(v) {
    var table = (global.DaoCore && global.DaoCore.GAN_EL) || GAN_EL_FALLBACK;
    return table[v] || v || '';
  }
  function toArray(v) { return Array.isArray(v) ? v.slice() : []; }
  function normalizeChart(chart) {
    var bazi = chart && chart.bazi ? chart.bazi : chart;
    var day = bazi && bazi.pillars && bazi.pillars[2] ? bazi.pillars[2] : {};
    return {
      favorable: toArray(bazi && bazi.favorable),
      unfavorable: toArray(bazi && bazi.unfavorable),
      dayPillar: day.gz || '',
      dayBranch: day.zhi || (day.gz ? day.gz.charAt(1) : '')
    };
  }
  function chartSignature(chart) {
    var c = normalizeChart(chart);
    return [c.favorable.join(''), c.unfavorable.join(''), c.dayPillar, c.dayBranch, branchVersion].join('|');
  }
  function relationTable(table) { return table || branchRelations || DEFAULT_BRANCH_RELATIONS; }
  function pairIn(list, a, b) {
    return (list || []).some(function (p) {
      return p && ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
    });
  }

  function isFavorableDay(dayGanOrElement, chart) {
    var c = normalizeChart(chart);
    var el = stemOrElementValue(dayGanOrElement);
    return !!el && c.favorable.indexOf(el) >= 0;
  }
  function isUnfavorableDay(dayGanOrElement, chart) {
    var c = normalizeChart(chart);
    var el = stemOrElementValue(dayGanOrElement);
    return !!el && c.unfavorable.indexOf(el) >= 0;
  }
  function isFuyinDay(dayGz, natalDayGz) {
    return !!(dayGz && natalDayGz && dayGz === natalDayGz);
  }
  function getClashInfo(dayZhi, natalDayZhi, table) {
    var hit = !!(dayZhi && natalDayZhi && pairIn(relationTable(table)['六冲'], dayZhi, natalDayZhi));
    return { hit: hit, rel: hit ? '六冲' : '', source: 'branch-relations' };
  }
  function getCombineInfo(dayZhi, natalDayZhi, table) {
    var tbl = relationTable(table);
    if (dayZhi && natalDayZhi && pairIn(tbl['六合'], dayZhi, natalDayZhi)) {
      return { hit: true, rel: '六合', source: 'branch-relations' };
    }
    if (dayZhi && natalDayZhi && dayZhi !== natalDayZhi) {
      var sanhe = (tbl['三合'] || []).find(function (g) {
        return g && g.members && g.members.indexOf(dayZhi) >= 0 && g.members.indexOf(natalDayZhi) >= 0;
      });
      if (sanhe) return { hit: true, rel: '三合', element: sanhe.element || '', source: 'branch-relations' };
    }
    return { hit: false, rel: '', source: 'branch-relations' };
  }
  function getSolarTermName(lunar) {
    if (!lunar || typeof lunar.getJieQi !== 'function') return '';
    try { return lunar.getJieQi() || ''; } catch (e) { return ''; }
  }
  function isSolarTermDay(lunarOrName) {
    return !!(typeof lunarOrName === 'string' ? lunarOrName : getSolarTermName(lunarOrName));
  }
  function getLunarLabel(lunar) {
    try {
      if (lunar && lunar.getMonthInChinese && lunar.getDayInChinese) {
        return lunar.getMonthInChinese() + '月' + lunar.getDayInChinese();
      }
    } catch (e) {}
    return '';
  }
  function getSolar(y, m, d, opts) {
    if (opts && typeof opts.solarFactory === 'function') return opts.solarFactory(y, m, d);
    if (typeof global.Solar === 'undefined' || !global.Solar.fromYmd) throw new Error('Solar is not ready');
    return global.Solar.fromYmd(y, m, d);
  }
  function lunarValue(lunar, method, fallback) {
    try {
      return lunar && typeof lunar[method] === 'function' ? lunar[method]() : fallback;
    } catch (e) { return fallback; }
  }

  function computeDay(y, m, d, chart, opts) {
    opts = opts || {};
    var c = normalizeChart(chart);
    var solar = getSolar(y, m, d, opts);
    var lunar = solar.getLunar();
    var dayGz = lunarValue(lunar, 'getDayInGanZhi', '') || lunarValue(lunar.getEightChar && lunar.getEightChar(), 'getDay', '');
    var dayGan = lunarValue(lunar, 'getDayGan', dayGz ? dayGz.charAt(0) : '');
    var dayZhi = lunarValue(lunar, 'getDayZhi', dayGz ? dayGz.charAt(1) : '');
    var dayGanEl = ganElement(dayGan);
    var yi = toArray(lunarValue(lunar, 'getDayYi', []));
    var ji = toArray(lunarValue(lunar, 'getDayJi', []));
    var jieQiName = getSolarTermName(lunar);
    var clash = getClashInfo(dayZhi, c.dayBranch, opts.branchRelations);
    var combine = getCombineInfo(dayZhi, c.dayBranch, opts.branchRelations);
    var factors = {
      favorable: { hit: isFavorableDay(dayGanEl, c), key: 'favorable', symbol: '', source: 'modern' },
      unfavorable: { hit: isUnfavorableDay(dayGanEl, c), key: 'unfavorable', symbol: '', source: 'modern' },
      fuyin: { hit: isFuyinDay(dayGz, c.dayPillar), key: 'fuyin', symbol: MARKER_SYMBOL.fuyin, source: 'fuyin' },
      clash: { hit: clash.hit, key: 'clash', symbol: MARKER_SYMBOL.clash, source: 'branch-relations', rel: clash.rel },
      combine: { hit: combine.hit, key: 'combine', symbol: MARKER_SYMBOL.combine, source: 'branch-relations', rel: combine.rel, element: combine.element || '' },
      solarTerm: { hit: isSolarTermDay(jieQiName), key: 'solarTerm', symbol: MARKER_SYMBOL.solarTerm, source: 'calendar', name: jieQiName }
    };
    var markers = MARKER_ORDER.filter(function (k) { return factors[k] && factors[k].hit; }).slice(0, 2)
      .map(function (k) { return { key: k, symbol: MARKER_SYMBOL[k] }; });
    return {
      year: y, month: m, day: d, iso: iso(y, m, d), ymd: compactYmd(y, m, d),
      dayGz: dayGz, dayGan: dayGan, dayZhi: dayZhi, dayGanEl: dayGanEl,
      lunarLabel: getLunarLabel(lunar), yi: yi, ji: ji, jieQiName: jieQiName,
      chart: c, factors: factors, markers: markers,
      bgState: factors.favorable.hit ? 'favorable' : (factors.unfavorable.hit ? 'unfavorable' : 'neutral')
    };
  }

  function computeMonth(year, month, chart, opts) {
    opts = opts || {};
    var key = year + '-' + month + '-' + chartSignature(chart);
    if (!opts.noCache && monthCache.has(key)) {
      var cached = monthCache.get(key);
      cached.fromCache = true;
      return cached;
    }
    var t0 = nowMs();
    var count = daysInMonth(year, month);
    var days = [];
    for (var d = 1; d <= count; d++) days.push(computeDay(year, month, d, chart, opts));
    var result = {
      year: year,
      month: month,
      days: days,
      leadingBlanks: mondayOffset(year, month),
      computedMs: +(nowMs() - t0).toFixed(2),
      fromCache: false
    };
    if (!opts.noCache) monthCache.set(key, result);
    return result;
  }

  function setBranchRelationsTable(table, version) {
    if (table) {
      branchRelations = table;
      branchVersion = version || String(Date.now());
      monthCache.clear();
    }
  }
  function clearCache() { monthCache.clear(); }

  function addMonths(base, offset) {
    return new Date(base.getFullYear(), base.getMonth() + offset, 1, 12, 0, 0, 0);
  }
  function monthDistance(a, b) {
    return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
  }

  function factorHitLabels(day) {
    var labels = [];
    ['favorable', 'unfavorable', 'fuyin', 'clash', 'combine', 'solarTerm'].forEach(function (k) {
      if (day.factors[k] && day.factors[k].hit) labels.push(L('pcal.factor_' + (k === 'solarTerm' ? 'solarterm' : k)));
    });
    return labels;
  }
  function makeIcsCategory(day) {
    var hits = factorHitLabels(day);
    var base = L('pcal.ics_summary', { date: day.iso, gz: day.dayGz || '' });
    if (!hits.length) return base;
    return base + ' · ' + L('pcal.ics_factor_prefix') + '：' + hits.join('、');
  }
  function makeMockSolar(day, category) {
    var baseDate = new Date(day.year, day.month - 1, day.day, 12, 0, 0, 0);
    function solarAt(offset) {
      var dt = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offset, 12, 0, 0, 0);
      return {
        getYear: function () { return dt.getFullYear(); },
        getMonth: function () { return dt.getMonth() + 1; },
        getDay: function () { return dt.getDate(); },
        next: function (n) { return solarAt(offset + n); },
        getLunar: function () {
          return {
            getMonthInChinese: function () { return offset === 0 && day.lunarLabel ? day.lunarLabel.replace(/月.*$/, '') : ''; },
            getDayInChinese: function () { return offset === 0 && day.lunarLabel ? day.lunarLabel.replace(/^.*月/, '') : ''; },
            getDayYi: function () { return offset === 0 ? [category] : []; },
            getDayJi: function () { return []; }
          };
        }
      };
    }
    return { fromDate: function () { return solarAt(0); } };
  }
  function triggerDownload(text, filename) {
    if (!global.Blob || !global.URL || !global.document) throw new Error('download api unavailable');
    var blob = new global.Blob([text], { type: 'text/calendar;charset=utf-8' });
    var url = global.URL.createObjectURL(blob);
    var a = global.document.createElement('a');
    a.href = url;
    a.download = filename;
    global.document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { global.URL.revokeObjectURL(url); }, 2000);
  }
  function downloadSingleDayIcs(day) {
    return new Promise(function (resolve, reject) {
      if (!global.document || !global.location) { reject(new Error('document unavailable')); return; }
      var iframe = global.document.createElement('iframe');
      var done = false;
      var cleanupTimer = null;
      function finish(err, value) {
        if (done) return;
        done = true;
        clearTimeout(cleanupTimer);
        try { iframe.remove(); } catch (e) {}
        if (err) reject(err); else resolve(value);
      }
      cleanupTimer = setTimeout(function () { finish(new Error('ics generator timeout')); }, 5000);
      iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none';
      global.document.body.appendChild(iframe);
      var cw = iframe.contentWindow;
      var cd = cw.document;
      var category = makeIcsCategory(day);
      var filename = '司南个人历-' + day.ymd + '.ics';
      cd.open();
      cd.write('<!doctype html><html><body>'
        + '<button id="ics-open" type="button"></button><button id="ics-close" type="button"></button>'
        + '<div id="ics-backdrop"></div><div id="ics-sheet"></div>'
        + '<div id="ics-chips-yi"></div><div id="ics-chips-ji"></div>'
        + '<button id="ics-xy-chip" type="button" disabled></button><p id="ics-xy-note"></p>'
        + '<button id="ics-generate" type="button"></button><p id="ics-status"></p>'
        + '</body></html>');
      cd.close();
      cw.I18N = { t: function (k, v) { return L(k, v); } };
      cw.Solar = makeMockSolar(day, category);
      cw.DaoCore = global.DaoCore || {};
      cw.__pcalIcs = { text: '' };
      var NativeBlob = global.Blob || cw.Blob;
      cw.Blob = function (parts, options) {
        var text = (parts || []).map(function (p) { return String(p); }).join('');
        if (text.indexOf('BEGIN:VCALENDAR') >= 0) cw.__pcalIcs.text = text;
        return new NativeBlob(parts, options);
      };
      try {
        cw.URL.createObjectURL = function () { return 'blob:pcal-existing-generator'; };
        cw.URL.revokeObjectURL = function () {};
      } catch (e) {}
      try {
        cw.HTMLAnchorElement.prototype.click = function () {};
      } catch (e) {}
      var script = cd.createElement('script');
      script.src = new URL('js/ics-export.js?v=20260703a', global.location.href).href;
      script.onload = function () {
        try {
          cd.dispatchEvent(new cw.Event('DOMContentLoaded'));
          setTimeout(function () {
            try {
              cd.getElementById('ics-open').click();
              var chip = cd.querySelector('.ics-chip-yi');
              if (!chip) throw new Error('ics chip missing');
              chip.click();
              cd.getElementById('ics-generate').click();
              var text = cw.__pcalIcs.text;
              if (!text) throw new Error('ics text missing');
              triggerDownload(text, filename);
              finish(null, { filename: filename, text: text });
            } catch (err) { finish(err); }
          }, 0);
        } catch (err) { finish(err); }
      };
      script.onerror = function () { finish(new Error('ics-export.js load failed')); };
      cd.body.appendChild(script);
    });
  }

  global.PersonalCalendar = {
    registerI18n: registerI18n,
    registerCiteKeys: registerCiteKeys,
    setBranchRelationsTable: setBranchRelationsTable,
    clearCache: clearCache,
    normalizeChart: normalizeChart,
    isFavorableDay: isFavorableDay,
    isUnfavorableDay: isUnfavorableDay,
    isFuyinDay: isFuyinDay,
    getClashInfo: getClashInfo,
    getCombineInfo: getCombineInfo,
    getSolarTermName: getSolarTermName,
    isSolarTermDay: isSolarTermDay,
    computeDay: computeDay,
    computeMonth: computeMonth,
    addMonths: addMonths,
    monthDistance: monthDistance,
    markerOrder: MARKER_ORDER.slice(),
    markerSymbol: Object.assign({}, MARKER_SYMBOL),
    downloadSingleDayIcs: downloadSingleDayIcs,
    _defaultBranchRelations: DEFAULT_BRANCH_RELATIONS
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
