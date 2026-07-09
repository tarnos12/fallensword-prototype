// tools/balance.mjs — Fallen Immortal headless balance harness (board task J, GDD §8.6).
//
// A COMMITTED, reusable, importable balance sim. Run it with:
//
//     node tools/balance.mjs
//
// It prints a full balance report: per-zone band matchups, boss gates, the XP
// economy (kills-per-stage), the drop economy (farming net-positive?), and a
// market-pricing sanity pass. Every number comes from the REAL game modules —
// this file NEVER hand-rolls stat scaling. (That exact mistake shipped once: a
// builder tuned zone 3 against `base + perLevel*(lv - bandStart)` instead of the
// engine's `base + perLevel*(lv - 1)`, and every figure was fictional. So we
// import spawnCreature / creatureStatBlock / resolveCombat / effectiveStats /
// generateItem and let them do the math.)
//
// TESTING-ONLY caveat (see CLAUDE.md): the running game ships with `MAX_QI = 500`
// and a "quartermaster" starting kit (one item of every rarity + free skill/stat
// points) that are TESTING ONLY and stripped before demo. This harness must NOT
// rely on either — it builds every player explicitly through createPlayer() +
// stat-point allocation + generateItem(), so its numbers reflect the shipping,
// earn-it-yourself game, not the debug conveniences.
//
// Player-power model, validated against the independently-verified zone-3 tuning
// (band1 ~99% on CF1 arrival with FE-endgame Rare gear; band2 ~10% arrival / ~95%
// farmed; band3 ~24% mid / ~100% maxed): a "bruiser" stat-point spread, Rare gear
// at an on-curve level, and — for maxed kits only — full meridians + a maxed
// combat Spirit-Card collection. Reproducing those numbers is what tells us the
// pipeline (not a hand-rolled formula) is driving the sim.
//
// Output is a report, never a gate: it always exits 0. PASS/WARN per row is
// measured against the tolerance bands declared at the top of this file.

// --- localStorage stub: several UI-side modules read it at import; the sim only
// touches pure logic, but the import graph must resolve headlessly. ------------
globalThis.localStorage = {
  _s: new Map(),
  getItem(k) { return this._s.has(k) ? this._s.get(k) : null; },
  setItem(k, v) { this._s.set(k, String(v)); },
  removeItem(k) { this._s.delete(k); },
};

import { createPlayer, spawnCreature, creatureStatBlock, CREATURE_TYPES } from '../js/actors.js';
import {
  generateItem, sellValue, repairCost, rollDrop, RARITIES, DROP_CHANCE, MAX_FORGE_LEVEL,
} from '../js/items.js';
import {
  playerCombatActor, STAT_POINTS_PER_STAGE, MAX_STAGE, REALMS,
  xpForBreakthrough, stageName,
} from '../js/progression.js';
import { resolveCombat } from '../js/combat.js';
import { mulberry32, randomSeed } from '../js/rng.js';
import { CARDS } from '../js/cards.js';
import { allocateMeridian, meridianPointsFree } from '../js/meridians.js';
import { BOSSES } from '../js/boss.js';
import { marketValue, LISTING_TTL_MS } from '../js/market.js';

// ============================================================================
// TOLERANCE BANDS — the stated pass criteria. A row PASSes when its measured
// win% falls inside the band named by that scenario's `expect` tag; otherwise
// it WARNs. These encode the GDD §8.6 design intent (self-selected difficulty:
// on-curve content is farmable, next-band content is a wall until you gear up,
// apex content is a late gamble that only a maxed cultivator wins reliably).
// ============================================================================
const WIN = {
  // On-curve farm target for this kit — you should clear it reliably.
  farmable: { min: 60, max: 100, note: 'on-curve: win reliably' },
  // A tier below the kit — trivially easy is EXPECTED (progression).
  trivial: { min: 80, max: 100, note: 'below curve: trivial' },
  // One band above the kit — a real, self-selected challenge (coin-flip-ish).
  gamble: { min: 20, max: 80, note: 'stretch: a genuine gamble' },
  // Two+ bands above, or a boss you are under-geared for — a wall you lose.
  wall: { min: 0, max: 30, note: 'gated: mostly lose on this kit' },
  // Hopelessly under-geared vs a calamity — you are crushed.
  crushed: { min: 0, max: 12, note: 'crushed: hopeless' },
  // A maxed cultivator vs gate content — you should win reliably.
  reliable: { min: 85, max: 100, note: 'maxed: win reliably' },
};

