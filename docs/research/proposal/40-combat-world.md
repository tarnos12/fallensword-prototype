# 40 — Combat & World: rarities, spawns, Titans, drops, debug tools, combat UI

**Owner:** Author-CombatWorld. **Status:** design-complete, build-ready. Cross-talk with
Author-Economy (drop *values*/premium-currency drops), Architect-Cull (combat side-panel + tab
removal + the 1-9 key handoff), and the lead/Critic4 (Titan purity shape) is folded in below —
see "Cross-talk resolutions" at the end.

Audited before writing this: `js/combat.js`, `js/actors.js`, `js/boss.js`, `js/map.js`,
`js/zones/{registry,azuremist,cindervein,thunderpeak}.js`, `js/items.js`, `js/sets.js`,
`js/sockets.js`, `js/progression.js`, `js/game.js`, `js/save.js`, `js/tabs.js`, `js/ui.js`
(`renderMap`/`renderTilePanel`/`playCombat`), `js/combatfx.js`, `js/input.js`, `index.html`,
`tools/balance.mjs`'s import list (to confirm what must stay Node-safe).

**Save-schema note up front:** every mechanic below is additive **entirely via new fields on
existing Actor/Item objects that already flow through the current save shape** (`tile.monsters[]`
→ `map.tiles` → `state.zones` → the save blob). **No `save.js` changes, no `VERSION` bump,
anywhere in this doc.** Titan world-HP, hit progress, Legendary/SuperElite flags, and the new
`qiRegen` item-bonus key all ride the existing `player.equipment[*].bonuses` map and
`tile.monsters[*]` array verbatim — see each section's "persistence" note.

**Monster tagging field (final shape, resolving the Author-Economy/Critic4 cross-doc flag):** every
rare-spawn Actor carries BOTH a boolean flag (what `game.js`'s `attack()` branches on internally —
`monster.isLegendary` / `monster.isSuperElite` / `monster.isTitan`, §2/§3 below) AND a single plain
string `monster.tier` (`'legendary' | 'superElite' | 'titan'`, absent/`undefined` on a normal kill)
set alongside it for exactly this reason — so an external consumer like Author-Economy's Merit-award
hook can do one `monster.tier === 'superElite'` check instead of three separate boolean lookups.
Both are set in the same two places: `actors.js`'s `spawnCreature` (Legendary/SE) and `titans.js`'s
`spawnTitanActor` (Titan) — see the code blocks in §2/§3. Economy's hook belongs in `game.js`
`attack()`'s shared win branch (the same `if (monster.isBoss) {...} else if (monster.isTitan) {...}
else {...}` block where xp/stones/drop are already computed per monster kind) — for Titan
specifically, that branch only runs once, on the encounter where `titanDepleted` is true, so a
Merit-award check there fires exactly once per Titan (not per intermediate chase-hit), matching
Economy's "+20 Merit, one-time, after the sequence resolves" spec.

---

## 1. Item rarities + set rules

### 1.1 Rarity ladder — two new tiers

`js/items.js`'s `RARITIES` table today: `common → uncommon → rare → epic → legendary → mythic`,
with `epic/legendary/mythic` all at `weight: 0` (never randomly rolled — only reached via an
explicit `generateItem(slot, level, rarityKey, rng)` call, today used only by `boss.js` and
`quests.js`'s named-item path). Add two more explicit-only tiers, same pattern:

```js
// js/items.js — RARITIES, insert after 'legendary', before 'mythic'
superElite: { key: 'superElite', label: 'Super Elite', mult: 3.25, attributes: 5, weight: 0, maxDurability: 110, repairPerPoint: 6, sellMult: 130 },
titan:      { key: 'titan',      label: 'Titan',        mult: 3.10, attributes: 4, weight: 0, maxDurability: 110, repairPerPoint: 6, sellMult: 140 },
```

`superElite` sits between `legendary` (2.9) and `mythic` (3.6) on the raw power curve — Super Elite
monsters are strictly rarer than Legendary monsters (1/area vs. multiple/area), so their loot
should read as a cut above. **`titan` is deliberately NOT slotted into the linear power ladder** —
its defining trait is the guaranteed Qi-regen line (§1.4), not raw stat supremacy; flag for
Architect-Cull/`ui.js` rarity-color CSS to give `titan` its own distinct color/icon rather than
implying "better than Mythic."

`RARITIES`/`TEMPLATES` are generic maps keyed by rarity string — `generateItem`, `templateFor`,
`reforgeItem`, `upgradeItem`, `sellValue`, `repairCost` all already iterate over these tables with
no hard-coded rarity list. **Adding `TEMPLATES.weapon.superElite` / `.robe.superElite` /
`.weapon.titan` / `.robe.titan` (below) means every one of those functions works for the new tiers
with zero code changes** — this is the reason the whole design reuses `generateItem(slot, level,
'superElite'|'titan', rng)` directly instead of writing new mint functions.

### 1.2 Legendary items ALWAYS Sets

Today `TEMPLATES.weapon.legendary` has 3 named templates but only **1** carries a `setId`
(`'Nine Calamities Sabre' → nineHeavens`); `TEMPLATES.robe.legendary` has 2 named templates, 1 set.
`'Sundering Heavens Spear'`, `'Immortal-Slaying Jian'`, and `'Dragon-Scale Imperial Robe'` are
currently set-less — that breaks the author's "Legendary items ALWAYS Sets" rule the moment a
Legendary monster (§2) can drop one of them. Fix: give every legendary template a `setId`, adding
one new robe so the 3 weapons and 3 robes pair 1:1.

```js
// js/items.js — TEMPLATES.weapon.legendary: add setId to the two that lack one
{ name: 'Sundering Heavens Spear', setId: 'sunderingHeavens', attrs: [...unchanged...] },
{ name: 'Immortal-Slaying Jian',   setId: 'immortalSlaying',  attrs: [...unchanged...] },

// js/items.js — TEMPLATES.robe.legendary: add setId + one new member
{ name: 'Dragon-Scale Imperial Robe', setId: 'sunderingHeavens', attrs: [...unchanged...] },
{ name: 'Voidfang Vestment', setId: 'immortalSlaying',
  attrs: [['defense', 1, 3], ['armor', 1, 2], ['hp', 2, 5], ['attack', 1, 1], ['damage', 1, 1]] }, // NEW template
