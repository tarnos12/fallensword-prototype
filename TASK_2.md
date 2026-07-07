# TASK_2.md — Session #2 (Worker)

> Your dispatch file. **You write only this file.** Read `TASKS.md` for the full
> catalog/conventions and the **Dispatch protocol**; read other `TASK_*.md` only
> for context. You open PRs but **never merge** — #1 (manager) merges and resolves
> conflicts. When your active task is IN REVIEW, advance to the next queued task
> below without waiting on #1.

**Session role:** Worker · **Focus:** front-end / gear UX
**Assigned by:** #1 (Task Manager) · **Updated:** 2026-07-07

---

## ▶ ACTIVE TASK — Y · Item comparison tooltips + inventory UX

- **Status:** `ASSIGNED` → set to `IN REVIEW — PR #NN` here when your PR is open.
- **Branch:** `claude/item-compare-tooltips` (off latest `master`)
- **Owned files (yours):** `js/itemcompare.js` *(new)*, `css/itemcompare.css` *(new)*
- **Shared (edit minimally):** `js/ui.js` — ONE hook in the item-tooltip render;
  `index.html` `<head>` — add `<link rel="stylesheet" href="css/itemcompare.css">`.
- **Goal:** hovering an *unequipped* artifact shows its stats **as deltas vs the
  currently-equipped piece in that slot** (▲green up / ▼red down / grey neutral),
  so a player reads "upgrade or not" at a glance. Plus rarity-tinted slot
  borders/glow, a clear "equipped" marker, tidier right-click actions.
- **Constraints:** pure read of equipped items / `effectiveStats` — **no state
  mutation**. Do **not** append to `css/style.css` (own a new sheet). Keep the
  `ui.js` touch to a single, well-separated hook and note its exact location in
  your Worker Log so #1 can rebase cleanly.
- **Verify (cloud — no localhost link):** headless delta math (equip A vs B →
  correct ▲/▼ per stat) + real-Chromium DOM check (hover shows deltas, 0 console
  errors). Tell the author how to run locally in the PR body.

## ⏭ QUEUE (do these next, in order — no need to wait on #1)

1. **Z · Mobile / touch & responsive overhaul** — branch `claude/mobile-responsive`.
   Owns `css/responsive.css` (linked **last** in `<head>` so it overrides). Shared:
   light `index.html` (viewport meta + a bottom-dock container), `js/main.js`
   (optional dock wiring). Mobile-first: bigger tap targets, bottom nav dock on
   small screens, tap-to-move map (reuse `tryMove`), `env(safe-area-inset-*)`,
   zero horizontal overflow at 320px. Build on the polish pass's ≤900/≤620px
   breakpoints, don't fight them.

*(When the queue empties, ping #1 for a refill — don't grab a board row yourself.)*

---

## Worker Log (append-only, newest first — you own this section)

- _(add entries as you work: `- [YYYY-MM-DD] <what/why/where the ui.js hook is>`)_
