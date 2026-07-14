// Stormcrown Peak — the third zone (Core Formation tier). The storm-wreathed
// summit above Cindervein Gorge, where the thin air and hammering sky-fire test
// cultivators who have formed their golden core. Zone definition + its native
// creatures in one file (see azuremist.js / cindervein.js for the pattern). Pure
// data; the registry (js/zones/registry.js) composes it into ZONES /
// CREATURE_TYPES. Reached through a Core-Formation-gated portal from Cindervein.
//
// No imports, so it can never form a cycle with actors/map.

// Creatures native to Stormcrown Peak. Shape matches the shared creature
// template: { id, name, cardId, flavor, levels, base, perLevel, xp, stones }.
// `base` is the LEVEL-1 baseline: the engine (js/actors.js spawnCreature /
// creatureStatBlock) computes effective stats as base + perLevel*(level - 1) —
// NOT relative to the band's low level. Because these creatures only ever spawn
// at levels 19-27, `base` is a hypothetical level-1 value (a couple of low stats
// sit at/near zero); what matters is that base + perLevel*(level - 1) lands on
// the intended effective block at each band level. Re-derived and verified BY
// SIM against the real spawnCreature + resolveCombat + effectiveStats pipeline
// (≥3000 fights/matchup, player kits built through createPlayer + stat-point
// allocation + generateItem Rare gear + cards/meridians):
//   band 1 (Galewing Roc  L19-21) — a CF1 arrival with FE-endgame Rare gear wins
//       reliably (~99% @L19, ~99% @L21); clearly under-geared (Uncommon) struggles
//       (~58% @L19, ~22% @L21).
//   band 2 (Stormscale Wyrm L22-24) — a wall for that arrival kit (~8%), farmable
//       (~93% @L22) once the player has CF3-4 + Rare ~L20 gear farmed from band 1.
//   band 3 (Celestial Warden L25-27) — punishing for band-2 kits (~18%); a real
//       gamble at CF6 with Rare ~L23 (~43-61%); reliable at CF9 with Rare L27 +
//       maxed combat Spirit Cards + full meridians (~100%; buffs also ~100%).
// Effective blocks: Roc L19 48/18/46/8/122 · Wyrm L22 58/38/52/24/190 ·
//   Warden L25 70/39/62/29/304 (atk/def/dmg/arm/HP).
// xp/stones are unchanged. xp scales ~30x over the FE creatures (emberHound 90 ->
// 2800, cinderGolem 150 -> 4800, ashenRevenant 240 -> 7600), so a CF stage costs a
// similar kill-count to an FE stage: CF1->2 (STAGE_XP 260k) / 2800 ~= 93 kills,
// mirroring FE1->2 (8600) / emberHound 90 ~= 96 kills.
export const CREATURES = [
  // Band 1, farmable from arrival (~CF1 with FE-endgame gear): a fast striker
  // riding the summit gales — high attack/damage, thin defenses, low HP.
  {
    id: 'galewingRoc',
    name: 'Galewing Roc',
    cardId: 'card_galewingRoc',
    flavor: 'A storm-born raptor the size of a war-barge, it rides the summit gales and stoops on cultivators who climb too high. It strikes like thunder and folds like paper.',
    levels: [19, 20, 21],
    base: { attack: 12, defense: 0, damage: 10, armor: 1, maxHp: 14 },
    perLevel: { attack: 2, defense: 1, damage: 2, armor: 0.4, maxHp: 6 },
    xp: 2800,
    stones: 400,
  },
  // Band 2, mid wall: a thunder-scaled serpent coiled in the stormclouds — tanky
  // armor/HP that FE-endgame gear can't grind down, but band-1 CF drops can.
  {
    id: 'stormscaleWyrm',
    name: 'Stormscale Wyrm',
    cardId: 'card_stormscaleWyrm',
    flavor: 'Its scales drank a thousand years of sky-fire until lightning runs harmless beneath them. Patient, armoured, and slow to bleed — a wall of living storm.',
    levels: [22, 23, 24],
    base: { attack: 16, defense: 9, damage: 14, armor: 3, maxHp: 22 },
    perLevel: { attack: 2, defense: 1.4, damage: 1.8, armor: 1, maxHp: 8 },
    xp: 4800,
    stones: 700,
  },
  // Band 3 apex: the summit's ancient guardian spirit. High everything —
  // under-geared cultivators are crushed, a band-2-geared cultivator has a real
  // gamble, and only a maxed (and ideally buffed) core-formed adept wins reliably.
  {
    id: 'celestialWarden',
    name: 'Celestial Warden',
    cardId: 'card_celestialWarden',
    flavor: 'Set at the peak by an immortal long ascended, it has turned back every claimant to the summit for an age. It does not hunger, does not tire, and does not yield.',
    levels: [25, 26, 27],
    base: { attack: 34, defense: 15, damage: 38, armor: 17, maxHp: 88 },
    perLevel: { attack: 1.5, defense: 1, damage: 1, armor: 0.5, maxHp: 9 },
    xp: 7600,
    stones: 1100,
  },
];

export const ZONE = {
  id: 'thunderpeak',
  name: 'Stormcrown Peak',
  size: 11, // odd so the maze grid tiles cleanly (cells on even coords)
  realm: 'Core Formation',
  start: { x: 0, y: 0 },
  startLabel: 'Cloudgate Terrace',
  braid: 0.32, // the tightest, most storm-wracked maze
  keepOpen: [{ x: 10, y: 10 }], // the Celestial Warden's summit lair stays reachable
  // Flat roster across the whole peak: roc common, wyrm frequent, Warden a
  // punishing apex wall.
  spawns: [
    { type: 'galewingRoc', weight: 4 },
    { type: 'stormscaleWyrm', weight: 3 },
    { type: 'celestialWarden', weight: 2 },
  ],
  portals: [
    // Road home to Cindervein — arrive ON its outbound Stormcrown portal (10,2).
    { x: 0, y: 6, to: 'cindervein', entryX: 10, entryY: 2, minStage: 0 },
  ],
};