// XP economy: sane kills-per-stage. Ordinary stages should not demand an absurd
// grind; the two authored realm barriers (QC9->FE1, FE9->CF1) get a higher
// ceiling because the bottleneck is deliberate (GDD §9.1).
const XP_KILLS = {
  normalMin: 4, // a stage clearing in <4 kills is trivially fast
  normalMax: 320, // a normal stage over this reads as a grind wall (late-realm
  //                 stages legitimately climb toward this before the barrier)
  barrierMax: 900, // realm-barrier stages are allowed to be long
  maxNeighborJump: 2.2, // a non-barrier stage jumping >this× the previous
  //                       non-barrier stage's kills is "out of line with neighbors"
};

// Drop economy: farming must be net-positive (stones + expected drop value must
// cover the wear it costs). WARN if the margin is negative or razor-thin.
const ECON_MIN_NET = 1; // spirit stones of margin per fight, at minimum.

// Market: a listing's fair value is a premium over the vendor sell floor (you
// pay more to buy than a vendor gives) but not an absurd multiple.
const MARKET = { minPremium: 1.4, maxPremium: 5.0 };

// Fights sampled per matchup row. Combat is near-deterministic per statline, so
// we SAMPLE A FRESH GEAR ROLL (and a fresh combat seed) each fight — win% is the
// fraction of on-curve gear rolls that win.
const N_FIGHTS = 4000;
const N_DROP_SAMPLES = 40000; // drop-value expectation samples per creature

// ============================================================================
// Player builder — the representative on-curve cultivator, through the REAL
// pipeline. No testing kit, no MAX_QI: just createPlayer + allocation + gear.
// ============================================================================

// Named stat-point spreads (fractions over ALLOC_STATS). "bruiser" is the
// calibrated default (offense-forward with real HP), matching how zone 3 was
// tuned. Others are provided for what-if analysis via playerAt(..., spread).
const SPREADS = {
  bruiser: { attack: 0.30, damage: 0.30, hp: 0.25, defense: 0.08, armor: 0.07 },
  glass: { attack: 0.40, damage: 0.40, hp: 0.20, defense: 0.0, armor: 0.0 },
  balanced: { attack: 0.2, damage: 0.2, hp: 0.2, defense: 0.2, armor: 0.2 },
  tank: { attack: 0.12, damage: 0.12, hp: 0.36, defense: 0.20, armor: 0.20 },
};

// Distribute T integer points over a spread by largest-remainder, then write
// them straight onto player.allocated (the sim owns the player; no need to route
// through allocateStat's statPoints bookkeeping).
function allocatePoints(player, total, spreadName) {
  const w = SPREADS[spreadName] ?? SPREADS.bruiser;
  const keys = Object.keys(w);
  const raw = keys.map((k) => ({ k, exact: total * w[k] }));
  let used = 0;
  for (const r of raw) { r.n = Math.floor(r.exact); used += r.n; }
  raw.sort((a, b) => (b.exact - b.n) - (a.exact - a.n));
  for (let i = 0; used < total; i++, used++) raw[i % raw.length].n += 1;
  for (const r of raw) player.allocated[r.k] = r.n;
}

// The two boss Spirit Cards. A first-time boss challenger CANNOT own the card
// that boss drops, so an "at-gate" kit must exclude these (owning them is
// circular — you'd already have farmed the boss). Only a truly-maxed endgame
// player who has beaten every boss holds them.
const BOSS_CARD_IDS = new Set(Object.values(BOSSES).map((b) => b.cardId));

