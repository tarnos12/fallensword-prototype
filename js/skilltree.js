// Skills tab — the "Skill Tree" surface (doc 30 §2.4) rendered as a
// NodeBuster-style **visual talent graph** into the Skills tab's existing
// `#skills-menu` container. The passive Meridian channels form the upper
// tree (a dantian core fanning out to the eight extraordinary meridians);
// the four long-duration active abilities hang as a leaf cluster below a
// techniques seal.
//
// This module owns PRESENTATION only. All node/ability data and mutation
// logic stays in meridians.js / techniques.js exactly as those files export
// it; nothing here duplicates that logic — we read their exports and call the
// injected `actions`.
//
// Contract for the integrator (lead, main.js): call `initSkillTree(state,
// actions)` once at startup; call `renderSkillTree(state)` any time the tab
// needs a refresh (a full renderAll pass, or the per-second live refresh that
// updates ability countdowns).
//
//   actions = {
//     allocateMeridian(id): open one more rank of a meridian node,
//     learnTechnique(id):   spend skill points to learn an active ability,
//     castTechnique(id):    spend Qi to activate/refresh a learned ability,
//   }
//
// The whole thing stays inside #skills-menu with NO page scroll: the tree
// canvas pans/scrolls internally. Description text lives on hover/focus in a
// docked side panel, keeping the graph itself clean. Clicking an available
// node upgrades it (meridian → +1 rank; ability → learn, or cast if learned).

import {
  MERIDIAN_NODES, meridianRank, meridianPointsFree, meridianPointsSpent,
  meridianPointsEarned,
} from './meridians.js';
import {
  TECHNIQUES, isLearned, canLearn, canCast, activeBuffs,
} from './techniques.js';

const $ = (id) => document.getElementById(id);

let st = null; // { state, actions }

const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };
const ABILITY_GLYPH = { ironFistArt: '👊', adamantineWard: '🛡', vitalCirculation: '🌀', berserkFervor: '🩸' };

