# 10 — Cull, IA & Feel (Architect-Cull)

**Author:** Architect-Cull (Opus). The structural backbone the other three proposal docs build within.
Covers: (1) the system audit + CUT/KEEP/MERGE/DEFER ledger with save-migration blast radius, (2) the
IA / tab restructure (combat-on-side, Combat tab removed, Halls dissolved), (3) the visual-identity
direction ("make it look less like AI").

**DESIGN ONLY** — no code edited this pass. Everything below names exact files / functions / data
shapes so the build waves can execute directly.

---

## 0. Summary — the simplify mandate, in one paragraph

Fallen Immortal shipped ~18 gameplay systems, most surfaced as buttons inside the **Halls** tab or as
a **Combat** tab that exists only to replay a fight. The author's verdict — *"too many systems, all
hidden inside Halls… it's not fun"* — is correct: the Halls tab is a junk drawer of nine hard-coded
buttons plus eight more injected at runtime, and the collection/idle systems behind them (Spirit
Cards, Alchemy pills, Sect Dispatch, Daily Trials, world-event calendar, sparring/rivals) compete for
attention without feeding the core fantasy. **This proposal CUTS or DEFERS 10 systems, MERGES 6 into
the core surfaces that already imply them, and KEEPS the tight loop the author named.** The net
surface count drops from **5 tabs + 17 Halls buttons** to **5 tabs + 2 HUD icons + 0 Halls buttons**.

The headline structural moves:
- **Delete the Combat tab.** Combat resolves in a side-panel docked to the map (author §6).
- **Dissolve the Halls tab entirely.** `#nav-menu` and every button injected into it goes away;
  survivors are re-homed onto the surface that already owns their concept.
- Re-home the char-related systems into **three focused surfaces** (Cultivator, Equipment, Skills)
  and fold the meta/cosmetic systems (titles, achievements, chronicle) into one lightweight **Records**
  sub-panel instead of three separate modals.
- The **Auction House** and the new **Premium Shop** become persistent **HUD icons**, not tabs — the
  premium shop opens from the premium-currency icon exactly as the author asked.

---

## 1. The ledger — CUT / KEEP / MERGE / DEFER / ADD

Verdicts are against the author's focused core loop: **combat · equipment · auction house · premium
upgrade shop · leveling+stats · passive skill tree + few active abilities**. "Blast radius" = the
`save.js`/`effectiveStats`/cross-module refs a CUT or MERGE breaks (cuts are BREAKING — see §4).

### KEEP — the core loop (promote to first-class surfaces)

| System (file) | Verdict | Where it lives after | Note |
|---|---|---|---|
| Combat (`combat.js`, `combatfx.js`, `replay.js`) | **KEEP** | Map side-panel | `combat.js` stays a pure resolver; Combat *tab* deleted (§2). |
| Map / world (`map.js`, `zones/*`, `actors.js`) | **KEEP** | Map tab | CombatWorld adds Legendary/SE/Titan spawns + debug buttons. |
| Bosses (`boss.js`) | **KEEP** | Map (world content) | Extended by CombatWorld. |
| Equipment (`items.js`, `sets.js`) | **KEEP** | **Equipment tab** (new prominence) | Author pillar. CombatWorld owns the rarity/set rules. |
| Leveling + stats (`progression.js`) | **KEEP** | **Cultivator tab** | `effectiveStats` stays the single pipeline. |
| Auction house (`market.js`, `personas.js`) | **KEEP** | **HUD icon** (was Halls button) | Economy adds dual-currency (gold + premium). |
| Quests (`quests.js`) | **KEEP** (explicit, per lead) | Quests **top-level tab** | It's a first-class tab, **not** Halls clutter — the "too many systems hidden in Halls" complaint is about the nav-menu sprawl, not the quest tab. The two capstone sagas (Heaven-Severing Blade Legendary, Stormcrown Mythic) are our endgame item sources. Absorbs bounties (below). |
| Save / glue (`save.js`, `game.js`, `main.js`) | **KEEP** | — | Owns the cut-migration (§4). |
| Infra/UX (`ui.js`, `tabs.js`, `toast.js`, `theme.js`, `tooltips.js`, `input.js`, `itemcompare.js`, `combatfx.js`, `settings.js`, `tutorial.js`, `audio.js`) | **KEEP** | — | Presentation spine; `audio.js` gets the new SFX work. |

### PROMOTE — existing system becomes a named core pillar (Progression owns the redesign)

