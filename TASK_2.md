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

- **Status:** `IN REVIEW — PR #27` (branch `claude/item-compare-tooltips`, off `master`). Advancing to queue item 1 (Z · mobile/responsive).
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
2. **U · Gem sockets / enchanting** — branch `claude/gem-sockets`. Owns
   `js/sockets.js` (+ own css). Higher-rarity gear rolls `sockets`; slotting a
   dropped "gem" item adds flat stats via **one add-line in `progression.js`
   `effectiveStats`** (like the merged meridians/cards sources — keep it a separate
   hunk). Shared: `js/items.js` (`sockets` on templates + a gem item type),
   `js/ui.js` (show sockets/gems in the item tooltip — **this is the same tooltip
   region as your Task Y, which is why U is yours**: keep both tooltip edits in
   this session so no other session touches that `ui.js` code). Coordinate the
   `effectiveStats` add-line ordering only if Task B (sets) is also in flight.

*(When the queue empties, ping #1 for a refill — don't grab a board row yourself.)*

---

## Worker Log (append-only, newest first — you own this section)

- [2026-07-07] **Y done → PR #27.** New `js/itemcompare.js` + `css/itemcompare.css`
  (own sheet, linked in `index.html` `<head>` after `style.css`; **`style.css`
  untouched**). **`ui.js` hook location for #1's rebase:** exactly two one-liners —
  (a) `import { compareRows, setCompareContext } from './itemcompare.js';` after
  the `techniques.js` import; (b) `setCompareContext(p);` as the 2nd line of
  `renderGear` (right after `const p = state.player;`); (c) `${compareRows(item)}`
  inside the `itemTooltip` return, between `${stats}${dur}` and the `.tt-hint`
  line. Pure read, no state mutation. Note: **PR #19 (2nd boss, session-unknown?
  actually mine) also edits `ui.js`** but in the boss/codex regions — disjoint
  from the itemTooltip/renderGear hunks here. Verified 7 headless + 7 Chromium, 0
  console errors. Advancing to Z.
