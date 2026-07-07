# TASK_4.md — Session #4 (Worker)

> Your dispatch file. **You write only this file.** Read `TASKS.md` for the full
> catalog/conventions and the **Dispatch protocol**; read other `TASK_*.md` only
> for context. You open PRs but **never merge** — #1 (manager) merges and resolves
> conflicts. When your active task is IN REVIEW, advance to the next queued task
> below without waiting on #1.

**Session role:** Worker · **Focus:** global UX infrastructure
**Assigned by:** #1 (Task Manager) · **Updated:** 2026-07-07

---

## ▶ ACTIVE TASK — X · Unified toast / feedback system

- **Status:** `IN REVIEW — PR #22`
- **Branch:** `claude/toast-system` (off latest `master`)
- **Owned files (yours):** `js/toast.js` *(new)*, `css/toast.css` *(new)*
- **Shared (edit minimally):** `js/main.js` — route a few high-signal events
  through `toast(...)`; `index.html` `<head>` — add
  `<link rel="stylesheet" href="css/toast.css">`.
- **Goal:** one queue-based toast API `toast(message, type)` where `type ∈
  {info, success, warn, error}`. Today feedback is buried in the Chronicle log;
  surface the high-signal moments — drops, breakthroughs, purchases, quest/bounty
  claims, and **errors** ("not enough spirit stones", "pack full") — as toasts.
- **Constraints:** **coordinate with the existing achievements toast** (in
  `js/achievements.js`) — either absorb it into your system or match its visual
  language so there aren't two competing toast styles (note which you chose in
  your Worker Log). No new save fields. Own a new sheet — do **not** append to
  `css/style.css`.
- **Verify (cloud — no localhost link):** headless queue logic (enqueue/dequeue,
  types, no overlap) + real-Chromium (trigger a drop / an error → toast appears
  and auto-dismisses, achievements still toast, 0 console errors). Tell the author
  how to run locally in the PR body.

## ⏭ QUEUE (do these next, in order — no need to wait on #1)

1. **AA · Theme system (light/dark) + design-token refresh** — branch
   `claude/theme-system`. Owns `js/theme.js` (own localStorage key
   `fallen-immortal-theme`, applies `data-theme` on `<html>` — not the save
   schema) + `css/theme.css` (formalized token layer + a light palette). Promote
   the polish-pass tokens (`--radius`, `--gold-soft`, `--ring`…) to the single
   source of truth; add a light theme that reskins via tokens only. Add the toggle
   to the ⚙ Settings modal (low-touch `settings.js`). Default stays dark.

*(When the queue empties, ping #1 for a refill — don't grab a board row yourself.)*

---

## Worker Log (append-only, newest first — you own this section)

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
