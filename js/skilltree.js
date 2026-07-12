// Skills tab — one coherent "Skill Tree" surface (doc 30 §2.4): the passive
// Meridian tree (8 nodes, from meridians.js) and the 4 long-duration active
// abilities (from techniques.js) rendered together into the Skills tab's
// existing `#skills-menu` container (markup already in index.html, Wave 1).
//
// This module owns presentation only — all node/ability data and mutation
// logic stays in meridians.js / techniques.js exactly as those files already
// export it; nothing here duplicates that logic.
//
// Contract for the integrator (lead, main.js): call `initSkillTree(state,
// actions)` once at startup; call `renderSkillTree(state)` any time the tab
// needs a refresh (a full renderAll pass, or the per-second live refresh that
// updates ability countdowns — mirrors how renderTechniques/renderActiveBuffs
// were driven before this module existed).
//
//   actions = {
//     allocateMeridian(id): open one more rank of a meridian node,
//     learnTechnique(id):   spend skill points to learn an active ability,
//     castTechnique(id):    spend Qi to activate/refresh a learned ability,
//   }
//
// This module does not wire itself into main.js — the lead integrates it
// (replacing the old initMeridians()/renderTechniques()/renderActiveBuffs()
// call sites, which this surface supersedes).

import { MERIDIAN_LIST, renderMeridianTree } from './meridians.js';
import { TECHNIQUES, CATEGORIES, isLearned, canLearn, canCast, activeBuffs } from './techniques.js';

const $ = (id) => document.getElementById(id);

let st = null; // { state, actions }

const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };

function effectText(effect) {
  return Object.entries(effect)
    .map(([s, v]) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% ${STAT_LABELS[s] ?? s}`)
    .join(', ');
}

function fmtDuration(ms) {
  const mins = Math.round(ms / 60_000);
  return `${mins} min`;
}

function fmtCountdown(ms) {
  const secs = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function abilityRow(t, state, actions) {
  const p = state.player;
  const learned = isLearned(p, t.id);

  const row = document.createElement('div');
  row.className = 'tech-row';
  if (learned) row.classList.add('learned');

  const info = document.createElement('div');
  info.className = 'tech-info';
  info.innerHTML = `<span class="tech-name">${t.name}</span>
    <span class="tech-desc dim">${t.desc}</span>
    <span class="tech-meta dim">Qi ${t.qiCost} · ${fmtDuration(t.duration)} · needs stage ${t.minStage}</span>`;
  info.title = `${t.name} — ${t.desc} Once learned, channelling costs ${t.qiCost} Qi for a ${fmtDuration(t.duration)} buff.`;
  row.appendChild(info);

  const btn = document.createElement('button');
  btn.type = 'button';

  if (!learned) {
    const chk = canLearn(p, t.id);
    btn.textContent = `Learn (${t.cost}✦)`;
    btn.disabled = !chk.ok;
    btn.title = !chk.ok && chk.reason
      ? chk.reason
      : `Spend ${t.cost} skill point${t.cost === 1 ? '' : 's'} to learn ${t.name} permanently — channelling it later costs Qi, not points.`;
    btn.addEventListener('click', () => actions.learnTechnique(t.id));
  } else {
    const chk = canCast(p, state.qi, t.id);
    const active = activeBuffs(p).find((b) => b.techniqueId === t.id);
    btn.className = 'cast-btn';
    if (active) {
      btn.textContent = `Refresh (${fmtCountdown(active.expiresAt - Date.now())})`;
    } else {
      btn.textContent = 'Channel';
    }
    btn.disabled = !chk.ok;
    btn.title = !chk.ok && chk.reason
      ? chk.reason
      : `Spend ${t.qiCost} Qi to activate ${t.name} — ${effectText(t.effect)} for ${fmtDuration(t.duration)}. Re-casting refreshes the clock; it does not stack.`;
    btn.addEventListener('click', () => actions.castTechnique(t.id));
  }

  row.appendChild(btn);
  return row;
}

function renderAbilitiesSection(container, state, actions) {
  const section = document.createElement('div');
  section.id = 'skilltree-abilities';

  const head = document.createElement('h3');
  head.className = 'nav-dock-title';
  head.textContent = 'Active Abilities';
  section.appendChild(head);

  const sub = document.createElement('p');
  sub.className = 'empty-note';
  sub.textContent = `Skill points: ${state.player.skillPoints ?? 0}. Learn once, then channel (costs Qi) for a long, standing buff.`;
  sub.title = 'Skill points come from breakthroughs and are spent once to learn an ability; channelling it afterward costs Qi, not points.';
  section.appendChild(sub);

  const activeBox = document.createElement('div');
  activeBox.id = 'active-buffs';
  const buffs = activeBuffs(state.player);
  if (buffs.length === 0) {
    activeBox.innerHTML = '<p class="empty-note">No abilities active. Channel one before a long hunt.</p>';
  } else {
    for (const b of buffs) {
      const t = TECHNIQUES[b.techniqueId];
      if (!t) continue;
      const row = document.createElement('div');
      row.className = 'buff-row';
      const secs = Math.max(0, Math.ceil((b.expiresAt - Date.now()) / 1000));
      row.title = `${t.name} — ${effectText(t.effect)}, fades in ${fmtCountdown(b.expiresAt - Date.now())}.`;
      row.innerHTML = `<span class="buff-name cat-${t.category.toLowerCase()}">${t.name}</span>
        <span class="buff-eff dim">${effectText(t.effect)}</span>
        <span class="buff-time">${fmtCountdown(b.expiresAt - Date.now())}</span>`;
      activeBox.appendChild(row);
    }
  }
  section.appendChild(activeBox);

  for (const cat of CATEGORIES) {
    const abilities = Object.values(TECHNIQUES).filter((t) => t.category === cat);
    if (abilities.length === 0) continue;
    const catHead = document.createElement('h4');
    catHead.className = `cat-${cat.toLowerCase()}`;
    catHead.textContent = cat;
    section.appendChild(catHead);
    for (const t of abilities) section.appendChild(abilityRow(t, state, actions));
  }

  container.appendChild(section);
}

function renderMeridiansSection(container, state, actions) {
  const section = document.createElement('div');
  section.id = 'skilltree-meridians';

  const head = document.createElement('h3');
  head.className = 'nav-dock-title';
  head.textContent = 'Passive Meridian Tree';
  section.appendChild(head);

  const body = document.createElement('div');
  section.appendChild(body);
  renderMeridianTree(body, state, actions);

  container.appendChild(section);
}

// Re-renders the whole Skill Tree surface into #skills-menu. Safe to call
// repeatedly (e.g. the per-second live refresh for ability countdowns).
export function renderSkillTree(state) {
  const root = $('skills-menu');
  if (!root) return;
  if (!st) st = { state, actions: null };
  st.state = state;

  root.innerHTML = '';
  const actions = st.actions ?? {};
  renderMeridiansSection(root, state, actions);
  renderAbilitiesSection(root, state, actions);
}

// Wire the Skill Tree surface once at startup. `actions` supplies the three
// mutation callbacks (see file header); this module calls them and then
// re-renders itself.
export function initSkillTree(state, actions) {
  st = {
    state,
    actions: {
      allocateMeridian: (id) => { actions.allocateMeridian(id); renderSkillTree(st.state); },
      learnTechnique: (id) => { actions.learnTechnique(id); renderSkillTree(st.state); },
      castTechnique: (id) => { actions.castTechnique(id); renderSkillTree(st.state); },
    },
  };
  renderSkillTree(state);
}
