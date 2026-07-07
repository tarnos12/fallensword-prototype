# Fallen Immortal — Parallel Task Board

**This file lives only on the `coordination` branch. It is never merged into `master`.**
It is the shared ledger that lets multiple Claude Code sessions work in parallel
without colliding. `master` stays code-only; this branch is the meeting point.

New session? Do this **before writing any code**:
1. `git fetch origin coordination && git checkout -B coordination origin/coordination`
2. Read the **Task Board** below **and the Task Notes** for anything you'd touch.
   Pick a row marked `AVAILABLE`.
3. Claim it (see **Claim protocol**). If your claim push is rejected, someone
   beat you — re-fetch, and either pick another task or redo the claim.
4. **Always make a new branch for a new feature, and name the branch to match
   the feature** — e.g. `claude/crafting-forge`, `claude/set-bonuses` — never
   a generic session id like `claude/pick-your-task-xxxx`. Branch off `master`,
   then open a PR into `master`.
5. Keep your row's status current: `CLAIMED` → `IN REVIEW` → `DONE`, **and jot
   any decisions/gotchas/handoff context in that task's Notes** (see below).

The board's columns are the machine-readable status (who owns what, right now).
The **Task Notes** section is the human layer — freeform comments sessions leave
each other: why a choice was made, what's half-done, a shared-file edit to watch
for, a dependency, anything the next session needs. Treat it like the comment
thread on the task.

---

## Status legend

| Status | Meaning |
|---|---|
| `AVAILABLE` | Unclaimed. Fair game. |
| `CLAIMED` | A session owns it and is working. Do **not** start it. |
| `IN REVIEW` | Work done, PR open, awaiting merge. |
| `DONE` | Merged into `master`. |
| `BLOCKED` | Not startable yet — see the reason in Notes. |

---

## Stage 2 (Demo) — ✅ COMPLETE