```

```js
// js/sets.js — SETS: two new legendary-tier entries alongside the existing nineHeavens
sunderingHeavens: {
  id: 'sunderingHeavens', name: 'Sundering Heavens Regalia', tier: 'legendary', pieces: 2,
  members: ['Sundering Heavens Spear', 'Dragon-Scale Imperial Robe'],
  bonusAt: { 2: { attack: 10, damage: 10, hp: 24 } },
  flavor: 'The heavens do not forgive what this pairing has already sundered.',
},
immortalSlaying: {
  id: 'immortalSlaying', name: 'Immortal-Slaying Communion', tier: 'legendary', pieces: 2,
  members: ['Immortal-Slaying Jian', 'Voidfang Vestment'],
  bonusAt: { 2: { damage: 12, defense: 8, armor: 6 } },
  flavor: 'Even the deathless learn to bleed before this blade and its ward.',
},
```

**NAMED_ITEMS exemption (flag for lead/critic adjudication):** `items.js`'s `NAMED_ITEMS` (the
hand-authored quest capstones — `heavenSeverer`, `stormsovereignRaiment`, both Legendary) are
scripted narrative rewards minted via `mintNamedItem`, not part of the random Legendary-monster
loot economy this proposal is retuning. **Proposing they stay exempt from "always Sets"** — they're
one-of-a-kind saga payoffs, not the procedural Legendary drops the rule is aimed at. If the author
wants them folded into a set too, that's a one-line follow-up (give `heavenSeverer` a `setId` and
author a matching robe) — flagging rather than silently deciding.

### 1.3 Super Elite items ALWAYS Sets

Brand-new tier, so no existing-template cleanup needed — author it set-complete from the start.
Two SE-tier weapon/robe pairs (matches Legendary's now-3-set precedent, scaled down since SE drops
are rarer):

```js
// js/items.js — TEMPLATES.weapon, add key 'superElite'
superElite: [
  { name: 'Voidsovereign Blade', setId: 'voidSovereign',
    attrs: [['damage', 2, 4], ['attack', 2, 3], ['defense', 1, 2], ['armor', 1, 2], ['hp', 3, 5]] },
  { name: 'Thousand-Thunder Spear', setId: 'thousandThunder',
    attrs: [['attack', 2, 4], ['damage', 2, 3], ['hp', 3, 5], ['defense', 1, 2], ['armor', 1, 2]] },
],
// js/items.js — TEMPLATES.robe, add key 'superElite'
superElite: [
  { name: 'Voidsovereign Mantle', setId: 'voidSovereign',
    attrs: [['defense', 2, 4], ['armor', 2, 3], ['hp', 3, 6], ['attack', 1, 2], ['damage', 1, 2]] },
  { name: 'Thousand-Thunder Raiment', setId: 'thousandThunder',
    attrs: [['hp', 4, 7], ['defense', 2, 3], ['armor', 1, 2], ['attack', 1, 2], ['damage', 1, 2]] },
],
```

```js
// js/sets.js — SETS, two new superElite-tier entries
voidSovereign: {
  id: 'voidSovereign', name: 'Void Sovereign Dominion', tier: 'superElite', pieces: 2,
  members: ['Voidsovereign Blade', 'Voidsovereign Mantle'],
  bonusAt: { 2: { attack: 16, damage: 16, hp: 40, armor: 8 } },
  flavor: 'The void does not conquer — it simply outlasts.',
},
thousandThunder: {
  id: 'thousandThunder', name: 'Thousand-Thunder Communion', tier: 'superElite', pieces: 2,
  members: ['Thousand-Thunder Spear', 'Thousand-Thunder Raiment'],
  bonusAt: { 2: { attack: 16, defense: 16, damage: 10, hp: 36 } },
  flavor: 'A thousand thunders answered when the two were finally reunited.',
},
```

`sets.js`'s `setBonuses(player)` is the one add-line into `progression.js`'s `effectiveStats`
pipeline (already the 6th flat source, after gear/cards/meridians/sockets). **Zero changes needed
there** — it's generic over `SETS`/`item.setId`, so the two new sets plug in for free.

### 1.4 Titan items — NOT Sets, ALWAYS some Qi regen

Titan gear never carries `setId` (so `equippedSetCount`/`setBonuses` in `sets.js` — which only act
on items with a `setId` — automatically ignore Titan pieces; **no code change needed to enforce
"not a set"**, it falls out of simply never writing that field).

```js
// js/items.js — TEMPLATES.weapon, add key 'titan'. attrs[0] is ALWAYS 'qiRegen' so it's
// guaranteed to roll (generateItem slices template.attrs.slice(0, rarity.attributes), and
// RARITIES.titan.attributes = 4 ≥ 1).
titan: [
  { name: 'Titanheart Warhammer',
    attrs: [['qiRegen', 1, 2], ['damage', 2, 4], ['attack', 1, 3], ['armor', 1, 2], ['hp', 3, 5]] },
  { name: 'Colossus-Rending Axe',
    attrs: [['qiRegen', 1, 2], ['attack', 2, 4], ['damage', 1, 3], ['defense', 1, 2], ['hp', 3, 5]] },
],
// js/items.js — TEMPLATES.robe, add key 'titan'
titan: [
  { name: 'Titanhide Mantle',
    attrs: [['qiRegen', 1, 2], ['armor', 2, 4], ['hp', 4, 7], ['defense', 1, 2], ['attack', 1, 2]] },
  { name: 'Colossus-Bound Wrap',
    attrs: [['qiRegen', 1, 2], ['defense', 2, 4], ['hp', 4, 7], ['armor', 1, 2], ['damage', 1, 2]] },
],
```

`qiRegen` is a brand-new stat key that lives only inside `item.bonuses` — it is **not** one of
`effectiveStats`' combat stats (`attack/defense/damage/armor/maxHp`) and must not be added there;
Qi regen is a world-clock rate, not a combat stat, so it gets its own tiny aggregator, parallel to
(not inside) `effectiveStats`:

```js
// js/items.js — new pure helper, same shape/spot as sockets.js's socketBonuses /
// sets.js's setBonuses (broken gear grants nothing, same rule)
export function gearQiRegenBonus(player) {
  let bonus = 0;
  for (const item of Object.values(player.equipment ?? {})) {
    if (item && item.durability > 0 && item.bonuses?.qiRegen) bonus += item.bonuses.qiRegen;
  }
  return bonus;
}
```

```js
// js/game.js — tickQi touch point (the ONLY consumer; combat.js is untouched —
// Qi regen was never part of combat resolution to begin with)
import { gearQiRegenBonus } from './items.js';

