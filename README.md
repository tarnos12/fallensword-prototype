# Fallen Immortal

A browser-based, offline-first, stat-math dungeon-crawler RPG with xianxia flavor — FallenSword-inspired, built with a designed path to (fake, then real) multiplayer. See [GDD_Staged_Roadmap.md](GDD_Staged_Roadmap.md) for the full design document and staged roadmap.

**Current status: Stage 3 — 1.0 offline release (in progress).** Stage 2 (Demo) is complete. On top of the two connected 10×10 zones (Azuremist Vale → Cindervein Gorge), the realm ladder (Qi Condensation → Foundation Establishment → beyond), deterministic stat-math combat (instant or turn-by-turn), wall-clock Qi regen (including offline), and versioned localStorage save/load, the game now includes: the full rarity ladder (unique artifact types per tier) with durability/repair and a **Forge** (reforge/temper); learnable techniques, **Spirit Cards**, and a **Meridian** talent tree feeding one stat pipeline; a Beast Codex; the **Treasure Pavilion** auction house, the **Sect** of hireable disciples, **Hunt Bounties**, and **Daily Trials**; a hand-authored **Legendary boss**; a Profile with **Rivals**, a Recently-Active feed, and offline **Sparring**; Achievements; save export/import; a light/dark theme; full keyboard play; and a first-run tutorial. Remaining Stage 3 work and packaging are tracked on the `coordination` branch's task board.

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
- `js/techniques.js` — learnable techniques (Offense/Defense/Special) cast as timed, Qi-cost percentage buffs; stored as data and applied through the stat pipeline
- `js/cards.js` — Spirit Cards: one per creature, separate drop roll, duplicate-upgrade collection; combat-stat cards feed `effectiveStats`, meta cards drive the Qi cap and passive spirit-stone income
- `js/personas.js` — the persistent NPC persona pool (fixed-seed roster), reused as Treasure Pavilion sellers/buyers (and future Rivals/Recently-Active feeds)
- `js/market.js` — the Treasure Pavilion behind a `MarketProvider` interface: rotating NPC listings, Buy Now, async player selling, and a mailbox (a 2.0 `NetworkMarketProvider` implements the same shape)
- `js/guild.js` — the Sect (Warband) stub behind a `GuildProvider` interface: hireable NPC disciples (from the persona pool) granting always-on economy buffs (a 2.0 `NetworkGuildProvider` implements the same shape)
- `js/tutorial.js` — first-run onboarding overlay: a self-contained, dismissible guided walkthrough (with a ❔ Help button to reopen) that spotlights each part of the UI
- `js/loadouts.js` — Combat Sets: save the equipped artifacts as named sets and swap between them in one click (applied through the existing equip logic)
- `js/save.js` — versioned localStorage persistence with migration; persisting `lastQiTick` gives offline Qi regen for free
- `js/game.js` — game state and rules: Qi, zone travel, rewards, penalties, XP scaling, drops, kill tracking
- `js/ui.js` — rendering + turn-by-turn combat playback (resolution and presentation are fully decoupled)
- `js/main.js` — boot and wiring

## Balance testing

Combat balance can be simulated headless (no browser) by importing `resolveCombat` in Node and running fights in bulk — see GDD §8.6.

## Controls

- **Move:** click an adjacent tile, or use the **arrow keys / WASD**
- **Panels:** click the nav buttons, or press **1–9**
- **Close a dialog:** click away or press **Esc**
- **Appearance:** toggle light/dark in **⚙ Settings**

## Build & publish to itch.io

The game is fully static — the repository root **is** the build. There's no
compile step; zip the runtime files and upload as an HTML project. The complete
store-page copy (description, tags, screenshot shot-list) and the exact
zip-and-upload steps are in **[docs/STORE.md](docs/STORE.md)**.

Quick version:

```sh
zip -r fallen-immortal.zip index.html css js -x '*.DS_Store'
```

Then create a new **HTML** project on itch.io, upload the zip, tick "This file
will be played in the browser," and set the embed to launch fullscreen. Before a
release build, strip the testing conveniences (see `CLAUDE.md` →
"TESTING-ONLY — strip before demo").

## License

[MIT](LICENSE) © 2026 Mariusz (`tarnos12`).
