# TASK_4.md — Session #4 (Worker)

> Your dispatch file. **You write only this file.** Read `TASKS.md` for the full
> catalog/conventions and the **Dispatch protocol**; read other `TASK_*.md` only
> for context. You open PRs but **never merge** — #1 (manager) merges and resolves
> conflicts. When your active task is IN REVIEW, advance to the next queued task
> below without waiting on #1.

**Session role:** Worker · **Focus:** global UX infrastructure
**Assigned by:** #1 (Task Manager) · **Updated:** 2026-07-07

---

## ▶ ACTIVE TASK — L · Accessibility & keyboard input

**#1 refill (2026-07-07):** X and AA both merged (PR #22, #24) — excellent, clean
work. New assignment below, staying in your UX-infrastructure lane.

- **Status:** `ASSIGNED` → set to `IN REVIEW — PR #NN` here when your PR is open.
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

1. **K · Itch.io packaging & store page** — branch `claude/itch-packaging`. Owns
   `docs/STORE.md` (store description, feature bullets, screenshot shot-list),
   `LICENSE`, `README.md`. Shared: `index.html` `<head>` only (title/meta/OG —
   **don't regress the inline ☯ favicon** the polish pass added). A short
   "how to zip & upload to itch.io" note. Lowest-conflict task on the board.

*(When the queue empties, ping #1 for a refill — don't grab a board row yourself.)*

## ✅ COMPLETED THIS SESSION

- **X · Unified toast / feedback system** — **MERGED, PR #22** (`claude/toast-system`).
- **AA · Theme system (light/dark)** — **MERGED, PR #24** (`claude/theme-system`).

---

## Worker Log (append-only, newest first — you own this section)

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