export function tickQi(state, now = Date.now()) {
  const cap = maxQi(state.player);
  if (state.qi >= cap) { state.lastQiTick = now; return; }
  const perTick = 1 + gearQiRegenBonus(state.player); // Titan gear: extra Qi per regen tick
  const ticks = Math.floor((now - state.lastQiTick) / QI_REGEN_MS);
  const gained = ticks * perTick;
  if (gained > 0) {
    state.qi = Math.min(cap, state.qi + gained);
    state.lastQiTick += ticks * QI_REGEN_MS; // whole ticks consumed, same precision pattern as tickStones
  }
}
```

**Sockets:** `generateItem` already calls `socketCountFor(rarity.key)` for *any* rarity key, so
`superElite`/`titan` gear gets **0 sockets** unless added to `sockets.js`'s `SOCKET_COUNTS` table.
Ruling (this is my call per Architect-Cull's handoff, §"Cross-talk resolutions"): **KEEP
sockets.js**, and extend it —

```js
// js/sockets.js — SOCKET_COUNTS, one-line addition
const SOCKET_COUNTS = { rare: 1, epic: 2, legendary: 2, superElite: 3, titan: 2, mythic: 3 };
```

No other `sockets.js`/`progression.js` change needed — `socketBonuses` is already generic.

---

## 2. Spawns — Legendary (multiple/area), Super Elite (exactly 1/area)

**New module: `js/rarespawns.js`** (Systems, single-owner) — owns the Legendary/Super-Elite rarity
economy for *ordinary zone creatures*. Deliberate design choice: Legendary and Super Elite
monsters are **the same native creature** (same `typeId`, e.g. `wolfSpirit`), just stat-boosted and
flagged — **not** a new creature entity. That means `cards.js` (Spirit Card drops key off
`monster.typeId`), the Beast Codex (`ensureSeen`/`markSeen` in `game.js`, keyed off `typeId`), and
`Quests.onFace/onKill` all keep working with **zero changes** — a Legendary Wolf Spirit still
counts as a Wolf Spirit sighting. (DEFER: give Legendary/SE kills their own Codex row if the author
wants that distinction later — flagged, not built now, to avoid Codex bloat before it's asked for.)

```js
// js/rarespawns.js
export const LEGENDARY_CHANCE = 0.05;          // independent roll PER monster slot → naturally
                                                // yields "multiple per area" with no extra bookkeeping
export const LEGENDARY_STAT_MULT = 1.6;
export const LEGENDARY_DROP_CHANCE = 0.25;     // author directive: 25%

export const SUPER_ELITE_SPAWN_CHANCE = 0.015; // rolled only when the zone has none alive (below)
export const SUPER_ELITE_STAT_MULT = 2.4;
export const SUPER_ELITE_DROP_CHANCE = 0.5;    // author directive: 50%

export function rollLegendary(rng) { return rng() < LEGENDARY_CHANCE; }
export function anySuperEliteAlive(tiles) { return tiles.some((t) => t.monsters.some((m) => m.isSuperElite)); }
export function maybeRollSuperElite(rng) { return rng() < SUPER_ELITE_SPAWN_CHANCE; }
```

`js/actors.js`'s `spawnCreature` gets an additive `opts` bag — keeps "all tuning goes through
`spawnCreature`" (PROJECT.md's hard constraint) intact instead of hand-rolling a stat multiplier
somewhere else:

```js
// js/actors.js — spawnCreature signature extension (3rd positional arg unchanged callers untouched)
export function spawnCreature(typeId, level, rng, opts = {}) {
  const t = CREATURE_TYPES[typeId];
  const lv = level ?? t.levels[Math.floor(rng() * t.levels.length)];
  const mult = opts.statMult ?? 1;
  const scale = (stat) => Math.round((t.base[stat] + t.perLevel[stat] * (lv - 1)) * mult);
  const actor = createActor({
    id: `${typeId}-${++creatureCounter}`, name: t.name, level: lv,
    attack: scale('attack'), defense: scale('defense'), damage: scale('damage'), armor: scale('armor'), maxHp: scale('maxHp'),
  });
  actor.typeId = typeId;
  actor.xpReward = Math.round(t.xp * (1 + 0.35 * (lv - t.levels[0])) * mult);
  actor.stoneReward = Math.round(t.stones * (1 + 0.35 * (lv - t.levels[0])) * mult);
  if (opts.legendary) { actor.isLegendary = true; actor.tier = 'legendary'; actor.name = `Legendary ${actor.name}`; }
  if (opts.superElite) { actor.isSuperElite = true; actor.tier = 'superElite'; actor.name = `Super Elite ${actor.name}`; }
  return actor;
}
```

`js/map.js` wiring — `populateTile`/`createZone`/`maybeRespawn` get the minimal additive change
needed to enforce "exactly 1 SE alive per zone" (a zone-wide predicate, cheap to scan on a 10×10
grid) while leaving Legendary as an uncapped per-slot roll:

```js
// js/map.js
import { rollLegendary, LEGENDARY_STAT_MULT, anySuperEliteAlive, maybeRollSuperElite, SUPER_ELITE_STAT_MULT } from './rarespawns.js';
import { anyTitanAlive, maybeNaturalTitanSpawn } from './titans.js'; // §3

export function pickType(zone, band, rng) { /* unchanged body — just add `export` */ }

