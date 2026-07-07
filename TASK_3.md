# TASK_3.md — Session #3 (Worker)

> Your dispatch file. **You write only this file.** Read `TASKS.md` for the full
> catalog/conventions and the **Dispatch protocol**; read other `TASK_*.md` only
> for context. You open PRs but **never merge** — #1 (manager) merges and resolves
> conflicts. When your active task is IN REVIEW, advance to the next queued task
> below without waiting on #1.

**Session role:** Worker · **Focus:** combat feel / playback
**Assigned by:** #1 (Task Manager) · **Updated:** 2026-07-07

---

## ▶ ACTIVE TASK — S3 · Statistics / lifetime summary

**#1 refill (2026-07-07):** great work on W + T — both merged (#21, #22... W=#21, T=#23 pending merge). New assignment below.

- **Status:** `ASSIGNED` → set to `IN REVIEW — PR #NN` here when your PR is open.
- **Branch:** `claude/lifetime-stats` (off latest `master`)
- **Owned files (yours):** `js/stats.js` *(new)*, `css/stats.css` *(new — link in `<head>`)*
- **Shared (edit minimally):** `js/game.js` (increment a few lifetime counters at
  the existing kill/reward hooks — well-separated additive lines), `js/actors.js`
  (`player.stats = {}` on `createPlayer`, lazily back-filled — no VERSION bump),
  `index.html` `<head>` (css link) + a 📊 button (inject it from `stats.js` into
  `#nav-menu` like `crafting.js` does, to avoid `index.html` body churn), `js/main.js` (init).
- **Goal:** a read-only 📊 **Chronicle of Deeds** modal. Most values **derive** from
  existing save data (bestiary kill totals, cards/codex %, spirit stones on hand);
  add only a few genuine lifetime counters that can't be derived — fights
  won/lost/drawn, total stones earned, ms played — incremented in `game.js`.
- **Constraints:** self-contained like `crafting.js`/`meridians.js` — own button +
  modal DOM, **no `ui.js`**. Own stylesheet, **not** appended to `style.css`.
  `player.stats` additive + back-filled; no VERSION bump.
- **Verify (cloud — no localhost link):** headless (counters increment on
  kill/win/loss; derived totals match a known save) + real-Chromium (📊 opens,
  numbers render, 0 console errors). Tell the author how to run locally in the PR.

## ⏭ QUEUE (do next — no need to wait on #1)

1. **R · World events / calendar** — branch `claude/world-events`. Owns
   `js/events.js` (+ own css). A deterministic repeating wall-clock calendar of
   global buffs ("double drops", "+50% XP", "cheap repairs") — derive the active
   event from the clock (no persistence, like the Recently-Active feed). Shared:
   `js/game.js` (one guarded multiplier line in the reward path), `js/main.js`/css
   (a HUD banner showing the active event + time remaining). Nice synergy with your
   stats panel (surface the active event there too if easy).

*(When the queue empties, ping #1 for a refill — don't grab a board row yourself.)*

## ✅ COMPLETED THIS SESSION

- **W · Combat feedback & "juice"** — **MERGED, PR #21**, branch `claude/combat-juice`.
- **T · Fight replay & share** — **`IN REVIEW — PR #23`**, branch `claude/fight-replay`
  (touches no `ui.js`; injects its own ⟳ Replay / ⧉ Share-log controls; stacks
  cleanly on W). Awaiting #1 merge.

---

## Worker Log (append-only, newest first — you own this section)

- [2026-07-07] T done → **PR #23**, `claude/fight-replay` (off master). New
  `js/replay.js` + `css/replay.css`. **Does NOT touch `ui.js`** — the ⟳ Replay /
  ⧉ Share-log buttons are injected into `#combat-panel .combat-buttons` from
  `replay.js` itself, and `main.js` records the fight in `onAttack` + drives
  replay via a shared `runPlayback` helper (controls hidden during live playback,
  shown on finish). Last fight persisted under its own localStorage key
  (`fallen-immortal-lastfight`, JSON snapshot; not the save schema). `exportLog()`
  builds a shareable transcript. Stacks cleanly on PR #21 (no `ui.js` overlap);
  replays inherit the W fx layer once #21 lands. Verified: headless 13/13 +
  real Chromium 12/12, 0 console errors. **Queue empty — pinging #1 for more.**
- [2026-07-07] W done → **PR #21**, `claude/combat-juice`. New `js/combatfx.js`
  + `css/combatfx.css` (own sheet, linked in `<head>` after style.css — did NOT
  append to style.css). **Exact `ui.js` hooks in `playCombat`** (for the T
  session / rebasers): (1) `beginFx(result, isInstant())` immediately after the
  `$('combat-title').textContent = ...` line; (2) `turnFx(result.turns[i])`
  inside `showNext`, right after `log.insertAdjacentHTML('beforeend', lines[i])`
  and before `i++`; (3) `endFx(result)` inside `finish()`, right after
  `close.classList.remove('hidden')`. Plus the import at the top of ui.js:
  `import { beginFx, turnFx, endFx } from './combatfx.js';`. All presentational —
  reads `result.turns[]`/`result.monster` only, mutates no state; player start-HP
  derived from turn 1. Instant mode builds no arena; motion gated behind
  `prefers-reduced-motion`. Verified real Chromium: fight shows floating
  dmg/crit/miss numbers (observed 3 floats: 2 crit, 1 miss), HP-bar tween to 0%,
  victory flourish; instant mode = no arena but resolves; 0 console errors.
  **Next up: T (Fight replay & share)** — reuses this fx layer; the combat panel
  `ui.js` neighbourhood is mine, so no cross-session collision.
