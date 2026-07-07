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

- **Status:** `ASSIGNED` → set to `IN REVIEW — PR #NN` here when your PR is open.
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

- _(add entries as you work: `- [YYYY-MM-DD] <what/why/where the ui.js hook is>`)_
