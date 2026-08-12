/* 司南·典籍阁 — 纯前端 SPA，无后端，离线可用 */
'use strict';

const IS_EMBEDDED = window.self !== window.top;
if (IS_EMBEDDED) document.documentElement.classList.add('embedded');

// ─── i18n 取词别名 ───
// 运行时见 daos/js/i18n.js（须在本文件前加载），字典 js/i18n/{zh,en}.js（dj.* 命名空间）。
// 铁律：zh 模式 L(k) 恒等于中文母本（zh.js 值逐字复刻页面/本文件原文），故接线不改变中文行为；
//   EN 缺键自动回落 zh；无 I18N（理论上不会）时回落键名。动态 chrome 串按此逐步接线。
const L = (k, v) => (window.I18N ? window.I18N.t(k, v) : k);

// ─── 持久化键 ───
const LS = {
  theme: 'dj-theme', fs: 'dj-fs', orient: 'dj-orient',
  last: 'dj-last', marks: 'dj-marks', scroll: 'dj-scroll',
  readChapters: 'dj-rchaps', showBai: 'dj-showbai',
};

// ─── 状态 ───
const State = {
  registry: null,
  theme: localStorage.getItem(LS.theme) || (IS_EMBEDDED ? 'night' : 'antique'),
  fontSize: parseFloat(localStorage.getItem(LS.fs)) || 18,
  orientation: localStorage.getItem(LS.orient) || 'horizontal',
  searchQuery: '',
  activeCat: 'all',
  hidePending: true,        // 「仅看有内容」默认勾选
  annotatedOnly: false,     // 「有译注」过滤
  lastRead: safeParse(localStorage.getItem(LS.last), null),
  marks: safeParse(localStorage.getItem(LS.marks), []),
  readChapters: safeParse(localStorage.getItem(LS.readChapters), {}),
  textCache: {},        // id -> textData，避免重复 fetch
  textPromises: {},     // id -> Promise，预取与点开共用同一请求
  annotated: {},        // id -> 逐句白话译注数据（data/annotated/<id>.json），无则 null
  annotatedPromises: {}, // id -> Promise，避免预取/点开重复请求
  translations: {},     // id -> {idx:{`ch/i`:{origHash,en,enNote,conf}}, meta} 英译 sidecar（Layer B），无则 null
  enCaptions: {},       // 当前书预备好的 EN caption：`ch/i` -> {en,enNote,conf}（origHash 现场比对后）
  showBai: localStorage.getItem(LS.showBai) !== '0', // 阅读器是否显示白话译文，默认开
  searchIdx: null,      // 全文索引（第二段，按需拉分片后填充）
  searchIdxP: null,     // 兼容旧字段
  searchManifestP: null,// data/search-index.json 清单
  titleIdx: null,       // 标题索引（第一段：书名+章名，进站即载）
  titleIdxP: null,
  ftP: null,            // 全文分片加载中的 Promise
  ftLoaded: false,      // 全文分片是否已载齐（决定搜索覆盖面的口径）
  _composing: false,    // 输入法组字中
  _cleanups: [],        // 当前页面需要解绑的监听
  _lastView: '',        // 上一个视图标识，用于决定是否播放切换动画
  _routeDepth: 0,       // 书架→书目→正文的空间层级，用于决定过渡方向
  _navDirection: '',    // 上一篇/返回等同层导航显式指定方向
  _lazyReader: null,    // 当前章节的分批展卷状态
  _renderToken: 0,      // 异步载书路由令牌，防止快速返回后旧页面覆盖新页面
  _marksExpanded: false, // 书签全部展开状态
};

// ─── 工具函数 ───
function el(id) { return document.getElementById(id); }
function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }
function safeParse(s, fb) { try { return s ? JSON.parse(s) : fb; } catch { return fb; } }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function debounce(fn, ms) {
  let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
}

// ─── 繁簡混搜：繁→簡字形映射（约140对，覆盖本站典籍高频字） ───
const _T2S_PAIRS = '書书學学龍龙經经傳传陰阴陽阳氣气風风靈灵數数術术歷历東东長长門门關关開开國国來来過过時时會会為为萬万興兴發发說说讀读後后義义實实從从體体認认個个見见無无對对兩两漢汉間间結结運运聯联節节際际觀观線线圖图總总統统強强進进語语邊边變变頭头電电題题場场難难達达愛爱遠远歸归處处屬属張张單单話话種种導导連连繼继記记樂乐壽寿聲声師师華华腎肾膽胆臟脏脈脉針针協协羅罗綱纲筆笔談谈莊庄禮礼範范澤泽點点廣广廟庙雲云鄉乡顯显響响齊齐齋斋魚鱼馬马鳥鸟黃黄龜龟鳳凤劍剑寶宝斷断腦脑臨临補补視视請请謝谢識识遷迁銀银錢钱鐵铁鎮镇帶带樹树車车與与並并參参歲岁紀纪質质聖圣賢贤貴贵財财費费資资廢废廳厅廬庐陸陆險险隱隐隨随雖虽雙双雜杂霧雾領领頻频顏颜類类飛飞養养驗验鬧闹鬥斗麗丽黨党齒齿齡龄動动藥药絡络蘭兰陳陈蔣蒋覽览勝胜鑑鉴離离兌兑損损漸渐晉晋復复豐丰謙谦則则積积產产壇坛燈灯禪禅緣缘願愿護护擇择讓让祿禄鬚须蔭荫';
const _T2S = (() => {
  const m = {};
  for (let i = 0; i + 1 < _T2S_PAIRS.length; i += 2) m[_T2S_PAIRS[i]] = _T2S_PAIRS[i + 1];
  return m;
})();
// 将字符串中的繁体字归一化为简体（仅用于搜索比较，不影响显示）
function normalizeHan(s) {
  if (!s) return '';
  let r = '';
  for (const c of s) r += _T2S[c] || c;
  return r;
}

// 繁简混搜：在原文中查找词并高亮（查询词/原文均做繁→简归一化后比较，高亮原文中对应的繁体字）
function highlight(text, query) {
  if (!query || !text) return esc(text || '');
  const normQ = normalizeHan(query);
  const normT = normalizeHan(text);
  if (!normQ) return esc(text);
  const parts = [];
  let i = 0;
  while (i < text.length) {
    const pos = normT.indexOf(normQ, i);
    if (pos < 0) { parts.push(esc(text.slice(i))); break; }
    if (pos > i) parts.push(esc(text.slice(i, pos)));
    parts.push('<mark>' + esc(text.slice(pos, pos + normQ.length)) + '</mark>');
    i = pos + normQ.length;
    if (i === pos) i++; // 防止零长死循环
  }
  return parts.join('');
}

// ─── 典籍封面与卷册主题 ───
// 每部书都获得所属门类的实景插画；色板同时作用于详情与正文，避免封面、按钮、纸张各说各话。
const BOOK_PALETTES = Object.freeze({
  jingyi:   ['#8f3b24', '#cb8b55', '#2e1711', '#f5e4c2', '#efe0c5'],
  zhexue:   ['#42645d', '#85a08b', '#142a29', '#edf0df', '#e7ebdc'],
  mingli:   ['#a24c2c', '#d69b50', '#32150f', '#f8e3bd', '#f1dfc0'],
  kanyu:    ['#365f59', '#b09152', '#102b29', '#edf0dc', '#e3eadb'],
  liqi:     ['#9b5a28', '#d6a95f', '#2f1b10', '#f4e4c5', '#ece0c8'],
  sanshi:   ['#3f5a68', '#c49a50', '#111e29', '#e8e7dc', '#dfe4df'],
  bushi:    ['#75512c', '#c79a58', '#291b0d', '#f4e7cb', '#ece0c8'],
  xiangshu: ['#5e4955', '#b48a77', '#231720', '#f0e3dc', '#e8ddda'],
  zeri:     ['#963d31', '#d4aa62', '#30130f', '#f5e4ca', '#eee0ca'],
  tianwen:  ['#315269', '#b19a60', '#101d2a', '#e8e9df', '#dde3e1'],
  bencao:   ['#49633d', '#a99456', '#182516', '#edf0dc', '#e3e8d8'],
  daozang:  ['#31545b', '#bb985a', '#102326', '#e9e9d9', '#dfe5dc'],
});
const BOOK_COVERS = new Set([
  'xinji-bianfang', 'shenshi-xuankong', 'dili-wujue', 'bazhai-mingjing',
  'shanhaijing', 'yuanhai-ziping', 'zangshu', 'daodejing'
]);
function bookPalette(book) { return BOOK_PALETTES[book && book.category] || BOOK_PALETTES.jingyi; }
function bookCover(book) {
  if (book && BOOK_COVERS.has(book.id)) return `./img/covers/books/${encodeURIComponent(book.id)}.webp`;
  return `./img/covers/categories/${encodeURIComponent((book && book.category) || 'jingyi')}.webp`;
}
function bookThemeStyle(book) {
  const [accent, accentLight, dark, paper, card] = bookPalette(book);
  return `--book-accent:${accent};--book-accent-light:${accentLight};--book-dark:${dark};--book-paper:${paper};--book-card:${card};--book-cover:url('${bookCover(book)}')`;
}
function applyBookTheme(book) {
  const root = document.documentElement;
  const props = ['--accent', '--accent-light', '--bg-header', '--reader-bg'];
  if (!book) { props.forEach(prop => root.style.removeProperty(prop)); delete root.dataset.bookCategory; return; }
  const [accent, accentLight, dark, paper] = bookPalette(book);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-light', accentLight);
  root.style.setProperty('--bg-header', dark);
  if (State.theme !== 'night') root.style.setProperty('--reader-bg', paper);
  else root.style.removeProperty('--reader-bg');
  root.dataset.bookCategory = book.category || '';
}
function bookCoverHtml(book, cls = '') {
  return `<figure class="book-cover ${cls}" style="${bookThemeStyle(book)}">
    <img src="${bookCover(book)}" alt="${esc(book.title)}封面插画" width="800" height="1200" loading="lazy" decoding="async">
    <span class="book-cover-shade" aria-hidden="true"></span>
    <figcaption><span class="book-cover-cat">${esc((State.registry.categories || []).find(c => c.id === book.category)?.label || '')}</span><b>${esc(book.title)}</b><small>${esc([book.dynasty, book.author].filter(Boolean).join(' · '))}</small></figcaption>
  </figure>`;
}

// ─── 主题 / 字号 ───
function applyTheme() {
  document.documentElement.setAttribute('data-theme', State.theme === 'night' ? 'night' : '');
  const route = getRoute();
  applyBookTheme(State.registry && (route.page === 'book' || route.page === 'read') ? findBook(route.id) : null);
  localStorage.setItem(LS.theme, State.theme);
}
function applyFontSize() {
  document.documentElement.style.setProperty('--font-size', State.fontSize + 'px');
  localStorage.setItem(LS.fs, State.fontSize);
}
function toggleTheme() {
  State.theme = State.theme === 'night' ? 'antique' : 'night';
  applyTheme();
  const btn = el('theme-btn');
  if (btn) btn.textContent = State.theme === 'night' ? L('dj.theme.toDay') : L('dj.theme.toNight');
}
window.toggleTheme = toggleTheme;

// ─── 收藏 ───
function markKey(bookId, chapterId) { return bookId + '::' + chapterId; }
function isMarked(bookId, chapterId) {
  return State.marks.some(m => m.bookId === bookId && m.chapterId === chapterId);
}
function toggleMark(bookId, chapterId, label, bookTitle) {
  const i = State.marks.findIndex(m => m.bookId === bookId && m.chapterId === chapterId);
  if (i >= 0) State.marks.splice(i, 1);
  else State.marks.unshift({ bookId, chapterId, label, bookTitle, t: State.marks.length });
  localStorage.setItem(LS.marks, JSON.stringify(State.marks.slice(0, 60)));
}

// ─── 已读章节追踪 ───
function isChapterRead(bookId, chapterId) {
  const list = State.readChapters[bookId];
  return Array.isArray(list) && list.includes(chapterId);
}
function markChapterRead(bookId, chapterId) {
  if (!State.readChapters[bookId]) State.readChapters[bookId] = [];
  if (!State.readChapters[bookId].includes(chapterId)) {
    State.readChapters[bookId].push(chapterId);
    localStorage.setItem(LS.readChapters, JSON.stringify(State.readChapters));
  }
}
function getReadCount(bookId) {
  return (State.readChapters[bookId] || []).length;
}

