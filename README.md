# Fallen Immortal

A browser-based, offline-first, stat-math dungeon-crawler RPG with xianxia flavor — FallenSword-inspired, built with a designed path to (fake, then real) multiplayer. See [GDD_Staged_Roadmap.md](GDD_Staged_Roadmap.md) for the full design document and staged roadmap.

**Current status: Stage 2 (in progress)** — building on the Stage 1 MVP. Two connected 10×10 zones (Azuremist Vale → Cindervein Gorge) linked by a stage-gated portal, the cultivation ladder extending across realms (Qi Condensation → Foundation Establishment), six creature types, a 9-quest chain bridging both zones, deterministic stat-math combat (instant or turn-by-turn), wall-clock Qi regen (including offline), localStorage save/load with versioned migration, stat-point allocation, gear with a full rarity ladder (unique named types per tier)/degradation/repair, and bestiary kill tracking. Still to come this stage: techniques, Bestiary/Spirit-Card UI, the Treasure Pavilion market, a sect stub, and a Legendary boss.

## Run it

Any static file server works (ES modules won't load from `file://`):

```
npx serve -l 8123 .
```

then open http://localhost:8123.

## Structure

- `js/combat.js` — pure, deterministic `resolveCombat(attacker, defender, seed)`; never touches game state or UI
- `js/actors.js` — shared Actor schema (player, monsters, and future PvP opponents are the same shape) + creature templates
- `js/progression.js` — realm/stage ladder (Qi Condensation → Foundation Establishment), per-stage XP curve with realm-barrier spikes, breakthroughs, stat allocation, and the stat-modifier aggregation pipeline (GDD §7.3): effective stats = base + trained + gear
- `js/map.js` — multi-zone grid definitions, movement costs, danger bands, portals between zones, respawns
- `js/items.js` — item generation (rarity gates stat rolls), equip/unequip, durability, repair and sell values
- `js/quests.js` — event-driven sequential quest chain
- `js/save.js` — versioned localStorage persistence with migration; persisting `lastQiTick` gives offline Qi regen for free
- `js/game.js` — game state and rules: Qi, zone travel, rewards, penalties, XP scaling, drops, kill tracking
- `js/ui.js` — rendering + turn-by-turn combat playback (resolution and presentation are fully decoupled)
- `js/main.js` — boot and wiring

## Balance testing

Combat balance can be simulated headless (no browser) by importing `resolveCombat` in Node and running fights in bulk — see GDD §8.6.