// Max out combat-stat Spirit Cards (attack/defense/damage/armor/hp) — the power
// of a collection. `includeBoss` chooses whether the two boss cards are counted:
// zone-farming / boss-at-gate kits use zone cards only; the endgame maxed kit
// uses everything.
function grantCombatCards(player, { includeBoss = false } = {}) {
  for (const c of Object.values(CARDS)) {
    if (!['attack', 'defense', 'damage', 'armor', 'hp'].includes(c.bonusType)) continue;
    if (!includeBoss && BOSS_CARD_IDS.has(c.id)) continue;
    player.cards[c.id] = c.maxLevel;
  }
}

// Spend every earned meridian point on combat nodes (offense-forward priority).
function grantFullMeridians(player) {
  const order = ['governing', 'thrusting', 'conception', 'yangLinking', 'girdle'];
  let guard = 400;
  while (meridianPointsFree(player) > 0 && guard-- > 0) {
    let progressed = false;
    for (const id of order) {
      if (meridianPointsFree(player) <= 0) break;
      if (allocateMeridian(player, id).ok) progressed = true;
    }
    if (!progressed) break;
  }
}

// Apply a representative endgame technique buff (a maxed cultivator channelling
// their strongest art) as a never-expiring buff on the combat snapshot.
function grantBuff(player) {
  player.activeBuffs = [{ techniqueId: 'sim-buff', effect: { attack: 0.25, damage: 0.25 }, expiresAt: Number.MAX_SAFE_INTEGER }];
}

/**
 * Build a representative player through the real pipeline.
 * @param {number} level     cultivation stage (1..MAX_STAGE)
 * @param {number} gearLevel level of the equipped weapon+robe
 * @param {string} rarity    gear rarity key (common..mythic)
 * @param {object} opts      cumulative power sources:
 *   spread     — stat-point spread name (default 'bruiser')
 *   cards      — false | 'zone' (zone cards) | 'all' (incl. boss cards)
 *   meridians  — allocate all earned meridian points into combat nodes
 *   buff       — apply a representative channelled technique buff
 *
 * MODELLING NOTE. Zone ARRIVAL/MID matchup kits are deliberately BARE
 * (gear+allocation only) — that is exactly the conservative floor the
 * independently-verified zone-3 tuning was measured against, and adding the
 * always-on passives there would make already-verified content look churnable
 * (band-2 arrival 4%→56%, band-3 mid 14%→74%). FARMED/MAXED and BOSS kits do
 * add meridians/cards/buff, because that content was tuned against a player who
 * has those (a boss is a prepared set-piece fought with the full kit; the game
 * itself applies technique + pill buffs to boss combat). So the harness encodes
 * each matchup against the same kit its content was verified with.
 */
function playerAt(level, gearLevel, rarity, opts = {}) {
  const { spread = 'bruiser', cards = false, meridians = false, buff = false } = opts;
  const p = createPlayer();
  p.level = level;
  allocatePoints(p, Math.max(0, (level - 1) * STAT_POINTS_PER_STAGE), spread);
  const rng = mulberry32(randomSeed());
  p.equipment.weapon = generateItem('weapon', gearLevel, rarity, rng);
  p.equipment.robe = generateItem('robe', gearLevel, rarity, rng);
  if (cards === 'all') grantCombatCards(p, { includeBoss: true });
  else if (cards) grantCombatCards(p, { includeBoss: false });
  if (meridians) grantFullMeridians(p);
  if (buff) grantBuff(p);
  return p;
}

// ============================================================================
// Combat sampling
// ============================================================================

// Run N fights of a fresh on-curve player (fresh gear roll each fight) vs a
// freshly-spawned foe. Returns win/loss/draw% + median rounds.
function matchup(makePlayer, makeFoe, n = N_FIGHTS) {
  let win = 0, loss = 0, draw = 0;
  const rounds = [];
  for (let i = 0; i < n; i++) {
    const p = makePlayer();
    const foe = makeFoe();
    const res = resolveCombat(playerCombatActor(p), foe, randomSeed());
    rounds.push(res.turns.length);
    if (res.outcome === 'win') win++;
    else if (res.outcome === 'loss') loss++;
    else draw++;
  }
  rounds.sort((a, b) => a - b);
  return {
    winPct: (100 * win) / n,
    lossPct: (100 * loss) / n,
    drawPct: (100 * draw) / n,
    medRounds: rounds[Math.floor(rounds.length / 2)],
  };
}

