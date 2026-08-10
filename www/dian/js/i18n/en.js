// 司南·典籍阁 · i18n English（dj.* 命名空间）
// ---------------------------------------------------------------------------
// 语域：博物馆讲解 / 学术墙签（docs/i18n-style-guide.md §1.4）。非算命腔、非营销。
// EN 缺键自动回落 zh 母本（见 daos/js/i18n.js t()）；故此文件可渐进补全，不会开天窗。
// 藏书阁 = Library（§3 tab 定稿）。逐句译注 = annotated line by line。
// ---------------------------------------------------------------------------
(function (g) {
  g.I18N_EN = Object.assign(g.I18N_EN || {}, {
    'dj.header.logo': 'Sīnán · Library',
    'dj.header.subtitle': 'Classical texts · annotated line by line',
    'dj.reader.loading': 'Loading the classics…',
    'dj.noscript': 'This site requires JavaScript to read.',
    'dj.theme.toNight': '🌙 Night',
    'dj.theme.toDay': '☀ Paper',
    'dj.lang.toggleAria': 'Switch language',
  });
})(typeof window !== 'undefined' ? window : this);
