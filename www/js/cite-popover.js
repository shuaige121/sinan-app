// 通用引用弹层（全站任何出处 chip 点击 → 半屏弹出原句卡）。
//
// 设计：
//   - openCite(target)：target = {book, ch, i}（句级）或 {book}（书级）。
//       句级 → fetch <base>/data/annotated/<book>.json 取该句 orig/白话；
//       书级 → fetch <base>/data/registry.json 取书名/朝代/作者/简介行。
//   - 弹层视觉复用罗盘原句卡（墨底金边、纸面原句、出处行、「入阁阅读」按钮）。
//   - 加载中给骨架态；fetch 失败静默降级为直接跳 /dian/ 链接（新标签，保留当前上下文）。
//   - resolveDianBase()：原生壳与生产站走同源 /dian/；普通 dev（localhost 单独伺服 web/，无 /dian/）
//       回退线上 https://daos.leonardchow.work 同路径（其已开 CORS: ACAO *）。
//   - 深链形态：句级 <base>/#/read/<book>/<encodeURIComponent(ch)>/s<i>；书级 <base>/#/book/<book>。
//   - 事件委托：document 上一处 listener 捕获 .cite-chip[data-cite] 的 click / Enter / Space。
(function (global) {
  'use strict';

  // i18n 取词（zh 下恒返回中文母本，故骨架文案逐字不变；I18N 缺失时兜底返回 key）
  function L(k, v) { return (global.I18N && global.I18N.t) ? global.I18N.t(k, v) : k; }

  var REMOTE = 'https://daos.leonardchow.work';
  var HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return HTML_ESC[c]; }); }

  // ---- 同源 /dian/ 探测（按 host 判定，不发探针请求）----
  // 合并部署（docs/deploy-merged.md）：web/ → `/`、daos/ → 同源 `/dian/`，故生产恒有同源 /dian/。
  // dev（localhost 单伺 web/，无 /dian/）退回线上 daos（其已开 CORS: ACAO *）。
  // 刻意不发 fetch 探针：任何 404 探针都会被浏览器记为 "Failed to load resource" 控制台报错，
  // 与「console 零报错」冲突，故改用 host 启发式（同为「探测」，且零网络噪声）。
  var _baseP = null;
  function isDevHost() {
    var h = location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '' ||
      h.endsWith('.local') || /^(\d{1,3}\.){3}\d{1,3}$/.test(h); // 裸 IP（LAN）一律当 dev
  }
  function isNativeShell() {
    try {
      if (!global.Capacitor) return false;
      if (typeof global.Capacitor.isNativePlatform === 'function' && global.Capacitor.isNativePlatform()) return true;
      return typeof global.Capacitor.getPlatform === 'function' && global.Capacitor.getPlatform() !== 'web';
    } catch (_) { return false; }
  }
  function resolveDianBase() {
    if (_baseP) return _baseP;
    _baseP = Promise.resolve(isNativeShell() ? '/dian' : (isDevHost() ? REMOTE : '/dian'));
    return _baseP;
  }

  // ---- 数据抓取（内存缓存）----
  var _annotCache = {};   // book -> Promise(data)
  var _registryP = null;  // Promise(registry)
  function fetchAnnot(base, book) {
    if (_annotCache[book]) return _annotCache[book];
    _annotCache[book] = fetch(base + '/data/annotated/' + book + '.json').then(function (r) {
      if (!r.ok) throw new Error('annotated ' + r.status);
      return r.json();
    });
    return _annotCache[book];
  }
  function fetchRegistry(base) {
    if (_registryP) return _registryP;
    _registryP = fetch(base + '/data/registry.json').then(function (r) {
      if (!r.ok) throw new Error('registry ' + r.status);
      return r.json();
    });
    return _registryP;
  }

  // ---- 深链 ----
  function isSentence(t) { return t && t.book && t.ch != null && t.i != null && t.i >= 0; }
  function deepLink(base, t) {
    if (isSentence(t)) {
      return base + '/#/read/' + t.book + '/' + encodeURIComponent(t.ch) + '/s' + t.i;
    }
    return base + '/#/book/' + t.book;
  }
  // 供外部（app.js 罗盘原句卡「读上下文」）异步设锚点 href，走同源 /dian/。
  function setDeepLink(anchor, t) {
    if (!anchor || !t || !t.book) return;
    resolveDianBase().then(function (base) { anchor.href = deepLink(base, t); });
  }

  // ---- 弹层 DOM（懒建，单例）----
  var backdrop = null, body = null, goLink = null, reqToken = 0;
  function ensureDom() {
    if (backdrop) return;
    backdrop = document.createElement('div');
    backdrop.className = 'cite-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML =
      '<div class="cite-pop" role="dialog" aria-modal="true" aria-label="' + esc(L('cite.pop_aria')) + '">'
      + '<button class="cite-close" type="button" aria-label="' + esc(L('common.close')) + '">✕</button>'
      + '<div class="cite-pop-body"></div>'
      + '</div>';
    document.body.appendChild(backdrop);
    body = backdrop.querySelector('.cite-pop-body');
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeCite(); });
    backdrop.querySelector('.cite-close').addEventListener('click', closeCite);
  }
  function skeleton() {
    return '<div class="cite-skel" aria-hidden="true">'
      + '<div class="cite-skel-jian"><span class="cite-skel-line"></span><span class="cite-skel-line"></span>'
      + '<span class="cite-skel-line short"></span></div></div>';
  }
  function openShell() {
    ensureDom();
    body.innerHTML = skeleton();
    backdrop.hidden = false;
    // 触发进场动效（下一帧加 shown）
    requestAnimationFrame(function () { backdrop.classList.add('shown'); });
    document.addEventListener('keydown', onKey);
  }
  function closeCite() {
    if (!backdrop || backdrop.hidden) return;
    backdrop.classList.remove('shown');
    document.removeEventListener('keydown', onKey);
    var b = backdrop;
    setTimeout(function () { if (b && !b.classList.contains('shown')) b.hidden = true; }, 260);
  }
  function onKey(e) { if (e.key === 'Escape') closeCite(); }

  // ---- 渲染 ----
  function renderSentence(book, chLabel, s, base, t) {
    var linkHref = deepLink(base, t);
    body.innerHTML =
      '<div class="cite-seal-row"><span class="cite-seal">典</span>'
      + '<span class="cite-src-head">' + esc('《' + book.title + '》') + (chLabel ? ' · ' + esc(chLabel) : '') + '</span></div>'
      + '<div class="cite-jian">'
      + '<div class="cite-orig">' + esc(s.orig || '') + '</div>'
      + (s.bai ? '<div class="cite-bai">' + esc(s.bai) + '</div>' : '')
      + '</div>'
      + '<a class="cite-go" href="' + esc(linkHref) + '" target="_blank" rel="noopener">' + esc(L('cite.enter_read')) + '</a>';
    goLink = body.querySelector('.cite-go');
  }
  function renderBook(b, base, t) {
    var linkHref = deepLink(base, t);
    var meta = [b.dynasty, b.author].filter(Boolean).join(' · ');
    var desc = b.statusNote || b.authorNote || b.subtitle || '';
    body.innerHTML =
      '<div class="cite-seal-row"><span class="cite-seal">阁</span>'
      + '<span class="cite-src-head">' + esc('《' + b.title + '》') + '</span></div>'
      + '<div class="cite-jian cite-jian-book">'
      + (meta ? '<div class="cite-book-meta">' + esc(meta) + '</div>' : '')
      + (desc ? '<div class="cite-book-desc">' + esc(desc) + '</div>' : '')
      + '</div>'
      + '<a class="cite-go" href="' + esc(linkHref) + '" target="_blank" rel="noopener">' + esc(L('cite.enter_read')) + '</a>';
    goLink = body.querySelector('.cite-go');
  }

  // fetch 失败：静默降级为直接跳 /dian/ 链接（新标签，保留当前上下文）
  function degrade(base, t) {
    closeCite();
    try { window.open(deepLink(base, t), '_blank', 'noopener'); } catch (_) {}
  }

  // ---- 入口 ----
  function openCite(target) {
    if (!target || !target.book) return;
    var my = ++reqToken;
    openShell();
    resolveDianBase().then(function (base) {
      if (isSentence(target)) {
        return fetchAnnot(base, target.book).then(function (data) {
          if (my !== reqToken) return;                 // 已被后续点击顶替
          var ch = (data.chapters || []).find(function (c) { return c.id === target.ch; });
          var s = ch && (ch.sentences || []).find(function (x) { return x.i === target.i; });
          if (!s) { degrade(base, target); return; }   // 句索引对不上：不猜，直接跳
          renderSentence(data, ch.label, s, base, target);
        }, function () { if (my === reqToken) degrade(base, target); });
      }
      return fetchRegistry(base).then(function (reg) {
        if (my !== reqToken) return;
        var b = (reg.books || []).find(function (x) { return x.id === target.book; });
        if (!b) { degrade(base, target); return; }
        renderBook(b, base, target);
      }, function () { if (my === reqToken) degrade(base, target); });
    });
  }

  // ---- 事件委托：全站 .cite-chip[data-cite] ----
  function handleChip(e) {
    var chip = e.target.closest && e.target.closest('.cite-chip[data-cite]');
    if (!chip) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    var t = (global.resolveCite && global.resolveCite(chip.getAttribute('data-cite'))) || null;
    if (t) openCite(t);
  }
  document.addEventListener('click', handleChip);
  document.addEventListener('keydown', handleChip);

  // 预热同源探测（点击时零延迟）
  resolveDianBase();

  global.CitePop = {
    openCite: openCite,
    closeCite: closeCite,
    resolveDianBase: resolveDianBase,
    deepLink: deepLink,
    setDeepLink: setDeepLink
  };
  global.openCite = openCite;
})(typeof window !== 'undefined' ? window : this);
