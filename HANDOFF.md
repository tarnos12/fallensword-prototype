# HANDOFF — Fallen Immortal

Read this first to resume cold. It captures the **live state** of the prototype,
how to run/verify/publish it, and what's open. Companion docs: `CLAUDE.md`
(how the team works), `PROJECT.md` (goal/stack/constraints), `GDD.md` (design
authority). This file is the current-state snapshot; when it and `PROJECT.md`
disagree, trust this file and the code.

_Last updated: 2026-07-28._

---

## What this is

Offline-first, xianxia, FallenSword-inspired **stat-math dungeon-crawler RPG**.
Pure HTML/JS/CSS ES modules under `js/` — **no build step** for local dev (open
`index.html` via a static server). The playable single-file build is a separate
bundling step (see "Publish the artifact").

- **Playable artifact:** https://claude.ai/code/artifact/de389f71-5bf3-4417-84fa-9152efaebb13 (favicon ☯)
- **Branch:** work happens directly on `master` (the author explicitly overrode
  the feature-branch rule for this project). Commit per task, push after.

---

## Core loop (current design)

Explore a maze-like zone → fight beasts on tiles → collect gear (rarities, sets)
→ sell/auction for spirit stones + Merit → spend Merit on premium upgrades →
level up, allocate stats, open the passive skill tree. Titans/Super-Elites/
Legendaries are rare-spawn tiers with better loot.

---

## Current state (after the latest session)

Recent, load-bearing changes — all committed to `master`, verified in Chromium
(0 console errors), balance gate green:

- **Maps are big room-and-corridor dungeons with a camera.** `js/map.js`
  generates a classic roguelike **rooms-and-corridors** layout (open rooms carved
  from solid rock, joined by L-corridors). Zones differ in size — Azuremist
  21×21, Cindervein 31×31, Stormcrown 41×41 (system scales toward ~100).
  `js/ui.js renderMap` renders only a fixed **11×11 camera window** centred on the
  player (clamped to edges), so the view stays one size and scrolls as you walk.
  Wall tiles are impassable (`tile.wall`); `tryMove` blocks walls + diagonal
  corner-cutting. Generation guarantees 100% of floor reachable and every portal/
  lair reachable.
- **No danger scaling.** Each zone spawns ONE flat weighted roster
  (`zone.spawns` is a flat array) across all floor tiles — fixed enemy types per
  zone, not distance-scaled. Spawn density is sparse (~0.6 monsters/open tile).
- **Portals are paired.** Each portal's `entryX/entryY` lands you ON the partner
  portal in the destination zone (not a corner). Boss lairs live at the far
  corners of their (now larger) zones — see `js/boss.js`.
- **Gem/socket system removed entirely** (module + all consumers + Jewelcraft UI).
- **Item durability removed entirely.** Gear never wears/breaks; always grants
  full bonuses. All repair/mend flows gone. Salvage still breaks unwanted gear
  into **spirit essence**, but essence currently has **no sink** (its only use was
  mending) — the Salvage Workbench is just a ledger now. _Open decision: give
  essence a use or remove salvage._
- **Qi regen:** base 1 Qi / 3s (was 48s). The Hall of Merit "Qi Current Talisman"
  is now a **flat +1 Qi/tick** upgrade (was a weak %). `MAX_QI = 1000`.
- **Skill tree** clicks always give toast feedback (a fresh player has 0 free
  meridian points → "break through to earn one"); affordable clicks allocate.
- **Treasure Pavilion + Hall of Merit are full pages**, not modals — they're
  tab-views (`#view-pavilion`, `#view-merit`) reached from the sidebar; the HUD
  ✧ Merit tile jumps to the Merit page.
- **Merit upgrades** have flat pricing (never rise) + concrete per-purchase
  descriptions. There's a testing shortcut to trade spirit stones → Merit at 10:1.
- **RPG item tooltips** (rarity-framed card), loot glyph on combat-win banners,
  a debug spawn bar (Legendary/Super-Elite/Titan + "Force 100% drops") that
  renders **without** `?dev=1` for prototype testing.

---

## Run & verify

**Serve (from the repo root, NOT a subdir):**
```
npx serve -l 5599 /home/user/fallensword-prototype
# open http://localhost:5599/            (root URL — `serve` strips the query on /index.html)
# open http://localhost:5599/?dev=1      exposes window.__fi and keeps the debug bar
```
`?dev=1` dev hook: `window.__fi = { state, attack, currentTile, tryMove, renderAll }`.
The debug spawn bar renders even without `?dev=1` (prototype build).

**Balance gate (must stay green):**
```
node tools/balance.mjs      # expect "ALL ROWS PASS"
```

