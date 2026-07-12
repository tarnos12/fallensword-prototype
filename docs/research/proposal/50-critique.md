# 50 — Critique (Critic4)

**Status: DRAFT-IN-PROGRESS.** Written against an independent code audit, updated as
`10-cull-ia-feel.md` / `20-economy-premium.md` / `30-progression-skills.md` /
`40-combat-world.md` land. Author-facing challenges were sent by direct message
before this doc existed (per RULE 2) — this file is the durable record for the lead.

**Landed so far:** `10-cull-ia-feel.md` (Architect-Cull) ✓ reviewed below.
`30-progression-skills.md` (Author-Progression) ✓ reviewed below — replied directly
to all three of my pre-doc challenges, point by point. `20-economy-premium.md`
(Author-Economy) ✓ reviewed below — exceptionally well cross-checked against the
real code (see §1/§2). `40-combat-world.md` — pending.

---

## 0. Code-audit baseline (independent, before reading any author doc)

Established directly from the real code so every claim below is checkable, not vibes:

- **`save.js`** — a flat, non-namespaced blob (`player`, `zoneId`, `pos`, `qi`, `market`,
  `quests`, `zones`, `log`, `counters`). `VERSION=2`; v1→v2 is the only migration branch
  that exists. New fields are back-filled field-by-field in `game.js` `createGame()`
  (lines 104-118) — that's the established additive pattern every author should follow,
  not a new mechanism.
- **`progression.js` `effectiveStats`** — a fixed 7-step pipeline (lines 75-138): `base
  + allocated` → **gear** → **cards** → **meridians** → **sockets** → **sets** → technique/pill
  **%** buffs → **ascension** global scalar (`×(1+0.08·tier)`). Every new flat source is
  one add-line before the % buffs; there is exactly one pipeline, no in-place mutation.
- **`combat.js` `resolveCombat(attacker, defender, seed)`** — runs a fight **to
  completion** internally (loops up to `MAX_TURNS=20`, returns only on a 0-HP side or
  turn exhaustion: `outcome: win|loss|draw`). **Every existing caller** (`game.js attack`,
  `trials.js`, `duel.js`, `rivals.js`) uses it this way — nobody today calls it for "one
  swing." The Titan move-and-chase mechanic (§3 below) is a genuinely new usage pattern.
- **`items.js` `RARITIES`** — `epic`/`legendary`/`mythic` all have `weight: 0`: they are
  **never** randomly rolled by `rollRarity()` today. The only path to one is an explicit
  `generateItem(slot, level, 'legendary', rng)` call, used by `boss.js`/`quests.js` for a
  handful of hand-authored drops.
- **`sets.js`** — exactly **3 hardcoded 2-piece sets**, each keyed to specific item
  *names* (e.g. `nineHeavens` = `Nine Calamities Sabre` + `Nine-Heavens Cloud Mantle`,
  both from the Stormcrown quest saga). No mechanism today ties a *procedurally
  generated* Legendary/Epic item to a set.
- **Zone spawn tables** (`js/zones/*.js` `CREATURES`) are flat weighted lists of ordinary
  creatures. **Bosses** (`boss.js`) are a *separate* pattern: one fixed lair tile per
  boss, stage-gated, wall-clock cooldown, single scripted encounter. **Neither pattern
  supports** "sometimes spawns Legendary (multiple per area)" or "exactly 1 Super Elite
  per area" — that's new world-state, not a data tweak.
- **`js/tabs.js`** hardcodes `const TABS = ['map','combat','char','quests','halls']`
  (line 17). **`index.html`** has a dedicated `<section data-tab="combat">` block
  (lines 110-121: `#combat-panel`/`#combat-log`/`#combat-outcome`/`#combat-empty`).
  **`main.js`** line 223 auto-switches to it: `setActiveTab('combat')`, and line 453
  wires `#btn-close-combat` back to `setActiveTab('map')`. Removing the Combat tab
  touches all three files, not just tabs.js.
- **`js/input.js`** lines 210-213: digit keys **1-9 are already bound** — to "open the
  Nth `#nav-menu` panel" (confirmed by the existing shortcuts-help copy: "Open panels
  (Codex, Pavilion, Sect…)"). This is a **direct collision** with the directive's "1-9
  attacks the monster in that slot."