All Stage-2 tasks are merged into `master`: Sect stub (#3), Legendary boss (#9),
Onboarding (#5), Profile & Rivals (#8), Save export/import (#6), Visual polish
(#12), Combat Sets (#7), Achievements (#10), Settings (#11). The full per-task
thread is in this file's git history on `coordination`.

> **⚠ One Stage-2 item is intentionally held: strip-testing (PR #13).** It's
> reviewed and merge-ready, but it **deletes the debug panel + testing kit and
> lowers `MAX_QI`/`INVENTORY_SIZE` to real values** — i.e. it removes the tooling
> Stage-3 sessions rely on to test fast. **Do NOT merge #13 until Stage 3 dev is
> done.** It is the very last pre-1.0 step, right before packaging/demo.

---

## Stage 3 (1.0 Release, offline) — Task Board

Goal (GDD §5): a complete, shippable single-player 1.0 — more world, full quest
content, crafting + set bonuses, more Legendary encounters, a full balance pass,
and itch.io packaging. **Stage-3 task IDs are letters (A–V)** to stay distinct
from the Stage-2 numeric IDs referenced in the session log.

**🟢 Parallel-safe batch (each owns a NEW module, no cross-dependencies beyond the
usual `index.html`/`css`/`main.js` button+modal+init neighbourhood — both-add,
trivial rebase):** **A, B, C, D, K, L, M, N, O, P, Q, R, S3, T, U, V**. That's
16 concurrently-claimable tasks — plenty for 4+ sessions to run without stepping
on each other; the integrator merges PRs one at a time and resolves rebases.
Content/systems tasks **E–J** touch shared data files (`map`/`actors`/`quests`/
`progression`/`cards`) — read their Notes for ordering (task **E** is a
foundational refactor that makes **F** conflict-free; **J** balance is `BLOCKED`
until content lands). A few flat-`effectiveStats` tasks (**B** sets, **N**
meridians, **U** gems) all add an independent additive line in the same
`progression.js` function — fine in parallel, just keep them separate hunks.

| # | Task | Owned files (yours to edit freely) | Shared files (edit minimally, expect to rebase) | Status | Owner | Branch | PR | Claimed |
|---|---|---|---|---|---|---|---|---|
| A | **Crafting & Forge** (GDD §5) — spend materials + spirit stones to upgrade/reforge gear (add a stat roll, repair-to-max, reroll within a rarity cap). ⚒ modal. | `js/crafting.js` *(new)* | `js/game.js` (wrappers), `js/items.js` (additive reforge/material helper), `index.html`/`css/style.css`/`js/main.js` (button+modal+init) | `CLAIMED` | choose-task-fxtfot | `claude/crafting-forge` | — | 2026-07-07 |
| B | **Gear set bonuses** (GDD §5) — item `setId` + N-piece set-bonus definitions that plug into the reserved `effectiveStats` hook. | `js/sets.js` *(new)* | `js/items.js` (add `setId` to some templates), `js/progression.js` (one add-set-bonuses line in `effectiveStats`), `js/ui.js` (tooltip shows set progress) | `AVAILABLE` | — | — | — | — |
| C | **Alchemy / consumables** (GDD §6.4) — brew pills from drops + stones: timed buff / instant Qi / instant XP, stored in a consumables pouch, used from the HUD. 🜁 modal. | `js/alchemy.js` *(new)* | `js/game.js` (wrappers + tick), `js/actors.js` (`player.consumables`), `index.html`/`css`/`js/main.js` | `AVAILABLE` | — | — | — | — |
| D | **Sparring / offline PvP-preview** (GDD §4.1, §6.5) — synthesize deterministic Actor stat-sheets for personas and let the player "spar" a Rival through the existing pure `resolveCombat`. The PvP hook, still offline. | `js/duel.js` *(new)*, `js/rivals.js` *(new)* | `js/profile.js` (a "Spar" button on rival rows — coordinate w/ owner), `index.html`/`css`/`js/main.js` | `AVAILABLE` | — | — | — | — |
| E | **World-data modularization (enabling refactor)** — extract `ZONES` from `map.js` into per-zone modules (`js/zones/*.js`) + a creature registry, so new zones/creatures are new files, not edits to shared `map.js`/`actors.js`. Unblocks conflict-free zone authoring. | `js/map.js` (refactor), `js/zones/` *(new dir)* | `js/actors.js` (creature registry), `js/game.js` (imports) | `AVAILABLE` | — | — | — | — |
| F | **Third zone — Core Formation tier** — a new area gated behind FE9, 3 new creatures + their Spirit Cards + a portal. **Do after E** (then it's just new files). | `js/zones/<zone>.js` *(new, after E)* | `js/actors.js`/`js/cards.js`/`js/map.js` (if E not yet landed), `js/progression.js` (realm gate — coordinate w/ H) | `AVAILABLE` | — | — | — | — |
| G | **Epic quest chain** (GDD §5) — one multi-step "epic quest" with a strong named (Epic/Legendary) reward, spanning existing zones. | `js/quests.js` (append the chain) | `js/items.js` (named reward item, additive) | `IN REVIEW` | pick-your-task-wakee5 | `claude/epic-quest-chain` | #14 | 2026-07-07 |
| H | **Core Formation realm + advanced techniques** (GDD §9.1) — add the 3rd realm to the ladder + tier-3/4 techniques for it. | `js/techniques.js` (additions) | `js/progression.js` (`REALMS` + `STAGE_XP`) — coordinate w/ F | `AVAILABLE` | — | — | — | — |
| I | **Second Legendary boss** (GDD §5) — a new calamity beast: own lair, cooldown, Epic/Legendary drop, boss Spirit Card. Consider refactoring `boss.js` into a small registry so bosses are data. | `js/boss.js` (→ registry) or `js/bosses/*.js` *(new)* | `js/cards.js`, `js/game.js`, `js/ui.js`, `css` | `AVAILABLE` | — | — | — | — |
| J | **Full balance pass + committed sim harness** (GDD §8.6) — commit a reusable headless balance-sim (`tools/`), then a full-range tuning pass (XP curve, drop rates, boss stats, market prices). Mostly **solo & late** — touches tuning constants across files. | `tools/balance.mjs` *(new)* | tuning constants in `progression.js`/`items.js`/`actors.js`/`boss.js` | `BLOCKED` | — | — | — | Do near the end, once most content (F–I) is in — otherwise you tune a moving target. |
| K | **Itch.io packaging & store page** (GDD §5) — `docs/STORE.md` draft (description, feature list, screenshot checklist), proper `<title>`/meta/OG + favicon, a one-file build/zip note, a `LICENSE`. | `docs/` *(new)*, `LICENSE`, `README.md` | `index.html` `<head>` only | `AVAILABLE` | — | — | — | — |
| L | **Accessibility & keyboard input** — arrow/WASD tile movement, number/Esc hotkeys for modals, `:focus-visible` audit, ARIA roles on map/modals. | `js/input.js` *(new)* | `js/main.js` (wire), `css/style.css`, light `index.html` (aria) | `AVAILABLE` | — | — | — | — |
| M | **Salvage / materials** — right-click "salvage" breaks unwanted gear into crafting materials (feeds task A). Materials are a stackable item type on `player`. | `js/salvage.js` *(new)* | `js/items.js` (material item shape), `js/game.js` (salvage wrapper), `js/ui.js` (context-menu entry), `css` | `AVAILABLE` | — | — | — | — |
| N | **Meridian talent tree** — a permanent passive point tree (earned per breakthrough, separate from stat points) that feeds `effectiveStats`. Own ☯ modal. | `js/meridians.js` *(new)* | `js/progression.js` (one add-line in `effectiveStats` + a points grant on breakthrough), `js/actors.js` (`player.meridians`), `index.html`/`css`/`main.js` | `AVAILABLE` | — | — | — | — |
| O | **Daily trials** — a rotating (wall-clock daily) challenge encounter with bonus rewards; one attempt per reset. | `js/trials.js` *(new)* | `js/game.js` (spawn/reward hook), `js/actors.js` (`player.trials` timestamp), `index.html`/`css`/`main.js` | `AVAILABLE` | — | — | — | — |
| P | **Hunt bounties** — a bounty board: "slay N of creature X" for stone/XP rewards, refreshed on a timer. Reads the existing bestiary kill counts. | `js/bounties.js` *(new)* | `js/game.js` (claim hook), `js/actors.js` (`player.bounties`), `index.html`/`css`/`main.js` | `CLAIMED` | pick-your-task-aj14ny | `claude/hunt-bounties` | — | 2026-07-06 |
| Q | **Sect disciple missions** — send hired disciples (task S sect) on timed wall-clock missions that return spirit stones / materials. Extends the Sect. | `js/sectmissions.js` *(new)* | `js/game.js` (tick + claim), `js/guild.js` (read members — no edit), `index.html`/`css`/`main.js` | `AVAILABLE` | — | — | — | — |
| R | **World events / calendar** — scheduled wall-clock buffs (e.g. "double drops", "bonus XP") that toggle on a repeating clock and surface in the HUD. | `js/events.js` *(new)* | `js/game.js` (apply the active event's multiplier in the reward path), `js/main.js`/`css` (HUD banner) | `AVAILABLE` | — | — | — | — |
| S3 | **Statistics / lifetime summary** — a read-only 📊 panel: total kills, stones earned, fights won/lost/drawn, time played, cards/codex %. Mostly derivable; add a couple of lifetime counters. | `js/stats.js` *(new)* | `js/game.js` (increment a few lifetime counters), `js/actors.js` (`player.stats`), `index.html`/`css`/`main.js` | `AVAILABLE` | — | — | — | — |
| T | **Fight replay & share** (GDD §8.6) — persist the last fight's `turns[]`, add a "replay" button + an export-shareable-log string (resolution is already decoupled from playback). | `js/replay.js` *(new)* | `js/ui.js` (a replay button on the combat panel), `js/main.js`, `css` | `AVAILABLE` | — | — | — | — |
| U | **Gem sockets / enchanting** — sockets on higher-rarity gear; slot gems (a dropped item type) for flat bonuses that flow through `effectiveStats`. | `js/sockets.js` *(new)* | `js/items.js` (`sockets` on templates + gem item type), `js/progression.js` (add gem bonuses in `effectiveStats`), `js/ui.js` (tooltip), `css` | `AVAILABLE` | — | — | — | — |
| V | **Ascension / New Game+** — at max realm, reset progression for a permanent "ascension" multiplier (kept across resets). A prestige loop for replay. | `js/ascension.js` *(new)* | `js/game.js` (reset-with-keep flow), `js/progression.js` (apply the multiplier), `js/actors.js` (`player.ascension`), `index.html`/`css`/`main.js` | `AVAILABLE` | — | — | — | — |

> **Parallelism note:** A–D, K, L each own a distinct new module → run concurrently. The shared-file neighbourhood (`index.html` button-panel + a pre-`</body>` overlay, a CSS section appended at EOF, a `main.js` import+init) is the same one every Stage-2 feature used — both-add merges, cheap rebase, integrator merges one PR at a time. E–I touch core data; sequence via their Notes (E→F; F & H coordinate on the realm/zone). J is last.

---

## Task Notes & cross-session comments

Append-only, newest first, per task. This is where sessions talk to each other.
Format: `- [YYYY-MM-DD · session <id>] <comment>`.

### Task A — Crafting & Forge
- [2026-07-07 · session choose-task-fxtfot] Claimed (branch `claude/crafting-forge`,
  off latest master). Plan, honoring the note below: `js/crafting.js` owns
  everything incl. its own ⚒ Forge modal (builds its own DOM like
  `loadouts.js`/`tutorial.js` → **no `index.html`/`ui.js` churn**). Additive
  `items.js` helpers only (`reforgeItem`/`upgradeItem` reusing the existing roll
  ranges; export the template lookup). `game.js` thin wrappers
  (`reforgeAction`/`upgradeAction`/`repairForgeAction`) that spend spirit stones
  (+ optionally sacrifice a same-slot item as "material") and persist. `main.js`
  one import + `initForge()`. `css` a `/* Crafting & Forge */` section at EOF.
  Nothing new persisted beyond what rides on `player`. Heads-up for Task M
  (salvage) & U (sockets): I only *read* item shape + add additive item helpers;
  M's materials can feed my cost model later. Verify headless + real-Chromium.
- [initial] New `js/crafting.js` owns the logic + its own ⚒ modal (build DOM in-module like `tutorial.js`/`loadouts.js` did → avoids `index.html`/`ui.js` churn). Reforge = reroll an item's stat values within its existing rarity/level (uses `items.js` roll helpers — read, or add a small additive `reforgeItem`). "Materials" can just be spirit stones + sacrificing a same-slot item. Persist nothing new beyond what rides on `player`. GDD §5 crafting.

### Task B — Gear set bonuses
- [initial] New `js/sets.js` defines sets (`setId` → { name, pieces, bonusPerCount }). Add `setId` to a few existing `items.js` templates (additive). The ONE pipeline hook: in `progression.js` `effectiveStats`, after gear/cards, add `setBonuses(player)` flat stats (the conventions doc already reserves "set bonuses" here). Show set progress in the `ui.js` item tooltip. GDD §5.

### Task C — Alchemy / consumables
- [initial] New `js/alchemy.js`: recipes (stones + a dropped material → a pill). Pills are consumables on `player.consumables` (additive, back-fill in `createGame`); using one grants a timed buff (reuse the `activeBuffs`/technique-buff shape so it flows through `effectiveStats`), or instant Qi/XP. Own 🜁 modal + a "use" affordance. Coordinate the buff shape with the technique buff list. GDD §6.4.

### Task D — Sparring / offline PvP-preview
- [initial] `js/rivals.js`: deterministic level-scaled Actor stat-sheets for personas (same roster). `js/duel.js`: a spar screen that calls the PURE `resolveCombat(playerCombatActor, rivalActor, seed)` — do NOT leak game state into combat.js. No stakes for 1.0 (bragging rights) or a tiny stone wager. Hook a "Spar" button onto the Profile rival rows — leave a note here + coordinate if `profile.js` is being actively edited. GDD §4.1 (PvP hook), §6.5.

### Task E — World-data modularization (enabling)
- [initial] Foundational refactor: move each zone's `ZONES[...]` block out of `map.js` into `js/zones/<id>.js`, and expose a creature registry so `CREATURE_TYPES` can be composed from per-zone creature files. `map.js` becomes loader + grid logic only. Keep behaviour identical (verify the existing zones still spawn/travel). This makes task F (and future zones) *new files* instead of `map.js`/`actors.js` conflicts. Ping the board when it lands so F can start clean.

### Task F — Third zone (Core Formation tier)
- [initial] A new area past Cindervein, gated behind FE9 (or the Core Formation realm from task H). 3 new creatures + their Spirit Cards + a stage-gated portal. **Easiest after task E lands** (then you just add files). If you start before E, expect to rebase `map.js`/`actors.js`/`cards.js`. Coordinate the realm gate with task H. GDD §5/§9.2.

### Task G — Epic quest chain
- [2026-07-07 · session pick-your-task-wakee5] IN REVIEW — PR #14. Shipped "The
  Heaven-Severing Blade" 5-step saga appended to `quests.js` + named-item system
  in `items.js` (`NAMED_ITEMS` + `mintNamedItem`, never in random loot).
  **Heads-up for the integrator / other item-touching tasks (A crafting, B sets,
  M salvage, U gems):** I made a **1-line branch in `game.js` `claimQuest`** +
  one import so a reward with `item.named` mints the fixed artifact (else it rolls
  as before) — `game.js` wasn't in this task's listed file set, but it's the
  shared reward path and the change is minimal & additive. Watch that anchor on
  rebase. Tested headless 31/31 + real `createGame`/`claimQuest` integration 7/7
  + Chromium boot (0 errors, quest count now 1/14).
- [2026-07-07 · session pick-your-task-wakee5] Claimed. Appending a multi-step
  epic quest to `js/quests.js` using the existing event-driven chain shape
  (onKill/onStage/onFace hooks), spanning both zones, with a hand-authored named
  Epic/Legendary reward item. Plan: add the reward as an additive template/mint
  helper in `items.js` (no change to existing drop tables — the named item is
  only grantable by this quest), and grant it through the existing quest-claim
  reward path so no `game.js`/UI changes are needed. Verifying headless that the
  chain advances and pays out. Branch `claude/epic-quest-chain`.
- [initial] Append a multi-step epic quest to `js/quests.js` (event-driven, same shape as the existing chain) with a strong named reward (an Epic/Legendary item authored in `items.js`). Self-contained in `quests.js` + one item — low conflict. GDD §5.

### Task H — Core Formation realm + techniques
- [initial] Add the 3rd realm to `progression.js` `REALMS` + extend `STAGE_XP` (keep the per-realm barrier-spike shape). Add tier-3/4 techniques in `techniques.js` gated to the new realm. Coordinate the realm index with task F's zone gate. Headless-verify the XP curve. GDD §9.1.

### Task I — Second Legendary boss
- [initial] Reuse everything the first boss did (Actor-shaped, `resolveCombat`, reward branch). Cleanest: refactor `boss.js` to hold a small `BOSSES` registry (data) + generic manifest/defeat logic, then add the 2nd boss as data + a card. Coordinate with whoever owns `boss.js`. New lair tile, own cooldown, Epic/Legendary drop + boss Spirit Card. GDD §5.

### Task J — Balance pass + sim harness
- [initial] BLOCKED until most content (F–I) is on master — tuning a moving target wastes work. Commit the ad-hoc scratchpad sims as `tools/balance.mjs` (importable, no browser), then tune XP curve / drop rates / boss stats / market prices across the full level range. GDD §8.6.

### Task K — Itch.io packaging & store page
- [initial] `docs/STORE.md` (store description, feature bullets, screenshot shot-list), a `LICENSE`, and `index.html` `<head>` polish (title/meta/OG/favicon — note the polish pass already added an inline ☯ favicon; don't regress it). A short "how to zip & upload to itch.io" note. Low conflict (docs + `<head>`). GDD §5.

### Task L — Accessibility & keyboard input
- [initial] New `js/input.js`: arrow/WASD → move to the adjacent tile (reuse `tryMove`), Esc closes the open modal, digit keys open panels. Audit `:focus-visible` (the polish pass added a ring — build on it) and add ARIA roles/labels to the map grid + modals. Wire from `main.js`; light `css`. GDD polish / a11y.

### Task M — Salvage / materials
- [initial] New `js/salvage.js` + a stackable "material" item type. Right-click a pack item → "Salvage" → destroys it for materials scaled by rarity/level. Feeds task A (Crafting) — coordinate the material shape with whoever owns A (leave a note). Shared: `items.js` (material item), `game.js` (wrapper), `ui.js` (context-menu entry).

### Task N — Meridian talent tree
- [initial] New `js/meridians.js`: a permanent passive tree (nodes give flat/%% stats or Qi/economy perks), points granted on breakthrough (separate pool from stat points). ONE `effectiveStats` add-line in `progression.js`, `player.meridians` on the player (back-filled). Own ☯ modal. Read the conventions doc — passive sources plug into `effectiveStats`.

### Task O — Daily trials
- [initial] New `js/trials.js`: a wall-clock daily challenge (one attempt per real day, `player.trials` last-attempt timestamp — same pattern as Qi regen). Reuses `resolveCombat`/spawn; bonus reward on win. Own modal + a HUD entry.

### Task P — Hunt bounties
- [2026-07-06 · session pick-your-task-aj14ny] Claimed. Branch `claude/hunt-bounties`
  off latest master. Plan: `js/bounties.js` owns a 🏹 bounty-board modal +
  provider (`createBountyProvider`), self-rendered (NOT touching `ui.js`).
  Bounties = "slay N of creature X" generated deterministically from a wall-clock
  time bucket (like the Pavilion/Recently-Active feeds), refreshed on a timer;
  progress is `player.bestiary[typeId].kills` minus a snapshot taken when the
  bounty is accepted, so **no `attack()` kill-hook needed** — pure read of
  existing kill data. `player.bounties` (additive field, lazy back-fill, no
  VERSION bump — same pattern as `player.rivals`) holds accepted/claimed state
  (bucket id, typeId, target, killSnapshot, claimed). Shared touches: `game.js`
  (thin `acceptBounty`/`claimBounty` wrappers that log + saveGame — well
  separated from other hooks), `index.html` (🏹 button + overlay), `css`
  (bounty section), `js/main.js` (init + a per-tick board refresh). Reward on
  claim = spirit stones + XP scaled to target creature level.
- [initial] New `js/bounties.js`: a board of "slay N of X" bounties refreshed on a timer, tracked against the existing `bestiary` kill counts (read-only) with a `player.bounties` progress/claim ledger. Own modal.

### Task Q — Sect disciple missions
- [initial] New `js/sectmissions.js`: send hired disciples (from task-S `guild.js`, read `getMembers()` — no edit) on timed wall-clock missions returning stones/materials to a mailbox-like tray. Own modal + a `game.js` tick. Nice synergy with the Sect + Salvage (M) material economy.

### Task R — World events / calendar
- [initial] New `js/events.js`: a deterministic repeating calendar (wall-clock buckets) of global buffs — "double drops", "+50% XP", "cheap repairs". The active event applies a multiplier in `game.js`'s reward path (one guarded line) + a HUD banner. No persistence (derive from the clock).

### Task S3 — Statistics / lifetime summary
- [initial] New `js/stats.js`: a read-only 📊 panel. Most values derive from the save (bestiary totals, cards/codex %, spirit stones); add a few lifetime counters to `player.stats` (fights won/lost/drawn, stones earned, ms played) incremented in `game.js`. Own modal.

### Task T — Fight replay & share
- [initial] New `js/replay.js`: the combat result already carries the full `turns[]` (resolution is decoupled from playback, GDD §8.6). Persist the last result, add a "Replay" button to the combat panel, and an "export log" string. Touches `ui.js` combat panel lightly.

### Task U — Gem sockets / enchanting
- [initial] New `js/sockets.js` + a "gem" drop item type. Higher-rarity gear rolls `sockets`; slotting a gem adds flat stats through `effectiveStats` (one add-line in `progression.js`, like set bonuses). Coordinate the `effectiveStats` hook ordering with tasks B (sets) and N (meridians) — they all add flat sources there; keep them independent, additive lines.

### Task V — Ascension / New Game+
- [initial] New `js/ascension.js`: at max realm, offer a prestige reset (wipe level/gear, keep cards/codex or convert to an "ascension" multiplier on `player.ascension`) applied in `progression.js`. A replay loop. Touches `game.js` reset flow — coordinate with the reset handler.

---

## Claim protocol (the atomic part)

Claiming is a push race against this branch. **First push wins.** The whole ritual:

```bash
# 1. Get the latest board
git fetch origin coordination
git checkout -B coordination origin/coordination

# 2. Edit ONLY this file: set your task's Status to CLAIMED and fill in
#    Owner (your session URL/short id), Branch (the feature branch you'll use),
#    and Claimed (UTC date). Then:
git add TASKS.md
git commit -m "claim: task <ID> (<session-id>)"

# 3. Push. This is the lock.
git push origin coordination
#    - Success  -> the task is yours. Go build.
#    - Rejected (non-fast-forward) -> someone else pushed first:
git fetch origin coordination
git reset --hard origin/coordination     # take their board
#      Re-read the board. If YOUR task is now taken, pick another and redo.
#      If a DIFFERENT task was claimed, redo your edit for your task and re-push.
```

Then build the actual feature on a **separate** branch off `master`:

```bash
git fetch origin master
# Name the branch after the FEATURE, not the session (e.g. claude/crafting-forge).
git checkout -B claude/<feature-name> origin/master
# ... implement, commit, push, open a PR into master ...
```

When your PR is open, flip your row to `IN REVIEW` (+ PR number) and push to
`coordination` again (same race rules). When it merges, flip to `DONE`.

**Abandoning a task?** Set your row back to `AVAILABLE` (clear Owner/Branch) and
push, so it frees up for someone else.

---

## How to keep merges clean

The claim board stops two sessions doing the *same* task. These rules stop their
*branches* from fighting over the same lines:

- **New system → new module.** Put the bulk of the work in your **owned** file(s).
  This is the project's core convention and the reason parallel work is viable.
- **Shared files are edit-minimally zones.** `js/game.js` (hooks/wrappers),
  `js/main.js` (wiring), `index.html` (buttons/modals), `css/style.css`. Add at
  well-separated anchor points; git auto-merges non-adjacent hunks.
- **Rebase before you merge.** Merge PRs into `master` **one at a time**, each
  rebased on the latest `master` first. The 2nd/3rd merges may need a small,
  mechanical integration fixup in the shared files — that's the only unavoidable
  residue, and it's cheap.
- **Status prose is a conflict magnet.** Per-task status goes in *this* board
  (row edits = both-add, trivial). Save the `CLAUDE.md` "Current status" /
  "Done" bullet for **your own PR only**, describing **your** feature.
- **Don't touch another task's owned files.** If you truly need to, coordinate by
  leaving a note in that task's row first.

---

## Session log (append-only; newest first)

Optional but helpful — a one-line breadcrumb per session so the next one has context.

- 2026-07-07 — pick-your-task-wakee5 — task G (Epic quest chain) IN REVIEW, PR #14. Note: minimal `game.js` claimQuest branch for named rewards (see Task G notes).
- 2026-07-07 — pick-your-task-wakee5 — claimed task G (Epic quest chain); P was taken in a claim race.
- 2026-07-06 — session_01Sty (integrator) — **Stage 2 complete** (all PRs #3,#5–#12 merged; strip #13 held until end of Stage 3). Opened the **Stage 3 (1.0) task board** above: 12 tasks A–L, with A/B/C/D/K/L as the parallel-safe starter batch for up to 4 concurrent sessions. Task E is a foundational refactor; F–I are content (sequence per Notes); J (balance) is blocked until content lands.
- 2026-07-06 — session_01Sty (integrator) — merged PRs #9 (boss), #8 (Profile), #10 (Achievements), #11 (Settings) — each rebased onto master with conflicts resolved, verified in-browser. All Stage-2 feature tasks DONE.
- 2026-07-06 — session_01Sty (integrator) — merged PR #7 (Combat Sets) + PR #6 (Save export, rebased & resolved); tasks 4 & 7 → DONE.
- 2026-07-06 — pick-your-task-wakee5 — tasks 4 & 8 (Save export, Achievements) built + PRs #6/#10.
- 2026-07-06 — session_01Sty — tasks S/2/7 (Sect, Onboarding, Combat Sets); seeded tasks 3/4/7/8/9.
- _(add entries here: `YYYY-MM-DD — session <id> — claimed/finished task <ID>: <note>`)_
