# Fallen Immortal — Working Notes for Claude Code

This file is the handoff/status doc. **Keep it current: update it in the same commit as every completed task**, so any Claude Code (or the author) can resume cold. Author is Mariusz (GitHub `tarnos12`).

> **⚑ Working in parallel? Read this first.** Multiple Claude Code sessions may run at once. Before writing any code, `git fetch origin coordination` and read **`TASKS.md`** on the `coordination` branch — it's the shared task board. Claim an `AVAILABLE` task there (follow its Claim protocol — the claim is an atomic push race, first push wins) so two sessions never build the same thing or stomp each other's files. Leave handoff notes for other sessions in that file too. `master` stays code-only; `coordination` is the meeting point.

## What this is

A browser-based, offline-first, FallenSword-inspired stat-math dungeon-crawler RPG with **xianxia** flavor (cultivators, realms, spirit stones, sects), built with a designed path to (fake, then real) multiplayer. Pure HTML/JS/CSS, no build step, no framework. Full design in [GDD_Staged_Roadmap.md](GDD_Staged_Roadmap.md) — it is the source of truth for scope and staged roadmap.

Public repo: https://github.com/tarnos12/fallensword-prototype (branch `master`).

## Run & test

- Dev server: `npx serve -l 8123 .` (config in `.claude/launch.json`, name `fallen-immortal`). Use the preview tools, not Bash, to run/verify.
- **Always end a change summary with the test link: http://localhost:8123** — **except in cloud/remote sessions** (Claude Code on the web), where the server runs in a throwaway container the author can't reach. There, skip the link: verify in-container (headless Node sims + real-Chromium/Playwright DOM checks) and tell the author how to run it themselves (`git checkout <branch> && npx serve -l 8123 .`, open `http://localhost:8123` on **their** machine — ES modules need a static server, not `file://`).
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
- **Bestiary + Spirit Cards** (`cards.js`): Beast Codex modal (📖 button) over the existing kill data with progressive disclosure (10 kills → combat stats, 50 → drop table, 100 → card drop chance + mastery mark); a codex entry is created on first encounter (inspect **or** fight). Spirit Cards — one `cardId` per creature, a separate-from-loot drop roll, duplicate-upgrade (L1→5, beyond-max → spirit-stone payout). Combat-stat cards (attack/damage/armor/hp) plug into the `effectiveStats` pipeline; meta cards drive the Qi cap (`maxQi`) and passive spirit-stones/hour (`tickStones`, wall-clock/offline like Qi regen). Each codex entry shows the creature's card silhouetted until owned, then with its level. `bonusType` enum is extensible (XP%, repair discount, inv slots… flagged for later). GDD §7.
- **Treasure Pavilion** (`market.js` + `personas.js`): fake-multiplayer auction house (🏛 button) behind a `MarketProvider` interface (`getListings`/`buyNow`/`listItem`/`collectMailbox` + `tick`) — a 2.0 `NetworkMarketProvider` drops in with the same shape. 72-persona roster generated once from a fixed seed (deterministic, so it isn't persisted). NPC listings rotate on a timer (refresh every ~3 min, 20-min TTL), pulled from the loot tables (capped at Rare), priced around a fair value with deliberate ±noise (bargains ↔ rip-offs). Buy Now only. Player selling escrows the item and resolves asynchronously — sell/no-sell decided at list time from price competitiveness, proceeds/returns land in a **mailbox** (collect later; full pack blocks item collection). Wall-clock `tick` resolves sales offline. Tabbed modal: Browse / Sell / My Listings / Mailbox, with a mailbox badge. GDD §6.7.
- **Sect / Warband stub** (`guild.js`): hireable NPC disciples (⛩ Sect button) behind a `GuildProvider` interface (`getMembers`/`getRecruits`/`hire`/`dismiss`/`buffs`) — a 2.0 `NetworkGuildProvider` drops in with the same shape. Recruits come from the shared `personas.js` roster (same cast as the Pavilion); each persona's specialty is derived deterministically from its id, buff scales with its level. 4 specialties (War → battle XP%, Merchant → battle spirit-stone%, Alchemy → passive stones/hour, Meditation → max Qi). Sect capacity 3; hiring costs spirit stones, dismissing is free. Buffs are **economy-category** and plug into existing hooks: `maxQi` (Qi cap), `tickStones` (passive income), and kill rewards in `attack()` (XP%/stone%). Members persist on `player.guild`. Combat-stat sect buffs are a later extension (would plug into `effectiveStats` like cards). GDD §3/§4.3/§9.1.
- **Onboarding / tutorial** (`tutorial.js`): a first-run, dismissible 9-step overlay (❔ Help button to reopen) that walks a new player through movement/Qi, inspect-then-attack, the character sheet & stat points, gear, techniques, and the Codex/Pavilion/Sect systems — spotlighting the real UI element each step. Self-contained: builds its own DOM (no `index.html` markup, never touches `ui.js`); "seen" state is its own localStorage key (not the save schema). Stage 2 exit criterion "a stranger plays with zero explanation."

Next (tracked as tasks; recommended order):
1. **One Legendary boss** — hand-authored Ancient Terror (calamity beast), the first Epic/named drops (Epic→Mythic item templates already exist), likely a boss Spirit Card. GDD §3/§9.1.
2. **Visual/UI polish pass** (Stage 2 exit criteria).
3. **Strip the testing conveniences** (below) — do this **last**, right before demo.

## Architecture conventions (hold these)

- **`combat.js` is a pure function** `resolveCombat(attacker, defender, seed)` — deterministic, never touches game state/UI/rewards. It's what a future PvP mode calls against a player's stat sheet. Don't leak game logic into it.
- **One Actor shape** for player/monsters/(future rivals). The persistent player splits `base` / `allocated` / `equipment` / buffs; combat stats come from `playerCombatActor()`.
- **Single stat-aggregation pipeline** `effectiveStats(player, now)` = base + trained + gear + Spirit Cards (flat) then technique buffs (percentage). Never mutate stats in place on equip/cast/drop. New passive sources (sect buffs, set bonuses) plug in here.
- **Providers behind interfaces**, NPC-backed now, networkable later (market/guild/events). `createMarketProvider(state)` (`market.js`) and `createGuildProvider(state)` (`guild.js`) are the references: each returns its GDD method set, and `game.js` only ever calls the interface — a 2.0 network impl swaps in without touching callers. Build the interface even for the stub.
- **Modular files**, no monolith: `combat` `actors` `progression` `items` `quests` `techniques` `cards` `market` `personas` `guild` `tutorial` `map` `save` `game` `ui` `main` (+ `rng`).
- **Save is the only "account"** (`save.js`, localStorage, versioned). Bump `VERSION` and add a migration branch for breaking shape changes — v1→v2 migration is the reference. Persist timestamps (`lastQiTick`, `lastStoneTick`, buff `expiresAt`) and world state (`market`) so wall-clock/offline behavior is free. New fields (`player.cards`, `player.guild`, `lastStoneTick`, `market`) are back-filled in `createGame` for old saves — no VERSION bump needed for additive shape changes. Deterministic-from-seed data (the `personas.js` roster) is regenerated, never stored.
- **Wall-clock timing pattern**: elapsed-time math (`Date.now()` vs stored timestamp) for Qi regen, passive spirit-stone income (`tickStones`), buff expiry, and Pavilion listing rotation + async sale resolution (`tickMarket`) — survives reload/offline identically.

## TESTING-ONLY — strip before demo

All marked `TESTING ONLY` in code; in `game.js` `grantTestingKit()` and constants:
- `MAX_QI = 500` (`game.js`) → lower for real tuning.
- Quartermaster kit: one item of every rarity + `+8 technique / +6 stat points` + full Qi (re-runs when `TEST_KIT_VERSION` bumps).
- `INVENTORY_SIZE = 24` (`items.js`) → small starting size per GDD §6.2.
- **Debug panel** (`js/debug.js` — the dashed purple "🛠 Debug" box at the bottom of the character column): God mode (one-shot / never die), item- & card-drop-rate multipliers, spawn any creature at any level on the current tile, mint gear of any rarity/slot/level, grant stones/XP/breakthrough/points/Qi, grant/max/clear Spirit Cards, reveal the whole codex, and rotate/resolve the market. **To strip:** delete `js/debug.js`; remove its `import`/`initDebug()` in `main.js`; remove the `TESTING ONLY — debug tools` block in `game.js` plus the `applyGodStats(actor)` call in `attack()`; and remove `setDropMultiplier`/`setCardDropMultiplier` (and their use in `rollDrop`/`rollCardDrop`) in `items.js`/`cards.js`. All are labelled `TESTING ONLY`.

## Workflow

- One commit per completed task; **update the "Current status" section above in that same commit.**
- Commit messages end with the `Co-Authored-By: Claude` trailer.
- CRLF warnings from git on Windows are expected/harmless.