- **Nav-menu census** — modules that self-inject a button into `#nav-menu` today:
  `sockets.js` (💎 Jewelcraft), `titles.js` (🏵 Titles), `sectmissions.js` (Sect
  Dispatch), `stats.js` (📊 Chronicle of Deeds), `ascension.js` (✦ Ascension),
  `meridians.js` (☯ Meridians), `crafting.js` (⚒ Forge), `salvage.js` (♻ Salvage), plus
  `market.js`/`guild.js`/`bounties.js`/`trials.js`/`alchemy.js` via the same
  self-contained-module pattern. **~13 nav entries today** — this is the number any
  cull ledger must actually shrink, with the arithmetic shown.
- **`ascension.js` `performAscension`** wipes `player.meridians = { nodes: {} }` and
  `player.loadouts = []` directly (lines 46-53) — if Progression's skill tree replaces
  `player.meridians` with a different shape, **`ascension.js`'s prestige-reset must be
  updated too**, or ascension will leave stale/wrong-shaped tree data behind.
- **`quests.js` is not assigned to any author.** The brief's four charters cover
  Cull/IA, Economy/premium, Progression/skills, CombatWorld/rarities+spawns+combat-UI.
  None owns quests.js, and the target core loop (combat, equipment, auction house,
  premium shop, leveling+stats, skill tree) never mentions quests. The existing Quests
  tab holds 9+5+5-step chains and **two capstone named-Legendary/Mythic item sagas**
  (`js/quests.js`, cross-referenced by `items.js` `mintNamedItem`, `sets.js`'s only
  Legendary set). Flagged in §4 as a directive-coverage gap.

---

## 1. Simplify-audit — net complexity up or down?

### Architect-Cull (`10-cull-ia-feel.md`) — VERDICT: real simplification, numbers check out

Corrected my pre-doc estimate: the true nav-menu census is **17**, not ~13 (9
hard-coded in `index.html` L165-173 + 8 self-injected — I'd assumed market/guild/
bounties/trials/alchemy self-injected; they're hard-coded). I independently verified
this by reading `index.html` L165-173 directly: 9 buttons confirmed
(`btn-codex/pavilion/sect/profile/achievements/bounties/settings/trials/alchemy`).
The doc's count math is real and checkable: **CUT** 5 (Spirit Cards, Alchemy, Daily
Trials, world-event calendar, Sect Dispatch), **DEFER-2.0** 4 (Sect/disciples,
Profile/Rivals/Sparring, Ascension-deepening, sockets — punted to CombatWorld),
**MERGE** 7 nav entries into surviving surfaces (Forge/Salvage/Loadouts→Equipment,
Bounties→Quests, Titles+Achievements+Chronicle→Records, Codex→Map), **KEEP** the
actual core loop. Net: **17 Halls entries → 0**, Combat tab deleted, Halls tab
deleted. This is a genuine reduction in module/surface count, not a relabeling — most
MERGE targets keep their save fields and cross-module refs (documented per-row) while
losing their standalone modal + nav button, which is real UI consolidation *and* in
five cases (the CUT list) actual code/module deletion.

**One outstanding tension the doc surfaces itself and defers correctly rather than
fudging:** it recommends the 5-tab layout (Map/Cultivator/Equipment/Skills/Quests)
over a tighter 4-tab merge, flagging the trade-off explicitly for the lead rather than
picking silently. That's the right call to surface, not resolve unilaterally.

**Pressure-tested the highest-risk CUT (Spirit Cards) independently** — see §2 below;
found the blast radius is a notch worse than even Architect-Cull's own "HIGH" label:
it likely requires re-authoring boss stat blocks, not just re-running the balance
harness. Flagged directly to Architect-Cull and recorded here for the lead.

### Author-Progression (`30-progression-skills.md`) — VERDICT: honest, real cut on the actives side; passive side is legitimately net-neutral, not a hidden add