// ─── 阅读进度 ───
function setLastRead(bookId, chapterId, label, bookTitle) {
  const key = bookId + '::' + chapterId;
  const oldRatio = State.lastRead && State.lastRead.bookId === bookId && State.lastRead.chapterId === chapterId
    ? Number(State.lastRead.ratio || 0) : getScroll(key);
  State.lastRead = { bookId, chapterId, label, bookTitle, ratio: oldRatio, updatedAt: Date.now() };
  localStorage.setItem(LS.last, JSON.stringify(State.lastRead));
}
function saveScroll(key, ratio) {
  const m = safeParse(localStorage.getItem(LS.scroll), {});
  m[key] = ratio;
  localStorage.setItem(LS.scroll, JSON.stringify(m));
  if (State.lastRead && key === State.lastRead.bookId + '::' + State.lastRead.chapterId) {
    State.lastRead.ratio = ratio;
    State.lastRead.updatedAt = Date.now();
    localStorage.setItem(LS.last, JSON.stringify(State.lastRead));
  }
}
function getScroll(key) {
  const m = safeParse(localStorage.getItem(LS.scroll), {});
  return m[key] || 0;
}

// ─── 数据加载 ───
async function loadRegistry() {
  const res = await fetch('./data/registry.json');
  State.registry = await res.json();
  return State.registry;
}
async function loadTextData(id) {
  if (State.textCache[id]) return State.textCache[id];
  if (State.textPromises[id]) return State.textPromises[id];
  State.textPromises[id] = fetch(`./data/texts/${id}.json`)
    .then(res => res.ok ? res.json() : null)
    .then(d => { if (d) State.textCache[id] = d; return d; })
    .catch(() => null)
    .finally(() => { delete State.textPromises[id]; });
  return State.textPromises[id];
}
// 逐句白话译注数据：data/annotated/<id>.json（风水/堪舆/命理类深做；无则 null）
async function loadAnnotated(id) {
  if (id in State.annotated) return State.annotated[id];
  if (State.annotatedPromises[id]) return State.annotatedPromises[id];
  State.annotatedPromises[id] = fetch(`./data/annotated/${id}.json`)
    .then(r => r.ok ? r.json() : null)
    .then(d => { State.annotated[id] = d; return d; })
    .catch(() => { State.annotated[id] = null; return null; })
    .finally(() => { delete State.annotatedPromises[id]; });
  return State.annotatedPromises[id];
}

function prefetchBook(id) {
  if (!id || !State.registry) return;
  const book = findBook(id);
  if (!book) return;
  if (book.hasTextData) loadTextData(id);
  if (book.hasAnnotated) loadAnnotated(id);
}

