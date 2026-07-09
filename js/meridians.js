// Meridian talent tree (GDD §5) — a permanent passive-stat tree, separate from
// the stat-point allocation on the character sheet. As a cultivator breaks
// through realms they open their **meridians** (the body's energy channels);
// each opened rank is a small, permanent flat bonus that feeds the single
// effectiveStats aggregation pipeline (§7.3) as a fourth flat source, alongside
// gear and Spirit Cards.
//
// Points are DERIVED from level (1 per breakthrough = 1 per level gained), not a
// stored counter — so every existing save immediately has the right number of
// points for its realm with no migration, and a breakthrough grants one for free
// just by raising `player.level`. `player.meridians` holds only the spent ranks
// ({ nodes: { id: rank } }); free points = earned − spent.
//
// Self-contained like crafting.js / loadouts.js: this module owns its own ☯
// button (injected into the nav menu) and its own modal DOM, so it needs no
// markup in index.html and never touches ui.js. The ONLY cross-module hook is a
// flat add-line in progression.js effectiveStats (meridianBonuses).
//
// NOTE: no `document` access at module load — the DOM lives inside initMeridians
// only — so progression.js can import meridianBonuses in headless sims safely.

export const MERIDIAN_POINTS_PER_STAGE = 1;

// The eight extraordinary meridians, mapped to flat combat stats. Ranked to 5;
// armor is +1/rank (armor is strong per point), the rest +2, HP +8.
export const MERIDIAN_NODES = {
  governing: { id: 'governing', name: 'Governing Vessel', stat: 'attack', perRank: 2, maxRank: 5, icon: '🗡', desc: 'Du Mai — channels Yang force into every strike.' },
  yangLinking: { id: 'yangLinking', name: 'Yang Linking Vessel', stat: 'defense', perRank: 2, maxRank: 5, icon: '🛡', desc: 'Yangwei Mai — knits the body’s guard against harm.' },
  thrusting: { id: 'thrusting', name: 'Thrusting Channel', stat: 'damage', perRank: 2, maxRank: 5, icon: '💥', desc: 'Chong Mai — the sea of blood; deepens a blow’s bite.' },
  girdle: { id: 'girdle', name: 'Girdle Channel', stat: 'armor', perRank: 1, maxRank: 5, icon: '🧿', desc: 'Dai Mai — girds the waist, turning aside force.' },
  conception: { id: 'conception', name: 'Conception Vessel', stat: 'hp', perRank: 8, maxRank: 5, icon: '❤', desc: 'Ren Mai — the sea of Yin; broadens the vessel of life.' },
};

export const MERIDIAN_LIST = Object.values(MERIDIAN_NODES);

const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };

export function emptyMeridians() {
  return { nodes: {} };
}

function nodesOf(player) {
  return player.meridians?.nodes ?? {};
}

export function meridianRank(player, id) {
  return nodesOf(player)[id] ?? 0;
}

// Points earned = 1 per breakthrough (i.e. per level above the first). Derived,
// so it tracks level automatically and needs no stored counter / migration.
export function meridianPointsEarned(player) {
  return Math.max(0, player.level - 1) * MERIDIAN_POINTS_PER_STAGE;
}

export function meridianPointsSpent(player) {
  return Object.values(nodesOf(player)).reduce((a, b) => a + b, 0);
}

export function meridianPointsFree(player) {
  return meridianPointsEarned(player) - meridianPointsSpent(player);
}

// Flat stat bonuses from every opened meridian rank — the fourth flat source in
// effectiveStats. Tolerates a missing player.meridians (old saves → all zero).
export function meridianBonuses(player) {
  const out = { attack: 0, defense: 0, damage: 0, armor: 0, hp: 0 };
  for (const [id, rank] of Object.entries(nodesOf(player))) {
    const node = MERIDIAN_NODES[id];
    if (!node || rank <= 0) continue;
    out[node.stat] += node.perRank * Math.min(rank, node.maxRank);
  }
  return out;
}

// Open one more rank of a meridian, spending a free point. Returns { ok, node,
// rank } or { ok:false, reason }.
export function allocateMeridian(player, id) {
  const node = MERIDIAN_NODES[id];
  if (!node) return { ok: false };
  if (!player.meridians) player.meridians = emptyMeridians();
  const rank = player.meridians.nodes[id] ?? 0;
  if (rank >= node.maxRank) return { ok: false, reason: 'max' };
  if (meridianPointsFree(player) <= 0) return { ok: false, reason: 'points' };
  player.meridians.nodes[id] = rank + 1;
  return { ok: true, node, rank: rank + 1 };
}