The passive tree is NOT a net addition dressed as simplification: 5→8 meridian nodes
sounds like growth, but it's completing an already-half-built system (the file's own
comment already promised "eight extraordinary meridians") via the *exact* same
add-line mechanism, same file, same signature — a completion, not new surface. The
real cut is on activities: **9 techniques → 4 abilities**, with the tier/prereq
dependency graph **deleted from the data shape entirely** (`canLearn` no longer walks
a chain) — that's a genuine structural simplification, verified against the actual
`techniques.js` data (9 entries, 3 categories × up to 4 tiers, confirmed by direct
read). The ledger in §5 is honest: 2 techniques cut outright with no successor
(`spiritSeverance`, `goldenCoreAscendance`) rather than silently folded in.

The one item that needs explicit lead sign-off before it's "free" (the doc says this
itself, doesn't hide it): §4's skillPoints/meridian-point pool merge is the widest
blast radius in the doc and is correctly flagged CONDITIONAL with a no-merge fallback
that still ships the rest of the doc's value independently.

### Gate applied, current standing

For every one of the 17 nav-menu systems: verdict named ✓, after-count is an explicit,
independently-checkable number (0 nav entries, 5 tabs + 2 HUD icons) ✓, lower than
before ✓. No ADD is being relabeled as simplification merely by hiding behind an icon
— the CUT list actually deletes modules/save-usage, and the MERGE list is honest
about what moves where. **Verdict so far (2 of 4 docs reviewed): simplification is
real, not costumed.** Still pending: Economy's "absorption" claims (does the premium
shop actually delete the systems it says it absorbs, or just add a shop skin on top of
them still existing?) and CombatWorld's net-new surface (rarities/spawns/titan/debug
buttons/combat-panel — this doc is 100% ADD by its own charter; the question is
whether it also executes the sockets keep-vs-cut call Architect-Cull explicitly
punted to it).

---

## 2. Feasibility / blast-radius per CUT

### Spirit Cards CUT — sharper than "HIGH blast radius, re-run balance.mjs"

Independently verified by reading `js/cards.js` and `tools/balance.mjs` directly.
Architect-Cull's doc already flags this CUT as HIGH (7 importers + an `effectiveStats`
add-line + shrunk passive stone income, "requires a `tools/balance.mjs` re-tune and
ALL-ROWS-PASS before merge"). Pressure-testing found it's a full notch worse than a
generic re-tune:

- `tools/balance.mjs`'s "maxed+buffed" player fixture — used for **every boss-gate
  row** (`playerAt(level, level, 'rare', { cards: 'all', meridians: true, buff: true
  })`, e.g. the FE9/CF9 rows) — calls `grantCombatCards(player, { includeBoss: true
  })`, granting **all 12 cards at max level**. Summing `perLevel × maxLevel(5)` across
  `cards.js`'s actual table: roughly **+30 Attack / +20 Damage / +15 Defense / +5
  Armor / +50 HP** baked into what "maxed+buffed" means today.
- `boss.js`'s own header comment states the three calamity stat blocks
  (`ancientTerror`/`emberCalamity`/`tribulationSovereign` — fixed hand-authored
  `stats`/`maxHp`, **not formulas**) were headless-tuned so "a maxed + technique-buffed
  cultivator reliably prevails" — against a sheet that includes that card chunk.
- **Consequence:** cutting cards doesn't just need a balance.mjs re-run with an
  adjusted fixture — it may knock the three boss fights from "reliable win at
  maxed+buffed" down to "gamble" or worse, since a real double-digit stat chunk
  disappears from the tuned archetype. The fix is likely **re-authoring the three
  boss stat blocks themselves** (content tuning), not a mechanical delete-and-rerun.
- **Recommendation to the lead:** sequence this as its own step — cut `cards.js`,
  update the balance.mjs fixture to drop the `cards` grant, THEN re-tune
  `ancientTerror`/`emberCalamity`/`tribulationSovereign`'s stat blocks against the
  now-lower "maxed+buffed" ceiling until the three boss rows read crushed/gamble/
  reliable again — don't let a single build-wave agent "cut cards and run the
  harness" as one undifferentiated task; the boss re-tune is a distinct, necessary
  follow-on with its own ALL-ROWS-PASS gate on just those three rows.