**Headless browser checks** (used throughout; scratchpad is gitignored):
- Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- Install `playwright-core@1.44.0` + `esbuild` into `scratchpad/node_modules`
  (they don't persist across fresh containers).
- Skip the first-run tutorial: `localStorage.setItem('fallen-immortal-tutorial-seen','1')`
  then `document.getElementById('tutorial-overlay')?.remove()`.
- Gotcha: a lone favicon 404 in tests is benign. `pkill` returns exit 144
  (SIGTERM) — benign, but it can abort a compound bash line, so write test
  scripts with the Write tool rather than heredocs after a `pkill`.

**Verification bar:** actually drive the affected flow in Chromium and confirm
**0 console errors** + the behaviour, before claiming done.

---

## Publish the artifact (single self-contained HTML)

Bundler lives at `scratchpad/build-artifact.mjs` (regenerate if the scratchpad
was wiped — it esbuild-bundles `js/main.js`, inlines every CSS `<link>` from
`index.html` **in order** plus the 4 runtime-injected sheets — ascension,
meritshop, sectmissions, skilltree — and adds a shim that no-ops runtime
stylesheet-link injection since the CSS is already inlined). Output is
**content-only HTML** (no doctype/html/head/body) for the Artifact tool.

```
cd scratchpad && node build-artifact.mjs      # writes scratchpad/fallen-immortal.html
```
Then publish with the Artifact tool to the **existing URL**
`https://claude.ai/code/artifact/de389f71-5bf3-4417-84fa-9152efaebb13`, favicon ☯
(pass `url` since a new session didn't originally publish it). Verify the bundle
boots over a real http origin first (localStorage is denied on `setContent`'s
opaque origin). The strict artifact CSP blocks external hosts — everything must
be inlined (fonts are base64 in `css/style.css`; audio is WebAudio-synthesised,
no external files).

---

## Architecture pointers

- **Shell / integration (lead-owned):** `index.html`, `js/main.js`, `js/tabs.js`.
  Views are `.tab-view` sections with `data-tab`; the sidebar has `.tab-btn`
  entries. `tabs.js` TABS list must include every switchable view. `main.js`
  wires modules and holds the tab-change handler (`setTabChangeHandler`) that
  renders profile/pavilion/merit on show.
- **Map:** `js/map.js` (generation + camera-agnostic grid), `js/ui.js renderMap`
  (the camera window), `js/zones/*.js` (per-zone size/spawns/portals/keepOpen),
  `js/zones/registry.js` (composes zones), `js/titans.js` (Titan move/relocate —
  filters walls), `js/boss.js` (lair coords).
- **Items/combat/progression:** `js/items.js` (RARITIES, generate/mint, forge
  reforge/temper — **no durability**), `js/combat.js` (**pure resolver — keep it
  byte-for-byte pure**, never duplicate its math elsewhere), `js/progression.js`
  (`effectiveStats` = base+allocated+gear+meridians+sets, then %buffs, then
  ascension), `js/sets.js`, `js/meridians.js`, `js/techniques.js`.
- **Economy/UI modules:** `js/meritshop.js` (page), `js/ui.js` (pavilion page,
  tooltips, char-sheet, tile panel), `js/salvage.js` (essence ledger),
  `js/crafting.js` (forge), `js/save.js`, `js/debug.js`.

---

## Hard constraints

- `js/combat.js` stays a **pure resolver** — do not add side effects or duplicate
  its math.
- **Save-compatibility is NOT required** right now — breaking saves is fine (the
  author said so). Don't spend effort on migrations.
- The model id `claude-opus-4-8` must **never** appear in commits, PR bodies,
  code, or any pushed artifact — chat replies only.
- `scratchpad/` is gitignored (in-repo temp dir for test scripts/bundles).

---

## Hard-won lessons (don't relearn these the expensive way)

- **Never hand-roll stat scaling.** The engine is `base + perLevel·(lv−1)`
  (`js/actors.js`); boss stat blocks are literal. All tuning goes through
  `spawnCreature`/`resolveCombat`/`effectiveStats`, gear-sampled, and is gated by
  `node tools/balance.mjs`. Past builds shipped hand-modeled balance numbers that
  were wrong — verify against the real engine, not a mental model.
- **Kill stale dev servers before Chromium checks.** A lingering `npx serve` once
  served a pre-change module graph and made a correct feature look broken. Fresh
  port per check; kill it after.
- **Serve the repo root** — `npx serve` from a subdir (or hitting `/index.html`
  with a query) 404s or drops `?dev=1`. Use `http://localhost:PORT/?dev=1`.
- **First-run tutorial blocks map interaction** in smoke tests — set
  `fallen-immortal-tutorial-seen=1` and remove `#tutorial-overlay` before driving.
- **Bundle CSS by parsing `index.html` link order**, not a hand-listed set — a
  hand list once dropped responsive/fix sheets from the artifact. Include the
  runtime-injected sheets too.

---

## Open items / decisions pending

1. **Spirit essence has no sink** since durability/mending were removed. Decide:
   repurpose essence (crafting?) or remove the salvage system.
2. **Fixed per-zone spawns** mean a low-level player can meet a zone's hardest
   enemy near the start (weighted rare); those fights resolve as non-lethal
   draws. Confirm that's desired or gate the toughest enemy further.
3. **Debug spawn bar ships in the public artifact** (renders without `?dev=1`).
   Re-gate behind `?dev=1` before any real player-facing cut.
4. **Zone sizes** are 21/31/41; the system supports up to ~100. Save is ~438 KB
   at current sizes — watch localStorage budget if zones grow much larger.
5. `PROJECT.md`'s "Current status" section predates this session's redesign —
   refresh it (or point it at this file) when convenient.
