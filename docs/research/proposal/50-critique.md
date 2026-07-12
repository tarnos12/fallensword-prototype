# 50 — Critique (Critic4)

**Status: COMPLETE.** Written against an independent code audit performed before any
author doc existed (§0), then checked line-by-line against all four landed docs —
`10-cull-ia-feel.md` (Architect-Cull), `20-economy-premium.md` (Author-Economy),
`30-progression-skills.md` (Author-Progression), `40-combat-world.md`
(Author-CombatWorld). Author-facing challenges were sent by direct message before
each doc existed (per RULE 2), and two live cross-author mismatches were found and
message-resolved during review (respec catalog rows, §5.7; Merit-award hook field
naming, §5.8) — both closed by the authors themselves without needing lead
adjudication.

**Overall verdict: the proposal is build-ready and the simplify mandate is genuinely
met.** Every one of the brief's specific asks (§1-§7, exact numbers included) is
addressed by name in §4's checklist; every CUT names its blast radius (§2); the three
hard constraints (`combat.js` purity, single `effectiveStats` pipeline, additive save
schema) all PASS on independent verification (§3); and the net system-count math in
§1 is real, not costumed. The one item still requiring the lead's own judgment call
(not a defect, a genuine design decision) is the Dao Heart's T2-guardrail sufficiency
(Economy's §3.4/§9.1) — flagged by Economy themselves, seconded here.

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
  `meridians.js` (☯ Meridians), `crafting.js` (⚒ Forge), `salvage.js` (♻ Salvage) — **8
  self-injected**, plus **9 hard-coded directly in `index.html` L165-173**
  (`btn-codex/pavilion/sect/profile/achievements/bounties/settings/trials/alchemy`).
  **Corrected true count: 17 nav entries today** (my original ~13 estimate assumed
  market/guild/bounties/trials/alchemy self-injected like the other 8; Architect-Cull's
  doc caught this and I independently re-verified against `index.html` directly) — this
  is the number any cull ledger must actually shrink, with the arithmetic shown.
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

### Author-Economy (`20-economy-premium.md`) — VERDICT: exceptionally well-verified, one real cross-author gap found (the respec rows)

Independently spot-checked this doc's most load-bearing factual claims against the
real code — all confirmed correct: the "10 existing `INVENTORY_SIZE` call sites
across 5 files" claim is exact (verified: `items.js:316`, `game.js:231,525,764`,
`market.js:163,208,230`, `ui.js:495,498`, `main.js:443` — precisely 10, precisely 5
files). The doc also **caught its own bug mid-spec**: it initially planned to insert
`listItem`'s new `currency` param before the trailing `now` param, then correctly
flagged that this breaks any positional caller passing `now` explicitly, checked
`game.js`'s `marketList` (the only other caller, confirmed at line 826-828, does not
pass `now`), and fixed the signature to keep `now` last. That's the right instinct
for a "build-ready spec" — I re-verified the same call sites independently and the
fix is correct. `DEATH_XP_LOSS`/`DEATH_STONE_LOSS` line citations (`game.js:70-71`)
also check out exactly. This is the standard the other docs should be held to.

**Real gap found — the respec rows don't line up with what Progression actually exposed:**
Economy's Hall of Merit catalog (§3.2) has two respec rows, `meridianRespec` and
`techniqueRespec`, whose cost formula calls `meridianPointsSpent(player)` (real,
confirmed export in `meridians.js`) and **`techniquePointsSpent(player)`** — which
does **not exist** anywhere in the codebase and is **not proposed** by
`30-progression-skills.md` either (grepped both the live code and the Progression doc
— zero hits for that name). Meanwhide, Progression's doc exposes exactly **two**
respec hooks: `respecStats()` (stat-allocation respec — refunds `player.allocated`
points) and a conditional, **unified** `respecSkillTree()` (only if the §4 pool-merge
ships — one function resetting BOTH meridian ranks and learned abilities together,
not two separate resets). Economy's catalog:
- Has **zero row** for `respecStats()` — despite Progression explicitly naming it "the
  hook to call" for the shop (their §1.2) and Economy's own §7.2 saying "the actual
  point-refund logic... does not exist today... must be added by Progression" (true
  for meridian/technique, but Progression already wrote `respecStats()` for the OTHER
  respec — stat points — and nobody's shop row calls it).