// ── 古籍英译层（Layer B）：EN 模式在原文句下挂一行英译 caption ──
// 铁律：orig 汉字原样在场，英译只作 caption；缺译/过期只显 orig，不回落 bai（诚实空白）。
function isEN() { return !!(window.I18N && window.I18N.lang === 'en'); }
// 句级短哈希：与 daos/tools/i18n/translate_tool.py orig_hash 同源（NFC 后 sha256 前 8 位十六进制）
async function sha8(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode((str || '').normalize('NFC')));
  return [...new Uint8Array(buf)].slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('');
}
// 加载某书英译 sidecar（data/translations/en/<id>.json）；索引 {`ch/i`: 句对象}。无则 null（懒加载+缓存）。
async function loadTranslation(id) {
  if (id in State.translations) return State.translations[id];
  try {
    const r = await fetch(`./data/translations/en/${id}.json`);
    if (!r.ok) { State.translations[id] = null; return null; }
    const d = await r.json();
    const idx = {};
    (d.sentences || []).forEach(s => { idx[s.ch + '/' + s.i] = s; });
    State.translations[id] = { idx, meta: d };
  } catch { State.translations[id] = null; }
  return State.translations[id];
}
// 预备当前书的 EN caption：逐句现场比对 origHash，失配（原文已改）即弃用该 en。仅 EN 模式做。
async function prepareEnCaptions(id) {
  State.enCaptions = {};
  if (!isEN()) return;
  const tr = await loadTranslation(id);
  const ann = State.annotated[id];
  if (!tr || !tr.idx || !ann) return;
  for (const ch of (ann.chapters || [])) {
    let arrIdx = -1;
    for (const s of (ch.sentences || [])) {
      arrIdx++;
      const di = (typeof s.i === 'number') ? s.i : arrIdx;   // 与 renderAnnotatedBody 同源的数据索引
      const t = tr.idx[ch.id + '/' + di];
      if (!t || !t.en || !s.orig || s.orig === '【待补】') continue;
      const live = await sha8(s.orig);
      if (t.origHash && live !== t.origHash) {
        console.warn('[i18n] 弃用过期译文 ' + id + ' ' + ch.id + '/' + di + '（origHash ' + t.origHash + ' != ' + live + '）');
        continue;   // 过期：诚实空白，只显原文
      }
      State.enCaptions[ch.id + '/' + di] = { en: t.en, enNote: t.enNote, conf: t.conf };
    }
  }
}
function toggleBai() {
  State.showBai = !State.showBai;
  localStorage.setItem(LS.showBai, State.showBai ? '1' : '0');
  render();
}
window.toggleBai = toggleBai;
function toggleAsent(si) { const d = el('asent-d-' + si); if (d) d.hidden = !d.hidden; }
window.toggleAsent = toggleAsent;
// 单句的「逐字/逻辑/量化/来源」展开内容
function sentDetailHtml(s) {
  let h = '';
  // 译注数据里 gloss 有三种历史形态（[[字,义]]/{字:义}/整段字符串）、src 有数组和字符串两种、
  // quant 偶见字符串——都是不同批次 agent 的输出漂移，此处全部兼容，缺一种就静默丢一批「释」内容
  const g = s.gloss;
  if (Array.isArray(g) && g.length)
    h += `<div class="sd-row"><b>逐字</b>${g.map(x => Array.isArray(x) ? `<span class="gloss">${esc(x[0])}：${esc(x[1])}</span>` : `<span class="gloss">${esc(String(x))}</span>`).join('')}</div>`;
  else if (g && typeof g === 'object' && Object.keys(g).length)
    h += `<div class="sd-row"><b>逐字</b>${Object.entries(g).map(([k, v]) => `<span class="gloss">${esc(k)}：${esc(String(v))}</span>`).join('')}</div>`;
  else if (typeof g === 'string' && g)
    h += `<div class="sd-row"><b>逐字</b><span class="gloss">${esc(g)}</span></div>`;
  if (s.logic) h += `<div class="sd-row"><b>逻辑</b>${esc(s.logic)}</div>`;
  if (s.quant && typeof s.quant === 'object' && !Array.isArray(s.quant)) {
    // quant 的键签名同样漂移（operational/…、value+type、metric+values、gis_azimuth_deg 等十余种），通用组装
    const q = s.quant;
    const kv = v => (v && typeof v === 'object') ? Object.entries(v).map(([k, x]) => `${k}=${x}`).join('、') : String(v);
    const main = q.operational || [
      q.metric || q.name || q.field || q.type || q.classical || '',
      q.value !== undefined && q.value !== null ? kv(q.value) : (q.values !== undefined ? kv(q.values) : (q.gis_azimuth_deg !== undefined ? `方位角 ${q.gis_azimuth_deg}°` : '')),
      q.unit || '',
    ].filter(Boolean).join('：');
    const ev = [q.evidence, q.note, q.context].filter(Boolean).join('；');
    if (main || ev)
      h += `<div class="sd-row sd-quant"><b>量化</b>${esc(main)}${ev ? `<span class="sd-ev">（${esc(ev)}）</span>` : ''}</div>`;
  } else if (typeof s.quant === 'string' && s.quant) {
    h += `<div class="sd-row sd-quant"><b>量化</b>${esc(s.quant)}</div>`;
  }
  if (Array.isArray(s.src) && s.src.length)
    h += `<div class="sd-row sd-src"><b>来源</b>${s.src.map(r => r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.source || r.what || '源')}</a>` : esc(r.source || '')).filter(Boolean).join('、')}</div>`;
  else if (typeof s.src === 'string' && s.src)
    h += `<div class="sd-row sd-src"><b>来源</b>${esc(s.src)}</div>`;
  const hasSrc = (Array.isArray(s.src) && s.src.length) || (typeof s.src === 'string' && s.src);
  if (s.conf === 'low' && !hasSrc)
    h += `<div class="sd-row sd-low">⚠ 暂无现成译注，此为模型试译，待校</div>`;
  return h;
}
// 分批展卷：首屏先落约两页，接近末端时再追加一页；数据已在内存，只延后 DOM/排版成本。
function lazyReaderHtml(items, renderer, options) {
  const opts = options || {};
  const pageSize = Math.max(1, opts.pageSize || 8);
  const keyOf = opts.keyOf || ((_, i) => i);
  const targetPos = opts.targetKey == null ? -1 : items.findIndex((item, i) => keyOf(item, i) === opts.targetKey);
  const initialCount = Math.min(items.length, Math.max(pageSize * 2, targetPos + 1));
  const state = {
    items, renderer, pageSize, keyOf, next: initialCount,
    containerClass: opts.containerClass || '', observer: null, append: null, expandAll: null, ensureIndex: null,
  };
  State._lazyReader = state;
  const first = items.slice(0, initialCount).map((item, i) => renderer(item, i)).join('');
  const sentinel = initialCount < items.length
    ? `<div class="reader-lazy-sentinel" id="reader-lazy-sentinel"><button onclick="loadMoreReader()"><i></i><span>${isEN() ? 'Unfurling' : '展卷中'}</span></button></div>` : '';
  return `<div class="${state.containerClass}">${first}${sentinel}</div>`;
}

function bindLazyReader() {
  const state = State._lazyReader;
  let sentinel = el('reader-lazy-sentinel');
  if (!state || !sentinel) return;
  const appendTo = end => {
    sentinel = el('reader-lazy-sentinel');
    if (!sentinel || end <= state.next) return;
    const html = state.items.slice(state.next, end).map((item, i) => state.renderer(item, state.next + i)).join('');
    sentinel.insertAdjacentHTML('beforebegin', html);
    state.next = end;
    bindPassageLongPress();
    if (state.next >= state.items.length) {
      if (state.observer) state.observer.disconnect();
      sentinel.remove(); sentinel = null;
    }
  };
  state.append = () => appendTo(Math.min(state.items.length, state.next + state.pageSize));
  state.expandAll = () => appendTo(state.items.length);
  state.ensureIndex = key => {
    const pos = state.items.findIndex((item, i) => state.keyOf(item, i) === key);
    if (pos >= state.next) appendTo(Math.min(state.items.length, pos + 1));
  };
  if ('IntersectionObserver' in window) {
    const root = State.orientation === 'vertical' ? el('reader-text') : null;
    state.observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) state.append();
    }, { root, rootMargin: '110%', threshold: 0.01 });
    state.observer.observe(sentinel);
    State._cleanups.push(() => state.observer && state.observer.disconnect());
  }
}
function loadMoreReader() { if (State._lazyReader && State._lazyReader.append) State._lazyReader.append(); }
window.loadMoreReader = loadMoreReader;

// 用逐句译注数据渲染一章正文（原文句下挂白话，点「释」展开）
function renderAnnotatedBody(annChapter, targetSent) {
  // 保留原始数据索引（句级锚点 #asent-<i> / toggle 用「数据索引 i」，非过滤后的渲染序号）
  const sents = (annChapter.sentences || [])
    .map((s, arrIdx) => ({ s, di: (typeof s.i === 'number') ? s.i : arrIdx }))
    .filter(x => x.s.orig && x.s.orig !== '【待补】');
  const en = isEN();
  const renderer = ({ s, di }) => {
    const detail = sentDetailHtml(s);
    // EN 模式：原文句下挂一行英译 caption（§0.3 原文永在场）；缺译/过期只显 orig，不回落 bai
    const cap = en ? State.enCaptions[annChapter.id + '/' + di] : null;
    return `<div class="asent" id="asent-${di}" data-lazy-key="${di}">
      <div class="asent-orig"${detail ? ` onclick="toggleAsent(${di})"` : ''}>${esc(s.orig)}${detail ? '<span class="asent-more">释</span>' : ''}</div>
      ${cap && cap.en ? `<div class="asent-en${cap.conf === 'low' ? ' asent-en-low' : ''}">${esc(cap.en)}${cap.conf === 'low' ? '<span class="asent-en-tag">site translation · unreviewed</span>' : ''}${cap.enNote ? `<span class="asent-en-note">${esc(cap.enNote)}</span>` : ''}</div>` : ''}
      ${!en && s.bai && State.showBai ? `<div class="asent-bai">${esc(s.bai)}</div>` : ''}
      ${detail ? `<div class="asent-detail" id="asent-d-${di}" hidden>${detail}</div>` : ''}
    </div>`;
  };
  return lazyReaderHtml(sents, renderer, {
    pageSize: 10, containerClass: 'annotated-body', targetKey: targetSent, keyOf: item => item.di,
  });
}
// 名著权威译本指引：data/classics-refs.json（这些经典不重译，指向已有权威译注）
async function loadClassicsRefs() {
  if (State.classicsRefs !== undefined) return State.classicsRefs;
  try {
    const r = await fetch('./data/classics-refs.json');
    State.classicsRefs = r.ok ? await r.json() : null;
  } catch { State.classicsRefs = null; }
  return State.classicsRefs;
}
// bare=true 时省略内部标题（由外层 accordion summary 提供）
function classicsRefHtml(id, bare) {
  const list = State.classicsRefs;
  if (!Array.isArray(list)) return '';
  const e = list.find(x => x.id === id);
  if (!e) return '';
  const refs = Array.isArray(e.refs) ? e.refs : [];
  const items = refs.map(r => `<li><b>${esc(r.book || '')}</b>${r.author ? ' · ' + esc(r.author) : ''}${r.publisher ? ' · ' + esc(r.publisher) : ''}${r.confidence === 'likely' ? ' <span class="ref-likely">（业内公认，出版信息待核）</span>' : ''}${r.note ? `<div class="ref-note">${esc(r.note)}</div>` : ''}</li>`).join('');
  if (e.status === 'has_refs') {
    return `<div class="classics-refs">
      ${bare ? '' : '<div class="classics-refs-title">📖 权威白话译注指引</div>'}
      <div class="classics-refs-lead">本书为公认经典，已有权威白话译注，本站不重复翻译，推荐研读：</div>
      <ul class="classics-refs-list">${items}</ul></div>`;
  }
  return `<div class="classics-refs none">
    ${bare ? '' : '<div class="classics-refs-title">📖 译注情况</div>'}
    <div class="classics-refs-lead">本书<b>暂无通行白话译注本</b>${refs.length ? '，仅有以下文言整理/校点本可参考：' : '，亦无正式整理出版物（仅原文/诵本）。'}</div>
    ${refs.length ? `<ul class="classics-refs-list">${items}</ul>` : ''}
    ${e.remark ? `<div class="ref-note">${esc(e.remark)}</div>` : ''}</div>`;
}
function findBook(id) { return (State.registry.books || []).find(b => b.id === id); }
// 是否「待补空壳」：状态待补、无引文、且无逐句译注（有译注的书永远算有内容，须露出）
function isBookPending(b) {
  return b.status === '待补' && !(b.fragments && b.fragments.length) && !b.hasAnnotated;
}
// 书卡角标用的规模串（章·字），三处复用
function bookStats(b) {
  const ch = b.chapterCount, cc = b.charCount;
  if (!ch) return '';
  if (!cc || cc < 50) return `${ch}章`;
  if (cc >= 10000) return `${ch}章·${(cc / 10000).toFixed(1)}万字`;
  return `${ch}章·${cc}字`;
}

// ─── 搜索索引：两段式 ───
// 藏书扩到 244 部 / 千万字后，全文索引 35MB（gzip 14MB）。一进站就下这个量，
// 手机上不可接受；而截断正文来压体积等于让搜索悄悄搜不全，更不可接受。
// 所以分两段：
//   第一段 _titles.json（599KB / gzip 50KB）只含书名章名，进站即载，打开就能搜；
//   第二段 <category>.json 是正文，用户点「搜正文」时才拉，拉完这一会话内一直可用。
// 正文分片本身未做任何截断——全部载完后的覆盖面与合并成一份完全一致。
// 分片同时解决 Cloudflare Pages 的 25MB 单文件上限。
// 兼容：若 search-index.json 仍是旧的扁平数组（未跑 ingest.py index），直接当全文用。
async function loadSearchManifest() {
  if (!State.searchManifestP) {
    State.searchManifestP = fetch('./data/search-index.json')
      .then(r => (r.ok ? r.json() : null)).catch(() => null);
  }
  return State.searchManifestP;
}

async function loadTitleIndex() {
  if (State.titleIdx) return State.titleIdx;
  if (!State.titleIdxP) {
    State.titleIdxP = (async () => {
      const m = await loadSearchManifest();
      if (Array.isArray(m)) {                       // 旧格式：本身就是全文索引
        for (const e of m) e._n = normalizeHan(e.text || '');
        State.searchIdx = m;
        State.ftLoaded = true;
        return m;
      }
      const r = await fetch('./data/search-index/_titles.json').catch(() => null);
      const d = r && r.ok ? await r.json() : [];
      for (const e of d) e._nl = normalizeHan((e.chapterLabel || '') + (e.bookTitle || ''));
      State.titleIdx = d;
      return d;
    })();
  }
  return State.titleIdxP;
}

// 按需拉全文分片。onProgress(已完成片数, 总片数) 用于显示进度。
async function loadFullIndex(onProgress) {
  if (State.searchIdx) return State.searchIdx;
  if (!State.ftP) {
    State.ftP = (async () => {
      const m = await loadSearchManifest();
      if (Array.isArray(m)) return m;
      const shards = (m && m.shards) || [];
      const out = [];
      let done = 0;
      for (const s of shards) {
        try {
          const r = await fetch(`./data/search-index/${s}.json`);
          if (r.ok) out.push(...(await r.json()));
        } catch (_) { /* 单片失败不影响其余，覆盖面在下方如实回报 */ }
        done++;
        if (onProgress) onProgress(done, shards.length);
      }
      for (const e of out) e._n = normalizeHan(e.text || '');
      State.searchIdx = out;
      State.ftLoaded = true;
      return out;
    })();
  }
  return State.ftP;
}

// 第一段：只搜书名与章名，进站即可用
function titleSearch(q, titles) {
  if (!titles || !ftQueryValid(q)) return [];
  const normQ = normalizeHan(q);
  const results = [];
  for (const e of titles) {
    if ((e._nl || '').includes(normQ)) {
      results.push({ bookId: e.bookId, bookTitle: e.bookTitle, chapterId: e.chapterId,
                     chapterLabel: e.chapterLabel, isAnnot: false, snippet: '' });
      if (results.length >= 80) break;
    }
  }
  return results;
}

// 在 entry.t 中找 q 的位置，返回前后 40 字的片段（繁简混搜：用归一化形式定位，高亮原文对应字）
function makeSnippet(text, q) {
  if (!text || !q) return '';
  const normT = normalizeHan(text);
  const normQ = normalizeHan(q);
  const idx = normT.indexOf(normQ);
  if (idx < 0) return '';
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + normQ.length + 40);
  const raw = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  return highlight(raw, q);  // highlight 内部再次归一化，正确标记繁体原文
}

// 查询是否达到全文搜索的最小长度：单个汉字即可（表意，检索有意义），
// 拉丁/ASCII 需≥2 字符以避免过度命中。
function ftQueryValid(q) {
  if (!q) return false;
  if (/[㐀-鿿豈-﫿]/.test(q)) return q.length >= 1;
  return q.length >= 2;
}

// 执行全文搜索，繁简混搜：用归一化形式比较，原文原样显示高亮
// 返回 [{bookId, bookTitle, chapterId, chapterLabel, snippet}]
function fullTextSearch(q, idx) {
  const entries = Array.isArray(idx) ? idx : (idx && idx.entries);
  if (!entries || !ftQueryValid(q)) return [];
  const results = [];
  const seen = new Set();
  const normQ = normalizeHan(q);
  for (const e of entries) {
    const normT = e._n || normalizeHan(e.text || ''); // 优先用预计算的归一化文本
    if (normT.includes(normQ)) {
      const key = e.bookId + '::' + e.chapterId;
      if (!seen.has(key)) {
        seen.add(key);
        const isAnnot = e.type === 'annotation';
        const cleanLabel = (e.chapterLabel || '').replace(/^\[导读\]/, '');
        results.push({ bookId: e.bookId, bookTitle: e.bookTitle, chapterId: e.chapterId, chapterLabel: cleanLabel, isAnnot, snippet: makeSnippet(e.text, q) });
      }
    }
    if (results.length >= 80) break;
  }
  return results;
}

// 章节是否仅有占位（用于淡化“待补”章）
function chapterIsPending(c) {
  const frags = c.fragments || [];
  if (!frags.length) return !(c.content && c.content.trim() && c.content !== '（内容待补）');
  return frags.every(f => f.text === '【待补】');
}
function chapterPreview(c) {
  const frags = (c.fragments || []).filter(f => f.text && f.text !== '【待补】');
  if (frags.length) {
    const t = frags[0].text;
    return t.substring(0, 34) + (t.length > 34 ? '…' : '');
  }
  if (c.content && c.content !== '（内容待补）') return c.content.substring(0, 34) + '…';
  return '待补';
}

// ─── 路由 ───
function getRoute() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  // 第4段 s<i> = 句级锚点（司南溯源深链），i 为逐句译注的数据索引
  const sentMatch = parts[3] && parts[3].match(/^s(\d+)$/);
  return {
    page: parts[0] || 'shelf', id: parts[1], chapter: parts[2] && decodeURIComponent(parts[2]),
    sent: sentMatch ? parseInt(sentMatch[1], 10) : null,
  };
}
function navigate(path, direction) {
  State._navDirection = direction || '';
  location.hash = path;
}
window.navigate = navigate;

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', init);

async function init() {
  applyTheme();
  applyFontSize();
  try {
    await loadRegistry();
    render();
    const warm = () => {
      if (State.lastRead) prefetchBook(State.lastRead.bookId);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 900 });
    else setTimeout(warm, 80);
    document.addEventListener('pointerdown', e => {
      const target = e.target.closest && e.target.closest('[data-book-id]');
      if (target) prefetchBook(target.dataset.bookId);
    }, { passive: true });
  } catch (e) {
    el('app').innerHTML = `<div class="empty-state"><div class="icon">⚠</div><div>加载书目失败：${esc(e.message)}</div></div>`;
  }
}

function runCleanups() {
  State._cleanups.forEach(fn => { try { fn(); } catch {} });
  State._cleanups = [];
}

function render() {
  runCleanups();
  State._lazyReader = null;
  const renderToken = ++State._renderToken;
  const route = getRoute();
  applyBookTheme(route.page === 'book' || route.page === 'read' ? findBook(route.id) : null);
  const app = el('app');
  const depth = route.page === 'read' ? 2 : route.page === 'book' || route.page === 'citations' || route.page === 'marks' ? 1 : 0;
  const direction = State._navDirection || (depth < State._routeDepth ? 'back' : 'forward');
  State._navDirection = '';
  State._routeDepth = depth;
  document.documentElement.dataset.view = route.page;
  document.documentElement.dataset.nav = direction;
  // 仅在“视图类型/对象”切换时播放过渡动画，避免原地更新闪烁
  const viewKey = route.page + ':' + (route.id || '') + ':' + (route.chapter || '');
  const animate = viewKey.split(':')[0] + viewKey.split(':')[1] !== State._lastView;
  State._lastView = viewKey.split(':')[0] + viewKey.split(':')[1];
  app.classList.toggle('view-anim', animate);
  if (animate) { app.classList.remove('view-anim'); void app.offsetWidth; app.classList.add('view-anim'); }
  app.classList.remove('view-forward', 'view-back');
  void app.offsetWidth;
  app.classList.add(direction === 'back' ? 'view-back' : 'view-forward');

  if (IS_EMBEDDED) {
    try { window.parent.postMessage({ type: 'sinan-dian-route', page: route.page }, location.origin); } catch (e) {}
  }

  switch (route.page) {
    case 'book': renderBook(route.id, renderToken); break;
    case 'read': renderReader(route.id, route.chapter, route.sent, renderToken); break;
    case 'citations': renderCitations(); window.scrollTo(0, 0); break;
    case 'marks': renderMarks(); window.scrollTo(0, 0); break;
    default: renderShelf(); window.scrollTo(0, 0); break;
  }
}

/* ══════════════════ 书架页 ══════════════════ */
function renderShelf() {
  const { registry, activeCat } = State;
  if (!registry) return;
  const categories = registry.categories;
  const allBooks = registry.books;
  const q = State.searchQuery.trim();

  // 顶部：继续阅读 + 收藏
  const lastPct = State.lastRead ? Math.round(Math.max(0, Math.min(1, Number(State.lastRead.ratio || 0))) * 100) : 0;
  const cont = State.lastRead && findBook(State.lastRead.bookId) ? `
    <button class="continue-bar" data-book-id="${esc(State.lastRead.bookId)}" onclick="navigate('#/read/${State.lastRead.bookId}/${encodeURIComponent(State.lastRead.chapterId)}')">
      <span class="continue-ic">▶</span>
      <span class="continue-txt">继续阅读 · <b>${esc(State.lastRead.bookTitle)}</b>
        <span class="continue-ch">${esc(State.lastRead.label || '')}${lastPct ? ` · ${lastPct}%` : ''}</span></span>
      <span class="continue-bookmark">${isEN() ? 'Auto bookmark' : '自动书签'}</span>
      <span class="continue-go">↪</span>
    </button>` : '';

  const html = `
    ${renderHero(allBooks)}
    <div class="shelf-chrome">
      <div class="search-bar">
        <input type="search" id="search-input" placeholder="搜索书名、作者、内容…"
          value="${esc(q)}" autocomplete="off" inputmode="search" enterkeyhint="search">
        ${q ? '<button class="search-clear" id="search-clear" aria-label="清空">✕</button>' : ''}
      </div>
      <div class="cat-tabs" id="cat-tabs">
        <button class="cat-tab ${activeCat === 'all' ? 'active' : ''}" data-cat="all">全部 ${allBooks.length}</button>
        ${categories.map(c => {
          const cnt = allBooks.filter(b => b.category === c.id).length;
          return `<button class="cat-tab ${activeCat === c.id ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${esc(c.label)} ${cnt}</button>`;
        }).join('')}
      </div>
      <div class="filter-row">
        <button class="filter-chip ${State.annotatedOnly ? 'active' : ''}" id="filter-annotated" type="button">✦ 有译注</button>
        <button class="filter-chip ${State.hidePending ? 'active' : ''}" id="filter-content" type="button">仅看有内容</button>
      </div>
    </div>
    ${cont}
    ${renderBookmarks()}
    <div class="bookshelf" id="shelf-results"></div>
    <div id="fulltext-results"></div>
  `;
  el('app').innerHTML = html;
  updateResults();
  updateFullTextResults();

  // 搜索：输入框只建一次，按键只更新结果，组字中途不过滤
  const si = el('search-input');
  const apply = debounce(() => { State.searchQuery = si.value; refreshChrome(); updateResults(); updateFullTextResults(); }, 120);
  si.addEventListener('compositionstart', () => { State._composing = true; });
  si.addEventListener('compositionend', () => { State._composing = false; apply(); });
  si.addEventListener('input', () => { if (!State._composing) apply(); });
  // 桌面端进入书架自动聚焦；移动端不抢焦点（避免弹键盘遮挡）
  if (!('ontouchstart' in window)) si.focus();

  // 分类切换：不重建输入框
  el('cat-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.cat-tab'); if (!btn) return;
    State.activeCat = btn.dataset.cat;
    qsa('.cat-tab').forEach(b => b.classList.toggle('active', b === btn));
    updateResults();
  });
  el('filter-content').addEventListener('click', e => {
    State.hidePending = !State.hidePending;
    e.currentTarget.classList.toggle('active', State.hidePending);
    updateResults();
  });
  el('filter-annotated').addEventListener('click', e => {
    State.annotatedOnly = !State.annotatedOnly;
    e.currentTarget.classList.toggle('active', State.annotatedOnly);
    updateResults();
  });
  const sc = el('search-clear');
  if (sc) sc.addEventListener('click', () => { si.value = ''; State.searchQuery = ''; si.focus(); refreshChrome(); updateResults(); });
}

// 仅刷新搜索框旁的清空按钮（避免重建输入框）
function refreshChrome() {
  const bar = qs('.search-bar'); if (!bar) return;
  const has = !!State.searchQuery.trim();
  let btn = el('search-clear');
  if (has && !btn) {
    btn = document.createElement('button');
    btn.className = 'search-clear'; btn.id = 'search-clear'; btn.textContent = '✕';
    btn.addEventListener('click', () => { const si = el('search-input'); si.value = ''; State.searchQuery = ''; si.focus(); refreshChrome(); updateResults(); });
    bar.appendChild(btn);
  } else if (!has && btn) btn.remove();
}

// 首页 hero：一句话定位 + 数据选出的「从这本开始」精选大卡
function renderHero(allBooks) {
  const annotatedCount = allBooks.filter(b => b.hasAnnotated && b.status !== '待补').length;
  const featured = allBooks
    .filter(b => b.hasAnnotated && b.status !== '待补')
    .sort((a, b) => (b.charCount || 0) - (a.charCount || 0))
    .slice(0, 4);
  const cards = featured.map(b => `
    <button class="hero-card" style="${bookThemeStyle(b)}" data-book-id="${esc(b.id)}" onclick="navigate('#/book/${b.id}')">
      <img class="hero-card-cover" src="${bookCover(b)}" alt="" width="800" height="1200" loading="lazy" decoding="async">
      <span class="hero-card-shade" aria-hidden="true"></span>
      <span class="hero-card-badge">逐句译注</span>
      <span class="hero-card-title">${esc(b.title)}</span>
      <span class="hero-card-meta">${esc(b.dynasty || '')}${bookStats(b) ? ' · ' + esc(bookStats(b)) : ''}</span>
    </button>`).join('');
  return `<div class="shelf-hero has-archive" id="shelf-hero">
    <figure class="archive-hero-media" aria-hidden="true">
      <img src="./img/changming-archive-hall-v3.webp" alt="" width="1600" height="900" loading="eager" decoding="async">
    </figure>
    <div class="archive-hero-shade" aria-hidden="true"></div>
    <div class="archive-hero-copy">
      <div class="hero-tag">常明城 · 藏经阁</div>
      <div class="hero-headline">每一句判断，都能回到它来时的原文</div>
      <div class="hero-sub">${allBooks.length} 部典籍入阁，其中 ${annotatedCount} 部可读逐句白话译注。这里不是书皮陈列，而是一座能查证、能追溯的城中档案馆。</div>
    </div>
    ${cards ? `<div class="archive-hero-picks"><div class="hero-pick-label">从这卷开始</div>
    <div class="hero-cards">${cards}</div></div>` : ''}
  </div>`;
}

function renderBookmarks() {
  if (!State.marks.length) return '';
  const showN = Math.min(State.marks.length, 8);
  const items = State.marks.slice(0, showN).map(m => `
    <button class="mark-chip" onclick="navigate('#/read/${m.bookId}/${encodeURIComponent(m.chapterId)}')">
      <b>${esc(m.bookTitle)}</b> · ${esc(m.label)}
    </button>`).join('');
  const moreCount = State.marks.length - 8;
  const moreBtn = moreCount > 0
    ? `<button class="marks-more" onclick="navigate('#/marks')">+${moreCount} 更多 →</button>` : '';
  const manageBtn = `<button class="marks-export" onclick="navigate('#/marks')" title="管理全部书签">管理</button>`;
  return `<div class="marks-row" id="marks-row">
    <div class="marks-header"><span class="marks-title">★ 收藏${State.marks.length > 1 ? '（' + State.marks.length + '）' : ''}</span>${manageBtn}</div>
    <div class="marks-list">${items}${moreBtn}</div>
  </div>`;
}

function exportMarks() {
  if (!State.marks.length) { showToast('暂无收藏'); return; }
  const lines = State.marks.map(m => `${m.bookTitle}·${m.label}`);
  const txt = '司南·典籍阁 书签导出\n' + new Date().toLocaleDateString('zh-CN') + '\n\n' + lines.join('\n');
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '典籍阁书签.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  showToast('书签已导出（' + State.marks.length + ' 条）');
}
window.exportMarks = exportMarks;

/* expandMarks 已废弃，#/marks 页代替 */

// 全目一览折叠表格（所有书，按分类顺序，与搜索/过滤无关）
function renderFullCatalog(allBooks, categories) {
  let idx = 0;
  const rows = categories.flatMap(cat => {
    const bks = allBooks.filter(b => b.category === cat.id);
    if (!bks.length) return [];
    const head = `<tr class="catalog-cat-row"><td colspan="5" class="catalog-cat-head">${cat.icon} ${esc(cat.label)}</td></tr>`;
    const brows = bks.map(b => {
      idx++;
      const statusCls = b.status === '待补' ? 'pending' : (b.status === '较全' ? 'done' : 'partial');
      const ch = b.chapterCount || '?';
      const cc = b.charCount;
      const chars = (cc && cc >= 10000) ? `${(cc / 10000).toFixed(1)}万字` : (cc && cc >= 50 ? `${cc}字` : '—');
      const alias = (b.authorNote && (b.authorNote.startsWith('【托名】') || b.authorNote.startsWith('【存疑】'))) ? '⚠' : '';
      return `<tr>
        <td class="cat-num">${idx}</td>
        <td class="cat-title" onclick="navigate('#/book/${esc(b.id)}')">${esc(b.title)}${alias ? `<sup>${alias}</sup>` : ''}</td>
        <td class="cat-dynasty">${esc(b.dynasty || '—')}</td>
        <td class="cat-ch">${ch}章·${chars}</td>
        <td><span class="book-status ${statusCls}">${esc(b.status || '可读')}</span></td>
      </tr>`;
    }).join('');
    return [head + brows];
  }).join('');
  const aliasCount = allBooks.filter(b => b.authorNote && (b.authorNote.startsWith('【托名】') || b.authorNote.startsWith('【存疑】'))).length;
  return `
    <details class="full-catalog">
      <summary>全目一览（${allBooks.length}部）</summary>
      <table class="catalog-table">
        <thead><tr><th>序</th><th>书名</th><th>朝代</th><th>规模</th><th>状态</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${aliasCount ? `<div class="catalog-note">⚠ 标记书目共 ${aliasCount} 部，题署作者存疑或为后世托名，书页有详注。</div>` : ''}
    </details>`;
}

// 只更新结果区，不动输入框/分类条
function updateResults() {
  const { registry, activeCat } = State;
  const allBooks = registry.books;
  const q = State.searchQuery.trim();
  const qNorm = q ? normalizeHan(q) : '';
  const books = allBooks.filter(b => {
    const matchCat = activeCat === 'all' || b.category === activeCat;
    if (State.hidePending && isBookPending(b)) return false;
    if (State.annotatedOnly && !b.hasAnnotated) return false;
    if (!q) return matchCat;
    const n = s => normalizeHan(s || '');
    const inFrag = (b.fragments || []).some(f =>
      (f.text && n(f.text).includes(qNorm)) || (f.ref && n(f.ref).includes(qNorm)));
    // 繁简混搜：所有字段归一化后比较；同时涵盖 authorNote/statusNote（如"托名""二手引用"）
    const matchSearch = n(b.title).includes(qNorm) || n(b.subtitle).includes(qNorm) ||
      n(b.author).includes(qNorm) || n(b.dynasty).includes(qNorm) ||
      n(b.authorNote).includes(qNorm) || n(b.statusNote).includes(qNorm) || inFrag;
    return matchCat && matchSearch;
  });

  // hero 仅在默认书架（无搜索、全部分类）时可见
  const heroEl = el('shelf-hero');
  if (heroEl) heroEl.style.display = (!q && activeCat === 'all') ? '' : 'none';

  const box = el('shelf-results'); if (!box) return;
  if (!books.length) {
    box.innerHTML = `<div class="empty-state"><div class="icon">🔍</div>
      <div>未找到${q ? `「${esc(q)}」相关` : ''}典籍</div></div>`;
    return;
  }
  const categories = registry.categories;
  const grouped = {}; categories.forEach(c => grouped[c.id] = []);
  books.forEach(b => { if (grouped[b.category]) grouped[b.category].push(b); });

  const searching = !!q;
  box.innerHTML = categories.filter(c => grouped[c.id].length).map(c => {
    const catBooks = grouped[c.id];
    // 待补空壳折进「筹备中」；有内容/有译注的排前（稳定排序，有译注置顶）
    const content = catBooks.filter(b => !isBookPending(b))
      .sort((a, b) => (b.hasAnnotated ? 1 : 0) - (a.hasAnnotated ? 1 : 0));
    const pending = catBooks.filter(b => isBookPending(b));
    const grid = arr => `<div class="book-grid">${arr.map(b => renderBookCard(b, q)).join('')}</div>`;
    let contentHtml;
    // 搜索态或不足 4 本时全展开；否则每分类默认 4 本 + 展开全部
    if (searching || content.length <= 4) {
      contentHtml = grid(content);
    } else {
      contentHtml = grid(content.slice(0, 4)) +
        `<details class="cat-expand"><summary>展开全部（还有 ${content.length - 4} 本）</summary>${grid(content.slice(4))}</details>`;
    }
    const pendingHtml = pending.length
      ? `<details class="cat-pending"><summary>筹备中（${pending.length} 本）</summary>${grid(pending)}</details>`
      : '';
    return `<div class="section-heading">${c.icon} ${esc(c.label)}</div>${contentHtml}${pendingHtml}`;
  }).join('')
    + renderFullCatalog(allBooks, categories)
    + `
    <div class="license-footer">
      <strong>司南·典籍阁</strong> · 古籍原文属公有领域 ·
      维基文库来源遵 <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC-BY-SA 4.0</a> ·
      <button class="cit-all-btn" onclick="navigate('#/citations')">引文全览</button> ·
      daos.leonardchow.work
      <div class="project-note">典籍阁程序与项目自有译注依 MIT License 开放。欢迎逐句指正版本、断句、翻译、注释与引文定位；请附可核查出处。
        报错或建议请联系 <a href="https://wa.me/6586863695" target="_blank" rel="noopener">WhatsApp</a>。</div>
    </div>`;
}

// 全文搜索结果区（异步更新，不阻塞书架渲染）
async function updateFullTextResults() {
  const box = el('fulltext-results'); if (!box) return;
  const q = State.searchQuery.trim();
  if (!ftQueryValid(q)) { box.innerHTML = ''; return; }

  // 显示加载中占位
  box.innerHTML = `<div class="ft-loading">搜索中…</div>`;

  // 记录本次 query，异步结束后校验是否仍有效（防止乱序回填）
  const thisQ = q;

  // 正文分片已在本会话载过就直接全文搜；否则先出章名命中，正文按需再拉。
  let hits, scope;
  if (State.ftLoaded) {
    hits = fullTextSearch(q, State.searchIdx);
    scope = 'full';
  } else {
    hits = titleSearch(q, await loadTitleIndex());
    scope = State.ftLoaded ? 'full' : 'title';   // 旧格式索引会在 loadTitleIndex 里直接转全文
    if (scope === 'full') hits = fullTextSearch(q, State.searchIdx);
  }
  if (State.searchQuery.trim() !== thisQ) return; // 用户已改变搜索词

  if (!hits.length && scope === 'full') { box.innerHTML = ''; return; }

  // 按书分组
  const byBook = {};
  hits.forEach(h => {
    if (!byBook[h.bookId]) byBook[h.bookId] = { bookTitle: h.bookTitle, chapters: [] };
    byBook[h.bookId].chapters.push(h);
  });

  const mf = await loadSearchManifest();
  const ftMB = (mf && mf.shardBytes)
    ? (Object.values(mf.shardBytes).reduce((a, b) => a + b, 0) / 1048576 / 2.4).toFixed(0)
    : '十余';
  const deepBar = scope === 'title'
    ? `<div class="ft-deep">
         <span>以上只搜了书名与章名。正文尚未载入（约 ${ftMB} MB，载一次本次浏览一直可用）。</span>
         <button class="ft-deep-btn" onclick="runDeepSearch()">搜正文</button>
       </div>`
    : '';

  const html = `
    <div class="ft-header">${scope === 'full' ? '全文' : '书名章名'}命中 ${hits.length} 处（${Object.keys(byBook).length} 部）</div>
    ${deepBar}
    ${Object.entries(byBook).map(([bid, g]) => `
      <div class="ft-book-group">
        <div class="ft-book-title" onclick="navigate('#/book/${bid}')">${highlight(g.bookTitle, q)}</div>
        ${g.chapters.slice(0, 5).map(h => `
          <div class="ft-chapter${h.isAnnot ? ' ft-chapter-annot' : ''}" onclick="navigate('#/read/${h.bookId}/${encodeURIComponent(h.chapterId)}')">
            ${h.isAnnot ? '<span class="ft-annot-tag">导读</span>' : ''}
            <span class="ft-ch-label">${esc(h.chapterLabel)}</span>
            <span class="ft-snippet">${h.snippet}</span>
          </div>`).join('')}
        ${g.chapters.length > 5 ? `<div class="ft-more">…另 ${g.chapters.length - 5} 处</div>` : ''}
      </div>`).join('')}`;
  if (State.searchQuery.trim() !== thisQ) return;
  box.innerHTML = html;
}

// 用户显式要求搜正文：按片拉取并回报进度，拉完重跑搜索。
// 空结果也照常回报，不假装「正在加载」——见 registry.meta.notice 的诚实原则。
window.runDeepSearch = runDeepSearch;
async function runDeepSearch() {
  const box = el('fulltext-results'); if (!box) return;
  const bar = box.querySelector('.ft-deep');
  if (bar) bar.innerHTML = '<span>正在载入正文索引…</span>';
  await loadFullIndex((done, total) => {
    if (bar) bar.innerHTML = `<span>正在载入正文索引… ${done}/${total} 片</span>`;
  });
  updateFullTextResults();
}

function renderBookCard(b, q) {
  const hasAlias = b.authorNote && (b.authorNote.startsWith('【托名】') || b.authorNote.startsWith('【存疑】'));
  const isPending = isBookPending(b);
  const statusCls = isPending ? 'pending' : (b.status === '部分' || b.status === '较全' ? 'partial' : 'done');
  const statusTxt = isPending ? '待补' : (b.status || '可读');
  const statsStr = bookStats(b);
  const readN = getReadCount(b.id);
  const readStr = readN > 0 ? `已读${readN}${b.chapterCount ? '/' + b.chapterCount : ''}章` : '';
  // 副标题繁简归一后与标题相同则不渲染（复用搜索的归一化）
  const showSub = b.subtitle && normalizeHan(b.subtitle) !== normalizeHan(b.title);
  return `
    <div class="book-card ${isPending ? 'is-pending' : ''} ${b.hasAnnotated ? 'has-annotated' : ''} ${State.lastRead && State.lastRead.bookId === b.id ? 'is-last-read' : ''}" style="${bookThemeStyle(b)}"
      data-book-id="${esc(b.id)}" onclick="navigate('#/book/${b.id}')">
      ${hasAlias ? '<span class="book-alias-note">托名</span>' : ''}
      ${b.hasAnnotated ? '<span class="book-annot-badge" title="逐句白话译注">逐句译注</span>' : ''}
      ${State.lastRead && State.lastRead.bookId === b.id ? `<span class="book-last-ribbon">${isEN() ? 'Last read' : '上次读到'}</span>` : ''}
      ${bookCoverHtml(b, 'book-card-cover')}
      <div class="book-card-copy"><div class="book-title">${highlight(b.title, q)}</div>
      ${showSub ? `<div class="book-dynasty">${highlight(b.subtitle, q)}</div>` : ''}
      <div class="book-author">${highlight(b.author || '', q)}</div>
      <div class="book-foot">
        <span class="book-dynasty">${esc(b.dynasty || '')}</span>
        ${statsStr ? `<span class="book-stats">${esc(statsStr)}</span>` : ''}
        ${readStr ? `<span class="book-read-tag">${esc(readStr)}</span>` : ''}
        <span class="book-status ${statusCls}">${esc(statusTxt)}</span>
      </div></div>
    </div>`;
}

/* ══════════════════ 书目详情页 ══════════════════ */
async function renderBook(id, renderToken) {
  const book = findBook(id);
  if (!book) { el('app').innerHTML = notFound('找不到典籍'); return; }
  State.currentBook = book;
  const hasAlias = book.authorNote && (book.authorNote.startsWith('【托名】') || book.authorNote.startsWith('【存疑】'));
  const fragments = book.fragments || [];

  el('app').innerHTML = `<div class="book-detail"><div class="reader-skeleton">载入中…</div></div>`;

  const [, textData] = await Promise.all([
    loadClassicsRefs(),
    book.hasTextData ? loadTextData(id) : Promise.resolve(null),
  ]);
  if (renderToken !== State._renderToken) return;
  const chapters = (textData && textData.chapters) || book.chapters || [];
  const fetchNote = textData && textData.fetchNote;
  const readableCh = chapters.filter(c => !chapterIsPending(c));
  const firstReadable = readableCh[0] || chapters[0];
  // 阅读进度圆环（书目详情页顶部，仅有阅读记录时显示）
  const readN = getReadCount(id);
  const totalCh = chapters.length;
  const ringHtml = (() => {
    if (readN <= 0 || totalCh <= 0) return '';
    const r = 22, circ = +(2 * Math.PI * r).toFixed(1);
    const off = +(circ * (1 - readN / totalCh)).toFixed(1);
    const pct = Math.round(readN / totalCh * 100);
    return `<div class="book-read-ring-row">
      <div class="book-read-ring-wrap">
        <svg viewBox="0 0 56 56" width="56" height="56">
          <circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--border)" stroke-width="5"/>
          <circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--accent)" stroke-width="5"
            stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}"
            style="transform:rotate(-90deg);transform-origin:28px 28px"/>
        </svg>
        <div class="book-read-ring-center">${readN}</div>
      </div>
      <div class="book-read-ring-info">
        <div class="book-read-ring-text">已读 <b>${readN}/${totalCh}</b> 章</div>
        <div class="book-read-ring-pct">${pct}% 完成</div>
      </div>
    </div>`;
  })();
  // 本书名句：滤掉占位/待补片段（占位不当名句展示）；保留原始下标供 fragment-N 路由
  const fragItems = fragments
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.text && f.text.length >= 5 && !f.text.includes('待从维基') && !f.text.includes('仓库已有') && !f.text.startsWith('（'));

  // 版本与出处：作者/引文/收录/来源四条合并为默认收起的 accordion
  const metaSummary = `底本：${esc(book.sourceName || '维基文库')}${book.sourceCC ? '（' + esc(book.sourceCC) + '）' : ''}`;
  const metaAccordion = `<details class="meta-acc">
    <summary>版本与出处 <span class="acc-hint">${metaSummary}</span></summary>
    <div class="acc-body">
      ${book.authorNote ? `<div class="book-detail-note"><strong>作者说明：</strong>${esc(book.authorNote)}</div>` : ''}
      ${fetchNote ? `<div class="book-detail-note dim"><strong>引文说明：</strong>${esc(fetchNote)}</div>` : ''}
      ${book.statusNote ? `<div class="book-detail-note"><strong>收录说明：</strong>${esc(book.statusNote)}</div>` : ''}
      <div class="book-detail-source">来源：<a href="${esc(book.source)}" target="_blank" rel="noopener">${esc(book.sourceName || '维基文库')}</a>${book.sourceCC ? `（${esc(book.sourceCC)}）` : ''}</div>
    </div></details>`;

  // 权威白话译注指引：移到目录之后并默认收起
  const refsInner = classicsRefHtml(id, true);
  const refsAccordion = refsInner
    ? `<details class="refs-acc"><summary>📖 白话译注指引</summary><div class="acc-body">${refsInner}</div></details>`
    : '';

  el('app').innerHTML = `
    <div class="book-detail">
      <div class="book-nav-bar">
        <button class="back-btn" onclick="goBack()">← 书架</button>
        <input type="search" class="quick-search" id="quick-search-input"
          placeholder="🔍 全库搜索…" autocomplete="off" enterkeyhint="search"
          value="${esc(State.searchQuery)}" onkeydown="handleQuickSearch(event)">
      </div>

      <div class="book-detail-header" style="${bookThemeStyle(book)}">
        ${bookCoverHtml(book, 'book-detail-cover')}
        <div class="book-detail-copy"><div class="book-detail-title">${esc(book.title)}</div>
        ${book.subtitle && normalizeHan(book.subtitle) !== normalizeHan(book.title) ? `<div class="book-detail-subtitle">${esc(book.subtitle)}</div>` : ''}
        <div class="book-detail-meta">
          <span class="meta-chip">📅 ${esc(book.dynasty || '')}</span>
          <span class="meta-chip">✍ ${esc(book.author || '')}</span>
          ${hasAlias ? '<span class="meta-chip warning">⚠ 托名/存疑</span>' : ''}
          ${book.hasAnnotated ? '<span class="meta-chip annot">✦ 逐句译注</span>' : ''}
          <span class="meta-chip">📄 ${esc(book.licenseNote || '公有领域')}</span>
        </div>
        ${ringHtml}
        ${firstReadable ? `<button class="primary-read-btn"
          onclick="navigate('#/read/${id}/${encodeURIComponent(firstReadable.id)}')">▶ 开始阅读</button>` : ''}
        </div>
      </div>

      ${chapters.length ? `
        <div class="section-title">篇章目录（${chapters.length}章${readableCh.length < chapters.length ? `，${readableCh.length}章有内容` : ''}）</div>
        <div class="chapter-list">
          ${chapters.map((c, i) => {
            const label = c.label || c.title || c.id;
            const pending = chapterIsPending(c);
            return `<div class="chapter-row ${pending ? 'pending-chapter' : ''}"
                onclick="navigate('#/read/${id}/${encodeURIComponent(c.id)}')">
                <span class="chapter-idx">${i + 1}</span>
                <span class="chapter-main">
                  <span class="chapter-label">${esc(label)}</span>
                  <span class="chapter-prev">${esc(chapterPreview(c))}</span>
                </span>
                ${pending ? '<span class="chapter-tag">待补</span>' : '<span class="chapter-arrow">›</span>'}
              </div>`;
          }).join('')}
        </div>` : (fragItems.length ? '' : `
        <div class="empty-state">
          <div class="icon">📜</div><div>全文尚未收录</div>
          <div class="sub">可前往 <a href="${esc(book.source)}" target="_blank" rel="noopener">${esc(book.sourceName || '维基文库')}</a> 查阅原文</div>
        </div>`)}

      ${fragItems.length ? `
        <div class="section-title">本书名句（${fragItems.length}条）</div>
        <div class="fragment-list">
          ${fragItems.map(({ f, i }) => {
            const mch = findChapterForFragment(f, chapters);
            const dest = mch ? `#/read/${id}/${encodeURIComponent(mch.id)}` : `#/read/${id}/fragment-${i}`;
            const chLink = mch ? `<div class="frag-chapter-link">→ 跳至·<b>${esc(mch.label || mch.id)}</b></div>` : '';
            return `<div class="fragment-item" onclick="navigate('${dest}')">
              <div class="fragment-ref">【${esc(f.ref)}】</div>
              <div class="fragment-text">${esc(f.text)}</div>
              ${f.source ? `<div class="fragment-source">出处：${esc(f.source)}</div>` : ''}
              ${chLink}
            </div>`;
          }).join('')}
        </div>` : ''}

      ${metaAccordion}
      ${refsAccordion}

      ${book.status === '待补' ? `
        <div class="contribute-box">
          <div class="contribute-title">📖 帮助完善此书</div>
          <div class="contribute-body">此书原文尚未收录。如您能从
            <a href="${esc(book.source)}" target="_blank" rel="noopener">${esc(book.sourceName || '维基文库')}</a>
            或 <a href="https://ctext.org" target="_blank" rel="noopener">中国哲学书电子化计划（ctext.org）</a>
            获取原文，欢迎通过 GitHub 提 issue 贡献。古文原文为公有领域，无版权障碍。
          </div>
          <a class="contribute-btn" href="https://github.com/shuaige121/sinan-app/issues/new?title=典籍阁-补录原文：${encodeURIComponent(book.title)}&body=书名：${encodeURIComponent(book.title)}%0A维基文库链接：${encodeURIComponent(book.source || '')}" target="_blank" rel="noopener">在 GitHub 提交补录请求 →</a>
        </div>` : ''}

      ${renderRelatedBooks(book)}

      <div class="license-footer">
        ${book.sourceCC === 'CC-BY-SA'
          ? `本页内容来自 <a href="${esc(book.source)}" target="_blank" rel="noopener">${esc(book.sourceName)}</a>，遵 CC-BY-SA 4.0，须同协议分享并注明来源。`
          : '古籍原文属公有领域。'} 项目自有译文与注释欢迎有出处的校订。
      </div>
    </div>`;
  window.scrollTo(0, 0);
}

