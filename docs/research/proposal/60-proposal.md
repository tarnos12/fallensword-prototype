# 60 — Build Plan (frozen contract) — lead

The design pass (`10`–`40`) is build-ready and Critic4-cleared (`50-critique.md`: all directive asks
covered, 3 hard constraints PASS, cross-author conflicts resolved). This is the **frozen build
contract**: wave sequencing + file ownership so parallel agents don't collide on shared files. Detail
lives in the design docs; this doc is the sequencing spine.

## Lead decisions locked
1. **Spirit Cards: DEFER hard-cut (KEEP functional, re-home UI).** Beast Codex moves to Map (fixes the
   Halls-clutter complaint) but `cardBonuses` stays in `effectiveStats` and cards keep dropping — so
   **no boss-stat re-tune needed** and existing saves are preserved. Revisit full removal later.
2. **Ascension stays THIN.** The premium **Hall of Merit** shop is the "chosen permanent unlocks"
   currency (research T2); no separate Ascension-deepening. `performAscension` needs no code change
   (meridian node shape unchanged).
3. **Skill-point pool merge: DEFERRED** (Progression's non-blocking fallback). Ship the 8-node tree +
   4 abilities + separate `resetMeridians`/`resetTechniques`/`respecStats` hooks.
4. **Debug bar: ADD, `?dev=1`-gated** but visible when the flag is on (author-directed override of PR#13).
5. **quests.js KEEP** (absorbs Hunt Bounties).

## Wave sequencing (waves are SEQUENTIAL; within a wave, agents own disjoint files)

### Wave 1 — Foundation & IA skeleton (ONE agent; must leave the game LOADING)
Owns the shared spine so later waves build on a stable base:
- `save.js`: additive `player.merit` (premium currency) + any additive fields; migration keeps old saves loading.
- `progression.js`: Qi retune `QI_REGEN_MS 3000→48000`; add `respecStats()`, `resetMeridians()`,
  `resetTechniques()`, `techniquePointsSpent()`; complete meridians 5→8 nodes; add `gearQiRegenBonus(player)` helper (NOT in `effectiveStats` — consumed by `tickQi`).
- IA restructure: `index.html` (delete `<section data-tab="combat">` + Halls; add 5-tab
  Map/Cultivator/Equipment/Skills/Quests + auction ◆ / premium ✧ HUD icons + a `#debug-bar` container
  above `#map-grid` + a combat side-panel container on the Map surface), `tabs.js` (`TABS` array),
  `main.js` (drop `setActiveTab('combat')` autoswitch + close-combat handler; wire new tabs/icons),
  `input.js` (unbind 1-9 from `openNavPanel`).
- Clean cuts/merges (remove nav buttons + module wiring, strip-safe for old saves): Alchemy, Daily
  Trials, world-event calendar, Sect Dispatch nav entries; merge Forge/Salvage/Loadouts→Equipment,
  Bounties→Quests, Titles/Achievements/Chronicle→Cultivator Records, Beast Codex→Map. (Spirit Cards
  mechanic stays per decision 1 — only its nav/Halls surface moves to Map.)
- **Exit gate:** `node --check` on every touched file; game loads with no console errors; existing
  save still loads. Commit.

### Wave 2 — Feature modules (PARALLEL; disjoint ownership after Wave 1 commits)
- **CombatWorld agent** → `actors.js` (Legendary/SE/Titan as stat-multiplied variants of native
  templates), new `js/rarespawns.js`, `js/titans.js` (move-and-chase; `monster.titanHp` world state
  synced to `hp` around the unmodified `resolveCombat`), `js/debug.js` (debug bar + 100%-drop toggle),
  `items.js` (superElite/titan rarity tiers + drop rolls 25/50/100%), `input.js` (1-9 attack-slot),
  combat side-panel render, `game.js attack()` drop/titan/spawn hooks. Owns `game.js` attack-flow.
- **Economy agent** → `js/meritshop.js` (Hall of Merit, 12-row catalog absorbing respec/inventory/
  stamina/loadout sinks), `market.js` (dual-currency listings), Merit award hooks. Coordinates game.js
  touch-points with CombatWorld (Merit awards live near drop hooks) — sequence within-wave via mailbox.
- **Skills/content agent** → `techniques.js` (9→4 long active abilities), `meridians.js` node data
  (if not fully in Wave 1), `sets.js` (4 new Legendary/SE sets, flat Attributes), skills-tab render.
- **Feel agent (Fable)** → `audio.js` (new SFX events), CSS visual polish per Architect's §3
  (ink-and-cinnabar palette, self-hosted font pairing, SVG icons replacing emoji, remove the 6 AI-tells).
- **Note:** `game.js` is touched by both CombatWorld and Economy → CombatWorld owns it; Economy sends
  its Merit-hook diffs to CombatWorld to apply, or the lead applies the Merit hooks at integration.

### Wave 3 — Integration, polish reconciliation, QA
- Lead reconciles any shared-file seams, wires everything in `main.js`.
- QA agent: `node tools/balance.mjs` (ALL ROWS PASS — Spirit Cards kept, so boss rows unaffected),
  real-Chromium/Playwright smoke (game loads, 5 tabs work, combat side-panel resolves, debug spawn
  buttons produce Legendary/SE/Titan, 1-9 attacks, premium shop opens, no console errors, no page/
  horizontal scroll), per PROJECT.md's in-container verify rules (no localhost handback).
- Commit per verified slice; update `PROJECT.md` (new IA, relaxed "own nav button" constraint, systems removed).

## Standing constraints (unchanged)
`combat.js` pure; single `effectiveStats` pipeline; additive/migrated save schema; per-slice commits to
`master`; verify in-container (headless + Chromium), never hand back localhost.
