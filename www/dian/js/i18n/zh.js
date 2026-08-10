// 司南·典籍阁 · i18n 中文母本（dj.* 命名空间）
// ---------------------------------------------------------------------------
// 铁律：zh 模式下 I18N.t(key) 必须与页面/app.js 原文逐字相等（见 daos/js/i18n.js 头注的
//   zh-identity 不变量）。改这里前先确认 index.html / app.js 里的原文一字不差。
// 键空间用 dj.* 前缀，与主站 web/js/i18n/zh.js 隔离；典籍阁是独立页面，window.I18N_ZH 无冲突。
// 本轮仅接线「阅读器外壳」静态串；app.js 内动态 chrome 串（开始阅读/找不到典籍/托名/存疑/
//   逐句译注/维基文库/暂无收藏/完成度标签…）待后续机械清扫时按同键补入。
// ---------------------------------------------------------------------------
(function (g) {
  g.I18N_ZH = Object.assign(g.I18N_ZH || {}, {
    // 站头 / 外壳
    'dj.header.logo': '司南·典籍阁',
    'dj.header.subtitle': '古籍电子书·逐句译注',
    'dj.reader.loading': '典籍载入中…',
    'dj.noscript': '本站需启用 JavaScript 方可阅读。',
    // 主题切换按钮（标签显目标主题）
    'dj.theme.toNight': '🌙 夜间',
    'dj.theme.toDay': '☀ 古纸',
    // 语言切换
    'dj.lang.toggleAria': '切换语言',
  });
})(typeof window !== 'undefined' ? window : this);