// A foe factory for a creature type at a fixed representative level.
function foeFactory(typeId, level) {
  return () => spawnCreature(typeId, level, Math.random);
}
// A boss foe factory (fixed authored stat block).
function bossFoeFactory(boss) {
  return () => ({
    id: `boss-${boss.id}`, name: boss.name, level: boss.level,
    stats: { ...boss.stats }, hp: boss.maxHp, maxHp: boss.maxHp,
  });
}

// ============================================================================
// Report formatting helpers
// ============================================================================
const pad = (s, w, right = false) => {
  s = String(s);
  return right ? s.padStart(w) : s.padEnd(w);
};
function verdictOf(winPct, expectKey) {
  const band = WIN[expectKey];
  const ok = winPct >= band.min && winPct <= band.max;
  return { ok, label: ok ? 'PASS' : 'WARN', band };
}
let WARN_COUNT = 0;
function tallyVerdict(ok) { if (!ok) WARN_COUNT++; }

function hr(title) {
  console.log('\n' + '='.repeat(78));
  console.log('  ' + title);
  console.log('='.repeat(78));
}

// Representative mid-band level for a creature (the middle of its `levels`).
function repLevel(typeId) {
  const lv = CREATURE_TYPES[typeId].levels;
  return lv[Math.floor(lv.length / 2)];
}

// ============================================================================
// SECTION (a) — Per-zone band matchups
// ============================================================================

// The three on-curve kits per zone (arrival / mid / farmed), plus the band
// creatures. Kit definitions are calibrated so the diagonal (kit N vs band N) is
// the intended on-curve farm and the off-diagonal shows the gate structure.
// `expect` grid is indexed [kitIndex][bandIndex].
// Expectation grids encode the VERIFIED gate structure per zone (not a uniform
// template): Azuremist is a gentle tutorial ramp (only the Rogue Cultivator draw-
// wall bites a fresh arrival); Cindervein's normal mobs are a short ramp that an
// FE1 rare kit masters (its real FE-tier gates are the two calamity bosses,
// section b); Stormcrown is the steep, gated end-game (each band walls until you
// out-gear it, the apex reliable only when maxed).
const ZONE_MATCHUPS = [
  {
    zone: 'azuremist', label: 'Azuremist Vale (Qi Condensation, Lv 1-6)',
    bands: ['wolfSpirit', 'boneSerpent', 'rogueCultivator'],
    kits: [
      { name: 'arrival  (QC1 · Common L2)', make: () => playerAt(2, 2, 'common') },
      { name: 'mid      (QC4 · Uncommon L4)', make: () => playerAt(4, 4, 'uncommon') },
      { name: 'farmed   (QC7 · Rare L6)', make: () => playerAt(7, 6, 'rare') },
    ],
    // rows = kits, cols = bands
    expect: [
      ['farmable', 'farmable', 'wall'], // fresh QC1 draws the Rogue Cultivator (authored wall)
      ['trivial', 'trivial', 'farmable'],
      ['trivial', 'trivial', 'trivial'],
    ],
  },
  {
    zone: 'cindervein', label: 'Cindervein Gorge (Foundation Establishment, Lv 7-12)',
    bands: ['emberHound', 'cinderGolem', 'ashenRevenant'],
    kits: [
      { name: 'arrival  (QC5 · Uncommon L6)', make: () => playerAt(5, 6, 'uncommon') },
      { name: 'mid      (FE1 · Rare L10)', make: () => playerAt(10, 10, 'rare') },
      { name: 'farmed   (FE3 · Rare L12 +cards+mer)', make: () => playerAt(12, 12, 'rare', { cards: 'zone', meridians: true }) },
    ],
    expect: [
      ['farmable', 'farmable', 'gamble'], // under-levelled arrival: Ashen Revenant is a real gamble
      ['trivial', 'trivial', 'trivial'], // FE1 rare masters the zone's normal mobs
      ['trivial', 'trivial', 'trivial'],
    ],
  },
  {
    zone: 'thunderpeak', label: 'Stormcrown Peak (Core Formation, Lv 19-27)',
    bands: ['galewingRoc', 'stormscaleWyrm', 'celestialWarden'],
    kits: [
      { name: 'arrival  (CF1 · Rare L13)', make: () => playerAt(19, 13, 'rare') },
      { name: 'mid      (CF4 · Rare L20)', make: () => playerAt(22, 20, 'rare') },
      { name: 'farmed   (CF9 · Rare L27 +cards+mer)', make: () => playerAt(27, 27, 'rare', { cards: 'zone', meridians: true }) },
    ],
    expect: [
      ['farmable', 'wall', 'wall'], // arrival farms band 1, walled by band 2/3
      ['trivial', 'farmable', 'wall'], // CF4 mid opens band 2; band 3 still walls (gamble comes ~CF6)
      ['trivial', 'trivial', 'reliable'], // maxed CF9 clears the apex reliably
    ],
  },
];

