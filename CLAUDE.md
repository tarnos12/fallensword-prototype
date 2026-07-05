# Fallen Immortal — Working Notes for Claude Code

This file is the handoff/status doc. **Keep it current: update it in the same commit as every completed task**, so any Claude Code (or the author) can resume cold. Author is Mariusz (GitHub `tarnos12`).

## What this is

A browser-based, offline-first, FallenSword-inspired stat-math dungeon-crawler RPG with **xianxia** flavor (cultivators, realms, spirit stones, sects), built with a designed path to (fake, then real) multiplayer. Pure HTML/JS/CSS, no build step, no framework. Full design in [GDD_Staged_Roadmap.md](GDD_Staged_Roadmap.md) — it is the source of truth for scope and staged roadmap.

Public repo: https://github.com/tarnos12/fallensword-prototype (branch `master`).

## Run & test

- Dev server: `npx serve -l 8123 .` (config in `.claude/launch.json`, name `fallen-immortal`). Use the preview tools, not Bash, to run/verify.
- **Always end a change summary with the test link: http://localhost:8123**
- Screenshots via the preview tool tend to time out in this environment — verify via DOM inspection (`preview_eval`, `preview_snapshot`, `preview_inspect`) instead.
- Balance is tuned **headless**: import `resolveCombat`/`generateItem`/etc. in Node and run bulk sims (see scratchpad `*-sim.mjs` patterns). No browser needed for tuning.

## Current status (update this section every commit)

**Stage 2 (Demo) — in progress.** Stages 0 and 1 complete.

Done:
- Stage 0: 10×10 grid, combat resolver, Qi.
- Stage 1: save/load, cultivation stages + stat allocation, gear (rarity/durability/repair), 5-quest chain, bestiary kill tracking.
- Instant combat (default) with a turn-by-turn playback toggle.
- Full rarity ladder (Common→Uncommon→Rare→Epic→Legendary→Mythic); **unique item types per rarity** (name signals tier, no prefixes); rarity gates attribute count; random drops cap at Rare.
- FallenSword-style icon-grid inventory/equipment with tooltips + right-click menu; 2-stats-per-row character sheet.
- **Multi-zone world** (`map.js` ZONES): Azuremist Vale → Cindervein Gorge, connected by a stage-gated portal; realm ladder Qi Condensation → Foundation Establishment with a realm-barrier XP spike; 3 Foundation-tier creatures; 9-quest chain across both zones. Save v2 with lossless v1 migration.
- **Techniques** (`techniques.js`): 8 across Offense/Defense/Special, 2–3 tier prereq tree, learned with banked points, channelled for timed Qi-cost percentage buffs; wall-clock expiry; routed through `effectiveStats`.

Next (tracked as tasks; recommended order):
1. **Bestiary + Spirit Cards UI** — Beast Codex over existing kill data (progressive-disclosure thresholds); Spirit Cards: `cardId` per creature, separate drop roll, always-on passive bonuses via the stat pipeline, duplicate-upgrade levels; card shown in codex entry (silhouette until owned). GDD §7.
2. **Treasure Pavilion** — fake-multiplayer auction house behind a `MarketProvider` interface (`listItem`/`getListings`/`buyNow`/`collectMailbox`), 60+ persistent NPC personas, rotating listings with price variance, Buy Now only, mailbox, async player selling. GDD §6.7.
3. **Sect stub (Warband)** behind a `GuildProvider` interface (hireable NPC disciples → passive buffs), **one Legendary boss** (hand-authored Ancient Terror, first Epic named drops), **onboarding/tutorial**, and **strip the testing conveniences** (below).

## Architecture conventions (hold these)

- **`combat.js` is a pure function** `resolveCombat(attacker, defender, seed)` — deterministic, never touches game state/UI/rewards. It's what a future PvP mode calls against a player's stat sheet. Don't leak game logic into it.
- **One Actor shape** for player/monsters/(future rivals). The persistent player splits `base` / `allocated` / `equipment` / buffs; combat stats come from `playerCombatActor()`.
- **Single stat-aggregation pipeline** `effectiveStats(player, now)` = base + trained + gear + technique buffs (Spirit Cards plug in here next). Never mutate stats in place on equip/cast/drop.
- **Providers behind interfaces**, NPC-backed now, networkable later (market/guild/events). Build the interface even for the stub.
- **Modular files**, no monolith: `combat` `actors` `progression` `items` `quests` `techniques` `map` `save` `game` `ui` `main` (+ `rng`).
- **Save is the only "account"** (`save.js`, localStorage, versioned). Bump `VERSION` and add a migration branch for breaking shape changes — v1→v2 migration is the reference. Persist timestamps (`lastQiTick`, buff `expiresAt`) so wall-clock/offline behavior is free.
- **Wall-clock timing pattern**: elapsed-time math (`Date.now()` vs stored timestamp) for Qi regen and buff expiry — survives reload/offline identically.

## TESTING-ONLY — strip before demo

All marked `TESTING ONLY` in code; in `game.js` `grantTestingKit()` and constants:
- `MAX_QI = 500` (`game.js`) → lower for real tuning.
- Quartermaster kit: one item of every rarity + `+8 technique / +6 stat points` + full Qi (re-runs when `TEST_KIT_VERSION` bumps).
- `INVENTORY_SIZE = 24` (`items.js`) → small starting size per GDD §6.2.

## Workflow

- One commit per completed task; **update the "Current status" section above in that same commit.**
- Commit messages end with the `Co-Authored-By: Claude` trailer.
- CRLF warnings from git on Windows are expected/harmless.
