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
    text: 'An elder asks you to scout the deeper wilds. Reach the stone marker at (5, 5) in Azuremist Vale.',
    type: 'reach',
    target: { zone: 'azuremist', x: 5, y: 5 },
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
    text: 'Your master senses your potential. Reach Qi Condensation 4 and claim a treasure from the sect vault — it will open the way beyond the Vale.',
    type: 'stage',
    target: { stage: 4 },
    reward: { stones: 300, item: { slot: 'weapon', level: 4, rarity: 'rare' } },
  },
  // --- Zone 2 bridge: Cindervein Gorge ---
  {
    id: 'seek-the-gorge',
    title: 'The Road Beyond',
    text: 'A rift at the Vale’s far corner (9, 9) leads to the Cindervein Gorge. Travel through it.',
    type: 'reach',
    target: { zone: 'cindervein', x: 0, y: 0 },
    reward: { stones: 120, xp: 150 },
  },
  {
    id: 'ember-hunt',
    title: 'Hounds of Ash',
    text: 'Ember hounds harry the outpost. Slay 5 to prove your footing in the Gorge.',
    type: 'kill',
    target: { typeId: 'emberHound', count: 5 },
    reward: { stones: 250, xp: 300, item: { slot: 'robe', level: 7, rarity: 'rare' } },
  },
  {
    id: 'gorge-wall',
    title: 'The Ashen Sentinel',
    text: 'An ashen revenant guards the deep Gorge. Face one — measure yourself against the wall of this realm.',
    type: 'face',
    target: { typeId: 'ashenRevenant', count: 1 },
    reward: { xp: 500 },
  },
  {
    id: 'foundation-1',
    title: 'Establishing the Foundation',
    text: 'Break through the realm barrier and reach Foundation Establishment. The sect will reward the ascent.',
    type: 'stage',
    target: { stage: 10 },
    reward: { stones: 800, item: { slot: 'weapon', level: 8, rarity: 'rare' } },
  },
  // --- Epic saga: The Heaven-Severing Blade (GDD §5). A multi-step endgame
  // chain that opens once the player has established their Foundation, spanning
  // both zones and culminating in a hand-authored Legendary artifact. Reward
  // items with an `item.named` key mint a fixed NAMED_ITEMS artifact instead of
  // a random roll (see game.js claimQuest + items.js mintNamedItem). ---
  {
    id: 'epic-omens',
    title: 'Omens in the Vale',
    text: 'A blind sect oracle wakes screaming of a blade sealed beneath the ash. She bids you gather death-omens first: slay 8 Bone Serpents in Azuremist Vale, that their grave-chill may point the way.',
    type: 'kill',
    target: { typeId: 'boneSerpent', count: 8 },
    reward: { stones: 500, xp: 600 },
  },
  {
    id: 'epic-fragment',
    title: 'The Cinderbound Fragment',
    text: 'The omens converge on the deepest scar of Cindervein Gorge. Journey to the ember-cracked altar at (9, 9) and recover the first fragment of the seal.',
    type: 'reach',
    target: { zone: 'cindervein', x: 9, y: 9 },
    reward: { stones: 300, xp: 400, item: { named: 'ashenAegis' } },
  },
  {
    id: 'epic-trial',
    title: 'Trial of Ash and Iron',
    text: 'The fragment must be tempered in golem-fire. Break 10 Cinder Golems upon the anvil of the Gorge and quench the seal in their molten cores.',
    type: 'kill',
    target: { typeId: 'cinderGolem', count: 10 },
    reward: { stones: 700, xp: 800 },
  },
  {
    id: 'epic-sentinel',
    title: "The Sentinel's Vigil",
    text: 'One guardian yet stands between you and the blade. Face the Ashen Revenant that keeps the deep Gorge — measure your resolve against the wall of the realm.',
    type: 'face',
    target: { typeId: 'ashenRevenant', count: 1 },
    reward: { stones: 500, xp: 1200 },
  },
  {
    id: 'epic-reforge',
    title: "Reforging Heaven's Edge",
    text: 'The seal is broken, but the blade will answer only to a cultivator of true Foundation. Ascend to Foundation Establishment 5, and Skyfracture — the Heaven-Severing Blade — is yours.',
    type: 'stage',
    target: { stage: 14 },
    reward: { stones: 2000, item: { named: 'heavenSeverer' } },
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

export function onMove(qs, zoneId, x, y) {
  const q = currentQuest(qs);
  if (
    q &&
    !qs.claimable &&
    q.type === 'reach' &&
    q.target.zone === zoneId &&
    q.target.x === x &&
    q.target.y === y
  ) {
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