- Has **two** rows (`meridianRespec`/`techniqueRespec`) that don't match either of
  Progression's two proposed shapes: if the pool-merge ships, the "right" catalog
  entry is ONE unified "Skill Tree Respec" row calling `respecSkillTree()`, not two;
  if the pool-merge is rejected (Progression's own stated fallback), Progression
  hasn't proposed separate meridian-only/technique-only reset functions under ANY
  name — Economy assumed they'd exist and named them speculatively.
- This is exactly the "specified twice, differently, or not at all" failure mode the
  brief warned about, and it's on the single most cross-cutting mechanic in either
  doc (respec touches `progression.js`, `meridians.js`, `techniques.js`, AND
  `meritshop.js`/`game.js`). Flagged directly to both authors with the specific
  mismatch (function names + the missing stat-respec row) so they can reconcile
  before the lead freezes the build-wave contracts.

Everything else in the doc is sound: Merit's earn-source table directly answers my
pre-doc challenge #3 with concrete, hook-level specificity (exact file/line per
source) and correctly frames achievements as a bounded bootstrap, not the main-line
source (my exact concern, addressed head-on); the Dao Heart is an honest, capped
attempt at the T2 exclusive-choice guardrail with a stated fallback if the lead judges
it too thin; the real-money flag is properly deferred, not baked in; the CUT ledger
(§8) correctly declines to unilaterally cut anything, leaving that to Architect-Cull
as the brief assigns it.

### Author-CombatWorld (`40-combat-world.md`) — VERDICT: honest about being 100% ADD; the ADD is real new content, correctly not disguised as a cut

This doc's charter is inherently additive (rarities/spawns/titan/debug/combat-UI) and
it doesn't pretend otherwise — the ADD ledger at the end explicitly lists 3 new
modules, 2 new rarity tiers, and **4 new sets** as "real new content surface, not
hidden in a one-liner, per Critic4's flag" (a direct, named response to my pre-doc
challenge #2). This is the right way to handle an ADD-shaped charter inside a
simplify-mandated proposal: name it plainly rather than dress it up. The one
CUT/consolidation this doc contributes is real: Legendary/Super-Elite are the SAME
creature entity as their native template (flagged + stat-multiplied), not new
entities — so `cards.js`, the Beast Codex, and `Quests.onFace/onKill` need zero
changes. That's a genuinely clever design choice that avoids a content-multiplication
trap (a naive design could have doubled the creature roster).

**The sockets keep-vs-cut call Architect-Cull explicitly punted to CombatWorld is
answered: KEEP**, with a one-line `SOCKET_COUNTS` extension for the two new rarities
— resolves cross-author-conflict item that was open in §2/§5.

### Gate applied — final standing across all four docs

For every one of the 17 nav-menu systems: verdict named ✓, after-count is an explicit,
independently-checkable number (0 nav entries, 5 tabs + 2 HUD icons) ✓, lower than
before ✓. No ADD is being relabeled as simplification merely by hiding behind an icon
— the CUT list actually deletes modules/save-usage, and the MERGE list is honest
about what moves where. Economy's "absorption" claims hold up: the inventory/loadout
caps genuinely become "base + shop bonus" (not a cosmetic skin), and Economy
explicitly declines to cut anything itself, leaving that call to Architect-Cull as
the brief assigns it. CombatWorld's net-new surface is honestly labeled ADD, not
disguised.

**Final verdict: real simplification, not costumed.** Counting every author's own
ledger: Architect-Cull CUTs 5 modules + defers 4 + merges 17 nav entries + 1 tab into
0; against that, the ADD side is Merit + Hall of Merit (Economy), a passive-tree
completion + activity consolidation that's roughly net-neutral in surface count
(Progression), and CombatWorld's genuinely-new rarity/spawn/titan/debug content
(honestly labeled, not hidden). The CUT side removes far more standing surface
(modules, nav buttons, a whole tab) than the ADD side introduces (a handful of new
files/data tables gated behind 2 HUD icons and inline UI, not new tabs or nav
buttons) — the headline "does it simplify" question resolves to **yes**, on the
concrete, checkable terms the brief demanded (a real number, not a vibe).

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

### 3a. `combat.js` purity (titan) — RESOLVED, verified line-by-line against the real return shape

