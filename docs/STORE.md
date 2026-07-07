# Fallen Immortal — itch.io store page draft

Copy-paste source for the itch.io project page. Fill the bracketed `[…]` bits at
upload time (URLs, screenshots). See **Publishing** at the bottom for the
zip-and-upload steps.

---

## Title

**Fallen Immortal**

## Tagline (≤ 80 chars — the itch "short description")

> A xianxia stat-crawler: cultivate, hunt demonic beasts, and ascend the realms.

## Classification (itch settings)

- **Kind of project:** HTML (playable in browser)
- **Genre:** Role Playing · Adventure
- **Made with:** Vanilla HTML/CSS/JavaScript (no engine, no build step)
- **Input:** Mouse, Keyboard
- **Average session:** A few minutes to hours (idle-friendly)
- **Accessibility:** Keyboard playable, light/dark theme
- **Price:** Free (or "Pay what you want") — *author's call*

## Tags

`rpg` · `xianxia` · `cultivation` · `idle` · `dungeon-crawler` · `fantasy` ·
`offline` · `singleplayer` · `stat-based` · `text-based` · `html5`

---

## Description (store body)

**Walk the long road to immortality.**

Fallen Immortal is an offline, browser-based cultivation RPG in the *xianxia*
tradition — no install, no account, no engine. It's pure stat-math: every fight
is a transparent, deterministic clash of Attack, Defense, Damage, Armor, and HP,
resolved instantly or watched turn-by-turn. Progress is measured in
**breakthroughs** through the cultivation realms, and the numbers are the game.

Step out from the sect gate into **Azuremist Vale**, hunt the demonic beasts that
haunt it, and push deeper — through a stage-gated portal into the cinders of
**Cindervein Gorge**, and on toward the realms beyond. Everything you do feeds the
same honest stat pipeline: allocate points on breakthrough, forge and temper
artifacts, learn techniques, collect Spirit Cards, and open your meridians.

### What you'll do

- **Cultivate & ascend** — climb the realm ladder (Qi Condensation → Foundation
  Establishment → beyond), each breakthrough a real power spike gated behind a
  steep XP wall.
- **Fight with your build, not your reflexes** — deterministic combat you can run
  instantly or replay swing-by-swing.
- **Hunt a living bestiary** — a Beast Codex that unlocks lore and stats as you
  kill, and **Spirit Cards** that drop as always-on passive bonuses.
- **Gear up** — a full rarity ladder (Common → Mythic) with unique artifact types
  per tier, durability, repair, and a **Forge** to reforge and temper your best
  rolls.
- **Face a calamity** — a hand-authored **Legendary boss** with its own lair,
  cooldown, and the game's rarest drops.
- **Grow an economy** — the **Treasure Pavilion** auction house (buy, sell, and a
  mailbox), a **Sect** of hireable disciples granting passive buffs, **Hunt
  Bounties**, and **Daily Trials**.
- **Measure yourself** — a Profile with Rivals and a Recently-Active feed, offline
  **Sparring** against those rivals, and Achievements to chase.

### Built to respect your time

Qi regenerates on a **wall clock** — even while the tab is closed — and passive
income keeps accruing offline, so you can dip in for a few minutes or settle in
for a long session. Your whole save lives in your browser; **back it up or move
it to another device** with a copy-paste string or file. Light and dark themes,
full keyboard play, and a first-run tutorial round it out.

*No microtransactions. No servers. Just the climb.*

---

## Controls

- **Move:** click an adjacent tile, or use the **arrow keys / WASD**
- **Panels:** click the nav buttons, or press **1–9**
- **Close a dialog:** click away or press **Esc**
- **Everything else:** on-screen buttons; hover for tooltips

---

## Screenshot shot-list (capture 4–6 at a wide viewport, dark theme)

1. **The map + HUD** — the 10×10 grid with the ☯ player, danger-band tiles, a
   creature tile selected showing its inspect stats.
2. **Combat playback** — the turn-by-turn combat log mid-fight with a victory
   banner.
3. **Character + gear** — the two-per-row stat sheet beside the icon-grid
   inventory/equipment with a rarity tooltip open.
4. **Beast Codex** — a codex entry with its Spirit Card revealed.
5. **Treasure Pavilion** — the Browse tab full of NPC listings.
6. **One more system** — the Forge, Meridians, or the Legendary boss lair/victory
   banner. *(Optional: a light-theme shot to show the theme toggle.)*

> Tip: capture at ~1280×800 for crisp itch thumbnails. A 630×500 (or larger)
> **cover image** is required by itch — a cropped map/HUD shot with the title
> works well.

---

## System requirements

Any modern browser (Chrome, Firefox, Safari, Edge). No plugins, no download, no
account. Works offline once loaded. ES modules require it to be served over
http(s) — itch's own hosting handles that automatically.

---

## Publishing (zip & upload)

The game is fully static — the repository root **is** the build. To package:

1. From the project root, zip the runtime files (exclude git/docs/dev files):

   ```sh
   zip -r fallen-immortal.zip index.html css js GDD_Staged_Roadmap.md \
     -x '*.DS_Store'
   ```

   (At minimum you need `index.html`, `css/`, and `js/`. The GDD is optional.)

2. On itch.io → **Create new project**:
   - **Kind of project:** *HTML*
   - Upload `fallen-immortal.zip` and tick **"This file will be played in the
     browser."**
   - Set **Embed** → *Click to launch in fullscreen* (or a fixed frame, e.g.
     1280×800; the layout is responsive and also scales down to mobile).
   - Fill Title / Tagline / Description / Tags / screenshots from this file.
3. Save as a **draft**, open the preview, play a full loop to confirm it loads,
   then set to **Public**.

> Before publishing a release build, strip the testing conveniences (debug panel,
> testing kit, inflated `MAX_QI`/inventory) — see `CLAUDE.md` →
> "TESTING-ONLY — strip before demo".