function populateTile(zone, tile, rng, hasSE, hasTitan) {
  const count = tile.isStart ? 0 : Math.floor(rng() * 4);
  tile.monsters = [];
  for (let i = 0; i < count; i++) {
    const typeId = pickType(zone, tile.band, rng);
    const legendary = !tile.isStart && rollLegendary(rng);
    tile.monsters.push(spawnCreature(typeId, null, rng, legendary ? { legendary: true, statMult: LEGENDARY_STAT_MULT } : undefined));
  }
  if (!tile.isStart && !hasSE && maybeRollSuperElite(rng)) {
    tile.monsters.push(spawnCreature(pickType(zone, tile.band, rng), null, rng, { superElite: true, statMult: SUPER_ELITE_STAT_MULT }));
  }
  if (!tile.isStart && !hasTitan) {
    const titan = maybeNaturalTitanSpawn(zone.id, rng); // §3 — its own rare, capped roll
    if (titan) tile.monsters.push(titan);
  }
  tile.clearedAt = null;
}

export function createZone(zoneId, rng) {
  const zone = ZONES[zoneId];
  const tiles = [];
  let hasSE = false, hasTitan = false;
  for (let y = 0; y < zone.size; y++) {
    for (let x = 0; x < zone.size; x++) {
      const tile = { x, y, band: dangerBand(zone, x, y), isStart: x === zone.start.x && y === zone.start.y, monsters: [], clearedAt: null };
      populateTile(zone, tile, rng, hasSE, hasTitan);
      hasSE = hasSE || tile.monsters.some((m) => m.isSuperElite);
      hasTitan = hasTitan || tile.monsters.some((m) => m.isTitan);
      tiles.push(tile);
    }
  }
  return makeMapObject(zoneId, tiles);
}

export function maybeRespawn(map, tile, rng, now = Date.now()) {
  if (tile.monsters.length === 0 && tile.clearedAt !== null && now - tile.clearedAt >= RESPAWN_MS) {
    const zone = ZONES[map.zoneId];
    populateTile(zone, tile, rng, anySuperEliteAlive(map.tiles), anyTitanAlive(map.tiles));
  }
}
```

**Persistence:** `isLegendary`/`isSuperElite`/`isTitan` are plain fields on the Actor objects that
already live inside `tile.monsters[]` → already part of `map.tiles` → already what `saveGame`
serializes per zone (`zones[id] = map.tiles`, `js/save.js` line 15). **No `save.js` touch.**

---

## 3. Titan move-and-chase — the ~10-hit mechanic, and how `combat.js` stays pure

### 3.1 The purity shape (verify against this exact call sequence)

`combat.js`'s `resolveCombat(attacker, defender, seed)` already runs a **full fight to conclusion**
in one call (up to `MAX_TURNS = 20` rounds; returns `outcome: 'win'|'loss'|'draw'` + the full
`turns[]` log) — there is no "single swing" primitive today, and this design does not add one.
Instead:

- **A Titan's combat stats (`attack/defense/damage/armor`) are fixed, hand-authored per zone** —
  exactly like `boss.js`'s calamities — and never change across the encounter sequence.
- **A Titan's HP is a persistent WORLD value** (`titanHp`), stored as a plain field on the Titan's
  Actor object, deliberately set large enough that **one 20-round encounter cannot deplete it** —
  tuned via `tools/balance.mjs` so an average encounter chips off roughly 1/10th.
- **Every `attack()` against a Titan is exactly one ordinary `resolveCombat(playerActor,
  titanActor, seed)` call** — same function, same signature, same return shape as any other
  monster fight. The only Titan-specific step is in `game.js`, wrapped around that one call:
  1. Before the call: sync the transient `hp` field `combat.js` reads from the persisted value —
     `monster.hp = monster.titanHp`.
  2. Call `resolveCombat(actor, monster, seed)` — **unchanged, untouched, exactly like any other
     fight.**
  3. After the call: read the Titan's ending HP off the **existing** return shape —
     `result.turns[result.turns.length - 1].defenderHpAfter` — and write it back to the persisted
     value: `monster.titanHp = lastTurn.defenderHpAfter`.
  4. If `titanHp > 0`: the Titan survived this encounter (whether the encounter's own `outcome` was
     `'loss'` or `'draw'` — both imply the defender never hit 0, since `combat.js`'s loop breaks
     immediately as `'win'` the instant `dHp` reaches 0) → **relocate** it to a new random tile
     (world-state only) and return a `titanProgress` payload instead of a normal reward.
  5. If `titanHp <= 0`: the Titan is truly defeated this encounter → guaranteed Titan-item drop,
     `removeMonster` as usual.

  **`combat.js` is never told a Titan exists.** It receives an Actor with some `hp`/`stats` and
  returns win/loss/draw exactly as it always has. Movement, the world-HP pool, and the
  hit/encounter progress are 100% game-layer (`game.js` + the new `js/titans.js`).

### 3.2 `js/titans.js` (new module — world-state layer, Systems)

```js
// js/titans.js — Titan world-state (author directive: solo move-and-chase). One
// hand-authored Titan per zone, same authoring discipline as boss.js's calamities:
// fixed stats, headless-tuned via tools/balance.mjs. Titan HP is NOT the transient
// combat.js `hp` field — it's a persisted world pool (`titanHp`) that depletes
// ACROSS repeated resolveCombat calls rather than resetting each time.
import { createActor } from './actors.js';

export const TITANS = {
  azuremist:   { zoneId: 'azuremist',   name: 'Ashen Colossus',     level: 6,  stats: { attack: 18,  defense: 22, damage: 10, armor: 14 }, worldMaxHp: 900,   dropLevel: 6,  reward: { xp: 350,   stones: 220 } },
  cindervein:  { zoneId: 'cindervein',  name: 'Cinderforge Titan',  level: 16, stats: { attack: 55,  defense: 60, damage: 34, armor: 40 }, worldMaxHp: 5200,  dropLevel: 16, reward: { xp: 3800,  stones: 2200 } },
  thunderpeak: { zoneId: 'thunderpeak', name: 'Stormwrought Titan', level: 26, stats: { attack: 100, defense: 95, damage: 62, armor: 58 }, worldMaxHp: 14000, dropLevel: 26, reward: { xp: 13000, stones: 5800 } },
};
// worldMaxHp is authored so an average encounter (per tools/balance.mjs sim of a
// geared player at that zone's gate level) deals ~1/10th of it — empirically ~10
// encounters, not a hardcoded counter. Tune here; balance.mjs gets a new "Titan
// depletion" row (Author-Economy/Balance cross-talk).