// 同类推荐（同分类的其他书，最多4本，按字数排序取内容最丰富的）
function renderRelatedBooks(book) {
  const siblings = (State.registry.books || [])
    .filter(b => b.id !== book.id && b.category === book.category)
    .sort((a, b) => (b.charCount || 0) - (a.charCount || 0))
    .slice(0, 4);
  if (!siblings.length) return '';
  const catLabel = (State.registry.categories || []).find(c => c.id === book.category)?.label || '';
  return `
    <div class="section-title">同类典籍（${catLabel}）</div>
    <div class="related-books">
      ${siblings.map(s => {
        const statsStr = (() => {
          const ch = s.chapterCount;
          const cc = s.charCount;
          if (!ch) return '';
          if (!cc || cc < 50) return `${ch}章`;
          if (cc >= 10000) return `${ch}章·${(cc / 10000).toFixed(1)}万字`;
          return `${ch}章·${cc}字`;
        })();
        return `<div class="related-chip" onclick="navigate('#/book/${s.id}')">
          <span class="related-title">${esc(s.title)}</span>
          ${statsStr ? `<span class="related-stats">${esc(statsStr)}</span>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

function goBack() { if (history.length > 1) history.back(); else navigate('#/'); }
window.goBack = goBack;

function handleQuickSearch(e) {
  if (e.key === 'Enter') { State.searchQuery = e.target.value.trim(); navigate('#/'); }
}
window.handleQuickSearch = handleQuickSearch;

/* ══════════════════ 阅读器页 ══════════════════ */
async function renderReader(id, chapterParam, sent, renderToken) {
  const book = findBook(id);
  if (!book) { el('app').innerHTML = notFound('找不到典籍'); return; }

  // 引文片段阅读
  const fragMatch = chapterParam && chapterParam.match(/^fragment-(\d+)$/);
  if (fragMatch) {
    const f = (book.fragments || [])[parseInt(fragMatch[1])];
    if (f) { renderFragmentReader(book, f); return; }
  }

  el('app').innerHTML = `<div class="reader-container"><div class="reader-skeleton">载入中…</div></div>`;
  const [textData] = await Promise.all([
    loadTextData(id),
    book.hasAnnotated ? loadAnnotated(id) : Promise.resolve(null),
  ]); // 文本与译注并发；预取命中时两者都直接从内存返回
  if (book.hasAnnotated && isEN()) await prepareEnCaptions(id);  // EN 模式预备英译 caption（含 origHash 现场比对）
  if (renderToken !== State._renderToken) return;
  const chapters = (textData && textData.chapters) || book.chapters || [];
  const idx = chapters.findIndex(c => c.id === chapterParam);
  const chapter = idx >= 0 ? chapters[idx] : null;

  if (!chapter) {
    el('app').innerHTML = `
      <div class="reader-container"><div class="reader-content">
        <div class="empty-state"><div class="icon">📜</div><div>本篇章尚未收录</div>
          <div class="sub"><a href="${esc(book.source)}" target="_blank" rel="noopener">前往 ${esc(book.sourceName || '维基文库')}</a></div></div>
        <button class="back-btn center" onclick="navigate('#/book/${id}')">← 返回 ${esc(book.title)}</button>
      </div></div>`;
    return;
  }
  renderChapterContent(book, chapters, idx, sent);
}

// 句级锚点：按数据索引 i 定位 #asent-<i>，scrollIntoView + 2s 金色高亮渐隐；无此段静默回退章顶
function scrollToSentence(sent) {
  if (sent == null) return;
  const target = document.getElementById('asent-' + sent);
  if (!target) return;   // 无此段：静默回退（已在章顶）
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('asent-flash');
    setTimeout(() => target.classList.remove('asent-flash'), 2000);
  });
}

function readerChrome(book, breadcrumb, bodyHtml, navHtml, markBtn, chapPos) {
  const isVertical = State.orientation === 'vertical';
  return `
    <div class="reading-progress" id="reading-progress"><span id="progress-fill"></span></div>
    <div class="reader-container book-themed" style="${bookThemeStyle(book)}">
      <div class="reader-toolbar">
        <img class="reader-cover-mark" src="${bookCover(book)}" alt="" width="32" height="48">
        <button class="back-btn" onclick="navigate('#/book/${book.id}', 'back')">← ${esc(book.title)}</button>
        <div class="breadcrumb">${esc(breadcrumb)}${chapPos ? `<span class="chap-pos">${esc(chapPos)}</span>` : ''}</div>
        ${markBtn || ''}
        <button class="orientation-btn ${!isVertical ? 'active' : ''}" data-o="horizontal" title="横排">横</button>
        <button class="orientation-btn ${isVertical ? 'active' : ''}" data-o="vertical" title="竖排">竖</button>
        <button class="fs-btn" id="fs-btn" title="字号">字</button>
      </div>
      <div class="reader-content ${isVertical ? 'vertical' : 'horizontal'}" id="reader-text">
        ${bodyHtml}
      </div>
      ${navHtml || ''}
    </div>
    <button class="back-to-top" id="back-to-top" title="回到顶部" onclick="scrollToTop()">↑</button>
    ${renderFsPanel()}`;
}

function renderFragmentBody(book, label, fragments, chapterSource) {
  const items = fragments.map((f, fi) => ({ f, fi }));
  const renderer = ({ f, fi }) => {
    if (f.text === '【待补】') {
      return `<div class="passage-pending" id="frag-${fi}" data-lazy-key="${fi}"><span>【待补】</span>
        ${chapterSource ? `<a href="${esc(chapterSource)}" target="_blank" rel="noopener">→ 维基文库原文</a>` : ''}</div>`;
    }
    return `<div class="passage-block" id="frag-${fi}" data-lazy-key="${fi}">
      ${f.attribution ? `<div class="passage-attr">（${esc(f.attribution)}）</div>` : ''}
      <div class="passage-text">${esc(f.text)}</div>
      ${f.note ? `<div class="passage-note">${esc(f.note)}</div>` : ''}
      <button class="copy-btn" onclick="copyPassage(this)" data-text="${esc(f.text)}" data-src="${esc(book.title + '·' + label)}" title="复制原文">📋</button></div>`;
  };
  return lazyReaderHtml(items, renderer, { pageSize: 4, containerClass: 'fragment-body', keyOf: item => item.fi });
}

function renderPlainBody(content) {
  const raw = String(content || '（内容待补）');
  const paragraphs = raw.split(/\n{2,}/).flatMap(part => {
    if (part.length <= 900) return [part];
    const chunks = [];
    for (let i = 0; i < part.length; i += 900) chunks.push(part.slice(i, i + 900));
    return chunks;
  }).filter(Boolean);
  return lazyReaderHtml(paragraphs, (part, i) =>
    `<div class="passage-block passage-plain" data-lazy-key="${i}"><div class="passage-text">${esc(part)}</div></div>`,
    { pageSize: 1, containerClass: 'plain-body' });
}

function renderChapterContent(book, chapters, idx, sent) {
  const chapter = chapters[idx];
  const label = chapter.label || chapter.title || chapter.id;
  const fragments = chapter.fragments || [];
  const hasFragments = fragments.length > 0;

  // 逐句白话译注（风水/堪舆/命理类深做章节）：原文句下挂白话，点句展开逐字/量化/来源
  const annBook = State.annotated[book.id];
  const annChapter = annBook && (annBook.chapters || []).find(c => c.id === chapter.id);
  const hasAnn = !!(annChapter && (annChapter.sentences || []).some(s => s.bai));
  // EN 模式隐藏「白话开关」——白话是给中文读者的声部，EN 下停显（缺译只显原文，不回落白话）
  const baiToggleBar = (hasAnn && !isEN())
    ? `<div class="bai-toggle-bar"><button class="bai-btn ${State.showBai ? 'active' : ''}" onclick="toggleBai()" title="逐句白话译文">${State.showBai ? '译·开' : '译·关'}</button><span class="bai-hint">点原文句可展开逐字·量化·来源</span></div>`
    : '';

  const bodyInner = hasAnn
    ? renderAnnotatedBody(annChapter, sent)
    : hasFragments
    ? renderFragmentBody(book, label, fragments, chapter.wikisource)
    : renderPlainBody(chapter.content);

  // 站方导读批注（chapter.annotation，自撰现代汉语，非古文）
  const annotHtml = chapter.annotation
    ? `<div class="chapter-annotation"><span class="chapter-annotation-label">【站方导读·自撰，非古文】</span>${esc(chapter.annotation)}</div>`
    : '';

  // 段落跳转栏（章节超过15段时显示）
  const jumpBar = hasFragments && fragments.length > 15
    ? `<div class="frag-jump-bar" id="frag-jump-bar">
        <span class="frag-jump-label">跳段：</span>
        ${fragments.map((f, fi) => { const tip = (f.text && f.text !== '【待补】') ? esc(f.text.slice(0, 18)) : ''; return `<button class="frag-jump-btn" onclick="fragJump(${fi})"${tip ? ` title="${tip}"` : ''}>${fi + 1}</button>`; }).join('')}
      </div>`
    : '';

  const bodyHtml = `<div class="chapter-heading">【${esc(label)}】</div>${annotHtml}${baiToggleBar}${jumpBar}${bodyInner}
    <div class="passage-source">出处：${esc(book.title)}·${esc(label)}
      ${book.sourceCC === 'CC-BY-SA' ? `／ 内容来自 <a href="${esc(book.source)}" target="_blank" rel="noopener">${esc(book.sourceName)}</a>，CC-BY-SA 4.0` : '（古籍原文，公有领域）'}</div>`;

  // 上一/下一章（跳过纯待补章）
  const prev = prevReadable(chapters, idx);
  const next = nextReadable(chapters, idx);
  const navHtml = `<div class="chapter-nav">
      <button class="chap-btn ${prev ? '' : 'disabled'}" ${prev ? `onclick="navigate('#/read/${book.id}/${encodeURIComponent(prev.id)}', 'back')"` : 'disabled'}>‹ 上一篇</button>
      <button class="chap-btn mid" onclick="openDrawer()">目录</button>
      <button class="chap-btn ${next ? '' : 'disabled'}" ${next ? `onclick="navigate('#/read/${book.id}/${encodeURIComponent(next.id)}')"` : 'disabled'}>下一篇 ›</button>
    </div>`;

  const marked = isMarked(book.id, chapter.id);
  const markBtn = `<button class="mark-btn ${marked ? 'on' : ''}" id="mark-btn" title="收藏">${marked ? '★' : '☆'}</button>`;
  const chapPos = chapters.length > 1 ? `${idx + 1}/${chapters.length}` : '';

  el('app').innerHTML = readerChrome(book, label, bodyHtml, navHtml, markBtn, chapPos)
    + renderDrawer(book, chapters, idx);

  setLastRead(book.id, chapter.id, label, book.title);
  bindLazyReader();
  bindReaderControls(book, chapters, idx);
  bindPassageLongPress();
  scrollToSentence(sent);
}

// 回顶：横排滚动页面，竖排滚动阅读器容器横轴
function scrollToTop() {
  const rt = el('reader-text');
  if (rt && rt.classList.contains('vertical')) {
    rt.scrollTo({ left: 0, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
window.scrollToTop = scrollToTop;

// 段落跳转：横排模式滚动到对应锚点；竖排模式也类似
function fragJump(fi) {
  let target = document.getElementById('frag-' + fi);
  if (!target && State._lazyReader && State._lazyReader.ensureIndex) {
    State._lazyReader.ensureIndex(fi);
    target = document.getElementById('frag-' + fi);
  }
  if (!target) return;
  const rt = el('reader-text');
  if (rt && rt.classList.contains('vertical')) {
    // 竖排模式：横向滚动
    const containerRect = rt.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    rt.scrollLeft += targetRect.left - containerRect.left - 20;
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}
window.fragJump = fragJump;

// 复制引文到剪贴板（附出处），显示 toast 提示
function showToast(msg, durationMs) {
  let t = document.getElementById('copy-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'copy-toast';
    t.className = 'copy-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), durationMs || 1800);
}

function copyPassage(btn) {
  const text = btn.getAttribute('data-text') || '';
  const src = btn.getAttribute('data-src') || '';
  const full = text + '\n——《' + src + '》';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(full)
      .then(() => showToast('已复制'))
      .catch(() => showToast('复制失败，请手动长按选取'));
  } else {
    showToast('浏览器不支持自动复制，请手动长按选取');
  }
}
window.copyPassage = copyPassage;

// 移动端长按 passage-block 触发复制（补偿 iOS 无 hover 场景）
function bindPassageLongPress() {
  const LONG_MS = 600;
  document.querySelectorAll('.passage-block:not([data-longpress-bound])').forEach(block => {
    block.dataset.longpressBound = '1';
    let timer = null;
    const cancel = () => { clearTimeout(timer); timer = null; block.classList.remove('pressing'); };
    block.addEventListener('touchstart', e => {
      // 忽略多指手势（缩放/双指）
      if (e.touches.length > 1) return;
      cancel();
      block.classList.add('pressing');
      timer = setTimeout(() => {
        block.classList.remove('pressing');
        timer = null;
        const btn = block.querySelector('.copy-btn');
        if (btn) btn.click();
      }, LONG_MS);
    }, { passive: true });
    block.addEventListener('touchmove', cancel, { passive: true });
    block.addEventListener('touchend', cancel, { passive: true });
    block.addEventListener('touchcancel', cancel, { passive: true });
  });
}

function renderFragmentReader(book, f) {
  const bodyHtml = `<div class="chapter-heading">【${esc(f.ref)}】</div>
    <div class="passage-block"><div class="passage-text">${esc(f.text)}</div></div>
    <div class="passage-source">出处：${esc(book.title)}·${esc(f.ref)} ／ 引文来源：${esc(f.source)}
      ${book.sourceCC === 'CC-BY-SA' ? `／ ${esc(book.sourceName)}，CC-BY-SA 4.0` : '（公有领域）'}</div>`;
  const navHtml = `<div class="chapter-nav"><button class="chap-btn mid" onclick="navigate('#/book/${book.id}')">← 返回 ${esc(book.title)}</button></div>`;
  el('app').innerHTML = readerChrome(book, f.ref, bodyHtml, navHtml, '');
  bindReaderControls(book, null, -1);
}

function prevReadable(chapters, idx) {
  for (let i = idx - 1; i >= 0; i--) if (!chapterIsPending(chapters[i])) return chapters[i];
  return idx > 0 ? chapters[idx - 1] : null;
}
function nextReadable(chapters, idx) {
  for (let i = idx + 1; i < chapters.length; i++) if (!chapterIsPending(chapters[i])) return chapters[i];
  return idx < chapters.length - 1 ? chapters[idx + 1] : null;
}

function renderDrawer(book, chapters, idx) {
  const showSearch = chapters.length >= 6;
  return `
    <div class="drawer-mask" id="drawer-mask" onclick="closeDrawer()"></div>
    <div class="drawer" id="drawer">
      <div class="drawer-head">${esc(book.title)} · 目录</div>
      ${showSearch ? `<input type="search" class="drawer-search" id="drawer-search"
        placeholder="搜章节…" oninput="filterDrawer(this.value)" autocomplete="off">` : ''}
      <div class="drawer-list" id="drawer-list">
        ${chapters.map((c, i) => {
          const label = c.label || c.title || c.id;
          const pending = chapterIsPending(c);
          const isRead = isChapterRead(book.id, c.id);
          return `<div class="drawer-item ${i === idx ? 'current' : ''} ${pending ? 'pending' : ''}${isRead ? ' is-read' : ''}"
            data-label="${esc(label.toLowerCase())}"
            onclick="closeDrawer();navigate('#/read/${book.id}/${encodeURIComponent(c.id)}')">
            <span class="drawer-idx">${i + 1}</span><span>${esc(label)}</span>
            ${isRead ? '<span class="drawer-read-mark" title="已读">✓</span>' : ''}
            ${pending ? '<span class="chapter-tag">待补</span>' : ''}</div>`;
        }).join('')}
        <div class="drawer-no-result hidden" id="drawer-no-result">无匹配章节</div>
      </div>
    </div>`;
}
function filterDrawer(q) {
  const term = q.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll('.drawer-item').forEach(item => {
    const label = item.dataset.label || '';
    const match = !term || label.includes(term);
    item.classList.toggle('hidden', !match);
    if (match) shown++;
  });
  const noResult = el('drawer-no-result');
  if (noResult) noResult.classList.toggle('hidden', shown > 0 || !term);
}
function openDrawer() {
  el('drawer')?.classList.add('open');
  el('drawer-mask')?.classList.add('show');
  setTimeout(() => el('drawer-search')?.focus(), 280);
}
function closeDrawer() {
  el('drawer')?.classList.remove('open');
  el('drawer-mask')?.classList.remove('show');
  const s = el('drawer-search');
  if (s) { s.value = ''; filterDrawer(''); }
}
window.openDrawer = openDrawer; window.closeDrawer = closeDrawer; window.filterDrawer = filterDrawer;

function renderFsPanel() {
  return `<div class="fs-panel hidden" id="fs-panel">
      <span class="fs-label">字号</span>
      <button class="fs-step" id="fs-minus">−</button>
      <span class="fs-label" id="fs-value">${State.fontSize}px</span>
      <button class="fs-step" id="fs-plus">＋</button>
    </div>`;
}

// ─── 阅读器交互绑定（统一在 _cleanups 注销）───
function bindReaderControls(book, chapters, idx) {
  const text = el('reader-text');
  const fsBtn = el('fs-btn'), fsPanel = el('fs-panel');
  const isVertical = () => State.orientation === 'vertical';

  // 字号面板
  const onFsBtn = e => { e.stopPropagation(); fsPanel.classList.toggle('hidden'); };
  const onDocClick = e => { if (fsPanel && !fsPanel.contains(e.target) && e.target !== fsBtn) fsPanel.classList.add('hidden'); };
  fsBtn?.addEventListener('click', onFsBtn);
  document.addEventListener('click', onDocClick);
  el('fs-minus')?.addEventListener('click', () => changeFontSize(-1));
  el('fs-plus')?.addEventListener('click', () => changeFontSize(1));

  // 横竖排切换
  qsa('.orientation-btn').forEach(b => b.addEventListener('click', () => setOrientation(b.dataset.o)));

  // 收藏
  const mb = el('mark-btn');
  if (mb && chapters && idx >= 0) {
    const c = chapters[idx];
    mb.addEventListener('click', () => {
      toggleMark(book.id, c.id, c.label || c.title || c.id, book.title);
      const on = isMarked(book.id, c.id);
      mb.classList.toggle('on', on); mb.textContent = on ? '★' : '☆';
    });
  }

  // 阅读进度条 + 滚动位置记忆 + 回顶按钮显隐
  const scrollKey = book.id + '::' + (chapters && idx >= 0 ? chapters[idx].id : 'frag');
  const fill = el('progress-fill');
  const btt = el('back-to-top');
  let scrollRaf = 0;
  const updateScroll = () => {
    scrollRaf = 0;
    let r;
    if (isVertical() && text) {
      const sl = text.scrollWidth - text.clientWidth;        // 竖排：横向滚动轴
      r = sl > 0 ? Math.min(1, Math.abs(text.scrollLeft) / sl) : 0;
      if (btt) btt.classList.toggle('show', text.scrollLeft > 200);
    } else {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      r = h > 0 ? window.scrollY / h : 0;
      if (btt) btt.classList.toggle('show', window.scrollY > 300);
    }
    if (fill) fill.style.transform = `scaleX(${Math.max(0, Math.min(1, r)).toFixed(4)})`;
    if (r >= 0.85 && chapters && idx >= 0) markChapterRead(book.id, chapters[idx].id);
    saveScrollThrottled(scrollKey, r);
  };
  const onScroll = () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(updateScroll); };
  window.addEventListener('scroll', onScroll, { passive: true });
  if (text) text.addEventListener('scroll', onScroll, { passive: true });

  // 恢复滚动位置（仅横排；竖排为横向滚动另处理）
  if (!isVertical()) {
    const r = getScroll(scrollKey);
    if (r > 0.02) {
      if (State._lazyReader && State._lazyReader.expandAll) State._lazyReader.expandAll();
      requestAnimationFrame(() => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, r * h);
      onScroll();
    });
    }
  } else { window.scrollTo(0, 0); }

  // 方向键 / 滑动翻篇
  const prev = chapters ? prevReadable(chapters, idx) : null;
  const next = chapters ? nextReadable(chapters, idx) : null;
  const goPrev = () => prev && navigate(`#/read/${book.id}/${encodeURIComponent(prev.id)}`, 'back');
  const goNext = () => next && navigate(`#/read/${book.id}/${encodeURIComponent(next.id)}`);
  const onKey = e => {
    if (e.target.matches('input,textarea')) return;
    if (e.key === 'ArrowLeft') goPrev();
    else if (e.key === 'ArrowRight') goNext();
    else if (e.key === 'Escape') closeDrawer();
  };
  document.addEventListener('keydown', onKey);

  let sx = 0, sy = 0;
  const onTS = e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
  const onTE = e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (isVertical()) return;                 // 竖排靠横向滚动，不拦截
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) { dx > 0 ? goPrev() : goNext(); }
  };
  if (text) { text.addEventListener('touchstart', onTS, { passive: true }); text.addEventListener('touchend', onTE, { passive: true }); }

  State._cleanups.push(() => {
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    document.removeEventListener('click', onDocClick);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('keydown', onKey);
  });
}

