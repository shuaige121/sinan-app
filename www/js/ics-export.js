/* 司南 · 黄历 ICS 日历导出
   纯前端：扫未来 365 天的黄历宜/忌（lunar-javascript，与黄历卡同一口径
   Solar.fromDate(d).getLunar().getDayYi()/getDayJi()），用户勾选关注类目，
   一键生成 RFC 5545 合法 .ics（VCALENDAR / 全天 VEVENT / CRLF / 75 字节折行），
   Apple 日历 / Google Calendar 可直接导入。 */
(function () {
  'use strict';
  // i18n 取词（zh 恒返回中文母本；只接抽屉 UI 文案，导出的 .ics 文件内容仍按原黄历口径不改）
  const L = (k, v) => (window.I18N && window.I18N.t) ? window.I18N.t(k, v) : k;
  const $ = id => document.getElementById(id);
  const RANGE_DAYS = 365;
  const enc = new TextEncoder();

  // 扫描结果缓存：首次打开抽屉时构建一次
  let DAYS = null;          // [{ ymd, ymdEnd, year, label, yi:[], ji:[] }]
  const selYi = new Set();  // 已选「宜」类目
  const selJi = new Set();  // 已选「忌」类目
  let selXy = false;        // 已选「喜用时段（未来 30 天）」（需排盘）
  let chipsBuilt = false;
  const XY_DAYS = 30;       // 喜用时段导出范围（天）
  // 时辰 → 起始钟点（子=23）；时支本气五行由 DaoCore.ZHI_EL 定，∈喜用即导出带时刻 VEVENT。
  const XY_SHICHEN = [
    ['子', 23], ['丑', 1], ['寅', 3], ['卯', 5], ['辰', 7], ['巳', 9],
    ['午', 11], ['未', 13], ['申', 15], ['酉', 17], ['戌', 19], ['亥', 21],
  ];
  // 读排盘喜用五行（今人方法：DaoCore.computeBazi 以日主强弱定）；未排盘返回 null。
  function getFavorable() {
    try {
      const saved = localStorage.getItem('bazi-input');
      if (!saved || !window.DaoCore || typeof window.DaoCore.computeBazi !== 'function') return null;
      const bazi = window.DaoCore.computeBazi(JSON.parse(saved));
      return (bazi && Array.isArray(bazi.favorable) && bazi.favorable.length) ? bazi.favorable : null;
    } catch (e) { return null; }
  }

  // 句子式元条目（如「諸事不宜」「餘事勿取」「日值…大事勿用」）不入 chips 候选，
  // 但仍原样保留在事件 DESCRIPTION 的当日完整清单里（不改黄历口径）。
  function isMetaEntry(s) {
    return /諸事|诸事|勿用|勿取|不宜|日值|受死|大事|四絕|四绝|四離|四离|月破|歲破|岁破/.test(s);
  }

  // 扫未来 RANGE_DAYS 天，取每日宜/忌全清单（用 Solar.next 步进，避开 JS Date/DST 边界）
  function buildDays() {
    if (DAYS) return DAYS;
    DAYS = [];
    if (typeof Solar === 'undefined') return DAYS; // lunar-javascript 未就绪
    const p2 = n => String(n).padStart(2, '0');
    const fmt = s => '' + s.getYear() + p2(s.getMonth()) + p2(s.getDay());
    const today = Solar.fromDate(new Date());
    for (let i = 0; i < RANGE_DAYS; i++) {
      const solar = today.next(i);
      const lunar = solar.getLunar();
      DAYS.push({
        ymd: fmt(solar),
        ymdEnd: fmt(solar.next(1)),          // 全天事件 DTEND 取次日（RFC 5545 排他式）
        year: solar.getYear(),
        label: lunar.getMonthInChinese() + '月' + lunar.getDayInChinese(),
        yi: lunar.getDayYi() || [],
        ji: lunar.getDayJi() || [],
      });
    }
    return DAYS;
  }

  // 频次统计：取宜前 16、忌前 8 做 chips（不硬编码清单）
  function topCategories(days) {
    const yiCount = new Map(), jiCount = new Map();
    const tally = (arr, map) => {
      new Set(arr).forEach(x => { if (!isMetaEntry(x)) map.set(x, (map.get(x) || 0) + 1); });
    };
    days.forEach(d => { tally(d.yi, yiCount); tally(d.ji, jiCount); });
    const top = (map, n) => [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
      .slice(0, n).map(e => e[0]);
    return { yi: top(yiCount, 16), ji: top(jiCount, 8) };
  }

  function makeChip(cat, kind, sel) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ics-chip ics-chip-' + kind;
    btn.textContent = L(kind === 'yi' ? 'common.yi_label' : 'common.ji_label') + cat;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const on = btn.classList.toggle('on');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) sel.add(cat); else sel.delete(cat);
      syncGenerate();
    });
    return btn;
  }

  function buildChips() {
    if (chipsBuilt) return;
    const days = buildDays();
    const cats = topCategories(days);
    const yiWrap = $('ics-chips-yi'), jiWrap = $('ics-chips-ji');
    if (!yiWrap || !jiWrap) return;
    yiWrap.innerHTML = ''; jiWrap.innerHTML = '';
    cats.yi.forEach(c => yiWrap.appendChild(makeChip(c, 'yi', selYi)));
    cats.ji.forEach(c => jiWrap.appendChild(makeChip(c, 'ji', selJi)));
    chipsBuilt = true;
    syncGenerate();
  }

  function syncGenerate() {
    const btn = $('ics-generate');
    if (!btn) return;
    const n = selYi.size + selJi.size + (selXy ? 1 : 0);
    btn.disabled = n === 0;
    const status = $('ics-status');
    if (status && n === 0) status.textContent = '';
  }

  // 喜用时段 chip：随排盘态启用/置灰，note 显喜用五行（今人方法）
  function refreshXyChip() {
    const chip = $('ics-xy-chip'), note = $('ics-xy-note');
    if (!chip) return;
    const fav = getFavorable();
    if (!fav) {
      chip.disabled = true;
      chip.classList.remove('on');
      chip.setAttribute('aria-pressed', 'false');
      selXy = false;
      if (note) note.textContent = L('ics.xy_need_chart');
    } else {
      chip.disabled = false;
      if (note) note.textContent = L('ics.xy_note', { fav: fav.join('、') });
    }
    syncGenerate();
  }

  // ===== ICS 组装 =====
  function escText(s) {
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }
  function utcStamp(dt) {
    const p = n => String(n).padStart(2, '0');
    return dt.getUTCFullYear() + p(dt.getUTCMonth() + 1) + p(dt.getUTCDate())
      + 'T' + p(dt.getUTCHours()) + p(dt.getUTCMinutes()) + p(dt.getUTCSeconds()) + 'Z';
  }
  // 本地浮动时刻（无 Z）：喜用时段 VEVENT 用本地时间（DTSTART/DTEND），X-WR-TIMEZONE 已声明 Asia/Shanghai
  function localStamp(dt) {
    const p = n => String(n).padStart(2, '0');
    return dt.getFullYear() + p(dt.getMonth() + 1) + p(dt.getDate())
      + 'T' + p(dt.getHours()) + p(dt.getMinutes()) + p(dt.getSeconds());
  }
  function hash36(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  // RFC 5545 §3.1：内容行 > 75 字节须折行（CRLF + 单空格；续行含前导空格计入 75）；
  // 按 UTF-8 字节计，且不在多字节字符中间断开。
  function foldLine(line) {
    if (enc.encode(line).length <= 75) return line;
    let out = '', cur = '', bytes = 0, first = true;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      const limit = first ? 75 : 74;
      if (bytes + b > limit) {
        out += (first ? '' : ' ') + cur + '\r\n';
        first = false; cur = ''; bytes = 0;
      }
      cur += ch; bytes += b;
    }
    out += (first ? '' : ' ') + cur;
    return out;
  }

  function makeEvent(kind, cat, d, dtstamp) {
    const prefix = kind === 'yi' ? '宜' : '忌';        // 忌类中性写法（无恐吓词）
    const summary = prefix + cat + ' · ' + d.label;
    const desc = '宜：' + (d.yi.join('、') || '——') + '\n忌：' + (d.ji.join('、') || '——');
    const uid = d.ymd + '-' + kind + '-' + hash36(cat) + '@sinan-huangli';
    return [
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + dtstamp,
      'DTSTART;VALUE=DATE:' + d.ymd,
      'DTEND;VALUE=DATE:' + d.ymdEnd,
      'SUMMARY:' + escText(summary),
      'DESCRIPTION:' + escText(desc),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    ];
  }

  // 喜用时段：未来 XY_DAYS 天，时支五行∈喜用的时辰导为带时刻 VEVENT（DTSTART/DTEND 本地时间）。
  // SUMMARY「喜用时段 · 申时（金）」；子时(23:00)跨零点由 Date 算术自然进位到次日 01:00。
  function buildXiyong(dtstamp) {
    const events = [];
    const fav = getFavorable();
    if (!fav) return events;                       // 未排盘：不导出
    const ZHI_EL = (window.DaoCore && window.DaoCore.ZHI_EL) || {};
    const base = new Date(); base.setHours(0, 0, 0, 0);
    for (let day = 0; day < XY_DAYS; day++) {
      for (let i = 0; i < 12; i++) {
        const zhi = XY_SHICHEN[i][0], h = XY_SHICHEN[i][1];
        const el = ZHI_EL[zhi];
        if (!el || fav.indexOf(el) < 0) continue;
        const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() + day, h, 0, 0);
        const end = new Date(start.getTime() + 2 * 3600 * 1000);
        const uid = localStamp(start).slice(0, 8) + '-xy' + i + '@sinan-huangli'; // ASCII UID（日期+时辰序）

        const summary = '喜用时段 · ' + zhi + '时（' + el + '）';
        events.push(
          'BEGIN:VEVENT',
          'UID:' + uid,
          'DTSTAMP:' + dtstamp,
          'DTSTART:' + localStamp(start),
          'DTEND:' + localStamp(end),
          'SUMMARY:' + escText(summary),
          'DESCRIPTION:' + escText('喜用五行：' + el + '（今人方法：以日主强弱定喜用神）'),
          'TRANSP:TRANSPARENT',
          'END:VEVENT'
        );
      }
    }
    return events;
  }

  function buildIcs() {
    const days = buildDays();
    const dtstamp = utcStamp(new Date());
    const events = [];
    days.forEach(d => {
      d.yi.forEach(cat => { if (selYi.has(cat)) events.push(...makeEvent('yi', cat, d, dtstamp)); });
      d.ji.forEach(cat => { if (selJi.has(cat)) events.push(...makeEvent('ji', cat, d, dtstamp)); });
    });
    if (selXy) events.push(...buildXiyong(dtstamp));   // 喜用时段（带时刻·未来 30 天）
    const picks = [...[...selYi].map(c => '宜' + c), ...[...selJi].map(c => '忌' + c)];
    if (selXy) picks.push('喜用时段');
    const calName = '司南黄历 · ' + picks.join('、');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//司南 SiNan//黄历日历导出//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + escText(calName),
      'X-WR-TIMEZONE:Asia/Shanghai',
    ];
    events.forEach(l => lines.push(l));
    lines.push('END:VCALENDAR');
    return {
      text: lines.map(foldLine).join('\r\n') + '\r\n',
      count: events.filter(l => l === 'BEGIN:VEVENT').length, // 按 VEVENT 计（宜忌9行/喜用9行皆稳）
      primary: picks[0] || '黄历',
      year: days.length ? days[0].year : new Date().getFullYear(),
    };
  }

  function generate() {
    if (selYi.size + selJi.size === 0 && !selXy) return;
    const status = $('ics-status');
    const { text, count, primary, year } = buildIcs();
    const filename = '司南黄历-' + primary + '-' + year + '.ics';
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (status) status.textContent = L('ics.status_done', { count: count, filename: filename });
  }

  // ===== 抽屉开合 =====
  function openSheet() {
    const sheet = $('ics-sheet'), bd = $('ics-backdrop');
    if (!sheet) return;
    buildChips();
    refreshXyChip();                 // 每次开抽屉按当前排盘态刷新喜用时段可用性
    if (bd) bd.classList.add('shown');
    sheet.classList.add('shown');
    sheet.setAttribute('aria-hidden', 'false');
  }
  function closeSheet() {
    const sheet = $('ics-sheet'), bd = $('ics-backdrop');
    if (bd) bd.classList.remove('shown');
    if (sheet) { sheet.classList.remove('shown'); sheet.setAttribute('aria-hidden', 'true'); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const openBtn = $('ics-open'), closeBtn = $('ics-close'),
      bd = $('ics-backdrop'), genBtn = $('ics-generate'), xyChip = $('ics-xy-chip');
    if (openBtn) openBtn.addEventListener('click', openSheet);
    if (closeBtn) closeBtn.addEventListener('click', closeSheet);
    if (bd) bd.addEventListener('click', closeSheet);
    if (genBtn) genBtn.addEventListener('click', generate);
    if (xyChip) xyChip.addEventListener('click', () => {
      if (xyChip.disabled) return;
      selXy = xyChip.classList.toggle('on');
      xyChip.setAttribute('aria-pressed', selXy ? 'true' : 'false');
      syncGenerate();
    });
    syncGenerate();
  });
})();