function sectionZoneMatchups() {
  hr('(a) PER-ZONE BAND MATCHUPS  — on-curve kit vs each band (win/loss/draw %, med rounds)');
  for (const z of ZONE_MATCHUPS) {
    console.log('\n' + z.label);
    // Effective stat block of each band creature at its rep level (engine-derived).
    for (const t of z.bands) {
      const b = creatureStatBlock(t, repLevel(t));
      console.log(`  · ${pad(`${CREATURE_TYPES[t].name} L${b.level}`, 24)} ATK ${pad(b.attack, 3, true)} DEF ${pad(b.defense, 3, true)} DMG ${pad(b.damage, 3, true)} ARM ${pad(b.armor, 3, true)} HP ${pad(b.maxHp, 4, true)}`);
    }
    const bandCols = z.bands.map((t) => `${CREATURE_TYPES[t].name} L${repLevel(t)}`);
    console.log('  ' + pad('kit \\ band', 34) + bandCols.map((c) => pad(c, 26)).join(''));
    z.kits.forEach((kit, ki) => {
      let line = '  ' + pad(kit.name, 34);
      let verdictLine = '  ' + pad('', 34);
      z.bands.forEach((typeId, bi) => {
        const m = matchup(kit.make, foeFactory(typeId, repLevel(typeId)));
        const cell = `${m.winPct.toFixed(0)}/${m.lossPct.toFixed(0)}/${m.drawPct.toFixed(0)}  r${m.medRounds}`;
        line += pad(cell, 26);
        const v = verdictOf(m.winPct, z.expect[ki][bi]);
        tallyVerdict(v.ok);
        verdictLine += pad(`${v.label}[${z.expect[ki][bi]}]`, 26);
      });
      console.log(line);
      console.log('\x1b[2m' + verdictLine + '\x1b[0m');
    });
  }
  console.log('\n  legend: win/loss/draw %, r = median rounds.  bands: farmable≥60 · gamble 20-80 · wall≤30 · trivial≥80 · reliable≥85');
}

// ============================================================================
// SECTION (b) — Boss gates
// ============================================================================