let _scrollT = 0;
function saveScrollThrottled(key, r) {
  if (_scrollT) return;
  _scrollT = setTimeout(() => { _scrollT = 0; saveScroll(key, r); }, 400);
}

function setOrientation(o) {
  State.orientation = o;
  localStorage.setItem(LS.orient, o);
  const rt = el('reader-text');
  if (rt) rt.className = `reader-content ${o === 'vertical' ? 'vertical' : 'horizontal'}`;
  qsa('.orientation-btn').forEach(b => b.classList.toggle('active', b.dataset.o === o));
}
window.setOrientation = setOrientation;

function changeFontSize(delta) {
  State.fontSize = Math.max(14, Math.min(30, State.fontSize + delta));
  applyFontSize();
  const v = el('fs-value'); if (v) v.textContent = State.fontSize + 'px';
}
window.changeFontSize = changeFontSize;

function notFound(msg) {
  return `<div class="empty-state"><div class="icon">⚠</div><div>${esc(msg)}</div>
    <button class="back-btn center" onclick="navigate('#/')">← 返回书架</button></div>`;
}

/* ══════════════════ 引文章节匹配 ══════════════════ */
// 在 chapters 中定位包含该 registry fragment 文本的章节（取前15字匹配）
function findChapterForFragment(frag, chapters) {
  if (!frag || !frag.text || frag.text.length < 8) return null;
  // 去标点后取前15字作为匹配键，避免标点差异导致失配
  const strip = s => s.replace(/[，。、：；！？「」『』〔〕…—　\s]/g, '');
  const needle = strip(frag.text).slice(0, 15);
  if (!needle) return null;
  for (const ch of (chapters || [])) {
    for (const fr of (ch.fragments || [])) {
      if (fr.text && strip(fr.text).includes(needle)) return ch;
    }
    if (ch.content && strip(ch.content).includes(needle)) return ch;
  }
  return null;
}

