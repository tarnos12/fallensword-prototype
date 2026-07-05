# Fallen Immortal

A browser-based, offline-first, stat-math dungeon-crawler RPG with xianxia flavor — FallenSword-inspired, built with a designed path to (fake, then real) multiplayer. See [GDD_Staged_Roadmap.md](GDD_Staged_Roadmap.md) for the full design document and staged roadmap.

**Current status: Stage 1 MVP** — one 10×10 zone, three creature types, deterministic stat-math combat, wall-clock Qi regen (including offline), localStorage save/load, cultivation stages (Qi Condensation 1–9) with stat-point allocation, gear with rarity/degradation/repair, a 5-quest chain, and bestiary kill tracking.

## Run it

Any static file server works (ES modules won't load from `file://`):

```
npx serve -l 8123 .
```

then open http://localhost:8123.

## Structure

- `js/combat.js` — pure, deterministic `resolveCombat(attacker, defender, seed)`; never touches game state or UI
- `js/actors.js` — shared Actor schema (player, monsters, and future PvP opponents are the same shape) + creature templates
- `js/progression.js` — XP curve (per-stage costs), breakthroughs, stat allocation, and the stat-modifier aggregation pipeline (GDD §7.3): effective stats = base + trained + gear
- `js/items.js` — item generation (rarity gates stat rolls), equip/unequip, durability, repair and sell values
- `js/quests.js` — event-driven sequential quest chain
- `js/save.js` — versioned localStorage persistence; persisting `lastQiTick` gives offline Qi regen for free
- `js/map.js` — grid map, movement costs, danger bands, respawns
- `js/game.js` — game state and rules: Qi, rewards, penalties, XP scaling, drops, kill tracking
- `js/ui.js` — rendering + turn-by-turn combat playback (resolution and presentation are fully decoupled)
- `js/main.js` — boot and wiring

## Balance testing

Combat balance can be simulated headless (no browser) by importing `resolveCombat` in Node and running fights in bulk — see GDD §8.6.