// Each boss vs an under-geared / at-gate / maxed cultivator. A calamity is a
// prepared set-piece: the at-gate player fights it with their always-on kit
// (meridians — auto-earned per breakthrough — plus their ZONE Spirit-Card
// collection; NOT the boss's own card, which they can't own before beating it).
// The maxed kit adds every card (an endgame player has cleared the bosses) and a
// channelled technique buff. Levels/kits reproduce the boss.js / CLAUDE.md design
// intent — validated below, no retune (see the harness header).
const BOSS_SCENARIOS = {
  ancientTerror: [
    { name: 'under-geared (FE1 · Uncommon L9 +mer)', expect: 'crushed', make: () => playerAt(10, 9, 'uncommon', { meridians: true }) },
    { name: 'at-gate      (FE3 · Rare L12 +mer)', expect: 'gamble', make: () => playerAt(12, 12, 'rare', { meridians: true }) },
    { name: 'maxed+buffed (FE9 · Rare L18 +allcards+mer+buff)', expect: 'reliable', make: () => playerAt(18, 18, 'rare', { cards: 'all', meridians: true, buff: true }) },
  ],
  emberCalamity: [
    { name: 'under-geared (FE5 · Rare L14 +mer)', expect: 'crushed', make: () => playerAt(14, 14, 'rare', { meridians: true }) },
    { name: 'at-gate      (FE7 · Rare L16 +mer+zcards)', expect: 'gamble', make: () => playerAt(16, 16, 'rare', { cards: 'zone', meridians: true }) },
    { name: 'maxed+buffed (FE9 · Rare L18 +allcards+mer+buff)', expect: 'reliable', make: () => playerAt(18, 18, 'rare', { cards: 'all', meridians: true, buff: true }) },
  ],
  tribulationSovereign: [
    { name: 'under-geared (CF5 arrival · Rare L23 +mer)', expect: 'crushed', make: () => playerAt(23, 23, 'rare', { meridians: true }) },
    { name: 'at-gate      (CF7 · Rare L25 +mer+zcards)', expect: 'gamble', make: () => playerAt(25, 25, 'rare', { cards: 'zone', meridians: true }) },
    { name: 'maxed+buffed (CF9 · Rare L27 +allcards+mer+buff)', expect: 'reliable', make: () => playerAt(27, 27, 'rare', { cards: 'all', meridians: true, buff: true }) },
  ],
};

function sectionBossGates() {
  hr('(b) BOSS GATES  — each calamity vs under-geared / at-gate / maxed player');
  for (const boss of Object.values(BOSSES)) {
    const s = boss.stats;
    console.log(`\n${boss.name}  (Lv ${boss.level} · ATK ${s.attack} DEF ${s.defense} DMG ${s.damage} ARM ${s.armor} HP ${boss.maxHp} · gate stage ${boss.minStage})`);
    console.log('  ' + pad('player', 46) + pad('win/loss/draw', 20) + pad('med', 6) + 'verdict');
    for (const sc of (BOSS_SCENARIOS[boss.id] ?? [])) {
      const m = matchup(sc.make, bossFoeFactory(boss));
      const v = verdictOf(m.winPct, sc.expect);
      tallyVerdict(v.ok);
      const wld = `${m.winPct.toFixed(0)}/${m.lossPct.toFixed(0)}/${m.drawPct.toFixed(0)}`;
      console.log('  ' + pad(sc.name, 46) + pad(wld, 20) + pad('r' + m.medRounds, 6) + `${v.label} [${sc.expect}]`);
    }
  }
}

// ============================================================================
// SECTION (c) — XP economy (kills-per-stage)
// ============================================================================

// The on-level farm target for a player at a given stage: the highest-band
// creature they can efficiently clear in the zone they're farming. Returns
// { typeId, level }. CF stages > their zone's top band cap at the top creature.
function farmTargetFor(level) {
  if (level <= 2) return { typeId: 'wolfSpirit', level };
  if (level <= 4) return { typeId: 'boneSerpent', level };
  if (level <= 6) return { typeId: 'rogueCultivator', level };
  if (level <= 8) return { typeId: 'emberHound', level };
  if (level <= 10) return { typeId: 'cinderGolem', level };
  if (level <= 12) return { typeId: 'ashenRevenant', level };
  if (level <= 18) return { typeId: 'ashenRevenant', level: 12 }; // FE mid-late: top of Cindervein until CF
  if (level <= 21) return { typeId: 'galewingRoc', level };
  if (level <= 24) return { typeId: 'stormscaleWyrm', level };
  return { typeId: 'celestialWarden', level: Math.min(level, 27) };
}

// A creature's actual xp reward at a level (spawnCreature's authored scaling).
function xpRewardAt(typeId, level) {
  return spawnCreature(typeId, level, Math.random).xpReward;
}
const BARRIER_STAGES = new Set([REALMS[0].stages, REALMS[0].stages + REALMS[1].stages]); // QC9->FE1, FE9->CF1