/* ══════════════════ 引文全览页 ══════════════════ */
function renderCitations() {
  const { registry } = State;
  if (!registry) { el('app').innerHTML = notFound('书目未加载'); return; }

  const categories = registry.categories || [];
  const allBooks = registry.books || [];

  let totalFrags = 0;
  const citGroups = [];

  categories.forEach(cat => {
    const fragItems = [];
    allBooks.filter(b => b.category === cat.id).forEach(b => {
      (b.fragments || []).forEach((f, i) => {
        if (!f.text || f.text.length < 5 || f.text.includes('待从维基') || f.text.includes('仓库已有')) return;
        fragItems.push({ bookId: b.id, bookTitle: b.title, frag: f, fragIdx: i });
        totalFrags++;
      });
    });
    if (fragItems.length) citGroups.push({ cat, fragItems });
  });

  const booksWithFrags = allBooks.filter(b =>
    (b.fragments || []).some(f => f.text && f.text.length >= 5 && !f.text.includes('待从维基') && !f.text.includes('仓库已有'))
  ).length;

  const currentCat = State._citCat || '';
  const catChips = citGroups.map(({ cat }) =>
    `<button class="cit-chip${currentCat === cat.id ? ' active' : ''}" data-cat="${cat.id}" onclick="setCitCat(this,'${cat.id}')">${cat.icon} ${esc(cat.label)}</button>`
  ).join('');

  el('app').innerHTML = `
    <div class="citations-page">
      <div class="book-nav-bar">
        <button class="back-btn" onclick="navigate('#/')">← 书架</button>
        <span class="nav-title">引文全览</span>
      </div>
      <div class="citations-header">
        <div class="citations-title">司南·引文索引</div>
        <div class="citations-meta">共 ${totalFrags} 条已验证引文，源自 ${booksWithFrags} 部典籍</div>
        <div class="citations-desc">以下为司南 App 各项判断所引用的古籍原文，经逐条核实后收录。点击引文可进入对应章节阅读器。</div>
      </div>
      <div class="cit-search-bar">
        <input class="cit-search-input" id="cit-q" type="search" placeholder="搜索引文正文、书名、出处…"
               oninput="filterCitations(this.value)" autocomplete="off" spellcheck="false">
        <div class="cit-filter-chips">
          <button class="cit-chip${!currentCat ? ' active' : ''}" data-cat="" onclick="setCitCat(this,'')">全部</button>
          ${catChips}
        </div>
      </div>
      <div class="cit-count-bar" id="cit-count">共 ${totalFrags} 条</div>
      ${citGroups.map(({ cat, fragItems }) => `
        <div class="cit-section" data-cat="${cat.id}" ${currentCat && currentCat !== cat.id ? 'style="display:none"' : ''}>
          <div class="section-title">${cat.icon} ${esc(cat.label)}</div>
          <div class="cit-list">
            ${fragItems.map(({ bookId, bookTitle, frag, fragIdx }) => {
              const searchText = normalizeHan((bookTitle + ' ' + (frag.ref || '') + ' ' + frag.text).toLowerCase());
              return `
            <div class="cit-frag" data-search="${esc(searchText)}"
                 onclick="navigate('#/read/${bookId}/fragment-${fragIdx}')">
              <div class="cit-book-label" onclick="event.stopPropagation();navigate('#/book/${bookId}')">${esc(bookTitle)}</div>
              <div class="cit-ref">【${esc(frag.ref)}】</div>
              <div class="cit-text">${esc(frag.text.length > 120 ? frag.text.slice(0, 117) + '…' : frag.text)}</div>
              <div class="cit-src">${esc(frag.source)}</div>
            </div>`;
            }).join('')}
          </div>
          <div class="cit-no-result" style="display:none">此分类无匹配引文</div>
        </div>`).join('')}
      <div class="cit-global-no-result" id="cit-no-result" style="display:none">无匹配引文</div>
      <div class="license-footer">典籍引文属公有领域或已如实标注出处及许可证。欢迎指正原文、翻译、注释与定位，并请附可核查出处。</div>
    </div>`;

  const qEl = el('cit-q');
  if (qEl && currentCat) filterCitations('');
  if (qEl) setTimeout(() => qEl.focus(), 120);
}