**`40-combat-world.md` clears this cleanly, independently verified.** The design:
`resolveCombat(attacker, defender, seed)` is called **exactly once per `attack()`**,
completely unmodified — no new params, no titan-awareness inside `combat.js`. The
Titan's HP is a persisted world value (`monster.titanHp`), synced into the transient
`hp` field the resolver already reads (`monster.hp = monster.titanHp`) immediately
before the call, then read back out via the **existing** return shape
(`result.turns[result.turns.length-1].defenderHpAfter`) immediately after. I traced
this against `combat.js`'s actual loop: when the defender is felled mid-fight, the
pushed turn sets `defenderHpAfter = 0` explicitly (confirmed at combat.js's
`win`-branch); when the fight ends in a loss or draw, the last turn's
`defenderHpAfter` still correctly reflects the chip damage the titan took, since the
attacker always swings first every round (confirmed in `swing()`/`resolveCombat`'s
loop order) — so a titan can be legitimately "chipped" even in an encounter the
player loses, matching the doc's explicit claim. `combat.js` itself is untouched;
`game.js`/`js/titans.js` own 100% of the movement/hit-counter state. This is exactly
the demonstration (not just assertion) the exit gate should require — verdict: PASS.

### 3b. Single `effectiveStats` pipeline — RESOLVED for both claimed sources

