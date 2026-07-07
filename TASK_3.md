# TASK_3.md — Session #3 (Worker)

> Your dispatch file. **You write only this file.** Read `TASKS.md` for the full
> catalog/conventions and the **Dispatch protocol**; read other `TASK_*.md` only
> for context. You open PRs but **never merge** — #1 (manager) merges and resolves
> conflicts. When your active task is IN REVIEW, advance to the next queued task
> below without waiting on #1.

**Session role:** Worker · **Focus:** combat feel / playback
**Assigned by:** #1 (Task Manager) · **Updated:** 2026-07-07

---

## ▶ ACTIVE TASK — W · Combat feedback & "juice"

- **Status:** `IN REVIEW — PR #21` (branch `claude/combat-juice`, off latest master).
- **Branch:** `claude/combat-juice` (off latest `master`)
- **Owned files (yours):** `js/combatfx.js` *(new)*, `css/combatfx.css` *(new)*
- **Shared (edit minimally):** `js/ui.js` — ONE hook in `playCombat` to emit an
  fx event per turn; `index.html` `<head>` — add
  `<link rel="stylesheet" href="css/combatfx.css">`.
- **Goal:** make fights *feel* like fights. Floating damage / heal / crit numbers
  over the struck actor, a hit-flash + subtle shake, HP bars that animate down
  during playback, and a victory/defeat flourish on resolution.
- **Constraints:** purely presentational — read the existing per-turn `turns[]`
  data, mutate **no** game state. Gate motion behind `prefers-reduced-motion`
  (the polish pass established that pattern). Own a new sheet — do **not** append
  to `css/style.css`. Note the exact `playCombat` hook location in your Worker Log.
- **Verify (cloud — no localhost link):** real-Chromium playback of a fight shows
  numbers/flash/HP-tween, instant-combat mode still works, 0 console errors. Tell
  the author how to run locally in the PR body.

## ⏭ QUEUE (do these next, in order — no need to wait on #1)

1. **T · Fight replay & share** — branch `claude/fight-replay`. Owns `js/replay.js`.
   Shared: `js/ui.js` (a "Replay" button on the combat panel — same neighbourhood
   as your W hook, which is why it's yours), `js/main.js`, a css link. The combat
   result already carries the full `turns[]`; persist the last one, add replay +
   an "export log" shareable string. Reuse your W fx layer for the replay.

*(When the queue empties, ping #1 for a refill — don't grab a board row yourself.)*

---

## Worker Log (append-only, newest first — you own this section)

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
