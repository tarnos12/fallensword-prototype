# PROJECT.md — Project-Specific Instructions

Project detail for the agent team. **For team-running rules (the 3 rules, audit protocol, readiness
gate, hygiene), see `CLAUDE.md`.** This file holds *what* is built; `CLAUDE.md` holds *how* the team
operates. Keep the split clean.

---

## Goal

**Fallen Immortal** — a browser-based, offline-first, FallenSword-inspired stat-math dungeon-crawler
RPG with **xianxia** flavor (cultivators, realms, spirit stones, sects). Pure HTML/JS/CSS ES modules —
no build step, no framework. Core loop: explore a grid map (costs Qi) → fight a creature (transparent
stat-math combat, not hidden-RNG theater) → win loot/XP/spirit stones → gear up / allocate stats /
breakthrough realms → repeat. Every multiplayer-shaped system (market, sect/guild, bounties, profile
rivals) is built behind a provider interface, NPC-backed today, with a designed path to a real
networked 2.0 without re-architecting callers.

**Design authority:** `GDD.md` is the source of truth for scope and the staged
roadmap — but it **predates** most of Stage 3 and the 1.0 polish batch; this file reflects **shipped
reality**, distilled from the actual codebase and its commit history, not the other way around. Where
the two disagree (e.g. the GDD's "stamina" is shipped as "Qi"), the GDD's *intent* still holds; its
literal detail may be stale.

Public repo: https://github.com/tarnos12/fallensword-prototype (branch `master`). Author Mariusz
(GitHub `tarnos12`).

## Stack & structure

No build tooling, no framework, no dependencies — static ES modules served by `npx serve`. Everything
lives under `js/`, one file per concern, imported directly by the browser. Module→ownership map:

- **Engine** (deterministic core): `combat.js` (pure resolver), `actors.js` (Actor schema + spawn
  helpers), `progression.js` (realms/stages/`effectiveStats` pipeline/ascension constant), `items.js`
  (rarity/gen/rolls/named items), `rng.js`. World data is **per-zone**: each `js/zones/<id>.js`
  exports `ZONE` (grid/danger/spawns/portals) + `CREATURES` (its native creature templates);
  `js/zones/registry.js` composes them into the global `ZONES`/`CREATURE_TYPES`. `map.js` re-exports
  `ZONES` (loader + grid logic only); `actors.js` re-exports `CREATURE_TYPES`. **To add a zone: create
  one `js/zones/<id>.js` and add it to `ZONE_MODULES` in `registry.js` — nothing else changes.**
  Bosses are data too but stay separate: `boss.js` owns a `BOSSES` registry, never in a zone spawn
  table.
- **Systems** (gameplay/economy, mostly self-contained modules): `quests.js`, `techniques.js`,
  `cards.js`, `market.js` + `personas.js` (shared NPC roster), `guild.js`, `boss.js`, `bounties.js`,
  `trials.js`, `meridians.js`, `alchemy.js`, `sectmissions.js`, `sockets.js`, `sets.js`,
  `ascension.js`, `salvage.js`, `crafting.js`, `loadouts.js`, `rivals.js`, `duel.js`.
- **Presentation**: `ui.js` (shared renderers — tooltips, char sheet, gear, quest panel — the one
  file almost every feature touches read-only), `tabs.js` (five full-view tabs: Map/Combat/
  Cultivator/Quests/Halls), `combatfx.js`, `toast.js`, `replay.js`, `theme.js`, `tooltips.js`,
  `input.js` (keyboard + a11y), `itemcompare.js`, `audio.js`, `titles.js`, `stats.js`, `events.js`,
  `profile.js`, `achievements.js`, `settings.js`, `tutorial.js`.
- **Core/glue**: `save.js` (versioned localStorage schema + export/import), `game.js` (state +
  game-layer action wrappers), `main.js` (DOM wiring, the only file that touches every module).
- **Tools**: `tools/balance.mjs` — the committed, reusable headless balance report (see Run & test).

## Hard constraints (enforce on every teammate)

- **`combat.js` is a pure function** `resolveCombat(attacker, defender, seed)` — deterministic, never
  touches game state/UI/rewards/wall-clock. It's what PvP/sparring calls against a stat sheet. Never
  leak game logic into it.
- **One Actor shape** for player/monsters/rivals. The persistent player splits `base` / `allocated` /
  `equipment` / buffs; combat stats come from `playerCombatActor()`.
- **Single stat-aggregation pipeline** `effectiveStats(player, now)`. Flat sources, in order:
  `base → trained → gear → cards → meridians → gems (sockets) → set bonuses`, THEN technique/pill
  **percentage buffs**, THEN the final **×(1 + 0.08·ascensionTier)** global scalar. Never mutate
  stats in place on equip/cast/drop. A new passive flat source plugs in as one add-line in this
  pipeline, in order, before the % buffs.
- **Providers behind interfaces**, NPC-backed now, networkable later. `createMarketProvider(state)`
  (`market.js`) and `createGuildProvider(state)` (`guild.js`) are the references — each returns its
  GDD method set, and `game.js`/UI only ever call the interface, never reach into the NPC impl. A
  2.0 network provider swaps in without touching callers. Build the interface even for a stub
  (`BountyProvider`, `SectMissionProvider`, `ProfileProvider` follow the same shape).
- **Save is the only "account"** (`save.js`, localStorage, versioned `VERSION`). Bump `VERSION` +
  add a migration branch only for **breaking** shape changes (v1→v2 is the reference). New fields are
  **additive**: back-filled in `createGame` for old saves, **no VERSION bump** for additive shape
  changes. Persist timestamps (`lastQiTick`, `lastStoneTick`, buff `expiresAt`) so wall-clock/offline
  behavior is free. Display preferences (theme, audio, title pick, instant-combat) live in their
  **own localStorage keys**, never in the save schema. Deterministic-from-seed data (the
  `personas.js` roster) is regenerated, never stored.
- **Wall-clock timing pattern**: elapsed-time math (`Date.now()` vs a stored timestamp) for Qi
  regen, passive stone income, buff/mission/bounty-rotation expiry, and daily-trial/event-calendar
  buckets — survives reload and offline identically. Never `setInterval`-only for anything that must
  be correct after a tab was closed.
- **Self-contained feature modules**: a new system owns its own nav button (injected into
  `#nav-menu`), its own modal DOM, and its own stylesheet (`<link>` appended at init or linked in
  `<head>`) — it does **not** edit `index.html` markup and does **not** edit `ui.js`/`style.css`
  unless the feature is fundamentally a shared-renderer or core-layout change (tabs, HUD, item
  tooltip). When two features must touch the same shared region (e.g. the item tooltip for compare/
  sockets/sets), keep those slices in one session/PR to avoid clobbering.
- **Every completed task lands as a PR into `master`**, merged once tested and working — no direct
  pushes to `master`, no untested merges. **Update this file's "Current status" in the same commit**
  as the code change that makes it stale, so any session can resume cold.

## Run & test

- Dev server: `npx serve -l 8123 .` (config in `.claude/launch.json`, name `fallen-immortal`) — ES
  modules need a static server, not `file://`. Use the preview tools, not Bash, to run/verify locally.
- **Cloud/remote sessions** (Claude Code on the web): the dev server runs in a throwaway container the
  author can't reach — **never hand back a `localhost` link**. Verify in-container instead: headless
  Node sims for logic/balance, and real-Chromium/Playwright DOM checks
  (`executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome`) for UI. Screenshots via the
  preview tool tend to time out — prefer DOM inspection (`preview_eval`/`preview_snapshot`/
  `preview_inspect`) or a Playwright script. Tell the author how to run it themselves
  (`git checkout <branch> && npx serve -l 8123 .`, open `http://localhost:8123` on **their** machine).
- **Balance is tuned headless**: `node tools/balance.mjs` — a committed report that sims through the
  **real** engine pipeline (`spawnCreature`/`resolveCombat`/`createPlayer`/`generateItem`/
  `effectiveStats`, never hand-rolled scaling), covering zone band matchups, boss gates, XP economy,
  drop economy, and market sanity as named-tolerance PASS/WARN rows. **"ALL ROWS PASS" is the gate**
  for any change touching stats, drops, XP, prices, or a new zone/boss. Import the same functions in
  Node for ad-hoc bulk sims when tuning something new (scratchpad `*-sim.mjs` pattern) — never model
  scaling by hand.
- Local (non-cloud) sessions: end a change summary with the test link `http://localhost:8123`.

## Current status

**MAJOR REDESIGN landed 2026-07-12 (author-directed simplify + refocus).** Driven by research Sprints
1–4 (`docs/research/**`) then a full build. The game was refocused onto a tight core loop and many
Halls systems were cut/merged. **Design + build specs: `docs/research/proposal/10`–`60`.** Highlights:
- **IA:** 5 tabs — **Map / Cultivator / Equipment / Skills / Quests** (the old **Combat** and **Halls**
  tabs were removed; combat now resolves in a side-panel on the Map). Two HUD icons: ◆ auction, ✧
  premium. `#nav-menu` (17 Halls entries) fully dissolved.
- **Cull/merge:** Alchemy, Daily Trials, world-event calendar, Sect Dispatch **cut**; Sect/Profile/
  Rivals/Sparring UI removed (providers/game-layer code retained, DEFER-2.0); Forge/Salvage/Jewelcraft
  → Equipment, Bounties → Quests, Titles/Achievements/Chronicle → Cultivator Records, Beast Codex →
  Map. **Spirit Cards kept functional** (only the Codex UI moved to Map — avoids a boss re-tune).
- **Premium currency "Merit"** (`merit.js`) — earnable/tradeable in-game (drops/bosses/achievements,
  sellable on the auction house), NO real-money on-ramp. **Hall of Merit shop** (`meritshop.js`) opened
  from the ✧ icon: inventory/Qi upgrades, XP-loss protection, stat/meridian/technique respec, + a 3-way
  exclusive **Dao Heart** pick. Auction house is now **dual-currency** (gold/Merit).
- **Rarities/monsters:** new **Super-Elite** + **Titan** tiers. **Legendary & Super-Elite items are
  always Sets** (flat Attributes; 4 new sets in `sets.js`); **Titan items are never Sets and always
  grant Qi-regen**. Spawns (`rarespawns.js`): organic **Legendary** (per-slot roll), **1 Super-Elite
  per zone**, and **Titans** (`titans.js`) that **move-and-chase** (~10 encounters, HP persists in
  world state, 100% drop). Drop rates 25% / 50% / 100%. **`?dev=1` debug bar** above the map spawns
  each tier + a force-100%-drop toggle. **Number keys 1–9 attack the monster in tile-slot N.**
- **Progression/skills:** Qi regen retuned (~1200/hr → ~75/hr, `QI_REGEN_MS=48000`); the passive
  **Meridian tree** completed to 8 nodes; techniques reshaped **9 → 4 long (10–15 min) active
  abilities**; costed respec hooks. Passive + active unified in the **Skills** tab (`skilltree.js`).
- **Feel:** ink-and-cinnabar visual system (self-hosted Cinzel/EB-Garamond fonts, SVG mask icons, the
  6 "AI tells" removed) + new combat/loot/merit/breakthrough **SFX** (`audio.js`).
- `combat.js` remains **byte-for-byte a pure resolver** (titan movement/HP live in game/world state).
- **Constraint change:** the "each feature owns its own nav button" rule is **relaxed** (it produced
  the Halls junk-drawer); modules now render into named containers on their host surface.
- **Verified:** `node --check` all, real-Chromium 21/21 (0 console errors, no h-scroll), `balance.mjs`
  ALL ROWS PASS. **Save compatibility intentionally NOT maintained** (author will handle save-compat
  later) — existing saves may break.

### Pre-redesign baseline (superseded by the above)
**Stages 0–3 complete; the tree is demo/1.0-ready.** Playtested locally, balance-harness-green,
TESTING scaffolding stripped.

- **World:** three zones spanning the full realm ladder (Qi Condensation → Foundation Establishment →
  Core Formation, levels 1–27) — **Azuremist Vale** (QC), **Cindervein Gorge** (FE, stage-gated
  portal from Azuremist), **Stormcrown Peak** (CF, `minStage 19`-gated portal from Cindervein).
  9+5+5-step quest chains including two named-item endgame sagas (Heaven-Severing Blade capstone
  Legendary; Stormcrown saga's capstone Mythic), plus a bounty board and daily trials layered on top.
- **Bosses:** three hand-tuned calamities, each its own lair/cooldown/gate in the `BOSSES` registry —
  **Xuanming, the Ancient Terror** (FE1 gate, Epic/chance-Legendary), **Zhulong, the Ember Calamity**
  (FE5 gate, guaranteed Epic/30% Legendary), **Jiuxiao, the Tribulation Sovereign** (CF5 gate,
  guaranteed Legendary/30% Mythic — the game's first Mythic drop source). All headless-tuned through
  `tools/balance.mjs` (crushed under-geared → real gamble at-gate → reliable maxed+buffed).
  
- **Progression:** three realms to Core Formation 9 (`MAX_STAGE 27`), an 8-node Meridian passive tree
  (points from level), Spirit Cards (bestiary drop, L1→5 + spirit-stone overflow), gem sockets (Rare+
  gear, one gem per combat stat), matched-gear set bonuses (3 sets across Rare/Epic/Legendary), and
  an Ascension/NG+ prestige loop (wipes the run, keeps collections, +8% all-stats per tier,
  compounding via the final `effectiveStats` scalar).
- **Economy:** the Treasure Pavilion (fake-multiplayer auction house on `MarketProvider`, NPC
  personas, buy-now + escrowed sell + mailbox), the Sect (hireable NPC disciples on `GuildProvider`,
  economy buffs + Sect Dispatch timed missions), the Forge (reforge/temper/repair), Salvage
  (materials from unequipped gear → cheap anywhere-repair), Alchemy (brewed pills — instant effects
  or timed combat buffs), hunt bounties, and daily trials — all wall-clock-driven, all offline-safe.
- **UX:** a full-view **five-tab layout** (Map/Combat/Cultivator/Quests/Halls, no page scroll, mobile
  bottom-dock), a global instant-tooltip engine + content pass, per-source stat-breakdown tooltips
  (every `effectiveStats` source individually reconciled), item-compare deltas + set/socket tooltip
  lines, combat "juice" (arena, floating numbers, crit flourish), procedural SFX, light/dark theme,
  Cultivator Titles (18-rung cosmetic ladder + HUD chip), a 9-step first-run tutorial, achievements
  (23 milestones), a Chronicle of Deeds stats modal, unified toast feedback, fight replay/share, a
  world-event calendar banner, and full keyboard/a11y support (arrows/WASD, Esc, digit-nav, `?` help
  overlay, ARIA on every modal) plus a responsive/touch pass with zero horizontal overflow 320–1280px.
- **Infra:** save schema v2 with lossless v1 migration, export/import backup (clipboard + file), and
  the **TESTING-ONLY scaffolding is STRIPPED** (PR #13) — `js/debug.js`/god-mode/quartermaster-kit/
  drop multipliers are gone; real values are live (`MAX_QI 120`, `INVENTORY_SIZE 12`). A fresh game
  starts as a stranger meets it: empty pack, zero points, no debug affordances. Any future dev
  tooling must be **URL-flag-gated** (`?dev=1`), never always-on.

Next: playtesting feedback on the demo/1.0 build; then the 2.0 direction — network providers
(`NetworkMarketProvider`, `NetworkGuildProvider`, etc.) implementing the exact same interfaces as
`market.js`/`guild.js`/`bounties.js`/`profile.js` today, so no caller changes.

---

## Instantiated roster (map `CLAUDE.md` archetypes → this project)

Spawn only the 3–5 the current milestone needs. *(subagent)* roles are usually spawned by the
relevant teammate rather than run live in the team.

| Role | Model | Owns / does |
|---|---|---|
| **Lead / Integrator** | Opus | Sequencing, interface contracts, `main.js`/save-schema integration passes, opens & merges every PR into `master`; never builds |
| **Gameplay Systems dev** | Sonnet | Quest chains, economy modules (market/sect/bounties/trials/alchemy/crafting/salvage) — well-specified, contained slices |
| **Hard-Problem dev** | Opus | Combat/balance/boss tuning and cross-module builds; **all tuning goes through `spawnCreature`/`resolveCombat`/`effectiveStats` — never hand-rolled scaling formulas** (a boss/zone build was rejected once for exactly this) |
| **UI/UX dev** | Sonnet | Presentation modules (`combatfx`/`toast`/`theme`/`tooltips`/`input`/`titles`/`tabs`/…); **`ui.js` has one owner at a time** — coordinate before a shared-renderer touch |
| **Level/Encounter & Balance** | Fable | Tuning tables, difficulty curves, encounter feel — gated by `tools/balance.mjs` ALL-ROWS-PASS, not vibes |
| **Narrative/Content** | Fable | Flavor text, quest copy, item/boss/technique names, tutorial copy |
| **QA/Verification** | Opus | Adversarial: runs `tools/balance.mjs` + Chromium sweeps, hunts regressions, gates every merge into `master` |
| **Content/Asset** | Haiku | Catalog entries, data tables (cards/gems/materials), doc lines, mechanical renames — batch small edits together |

**Shared-standard owner note:** `progression.js`'s `effectiveStats` and `save.js`'s schema are
**single-owner files** — one teammate at a time, everyone else requests a change rather than editing
directly, exactly like `config.js` in the generic template.

## Milestone exit criteria

- **Demo (Stage 2) — DONE.** "A stranger plays with zero explanation" (delivered by `tutorial.js`);
  real economy loop (gear, quests, market) functional end to end.
- **1.0 polish (Stage 3 + Feel & Polish batch) — DONE.** All Stage-3 systems landed, TESTING
  scaffolding stripped, `tools/balance.mjs` ALL ROWS PASS, full-view tab UX + a11y/mobile/audio pass
  verified in real Chromium with zero console errors and zero page/horizontal scroll.
- **Next — playtest burn-down.** Feedback from real play sessions triaged and fixed; no new systems
  gated on this beyond bugfixes/tuning.
- **2.0 (network multiplayer).** `NetworkMarketProvider`/`NetworkGuildProvider`/`NetworkBountyProvider`/
  `NetworkProfileProvider` (etc.) implement the same interfaces as today's NPC-backed providers with
  zero caller changes; save data becomes the account payload uploaded to a real backend.