// --- Self-contained view: a ☯ Meridians button (in the nav menu) + its modal. ---

const $ = (id) => document.getElementById(id);

let overlay = null;
let mer = null; // { state, actions }

function nodeRow(node) {
  const { state, actions } = mer;
  const p = state.player;
  const rank = meridianRank(p, node.id);
  const free = meridianPointsFree(p);
  const maxed = rank >= node.maxRank;

  const row = document.createElement('div');
  row.className = 'mer-row';

  const info = document.createElement('div');
  info.className = 'mer-info';
  const bonusNow = node.perRank * rank;
  const bonusLine = rank > 0
    ? `<span class="mer-cur">+${bonusNow} ${STAT_LABELS[node.stat]}</span>`
    : `<span class="dim">+${node.perRank} ${STAT_LABELS[node.stat]} / rank</span>`;
  info.innerHTML = `<div class="mer-name">${node.icon} ${node.name}
      <span class="dim">Rank ${rank}/${node.maxRank}</span></div>
    <div class="mer-desc dim">${node.desc}</div>
    <div class="mer-bonus">${bonusLine}</div>`;
  info.title = `${node.name} — permanent +${node.perRank} ${STAT_LABELS[node.stat]} per rank, ranked ${rank}/${node.maxRank}. Free, permanent points earned one per breakthrough.`;

  const pips = document.createElement('div');
  pips.className = 'mer-pips';
  pips.title = `Rank ${rank} of ${node.maxRank} opened.`;
  for (let i = 0; i < node.maxRank; i++) {
    const pip = document.createElement('span');
    pip.className = i < rank ? 'mer-pip on' : 'mer-pip';
    pips.appendChild(pip);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mer-open-btn';
  if (maxed) {
    btn.textContent = 'Opened';
    btn.title = `${node.name} is fully opened at rank ${node.maxRank}.`;
    btn.disabled = true;
  } else {
    btn.textContent = `Open (+${node.perRank} ${STAT_LABELS[node.stat]})`;
    btn.disabled = free <= 0;
    btn.title = free <= 0
      ? 'No free meridian points — break through a realm to earn one more.'
      : `Spend 1 meridian point for a permanent +${node.perRank} ${STAT_LABELS[node.stat]} (free — no spirit stones).`;
    btn.addEventListener('click', () => { actions.allocate(node.id); rerender(); });
  }

  row.append(info, pips, btn);
  return row;
}

export function renderMeridians(state) {
  if (!overlay) return;
  const p = state.player;
  const free = meridianPointsFree(p);
  $('meridian-free').textContent = `— ${free} point${free === 1 ? '' : 's'} to open`;
  $('meridian-free').title = `${free} unspent meridian point${free === 1 ? '' : 's'} — earned one per breakthrough, spent for free (no spirit stones).`;

  const body = $('meridian-body');
  body.innerHTML = '';

  const intro = document.createElement('p');
  intro.className = 'empty-note';
  intro.textContent = 'Each breakthrough opens one meridian point — a permanent, always-on bonus. Choices are permanent; spend them to suit your path.';
  body.appendChild(intro);

  const list = document.createElement('div');
  list.className = 'mer-list';
  for (const node of MERIDIAN_LIST) list.appendChild(nodeRow(node));
  body.appendChild(list);
}

function rerender() {
  renderMeridians(mer.state);
}

export function initMeridians(state, actions) {
  mer = { state, actions };

  const btn = document.createElement('button');
  btn.id = 'btn-meridians';
  btn.type = 'button';
  btn.className = 'meridian-nav-btn';
  btn.title = 'Meridians — spend breakthrough points on permanent passive bonuses';
  btn.textContent = '☯ Meridians';
  ($('nav-menu') ?? document.getElementById('char-panel'))?.appendChild(btn);

  overlay = document.createElement('div');
  overlay.id = 'meridian-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div id="meridian-panel">
      <div id="meridian-header">
        <h2>Meridians <span id="meridian-free" class="dim"></span></h2>
        <button id="btn-close-meridian" type="button" title="Close">✕</button>
      </div>
      <div id="meridian-body"></div>
    </div>`;
  document.body.appendChild(overlay);

  const open = () => { renderMeridians(state); overlay.classList.remove('hidden'); };
  const close = () => overlay.classList.add('hidden');
  btn.addEventListener('click', open);
  $('btn-close-meridian').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