export function anyTitanAlive(tiles) { return tiles.some((t) => t.monsters.some((m) => m.isTitan)); }

export function spawnTitanActor(zoneId) {
  const t = TITANS[zoneId];
  if (!t) return null;
  const actor = createActor({
    id: `titan-${zoneId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name: t.name, level: t.level,
    attack: t.stats.attack, defense: t.stats.defense, damage: t.stats.damage, armor: t.stats.armor,
    maxHp: t.worldMaxHp,
  });
  actor.typeId = `titan_${zoneId}`;
  actor.isTitan = true;
  actor.tier = 'titan'; // external consumers (e.g. Economy's Merit hook) check this one field
  actor.titanHp = t.worldMaxHp;   // persisted, depletes across encounters — never resets
  actor.titanMaxHp = t.worldMaxHp;
  actor.dropLevel = t.dropLevel;
  actor.xpReward = t.reward.xp;   // paid out once, on the depleting encounter
  actor.stoneReward = t.reward.stones;
  return actor;
}

// Place (or relocate) onto a random non-start tile, excluding its current cell —
// "moves to a DIFFERENT cell" is enforced here, not left to chance.
export function placeTitanRandomly(map, actor, rng, excludeXY) {
  const pool = map.tiles.filter((t) => !t.isStart && !(excludeXY && t.x === excludeXY.x && t.y === excludeXY.y));
  const tiles = pool.length ? pool : map.tiles.filter((t) => !t.isStart);
  const tile = tiles[Math.floor(rng() * tiles.length)];
  tile.monsters.push(actor);
  tile.clearedAt = null;
  return { x: tile.x, y: tile.y };
}

export function relocateTitan(map, tile, actor, rng) {
  tile.monsters = tile.monsters.filter((m) => m.id !== actor.id);
  if (tile.monsters.length === 0) tile.clearedAt = null; // never "cleared" mid-chase — it's still out there
  return placeTitanRandomly(map, actor, rng, { x: tile.x, y: tile.y });
}

// Natural (non-debug) manifestation: rare, capped at 1 alive/zone (map.js checks
// anyTitanAlive before calling). Debug spawns (js/debug.js → game.js) bypass this
// entirely per the author's "need to spawn MULTIPLE for testing" ask.
export const NATURAL_SPAWN_CHANCE = 0.004;
export function maybeNaturalTitanSpawn(zoneId, rng) {
  if (!TITANS[zoneId] || rng() >= NATURAL_SPAWN_CHANCE) return null;
  return spawnTitanActor(zoneId);
}
```

### 3.3 `js/game.js`'s `attack()` — exact integration

```js
// js/game.js — attack(), restructured. Everything NOT about Titans is byte-for-byte
// the existing logic; only the additions are new.
import { anyTitanAlive, spawnTitanActor, placeTitanRandomly, relocateTitan, maybeNaturalTitanSpawn } from './titans.js';
import { isForceDropsOn } from './debug.js';                       // §4
import { LEGENDARY_DROP_CHANCE, SUPER_ELITE_DROP_CHANCE } from './rarespawns.js'; // §2

export function attack(state, monsterId) {
  const tile = currentTile(state);
  const monster = tile.monsters.find((m) => m.id === monsterId);
  if (!monster) return null;
  if (!canAttack(state)) return null;

  const actor = playerCombatActor(state.player);
  applyPillBuffs(actor, state.player);

  // TITAN PURITY: resolveCombat is called exactly once, exactly like any other
  // fight. The only wrinkle is which `hp` we hand it — a Titan's stats never
  // change, but its hp is the persisted world value, synced right before the call.
  if (monster.isTitan) monster.hp = monster.titanHp;
  const result = resolveCombat(actor, monster, randomSeed());
  state.qi -= result.staminaSpent;

  const p = state.player;
  degradeEquipment(p);
  ensureSeen(state, monster.typeId);
  Quests.onFace(state.quests, monster.typeId);

  if (monster.isTitan) {
    const last = result.turns[result.turns.length - 1];
    monster.titanHp = last.defenderHpAfter; // world HP now reflects this encounter's chip damage
  }
  const titanDepleted = monster.isTitan && monster.titanHp <= 0;

  if (result.outcome === 'win' || titanDepleted) {
    const gb = guildBuffs(p);
    let xp, stones, drop, cardId;
    if (monster.isBoss) {
      /* — unchanged boss branch — */
    } else if (monster.isTitan) {
      xp = Math.round(monster.xpReward * (1 + gb.xpPct));
      stones = Math.round(monster.stoneReward * (1 + gb.stonePct));
      // Author directive: Titan drop is 100% — the ~10-encounter depletion IS
      // the gate, no additional roll (the debug force-drops toggle is a no-op here).
      drop = generateItem(state.worldRng() < 0.5 ? 'weapon' : 'robe', monster.dropLevel, 'titan', state.worldRng);
      cardId = null; // Titans are a world-hunt encounter, not a bestiary/card creature — open Q, flagged below
    } else {
      const scaledXp = scaleXp(monster.xpReward, p.level, monster.level);
      xp = Math.round(scaledXp * (1 + gb.xpPct));
      stones = Math.round(monster.stoneReward * (1 + gb.stonePct));
      const force = isForceDropsOn(); // §4 — debug toggle forces ALL of these to 100%
      if (monster.isSuperElite) {
        drop = (force || state.worldRng() < SUPER_ELITE_DROP_CHANCE)
          ? generateItem(state.worldRng() < 0.5 ? 'weapon' : 'robe', monster.level, 'superElite', state.worldRng) : null;
      } else if (monster.isLegendary) {
        drop = (force || state.worldRng() < LEGENDARY_DROP_CHANCE)
          ? generateItem(state.worldRng() < 0.5 ? 'weapon' : 'robe', monster.level, 'legendary', state.worldRng) : null;
      } else {
        drop = rollDrop(monster.level, state.worldRng, { forceDrop: force }); // §4 — rollDrop gets one new opts param
      }
      cardId = rollCardDrop(monster.typeId, state.worldRng);
    }
    /* — unchanged from here: eventReward scaling, p.spiritStones += stones, trackKill,
       Quests.onKill, removeMonster(tile, monster.id), inventory push w/ pack-full
       handling, cardDrop, result.rewards/result.bossKill, addLog, grantXp — */
  } else if (result.outcome === 'loss') {
    if (monster.isTitan) {
      /* — existing death-penalty block (stonesLost/xpLost/result.penalty/fightsLost),
         unchanged — but ALSO relocate: attacker always swings first each round in
         combat.js, so the titan took chip damage even in a fight the player lost. */
      const pos = relocateTitan(state.map, tile, monster, state.worldRng);
      result.titanProgress = { remainingHp: monster.titanHp, maxHp: monster.titanMaxHp, movedTo: pos, depleted: false };
      addLog(state, `${monster.name} staggers but flees to (${pos.x}, ${pos.y})!`);
    } else {
      /* — existing loss branch, unchanged — */
    }
  } else {
    // draw
    if (monster.isTitan) {
      const pos = relocateTitan(state.map, tile, monster, state.worldRng);
      result.titanProgress = { remainingHp: monster.titanHp, maxHp: monster.titanMaxHp, movedTo: pos, depleted: false };
      addLog(state, `${monster.name} shrugs off the exchange and bounds to (${pos.x}, ${pos.y})! (${Math.round(100 * monster.titanHp / monster.titanMaxHp)}% remaining)`);
      /* — existing fightsDrawn counter, unchanged — */
    } else {
      /* — existing draw branch, unchanged — */
    }
  }

  result.monster = monster;
  saveGame(state);
  return result;
}
```

**Open question flagged for Author-Progression/cards.js:** should a Titan kill also award a Spirit
Card? Proposing **no** (Titans are a world-hunt encounter, not a bestiary creature — `typeId` is
synthetic, `titan_<zoneId>`, not a real `CREATURE_TYPES` key, so `rollCardDrop`/`ensureSeen` would
need a real card entry to make sense of it). If the author wants a "Titan Spirit Card" line, that's
a `cards.js` addition naming the synthetic `typeId`s — flagging, not building, since it's outside
combat/world scope.

**Persistence:** `titanHp`/`titanMaxHp`/`dropLevel`/`isTitan` are plain fields on the Titan Actor,
which lives in `tile.monsters[]` exactly like any other monster — **no `save.js` touch.** Moving
the Titan is literally removing it from one tile's `monsters` array and pushing it into another's —
both arrays are inside the same already-persisted `map.tiles`.

---

## 4. Drop rates + debug force-100% toggle

| Source | Rate | Where enforced |
|---|---|---|
| Normal creature | 22% (unchanged `DROP_CHANCE`) | `items.js` `rollDrop` |
| Legendary | **25%** | `game.js` `attack()`, using `rarespawns.js`'s `LEGENDARY_DROP_CHANCE` |
| Super Elite | **50%** | same, `SUPER_ELITE_DROP_CHANCE` |
| Titan | **100%** (after the depletion sequence) | `game.js` `attack()`, unconditional `generateItem(...,'titan',...)` |

`rollDrop` gets one additive `opts` param so the debug toggle (§ below) can force it without a
separate code path:

```js
// js/items.js
export function rollDrop(creatureLevel, rng, opts = {}) {
  if (!opts.forceDrop && rng() >= DROP_CHANCE) return null;
  if (rng() < GEM_DROP_CHANCE) return generateGem(creatureLevel, rng);
  const slot = rng() < 0.5 ? 'weapon' : 'robe';
  return generateItem(slot, creatureLevel, null, rng);
}
```

Backward-compatible — every existing call site (`game.js`'s normal-kill branch is the only one)
keeps working unchanged if `opts` is omitted.

**New module: `js/debug.js`** owns the force-drops flag as a **pure, Node-safe reader** (guards
`typeof localStorage === 'undefined'`) so `game.js` can import it without dragging any DOM
dependency into the engine layer — mirrors `ui.js`'s existing `isInstant()`/`INSTANT_KEY` pattern
for the instant-combat preference (a display/testing preference, own localStorage key, not in the
save schema, per the hard constraint on where preferences live):

```js
// js/debug.js
const FORCE_DROPS_KEY = 'fallen-immortal-dev-force-drops';

export function isDevMode() {
  if (typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).get('dev') === '1';
}
export function isForceDropsOn() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(FORCE_DROPS_KEY) === '1';
}
function setForceDrops(on) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(FORCE_DROPS_KEY, on ? '1' : '0');
}
```

**Ruling note (lead-approved, overriding PR #13's "no always-on debug" for this build phase):**
this reintroduces dev tooling after `js/debug.js`/god-mode were deliberately stripped in PR #13.
Per the author's explicit ask + the lead's ruling, this is **allowed for the current build wave**,
still `?dev=1`-gated so it never renders for a normal player, and should be revisited (possibly
re-stripped) at the next "TESTING scaffolding" pass before a real 1.0 cut.

---

## 5. Debug spawn buttons above the map

`js/debug.js` (continued) injects a bar as the **first child of `#map-panel`**, DOM-only, own tiny
stylesheet, no `index.html`/`ui.js` edits (matches the self-contained-module constraint — this is
additive JS-injected DOM, the same pattern `sockets.js`'s `initSockets` already uses for its own
button+overlay):

```js
// js/debug.js (continued)
export function initDebugBar(state, actions, onChange) {
  if (!isDevMode()) return;
  const mapPanel = document.getElementById('map-panel');
  if (!mapPanel || document.getElementById('debug-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'debug-bar';
  const mkBtn = (label, fn) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'debug-btn'; b.textContent = label;
    b.addEventListener('click', () => { fn(state); onChange(); });
    return b;
  };
  bar.append(
    mkBtn('+ Legendary', actions.spawnLegendary),
    mkBtn('+ Super Elite', actions.spawnSuperElite),
    mkBtn('+ Titan', actions.spawnTitan),
  );

  const toggle = document.createElement('label');
  toggle.className = 'debug-toggle';
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.checked = isForceDropsOn();
  chk.addEventListener('change', () => setForceDrops(chk.checked));
  toggle.append(chk, document.createTextNode(' Force 100% drops'));
  bar.appendChild(toggle);

  mapPanel.insertBefore(bar, mapPanel.firstChild); // renders ABOVE #map-grid
}
```

`js/game.js` gets three thin debug-only action wrappers (same layering as every other game.js
action: pure logic lives in `rarespawns.js`/`titans.js`, `game.js` just logs+saves), each pushing
straight onto the **player's current tile** (so a tester can attack immediately) and **bypassing**
the natural 1-per-zone caps entirely — the author explicitly needs to spawn multiples for testing:

```js
// js/game.js
export function debugSpawnLegendary(state) {
  const zone = ZONES[state.zoneId];
  const tile = currentTile(state);
  const actor = spawnCreature(pickType(zone, tile.band, state.worldRng), null, state.worldRng, { legendary: true, statMult: LEGENDARY_STAT_MULT });
  tile.monsters.push(actor);
  addLog(state, `[debug] Spawned Legendary ${actor.name}.`);
  saveGame(state);
  return actor;
}
export function debugSpawnSuperElite(state) { /* identical, superElite:true / SUPER_ELITE_STAT_MULT — caps ignored on purpose */ }
export function debugSpawnTitan(state) {
  const actor = spawnTitanActor(state.zoneId);
  if (!actor) { addLog(state, '[debug] No Titan defined for this zone.'); return null; }
  const pos = placeTitanRandomly(state.map, actor, state.worldRng);
  addLog(state, `[debug] Spawned Titan ${actor.name} at (${pos.x}, ${pos.y}).`);
  saveGame(state);
  return actor;
}
```

`main.js` wiring (two new lines in the init sequence):

```js
import { initDebugBar } from './debug.js';
import { debugSpawnLegendary, debugSpawnSuperElite, debugSpawnTitan } from './game.js';
...
initDebugBar(state, { spawnLegendary: debugSpawnLegendary, spawnSuperElite: debugSpawnSuperElite, spawnTitan: debugSpawnTitan }, renderAll);
```

---

## 6. Combat UI — side panel + 1-9 tile-slot attacks

### 6.1 Multi-monster tile-slot model

A tile's monsters are already `tile.monsters[]`, an ordered array (0-3 today from `populateTile`;
up to ~5 once a Legendary/SE/Titan roll stacks onto a normally-populated tile — still comfortably
inside 1-9, no change needed to the population cap). **Slot N = `tile.monsters[N-1]`,
1-indexed to match the visible digit** — this is already how `js/ui.js`'s `renderTilePanel` (§7.1
below) iterates the array, so "slot" is just "current index in the array the side panel already
renders," not a new data structure.

```js
// js/ui.js — renderTilePanel's monster loop: add a stable slot-number badge
tile.monsters.forEach((m, i) => {
  const row = document.createElement('div');
  row.className = 'monster-row';
  if (m.isBoss) row.classList.add('boss-row');
  const slotTag = document.createElement('span');
  slotTag.className = 'slot-num';
  slotTag.textContent = `${i + 1}`;
  // ...append slotTag before the existing label/inspect/attack, rest unchanged...
});
```

### 6.2 Combat side panel (coordinated with Architect-Cull — they own the DOM move)

Today `#tile-info` (with `#monster-list`) already sits **beside** `#map-grid` inside
`#map-panel`/`<section data-tab="map">` — i.e., the pre-fight monster list is already "the side of
the map." The **live fight** (`#combat-panel` → `#combat-log`/`#combat-outcome`/`btn-skip`/
`btn-close-combat`) is the piece that currently lives in its own full-view tab
(`<section id="view-combat" data-tab="combat">`), auto-activated by `main.js`'s
`runPlayback()` (`setActiveTab('combat')`).

**Per Architect-Cull's message (they own the teardown): they remove `'combat'` from
`tabs.js`'s `TABS`, delete `#view-combat` + its tab button from `index.html`, and delete the
`setActiveTab('combat')`/`btn-close-combat` calls in `main.js`.** My side of the seam: `#combat-panel`
(with its existing `combat-title`/`combat-log`/`combat-outcome`/`btn-skip`/`btn-close-combat` ids,
all unchanged) relocates to become a sibling of `#monster-list` inside `#tile-info`, so the same
column that shows "who's here, inspect, attack" also hosts the live fight the moment one starts,
then reverts to the tile listing when it closes. `js/ui.js`'s `playCombat`/`js/combatfx.js`'s
`beginFx` already look up `#combat-panel`/`#combat-log` by id (`document.getElementById`, not a
tab-relative query) — **so relocating the div's parent in `index.html` requires zero changes to
`ui.js` or `combatfx.js`.** `main.js`'s `runPlayback()` drops its `setActiveTab('combat')` call
(no tab switch — the fight now resolves inline on the Map tab); `close.onclick` in `ui.js`'s
`playCombat` (currently just `panel.classList.add('hidden')`) needs no change either.

### 6.3 1-9 attack shortcuts (resolved with Architect-Cull + lead-approved)

`js/input.js` today unconditionally binds digits 1-9 to `openNavPanel(n-1)` (click the Nth
`#nav-menu` button). Architect-Cull is dissolving the Halls nav-menu as part of the IA cull, which
frees these keys — **per their message, they remove the `openNavPanel` digit binding; I design the
replacement.** Sequencing to avoid a merge collision on the same file: Architect-Cull's removal
lands first (their commit), my rebind lands second (depends on theirs) — not simultaneous edits to
`input.js`.

```js
// js/input.js — initInput gains two new injected callbacks from main.js
import { activeTab } from './tabs.js';

export function initInput({ move, attack, getSlotMonster }) {
  // ...unchanged setup...
  document.addEventListener('keydown', (e) => {
    // ...unchanged Escape/'?'/isModalOpen/move-key handling...
    if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const slot = Number(e.key) - 1;
      const monster = activeTab() === 'map' ? getSlotMonster(slot) : null;
      if (monster) attack(monster.id);
      // else: no-op — confirmed with Architect-Cull that every one of the 17 Halls entries in
      // their cull ledger is MERGE/CUT/DEFER/KEEP-relocated, none stays a standalone
      // digit-indexed modal, so `openNavPanel` is fully gone and no else-branch is needed.
    }
  });
}
```

```js
// js/main.js — two new callbacks passed into initInput
initInput({
  move: (dx, dy) => onTileClick(state.pos.x + dx, state.pos.y + dy),
  attack: onAttack,
  getSlotMonster: (i) => currentTile(state).monsters[i] ?? null,
});
```

Also update the "?" shortcuts-help overlay text (`js/input.js`'s `buildShortcutsOverlay`, the row
built from `['1', '–', '9']`) from *"Open panels (Codex, Pavilion, Sect…)"* to *"Attack the monster
in that map slot"* — final wording, confirmed final since Architect-Cull's cull leaves no
digit-indexed panel behind for these keys to fall back to.

---

## CUT vs KEEP vs MERGE vs ADD (this doc's footprint)

- **ADD:** `js/rarespawns.js` (Legendary/SE spawn+drop economy), `js/titans.js` (Titan world-state),
  `js/debug.js` (dev bar + force-drops flag) — three new single-owner modules.
- **ADD:** `RARITIES.superElite`, `RARITIES.titan`; `TEMPLATES.{weapon,robe}.superElite`,
  `.{weapon,robe}.titan`; `sets.js` gains 4 new sets (`sunderingHeavens`, `immortalSlaying`,
  `voidSovereign`, `thousandThunder`) — real new content surface, not hidden in a one-liner, per
  Critic4's flag.
- **ADD:** `items.js` `gearQiRegenBonus`, `rollDrop`'s `opts.forceDrop` param, `actors.js`
  `spawnCreature`'s `opts` param, `map.js`'s `pickType` export — all additive/backward-compatible.
- **MERGE:** Legendary/Super-Elite monsters are the SAME creature entity as their native
  `CREATURE_TYPES` template (flagged + stat-multiplied), not new entities — keeps `cards.js`/Beast
  Codex/quests untouched.
- **CUT:** the standalone Combat tab (`view-combat`, `tabs.js`'s `'combat'` entry) — Architect-Cull
  owns the removal; combat now resolves inline in the Map tab's existing side column.
- **CUT (repurposed):** `input.js`'s digit-1-9 → nav-panel binding, replaced by digit → attack-slot-N
  (Architect-Cull removes, I add, sequenced not simultaneous).
- **KEEP:** `sockets.js` (my ruling, see below) — extended (`SOCKET_COUNTS` gains `superElite`/`titan`
  entries), not touched otherwise.
- **No save.js/VERSION changes anywhere** — everything rides existing `tile.monsters[]` /
  `item.bonuses` persistence.

---

## Cross-talk resolutions

**To Author-Economy (field-naming loop closed — also flagged independently by Critic4):** final
shape is **both** a boolean and a string tag on the same Actor, not one or the other — see the
"Monster tagging field" callout right after the save-schema note near the top of this doc.
`game.js`'s own `attack()` branches on the booleans (`monster.isLegendary`/`isSuperElite`/`isTitan`,
already wired through `map.js`/`titans.js`); your Merit hook should check the string
`monster.tier === 'legendary' | 'superElite' | 'titan'` (absent on a normal kill) — one field, no
rewrite needed on your side beyond swapping whatever placeholder you'd guessed at. Hook location:
`game.js` `attack()`'s shared win branch (§3.3's code block), same place xp/stones/drop are computed
per monster kind — for Titan, that branch only executes once, on the encounter where
`titanDepleted` is true, so your "+20 Merit, one-time, after the sequence" requirement is satisfied
automatically by hooking there (not inside `titans.js`, which never grants rewards itself).

On item-rarity/AH pricing: confirmed — Legendary/SuperElite/Titan gear all carry a plain
`item.rarity` string exactly like every other item (`'legendary'` unchanged, `'superElite'`/
`'titan'` new keys), because all three are minted through the same existing `generateItem(slot,
level, rarityKey, rng)` — no new mint path, no different item shape. `sellValue()`/`marketValue()`
keying off `item.rarity` generically should keep working with zero edits, PROVIDED neither has a
hardcoded allowlist/switch of known rarity strings anywhere (I haven't read `market.js` myself — if
it enumerates rarities explicitly rather than doing a `RARITIES[item.rarity]`-style generic lookup,
that's one line to add `superElite`/`titan` to, worth a quick check on your end). The
`sellMult: 130/140` values I set for the two new rarities in `items.js` are provisional — yours to
retune. Drop-rate *mechanics* (25/50/100%, force-toggle) are specified above; if premium currency
ever becomes a direct loot drop (as opposed to the flat Merit-on-kill award), that roll belongs in
your doc, feeding the same `attack()` win branch alongside the item drop.

**To Architect-Cull:** accepted your teardown split (§6.2/6.3 above) — you remove
`view-combat`/`'combat'` tab + the `openNavPanel` digit binding; I own what the relocated
`#combat-panel` renders into and the digit → attack-slot rebind, sequenced after yours lands. On
sockets.js: my ruling is **KEEP** (see §1.4) — it's an orthogonal per-item flat-stat system that
costs one line (`SOCKET_COUNTS`) to extend to the two new rarities; if you're also cutting
`cards.js`, that's two flat `effectiveStats` sources changing in the same wave — let's have one
shared `tools/balance.mjs` re-tune pass after both land, not two.

**To the lead/Critic4:** the Titan purity call shape is in §3.1/3.3 verbatim — `resolveCombat` is
called once per `attack()`, unmodified signature, unmodified return contract; the only Titan
awareness lives in `game.js` reading `result.turns[last].defenderHpAfter` back into
`monster.titanHp` and deciding relocate-vs-drop. `combat.js` is not edited anywhere in this
document. Sets grow (4 new sets, 2 new rarity tiers) rather than shrink, per your ruling #4 — named
explicitly in the ADD ledger above, not buried.
