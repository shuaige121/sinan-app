// 司南 · i18n 运行时（Phase 1 基建）
// 术语宪法：docs/i18n-style-guide.md（§0–§6 硬约束）。本文件只做取词 / 模板插值 / 语言切换；
// 具体译文分文件挂全局：js/i18n/zh.js → window.I18N_ZH（中文母本）；后续 en.js → window.I18N_EN。
//
// zh 模式铁律：t(key) 恒等于原中文母本（I18N_ZH[key] 与页面原文逐字复刻），
//   故 JS 侧接线（把字面量换成 I18N.t('key')）后 zh 行为逐字不变；
//   静态 DOM（index.html 的 data-i18n）在 zh 下 applyStatic 直接 no-op，绝不触碰母本。
//
// 接口：
//   I18N.t(key, vars?)  取词 + {x} 模板插值
//   I18N.lang           当前语言（'zh' | 'en'，读 localStorage 'app-lang'；缺省按 navigator.language）
//   I18N.set(lang)      切换语言（写 localStorage + location.reload 重渲染，简单可靠）
//   I18N.applyStatic()  扫描 [data-i18n*] 静态节点做替换（仅 en 生效）
//   全局别名 window.t === I18N.t（内部各文件为避免局部 t 变量遮蔽，一律用 I18N.t 调用）
(function (global) {
  'use strict';

  var STORE_KEY = 'app-lang';

  function detect() {
    // 优先级：URL ?lang= > localStorage > navigator。
    // ?lang= 用于跨子域携带语言：dao.leonardchow.work 与 daos.leonardchow.work 是不同 origin，
    // localStorage 不互通；主站深链跳典籍阁时带 ?lang=en 即可让阅读器同步语言（顺带让分享链接携带语言）。
    try {
      var q = global.location && global.location.search;
      if (q) {
        var m = /[?&]lang=(zh|en)\b/i.exec(q);
        if (m) {
          var ql = m[1].toLowerCase();
          try { global.localStorage.setItem(STORE_KEY, ql); } catch (e) { /* 无 localStorage：本次仍生效，不持久 */ }
          return ql;
        }
      }
    } catch (e) { /* 无 location：忽略 */ }
    try {
      var s = global.localStorage && global.localStorage.getItem(STORE_KEY);
      if (s === 'zh' || s === 'en') return s;
    } catch (e) { /* localStorage 不可用（隐私模式）：退回语言探测 */ }
    var nav = '';
    try {
      nav = (global.navigator && (global.navigator.language ||
        (global.navigator.languages && global.navigator.languages[0]))) || '';
    } catch (e) { /* no navigator */ }
    return /^zh/i.test(nav) ? 'zh' : 'en';
  }

  var lang = detect();

  function dictOf(l) {
    return (l === 'en') ? (global.I18N_EN || null) : (global.I18N_ZH || null);
  }
  function rawOf(key, l) {
    var d = dictOf(l);
    return (d && Object.prototype.hasOwnProperty.call(d, key)) ? d[key] : undefined;
  }
  // 模板插值：把 "{x}" 替换成 vars.x；无 vars 原样返回（zh 母本里的花括号极罕见，仅显式占位才替）
  function interp(str, vars) {
    if (!vars || typeof str !== 'string') return str;
    return str.replace(/\{(\w+)\}/g, function (m, k) {
      return (Object.prototype.hasOwnProperty.call(vars, k) && vars[k] != null) ? String(vars[k]) : m;
    });
  }
  function t(key, vars) {
    var v = rawOf(key, lang);
    if (v === undefined && lang !== 'zh') v = rawOf(key, 'zh'); // en 阶段尚无译文时回落 zh
    if (v === undefined) v = key;                                // 兜底：返回键名（开发期可见缺词）
    return interp(v, vars);
  }
  function has(key) { return rawOf(key, lang) !== undefined; }

  function set(l) {
    if ((l !== 'zh' && l !== 'en') || l === lang) return;
    try { global.localStorage.setItem(STORE_KEY, l); } catch (e) { /* 无 localStorage：本次切换不持久 */ }
    try { global.location.reload(); } catch (e) { /* 无 window：忽略 */ }
  }

  // ---- 静态 DOM 接线（仅 en 生效；zh 恒 no-op，保证母本逐字一致）----
  // 只改末位非空文本节点，保留元素子节点（如 tab 字标 <span>历</span>今日 中的字标）。
  function setLastText(el, val) {
    for (var i = el.childNodes.length - 1; i >= 0; i--) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()) { n.nodeValue = val; return; }
    }
    el.appendChild(global.document.createTextNode(val));
  }
  var ATTR_MAP = { 'data-i18n-aria': 'aria-label', 'data-i18n-ph': 'placeholder', 'data-i18n-title': 'title' };
  function applyStatic(root) {
    if (lang === 'zh') return;                 // zh：静态 HTML 就是母本，绝不触碰
    root = root || global.document;
    if (!root || !root.querySelectorAll) return;
    var i, list, el, k;
    list = root.querySelectorAll('[data-i18n]');
    for (i = 0; i < list.length; i++) { el = list[i]; k = el.getAttribute('data-i18n'); if (k) el.textContent = t(k); }
    list = root.querySelectorAll('[data-i18n-node]');
    for (i = 0; i < list.length; i++) { el = list[i]; k = el.getAttribute('data-i18n-node'); if (k) setLastText(el, t(k)); }
    list = root.querySelectorAll('[data-i18n-html]');
    for (i = 0; i < list.length; i++) { el = list[i]; k = el.getAttribute('data-i18n-html'); if (k) el.innerHTML = t(k); }
    for (var a in ATTR_MAP) {
      if (!Object.prototype.hasOwnProperty.call(ATTR_MAP, a)) continue;
      list = root.querySelectorAll('[' + a + ']');
      for (i = 0; i < list.length; i++) { el = list[i]; k = el.getAttribute(a); if (k) el.setAttribute(ATTR_MAP[a], t(k)); }
    }
    try { if (global.document.documentElement) global.document.documentElement.lang = 'en'; } catch (e) {}
  }

  // ---- 语言切换按钮（.lang-toggle）：标签显目标语言（zh→「EN」/ en→「中」），点击 set+reload ----
  // 开屏右下角那枚要 stopPropagation，避免连带触发「轻触入境」入场。
  function wireLangToggles() {
    if (!global.document || !global.document.querySelectorAll) return;
    var label = (lang === 'zh') ? 'EN' : '中';
    var list = global.document.querySelectorAll('.lang-toggle');
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b._langWired) continue;
      b._langWired = true;
      b.textContent = label;
      b.addEventListener('click', function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        set(lang === 'zh' ? 'en' : 'zh');
      });
    }
  }

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', function () { applyStatic(); wireLangToggles(); });
    } else {
      applyStatic();
      wireLangToggles();
    }
  }

  var I18N = {
    t: t,
    has: has,
    set: set,
    applyStatic: applyStatic,
    STORE_KEY: STORE_KEY
  };
  Object.defineProperty(I18N, 'lang', { get: function () { return lang; }, enumerable: true });
  global.I18N = I18N;
  global.t = t; // 便捷全局别名（内部各文件仍用 I18N.t，避免与局部 t 变量冲突）
})(typeof window !== 'undefined' ? window : this);
