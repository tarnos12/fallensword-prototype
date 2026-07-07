# TASK_4.md — Session #4 (Worker)

> Your dispatch file. **You write only this file.** Read `TASKS.md` for the full
> catalog/conventions and the **Dispatch protocol**; read other `TASK_*.md` only
> for context. You open PRs but **never merge** — #1 (manager) merges and resolves
> conflicts. When your active task is IN REVIEW, advance to the next queued task
> below without waiting on #1.

**Session role:** Worker · **Focus:** global UX infrastructure
**Assigned by:** #1 (Task Manager) · **Updated:** 2026-07-07

---

## 📨 Inbox from #1 (only #1 writes here — read every sync)

- **[2026-07-07 · #1→#4] ✅ Relayed your Core-Formation realm facts to #3's Inbox — thanks,
  clean answer. #3 will gate the third-zone (F) portal on `player.level >= 19` (CF1). No
  action needed from you; carry on with J (balance pass). You can drop that FYI from your
  Outbox whenever.**
- **[2026-07-07 · #1→#4] H (#34) and V (#37) both MERGED — the realm ladder + prestige
  loop are in. REFILL below — this is the big solo late-game task, now unblocked
  because the content it tunes (E/F/H/B/U/etc.) has essentially all landed:**
  1. **ACTIVE → J · Full balance pass + committed sim harness** (GDD §8.6) — branch
     `claude/balance-pass`. Two parts:
     (a) **Commit a reusable headless sim** at `tools/balance.mjs` — importable, no
         browser, wrapping the ad-hoc scratchpad-sim pattern (bulk `resolveCombat` /
         `generateItem` runs across the level range). This is the deliverable that
         makes future tuning repeatable.
     (b) **A full-range tuning pass** over the constants: XP curve (`progression.js`
         `STAGE_XP` — now 27 stages across 3 realms), drop rates (`items.js`), boss
         stats (`boss.js` — 2 calamities), market prices (`market.js`), creature
         stats (`actors.js` / `js/zones/*`). Aim: a smooth difficulty gradient with
         no dead zones or walls, gear/realm progression that *feels* earned.
  - **⚠ This touches tuning constants across many files** — it's the one task where
    that's expected and fine, precisely because it's going in **solo/last** while no
    other content PR is in flight (#3 is finishing F, #2 is on M — neither touches
    your tuning constants beyond additive zone data). Rebase once at the end if F/M
    landed meanwhile. Report the before/after curves in the PR.
  - After J, **Stage-3 content is complete** → then #1 merges the held strip-testing
    (#13) and the game hits **1.0**. Ping me via Outbox when J is in review.

---

## ▶ ACTIVE TASK — L · Accessibility & keyboard input

**#1 refill (2026-07-07):** X and AA both merged (PR #22, #24) — excellent, clean
work. New assignment below, staying in your UX-infrastructure lane.

- **Status:** `IN REVIEW — PR #25` — advancing to queue item 1 (K · itch packaging).
- **Branch:** `claude/keyboard-a11y` (off latest `master`)
- **Owned files (yours):** `js/input.js` *(new)* (+ a small `css/a11y.css` if you
  need focus/skip-link styles — own sheet, link in `<head>`, don't append to `style.css`)
- **Shared (edit minimally):** `js/main.js` (wire the input module once, near the
  other `init*` calls — reuse the existing `tryMove`/modal-close functions, don't
  duplicate them), light `index.html` (ARIA roles/labels on the map grid + modals;
  a skip link).
- **Goal:** make the game keyboard-playable and screen-reader-friendlier —
  **arrow/WASD** move to the adjacent tile (reuse `tryMove`), **Esc** closes the
  open modal, **digit keys** open the nav panels, a `:focus-visible` audit (build
  on the polish-pass ring), and ARIA roles/labels on the map + the seven-plus modals.
- **⚠ Coordinate with Task Z (mobile/touch, owner #2):** Z also adds map
  interaction + a `main.js` input hook and may add a nav dock. Keep **keyboard**
  (yours) and **touch** (Z) in **separate modules/hunks** and note your exact
  `main.js` wiring line in your Worker Log so #1 can rebase whichever lands second.
  You two don't need to sync directly — just stay in your own files.
- **Verify (cloud — no localhost):** headless (key→move maps to `tryMove`; Esc
  closes) + real Chromium (arrow keys move ☯, Esc closes a modal, focus ring
  visible on Tab, 0 console errors). Tell the author how to run locally in the PR.

## ⏭ QUEUE (do next — no need to wait on #1)

1. ~~**K · Itch.io packaging & store page**~~ — ✅ **IN REVIEW — PR #29**
   (`claude/itch-packaging`). Done — advancing to Q.
2. ~~**Q · Sect disciple missions**~~ — ✅ **IN REVIEW — PR #31**
   (`claude/sect-missions`). Done — footprint even smaller than planned (no
   `index.html`: self-injects button + modal + stylesheet like `crafting.js`).

**⚑ QUEUE EMPTY — @#1 please refill.** All assigned tasks shipped & in review:
X (#22✔merged), AA (#24✔merged), L (#25✔merged), K (#29), Q (#31). Idle and ready
for the next assignment — drop it in the ACTIVE TASK slot and I'll pick it up. Per
protocol I'm **not** grabbing a board row myself. Suggested fits for my UX/systems
lane if useful: **W · combat juice**, **Y · item-comparison tooltips**,
**T · fight replay & share**, or **R · world events** — your call.

*(When the queue empties, ping #1 for a refill — don't grab a board row yourself.)*

## ✅ COMPLETED THIS SESSION

- **X · Unified toast / feedback system** — **MERGED, PR #22** (`claude/toast-system`).
- **AA · Theme system (light/dark)** — **MERGED, PR #24** (`claude/theme-system`).

---

## Worker Log (append-only, newest first — you own this section)

- [2026-07-07] Queue item V · **Ascension / New Game+ IN REVIEW — PR #37**
  (`claude/ascension-ng-plus` → `master`). `js/ascension.js` + `css/ascension.css`:
  ✦ Ascension modal; at `player.level >= MAX_STAGE` a prestige reset wipes the run
  (level/gear/meridians/techniques/loadouts, stones→20) but keeps collections/meta,
  bumps `player.ascension`, and grants a permanent **+8%/tier** global stat scalar
  applied in `effectiveStats`. **No module cycle:** `progression.js` reads
  `player.ascension` directly (`?? 0`) with the shared `ASCENSION_STAT_PER_TIER`
  const; it does NOT import `ascension.js`. Self-injects button+modal+stylesheet —
  **no index.html/ui.js**. **Rebase heads-up for #1:** `progression.js` (1 const +
  a final scalar block at the end of `effectiveStats`), `game.js` (import +
  `ascend`/`canAscendNow` after `resetGame`), `actors.js` (`ascension: 0` in
  `createPlayer`), `main.js` (import + `initAscension` after `initSectMissions`).
  Verified headless + real Chromium (gated until max realm; ascend resets level,
  keeps cards, +8%/tier confirmed). **⚑ QUEUE EMPTY — @#1 please refill.** Both
  Inbox tasks shipped: H (#34) and V (#37). Idle & ready; suggested next in my
  lane: **W · combat juice**, **Y · item-comparison tooltips**, **T · replay**,
  **R · world events**, or the **I · second Legendary boss** — your call.
- [2026-07-07] Inbox task **H · Core Formation realm IN REVIEW — PR #34**
  (`claude/core-formation-realm` → `master`). `progression.js`: added Core
  Formation to `REALMS` (MAX_STAGE 27; CF1=lvl19..CF9=lvl27) + extended
  `STAGE_XP` (FE9→CF1 barrier 200k, then CF1→9 ~×1.4 to 2.65M). `techniques.js`:
  3 tier-4 CF capstones (min19) + a bridging Special tier-3 (Spirit-Severing
  Palm, FE5). Ladder is pure data so realmFor/stageName/applyBreakthroughs pick
  it up free — no save change. Verified headless (curve monotonic, both barriers
  spike ×2.2, applyBreakthroughs FE9→CF, prereqs resolve) + real Chromium (boots,
  new techs render, in-app MAX_STAGE=27, 0 errors). **Left #3 a note in my Outbox
  re: the realm index (Task F gates on this).** **Advancing to queue item V ·
  Ascension / New Game+ (branch `claude/ascension-ng-plus`).**
- [2026-07-07] Queue item 2 **Q · Sect disciple missions IN REVIEW — PR #31**
  (`claude/sect-missions` → `master`). `js/sectmissions.js` + `css/sectmissions.css`:
  🗺 Sect Dispatch modal, timed wall-clock disciple missions returning stones+XP,
  behind a `SectMissionProvider` (created in `createGame`). Reads
  `state.guildProvider.getMembers()` — **no guild.js edit**. Offline-safe (endsAt
  vs now, resolved in the per-second tick). Additive `player.sectMissions`
  ({active,tray}, lazy back-fill, no VERSION bump). **Footprint smaller than
  planned — NO `index.html`**: self-injects its button + modal + stylesheet like
  `crafting.js`. **Rebase heads-up for #1:** `game.js` (import + provider line in
  `createGame` after `bountyProvider` + 3 wrappers after the bounty wrappers);
  `main.js` (import + `initSectMissions` near the other inits +
  `updateSectMissionBadge` in `renderAll` + one `tickSectMissions(state)` line in
  the per-second interval). Verified headless + real Chromium (assign→tick→collect).
  **Queue now empty — requested a refill above.**

- [2026-07-07] Queue item 1 **K · Itch.io packaging IN REVIEW — PR #29**
  (`claude/itch-packaging` → `master`). Added `docs/STORE.md` (paste-ready itch
  store page + zip/upload steps), `LICENSE` (MIT © 2026 tarnos12 — flagged in the
  PR as a default to confirm), refreshed `README.md` (Stage 3 status + Controls +
  Build/Publish + License sections), and Open Graph/Twitter `<meta>` in
  `index.html` `<head>` (favicon/title/theme-color untouched). Verified: head
  integrity, the documented `zip` produces a working index.html+css+js bundle,
  page boots in real Chromium with 0 errors. **Rebase heads-up for #1:** only the
  `<head>` overlaps shared space, and only as added `<meta>` lines. **Advancing to
  queue item 2 (Q · Sect disciple missions, branch `claude/sect-missions`).**

- [2026-07-07] Task L **IN REVIEW — PR #25** (`claude/keyboard-a11y` → `master`).
  Shipped `js/input.js` + `css/a11y.css`: arrow/WASD move (reuses `onTileClick`),
  Esc closes the top modal, digits 1–9 open `#nav-menu` panels (queried live),
  guards for typing/modifiers/modal-open; `applyA11y()` sets role/aria on the map
  + every overlay (in JS, covers runtime-injected modals); skip link + `.sr-only`
  + `.tile:focus-visible` in `a11y.css`. No `ui.js`/`combat.js`/`style.css` edit,
  no save fields. Verified headless + real Chromium (arrow moves ☯ 0,0→1,0, digit
  opens codex, Esc closes, skip link focuses map, 0 errors).
  **@#2 (Task Z, mobile/touch) — coordination:** my ENTIRE `main.js` footprint is
  (1) `import { initInput } from './input.js';` and (2) ONE line at the very end of
  the init block, right after `initSettings();`:
  `initInput({ move: (dx, dy) => onTileClick(state.pos.x + dx, state.pos.y + dy) });`
  Keyboard logic is all in `js/input.js`; put your touch handler in your own module
  and add your own single wiring line — we won't share a handler, so whichever of
  L/Z lands second is a trivial both-add rebase for #1. `index.html`: I add a
  skip-link `<a>` (first body child) + one `<link>` in `<head>`.
  **Advancing to K · Itch.io packaging (branch `claude/itch-packaging`) now.**

- [2026-07-07] Queue item 1 **AA · Theme system IN REVIEW — PR #24**
  (`claude/theme-system` → `master`). Shipped `js/theme.js` + `css/theme.css`:
  `data-theme` on `<html>`, dark stays the `style.css` `:root` default, light
  palette = token overrides under `:root[data-theme="light"]` in `theme.css`
  (loaded after `style.css`) + targeted surface fixes for hardcoded colours
  (control fills, combat-log inset, player glyph, body gradient) — **no
  `style.css` edit**. Theme in its own localStorage key (not the save schema);
  inline `<head>` bootstrap sets `data-theme` pre-paint (no flash). Toggle
  self-injects into the ⚙ Settings modal; `settings.js` just calls
  `initThemeControl()`. Verified headless + real Chromium (tokens/panels/controls/
  text reskin, persist, pre-paint, 0 errors). **Rebase heads-up for #1:**
  `index.html` `<head>` gets a `<link>` + a 1-line bootstrap `<script>`;
  `settings.js` gets one import + one call at the top of `initSettings()`.
  Queue now empty — requested a refill above.
- [2026-07-07] Task X **IN REVIEW — PR #22** (`claude/toast-system` → `master`).
  Shipped `js/toast.js` + `css/toast.css`: queue-based `toast(msg,type)` (info/
  success/warn/error), cap 3 concurrent + pump, ~3.5s auto-dismiss, click-to-
  dismiss, `textContent`-only, `aria-live`/`role` + reduced-motion.
  **Achievements-toast coordination decision:** `achievements.js` is out of my
  file scope, so I did **not** edit/absorb it — instead I **matched its visual
  language** (panel card + coloured left accent + slide/fade) and put my toasts
  in a **separate `#toast-host` anchored top-centre** so the two never overlap
  (achievements stay bottom-right). Wired ~6 `main.js` callsites (combat drops/
  cards/breakthrough in `onAttack`, Qi error in `onTileClick`, market-buy +
  bounty accept/claim). No `ui.js` touch, no `style.css` append, no save fields.
  Verified headless (queue) + real Chromium (E2E, 0 console errors). Shared-file
  rebase heads-up for #1: `index.html` `<head>` gets one `<link>`; `main.js` gets
  an import pair + `initToasts()` + small edits inside the pavilion/bounty/attack
  handlers — all well-separated hunks. **Advancing to queue item 1 (AA · Theme
  system, branch `claude/theme-system`) now.**

---

## 📮 Outbox — questions & replies (only YOU write here)

Post questions to #1 or (via #1) another session. Tag `#4→#target · OPEN`; flip to
`ANSWERED` once you've read the reply in your Inbox above. Keep working meanwhile.

- **[#4→#3 (Task F, third zone) · FYI, via #1] Realm ladder facts for your zone gate.**
  H (PR #34) adds the 3rd realm as pure data in `progression.js`:
  - `REALMS[2] = { name: 'Core Formation', stages: 9 }` → `MAX_STAGE` is now **27**.
  - **Core Formation levels are 19–27** (CF1 = level 19, CF9 = level 27).
  - Gate your new-zone portal with **`player.level >= 19`** (CF1), the same way the
    Cindervein portal uses `minStage`. `stageName(19)` → `"Core Formation 1"`.
  - Your note said "gated behind FE9" — FE9 is level **18**; if you mean the zone
    should open at the start of Core Formation, use **19**. If you truly want it at
    FE9, use 18. Either works against this ladder.
  - The `STAGE_XP` extension and `REALMS` addition are one isolated hunk, so your
    zone/creature files won't conflict with mine. Ping #1 if you need anything else.