| System (file) | Verdict | Becomes | Cross-owner |
|---|---|---|---|
| Meridian tree (`meridians.js`) | **KEEP → PROMOTE** | The **passive skill tree** (author §6) on a new **Skills** surface | → Author-Progression |
| Techniques (`techniques.js`) | **KEEP → TRANSFORM** | The **few active abilities** — fewer nodes, **10+ min** durations, Qi-cast (today they're 45–120s; see `techniques.js` L18–90) | → Author-Progression |

### MERGE — fold into a surface that already implies it (kills a Halls button, keeps the value)

| System (file) | Verdict | Merges into | Migration blast radius |
|---|---|---|---|
| Forge (`crafting.js`) | **MERGE** | **Equipment tab** — reforge/temper/repair become inline actions on a gear row, not a modal | Isolated: only `main.js` imports it. No save fields (operates on existing items). Low. |
| Salvage (`salvage.js`) | **MERGE** | **Equipment tab** — "Salvage" already a gear-row action (`main.js` `onSalvage`). Keep salvage→value; **drop the bespoke essence-repair path** (duplicates Forge repair) | `player.materials` (essence) becomes orphan; salvage should pay **gold or premium** instead. `ui.js`, `game.js` ref it. Medium. Align essence→currency with Economy. |
| Loadouts (`loadouts.js`) | **MERGE** | **Equipment tab** + extra slots sold in the **Premium Shop** (FS-style) | `player.loadouts` KEPT (additive already). `game.js`+`main.js` ref it. Low. → Economy owns slot-gating. |
| Hunt Bounties (`bounties.js`) | **MERGE** | **Quests tab** — a rotating "hunt board" section; it is literally kill-X-for-reward | `player.bounties` (accepted) KEPT as data; drop the standalone modal + Halls button + badge. `game.js`+`main.js` ref it. Low–medium. |
| Titles (`titles.js`) | **MERGE** | **Cultivator → Records** sub-panel + keep the HUD title chip | Cosmetic; derives read-only from state. Only `main.js` imports it. Low. |
| Achievements (`achievements.js`) | **MERGE** | **Cultivator → Records** sub-panel | `player.achievements` KEPT. Imported by `game.js`, `stats.js`, `titles.js`, `main.js`. Low (data untouched, just re-homed). |
| Chronicle of Deeds (`stats.js`) | **MERGE** | **Cultivator → Records** sub-panel (same panel as titles/achievements) | `player.stats` KEPT. Only `main.js` imports the modal. Low. |
| Beast Codex (in `ui.js` + `cards.js` seen-set) | **MERGE** | A lightweight **bestiary reference** reachable from the Map monster panel (keep "seen" flavor; strip the card-collection grind — see cards CUT below) | Codex render lives in `ui.js`; the *card stat grind* is the part being cut. Medium — see cards. |

### CUT — remove from 1.0; not core, actively adds noise (BREAKING — needs migration §4)

| System (file) | Verdict | Why | Migration blast radius |
|---|---|---|---|
| **Spirit Cards** (`cards.js`) | **CUT** (keep bestiary flavor only) | The archetypal "collection grind hidden away" the author is complaining about; also a passive-stone idle source. | **HIGH — content re-tune, not a mechanical removal (Critic4-verified, see §4.4).** `cardBonuses` is a flat source in `effectiveStats` (`progression.js` L91) — removing it makes every existing save weaker. Imported by `ui.js`, `profile.js`, `game.js`, `achievements.js`, `progression.js`, `stats.js`, `titles.js` (7). `player.cards` → orphan. Passive `lastStoneTick` income (`tickStones`) shrinks. **The three calamity bosses (`boss.js`) were hand-tuned against a "maxed+buffed" sheet that explicitly includes all-cards** (`tools/balance.mjs` `playerAt(..., { cards: 'all', ... })`, L378/383/388) — cutting cards may require **re-authoring the boss stat blocks themselves**, not just re-running the harness. See §4.4. |
| **Alchemy** (`alchemy.js`) | **CUT** | A *second* timed-buff system competing with techniques/active abilities; pills are a stone sink → noise. Qi-restore function moves to the Premium Shop / natural regen. | Medium. `player.consumables` + `player.pillBuffs` → orphan; `applyPillBuffs`/`tickPillBuffs` removed from combat + tick path (`game.js`, `main.js`). No `effectiveStats` line (buffs are combat-time). → tell Economy the "restore Qi" sink moves to the shop. |
| **Daily Trials** (`trials.js`) | **CUT** | A daily-login retention gimmick, one fight/day, hidden in Halls. Not the core fantasy. | Low. `player.trials` → orphan; `attemptDailyTrial` + badge removed (`game.js`, `main.js`). Trivial to re-add later. |
| **World-event calendar** (`events.js`) | **CUT** | A cosmetic banner/calendar bucket; pure decoration hidden behind a HUD strip. | Low. `game.js`+`main.js` ref it; no save field of substance. |
| **Sect Dispatch** (`sectmissions.js`) | **CUT** | Timed idle "send disciple, wait, collect" busywork — the exact hidden-idle pattern being culled. | Low–medium. `player.sectMissions` → orphan; provider + badge removed (`game.js`, `main.js`). Depends on Sect (below). |
| **Fight replay/share** (`replay.js`) | **CUT-candidate** (author's call) | A share-a-fight novelty, not load-bearing. Cheap to keep; flag for the lead. | Low. Only `main.js`. Leave in if zero-cost; listed for honesty. |

### DEFER-2.0 — provider-shaped / multiplayer; keep the interface stub, remove from the 1.0 UI

| System (file) | Verdict | Why | Migration blast radius |
|---|---|---|---|
| **Sect / disciples** (`guild.js`) | **DEFER-2.0** | A fake-multiplayer roster on `GuildProvider`; the passive economy buff is the only single-player value. Belongs to the networked 2.0, per PROJECT.md's provider-era plan. | Medium. `player.guild` → dormant (keep field, hide UI). Imported by `ui.js`, `profile.js`, `game.js`. Keep `createGuildProvider` as the stub. |
| **Profile / Rivals / Sparring** (`profile.js`, `rivals.js`, `duel.js`) | **DEFER-2.0** | Fake-multiplayer PvP-preview; no PvP in the author's core loop. | Low (isolated: `main.js`→profile/duel, `duel`→rivals). Keep `ProfileProvider` stub for 2.0; remove the Halls buttons. |
| **Ascension / NG+** (`ascension.js`) | **KEEP (thin) — DEFER the T2 deepening** | The endgame prestige loop is one button + a `player.ascension` integer read straight in `effectiveStats` (L131). Cheap to keep as the long-tail. **Do NOT** build the comparison-doc T2 "chosen-unlock currency" this pass — it adds complexity against the simplify mandate. | Low. `player.ascension` KEPT (scalar source stays). Re-home its button off Halls (into Cultivator or a gate action). |
| **Gem Sockets** (`sockets.js`) | **DEFER (lean CUT) — CombatWorld decides** | A flat `effectiveStats` source (`progression.js` L107) + a whole gem drop/currency layer on top of the rarity redesign CombatWorld is already doing. One deepening layer too many for 1.0. | **HIGH if cut.** `socketBonuses` in `effectiveStats`; gem ids counter in `save.js` (L8, L29, L64); imported by `ui.js`, `items.js`, `progression.js`, `save.js`, `main.js` (5). **→ Author-CombatWorld owns rarities/sets — they arbitrate keep-vs-cut; I flag it as the single most tangled optional source.** |

### ADD — the author's new systems (owned by the other three docs; listed so the ledger nets honestly)

| Addition | Owner | Simplify check |
|---|---|---|
| Premium currency + **Premium Upgrade Shop** (icon-opened) | Author-Economy | The **consolidation home** for the MERGE'd sinks (respec, inventory slots, stamina/max-Qi, loadout slots, XP protection). It must *absorb* systems, not stack a new one. |
| Dual-currency auction house | Author-Economy | Extends KEEP, not a new surface. |
| Legendary / Super-Elite / Titan spawns + drop rates | Author-CombatWorld | New world content on the KEPT Map surface. |
| **Debug spawn bar + 100%-drop toggle above the map** | Author-CombatWorld | **Author-directed ADD** (author §4/§5). A visible debug bar above the map to spawn multiple Legendary/SE/Titan + force drops. **Lead ruling: this overrides PROJECT.md's PR-#13 "no always-on debug" policy for THIS testing phase** — do not reject on PR-#13 grounds. Note for release: make it **`?dev=1`-gateable** so it flips off cleanly before ship. Lives on the Map surface, above `#map-grid`. |
| Item rarity/set rules (Legendary=Set, SE=Set, Titan≠Set, Titan gives Qi-regen) | Author-CombatWorld | Reshapes `items.js`/`sets.js`, not a new surface. |
| Combat side-panel + 1–9 attack shortcuts | Author-CombatWorld (UI) ↔ this doc (IA) | Replaces the deleted Combat tab — net **−1** surface. |
| Passive skill tree + few 10-min actives | Author-Progression | Consolidates `meridians.js`+`techniques.js` — net **0** new, cleaner shape. |
| Sound effects | Lead synthesis / `audio.js` | Author §7. |

**Net ledger:** ADD 4 player-facing systems (premium shop, premium currency, new monster tiers,
titan mechanic) but CUT 5 (cards, alchemy, trials, events, sect-dispatch), DEFER 4 (sect, profile/
rivals/duel, ascension-deepening, sockets-lean), and MERGE 7 Halls buttons into existing surfaces.
**Surfaces go from 5 tabs + 17 Halls buttons → 5 tabs + 2 HUD icons.** This is a real simplification,
not a costumed addition.

---

## 2. IA / tab restructure

### 2.1 Delete the Combat tab; combat resolves on the side of the map

Today (`tabs.js` L17) tabs are `['map','combat','char','quests','halls']`, and `runPlayback` in
`main.js` (L223) calls `setActiveTab('combat')` to take over a whole screen just to show a log. The
`#view-combat` section (`index.html` L109–121) is nothing but a log + outcome + skip/continue buttons.

**New shape:** combat resolves **inline on the Map surface** in a side-panel docked beside the grid.
- Repurpose the existing right-hand `#tile-info` column on `#view-map` (`index.html` L102–106) to host
  a **combat side-panel**: the monster/tile list when idle, the live combat log + outcome when a fight
  is active. This is where Author-CombatWorld's presentation work lands — coordinate the DOM ids so
  `playCombat`/`combatfx` render into the map-side panel instead of `#view-combat`.
- `combat.js` **stays pure** — this is presentation only. Each attack still calls `resolveCombat`;
  the titan's move-and-chase counter is game-layer state (per the constraint).
- **Number keys 1–9** attack the monster in slot N of the current tile (Author-CombatWorld owns the
  handler; wire it through `input.js`, which already does digit-nav — see `input.js`).
- Remove `'combat'` from the `TABS` array (`tabs.js` L17), delete the `#view-combat` section and the
  `data-tab="combat"` tab button (`index.html` L88, L109–121), and drop the `setActiveTab('combat')`
  call in `runPlayback` (`main.js` L223 — **verified the only call site**) plus the
  `btn-close-combat`→`setActiveTab('map')` handler (`main.js` L453). **I (Architect-Cull, IA owner) am
  taking these `tabs.js` / `index.html` / `main.js` combat-tab-removal edits** — they are the
  "core-layout shared files" the self-contained-module rule carves out for the IA owner. Author-
  CombatWorld owns *what renders into* the relocated side-panel, not the tab-array/section teardown.
  This slice must be **one PR** since those three files are shared/single-owner.

**1–9 key collision — resolved with Author-CombatWorld.** Digit keys 1–9 are **already bound** in
`input.js` (L210–213) to `openNavPanel(n-1)` — "open the Nth Halls panel." Because this restructure
**dissolves the Halls nav-menu entirely**, that affordance is obsolete: there is no nav-menu to index
into. So the digit keys come free. **I remove the `openNavPanel` digit binding** (it's an IA/nav
concern) and **Author-CombatWorld rebinds 1–9 to "attack the monster in slot N"** (their combat
concern) — both edits land in `input.js`, so we coordinate a single `input.js` change or a clean
sequence. Recorded here per Critic4's flag; CombatWorld's doc should record the same resolution.
**Per the lead's ruling:** the nav shrink is *designed* so no surviving surface depends on 1–9 —
every re-homed destination is reached via a **tab** or a **HUD icon** (auction ◆, premium ✧, settings,
backup), never a digit shortcut. Because Halls is fully dissolved (not just shrunk), the digit keys are
unconditionally free for combat; there is no residual "open panel N" affordance to preserve.

### 2.2 The five core surfaces (Halls dissolved)

| Tab | Owns | Absorbs (was elsewhere) |
|---|---|---|
| **🗺 Map** | Grid, movement, tile/monster list, **combat side-panel**, debug spawn buttons | the whole Combat tab |
| **🧘 Cultivator** | Char sheet, stats, allocate points, breakthrough, Ascension button, **Records** sub-panel | Titles + Achievements + Chronicle (was 3 Halls modals); Ascension button (was injected into `#nav-menu`) |
| **⚔ Equipment** | Equipped artifacts, pack, item compare, **inline Forge** (reforge/temper/repair), **Salvage** action, **Loadouts** | Forge + Salvage + Loadouts (were Halls) |
| **🌳 Skills** | **Passive skill tree** (from `meridians.js`) + **active abilities** (from `techniques.js`) | Meridians (was injected into `#nav-menu`); techniques (was on the char tab) |
| **📜 Quests** | Quest chains, chronicle log, **Hunt board** | Bounties (was a Halls modal) |

**Two persistent HUD icons** (not tabs), living in the header near the currency readouts:
- **◆ Auction House** — opens the Treasure Pavilion overlay (was `#btn-pavilion` in Halls).
- **✧ Premium Shop** — opens on click of the **premium-currency icon** (author §6.4). Author-Economy
  owns the shop contents.

**Settings + Backup** stay as small utility icons (gear/save) in the header or a compact menu — they
do not need a tab.

> **Tighter 4-tab variant (flag for the lead):** merge **Cultivator + Equipment** into one
> **"Cultivator"** tab with stats on the left and artifacts on the right (they're both "your body/
> gear"), giving **Map · Cultivator · Skills · Quests**. I recommend the **5-tab** version because the
> author named *equipment* as its own headline pillar and it deserves the room; noting the 4-tab option
> because it's the most aggressive honest simplification.

### 2.3 What happens to Halls and `#nav-menu`

**Halls is deleted as a tab.** The `#nav-menu` container (`index.html` L163–174) is removed. Every
button that today lands in it must be re-homed or deleted:

| `#nav-menu` button | Source | Fate |
|---|---|---|
| 📖 Beast Codex | `index.html` hard-coded | → Map monster panel (bestiary reference) |
| 🏛 Treasure Pavilion | hard-coded | → HUD **◆ Auction House** icon |
| ⛩ Sect | hard-coded | **DEFER-2.0** — removed from UI |
| 👤 Profile & Rivals | hard-coded | **DEFER-2.0** — removed |
| 🏆 Achievements | hard-coded | → Cultivator **Records** |
| 🏹 Hunt Bounties | hard-coded | → Quests **Hunt board** |
| ⚙ Settings | hard-coded | → HUD utility icon |
| 🗓 Daily Trial | hard-coded | **CUT** |
| 🜁 Alchemy | hard-coded | **CUT** |
| ⚒ Forge | injected by `crafting.js` L164 | → Equipment (inline) |
| ♻ Salvage | injected by `salvage.js` L187 | → Equipment (inline) |
| Meridians | injected by `meridians.js` L181 | → **Skills** tab |
| Sockets/Jewelcraft | injected by `sockets.js` L289 | **DEFER** (CombatWorld) |
| Ascension | injected by `ascension.js` L139 | → Cultivator |
| Sect Dispatch | injected by `sectmissions.js` L231 | **CUT** |
| Titles | injected by `titles.js` L317/L362 | → Cultivator **Records** |
| Chronicle (Stats) | injected by `stats.js` L164 | → Cultivator **Records** |

**Count math (the simplify gate — verifiable by the lead/QA).** Halls today holds **17 entries**: 9
hard-coded in `index.html` (`#btn-codex`, `#btn-pavilion`, `#btn-sect`, `#btn-profile`,
`#btn-achievements`, `#btn-bounties`, `#btn-settings`, `#btn-trials`, `#btn-alchemy` — L165–173) + 8
self-injected at runtime (`crafting`⚒, `salvage`♻, `meridians`☯, `sockets`💎, `ascension`✦,
`sectmissions`, `titles`🏵, `stats`📊). (Critic4 estimated ~13 assuming market/guild/bounties/trials/
alchemy self-inject; they're actually hard-coded in `index.html` — the true figure is **17**.)
After the cull: **5 CUT** (trials, alchemy, sect-dispatch + the event banner + spirit-cards codex-grind),
**4 DEFER** (sect, profile, sockets, ascension-deepening → ascension keeps a thin button re-homed to
Cultivator), **7 MERGE** into existing surfaces (codex, pavilion→HUD, achievements, bounties, forge,
salvage, meridians, titles, stats). **Net: 17 Halls entries → 0**, plus the whole **Combat tab
deleted**. New surface count = **5 tabs + 2 HUD icons (auction ◆, premium ✧) + settings/backup
utility icons**. Against the ADD list (premium shop, premium currency, monster tiers, titan, skill
tree — 5 new player-facing systems, but the skill tree is a *rename* of meridians+techniques, net +4),
the cull removes/defers **9 modules** and **17 nav entries + 1 tab** — the deletions dominate the
additions, so the build nets *simpler*, not busier.

**Self-contained-module note:** the surviving modules currently follow the "inject my own nav button"
pattern (PROJECT.md hard constraint). After the cull they instead **render into a named container on
their new host surface** (e.g. Forge renders an action row inside the Equipment tab; Meridians renders
into `#view-skills`). This is a deliberate, author-sanctioned relaxation of the "own nav button"
convention — the convention was what *produced* the junk-drawer. Update PROJECT.md's constraint in the
same wave. The `#nav-menu` fallback `($('nav-menu') ?? document.getElementById('char-panel'))` in
`sockets/ascension/sectmissions/meridians/salvage/crafting.js` must be replaced with an explicit
container id per module — do not leave it falling back into `char-panel`.

---

## 3. Visual-identity direction — "make it look less like AI"

### 3.1 Why the current build reads as "AI-generated"

Grounded in the real CSS (`css/style.css` `:root`, L4–25; `index.html` tab bar L86–92):
- **Default-emoji iconography.** Tabs and every Halls button use raw emoji (🗺⚔🧘📜🏛📖⛩👤🏆🏹⚙🗓🜁).
  Mixed-vendor emoji is the #1 "assembled from defaults" tell.
- **The "ChatGPT dark-mode" palette.** One dark slate (`--bg:#14161d`, `--panel:#1d2029`) + a single
  gold accent (`--gold:#d4af37`) + one cyan (`--qi:#4fc3f7`). Generic, un-authored, no cultural anchor.
- **Uniform everything.** One border-radius (`--radius:8px`) on every box, one soft drop-shadow
  (`--shadow-soft`) everywhere → the flat, evenly-rounded "component library" look.
- **Undesigned type.** Headers fall back to `Georgia, 'Times New Roman', serif`; body is `inherit`
  (system-ui); numbers are raw `monospace`. No intentional pairing, no display face with character.
- **No texture or depth.** Flat fills, no material, no motif — nothing that says *xianxia* specifically.

### 3.2 The direction: intentional ink-and-cinnabar xianxia

Actionable principles a polish build can execute (respecting the **no-build / offline** constraint —
fonts must be **self-hosted woff2**, no CDN):

**Palette — commit to a cultural anchor, add two accents beyond the lone gold.**
Move from "dark slate + gold" to an **ink-and-cinnabar** system with jade and antique-gold accents:
- Dark theme: lacquer-black ground `#12100e` (warm, not blue-slate), rice-paper panels at low
  luminance `#1a1712`, **cinnabar red** `#c8433a` (the seal/danger accent), **jade green** `#5fae7f`
  (Qi / success — replaces the generic cyan), **antique gold** `#c8a24a` (rarity/headers), ink text
  `#e8e0cf`. Rarity tiers get *mineral* tones (jade/lapis/cinnabar/gold/imperial-purple) not neon.
- Light theme: aged rice-paper `#efe7d6` ground, ink `#2b2620` text, same accents at higher chroma.
- Kill the single-blue accent (`--qi:#4fc3f7`) — the flat cyan is a strong generic tell.

**Typography — a deliberate three-role pairing (self-hosted):**
- **Display / headers:** an engraved-stone serif with real character — e.g. **Cinzel** or
  **Cormorant Garamond**; for CJK-flavored accents (realm names, the logotype) a brush face like
  **Ma Shan Zheng** / **Zhi Mang Xing** used sparingly.
- **Body:** a warm humanist serif or serif-sans — **EB Garamond**, **Spectral**, or **Newsreader** —
  not system-ui.
- **Numbers:** a **tabular-figure** face so stat columns align (replace raw `monospace`).
- If bundling fonts is rejected, at minimum a curated stack: `"Cormorant Garamond", "Songti SC",
  "Noto Serif SC", Georgia, serif` — never bare `Georgia`/`inherit`.

**Iconography — replace emoji with a coherent set.** Custom **line/seal-style SVG glyphs** (inline,
CSP-safe, no external requests) with one visual language — brush strokes, seals, a consistent stroke
weight. A hand-drawn ☯/sword/scroll set reads as *authored*; mixed emoji reads as *assembled*.

**Spacing & shape — introduce rhythm and intent.**
- An **8pt spacing scale** (4/8/16/24/40) with deliberate hierarchy — generous air above section
  headers, tighter within rows. Today's spacing is even and undesigned.
- Vary the radius by role instead of one 8px everywhere: sharp/near-square panels (lacquer-box feel),
  softer only on interactive chips. Add **hairline gold rules** and **brush-stroke dividers** in place
  of ubiquitous drop-shadows.
- Motifs: a faint **seal watermark** on modal corners, a **cloud/mountain** header ornament.

**Texture & depth — add material.** Subtle **rice-paper / silk noise** (a tiny tiling data-URI PNG,
CSP-safe) on panels; faint **ink-wash gradients** at panel tops; a soft vignette so screens feel like
lit scrolls, not flat divs. Low-opacity — texture, not clutter.

**Motion — purposeful, in-world.** Replace generic fades (`css/modalfx.css`) with **ink-bleed / brush
reveals** for modals; a **qi-glow pulse** when an active ability is cast; keep the existing combat
juice (`combatfx.js` shake/floating numbers) but retint to the cinnabar/jade palette. Respect
`prefers-reduced-motion` (already honored in `hud.css`).

**"AI tells" to remove, concretely:** (1) raw emoji icons → SVG set; (2) single-accent dark-slate
palette → committed 3-accent xianxia palette; (3) uniform 8px-radius + drop-shadow on everything →
role-varied shape + hairline rules; (4) `Georgia`/`inherit`/`monospace` defaults → intentional
self-hosted pairing; (5) flat fills → paper/silk texture + ink-wash; (6) even, rhythm-less spacing →
an 8pt scale with real hierarchy.

---

## 4. Save-migration blast radius (the cuts are BREAKING)

Per PROJECT.md: `save.js` stores `state.player` **wholesale** and `createGame` back-fills missing
fields additively (`game.js` L104–116). Two distinct migration concerns:

1. **Orphan fields are harmless to *load*.** Removing a system leaves its `player.*` field sitting in
   old saves; `loadGame` reads `blob.player` whole and nothing references the dead field, so no crash.
   → **No `VERSION` bump is required purely to drop a system.** Recommend an optional cleanup pass in
   `createGame` that `delete`s known-dead fields (`cards`, `consumables`, `pillBuffs`, `materials`,
   `trials`, `sectMissions`, and events state) to keep saves tidy — nice-to-have, not correctness.

2. **Removing an `effectiveStats` source is a BALANCE break, not a schema break.** This is the real
   risk. Cutting **Spirit Cards** deletes `cardBonuses` from the pipeline (`progression.js` L91) →
   every existing character loses that flat power and their passive stone income drops. Any save mid-
   progression could fall below its zone's difficulty band. **This requires a `tools/balance.mjs`
   re-tune and ALL-ROWS-PASS before merge** (PROJECT.md gate). If CombatWorld also cuts **sockets**
   (`socketBonuses`, L107), that's a second lost source stacking on the same re-tune — sequence them
   and re-balance once, together.
   - Gem-id counter (`save.js` L8/L29/L64) becomes dead if sockets are cut — remove the import + the
     `counters.gem` field write (harmless if left, but tidy it).

3. **Provider stubs stay.** DEFER-2.0 systems (Sect, Profile) keep their `createXProvider` interface
   and their `player.*` field dormant — do **not** delete the field, so a future 2.0 network provider
   inherits the shape. Only the UI surface is removed.

4. **Spirit Cards CUT specifically requires a boss re-tune, not just a balance re-run (Critic4-verified
   pressure-test, confirmed against the real files).** `tools/balance.mjs`'s "maxed+buffed" fixture —
   used for **every** boss-gate row (`playerAt(level, level, 'rare', { cards: 'all', meridians: true,
   buff: true })`, at L378/383/388, one per calamity) — calls `grantCombatCards(p, { includeBoss: true
   })` (L144, L201) to grant **every zone AND boss card at max level**. That's a real, non-trivial stat
   chunk baked into what "maxed+buffed" means today (roughly +30 Attack/+20 Damage/+15 Defense/+5
   Armor/+50 HP at endgame, summing each card's `perLevel × maxLevel(5)` across all 12 cards). Per
   `boss.js`'s own header comment, the three calamity stat blocks (Xuanming/Zhulong/Jiuxiao — **fixed,
   hand-authored** `stats`/`maxHp`, not formulas) were headless-tuned *against exactly that sheet*:
   "an under-geared cultivator is crushed, a mid-tier player faces a real gamble, a maxed +
   technique-buffed cultivator reliably prevails." **Delete cards from that sheet and the existing boss
   numbers likely no longer deliver "reliably prevails" at the tuned gate** — the maxed archetype could
   tip into "gamble" or worse.
   - **This is a content-tuning task, not a mechanical removal.** Cutting `cards.js` is NOT "delete
     `cardBonuses`, adjust one balance.mjs fixture, re-run, done." It is its own sequencing step:
     (a) cut `cardBonuses` from `effectiveStats` + strip the `cards:'all'`/`'zone'` fixtures from
     `balance.mjs`, (b) **re-author the three `BOSSES` stat blocks** in `boss.js` to restore the
     intended crushed/gamble/reliable curve without cards in the mix, (c) gate specifically on
     `tools/balance.mjs` ALL ROWS PASS **re-validating the three boss rows**, not a generic "tests still
     pass." Whoever cuts `cards.js` should **not** touch `boss.js` numbers as a drive-by — this is a
     dedicated re-tune pass (Hard-Problem/Balance owner territory per PROJECT.md's roster, not a
     mechanical cull edit) and should be its own task/PR in the build sequence, after the mechanical cut
     lands and before it's considered done.

**Recommendation:** treat the whole cull as **one coordinated "simplify" wave** on the single-owner
files (`save.js`, `progression.js`, `game.js`, `main.js`, `index.html`, `tabs.js`), land it as one PR
(or a tightly-sequenced set), bump `VERSION 2→3` **only** to mark the balance re-tune line in the sand
(so a re-tuned save is distinguishable), and gate the merge on `tools/balance.mjs` ALL ROWS PASS +
a Chromium smoke test that every re-homed surface renders with zero console errors.

---

## 5. Cross-author handoffs

- **→ Author-Economy (premium shop = consolidation home).** These MERGE/CUT sinks should become shop
  upgrades so the cull nets into *your* surface, not the void: **respec** (comparison-doc ADOPT),
  **inventory-slot expansion**, **stamina / max-Qi upgrades** (also the home for Alchemy's cut
  Qi-restore), **loadout slots**, **XP-protection**. Salvage should pay **gold or premium** now that
  its essence currency is cut — confirm which. The shop must *absorb*, not add a parallel system.
- **→ Author-CombatWorld (combat side-panel + tab removal + sockets).** The Combat tab is deleted and
  combat renders into the Map's right-hand `#tile-info` column — coordinate the DOM ids for
  `playCombat`/`combatfx` and the 1–9 attack handler (via `input.js`). You also arbitrate the
  **sockets** keep-vs-cut since you own the rarity/set redesign — I've flagged it as the most tangled
  optional `effectiveStats` source.
- **→ Author-Progression.** `meridians.js` → the passive skill tree surface; `techniques.js` → the few
  10-min actives. Both live on the new **Skills** tab; today's technique durations are 45–120s
  (`techniques.js` L18–90) and must stretch to 10+ min per author §6.
- **→ Lead / Hard-Problem-Balance owner (Spirit Cards cut = its own re-tune task, see §4.4).** Do not
  bundle the `boss.js` re-tune into the same task/PR as the mechanical `cards.js` removal. Sequence:
  mechanical cut lands first (cards removed from `effectiveStats` + `balance.mjs` fixtures updated to
  drop `cards:'all'`/`'zone'`) → dedicated re-tune pass re-authors the three `BOSSES` stat blocks against
  the card-less "maxed+buffed" sheet → gate on `tools/balance.mjs` ALL ROWS PASS with the three boss
  rows specifically re-validated (crushed/gamble/reliable), not a generic green run.
- **→ Lead.** Load-bearing cut decisions flagged: **Spirit Cards CUT is HIGH blast radius** (7
  importers + an `effectiveStats` source → mandatory balance re-tune); **Ascension T2 deepening
  DEFERRED** against the comparison-doc greenlight (simplify mandate wins); **sockets** left to
  CombatWorld; the **"own nav button" constraint is deliberately relaxed** and PROJECT.md must be
  updated in the same wave. `replay.js` is a CUT-candidate I'm leaving to your call.

---

## 6. What I'm proposing to CUT vs KEEP vs MERGE vs ADD (one line)

- **CUT:** Spirit Cards, Alchemy, Daily Trials, world-event calendar, Sect Dispatch (+ replay?).
- **DEFER-2.0:** Sect/disciples, Profile/Rivals/Sparring, Ascension-deepening (keep thin), sockets (CombatWorld's call).
- **MERGE:** Forge, Salvage, Loadouts → Equipment; Bounties → Quests; Titles + Achievements + Chronicle → Cultivator/Records; Beast Codex → Map.
- **KEEP:** Combat (as map side-panel), Map/bosses, Equipment, leveling+stats, Auction house (HUD icon), Quests, meridians→Skill Tree, techniques→active abilities.
- **ADD (others' docs):** premium currency + shop, dual-currency auction, Legendary/SE/Titan spawns, combat side-panel, sound.
- **Net:** 5 tabs + 17 Halls buttons → **5 tabs + 2 HUD icons + 0 Halls**. The Combat tab and the Halls tab both disappear.