window.filterCitations = function(rawQ) {
  const qNorm = normalizeHan((rawQ || '').trim().toLowerCase());
  const catFilter = State._citCat || '';
  const sections = document.querySelectorAll('.cit-section');
  let totalVisible = 0, totalAll = 0;

  sections.forEach(sec => {
    const catMatch = !catFilter || sec.dataset.cat === catFilter;
    if (!catMatch) { sec.style.display = 'none'; return; }
    sec.style.display = '';
    const frags = sec.querySelectorAll('.cit-frag');
    let secVisible = 0;
    frags.forEach(f => {
      const match = !qNorm || (f.dataset.search || '').includes(qNorm);
      f.style.display = match ? '' : 'none';
      if (match) secVisible++;
      totalAll++;
    });
    totalVisible += secVisible;
    const noResult = sec.querySelector('.cit-no-result');
    if (noResult) noResult.style.display = secVisible === 0 ? '' : 'none';
  });

  const countEl = el('cit-count');
  if (countEl) countEl.textContent = (qNorm || catFilter) ? `显示 ${totalVisible}/${totalAll} 条` : `共 ${totalAll} 条`;
  const globalNo = el('cit-no-result');
  if (globalNo) globalNo.style.display = totalVisible === 0 ? '' : 'none';
};

window.setCitCat = function(btn, catId) {
  State._citCat = catId;
  document.querySelectorAll('.cit-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === catId));
  filterCitations(el('cit-q') ? el('cit-q').value : '');
};

/* ══════════════════ 书签管理页 #/marks ══════════════════ */
function renderMarks() {
  const marks = State.marks;

  function itemHtml(m, i) {
    return `<div class="marks-mgr-item" id="marks-mgr-${i}">
      <button class="marks-mgr-jump" onclick="navigate('#/read/${m.bookId}/${encodeURIComponent(m.chapterId)}')" title="跳至章节">
        <span class="marks-mgr-book">${esc(m.bookTitle)}</span>
        <span class="marks-mgr-ch">${esc(m.label)}</span>
      </button>
      <button class="marks-mgr-del" onclick="deleteMark(${i})" title="删除此书签">✕</button>
    </div>`;
  }

  const listHtml = marks.length
    ? marks.map((m, i) => itemHtml(m, i)).join('')
    : `<div class="marks-mgr-empty">暂无收藏。阅读章节时点击 ☆ 收藏。</div>`;

  // 阅读历史区块
  const readBooks = Object.entries(State.readChapters)
    .filter(([, arr]) => arr && arr.length > 0)
    .sort((a, b) => b[1].length - a[1].length);
  const readTotal = readBooks.reduce((s, [, arr]) => s + arr.length, 0);
  const readHistoryHtml = `
    <div class="read-history-section">
      <div class="marks-mgr-header">
        <span class="marks-mgr-count">${readTotal ? `阅读历史 · ${readBooks.length} 部 · ${readTotal} 章` : '阅读历史为空'}</span>
        ${readTotal ? `<button class="marks-mgr-clear-btn" onclick="clearReadHistory()">清空历史</button>` : ''}
      </div>
      ${readBooks.length ? `<div class="marks-mgr-list">${readBooks.map(([bookId, chIds]) => {
        const bk = findBook(bookId);
        if (!bk) return '';
        return `<div class="read-history-item" onclick="navigate('#/book/${bookId}')">
          <div class="read-history-info">
            <div class="read-history-book">${esc(bk.title)}</div>
            <div class="read-history-ch">已读 ${chIds.length}${bk.chapterCount ? '/' + bk.chapterCount : ''} 章</div>
          </div>
          <div class="read-history-arrow">›</div>
        </div>`;
      }).join('')}</div>`
      : `<div class="marks-mgr-empty">尚无阅读历史。阅读章节超过 85% 自动记录。</div>`}
    </div>`;

  el('app').innerHTML = `
    <div class="marks-page">
      <div class="book-nav-bar">
        <button class="back-btn" onclick="navigate('#/')">← 书架</button>
        <span class="nav-title">书签管理</span>
      </div>
      <div class="marks-mgr-header">
        <span class="marks-mgr-count">${marks.length ? `共 ${marks.length} 条书签` : '书签为空'}</span>
        <div class="marks-mgr-actions">
          ${marks.length ? `<button class="marks-mgr-export-btn" onclick="exportMarks()">↓ 导出</button>` : ''}
          ${marks.length ? `<button class="marks-mgr-clear-btn" onclick="clearAllMarks()">清空全部</button>` : ''}
        </div>
      </div>
      <div class="marks-mgr-list" id="marks-mgr-list">
        ${listHtml}
      </div>
      ${readHistoryHtml}
    </div>`;
}

window.deleteMark = function(idx) {
  State.marks.splice(idx, 1);
  localStorage.setItem(LS.marks, JSON.stringify(State.marks.slice(0, 60)));
  renderMarks();
  showToast('已删除书签');
};

window.clearAllMarks = function() {
  if (!State.marks.length) return;
  if (!confirm(`确认删除全部 ${State.marks.length} 条书签？`)) return;
  State.marks = [];
  localStorage.setItem(LS.marks, JSON.stringify([]));
  renderMarks();
  showToast('已清空全部书签');
};

window.clearReadHistory = function() {
  const total = Object.values(State.readChapters).reduce((s, arr) => s + arr.length, 0);
  if (!total) { showToast('暂无阅读历史'); return; }
  if (!confirm('确认清空全部阅读历史（共 ' + total + ' 章）？')) return;
  State.readChapters = {};
  localStorage.removeItem(LS.readChapters);
  renderMarks();
  showToast('已清空阅读历史');
};
