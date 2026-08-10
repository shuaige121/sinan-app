/* 司南 · 黄历问答引擎（C2 问答范式）
   预置 8 问，每问一个确定性 resolver：纯查表 / 纯扫描，零 LLM、零推理端点、零自由输入。
   事实源恒为 lunar-javascript（与黄历卡同口径 Solar.fromDate(d).getLunar().getDayYi()/getDayJi()）
   与本机命盘（DaoCore.computeBazi / computeBaZhai，今人方法）。
   红线：结论只落「宜 / 不宜 / 无相关记载」三态或据实列举，绝不臆断吉凶祸福；
         查无历项即明说「无相关记载」，禁硬凑；方位类只提示「涉方位，详见堪舆页」，不在抽屉里画盘。 */
(function () {
  'use strict';
  // i18n 取词（zh 恒返回中文母本，故问答文案逐字不变；I18N 缺失时兜底返回 key）
  const L = (k, v) => (window.I18N && window.I18N.t) ? window.I18N.t(k, v) : k;
  const $ = id => document.getElementById(id);
  const C = () => window.DaoCore;
  const HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => HTML_ESC[c]);

  const GAN10 = '甲乙丙丁戊己庚辛壬癸';
  // 地支六冲（本命日支冲避）：搬家/嫁娶扫描时排除与用户日支相冲之日
  const CHONG = { 子: '午', 丑: '未', 寅: '申', 卯: '酉', 辰: '戌', 巳: '亥', 午: '子', 未: '丑', 申: '寅', 酉: '卯', 戌: '辰', 亥: '巳' };
  // 时辰 → 起始钟点 + 钟表区间（与 app.js 喜用时辰带同表；申=15:00–17:00）
  const SHICHEN = [
    ['子', 23, '23:00', '01:00'], ['丑', 1, '01:00', '03:00'], ['寅', 3, '03:00', '05:00'],
    ['卯', 5, '05:00', '07:00'], ['辰', 7, '07:00', '09:00'], ['巳', 9, '09:00', '11:00'],
    ['午', 11, '11:00', '13:00'], ['未', 13, '13:00', '15:00'], ['申', 15, '15:00', '17:00'],
    ['酉', 17, '17:00', '19:00'], ['戌', 19, '19:00', '21:00'], ['亥', 21, '21:00', '23:00'],
  ];
  const SHICHEN_CENTER = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]; // 各时辰中点钟点（lunar-js 时柱取干支）
  // 八宫方位（度→八方汉字，与 app.js GONG8 同序）
  const GONG8DIR = ['正北', '东北', '正东', '东南', '正南', '西南', '正西', '西北'];
  function dirOfDeg(deg) { return GONG8DIR[Math.round((((deg % 360) + 360) % 360) / 45) % 8]; }

  const FANLI = L('qa.fanli');

  // 出处 chip（走全站 cite-popover 事件委托：class=cite-chip + data-cite + role/tabindex）
  function chip(key, label) {
    return `<span class="cite-chip" data-cite="${esc(key)}" role="button" tabindex="0">${esc(label)}</span>`;
  }
  const CHIP_XIEJI = () => chip('xinji-bianfang', '《协纪辨方书》');
  const CHIP_BAZHAI = () => chip('bazhai-dayouniange', '《八宅明镜》游年八星');

  // ---- lunar-js 取数（事实源）----
  function lunarOf(date) { return Solar.fromDate(date).getLunar(); }
  function todayYiJi(now) {
    const l = lunarOf(now);
    return { yi: l.getDayYi() || [], ji: l.getDayJi() || [] };
  }
  function ready() { return typeof Solar !== 'undefined' && !!C(); }

  // ---- 本机命盘（今人方法）----
  let _chart = { key: null, bazi: null, bz: null };
  function chartData() {
    const raw = (function () { try { return localStorage.getItem('bazi-input'); } catch (e) { return null; } })();
    if (!raw) { _chart = { key: null, bazi: null, bz: null }; return null; }
    if (_chart.key !== raw) {
      try {
        const inp = JSON.parse(raw);
        _chart = { key: raw, bazi: C().computeBazi(inp), bz: C().computeBaZhai(inp) };
      } catch (e) { _chart = { key: null, bazi: null, bz: null }; return null; }
    }
    return _chart.bazi ? _chart : null;
  }

  // ---- 流年（据实查表）----
  function liunianYear(now) {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const cst = new Date(utcMs + 8 * 3600000); // CST = UTC+8
    return C().lyChineseYear(cst.getFullYear(), cst.getMonth() + 1, cst.getDate());
  }
  function liunianDirs(now) {
    const year = liunianYear(now);
    const zhi = C().lyGetZhi(year);
    const ganZhi = GAN10[(((year - 4) % 10) + 10) % 10] + zhi.name;
    const taisui = dirOfDeg(zhi.deg);
    const suipo = dirOfDeg((zhi.deg + 180) % 360);
    const sanshaDirs = (C().lySanSha(year) || []).map(s => dirOfDeg(s.deg))
      .filter((v, i, a) => a.indexOf(v) === i);
    return { year, ganZhi, taisui, suipo, sansha: sanshaDirs };
  }

  // ---- 三态判定 ----
  function termState(terms, now) {
    const { yi, ji } = todayYiJi(now);
    const yiHit = terms.filter(t => yi.indexOf(t) >= 0);
    const jiHit = terms.filter(t => ji.indexOf(t) >= 0);
    let state = 'none';
    if (yiHit.length && jiHit.length) state = 'both';
    else if (yiHit.length) state = 'yi';
    else if (jiHit.length) state = 'ji';
    return { state, yiHit, jiHit, yi, ji };
  }
  // 今日历项据实一行（供依据行；只列真实数据，不足即「——」，绝不编造）
  function todayListBase(st) {
    const yiTxt = st.yi.length ? st.yi.slice(0, 8).map(esc).join('·') : '——';
    const jiTxt = st.ji.length ? st.ji.slice(0, 6).map(esc).join('·') : '——';
    return { t: L('qa.today_list', { yi: yiTxt, ji: jiTxt }), cite: CHIP_XIEJI() };
  }
  const BADGE = {
    yi: { text: L('common.yi_label'), cls: 'qa-ok' },
    ji: { text: L('qa.badge_ji'), cls: 'qa-no' },
    none: { text: L('qa.badge_none'), cls: 'qa-none' },
    both: { text: L('qa.badge_both'), cls: 'qa-mix' },
  };

  // ---- 未来扫描（lunar-js 逐日步进，避 JS Date/DST 边界）----
  function p2(n) { return String(n).padStart(2, '0'); }
  function scanYi(term, days, now) {
    const out = [];
    const today = Solar.fromDate(now);
    for (let i = 0; i < days; i++) {
      const s = today.next(i);
      const l = s.getLunar();
      if ((l.getDayYi() || []).indexOf(term) >= 0) {
        out.push({
          ymd: '' + s.getYear() + p2(s.getMonth()) + p2(s.getDay()),
          month: s.getMonth(), day: s.getDay(), week: (window.I18N&&window.I18N.lang==='en')?['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.getWeek()]:s.getWeekInChinese(),
          dayZhi: l.getDayZhi(), gz: l.getDayInGanZhi(),
        });
      }
    }
    return out;
  }
  function scanGanZhi(gz, days, now) {
    const out = [];
    const today = Solar.fromDate(now);
    for (let i = 0; i < days; i++) {
      const s = today.next(i);
      if (s.getLunar().getDayInGanZhi() === gz) {
        out.push({
          i, month: s.getMonth(), day: s.getDay(), week: (window.I18N&&window.I18N.lang==='en')?['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.getWeek()]:s.getWeekInChinese(),
          gz: gz, lunar: s.getLunar().getMonthInChinese() + '月' + s.getLunar().getDayInChinese(),
        });
      }
    }
    return out;
  }
  function dayLabel(d) { return L('qa.day_label', { month: d.month, day: d.day, week: d.week, gz: d.gz }); }
  function dateChips(days) {
    if (!days.length) return '<span class="qa-none-inline">' + esc(L('qa.none_wu')) + '</span>';
    return days.map(d => `<span class="qa-date" data-ymd="${d.ymd}">${esc(dayLabel(d))}</span>`).join('');
  }

  // 今日日干 vs 阁下喜忌（今人方法·个性化行）
  function dayGanFav(now, cd) {
    const dGan = lunarOf(now).getDayGan();
    const el = (C().GAN_EL[dGan]) || '';
    const fav = cd.bazi.favorable || [], unf = cd.bazi.unfavorable || [];
    const gz = esc(dGan) + esc(el);
    if (fav.indexOf(el) >= 0) return { t: L('qa.daygan_fav', { gz: gz }), cls: 'qa-ok' };
    if (unf.indexOf(el) >= 0) return { t: L('qa.daygan_unfav', { gz: gz }), cls: 'qa-no' };
    return { t: L('qa.daygan_flat', { gz: gz }), cls: 'qa-dim' };
  }

  // ===== 8 个确定性 resolver =====
  // 返回 answer 对象：{ q, badge, conclusion, bases:[{t,cite?,tag?}], personal?, needChart?, position?, extra? }

  function rTerm(now, cd, opts) {
    const st = termState(opts.terms, now);
    const b = BADGE[st.state];
    let conclusion;
    const hitTxt = arr => arr.map(esc).join('·');
    if (st.state === 'yi') conclusion = L('qa.concl_yi', { hit: hitTxt(st.yiHit), text: opts.yiText });
    else if (st.state === 'ji') conclusion = L('qa.concl_ji', { hit: hitTxt(st.jiHit), text: opts.jiText });
    else if (st.state === 'both') conclusion = L('qa.concl_both', { yiHit: hitTxt(st.yiHit), jiHit: hitTxt(st.jiHit) });
    else conclusion = L('qa.concl_none', { label: opts.label });
    const bases = [todayListBase(st)];
    if (opts.bases) opts.bases.forEach(x => bases.push(x));
    const ans = { q: opts.q, badge: b, conclusion, bases, position: !!opts.position };
    if (cd) ans.personal = dayGanFav(now, cd);
    else ans.personalMissing = true;
    return ans;
  }

  // 1. 签约
  function r_sign(now, cd) {
    return rTerm(now, cd, {
      q: L('qa.q_sign'), label: L('qa.sign_label'), terms: ['立券', '交易', '纳财'],
      yiText: L('qa.sign_yi'), jiText: L('qa.sign_ji'),
    });
  }
  // 4. 出行
  function r_travel(now, cd) {
    const ans = rTerm(now, cd, {
      q: L('qa.q_travel'), label: '出行', terms: ['出行'],
      yiText: L('qa.travel_yi'), jiText: L('qa.travel_ji'), position: true,
    });
    ans.posNote = L('qa.travel_posnote');
    return ans;
  }
  // 8. 动土
  function r_dig(now, cd) {
    const ln = liunianDirs(now);
    const ans = rTerm(now, cd, {
      q: L('qa.q_dig'), label: '动土', terms: ['动土'],
      yiText: L('qa.dig_yi'), jiText: L('qa.dig_ji'), position: true,
      bases: [{ t: L('qa.dig_base', { ganZhi: ln.ganZhi, sansha: esc(ln.sansha.join('·')) }), cite: CHIP_XIEJI() }],
    });
    ans.posNote = L('qa.dig_posnote');
    return ans;
  }

  // 2. 搬家 / 3. 嫁娶（未来 30 天扫描）
  function rScanMove(now, cd, opts) {
    const raw = scanYi(opts.term, 30, now);
    let shown = raw, excluded = 0, chongZhi = '';
    if (cd) {
      chongZhi = cd.bazi.pillars[2].zhi;
      const bad = CHONG[chongZhi];
      shown = raw.filter(d => d.dayZhi !== bad);
      excluded = raw.length - shown.length;
    }
    let conclusion;
    if (!raw.length) conclusion = L('qa.move_none', { term: opts.term });
    else if (cd) {
      conclusion = L('qa.move_count_head', { term: opts.term, count: raw.length })
        + (excluded ? L('qa.move_excluded_tail', { zhi: esc(chongZhi), n: excluded, shown: shown.length })
                    : L('qa.move_clean_tail', { zhi: esc(chongZhi) }));
    } else conclusion = L('qa.move_count_nochart', { term: opts.term, count: raw.length });
    const bases = [{ t: L('qa.move_base', { term: opts.term }), cite: CHIP_XIEJI() }];
    const ans = {
      q: opts.q, badge: null, conclusion, bases,
      dateList: (cd ? shown : raw),
    };
    if (cd && excluded) ans.excludedList = raw.filter(d => d.dayZhi === CHONG[chongZhi]);
    return ans;
  }
  function r_move(now, cd) { return rScanMove(now, cd, { q: L('qa.q_move'), term: '移徙' }); }
  function r_wed(now, cd) { return rScanMove(now, cd, { q: L('qa.q_wed'), term: '嫁娶' }); }

  // 5. 吉方（需排盘·方位类）
  function r_dir(now, cd) {
    if (!cd) return { q: L('qa.q_dir'), needChart: true };
    const stars = cd.bz.stars;
    const dirOfStar = star => {
      const t = Object.keys(stars).find(k => stars[k] === star);
      return t ? L('qa.dir_of_star', { dir: C().TRIGRAMS[t].dir, trigram: t }) : '—';
    };
    const ln = liunianDirs(now);
    const conclusion = L('qa.dir_concl', {
      mingGua: esc(cd.bz.mingGua), group: esc(cd.bz.groupName),
      shengqi: esc(dirOfStar('生气')), tianyi: esc(dirOfStar('天医')),
    });
    const bases = [
      { t: L('qa.dir_base1'), cite: CHIP_BAZHAI() },
      { t: L('qa.dir_base2', { ganZhi: ln.ganZhi, taisui: esc(ln.taisui), suipo: esc(ln.suipo), sansha: esc(ln.sansha.join('·')) }), cite: CHIP_XIEJI() },
    ];
    return { q: L('qa.q_dir'), badge: null, conclusion, bases, position: true, posNote: L('qa.dir_posnote') };
  }

  // 6. 时辰（需排盘·今人方法）
  function r_hour(now, cd) {
    if (!cd) return { q: L('qa.q_hour'), needChart: true };
    const fav = cd.bazi.favorable || [];
    const hits = [];
    for (let i = 0; i < 12; i++) {
      const zhi = SHICHEN[i][0];
      const el = C().ZHI_EL[zhi] || '';
      if (fav.indexOf(el) >= 0) {
        let gz = zhi;
        try {
          const ec = Solar.fromYmdHms(now.getFullYear(), now.getMonth() + 1, now.getDate(), SHICHEN_CENTER[i], 0, 0)
            .getLunar().getEightChar();
          gz = ec.getTimeGan() + ec.getTimeZhi();
        } catch (e) { /* lunar 未就绪：退回地支 */ }
        hits.push(L('qa.hour_item', { zhi: zhi, t1: SHICHEN[i][2], t2: SHICHEN[i][3], el: el, gz: gz }));
      }
    }
    const conclusion = hits.length
      ? L('qa.hour_concl_yes', { fav: esc(fav.join('、')), n: hits.length })
      : L('qa.hour_concl_no', { fav: esc(fav.join('、')) });
    return {
      q: L('qa.q_hour'), badge: null, conclusion,
      bases: [{ t: L('qa.hour_base'), tag: L('common.modern_method') }],
      hourList: hits,
    };
  }

  // 7. 本命日（需排盘·今人方法·干支纪日）
  function r_benming(now, cd) {
    if (!cd) return { q: L('qa.q_benming'), needChart: true };
    const gz = cd.bazi.pillars[2].gz; // 日柱干支
    const hits = scanGanZhi(gz, 60, now);
    let conclusion;
    if (!hits.length) conclusion = L('qa.benming_none', { gz: esc(gz) });
    else {
      const d = hits[0];
      conclusion = L('qa.benming_head', { gz: esc(gz), month: d.month, day: d.day, week: d.week, lunar: esc(d.lunar) })
        + (d.i === 0 ? L('qa.benming_today_tail') : L('qa.benming_days_tail', { days: d.i }));
    }
    return {
      q: L('qa.q_benming'), badge: null, conclusion,
      bases: [{ t: L('qa.benming_base'), tag: L('common.modern_method') }],
    };
  }

  const QUESTIONS = [
    { id: 'sign', q: L('qa.q_sign'), resolve: r_sign },
    { id: 'move', q: L('qa.q_move'), resolve: r_move },
    { id: 'wed', q: L('qa.q_wed'), resolve: r_wed },
    { id: 'travel', q: L('qa.q_travel'), resolve: r_travel },
    { id: 'dir', q: L('qa.q_dir'), resolve: r_dir },
    { id: 'hour', q: L('qa.q_hour'), resolve: r_hour },
    { id: 'benming', q: L('qa.q_benming'), resolve: r_benming },
    { id: 'dig', q: L('qa.q_dig'), resolve: r_dig },
  ];

  // ===== 渲染 =====
  function gotoBtn(tab, label) {
    return `<button type="button" class="qa-goto" data-tab="${esc(tab)}">${esc(label)} →</button>`;
  }
  function renderBaseRow(b) {
    const src = b.cite ? `<span class="qa-base-src">${L('common.source_prefix')}${b.cite}</span>`
      : (b.tag ? `<span class="qa-base-tag">${esc(b.tag)}</span>` : '');
    return `<p class="qa-base"><i class="qa-base-dot" aria-hidden="true"></i><span class="qa-base-t">${b.t}${src}</span></p>`;
  }
  function renderAnswer(ans) {
    const host = $('qa-answer');
    if (!host) return;
    // 需排盘且无盘：只给排盘提示，绝不臆造三态
    if (ans.needChart) {
      host.innerHTML =
        `<div class="qa-a-head"><b class="qa-q">${esc(ans.q)}</b></div>`
        + `<p class="qa-nochart">${L('qa.nochart_full')}${gotoBtn('bazi', L('qa.goto_bazi_full'))}</p>`
        + `<p class="qa-fanli">${esc(FANLI)}</p>`;
      host.hidden = false;
      return;
    }
    let h = '<div class="qa-a-head"><b class="qa-q">' + esc(ans.q) + '</b>';
    if (ans.badge) h += `<span class="qa-badge ${ans.badge.cls}">${esc(ans.badge.text)}</span>`;
    h += '</div>';
    h += `<p class="qa-concl">${ans.conclusion}</p>`;
    // 日期列表（搬家/嫁娶）
    if (ans.dateList) h += `<div class="qa-dates">${dateChips(ans.dateList)}</div>`;
    if (ans.excludedList && ans.excludedList.length) {
      h += `<p class="qa-excluded">${L('qa.excluded_prefix')}${ans.excludedList.map(d => `<span class="qa-date qa-date-off" data-ymd="${d.ymd}">${esc(dayLabel(d))}</span>`).join('')}</p>`;
    }
    // 时辰列表
    if (ans.hourList) h += `<div class="qa-hours">${ans.hourList.length ? ans.hourList.map(x => `<span class="qa-hour">${esc(x)}</span>`).join('') : `<span class="qa-none-inline">${esc(L('qa.no_hour'))}</span>`}</div>`;
    // 依据行
    if (ans.bases && ans.bases.length) h += '<div class="qa-bases">' + ans.bases.map(renderBaseRow).join('') + '</div>';
    // 个性化行（有盘）/ 无盘提示
    if (ans.personal) h += `<p class="qa-personal ${esc(ans.personal.cls)}">${ans.personal.t}<span class="qa-personal-tag">${esc(L('common.modern_method'))}</span></p>`;
    else if (ans.personalMissing) h += `<p class="qa-nochart">${L('qa.nochart_short')}${gotoBtn('bazi', L('qa.goto_bazi'))}</p>`;
    // 方位类提示（不在抽屉画盘）
    if (ans.position) h += `<p class="qa-pos">${ans.posNote ? esc(ans.posNote) + '，' : ''}${L('qa.pos_detail')}${gotoBtn('kanyu', L('qa.goto_kanyu'))}</p>`;
    h += `<p class="qa-fanli">${esc(FANLI)}</p>`;
    host.innerHTML = h;
    host.hidden = false;
  }

  let _activeId = '';
  function answerFor(id) {
    const q = QUESTIONS.find(x => x.id === id);
    if (!q) return;
    if (!ready()) {
      const host = $('qa-answer');
      if (host) { host.innerHTML = '<p class="qa-concl qa-none">' + esc(L('qa.engine_not_ready')) + '</p>'; host.hidden = false; }
      return;
    }
    const now = new Date();
    const cd = chartData();
    let ans;
    try { ans = q.resolve(now, cd); }
    catch (e) { ans = null; }
    if (!ans) {
      const host = $('qa-answer');
      if (host) { host.innerHTML = '<p class="qa-concl qa-none">' + esc(L('qa.cannot_answer')) + '</p>'; host.hidden = false; }
      return;
    }
    renderAnswer(ans);
    _activeId = id;
    // chips 高亮
    const wrap = $('qa-chips');
    if (wrap) wrap.querySelectorAll('.qa-chip').forEach(c =>
      c.classList.toggle('on', c.getAttribute('data-qid') === id));
  }

  function buildChips() {
    const wrap = $('qa-chips');
    if (!wrap || wrap._built) return;
    wrap.innerHTML = QUESTIONS.map(q =>
      `<button type="button" class="qa-chip" data-qid="${esc(q.id)}" role="listitem">${esc(q.q)}</button>`).join('');
    wrap.addEventListener('click', e => {
      const btn = e.target.closest && e.target.closest('.qa-chip');
      if (!btn) return;
      answerFor(btn.getAttribute('data-qid'));
    });
    wrap._built = true;
  }

  // ===== 抽屉开合（复用 ics-sheet 抽屉体系视觉）=====
  function openSheet() {
    const sheet = $('qa-sheet'), bd = $('qa-backdrop');
    if (!sheet) return;
    buildChips();
    // 每次打开：重算命盘态（排盘/焚盘后即时反映），已选问重跑，否则空态
    _chart = { key: null, bazi: null, bz: null };
    if (_activeId) answerFor(_activeId);
    if (bd) bd.classList.add('shown');
    sheet.classList.add('shown');
    sheet.setAttribute('aria-hidden', 'false');
  }
  function closeSheet() {
    const sheet = $('qa-sheet'), bd = $('qa-backdrop');
    if (bd) bd.classList.remove('shown');
    if (sheet) { sheet.classList.remove('shown'); sheet.setAttribute('aria-hidden', 'true'); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const openBtn = $('qa-open'), closeBtn = $('qa-close'), bd = $('qa-backdrop');
    if (openBtn) openBtn.addEventListener('click', openSheet);
    if (closeBtn) closeBtn.addEventListener('click', closeSheet);
    if (bd) bd.addEventListener('click', closeSheet);
    // 抽屉内「去排盘 / 去堪舆」→ 复用 tabbar 切换后收起抽屉
    const sheet = $('qa-sheet');
    if (sheet) sheet.addEventListener('click', e => {
      const g = e.target.closest && e.target.closest('.qa-goto');
      if (!g) return;
      const tab = g.getAttribute('data-tab');
      closeSheet();
      const tb = document.querySelector('.tabbar button[data-tab="' + tab + '"]');
      if (tb) tb.click();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const s = $('qa-sheet');
        if (s && s.classList.contains('shown')) closeSheet();
      }
    });
  });

  // 调试/验收钩子：暴露纯查表结果（不含任何渲染），供独立扫描 diff 校验（非业务依赖）
  window.QAEngine = {
    scanYi: (term, days) => (ready() ? scanYi(term, days, new Date()) : []),
    questions: QUESTIONS.map(q => ({ id: q.id, q: q.q })),
  };
})();
