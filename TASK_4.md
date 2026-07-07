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

- **Status:** `ASSIGNED` → set to `IN REVIEW — PR #NN` here when your PR is open.
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

- _(add entries as you work: `- [YYYY-MM-DD] <what/why/coordination note>`)_