- **Passive skill tree replacing `meridianBonuses()`** — confirmed same slot, same
  signature, same shape (Progression's doc, verified above).
- **Titan-item Qi-regen** — CombatWorld's doc gets this exactly right, and directly
  answers the imprecision I flagged pre-doc: `qiRegen` is explicitly kept **out** of
  `effectiveStats` ("it is not one of effectiveStats' combat stats... and must not be
  added there") and instead gets its own tiny parallel aggregator
  (`gearQiRegenBonus(player)`, same shape/spot as `sockets.js`/`sets.js`'s
  `*Bonuses()` convention) consumed by `tickQi()` — option (b) from my original
  challenge, correctly chosen and correctly separated from the stat pipeline. No
  parallel *stat* pipeline was created; this is precise, not hand-wavy.
- Sets granting flat Attributes: confirmed unchanged, `setBonuses()` is generic over
  `SETS`, the 4 new sets plug in for free — as expected, low risk.

### 3c. Save schema (additive-or-migrated)
Every CUT/ADD must show its `save.js` field explicitly. Established pattern (score
this against): additive fields get an `if (!state.player.X) state.player.X = default`
line in `createGame`; only a genuinely incompatible *shape* change (v1→v2's zone
restructure is the one precedent) earns a VERSION bump + migration branch. No author
doc should propose a VERSION bump for a field that's merely new — that would be
over-engineering relative to the established, working pattern.

### 3d. Premium currency stays offline-earnable
**RESOLVED — `20-economy-premium.md` lands this cleanly.** Merit is earned entirely
in-game: per-kill/per-clear amounts hooked to exact call sites (`game.js attack()`
win branch, `boss.js onBossDefeated()`, `attemptDailyTrial()`, `achievements.js`'s
unlock path) plus a recurring Auction-House Merit-priced-listing sale path. Achievements
are explicitly scoped as a **bounded bootstrap** ("23 total ≈ 130 Merit lifetime... not
the main-line source"), not the load-bearing loop — exactly the risk I flagged
pre-doc, addressed head-on rather than glossed over. Real-money on-ramp is explicitly
NOT built, deferred to the author with a clean drop-in seam (`awardMerit`/a future
`purchaseMerit` stub) — matches the brief's ask precisely.

---

## 4. Directive-coverage checklist

| # | Directive ask | Owner (per brief) | Status |
|---|---|---|---|
| 1 | Cull ledger for every non-core system | Architect-Cull | ✓ landed — 17 nav entries verdicted, count math verified independently |
| 2 | Core loop: combat/equipment/auction/premium-shop/leveling/skill-tree | all four | ✓ Cull/Economy/Progression land their pieces; CombatWorld's combat piece pending |
| 3 | Legendary always-Set / SE always-Set / Titan not-Set | CombatWorld | ✓ landed — 2 legendary templates that lacked a setId fixed, 2 new SE sets authored from scratch, Titan gear never gets a setId (enforced by omission, verified correct) |
| 4 | Sets grant flat Attributes only (no exotic effects) | CombatWorld | ✓ matches existing `sets.js` mechanism, 4 new sets all flat-stat only |
| 5 | Legendary: multiple/area, SE: exactly 1/area | CombatWorld | ✓ landed — `js/rarespawns.js`, per-slot independent roll (Legendary) + zone-wide `anySuperEliteAlive` cap (SE), new module as expected |
| 6 | Titan: move-and-chase, ~10 hits, then drops | CombatWorld | ✓ landed and verified — see §3a, PASS on independent trace |
| 7 | Debug spawn buttons (Legendary/SE/Titan, multi-spawn) | CombatWorld | ✓ landed, `?dev=1`-gated per the PR #13 constraint — doc asserts "lead-approved" override of the no-always-on-debug rule; **worth the lead confirming that approval actually happened** (I have no visibility into it), though the `?dev=1` gating itself satisfies the constraint's substance regardless |
| 8 | Drop rates 25% / 50% / 100% | CombatWorld | ✓ landed exactly as specified, with citations to the exact `attack()` branch |
| 9 | Debug 100%-drop toggle | CombatWorld | ✓ landed — `js/debug.js`, same `?dev=1` gating as #7 |
| 10 | Combat results on side of map, Combat tab removed | CombatWorld ↔ Architect-Cull | ✓ both halves landed and cross-confirmed — DOM ids unchanged (`getElementById`, not tab-relative), zero `ui.js`/`combatfx.js` changes needed per CombatWorld's own trace |
| 11 | 1-9 attacks monster in slot | CombatWorld | ✓ both halves landed, sequenced (Cull's removal lands first, CombatWorld's rebind second, avoiding a simultaneous `input.js` edit) |
| 12 | Premium currency name/flavor/earn/sink, tradeable on AH | Economy | ✓ landed — Merit, concrete hook-level earn table, verified |
| 13 | Premium upgrade shop (icon-opened), absorbs scattered sinks | Economy | ✓ landed — Hall of Merit, 12-row catalog, opens from HUD Merit chip per directive |
| 14 | Auction house dual-currency | Economy | ✓ landed — `currency` field on listings, verified call-site-safe param ordering |
| 15 | Leveling + stats (existing) | Progression | ✓ landed — explicit KEEP-as-is, confirmed rather than silently assumed |
| 16 | Passive skill tree consolidating meridians.js | Progression | ✓ landed — 5→8 nodes, same add-line, same signature |
| 17 | Few active abilities consolidating techniques.js, Qi cost, 10+min duration | Progression | ✓ landed — 9→4, tier/prereq graph deleted, durations stretched to 10-15 min |
| 18 | Sound effects | Lead (cross-cutting synthesis) | out of scope for the four authors; confirm lead owns it as stated in brief |
| 19 | Visual-identity "less like AI" direction | Architect-Cull | ✓ landed — concrete palette/type/icon/motion direction, CSS variable citations verified accurate |
| — | **Quests / `quests.js` fate** | **unassigned in brief** | **✓ RESOLVED by Architect-Cull — explicit KEEP, absorbs Bounties** |
| — | **Respec catalog rows vs. Progression's exposed hooks** | Economy ↔ Progression | **✓ RESOLVED — both sides converged on `statRespec`/`resetMeridians`/`resetTechniques`, see §5.7** |
| — | **Merit-award hook field naming (`monster.tier` vs. boolean flags)** | Economy ↔ CombatWorld | **open — found during this review, see §5.8; flagged to both authors directly** |

---

## 5. Cross-author conflicts for the lead to adjudicate

1. **Sets vs. Cull — RESOLVED.** Architect-Cull KEEPs `sets.js` as the Equipment
   pillar; CombatWorld's doc confirms it grows the roster (3→7 sets: the original
   `nineHeavens` plus 2 new Legendary-tier sets fixing the 2 previously set-less
   templates, plus 2 brand-new Super-Elite sets) to actually cover the procedural
   Legendary/SE drop economy, not just restate "sets stay." No contradiction anywhere
   in the landed docs.
2. **1-9 keys — RESOLVED, both sides confirmed and sequenced.** Architect-Cull removes
   the `openNavPanel` digit binding; CombatWorld adds the slot-attack rebind after,
   explicitly sequenced (not simultaneous) to avoid a merge collision on the shared
   `input.js` file. Both docs record the same resolution independently — verified
   consistent.
3. **Premium-currency sourcing — RESOLVED.** Economy's Merit-award table (§1.3) names
   exact amounts per source (Legendary +2, SE +6, Titan +20, boss clears +8/+10/+12,
   daily trial +1, achievements by tier) hooked to exact call sites; CombatWorld's
   cross-talk section correctly declines to also specify Merit amounts (leaves that to
   Economy) while confirming the sell-value multipliers (`RARITIES.superElite.sellMult
   = 130`, `.titan = 140`) are provisional/tunable. Division of labor is clean — no
   double-specification. (The one loose thread from this handoff is the **field-naming
   mismatch** in item 8 below, not the amounts/ownership split.)
4. **Ascension vs. Progression — de-risked, not fully closed.** `ascension.js`'s
   `performAscension` wipes `player.meridians = {nodes:{}}` and resets
   `player.skillPoints = 0`/`learnedTechniques = []` directly. Progression's doc keeps
   `player.meridians.nodes` the same open `{id:rank}` shape — Ascension's existing
   reset line needs zero changes for that part. Progression has since demoted the §4
   pool-merge to deferred/non-blocking (per their message during this review), which
   further de-risks this item, but the lead should still require one explicit line in
   the build-wave notes confirming `ascension.js` needs no code change regardless of
   which respec shape ships.
5. **Qi-regen as an effectiveStats source — RESOLVED.** CombatWorld correctly keeps
   `qiRegen` out of `effectiveStats` entirely, aggregating it in a small parallel
   helper (`gearQiRegenBonus`) consumed by `tickQi()` — see §3b. Also correctly
   intersects with Progression's `QI_REGEN_MS` retune (3000→48000ms): CombatWorld's
   `tickQi()` rewrite multiplies the *existing* `QI_REGEN_MS` constant rather than
   hardcoding the old value, so whichever retune lands, the Titan Qi-regen bonus
   automatically applies against the current constant — no stale-baseline risk.
6. **Quests.js ownership — RESOLVED.** Architect-Cull's ledger explicitly KEEPs
   `quests.js` on its own tab and merges Hunt Bounties into it.
7. **Respec catalog rows vs. Progression's exposed hooks — RESOLVED.** Found during
   this review (Economy's `meridianRespec`/`techniqueRespec` rows called a
   `techniquePointsSpent(player)` function that existed nowhere, and Progression's
   actual hooks were named differently). Both authors converged directly: Progression
   now exports unconditional `resetMeridians`/`resetTechniques`/`techniquePointsSpent`
   matching Economy's shipped two-row shape exactly (demoting their own §4 pool-merge
   to non-blocking-deferred rather than forcing Economy to wait on it), and Economy
   added the missing `statRespec` row calling Progression's real `respecStats()`. Full
   resolution confirmed by both authors' messages during this review.
8. **Merit-award hook field naming — RESOLVED, and correctly re-verified by Economy
   rather than taken on faith.** My original flag was raised against the version of
   `40-combat-world.md` on disk at the time (boolean flags only, no `monster.tier`).
   By the time I circled back, CombatWorld had already added a callout ("resolving the
   Author-Economy/Critic4 cross-doc flag") setting **both** the booleans (which
   `game.js attack()` branches on internally) **and** a `monster.tier` string
   alongside them, specifically so Economy's hook has one field to check. Notably,
   **Author-Economy did not just accept my second message at face value** — they
   re-checked the live doc themselves, found their original design was already correct
   against the current revision, and told me so (with the useful process note that a
   flag should be timestamp-checked against the doc's current state before resending).
   That's exactly what an adversarial-review loop should produce: authors verifying
   claims independently rather than deferring to the critic by default. While
   reconciling, **Economy also self-caught a real, previously unflagged gap**:
   `market.js`'s `MARKET_PREMIUM` table is a hardcoded per-rarity map with a `?? 2`
   fallback — `superElite`/`titan` listings would have silently priced at a generic 2×
   premium instead of a tier-appropriate one. Fixed in their §4.2/§7.3 with explicit
   entries (`superElite: 3.8, titan: 3.5`, correctly slotted between `legendary: 3.6`
   and `mythic: 4.2` to match CombatWorld's own power-curve ordering). Both authors
   converged without needing lead adjudication.

---

*(All four author docs reviewed; all findings above reflect their final landed
content. Two live cross-author mismatches were found and resolved during this review
(§5.7, §5.8) — both closed by the authors themselves. Lead notified via SendMessage.)*
