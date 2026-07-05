// Quest chain (GDD Stage 1: one zone, 3-5 sequential quests). Progress is
// event-driven: game.js reports kills, movement, combat outcomes, and
// breakthroughs; quests never reach into game state themselves.

export const QUESTS = [
  {
    id: 'cull-wolves',
    title: 'Culling the Pack',
    text: 'Wolf spirits multiply near the sect gate. Thin the pack: slay 5 Ravenous Wolf Spirits.',
    type: 'kill',
    target: { typeId: 'wolfSpirit', count: 5 },
    reward: { stones: 60, xp: 40 },
  },
  {
    id: 'into-wilds',
    title: 'Into the Wilds',
    text: 'An elder asks you to scout the deeper wilds. Reach the stone marker at (5, 5).',
    type: 'reach',
    target: { x: 5, y: 5 },
    reward: { stones: 80, xp: 60, item: { slot: 'robe', level: 2, rarity: 'uncommon' } },
  },
  {
    id: 'serpent-bones',
    title: 'Serpent Bones',
    text: 'The sect alchemist needs serpent vertebrae. Slay 4 Bone Serpents.',
    type: 'kill',
    target: { typeId: 'boneSerpent', count: 4 },
    reward: { stones: 150, xp: 120 },
  },
  {
    id: 'rogues-shadow',
    title: "The Rogue's Shadow",
    text: 'A rogue cultivator stalks the far wilds. Face one in combat — win or walk away, but take his measure.',
    type: 'face',
    target: { typeId: 'rogueCultivator', count: 1 },
    reward: { xp: 200 },
  },
  {
    id: 'breakthrough-4',
    title: 'Foundation of the Path',
    text: 'Your master senses your potential. Reach Qi Condensation 4 and claim a treasure from the sect vault.',
    type: 'stage',
    target: { stage: 4 },
    reward: { stones: 300, item: { slot: 'weapon', level: 4, rarity: 'rare' } },
  },
];

export function createQuestState() {
  return { index: 0, progress: 0, claimable: false };
}

export function currentQuest(qs) {
  return qs.index < QUESTS.length ? QUESTS[qs.index] : null;
}

function checkComplete(qs) {
  const q = currentQuest(qs);
  if (!q) return;
  const needed = q.type === 'kill' || q.type === 'face' ? q.target.count : 1;
  if (qs.progress >= needed) qs.claimable = true;
}

// --- Event hooks, called by game.js ---

export function onKill(qs, typeId) {
  const q = currentQuest(qs);
  if (q && !qs.claimable && q.type === 'kill' && q.target.typeId === typeId) {
    qs.progress += 1;
    checkComplete(qs);
  }
}

export function onFace(qs, typeId) {
  const q = currentQuest(qs);
  if (q && !qs.claimable && q.type === 'face' && q.target.typeId === typeId) {
    qs.progress += 1;
    checkComplete(qs);
  }
}

export function onMove(qs, x, y) {
  const q = currentQuest(qs);
  if (q && !qs.claimable && q.type === 'reach' && q.target.x === x && q.target.y === y) {
    qs.progress = 1;
    checkComplete(qs);
  }
}

export function onStage(qs, stage) {
  const q = currentQuest(qs);
  if (q && !qs.claimable && q.type === 'stage' && stage >= q.target.stage) {
    qs.progress = 1;
    checkComplete(qs);
  }
}

// Re-check stage quests on claim-advance too, so an already-reached stage
// completes the next quest immediately.
export function advance(qs, playerStage) {
  qs.index += 1;
  qs.progress = 0;
  qs.claimable = false;
  onStage(qs, playerStage);
}

export function progressText(qs) {
  const q = currentQuest(qs);
  if (!q) return '';
  if (q.type === 'kill' || q.type === 'face') return `${qs.progress}/${q.target.count}`;
  return qs.claimable ? 'complete' : 'incomplete';
}
