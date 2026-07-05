# Fallen Immortal

A browser-based, offline-first, stat-math dungeon-crawler RPG with xianxia flavor — FallenSword-inspired, built with a designed path to (fake, then real) multiplayer. See [GDD_Staged_Roadmap.md](GDD_Staged_Roadmap.md) for the full design document and staged roadmap.

**Current status: Stage 0 prototype** — one 10×10 zone, three creature types, deterministic stat-math combat, wall-clock Qi regen. No saving yet (refresh = reset).

## Run it

Any static file server works (ES modules won't load from `file://`):

```
npx serve -l 8123 .
```

then open http://localhost:8123.

## Structure

- `js/combat.js` — pure, deterministic `resolveCombat(attacker, defender, seed)`; never touches game state or UI
- `js/actors.js` — shared Actor schema (player, monsters, and future PvP opponents are the same shape) + creature templates
- `js/map.js` — grid map, movement costs, danger bands, respawns
- `js/game.js` — game state and rules: Qi, rewards, penalties, XP scaling
- `js/ui.js` — rendering + turn-by-turn combat playback (resolution and presentation are fully decoupled)
- `js/main.js` — boot and wiring

## Balance testing

Combat balance can be simulated headless (no browser) by importing `resolveCombat` in Node and running fights in bulk — see GDD §8.6.
