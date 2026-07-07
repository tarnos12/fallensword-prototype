# TASK_2.md — Session #2 (Worker)

> Your dispatch file. **You write only this file.** Read `TASKS.md` for the full
> catalog/conventions and the **Dispatch protocol**; read other `TASK_*.md` only
> for context. You open PRs but **never merge** — #1 (manager) merges and resolves
> conflicts. When your active task is IN REVIEW, advance to the next queued task
> below without waiting on #1.

**Session role:** Worker · **Focus:** front-end / gear UX
**Assigned by:** #1 (Task Manager) · **Updated:** 2026-07-07

---

## ▶ ACTIVE TASK — U · Gem sockets / enchanting

- **Status:** `NOT STARTED` — starting now (Y → PR #27, Z → PR #32, both IN REVIEW).
- **Branch:** `claude/gem-sockets` (off latest `master`)
- **Owned files (yours):** `js/sockets.js` *(new)*, `css/sockets.css` *(new)*
- **Shared (edit minimally):** `js/items.js` (`sockets` on templates + a gem item
  type), `js/progression.js` (**one add-line** in `effectiveStats`, kept a separate
  hunk like the merged meridians/cards sources), `js/ui.js` (show sockets/gems in
  the item tooltip — **same tooltip region as Task Y**, kept in this session),
  `index.html` `<head>` (add `<link rel="stylesheet" href="css/sockets.css">`).
- **Goal:** higher-rarity gear rolls `sockets`; slotting a dropped "gem" item adds
  flat stats via one `effectiveStats` add-line. Sockets/gems shown in the item
  tooltip; slot/unslot via the right-click menu.
- **Constraints:** keep the `effectiveStats` add-line a separate hunk (coordinate
  ordering only if Task B/sets is also in flight). Own a new css sheet — do **not**
  append to `style.css`. Note the exact `ui.js` hook location in the Worker Log.
- **Verify (cloud — no localhost link):** headless (socketed gem → correct flat
  stat delta through `effectiveStats`; save round-trips gem state) + real-Chromium
  DOM check (tooltip shows sockets, 0 console errors). Tell the author how to run
  locally in the PR body.

## ⏭ QUEUE (do these next, in order — no need to wait on #1)

*(Empty — after U lands, ping #1 for a refill; don't grab a board row yourself.)*

<!-- previous queue item U promoted to ACTIVE above; original text kept for #1's reference:
   **U · Gem sockets / enchanting** — branch `claude/gem-sockets`. Owns
   `js/sockets.js` (+ own css). Higher-rarity gear rolls `sockets`; slotting a
   dropped "gem" item adds flat stats via **one add-line in `progression.js`
   `effectiveStats`** (like the merged meridians/cards sources — keep it a separate
   hunk). Shared: `js/items.js` (`sockets` on templates + a gem item type),
   `js/ui.js` (show sockets/gems in the item tooltip — **this is the same tooltip
   region as your Task Y, which is why U is yours**: keep both tooltip edits in
   this session so no other session touches that `ui.js` code). Coordinate the
   `effectiveStats` add-line ordering only if Task B (sets) is also in flight. -->

*(When the queue empties, ping #1 for a refill — don't grab a board row yourself.)*

---

## Worker Log (append-only, newest first — you own this section)

- [2026-07-07] **Z done → PR #32.** New `css/responsive.css` (owned; **`style.css`
  untouched**), linked **last** in `index.html` `<head>` so its media rules win.
  Presentation-only — **no `js`/`ui.js`** (tiles/nav are already `<button>`s, so
  tap = click and tap-to-move works natively). **`index.html` touch for #1's
  rebase:** two lines only — (a) `viewport-fit=cover` added to the existing
  viewport `<meta>`; (b) a `<link rel="stylesheet" href="css/responsive.css">`
  right after the `style.css`/`itemcompare.css` links. Key CSS: `.tile{min-width:0}`
  (the inline `repeat(N,1fr)` map grid couldn't shrink otherwise) + `#nav-menu`
  → fixed bottom dock at ≤620 + `auto-fill` pack grid in the 621–900 tablet band
  = zero horizontal overflow 320→900px. Verified 10 Chromium DOM checks across
  7 widths, 0 console errors. Advancing to U.
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
