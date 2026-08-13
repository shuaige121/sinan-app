/* SPDX-License-Identifier: LicenseRef-Sinan-Characters-Stories-ARR */
/* 常明城沉浸层：由八字日主进入，不占用司南四个主导航。 */
(function (global) {
  'use strict';

  const C = global.DaoCore;
  const Characters = global.SinanCharacters;
  if (!C || !Characters) return;

  const ELEMENTS = ['木', '火', '土', '金', '水'];
  const ELEMENT_EN = { 木: 'Wood', 火: 'Fire', 土: 'Earth', 金: 'Metal', 水: 'Water' };
  const ELEMENT_HEX = C.EL_HEX || { 木: '#45a66b', 火: '#d94c33', 土: '#d9a821', 金: '#d8c47a', 水: '#5489cc' };
  const THEME_KEY = 'changming-theme-stem';
  const state = { chart: null, input: null, dayMasterStem: null, themeStem: null, guideStems: [], guideElement: null, guideBalanced: false, activeStem: null, relationIndex: 0, returnFocus: null };
  let root = null;
  let resetScrollOnNextRender = false;   // 仅 open() 置真：换人物/设主题时保留阅读位置
  let keepScrollTop = null;
  let historyPushed = false;             // 浮层占一格历史，让返回键先关它而不是退站
  let content = null;

  function en() { return !!(global.I18N && global.I18N.lang === 'en'); }
  function text(zh, english) { return en() ? english : zh; }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[c]);
  }
  function itemText(item, key) { return Characters.text(item, key, en() ? 'en' : 'zh'); }
  // 关系术语（比劫/食伤/印/财/官杀）此前只是纯文本，浮层里一个可点词条都没有。
  // term-chip 的点击委托挂在 document 上（app.js:266，capture 相），这里吐同样的标记即可复用。
  function termChip(label) {
    const raw = String(label == null ? '' : label);
    const key = raw.split('·')[0].trim();          // 「比劫 · peers」→「比劫」
    const has = global.PLAIN_GLOSSARY && Object.prototype.hasOwnProperty.call(global.PLAIN_GLOSSARY, key);
    if (!has) return esc(raw);
    return `<span class="term-chip" data-term="${esc(key)}" role="button" tabindex="0">${esc(raw)}</span>`;
  }

  // 背景 inert：把 body 下除浮层之外的兄弟节点设为不可交互/不可读。
  function setBackgroundInert(on) {
    if (!root || !root.parentElement) return;
    Array.prototype.forEach.call(root.parentElement.children, el => {
      if (el === root) return;
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }

  function readTheme() {
    try {
      const stem = global.localStorage.getItem(THEME_KEY);
      return Characters.get(stem) ? stem : null;
    } catch (e) { return null; }
  }

  function writeTheme(stem) {
    try {
      if (Characters.get(stem)) global.localStorage.setItem(THEME_KEY, stem);
      else global.localStorage.removeItem(THEME_KEY);
    } catch (e) {}
    state.themeStem = Characters.get(stem) ? stem : null;
    document.dispatchEvent(new CustomEvent('changming-theme-change', { detail: { stem: state.themeStem } }));
  }

  function readChart() {
    let input = null;
    try { input = JSON.parse(global.localStorage.getItem('bazi-input') || 'null'); } catch (e) { input = null; }
    if (!input) return { input: null, chart: null };
    try { return { input, chart: C.computeBazi(input) }; } catch (e) { return { input, chart: null }; }
  }

  function scoreProfile(chart) {
    const raw = chart && chart.scores ? chart.scores : Object.fromEntries(ELEMENTS.map(el => [el, 1]));
    const total = ELEMENTS.reduce((sum, el) => sum + Math.max(0, Number(raw[el]) || 0), 0) || 5;
    const rows = ELEMENTS.map(el => ({ el, score: Number(raw[el]) || 0, pct: Math.max(0, Number(raw[el]) || 0) / total }));
    const ranked = rows.slice().sort((a, b) => b.pct - a.pct);
    const spread = ranked[0].pct - ranked[ranked.length - 1].pct;
    return { rows, ranked, balanced: spread <= 0.03 };
  }

  function seedOf(stem, profile) {
    const key = stem + profile.rows.map(row => row.score.toFixed(2)).join('|');
    if (typeof C.stableHash === 'function') return Math.abs(C.stableHash(key)) || 1;
    let out = 2166136261;
    for (let i = 0; i < key.length; i++) out = Math.imul(out ^ key.charCodeAt(i), 16777619);
    return Math.abs(out) || 1;
  }

  function moteMarkup(stem, profile) {
    let seed = seedOf(stem, profile);
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const choose = value => {
      let cursor = 0;
      for (const row of profile.rows) {
        cursor += row.pct;
        if (value <= cursor) return row.el;
      }
      return profile.rows[profile.rows.length - 1].el;
    };
    return Array.from({ length: 28 }, (_, index) => {
      const el = profile.balanced ? '白' : choose(rand());
      const color = profile.balanced ? '#f3ead7' : ELEMENT_HEX[el];
      const x = Math.round(rand() * 100);
      const y = Math.round(22 + rand() * 76);
      const size = (2 + rand() * 4).toFixed(1);
      const drift = Math.round(-24 + rand() * 48);
      const delay = (-rand() * 9).toFixed(2);
      const duration = (7 + rand() * 8).toFixed(2);
      return `<i style="--x:${x}%;--y:${y}%;--size:${size}px;--drift:${drift}px;--delay:${delay}s;--duration:${duration}s;--mote:${color}" aria-hidden="true"></i>`;
    }).join('');
  }

  function barsMarkup(profile) {
    return profile.rows.map(row => {
      const pct = Math.round(row.pct * 100);
      const label = en() ? ELEMENT_EN[row.el] : row.el;
      return `<div class="cm-balance-row">
        <span style="--el:${ELEMENT_HEX[row.el]}">${esc(label)}</span>
        <div class="cm-balance-track"><i style="--el:${ELEMENT_HEX[row.el]};--pct:${pct}%"></i></div>
        <b>${pct}%</b>
      </div>`;
    }).join('');
  }

  function castMarkup(activeStem) {
    return Characters.stemOrder.map(stem => {
      const item = Characters.get(stem);
      if (!item) return '';
      const isGuide = state.guideStems.includes(stem);
      const isDayMaster = stem === state.dayMasterStem;
      const isTheme = stem === (state.themeStem || state.dayMasterStem);
      const current = stem === activeStem;
      const name = itemText(item, 'name');
      const note = isDayMaster && isTheme
        ? text('我的日主 · 常用人物', 'My Day Master · Theme')
        : (isDayMaster
          ? text('我的日主', 'My Day Master')
          : (isTheme
            ? text('我的常用人物', 'My Theme Character')
        : ((isGuide && !state.guideBalanced)
          ? text(`较少的${item.element} · ${state.guideStems.join('、')}`, `Lower ${ELEMENT_EN[item.element]} · ${state.guideStems.join(' / ')}`)
          : itemText(item, 'role'))));
      return `<button type="button" class="cm-cast-person${current ? ' is-active' : ''}${isDayMaster ? ' is-mine' : ''}${isTheme ? ' is-theme' : ''}${isGuide ? ' is-low' : ''}" data-cm-stem="${stem}" aria-pressed="${current}">
        <img src="${esc(item.heroScene || item.background)}" alt="${esc(stem + '·' + name)}" loading="lazy" decoding="async" style="--scene-focus:${esc(item.heroFocus || '50% 50%')}">
        <span><b>${esc(stem + '·' + name)}</b><small>${esc(note)}</small></span>
      </button>`;
    }).join('');
  }

  function relationPanelMarkup(stem, card) {
    const sceneStems = [stem].concat((card.relatedStems || []).filter(other => other !== stem));
    const figures = sceneStems.map((sceneStem, index) => {
      const person = Characters.get(sceneStem);
      if (!person) return '';
      return `<figure class="cm-relation-person${index === 0 ? ' is-focus' : ''}">
        <img src="${esc(person.heroScene || person.background)}" alt="${esc(sceneStem + '·' + itemText(person, 'name'))}" loading="lazy" decoding="async" style="--scene-focus:${esc(person.heroFocus || '50% 50%')}">
        <figcaption>${index === 0 ? text('正在看 · ', 'Viewing · ') : ''}${esc(sceneStem + '·' + itemText(person, 'name'))}</figcaption>
      </figure>`;
    }).join('');
    const active = Characters.get(stem);
    const visual = card.scene
      ? `<figure class="cm-relation-story"><img src="${esc(card.scene)}" alt="${esc(card.title + ' · ' + sceneStems.join('、'))}" loading="eager" decoding="sync" fetchpriority="high"></figure>`
      : `<div class="cm-relation-scene" style="--scene:url('../${esc(active.background)}')"><div class="cm-relation-people">${figures}</div></div>`;
    const narrative = card.title && card.story
      ? `<div class="cm-relation-narrative"><b>${esc(card.title)}</b><p>${esc(card.story)}</p></div>`
      : '';
    return `${visual}
    <div class="cm-relation-copy">
      ${narrative}
      <div><span>${termChip(card.term)}</span><b>${esc(card.related)}</b></div>
      <p>${esc(card.plain)}</p>
    </div>`;
  }

  function renderRelation(index) {
    if (!content) return;
    const cards = Characters.relationCards(state.activeStem, en() ? 'en' : 'zh');
    if (!cards.length) return;
    state.relationIndex = Math.max(0, Math.min(index, cards.length - 1));
    const panel = content.querySelector('#cm-relation-panel');
    if (panel) panel.innerHTML = relationPanelMarkup(state.activeStem, cards[state.relationIndex]);
    content.querySelectorAll('[data-cm-rel]').forEach(button => {
      const selected = Number(button.dataset.cmRel) === state.relationIndex;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
    });
  }

  function render(stem) {
    if (!resetScrollOnNextRender && content) keepScrollTop = content.scrollTop;
    const item = Characters.get(stem) || Characters.get(state.dayMasterStem) || Characters.get('甲');
    if (!item || !content) return;
    state.activeStem = Characters.get(stem) ? stem : (state.dayMasterStem || '甲');
    state.relationIndex = 0;
    const profile = scoreProfile(state.chart);
    const primary = profile.ranked[0].el;
    const secondary = profile.ranked[1].el;
    const primaryHex = ELEMENT_HEX[primary];
    const secondaryHex = ELEMENT_HEX[secondary];
    const isDayMaster = !!state.dayMasterStem && state.activeStem === state.dayMasterStem;
    const isTheme = state.activeStem === (state.themeStem || state.dayMasterStem);
    const isGuide = state.guideStems.includes(state.activeStem);
    const polarity = item.yang ? text('阳', 'Yang') : text('阴', 'Yin');
    const name = itemText(item, 'name');
    const role = itemText(item, 'role');
    const tags = en() ? item.tagsEn : item.tagsZh;
    const relationCards = Characters.relationCards(state.activeStem, en() ? 'en' : 'zh');
    const balanceLead = profile.balanced
      ? text('你的五行分布接近。', 'Your five phases are evenly matched.')
      : text(`你的五行里${primary}和${secondary}相对多。`, `Your chart has the most ${ELEMENT_EN[primary]} and ${ELEMENT_EN[secondary]}.`);
    const sourceLine = state.chart
      ? text('这些比例来自你排的盘。', 'These proportions come from the chart you cast.')
      : text('你还没排过盘，先按五行等量显示。', 'You have not cast a chart yet, so all five are shown equal.');
    const enterLabel = isDayMaster && isTheme
      ? text('你的日主 · 也是常用人物', 'Your Day Master · also your theme character')
      : (isTheme
        ? text(`你的常用人物 · 日主仍是${state.dayMasterStem || '未定'}`, `Your theme character · Day Master ${state.dayMasterStem || 'not set'}`)
        : (isDayMaster
          ? text('这是你的日主', 'Your Day Master')
          : (isGuide && !state.guideBalanced
            ? text(`你盘里较少的${item.element} · ${state.guideStems.join('、')}一起出现`, `Lower ${ELEMENT_EN[item.element]} · both stems appear together`)
            : text('正在看这个人物与其他人的关系', 'Viewing this character’s connections'))));
    const themeAction = isTheme
      ? `<button type="button" class="cm-theme-button is-current" data-cm-theme-reset>${text('当前默认人物', 'Current theme character')}</button>`
      : `<button type="button" class="cm-theme-button" data-cm-theme="${esc(state.activeStem)}">${text(`以后默认显示${state.activeStem}`, `Set ${state.activeStem} as theme`)}</button>`;
    root.style.setProperty('--cm-primary', primaryHex);
    root.style.setProperty('--cm-secondary', secondaryHex);
    root.style.setProperty('--cm-character', ELEMENT_HEX[item.element] || primaryHex);
    root.dataset.balanced = String(profile.balanced);
    content.innerHTML = `
      <section class="cm-hero" style="--cm-bg:url('../${esc(item.heroScene || item.background)}');--scene-focus:${esc(item.heroFocus || '50% 50%')}">
        <div class="cm-hero-background" role="img" aria-label="${esc(name + text('的人物场景', ' character setting'))}"></div>
        <div class="cm-color-field" aria-hidden="true"></div>
        <div class="cm-motes" aria-hidden="true">${moteMarkup(state.activeStem, profile)}</div>
        <div class="cm-hero-copy">
          <span class="cm-eyebrow">${esc(enterLabel)}</span>
          <h1><b>${esc(state.activeStem)}</b>${esc(name)}</h1>
          <p class="cm-role">${esc(polarity + item.element + ' · ' + role)}</p>
          <div class="cm-tags">${tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
          <p class="cm-worldnote">${text('十个天干，十个虚构人物。以下是故事，不作吉凶判断。', 'Ten heavenly stems, ten fictional characters. What follows is a story, not a reading.')}</p>
          <p class="cm-intro">${esc(itemText(item, 'desc'))}</p>
          <div class="cm-theme-actions">${themeAction}</div>
        </div>
        <button type="button" class="cm-scroll-cue" data-cm-scroll="balance">${text('看我的五行', 'See my five phases')}</button>
      </section>

      <section class="cm-section cm-balance" id="cm-balance">
        <div class="cm-section-head"><span>01</span><div><small>${text('你的五行', 'YOUR FIVE PHASES')}</small><h2>${text('你盘里五行各占多少', 'How much of each phase your chart holds')}</h2></div></div>
        <p class="cm-section-lead">${esc(balanceLead)}<small>${esc(sourceLine)}</small></p>
        <div class="cm-balance-bars">${barsMarkup(profile)}</div>
      </section>

      <section class="cm-section cm-biography">
        <div class="cm-section-head"><span>02</span><div><small>${text('写给你', 'FOR YOU')}</small><h2>${esc(itemText(item, 'readerTitle'))}</h2></div></div>
        <article class="cm-reader-story"><p>${esc(itemText(item, 'readerStory'))}</p></article>
      </section>

      <section class="cm-section cm-relations" id="cm-relations-browser">
        <div class="cm-section-head"><span>03</span><div><small>${text('十个人的关系', 'THE TEN')}</small><h2>${text('点开任意一个人，看彼此如何影响', 'Open anyone and see who affects whom')}</h2></div></div>
        <div class="cm-cast-rail is-relations">${castMarkup(state.activeStem)}</div>
        <div class="cm-relation-tabs" role="tablist">${relationCards.map((card, index) => `<button type="button" role="tab" aria-selected="${index === 0}" class="${index === 0 ? 'is-active' : ''}" data-cm-rel="${index}">${esc(card.label)}</button>`).join('')}</div>
        <div id="cm-relation-panel" class="cm-relation-panel" role="tabpanel" aria-live="polite"></div>
      </section>

      <section class="cm-section cm-cast">
        <div class="cm-section-head"><span>04</span><div><small>${text('默认人物', 'THEME CHARACTER')}</small><h2>${text('以后先显示谁？', 'Pick one to stay with you across Sinan')}</h2></div></div>
        <p class="cm-cast-intro">${text('设好后，首页和常明城会先显示这个人。不会改变你的命盘。', 'Your theme appears first across Sinan. It does not change your chart.')}</p>
        <div class="cm-theme-picker"><b>${esc(state.activeStem + '·' + name)}</b>${themeAction}</div>
      </section>`;

    const mineButton = root.querySelector('#cm-mine');
    if (mineButton) {
      mineButton.hidden = !state.dayMasterStem || isDayMaster;
      mineButton.textContent = text('回到我的日主', 'Back to my Day Master');
    }
    const relationsButton = root.querySelector('#cm-relations');
    if (relationsButton) relationsButton.textContent = text('十个人的关系', 'The ten');
    const brand = root.querySelector('.cm-brand');
    if (brand) brand.innerHTML = `<b>常明城</b><small>${text('十干人物志', 'TEN-STEM CHRONICLES')}</small>`;
    const back = root.querySelector('.cm-back span');
    if (back) back.textContent = text('返回司南', 'Back to Sinan');
    renderRelation(0);
    // 只有刚打开这一层时才回到顶部。此前每次 render 都无条件归零，
    // 于是在「关系」区换个人物或设主题，都会被一路甩回首屏——这层仅有的两个交互动作都这样。
    if (resetScrollOnNextRender) { content.scrollTop = 0; resetScrollOnNextRender = false; }
    else if (keepScrollTop != null) { content.scrollTop = keepScrollTop; keepScrollTop = null; }
  }

  function open(stem, view, targetStem) {
    if (!root || !content) return;
    const loaded = readChart();
    state.input = loaded.input;
    state.chart = loaded.chart;
    state.dayMasterStem = loaded.chart ? loaded.chart.dm : null;
    state.themeStem = readTheme();
    const guide = Characters.guideFor(loaded.chart);
    state.guideStems = guide.pair ? guide.pair.slice() : [];
    state.guideElement = guide.element;
    state.guideBalanced = !!guide.balanced; // 五行等量时没有「最少」，文案不能照说
    state.returnFocus = document.activeElement;
    resetScrollOnNextRender = true;   // 只有真的「进入」这一层才回到首屏
    render(stem || state.themeStem || state.dayMasterStem || state.guideStems[0] || '甲');
    if (targetStem && targetStem !== state.activeStem) {
      const targetIndex = Characters.relationCards(state.activeStem, en() ? 'en' : 'zh')
        .findIndex(card => (card.relatedStems || []).includes(targetStem));
      if (targetIndex >= 0) renderRelation(targetIndex);
    }
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('changming-open');
    if (!historyPushed) {
      try { global.history.pushState({ changming: 1 }, ''); historyPushed = true; } catch (e) {}
    }
    // 全屏 modal 必须把背景关掉，否则 Tab 会走到底部 tabbar 与背景按钮，
    // screen reader 也照样能读到背后的页面。
    setBackgroundInert(true);
    requestAnimationFrame(() => root.classList.add('is-open'));
    if (view === 'relations') setTimeout(() => content.querySelector('#cm-relations-browser')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    const closeButton = root.querySelector('#cm-close');
    if (closeButton) setTimeout(() => closeButton.focus({ preventScroll: true }), 40);
  }

  function close(fromHistory) {
    if (!root || root.hidden) return;
    // 全屏浮层要吃掉一次「返回」，否则手机返回键会直接退出整个站点。
    if (!fromHistory && historyPushed) {
      historyPushed = false;
      try { global.history.back(); return; } catch (e) { /* 退化为直接关闭 */ }
    }
    historyPushed = false;
    setBackgroundInert(false);
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('changming-open');
    setTimeout(() => { root.hidden = true; }, 260);
    if (state.returnFocus && typeof state.returnFocus.focus === 'function') {
      try { state.returnFocus.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  function wire() {
    root = document.getElementById('changming-world');
    content = document.getElementById('cm-content');
    if (!root || !content) return;
    document.addEventListener('click', event => {
      const trigger = event.target.closest && event.target.closest('[data-changming-open]');
      if (trigger) {
        event.preventDefault();
        open(
          trigger.getAttribute('data-stem') || undefined,
          trigger.getAttribute('data-cm-view') || undefined,
          trigger.getAttribute('data-cm-target') || undefined
        );
        return;
      }
      const relation = event.target.closest && event.target.closest('[data-cm-rel]');
      if (relation && root.contains(relation)) {
        renderRelation(Number(relation.dataset.cmRel) || 0);
        return;
      }
      const person = event.target.closest && event.target.closest('[data-cm-stem]');
      if (person && root.contains(person)) {
        render(person.dataset.cmStem);
        return;
      }
      const scroll = event.target.closest && event.target.closest('[data-cm-scroll="balance"]');
      if (scroll && root.contains(scroll)) {
        const target = content.querySelector('#cm-balance');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const theme = event.target.closest && event.target.closest('[data-cm-theme]');
      if (theme && root.contains(theme)) {
        writeTheme(theme.dataset.cmTheme);
        render(state.activeStem);
        return;
      }
      const themeReset = event.target.closest && event.target.closest('[data-cm-theme-reset]');
      if (themeReset && root.contains(themeReset)) {
        writeTheme(null);
        render(state.activeStem);
      }
    });
    root.querySelector('#cm-close')?.addEventListener('click', () => close()); // 不能直接传 close：MouseEvent 会被当成 fromHistory=true，于是不退回历史
    root.querySelector('#cm-mine')?.addEventListener('click', () => { if (state.dayMasterStem) render(state.dayMasterStem); });
    root.querySelector('#cm-relations')?.addEventListener('click', () => content.querySelector('#cm-relations-browser')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || root.hidden) return;
      // 词条/出处浮层开在常明城之上；Esc 应该只关最上面那层，
      // 否则一次 Esc 会把浮层和常明城一起关掉。
      const overlay = document.querySelector('.cite-backdrop.shown, .term-backdrop.shown');
      if (overlay && !overlay.hidden) return;
      close();
    });
    // 手机返回键：先关这一层，而不是直接退出整个站点。
    global.addEventListener('popstate', () => { if (root && !root.hidden) close(true); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  global.ChangmingWorld = Object.freeze({ open, close });
})(window);
