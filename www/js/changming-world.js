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
  const state = { chart: null, input: null, dayMasterStem: null, guideStems: [], guideElement: null, guideBalanced: false, activeStem: null, relationIndex: 0, returnFocus: null };
  let root = null;
  let content = null;

  function en() { return !!(global.I18N && global.I18N.lang === 'en'); }
  function text(zh, english) { return en() ? english : zh; }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[c]);
  }
  function itemText(item, key) { return Characters.text(item, key, en() ? 'en' : 'zh'); }

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
      const current = stem === activeStem;
      const name = itemText(item, 'name');
      const note = isDayMaster
        ? text('我的日主', 'My Day Master')
        : ((isGuide && !state.guideBalanced)
          ? text(`较少的${item.element} · 两位一起看`, `Lower ${ELEMENT_EN[item.element]} · shown as a pair`)
          : itemText(item, 'role'));
      return `<button type="button" class="cm-cast-person${current ? ' is-active' : ''}${isDayMaster ? ' is-mine' : ''}${isGuide ? ' is-low' : ''}" data-cm-stem="${stem}" aria-pressed="${current}">
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
        <figcaption>${index === 0 ? text('此刻所读 · ', 'Now reading · ') : ''}${esc(sceneStem + '·' + itemText(person, 'name'))}</figcaption>
      </figure>`;
    }).join('');
    const active = Characters.get(stem);
    const visual = card.scene
      ? `<figure class="cm-relation-story"><img src="${esc(card.scene)}" alt="${esc(card.title + ' · ' + sceneStems.join('、'))}" loading="lazy" decoding="async"></figure>`
      : `<div class="cm-relation-scene" style="--scene:url('../${esc(active.background)}')"><div class="cm-relation-people">${figures}</div></div>`;
    const narrative = card.title && card.story
      ? `<div class="cm-relation-narrative"><b>${esc(card.title)}</b><p>${esc(card.story)}</p></div>`
      : '';
    return `${visual}
    <div class="cm-relation-copy">
      ${narrative}
      <div><span>${esc(card.term)}</span><b>${esc(card.related)}</b></div>
      <p>${esc(card.plain)}</p>
      <small>${text('关系由日主与五行生、克、合、冲推出；只说明作用方向，不作吉凶判断。', 'The relation is derived from the Day Master and five-phase generation, control, combination, and clash. It describes direction, not fortune.')}</small>
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
    const isGuide = state.guideStems.includes(state.activeStem);
    const polarity = item.yang ? text('阳', 'Yang') : text('阴', 'Yin');
    const name = itemText(item, 'name');
    const role = itemText(item, 'role');
    const tags = en() ? item.tagsEn : item.tagsZh;
    const relationCards = Characters.relationCards(state.activeStem, en() ? 'en' : 'zh');
    const balanceLead = profile.balanced
      ? text('五色距离很近，环境光才趋向白。', 'The five colors are close enough for the ambient light to approach white.')
      : text(`此刻以${primary}、${secondary}显色，其余三色仍在流动。`, `${ELEMENT_EN[primary]} and ${ELEMENT_EN[secondary]} are most visible now; the other three colors remain in motion.`);
    const sourceLine = state.chart
      ? text('按本机命盘五行分值映射，只呈结构，不作吉凶。', 'Mapped from the five-phase scores stored on this device. It shows structure, not fortune.')
      : text('未读取命盘，暂以五色等量展示。', 'No chart is loaded; the five colors are shown equally for preview.');
    const enterLabel = isDayMaster
      ? text('这是你的日主 · 人物叙事从这里开始', 'Your Day Master · your story begins here')
      : (isGuide && !state.guideBalanced
        ? text(`你盘里较少的${item.element} · ${state.guideStems.join('、')}一起出现`, `Lower ${ELEMENT_EN[item.element]} · both stems appear together`)
        : text('城中人物志', 'A life in Changming'));
    const fireCycle = item.element === '火' ? `<figure class="cm-fire-cycle">
      <img src="img/ten-archetypes/human/v8/scenes/fire-cycle-v1.webp" alt="${esc(text('忘归向外展开晨光，西窗在明暗交界护住火种', 'Wanggui opens into daylight while Xichuang protects the ember at its edge'))}" loading="lazy" decoding="async">
      <figcaption><b>${text('凤凰与卵', 'Phoenix and Egg')}</b><span>${text('同一股火，一边向外给予，一边把未来收拢；院外晨光正在展开，掌心微光仍未熄灭。', 'One fire gives outward while the other encloses the future; dawn opens outside while the ember remains lit within her hands.')}</span></figcaption>
    </figure>` : '';

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
          <p class="cm-intro">${esc(itemText(item, 'desc'))}</p>
        </div>
        <button type="button" class="cm-scroll-cue" data-cm-scroll="balance">${text('向下 · 看城中气色', 'Continue · See the city’s colors')}</button>
      </section>

      <section class="cm-section cm-balance" id="cm-balance">
        <div class="cm-section-head"><span>01</span><div><small>${text('你的结构', 'YOUR STRUCTURE')}</small><h2>${text('五色如何照进常明城', 'How five colors enter Changming')}</h2></div></div>
        <p class="cm-section-lead">${esc(balanceLead)}<small>${esc(sourceLine)}</small></p>
        <div class="cm-balance-bars">${barsMarkup(profile)}</div>
      </section>

      <section class="cm-section cm-biography">
        <div class="cm-section-head"><span>02</span><div><small>${text('人物志', 'CHARACTER RECORD')}</small><h2>${esc(state.activeStem + '·' + name)}</h2></div></div>
        <div class="cm-story-line is-scar"><span>${text('隐痛', 'The wound')}</span><p>${esc(itemText(item, 'scar'))}</p></div>
        <div class="cm-story-line is-highlight"><span>${text('高光', 'The moment')}</span><p>${esc(itemText(item, 'highlight'))}</p></div>
        <div class="cm-story-line is-now"><span>${text('此刻', 'Now')}</span><p>${esc(itemText(item, 'ongoing'))}</p></div>
        ${fireCycle}
      </section>

      <section class="cm-section cm-relations">
        <div class="cm-section-head"><span>03</span><div><small>${text('关系经纬', 'RELATION LINES')}</small><h2>${text('关系从五行里长出来', 'Relations grow from the five phases')}</h2></div></div>
        <div class="cm-relation-tabs" role="tablist">${relationCards.map((card, index) => `<button type="button" role="tab" aria-selected="${index === 0}" class="${index === 0 ? 'is-active' : ''}" data-cm-rel="${index}">${esc(card.label)}</button>`).join('')}</div>
        <div id="cm-relation-panel" class="cm-relation-panel" role="tabpanel" aria-live="polite"></div>
      </section>

      <section class="cm-section cm-cast">
        <div class="cm-section-head"><span>04</span><div><small>${text('十干人物', 'THE TEN STEMS')}</small><h2>${text('城中还有九个人', 'Nine others hold the city with you')}</h2></div></div>
        <p class="cm-cast-intro">${text('木引火，火归土，土生金，金出水，水再养木。点一个人，进入他的场景。', 'Wood feeds Fire, Fire returns to Earth, Earth bears Metal, Metal opens Water, and Water nourishes Wood. Choose a person to enter their setting.')}</p>
        <div class="cm-cast-rail">${castMarkup(state.activeStem)}</div>
      </section>`;

    const mineButton = root.querySelector('#cm-mine');
    if (mineButton) {
      mineButton.hidden = !state.dayMasterStem || isDayMaster;
      mineButton.textContent = text('回到我的日主', 'Back to my Day Master');
    }
    const brand = root.querySelector('.cm-brand');
    if (brand) brand.innerHTML = `<b>常明城</b><small>${text('十干人物志', 'TEN-STEM CHRONICLES')}</small>`;
    const back = root.querySelector('.cm-back span');
    if (back) back.textContent = text('返回司南', 'Back to Sinan');
    renderRelation(0);
    content.scrollTop = 0;
  }

  function open(stem) {
    if (!root || !content) return;
    const loaded = readChart();
    state.input = loaded.input;
    state.chart = loaded.chart;
    state.dayMasterStem = loaded.chart ? loaded.chart.dm : null;
    const guide = Characters.guideFor(loaded.chart);
    state.guideStems = guide.pair ? guide.pair.slice() : [];
    state.guideElement = guide.element;
    state.guideBalanced = !!guide.balanced; // 五行等量时没有「最少」，文案不能照说
    state.returnFocus = document.activeElement;
    render(stem || state.dayMasterStem || state.guideStems[0] || '甲');
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('changming-open');
    requestAnimationFrame(() => root.classList.add('is-open'));
    const closeButton = root.querySelector('#cm-close');
    if (closeButton) setTimeout(() => closeButton.focus({ preventScroll: true }), 40);
  }

  function close() {
    if (!root || root.hidden) return;
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
        open(trigger.getAttribute('data-stem') || undefined);
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
      }
    });
    root.querySelector('#cm-close')?.addEventListener('click', close);
    root.querySelector('#cm-mine')?.addEventListener('click', () => { if (state.dayMasterStem) render(state.dayMasterStem); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !root.hidden) close(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  global.ChangmingWorld = Object.freeze({ open, close });
})(window);