Sent directly to Architect-Cull; recorded here since it changes the sequencing the
lead should freeze, not just the CUT verdict itself (which stands — cutting cards is
still the right call, it's just a two-step operation, not one).

### Other CUTs (from Architect-Cull's ledger) — spot-checked, no further issues found

- Alchemy, Daily Trials, world-event calendar, Sect Dispatch: all correctly identified
  as orphaning a `player.*` field with no `effectiveStats` line (verified — `alchemy.js`
  pill buffs apply at combat-snapshot time via `applyPillBuffs`, never touching the
  aggregation pipeline; confirmed independently). Low/medium risk as labeled.
- Sockets: correctly punted to CombatWorld as "most tangled optional source" — I
  independently confirmed `socketBonuses` is add-line #5 in `effectiveStats`
  (`progression.js` L107) and `save.js` carries a dedicated gem-id counter
  (L8/29/64) — cutting it is real save-surface, not free. Whether CombatWorld's doc
  actually renders a verdict here (rather than silently assuming Architect-Cull
  decided it) is still open — pending `40-combat-world.md`.

### Baseline blast-radius facts (pre-established, still apply to every CUT below)

- Any CUT of `meridians.js`, `sockets.js`, `sets.js`, `ascension.js`, `crafting.js`,
  `salvage.js`, `sectmissions.js`, `titles.js`, `stats.js`, or `loadouts.js` removes an
  `effectiveStats` add-line (meridians/sockets/sets) or a save field
  (`player.meridians`/`player.materials`/`player.consumables`/`player.loadouts`/
  `player.ascension`/`player.boss`/etc.) — **name the field, name the back-fill/strip
  branch**, per the brief's own ask. "Removed" is not enough; old saves loading with
  that field present must not crash `effectiveStats` or the inventory/equip paths that
  read it.
- Cutting `sets.js` conflicts directly with CombatWorld's "Legendary/SE always Sets"
  mandate — these two cannot both be true. Watch for exactly this contradiction landing
  across two different docs.
- Cutting `ascension.js` outright (rather than folding its UI into the premium shop)
  removes the game's only NG+ prestige loop and the sole consumer of the `+8%/tier`
  ascension scalar in `effectiveStats` — a large behavior change with no analog in the
  brief's core loop. If Economy's "absorbed sinks" list includes ascension, does it
  keep the prestige *mechanic* (wipe+bonus) or just the *shop-purchase* framing (a
  costed respec)? These are different systems; conflating them is a directive miss.
- `quests.js` — see §4 (unassigned; likely a silent-drop risk regardless of what any
  single author's doc says, since no one owns the verdict).

---

## 3. Constraint fidelity

### 3a. `combat.js` purity (titan)
**Unresolved pending `40-combat-world.md`.** The load-bearing question sent to
Author-CombatWorld: `resolveCombat` today resolves an entire encounter in one call
(up to 20 rounds) and every existing caller relies on that. A "attack once → titan
moves → attack again ×10" design needs an EXACT call-shape answer — e.g. is each
"hit" a fresh `resolveCombat(player, titanActorSnapshot, seed)` call artificially
capped to extract just the first exchange, with the titan's position/hit-counter kept
in `game.js`/a new module and NOT fed back into `combat.js` as new parameters? If the
doc doesn't show the literal function signatures on both sides of that boundary, the
"combat.js stays pure" claim is asserted, not demonstrated, and QA should reject it at
the exit gate.

### 3b. Single `effectiveStats` pipeline
**Unresolved pending `30-progression-skills.md`/`40-combat-world.md`.** Two claimed new
flat sources need to land as literal add-lines in the existing 7-step order, not a
parallel pipeline:
- Passive skill tree replacing `meridianBonuses()` — same slot, same shape.
- Titan-item Qi-regen ("always give some stamina/Qi regeneration as a defining stat")
  — Qi is **not** one of the stats `effectiveStats` aggregates today (it aggregates
  `attack/defense/damage/armor/maxHp`; Qi regen is a *rate*, tracked via
  `lastQiTick`/`QI_REGEN_MS` in `game.js`, entirely outside `effectiveStats`). A titan
  item granting "Qi regen" as a *stat* needs either (a) a new parallel small pipeline
  for regen-rate modifiers analogous to `effectiveStats` but distinct, or (b) folding
  into `maxQi()`/`tickQi()` instead of `effectiveStats`. CombatWorld's doc must say
  which, explicitly — "plugs into effectiveStats" is imprecise/wrong if Qi regen isn't
  an effectiveStats field at all today.
- Sets granting flat Attributes is already exactly how `sets.js`/`setBonuses()` works
  today (add-line #6) — this one is genuinely just "keep the existing mechanism,
  extend the set roster." Low risk, unlike the two above.

### 3c. Save schema (additive-or-migrated)
Every CUT/ADD must show its `save.js` field explicitly. Established pattern (score
this against): additive fields get an `if (!state.player.X) state.player.X = default`
line in `createGame`; only a genuinely incompatible *shape* change (v1→v2's zone
restructure is the one precedent) earns a VERSION bump + migration branch. No author
doc should propose a VERSION bump for a field that's merely new — that would be
over-engineering relative to the established, working pattern.

### 3d. Premium currency stays offline-earnable
**Unresolved pending `20-economy-premium.md`.** Must name concrete in-game sources
(not "drops/achievements" in the abstract) and confirm no real-money hook is wired in
(only flagged as the author's future decision, per the brief). Watch specifically for
achievements as a *primary* source — `achievements.js` has 23 finite milestones; that's
a bounded well a player exhausts, not a sustainable earn loop, and shouldn't be the
load-bearing source in the final design.

---

## 4. Directive-coverage checklist

| # | Directive ask | Owner (per brief) | Status |
|---|---|---|---|
| 1 | Cull ledger for every non-core system | Architect-Cull | pending doc |
| 2 | Core loop: combat/equipment/auction/premium-shop/leveling/skill-tree | all four | pending docs |
| 3 | Legendary always-Set / SE always-Set / Titan not-Set | CombatWorld | pending doc — **contradicts any CUT of `sets.js`**, see §2 |
| 4 | Sets grant flat Attributes only (no exotic effects) | CombatWorld | matches existing `sets.js` mechanism already — low risk |
| 5 | Legendary: multiple/area, SE: exactly 1/area | CombatWorld | pending doc — **no existing spawn-table mechanism**, see §0 |
| 6 | Titan: move-and-chase, ~10 hits, then drops | CombatWorld | pending doc — **combat.js purity unresolved**, see §3a |
| 7 | Debug spawn buttons (Legendary/SE/Titan, multi-spawn) | CombatWorld | pending doc — note PROJECT.md: all TESTING/debug scaffolding was deliberately **stripped** in PR #13 ("real values are live... any future dev tooling must be URL-flag-gated `?dev=1`, never always-on"). A bare "debug buttons above the map" contradicts that constraint unless gated behind `?dev=1`; author must reconcile explicitly. |
| 8 | Drop rates 25% / 50% / 100% | CombatWorld | pending doc |
| 9 | Debug 100%-drop toggle | CombatWorld | pending doc — same `?dev=1` gating requirement as #7 |
| 10 | Combat results on side of map, Combat tab removed | CombatWorld ↔ Architect-Cull | pending docs — blast radius named in §0 (tabs.js/index.html/main.js) |
| 11 | 1-9 attacks monster in slot | CombatWorld | pending doc — **collides with existing input.js digit-nav**, see §0 |
| 12 | Premium currency name/flavor/earn/sink, tradeable on AH | Economy | pending doc |
| 13 | Premium upgrade shop (icon-opened), absorbs scattered sinks | Economy | pending doc |
| 14 | Auction house dual-currency | Economy | pending doc — **market.js has no currency-type field today**, see message to Economy |
| 15 | Leveling + stats (existing) | Progression | presumably KEEP as-is — confirm explicitly rather than silently assuming |
| 16 | Passive skill tree consolidating meridians.js | Progression | pending doc |
| 17 | Few active abilities consolidating techniques.js, Qi cost, 10+min duration | Progression | pending doc |
| 18 | Sound effects | Lead (cross-cutting synthesis) | out of scope for the four authors; confirm lead owns it as stated in brief |
| 19 | Visual-identity "less like AI" direction | Architect-Cull | pending doc |
| — | **Quests / `quests.js` fate** | **unassigned** | **gap — flagging to lead, see §0** |

---

## 5. Cross-author conflicts for the lead to adjudicate

1. **Sets vs. Cull — RESOLVED, no contradiction.** Architect-Cull's ledger explicitly
   KEEPs `items.js`/`sets.js` as the Equipment pillar and names CombatWorld as owner of
   the rarity/set rules ("Author pillar. CombatWorld owns the rarity/set rules") — so
   the feared contradiction (Cull trims sets.js while CombatWorld depends on it) does
   not materialize in what's landed so far. Still need CombatWorld's doc to confirm it
   actually grows the 3-set roster to cover procedurally-generated Legendary/SE drops
   (the real new-build item, per my code audit in §0) rather than just restating "sets
   stay."
2. **1-9 keys — RESOLVED in Architect-Cull's doc, pending CombatWorld's mirror.**
   Architect-Cull explicitly removes the `openNavPanel` digit binding (dead once Halls
   dissolves) and hands 1-9 to CombatWorld for "attack monster in slot N," recorded in
   `10-cull-ia-feel.md` §2.1 with the exact line numbers. Both sides message-confirmed
   this resolution. Outstanding: confirm `40-combat-world.md` records the same
   resolution rather than independently re-deciding it.
3. **Premium-currency sourcing — still open.** Economy names the currency and its
   sinks; *where it drops* plausibly belongs to CombatWorld's rarity/spawn system
   (titan/SE/Legendary kills are the obvious high-value source). Asked both directly
   to confirm who specifies the drop rate/source so it isn't specified twice,
   differently, or not at all. Pending both docs.
4. **Ascension vs. Progression — de-risked, not fully closed.** `ascension.js`'s
   `performAscension` wipes `player.meridians = {nodes:{}}` and resets
   `player.skillPoints = 0`/`learnedTechniques = []` directly. Progression's doc keeps
   `player.meridians.nodes` the same open `{id:rank}` shape (just adds 3 more possible
   keys) — Ascension's existing reset line needs zero changes for that part. If the
   §4 conditional skillPoints/meridian-point **pool merge** ships, Ascension's existing
   `skillPoints = 0` reset already zeroes the merged pool correctly — but neither
   Progression's doc nor Ascension (single-owner, different file) states this
   explicitly. Recommend the lead require one line in the build-wave notes confirming
   `ascension.js` needs **no code change** for the pool-merge case, so nobody "fixes"
   a file that doesn't need touching and reintroduces risk. Economy's premium-shop
   respec (§1.2 of Progression's doc: mechanic in `progression.js`, cost/gating in the
   shop) is a *different* action from the Ascension prestige reset — both docs treat
   them as distinct, which is correct; just flagging that a third doc (Economy) also
   touches this territory and should say so explicitly when it lands.
5. **Qi-regen as an effectiveStats source — still open, pending CombatWorld.** Flagged
   directly: Qi regen is **not** part of `effectiveStats` today (it's a rate, tracked
   via `lastQiTick`/`QI_REGEN_MS` in `game.js`, wholly outside the stat-aggregation
   pipeline). Titan items granting "Qi regeneration" as a defining stat need a named
   mechanism (new small pipeline analogous to but distinct from `effectiveStats`, or
   folding into `maxQi()`/`tickQi()`) — CombatWorld's doc must say which explicitly,
   not assume a slot that doesn't exist. Also now intersects with Progression's own
   Qi-regen retune (`QI_REGEN_MS` 3000→48000ms, i.e. 1200/hr→75/hr, §1.1 of
   `30-progression-skills.md`) — CombatWorld's titan Qi-regen stat needs to be sized
   against the **retuned 75/hr baseline**, not the old prototype rate, or the titan
   item will be balanced against a number that's about to change 16x.
6. **Quests.js ownership — RESOLVED.** Architect-Cull's ledger explicitly KEEPs
   `quests.js` on its own tab and merges Hunt Bounties into it — closing the gap I
   flagged pre-doc (no charter mentioned it). No longer a silent-drop risk.

---

*(This document will be updated in place as each author's doc lands; the lead will be
notified via SendMessage when all four have been reviewed and this file reflects their
actual content rather than the pre-audit baseline above.)*
