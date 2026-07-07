# TASK_2.md — Session #2 (Worker)

> Your dispatch file. **You write only this file.** Read `TASKS.md` for the full
> catalog/conventions and the **Dispatch protocol**; read other `TASK_*.md` only
> for context. You open PRs but **never merge** — #1 (manager) merges and resolves
> conflicts. When your active task is IN REVIEW, advance to the next queued task
> below without waiting on #1.

**Session role:** Worker · **Focus:** front-end / gear UX
**Assigned by:** #1 (Task Manager) · **Updated:** 2026-07-07

---

## 📨 Inbox from #1 (only #1 writes here — read every sync)

- **[2026-07-07 · #1→#2] AB (#36) and B (#38) both MERGED — excellent, the whole
  UX overhaul is in. REFILL below (one task — the Stage-3 board is nearly drained):**
  1. **ACTIVE → M · Salvage / materials** — branch `claude/salvage-materials`. Owns
     `js/salvage.js` (+ own css). Right-click an unwanted pack item → **Salvage** →
     destroys it for **materials** scaled by rarity/level. Materials are a **stackable
     item type** on `player` (additive field, back-filled, no VERSION bump). Shared:
     `js/items.js` (a material item shape — additive), `js/game.js` (a `salvage`
     wrapper), `js/ui.js` (a "Salvage" entry in the **right-click context menu** —
     that's a *different* `ui.js` region than the item-tooltip you already own from
     Y/U/B, so a clean separate hunk), own css link. Materials can feed the merged
     **Crafting/Forge** cost model later — you don't need to wire that now, just
     define a sane material shape. Verify headless (salvage yields scale w/ rarity;
     stack math) + real Chromium (context-menu entry works, 0 errors).
  - **Heads-up:** after M, the Stage-3 content board is essentially complete — expect
    your next refill to be either a polish/bugfix pass or the start of a new stage.
    Ping me via Outbox when M is in review.
- **[2026-07-07 · #1→#2] FYI the ~15px desktop inventory-grid overflow you flagged in
  the AB PR is noted as a follow-up; not your problem to fix in M.**

---

## ▶ ACTIVE TASK — B · Gear set bonuses

- **Status:** `IN REVIEW — PR #38`. **Queue empty — awaiting a refill from #1.** (AB → PR #36, B → PR #38; both IN REVIEW.)
- **Branch:** `claude/gear-sets` (off latest `master`)
- **Owned files (yours):** `js/sets.js` *(new)*, `css/sets.css` *(new, if needed)*
- **Shared (edit minimally):** `js/items.js` (`setId` on a few templates),
  `js/progression.js` (**ONE add-line** in `effectiveStats` — the reserved set-bonus
  hook, a separate hunk like the merged cards/meridians/sockets sources), `js/ui.js`
  (tooltip shows set progress — **same tooltip region I already own from Y/U**).
- **Goal:** item `setId` + N-piece set-bonus definitions that plug into the reserved
  `effectiveStats` hook; the item tooltip shows set progress (e.g. "Ashen Reverie 1/2").
- **Constraints:** keep the `effectiveStats` add-line a separate hunk. Additive `setId`
  on templates only (don't disturb roll ranges). Note the exact `ui.js` hook in the log.
- **Verify (cloud — no localhost link):** headless (equip a full set → set bonus feeds
  `effectiveStats`; partial set → no bonus) + real-Chromium DOM (tooltip shows set
  progress, 0 console errors). Tell the author how to run locally in the PR body.

## ⏭ QUEUE (do these next, in order — no need to wait on #1)

*(Empty — after B lands, ping #1 for a refill; don't grab a board row yourself.)*

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

- [2026-07-07] **B done → PR #38.** New `js/sets.js` + `css/sets.css` (owned;
  **`style.css` untouched**). Three sets: Skydancer (Rare), Phoenix (Epic), Nine
  Heavens (Legendary) — matched weapon+robe pairs. **`progression.js`:** ONE add-line
  `setBonuses(player)` right after the socket block (sixth flat source; separate hunk;
  honours broken-gear rule). Import `setBonuses` after the `sockets.js` import.
  **`items.js`:** `setId` on the 6 member templates (additive) + `...(template.setId ?
  {setId} : {})` spread in `generateItem` (next to the sockets spread). **`ui.js`
  hook — same shared item-tooltip region as Y/U:** (a) import `{ setLine, setSetsContext }`
  after the `sockets.js` import; (b) `setSetsContext(p)` right after `setCompareContext(p)`
  in `renderGear`; (c) `${setLine(item)}` in `itemTooltip` between `${socketLine(item)}`
  and `${compareRows(item)}`. **`index.html`:** `<link>` to `css/sets.css` after
  `sockets.css`. Verified 27 headless + 8 Chromium DOM, 0 console errors — full set →
  tooltip "Skydancer Regalia (2/2)" + active bonus, `effectiveStats` +4/+4.
  **Queue empty — pinging #1 for the next assignment.**
- [2026-07-07] **AB done → PR #36.** New `css/hud.css` (owned; **`style.css`
  untouched**), linked **before** `css/responsive.css` so Z's ≤620 bottom nav dock
  still wins. **HUD:** `#player-bar` flat chips → labelled stat tiles; Qi + Breakthrough
  are meters. **Kept every `chip-*` id** as the value/text span (tutorial `#chip-qi` +
  `renderPlayerBar` bindings unchanged); added `bar-qi`/`bar-xp` fill elements.
  **`ui.js` hook for #1's rebase:** `renderPlayerBar` rewritten — same chip textContent
  assignments (shortened now labels are separate) **plus** two meter-fill lines
  (`barWidth('bar-xp', …)`, `barWidth('bar-qi', …)`) + a `pct`/`barWidth` helper above
  it. **`index.html`:** `#player-bar` restructured into `.hud-stat` tiles/meters; a
  `.nav-dock-title` `<h3>` added as first child of `#nav-menu` (non-button, so
  `input.js`'s `#nav-menu button` digit-nav is unaffected); `<link>` to `hud.css`.
  **Nav:** `#nav-menu` → titled `auto-fit` dock (CSS only; works for static + injected
  buttons). **`main.js` NOT needed.** Verified 88 Chromium checks @1280/768/375, 0
  console errors, all 14 nav buttons present + wired, mobile dock reconciled.
  **⚠ Flagged for #1:** a pre-existing ~15px desktop h-overflow from the fixed-54px
  inventory grid (`.item-slot`) reproduces on `master` — NOT introduced by AB; a small
  `auto-fill` inventory-grid follow-up would fix it. Advancing to B.
- [2026-07-07] **Refill acknowledged** — Y#27/Z#32/U#33 all merged by #1. Taking
  **AB · Navigation & HUD redesign** as ACTIVE (branch `claude/nav-hud-redesign`);
  **B · Gear set bonuses** queued next. AB is the structural one — reconciling the
  new nav with my own `css/responsive.css` bottom-dock (Z) in the same PR.
- [2026-07-07] **U done → PR #33.** New `js/sockets.js` + `css/sockets.css`
  (owned; **`style.css` untouched**). Rare+ gear rolls empty sockets; beasts drop
  loose gems; slotting a gem adds its flat stat. `sockets.js` owns the gem system
  + a self-contained 💎 Jewelcraft modal (button injected into `#nav-menu`, like
  Forge/Meridians) — slot/unslot happen there, NOT the right-click menu (cleaner
  than coupling `ui.js` to the modal). **Shared-file hunks for #1's rebase:**
  • `progression.js` `effectiveStats` — ONE add-line `socketBonuses(player)` right
    after the meridian block (fifth flat source; honours broken-gear rule). Import
    `socketBonuses` after the `meridians.js` import.
  • `items.js` — import `{ socketCountFor, generateGem, GEM_DROP_CHANCE }` from
    `./sockets.js` (one-directional, no cycle); `sockets` spread onto the object in
    `generateItem` + `mintNamedItem`; a gem branch in `rollDrop` (gems ride the
    existing loot path).
  • `ui.js` — **same shared item-tooltip region as Task Y** (that's why U is mine):
    (a) import line after the `itemcompare.js` import; (b) a gem branch at the top
    of `itemTooltip` + `${socketLine(item)}` between `${stats}${dur}` and
    `${compareRows(item)}`; (c) a gem branch in `makeItemSlot` (gem icon, no dura
    bar); (d) a gem guard in `renderGear`'s inventory loop (no equip-on-click).
  • `save.js` — persist a `gem` id counter alongside `item`/`creature` (additive,
    old saves default 0).
  • `main.js` — `initSockets(state, {slot,unslot})` + its import (+ `INVENTORY_SIZE`
    from `items.js` for the unslot pack-full check).
  • `index.html` — `<link rel="stylesheet" href="css/sockets.css">` (before
    `responsive.css` if Z merges first, so responsive stays last).
  Verified 37 headless + 9 Chromium DOM + 7 live-game checks, 0 console errors.
  **This empties my queue — pinging #1 for the next assignment.**
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

---

## 📮 Outbox — questions & replies (only YOU write here)

Post questions to #1 or (via #1) another session. Tag `#2→#target · OPEN`; flip to
`ANSWERED` once you've read the reply in your Inbox above. Keep working meanwhile.

- _(no questions)_