function sectionXpEconomy() {
  hr('(c) XP ECONOMY  — kills-per-stage against the on-level farm target');
  console.log('  ' + pad('stage', 26) + pad('XP to next', 12, true) + '  ' + pad('farm target', 26) + pad('xp/kill', 9, true) + pad('kills', 8, true) + pad('x prev', 8, true) + '  verdict');
  let prevNonBarrier = null;
  for (let stage = 1; stage < MAX_STAGE; stage++) {
    const need = xpForBreakthrough(stage);
    const tgt = farmTargetFor(stage);
    const xpk = xpRewardAt(tgt.typeId, tgt.level);
    const kills = Math.ceil(need / xpk);
    const barrier = BARRIER_STAGES.has(stage);
    const ceil = barrier ? XP_KILLS.barrierMax : XP_KILLS.normalMax;
    // Relative "out of line with neighbors" check (non-barrier stages only).
    const jump = (!barrier && prevNonBarrier) ? kills / prevNonBarrier : null;
    const jumpOk = !jump || jump <= XP_KILLS.maxNeighborJump;
    const ok = kills >= XP_KILLS.normalMin && kills <= ceil && jumpOk;
    tallyVerdict(ok);
    const label = ok ? 'PASS' : 'WARN';
    const tag = barrier ? ' (realm barrier)' : (!jumpOk ? ' (jump vs prev!)' : '');
    console.log(
      '  ' + pad(`${stage}: ${stageName(stage)}→${stageName(stage + 1)}`, 26)
      + pad(need.toLocaleString(), 12, true) + '  '
      + pad(`${CREATURE_TYPES[tgt.typeId].name} L${tgt.level}`, 26)
      + pad(xpk, 9, true) + pad(kills, 8, true) + pad(jump ? jump.toFixed(2) + '×' : '–', 8, true) + '  ' + label + tag
    );
    if (!barrier) prevNonBarrier = kills;
  }
  console.log(`\n  tolerance: ${XP_KILLS.normalMin}-${XP_KILLS.normalMax} kills/stage, no >${XP_KILLS.maxNeighborJump}× jump vs the previous non-barrier stage (realm barriers up to ${XP_KILLS.barrierMax}).`);
}

// ============================================================================
// SECTION (d) — Drop economy (farming net-positive?)
// ============================================================================

// Expected drop value per fight: sample rollDrop many times (it folds
// DROP_CHANCE and the gem/gear split) and average the sellValue of what comes
// back (null → 0).
function expectedDropValue(creatureLevel) {
  const rng = mulberry32(randomSeed());
  let sum = 0;
  for (let i = 0; i < N_DROP_SAMPLES; i++) {
    const d = rollDrop(creatureLevel, rng);
    if (d) sum += sellValue(d);
  }
  return sum / N_DROP_SAMPLES;
}

// Per-fight repair cost for a kit: each equipped piece wears 1 durability/fight
// (items.js degradeEquipment), so the amortized cost is items.js repairCost() of
// a weapon + a robe of this rarity each down one durability point.
function repairPerFight(rarityKey, level) {
  const rng = mulberry32(1234);
  let cost = 0;
  for (const slot of ['weapon', 'robe']) {
    const it = generateItem(slot, level, rarityKey, rng);
    it.durability = it.maxDurability - 1; // one fight's wear
    cost += repairCost(it);
  }
  return cost;
}