function effectText(effect) {
  return Object.entries(effect)
    .map(([s, v]) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% ${STAT_LABELS[s] ?? s}`)
    .join(', ');
}
function fmtDuration(ms) { return `${Math.round(ms / 60_000)} min`; }
function fmtCountdown(ms) {
  const secs = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

// ── Layout: logical %-coordinates on the drawing plane. Node left/top and the
// SVG connectors share this same 0–100 space, so lines always meet the nodes
// no matter the panel's real pixel size. ──────────────────────────────────
const CORE = 'core', HUB = 'hub';
const LAYOUT = {
  [CORE]: { x: 50, y: 11 },
  // Tier 1 (open from level 1) — the trunk fan.
  governing: { x: 13, y: 29 }, yangLinking: { x: 31.5, y: 29 }, conception: { x: 50, y: 29 },
  thrusting: { x: 68.5, y: 29 }, girdle: { x: 87, y: 29 },
  // Tier 2 (Foundation Establishment, stage 10) — deeper channels below kin.
  yangHeel: { x: 13, y: 50 }, yinLinking: { x: 68.5, y: 50 }, yinHeel: { x: 87, y: 50 },
  // Techniques seal + the four active-ability leaves.
  [HUB]: { x: 50, y: 66 },
  ironFistArt: { x: 18, y: 87 }, adamantineWard: { x: 39, y: 87 },
  vitalCirculation: { x: 61, y: 87 }, berserkFervor: { x: 82, y: 87 },
};
// [from, to, kind] — kind 'spine' is the decorative core→hub trunk.
const EDGES = [
  [CORE, 'governing'], [CORE, 'yangLinking'], [CORE, 'conception'], [CORE, 'thrusting'], [CORE, 'girdle'],
  ['governing', 'yangHeel'], ['thrusting', 'yinLinking'], ['girdle', 'yinHeel'],
  [CORE, HUB, 'spine'],
  [HUB, 'ironFistArt'], [HUB, 'adamantineWard'], [HUB, 'vitalCirculation'], [HUB, 'berserkFervor'],
];

// Is the graph-edge's target "lit" (allocated/learned) or "locked"?
function edgeState(state, toId) {
  const p = state.player;
  if (MERIDIAN_NODES[toId]) {
    if (p.level < (MERIDIAN_NODES[toId].minStage ?? 1)) return 'locked';
    return meridianRank(p, toId) > 0 ? 'lit' : '';
  }
  if (TECHNIQUES[toId]) {
    if (p.level < TECHNIQUES[toId].minStage) return 'locked';
    return isLearned(p, toId) ? 'lit' : '';
  }
  return '';
}

// ── Descriptors for the hover/focus info panel ────────────────────────────
function meridianInfo(state, node) {
  const p = state.player;
  const rank = meridianRank(p, node.id);
  const maxed = rank >= node.maxRank;
  const locked = p.level < (node.minStage ?? 1);
  const free = meridianPointsFree(p);
  let status, statusClass;
  if (locked) { status = `Sealed until cultivation stage ${node.minStage}.`; statusClass = 'blocked'; }
  else if (maxed) { status = 'Fully opened — the channel is complete.'; statusClass = 'seal'; }
  else if (free <= 0) { status = 'No free meridian points — break through a realm to earn one.'; statusClass = 'blocked'; }
  else { status = `Click to open rank ${rank + 1} — spend 1 meridian point (free, permanent).`; statusClass = 'ok'; }
  return {
    glyph: node.icon, name: node.name, kind: 'Passive Meridian',
    desc: node.desc, jade: false,
    grant: `+${node.perRank} ${STAT_LABELS[node.stat]} per rank`,
    rows: [
      ['Rank', `${rank} / ${node.maxRank}`],
      ['Now granting', rank > 0 ? `+${node.perRank * rank} ${STAT_LABELS[node.stat]}` : '—'],
      ['Cost', '1 meridian point'],
      ['Unlocks at', `stage ${node.minStage}`],
    ],
    status, statusClass,
  };
}
function abilityInfo(state, t) {
  const p = state.player;
  const learned = isLearned(p, t.id);
  const active = activeBuffs(p).find((b) => b.techniqueId === t.id);
  const locked = p.level < t.minStage;
  let status, statusClass;
  if (!learned) {
    const chk = canLearn(p, t.id);
    if (chk.ok) { status = `Click to learn — spends ${t.cost} skill point${t.cost === 1 ? '' : 's'}.`; statusClass = 'ok'; }
    else { status = chk.reason ?? 'Cannot learn yet.'; statusClass = 'blocked'; }
  } else if (active) {
    status = `Active — fades in ${fmtCountdown(active.expiresAt - Date.now())}. Click to refresh (${t.qiCost} Qi).`;
    statusClass = 'ready';
  } else {
    const chk = canCast(p, state.qi, t.id);
    if (chk.ok) { status = `Learned. Click to channel — costs ${t.qiCost} Qi.`; statusClass = 'ready'; }
    else { status = chk.reason ?? 'Cannot channel.'; statusClass = 'blocked'; }
  }
  return {
    glyph: ABILITY_GLYPH[t.id] ?? '✦', name: t.name, kind: `${t.category} Ability`,
    desc: t.desc, jade: learned,
    grant: effectText(t.effect),
    rows: [
      ['State', learned ? (active ? 'Channelling' : 'Learned') : 'Not learned'],
      ['Learn cost', `${t.cost} skill point${t.cost === 1 ? '' : 's'}`],
      ['Channel', `${t.qiCost} Qi · ${fmtDuration(t.duration)}`],
      ['Unlocks at', `stage ${t.minStage}`],
    ],
    status, statusClass,
  };
}

const DEFAULT_INFO = {
  glyph: '☯', name: 'Meridian Tree', kind: 'Skill Tree', jade: false,
  desc: 'Hover a node to read what it grants. Click a glowing node to open a meridian rank or learn an ability. Cinnabar-sealed nodes are fully opened.',
  grant: '', rows: [], status: 'Points earned per breakthrough are free and permanent.', statusClass: '',
};

function paintInfo(panel, info) {
  const rowsHtml = info.rows.map(([k, v]) => `<div class="info-row"><span>${k}</span><b>${v}</b></div>`).join('');
  panel.innerHTML = `
    <div class="info-head"><span class="glyph">${info.glyph}</span><span>${info.name}</span></div>
    <div class="info-kind">${info.kind}</div>
    <div class="info-desc">${info.desc}</div>
    ${info.grant ? `<div class="info-grant${info.jade ? ' jade' : ''}">${info.grant}</div>` : ''}
    ${rowsHtml ? `<div class="info-rows">${rowsHtml}</div>` : ''}
    <div class="info-status ${info.statusClass}">${info.status}</div>`;
}

// ── Node builders ─────────────────────────────────────────────────────────
function placeNode(el, id) {
  const pos = LAYOUT[id];
  el.style.left = `${pos.x}%`;
  el.style.top = `${pos.y}%`;
}

function wireHover(el, panel, infoFn) {
  const show = () => paintInfo(panel, infoFn());
  const clear = () => paintInfo(panel, DEFAULT_INFO);
  el.addEventListener('mouseenter', show);
  el.addEventListener('focus', show);
  el.addEventListener('mouseleave', clear);
  el.addEventListener('blur', clear);
}

function meridianNode(state, actions, panel, node) {
  const p = state.player;
  const rank = meridianRank(p, node.id);
  const maxed = rank >= node.maxRank;
  const locked = p.level < (node.minStage ?? 1);
  const free = meridianPointsFree(p);

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'stree-node meridian';
  placeNode(el, node.id);
  el.setAttribute('aria-label', `${node.name}, rank ${rank} of ${node.maxRank}`);
  el.innerHTML = `<span class="glyph">${node.icon}</span><span class="rank">${rank}/${node.maxRank}</span>`;

  if (locked) el.classList.add('locked');
  else if (maxed) el.classList.add('maxed');
  else if (rank > 0) el.classList.add(free > 0 ? 'available' : 'partial');
  else if (free > 0) el.classList.add('available');

  if (!locked && !maxed) {
    el.addEventListener('click', () => actions.allocateMeridian(node.id));
  } else {
    el.disabled = false; // keep hoverable/focusable for its description
  }
  wireHover(el, panel, () => meridianInfo(state, node));
  return el;
}

function abilityNode(state, actions, panel, t) {
  const p = state.player;
  const learned = isLearned(p, t.id);
  const active = activeBuffs(p).find((b) => b.techniqueId === t.id);
  const locked = p.level < t.minStage;
  const canLearnNow = !learned && canLearn(p, t.id).ok;

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'stree-node ability';
  placeNode(el, t.id);
  el.setAttribute('aria-label', `${t.name}, ${learned ? 'learned' : 'not learned'}`);
  const badge = active ? fmtCountdown(active.expiresAt - Date.now()) : (learned ? 'Lv1' : '✦' + t.cost);
  el.innerHTML = `<span class="glyph">${ABILITY_GLYPH[t.id] ?? '✦'}</span><span class="rank">${badge}</span>`;

  if (locked && !learned) el.classList.add('locked');
  else if (active) el.classList.add('active-buff');
  else if (learned) el.classList.add('partial');
  else if (canLearnNow) el.classList.add('available');

  // Click = learn (unlearned) or channel/refresh (learned).
  if (canLearnNow) {
    el.addEventListener('click', () => actions.learnTechnique(t.id));
  } else if (learned) {
    el.addEventListener('click', () => actions.castTechnique(t.id));
  }
  wireHover(el, panel, () => abilityInfo(state, t));
  return el;
}

function anchorNode(id, glyph, label) {
  const el = document.createElement('div');
  el.className = 'stree-node anchor';
  el.tabIndex = -1;
  placeNode(el, id);
  el.title = label;
  el.innerHTML = `<span class="glyph">${glyph}</span>`;
  return el;
}

function caption(text, x, y) {
  const el = document.createElement('div');
  el.className = 'stree-caption';
  el.style.left = `${x}%`;
  el.style.top = `${y}%`;
  el.textContent = text;
  return el;
}

// SVG connector layer — one stretched viewBox (0..100) so line endpoints are
// just the layout percentages; non-scaling-stroke keeps the ink crisp.
function buildLinks(state) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'stree-links');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  for (const [from, to, kind] of EDGES) {
    const a = LAYOUT[from], b = LAYOUT[to];
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
    let cls = 'stree-link';
    if (kind === 'spine') cls += ' spine';
    else {
      const s = edgeState(state, to);
      if (s) cls += ` ${s}`;
    }
    line.setAttribute('class', cls);
    svg.appendChild(line);
  }
  return svg;
}

// ── Top-level render ──────────────────────────────────────────────────────
export function renderSkillTree(state) {
  const root = $('skills-menu');
  if (!root) return;
  if (!st) st = { state, actions: null };
  st.state = state;
  const actions = st.actions ?? {
    allocateMeridian() {}, learnTechnique() {}, castTechnique() {},
  };

  const p = state.player;
  const free = meridianPointsFree(p);
  const spent = meridianPointsSpent(p);
  const earned = meridianPointsEarned(p);
  const skillPoints = p.skillPoints ?? 0;

  root.innerHTML = '';

  // Header + prominent point pools.
  const head = document.createElement('div');
  head.className = 'stree-head';
  head.innerHTML = `
    <h2 class="stree-title">☯ Skill Tree</h2>
    <div class="stree-pools">
      <span class="stree-pool mer${free > 0 ? ' has-free' : ''}" title="Free meridian points — one earned per breakthrough. ${spent}/${earned} spent.">Meridian <b>${free}</b></span>
      <span class="stree-pool skill${skillPoints > 0 ? ' has-free' : ''}" title="Skill points, spent once to learn an active ability.">Skill <b>${skillPoints}</b></span>
      <span class="stree-pool qi" title="Qi — spent to channel a learned ability into a standing buff.">Qi <b>${Math.floor(state.qi ?? 0)}</b></span>
    </div>`;
  root.appendChild(head);

  // Body: tree canvas + docked info panel.
  const body = document.createElement('div');
  body.className = 'stree-body';

  const canvas = document.createElement('div');
  canvas.className = 'stree-canvas';
  const plane = document.createElement('div');
  plane.className = 'stree-plane';

  const info = document.createElement('div');
  info.className = 'stree-info';
  paintInfo(info, DEFAULT_INFO);

  // Connectors first (behind the nodes).
  plane.appendChild(buildLinks(state));

  // Captions.
  plane.appendChild(caption('Meridian Channels', 50, 3));
  plane.appendChild(caption('Active Abilities', 50, 77.5));

  // Decorative anchors.
  plane.appendChild(anchorNode(CORE, '☯', 'Dantian — the sea of Qi from which every channel opens.'));
  plane.appendChild(anchorNode(HUB, '📜', 'Techniques — long-duration arts channelled with Qi.'));

  // Meridian nodes.
  for (const node of Object.values(MERIDIAN_NODES)) {
    plane.appendChild(meridianNode(state, actions, info, node));
  }
  // Ability leaves.
  for (const t of Object.values(TECHNIQUES)) {
    plane.appendChild(abilityNode(state, actions, info, t));
  }

  canvas.appendChild(plane);
  body.appendChild(canvas);
  body.appendChild(info);
  root.appendChild(body);
}

// Wire the Skill Tree surface once at startup. `actions` supplies the three
// mutation callbacks (see file header); this module calls them and then
// re-renders itself. Also injects its stylesheet (skilltree.js owns
// css/skilltree.css; index.html is another agent's file).
function ensureStyles() {
  if (document.getElementById('skilltree-css')) return;
  const link = document.createElement('link');
  link.id = 'skilltree-css';
  link.rel = 'stylesheet';
  link.href = 'css/skilltree.css';
  document.head.appendChild(link);
}

export function initSkillTree(state, actions) {
  ensureStyles();
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
