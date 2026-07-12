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
// Wave 2 (doc 30 §2.4): no more self-contained modal/nav button. Meridians is
// folded into one "Skill Tree" surface on the Skills tab alongside the 4
// active abilities — js/skilltree.js embeds `renderMeridianTree` directly into
// its own container. This file keeps owning all the node data/points/allocate
// logic (unchanged this wave); only the render section below changed shape,
// from a self-contained overlay to a plain render-into-container function.
//
// NOTE: no `document` access at module load — DOM only happens inside
// renderMeridianTree — so progression.js can import meridianBonuses in
// headless sims safely.

export const MERIDIAN_POINTS_PER_STAGE = 1;

// The eight extraordinary meridians, mapped to flat combat stats. Ranked to 5;
// armor is +1/rank (armor is strong per point), the rest +2, HP +8.
export const MERIDIAN_NODES = {
  // --- Tier 1 (Qi Condensation, open from level 1) ---
  governing: { id: 'governing', name: 'Governing Vessel', stat: 'attack', perRank: 2, maxRank: 5, minStage: 1, icon: '🗡', desc: 'Du Mai — channels Yang force into every strike.' },
  yangLinking: { id: 'yangLinking', name: 'Yang Linking Vessel', stat: 'defense', perRank: 2, maxRank: 5, minStage: 1, icon: '🛡', desc: 'Yangwei Mai — knits the body’s guard against harm.' },
  thrusting: { id: 'thrusting', name: 'Thrusting Channel', stat: 'damage', perRank: 2, maxRank: 5, minStage: 1, icon: '💥', desc: 'Chong Mai — the sea of blood; deepens a blow’s bite.' },
  girdle: { id: 'girdle', name: 'Girdle Channel', stat: 'armor', perRank: 1, maxRank: 5, minStage: 1, icon: '🧿', desc: 'Dai Mai — girds the waist, turning aside force.' },
  conception: { id: 'conception', name: 'Conception Vessel', stat: 'hp', perRank: 8, maxRank: 5, minStage: 1, icon: '❤', desc: 'Ren Mai — the sea of Yin; broadens the vessel of life.' },
  // --- Tier 2 (Foundation Establishment, minStage 10 — completes the eight, doc 30 §2.2) ---
  yinLinking: { id: 'yinLinking', name: 'Yin Linking Vessel', stat: 'damage', perRank: 3, maxRank: 5, minStage: 10, icon: '⚔', desc: 'Yinwei Mai — a deeper current beneath the Thrusting Channel.' },
  yangHeel: { id: 'yangHeel', name: 'Yang Heel Vessel', stat: 'attack', perRank: 3, maxRank: 5, minStage: 10, icon: '🗡', desc: 'Yangqiao Mai — quickens the strike beyond the Governing Vessel.' },
  yinHeel: { id: 'yinHeel', name: 'Yin Heel Vessel', stat: 'armor', perRank: 2, maxRank: 5, minStage: 10, icon: '🧿', desc: 'Yinqiao Mai — a second girding, steadier than the first.' },
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
  if (player.level < (node.minStage ?? 1)) return { ok: false, reason: 'locked' };
  if (!player.meridians) player.meridians = emptyMeridians();
  const rank = player.meridians.nodes[id] ?? 0;
  if (rank >= node.maxRank) return { ok: false, reason: 'max' };
  if (meridianPointsFree(player) <= 0) return { ok: false, reason: 'points' };
  player.meridians.nodes[id] = rank + 1;
  return { ok: true, node, rank: rank + 1 };
}

// Refund every opened meridian rank (doc 30 §2.5). Points are DERIVED from level
// (free = earned − spent), so clearing `nodes` instantly restores the full pool
// on the next read — no counter arithmetic. The premium shop charges first.
export function resetMeridians(player) {
  const refunded = meridianPointsSpent(player); // for the caller's toast/log text only
  player.meridians = { nodes: {} };
  return { ok: true, refunded };
}

// --- Render: embeddable node list for skilltree.js. ---
//
// Pure render-into-container, no module-level DOM/overlay state — skilltree.js
// owns the container and calls this on every (re)render, passing an `actions`
// object with an `allocateMeridian(id)` callback that applies the allocation
// and re-renders (mirrors the shape techniques.js's row-builder expects from
// its own caller, so both halves of the Skill Tree follow one pattern).

function nodeRow(node, state, actions) {
  const p = state.player;
  const rank = meridianRank(p, node.id);
  const free = meridianPointsFree(p);
  const maxed = rank >= node.maxRank;
  const locked = p.level < (node.minStage ?? 1);

  const row = document.createElement('div');
  row.className = 'mer-row';
  if (locked) row.classList.add('mer-locked');

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
  info.title = locked
    ? `${node.name} opens at Foundation Establishment (stage ${node.minStage}).`
    : `${node.name} — permanent +${node.perRank} ${STAT_LABELS[node.stat]} per rank, ranked ${rank}/${node.maxRank}. Free, permanent points earned one per breakthrough.`;

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
  if (locked) {
    btn.textContent = 'Locked';
    btn.title = `${node.name} opens at Foundation Establishment (stage ${node.minStage}).`;
    btn.disabled = true;
  } else if (maxed) {
    btn.textContent = 'Opened';
    btn.title = `${node.name} is fully opened at rank ${node.maxRank}.`;
    btn.disabled = true;
  } else {
    btn.textContent = `Open (+${node.perRank} ${STAT_LABELS[node.stat]})`;
    btn.disabled = free <= 0;
    btn.title = free <= 0
      ? 'No free meridian points — break through a realm to earn one more.'
      : `Spend 1 meridian point for a permanent +${node.perRank} ${STAT_LABELS[node.stat]} (free — no spirit stones).`;
    btn.addEventListener('click', () => actions.allocateMeridian(node.id));
  }

  row.append(info, pips, btn);
  return row;
}

// Renders the full passive node list into `container` (an existing DOM
// element skilltree.js provides — e.g. a <div> inside #skills-menu).
export function renderMeridianTree(container, state, actions) {
  container.innerHTML = '';
  const p = state.player;
  const free = meridianPointsFree(p);

  const intro = document.createElement('p');
  intro.className = 'empty-note';
  intro.textContent = `${free} point${free === 1 ? '' : 's'} free to open (${meridianPointsSpent(p)}/${meridianPointsEarned(p)} spent) — one earned per breakthrough, permanent, no spirit stones.`;
  container.appendChild(intro);

  const list = document.createElement('div');
  list.className = 'mer-list';
  for (const node of MERIDIAN_LIST) list.appendChild(nodeRow(node, state, actions));
  container.appendChild(list);
}