function sectionDropEconomy() {
  hr('(d) DROP ECONOMY  — expected stones + drop value per fight vs wear (farming net-positive?)');
  // For each zone band creature, at its rep level, vs the rarity a player farming
  // it is likely wearing.
  const rows = [
    { zone: 'Azuremist', typeId: 'wolfSpirit', gearRarity: 'common' },
    { zone: 'Azuremist', typeId: 'boneSerpent', gearRarity: 'uncommon' },
    { zone: 'Azuremist', typeId: 'rogueCultivator', gearRarity: 'rare' },
    { zone: 'Cindervein', typeId: 'emberHound', gearRarity: 'rare' },
    { zone: 'Cindervein', typeId: 'cinderGolem', gearRarity: 'rare' },
    { zone: 'Cindervein', typeId: 'ashenRevenant', gearRarity: 'rare' },
    { zone: 'Stormcrown', typeId: 'galewingRoc', gearRarity: 'rare' },
    { zone: 'Stormcrown', typeId: 'stormscaleWyrm', gearRarity: 'rare' },
    { zone: 'Stormcrown', typeId: 'celestialWarden', gearRarity: 'rare' },
  ];
  console.log('  ' + pad('zone', 12) + pad('creature', 22) + pad('stones', 8, true) + pad('drop$', 8, true) + pad('wear', 7, true) + pad('net/fight', 11, true) + '  verdict');
  for (const r of rows) {
    const lv = repLevel(r.typeId);
    const stones = spawnCreature(r.typeId, lv, Math.random).stoneReward;
    const dropV = expectedDropValue(lv);
    const wear = repairPerFight(r.gearRarity, lv);
    const net = stones + dropV - wear;
    const ok = net >= ECON_MIN_NET;
    tallyVerdict(ok);
    console.log(
      '  ' + pad(r.zone, 12) + pad(`${CREATURE_TYPES[r.typeId].name} L${lv}`, 22)
      + pad(stones, 8, true) + pad(dropV.toFixed(1), 8, true) + pad(wear, 7, true)
      + pad(net.toFixed(1), 11, true) + '  ' + (ok ? 'PASS' : 'WARN')
    );
  }
  console.log(`\n  drop$ = expected sell value/fight (DROP_CHANCE ${DROP_CHANCE} incl. gem split).  wear = repair cost/fight for the kit's rarity.`);
  console.log(`  net-positive tolerance: ≥ ${ECON_MIN_NET} stones margin/fight.`);
}

// ============================================================================
// SECTION (e) — Market pricing sanity
// ============================================================================
function sectionMarket() {
  hr('(e) MARKET SANITY  — Pavilion fair value vs vendor sell floor (premium multiple)');
  console.log('  ' + pad('rarity', 12) + pad('sample item', 26) + pad('sell', 8, true) + pad('mktValue', 10, true) + pad('premium', 9, true) + '  verdict');
  const rng = mulberry32(20260709);
  for (const rarityKey of ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']) {
    // Sample a mid-level item of this rarity and read the two pricing helpers.
    const item = generateItem('weapon', 8, rarityKey, rng);
    const sv = sellValue(item);
    const mv = marketValue(item);
    const premium = mv / sv;
    const ok = premium >= MARKET.minPremium && premium <= MARKET.maxPremium;
    tallyVerdict(ok);
    console.log(
      '  ' + pad(RARITIES[rarityKey].label, 12) + pad(item.name, 26)
      + pad(sv, 8, true) + pad(mv, 10, true) + pad(premium.toFixed(2) + '×', 9, true)
      + '  ' + (ok ? 'PASS' : 'WARN')
    );
  }
  console.log(`\n  premium tolerance: ${MARKET.minPremium}×–${MARKET.maxPremium}× the vendor sell floor.  NPC listings then apply 0.6×–1.5× noise (bargains↔rip-offs).`);
  console.log(`  listing TTL ${(LISTING_TTL_MS / 60000).toFixed(0)} min.`);
}

// ============================================================================
// Main
// ============================================================================
function main() {
  console.log('FALLEN IMMORTAL — BALANCE REPORT');
  console.log(`realms: ${REALMS.map((r) => `${r.name}(${r.stages})`).join(' · ')} · MAX_STAGE ${MAX_STAGE} · forge cap L${MAX_FORGE_LEVEL}`);
  console.log(`sampling: ${N_FIGHTS} fights/matchup, ${N_DROP_SAMPLES} drop samples/creature`);
  console.log('NOTE: built without the TESTING-ONLY MAX_QI/quartermaster kit — players are createPlayer()+allocation+gear.');

  sectionZoneMatchups();
  sectionBossGates();
  sectionXpEconomy();
  sectionDropEconomy();
  sectionMarket();

  hr('SUMMARY');
  if (WARN_COUNT === 0) console.log('  ALL ROWS PASS — every row within its stated tolerance band.');
  else console.log(`  ${WARN_COUNT} WARN row(s) — see [tag] above; each is a design target to inspect (report, not a gate).`);
  console.log('');
}

main();
process.exit(0); // always a report, never a gate
