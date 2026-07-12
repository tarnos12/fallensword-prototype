# 30 — Progression, Passive Skill Tree & Active Abilities

**Owner:** Author-Progression. **Scope:** character leveling + stats (`progression.js`), the passive
skill tree (consolidating `meridians.js`), and the few long-duration active abilities (reshaping
`techniques.js`). Design-only pass — no `js/`/`index.html`/`css/` edits in this PR; build-ready spec
for the lead's implementation wave.

**Audited:** `js/progression.js`, `js/meridians.js`, `js/techniques.js`, `js/alchemy.js` (pill-buff
pathway), `js/ascension.js`, `js/game.js` (Qi economy + action wrappers), `js/save.js` (schema/
migration pattern), `tools/balance.mjs` (headless sim usage of meridians/techniques),
`docs/research/10-core-mechanics.md` §2/§3/§5, `docs/research/comparison/40-comparison.md`.

---

## Summary

The author's directive collapses today's three separate progression surfaces — stat allocation
(`progression.js`), an 8-node* Meridian passive tree, and a 9-entry technique tree with a 4-tier
prereq chain and 45s–2min buffs — into the target shape: **leveling+stats, one passive skill tree,
very few (10+ min) active abilities.**

*Audit correction: `meridians.js`'s own header comment says "the eight extraordinary meridians" but
only **5 of 8** are implemented (`governing`, `yangLinking`, `thrusting`, `girdle`, `conception`). This
proposal completes the promised 8 rather than leaving the comment stale.

**Net shape:** nothing is deleted outright from the passive tree (it grows from 5→8 nodes, still one
flat `effectiveStats` source). The active-ability side is where the real cut lives: **9 techniques →
4 abilities**, dropping the entire tier/prereq/category-gating system. The stat-allocation layer is
untouched. A structural merge (skill-tree points + technique points → one pool) is proposed as the
piece that makes "passive tree + active abilities" read as *one system* instead of two — flagged for
explicit lead sign-off since it's the widest blast radius in this doc.

**Reply to Critic4's audit (see thread):** all three of Critic4's checks are addressed inline below —
(1) the passive tree stays a **swap-in-place of the existing `meridianBonuses` add-line**, not a
second pipeline; active abilities are **the same `activeBuffs`/percentage-buff mechanism**, retuned,
not a new buff system; (2) `meridians.js` is **repurposed, never deleted** — the `progression.js`
import (`meridianBonuses`) and `tools/balance.mjs`'s `allocateMeridian`/`meridianPointsFree` calls keep
their exact signatures, so no caller breaks; (3) `cast()`'s refresh-not-stack semantics are explicitly
kept, with the DPS-uptime implication of 10+min buffs flagged for the balance pass, not silently waved
through.

---

## 1. Leveling & stats — KEEP, two small ADOPTs

**Keep as-is (works, no changes):** `js/progression.js` — `REALMS` (QC→FE→CF), `MAX_STAGE = 27`,
`STAGE_XP` curve (including the two realm-barrier spikes), `STAT_POINTS_PER_STAGE = 3`,
`ALLOC_STATS`, `POINT_VALUE` (HP's 4x discount — this is a deliberate, already-correct counter to the
FS "all-in Attack/Damage" meta per `10-core-mechanics.md` §3.2, do not touch), `allocateStat`,
`applyBreakthroughs`. This is the one part of the current system that already matches the author's
"keep what works" framing exactly.

### 1.1 Qi regen retune (the highest-leverage fix, per research §2.4)

- **Current:** `js/game.js:MAX_QI = 120`, `QI_REGEN_MS = 3_000` → **1200 Qi/hour**, ~13-24x FS's
  sourced 50–90/hr band. The file's own comment already flags this as placeholder prototype tuning.
- **Proposed:** `QI_REGEN_MS = 48_000` (1 Qi/48s → **75/hr**, mid-band). `MAX_QI` stays **120**
  (unchanged) — a full-from-empty tank now takes ~96 min, which is the right order of magnitude for
  "sessions not marathons" to actually bite, vs. today's 6 minutes.
- This single constant is what makes **every other number in this doc mean something** — the 10+min
  active-ability durations, their Qi costs, and the "don't over-buff" tension the research flags as
  currently inert (§5.3) all depend on Qi actually being scarce. Everything below is tuned against
  **75/hr**, not 1200/hr.
- **Touches:** `js/game.js` only (a module constant + `maxQi()`/`tickQi()` already read it; timestamps
  are already persisted, so this is a pure retune, zero schema change). Not single-owner per
  PROJECT.md's list, but it's the one number every other system's balance depends on — **needs a
  `tools/balance.mjs` re-run** (session-length / Qi-gate rows) before merge, and the lead should treat
  it as a freeze-early constant so Author-Economy's premium stamina upgrades and my ability costs are
  tuned against the same baseline, not a moving target.
- **Cross-talk (Author-Economy):** the premium shop's stamina/Qi-cap upgrades scale the *cap* (mirrors
  today's card/guild `qiCap` bonus shape); this retune only changes the *rate*. Independent levers —
  no overlap, but confirm Economy tunes shop Qi-cap prices against the 75/hr baseline, not 1200/hr.

### 1.2 Costed stat respec (ADOPT — mechanic here, cost/gating in Economy's shop)

GDD §6.3 proposed this and it was never built; research confirms no respec of any kind exists today
(`10-core-mechanics.md` §3.2). Split the concern cleanly:

- **Mechanic (this doc, `progression.js`):**
  ```js
  // Refunds all allocated stat points; caller (shop UI) charges the cost first.
  export function respecStats(player) {
    const refunded = ALLOC_STATS.reduce((sum, s) => sum + player.allocated[s], 0);
    player.statPoints += refunded;
    player.allocated = { attack: 0, defense: 0, damage: 0, armor: 0, hp: 0 };
    return { ok: true, refunded };
  }
  ```
  Pure, single-owner-file addition to `progression.js`. No new save fields (reuses
  `statPoints`/`allocated`, both already persisted).
- **Cost/gating (Author-Economy's file, premium shop):** the brief's own hand-off note says respec
  "likely lives in the premium shop" — I agree. Recommend gating by **invested points** (scales with
  total stat points ever allocated, per the research's own suggestion) so it isn't a free undo-button,
  and gating availability from FE1 (stage 10) onward, matching FS's "not a starter tool" framing.
  **Coordinate with Author-Economy on the exact currency (gold vs. premium currency vs. spirit stones)
  and price curve** — I'm not deciding that here, only exposing `respecStats()` as the hook to call.

---

## 2. Passive skill tree — MERGE (consolidate `meridians.js`, complete it to 8 nodes)

### 2.1 What stays exactly the same

`meridians.js` is **repurposed, not deleted or replaced**. It keeps being the single flat source that
plugs into `effectiveStats` at the exact same point it does today
(`js/progression.js` lines 97-104, the `merStat = meridianBonuses(player)` block — the fourth of seven
flat-source add-lines: `base → gear → cards → meridians → sockets → sets → [%buffs] → ascension`).
`meridianBonuses(player)` keeps its exact signature and return shape (`{attack,defense,damage,armor,
hp}`); **this is a swap-in-place of the existing add-line, not a second aggregation pass.** No other
line in `effectiveStats` moves. `tools/balance.mjs`'s `allocateMeridian`/`meridianPointsFree` calls
(lines 53, 156-166) keep working unmodified — they're already generic ("spend every free point on
combat nodes"), so adding 3 node entries to `MERIDIAN_NODES` doesn't touch balance.mjs at all.

### 2.2 What's added: complete the 8 promised nodes, tiered by realm

Today's 5 nodes are 5 of the 8 traditional extraordinary meridians (Du Mai/governing, Yangwei Mai/
yangLinking, Chong Mai/thrusting, Dai Mai/girdle, Ren Mai/conception). The missing three — **Yinwei
Mai (Yin Linking Vessel)**, **Yangqiao Mai (Yang Heel Vessel)**, **Yinqiao Mai (Yin Heel Vessel)** —
are added as a **second tier gated to Foundation Establishment** (`minStage: 10`, i.e. FE1), giving the
tree actual depth (a realm-gated second ring) instead of 8 nodes all available from level 1:

```js
export const MERIDIAN_NODES = {
  // --- Tier 1 (Qi Condensation, open from level 1) — unchanged ---
  governing:    { stat: 'attack',  perRank: 2, maxRank: 5, minStage: 1  /* unchanged */ },
  yangLinking:  { stat: 'defense', perRank: 2, maxRank: 5, minStage: 1  },
  thrusting:    { stat: 'damage',  perRank: 2, maxRank: 5, minStage: 1  },
  girdle:       { stat: 'armor',   perRank: 1, maxRank: 5, minStage: 1  },
  conception:   { stat: 'hp',      perRank: 8, maxRank: 5, minStage: 1  },
  // --- Tier 2 (Foundation Establishment, NEW — completes the eight) ---
  yinLinking:   { id: 'yinLinking', name: 'Yin Linking Vessel', stat: 'damage', perRank: 3, maxRank: 5, minStage: 10, icon: '⚔', desc: 'Yinwei Mai — a deeper current beneath the Thrusting Channel.' },
  yangHeel:     { id: 'yangHeel',   name: 'Yang Heel Vessel',   stat: 'attack',  perRank: 3, maxRank: 5, minStage: 10, icon: '🗡', desc: 'Yangqiao Mai — quickens the strike beyond the Governing Vessel.' },
  yinHeel:      { id: 'yinHeel',    name: 'Yin Heel Vessel',    stat: 'armor',   perRank: 2, maxRank: 5, minStage: 10, icon: '🧿', desc: 'Yinqiao Mai — a second girding, steadier than the first.' },
};
```
`nodeRow()`'s render gains one condition: a Tier-2 node shows locked/greyed with "Opens at Foundation
Establishment" until `player.level >= node.minStage`, mirroring how `techniques.js:canLearn` already
gates on `minStage` — same pattern, no new concept for players to learn.

Every stat (attack/defense/damage/armor) now has one Tier-1 (cheap, early) and one Tier-2 (pricier
per-rank, later) node; HP keeps its single, already-discounted node. **This is additive to
`MERIDIAN_NODES` only** — `player.meridians.nodes` is already an open `{id: rank}` map (per the file's
own comment: "tolerates a missing player.meridians... old saves → all zero"), so **no save migration
is needed for this piece**: an old save simply has no entries for the 3 new ids until the player
spends points there.

**A rate-boosting Qi node was considered and explicitly deferred**, not proposed: research §2.4
suggests a Qi-*regen-rate* passive source (as opposed to the cap-raising cards/guild already do), and
a meridian node is a natural fit — but Qi economy upgrades are the premium shop's territory per the
brief. Flagging it here rather than quietly adding it avoids Progression and Economy building two
competing levers on the same resource. **If the lead wants this, it should be a joint call with
Author-Economy**, not unilateral in either doc.

### 2.3 Points: earned-per-breakthrough model, unchanged mechanism (see §4 for the pool merge)

`MERIDIAN_POINTS_PER_STAGE = 1`, derived from level (not stored) exactly as today — **unless** the
pool-merge in §4 ships, in which case points move to the shared banked counter. Both variants are
specified in §4 so the lead can pick one; §4 is the one part of this doc that needs explicit sign-off
before a build wave touches it.

### 2.4 IA note for Architect-Cull (not my call, flagging the input)

Today `meridians.js` is a **self-contained modal** (own ☯ nav button, own overlay DOM), while
`techniques.js` has **no DOM of its own at all** — its buffs are rendered inside the existing
Cultivator tab via `ui.js:renderTechniques` (`js/ui.js` line 629, `export function
renderTechniques(state, { onLearn, onCast })`, called from `main.js` lines 185/203). That's an existing
asymmetry, not something I'm introducing. Given the author's framing ("skill tree" as one concept spanning both
passive nodes and active abilities), my recommendation is **fold both into one "Skill Tree" section of
the Cultivator/char tab** rather than keeping Meridians as a separate modal — but the tab/IA
restructure is Architect-Cull's surface to own; this is input, not a decision made here.

---

## 3. Active abilities — CUT/MERGE (9 techniques → 4 abilities, drop the tier/prereq system)

### 3.1 The cut: why 9 → 4, and where each one goes

The current `techniques.js` has 3 categories × up to 4 tiers each (`ironFist→blazingPalm→heavenStrike
→voidRendingFist`, etc.), a `prereqs` dependency chain, and 45s–2min durations. This is exactly the
"too many systems, hidden away" complaint scaled down to one module: a mini skill-chain inside the
skill tree. The reshape:

| New ability (id) | Category | Merges / replaces | Effect | minStage | Qi cost | Duration |
|---|---|---|---|---|---|---|
| **Iron Fist Art** (`ironFistArt`) | Offense | `ironFist`, `blazingPalm`, `heavenStrike`, `voidRendingFist` | +20% Attack, +20% Damage | 1 | 24 | 12 min (720,000ms) |
| **Adamantine Ward** (`adamantineWard`) | Defense | `stoneSkin`, `goldenBell`, `adamantBody`, `immortalGoldenBody` | +20% Defense, +25% Armor, +15% Max HP | 1 | 24 | 12 min (720,000ms) |
| **Vital Circulation** (`vitalCirculation`) | Special (safe) | `vitalMeditation` | +30% Max HP | 5 | 16 | 15 min (900,000ms) |
| **Berserk Fervor** (`berserkFervor`, unchanged id) | Special (risky) | itself, unchanged | +35% Damage, −20% Armor | 8 | 20 | 10 min (600,000ms) |

**Cut outright, no successor:** `spiritSeverance`, `goldenCoreAscendance`. Their "everything surges"
flavor is redundant once Ascension (`ascension.js`) is the game's actual "everything gets stronger"
prestige fantasy — keeping a technique that does the same job as prestige is exactly the kind of
duplicate-system the author wants gone.

**Why a fixed % instead of the old per-tier escalation:** percentage buffs already scale with the
player's growing flat stats (base+gear+cards+meridians+sockets+sets) — a flat +20% Attack is
proportionally meaningful at level 1 and at level 27 without needing 4 separate tiers to "keep up." The
old tier-escalation (15%→18%→25%→40%) was solving a problem percentage buffs don't actually have. One
fixed number per ability, forever, is simpler and loses nothing.

**Why keep Berserk Fervor's trade-off exactly as-is:** it's the one entry in the old list with a real
build-defining choice (−20% Armor is a genuine cost, not just "smaller version of the good buff"). The
other three are additive strict-upgrades-with-no-downside; Berserk Fervor is the deliberate exception,
kept for exactly that reason — a set of 4 abilities that are all "just cast the biggest number" would
be a worse design than today's, even with fewer entries.

**Category/tier fields:** `category` stays as a flavor/icon label only (Offense/Defense/Special,
unchanged from today). `tier` and `prereqs` are **deleted from the data shape entirely** — `canLearn`
no longer walks a prereq chain, it only checks `player.level >= t.minStage` and the point cost. This is
the actual structural simplification: no more dependency graph to reason about, at all.

### 3.2 Mechanism: unchanged, just retuned — same pipeline, not a new one

`cast()`, `activeBuffs()`, `cleanExpired()` keep their exact current logic:
`player.activeBuffs` still holds `{techniqueId, effect, castAt, duration, expiresAt}`; `cast()` still
**refreshes (filters out then re-pushes), never stacks** — casting Iron Fist Art twice does not double
its uptime or its effect, it just resets the 12-minute clock. This is unchanged from today and is
explicitly preserved (Critic4's check #3): a 10+ minute buff with stacking would be a much bigger
DPS-uptime swing than today's 90s buffs; refresh-only keeps the semantics identical, only the numbers
grow. `effectiveStats`'s technique-buff loop (the `for (const buff of activeBuffs(...))` block,
`progression.js` lines 122-128) is **completely untouched** — active abilities are still percentage
modifiers on the same flat subtotal, applied at the same pipeline step. This is a retune of an existing
system, not a new buff mechanism.

**Flag for the lead/balance pass (not blocking this doc):** 10+ minute near-permanent uptime buffs are
a real DPS/survivability shift vs. today's 90s-window buffs (players will realistically keep Iron Fist
Art/Adamantine Ward up almost continuously once Qi allows it, rather than popping them situationally).
`tools/balance.mjs`'s existing `buff` sim option (line 166-169, currently a synthetic
`{techniqueId:'sim-buff', effect:{attack:0.25,damage:0.25}}` fixture) should be updated to reflect
**near-100%-uptime** of the new abilities' actual effect values, not the old 90s-window assumption,
before any balance sign-off.

### 3.3 The two-buff-pathway split (Sprint 1 note) — KEEP, unchanged

`js/alchemy.js`'s `pillBuffs` remain a **separate list, applied at combat-actor-snapshot time**
(`applyPillBuffs`, called from `game.js:attack`/trial code, never touching `effectiveStats` or
`player.activeBuffs`) — exactly as documented in `alchemy.js`'s own header comment. This proposal does
**not** merge `activeBuffs` and `pillBuffs` into one list. Two parallel buff lists remain a deliberate,
already-documented, file-ownership-respecting choice per the research note (§5.3) — worth revisiting
only if a *third* timed-buff source is ever added, which is out of scope here.

---

## 4. Cross-cutting proposal: one shared "Skill Points" pool (needs lead sign-off)

This is the piece that makes "passive tree + few active abilities" actually read as **one skill tree**
instead of two separately-gated systems sharing a tab. Today there are two point currencies:
`player.skillPoints` (banked int, spent in `techniques.js:learn`) and meridian points (derived live
from `player.level`, spent in `meridians.js:allocateMeridian`). I recommend merging them.

### 4.1 Proposed shape

- **One breakthrough grant:** `applyBreakthroughs` in `progression.js` grants **2 points per stage**
  (replacing the current `STAT_POINTS_PER_STAGE`-adjacent `SKILL_POINTS_PER_STAGE = 1` +
  `MERIDIAN_POINTS_PER_STAGE = 1` — same total points issued as today, just banked in one place instead
  of split derived-vs-stored).
- **Spend on either:** a passive node rank (1 point/rank, unchanged cost) or an active-ability unlock
  (2 points flat, no prereqs — down from today's 1-3 varying cost since there's no chain to gate).
- **Budget sanity check:** 8 nodes × 5 ranks = 40 passive ranks + 4 abilities × 2 points = 8 points to
  "complete" the tree = 48 total. At 2 points/stage over 26 breakthroughs (level 2→27) = 52 points
  earned — a small, deliberate surplus (4 points) so a player can nearly-but-not-quite max everything
  pre-ascension, keeping allocation a real choice rather than a foregone "eventually get it all."
- **Respec:** `respecSkillTree(player)` (new, `progression.js` or `meridians.js`) unlearns all
  abilities and resets all node ranks, refunding the full pool — same cost/gating-lives-in-the-shop
  split as §1.2's `respecStats`.

### 4.2 Migration (this is the one genuinely breaking-shaped change in this doc)

Meridian points are **derived** today (no stored counter); merging them into a **stored** pool needs a
one-time, idempotent conversion so nobody double-gains or loses points on the day this ships:

```js
// One-time back-fill, called from createGame() alongside save.js's other
// additive back-fills. No VERSION bump — reuses existing fields + one new bool.
function migrateSkillPool(player) {
  if (player.skillPoolMerged) return;
  const meridianPoints = meridianPointsEarned(player); // level-derived, pre-migration formula
  const meridianSpent = meridianPointsSpent(player);   // ranks already opened, kept as-is
  player.skillPoints = (player.skillPoints ?? 0) + (meridianPoints - meridianSpent);
  player.skillPoolMerged = true; // additive flag, prevents re-granting on next load
}
```
Existing `learnedTechniques` entries also need remapping (§4.3) in the **same** back-fill pass, since
both changes land together.

### 4.3 Technique-id remap (save-breaking, needs a migration branch — flagged per PROJECT.md's rule)

Old saves may have any of the 9 legacy ids in `player.learnedTechniques`. Cutting/renaming them without
a migration would make `TECHNIQUES[id]` resolve to `undefined` for old saves (a real crash risk in
`isLearned`/UI rendering) — this is exactly the "CUT is a breaking change → needs a save.js migration
plan" case PROJECT.md calls out.

```js
const LEGACY_TECHNIQUE_MERGE = {
  ironFistArt:      ['ironFist', 'blazingPalm', 'heavenStrike', 'voidRendingFist'],
  adamantineWard:   ['stoneSkin', 'goldenBell', 'adamantBody', 'immortalGoldenBody'],
  vitalCirculation: ['vitalMeditation'],
  // berserkFervor carries over unchanged — same id, no remap needed.
};
const CUT_OUTRIGHT = ['spiritSeverance', 'goldenCoreAscendance'];

function migrateTechniques(player) {
  const learned = new Set(player.learnedTechniques ?? []);
  for (const [newId, oldIds] of Object.entries(LEGACY_TECHNIQUE_MERGE)) {
    if (oldIds.some((id) => learned.has(id))) learned.add(newId); // grant the merged ability for free
    for (const id of oldIds) learned.delete(id);                  // drop the dead legacy id
  }
  for (const id of CUT_OUTRIGHT) learned.delete(id);
  player.learnedTechniques = [...learned];
}
```
No point refund/recharge on the merge grants — a player who'd learned any tier of a chain already paid
for it once; auto-granting the merged successor for free is the fair outcome and avoids a "you owe us
points back" edge case. Run in the **same** `createGame` back-fill pass as §4.2, guarded by the same
`skillPoolMerged` flag so it only ever runs once. Also add a defensive `TECHNIQUES[b.techniqueId]`
truthy guard inside `activeBuffs()`/`cleanExpired()` in case a save has a stale active buff referencing
a cut id at the exact moment of migration (edge case, cheap to guard).

**This is the widest blast radius in this doc** — it touches `progression.js` (points grant),
`meridians.js` (points-earned formula), `techniques.js` (data + `learn`/`canLearn`), and `save.js`'s
back-fill path, all in one PR. Per CLAUDE.md's single-owner-file rule this needs to **land as one
serialized PR/session**, not split across concurrent build-wave agents. **If the lead wants to de-risk
this milestone, the fallback is: don't merge the pools** — keep `skillPoints` and meridian-points
separate as today, just apply §2 (8-node tree) and §3 (4 abilities) independently. Both pieces work
fine without the merge; the merge is what makes it feel like *one* tree instead of two adjacent ones.

---

## 5. CUT vs KEEP vs MERGE vs ADD ledger

| Item | Verdict | Notes |
|---|---|---|
| Realms/stages/`MAX_STAGE`/`STAGE_XP`/`STAT_POINTS_PER_STAGE`/`POINT_VALUE`/`allocateStat` | **KEEP** | Works, no changes. |
| `QI_REGEN_MS` (1200/hr → 75/hr) | **ADOPT/retune** | `game.js` constant only; highest-leverage fix per research. |
| Stat respec | **ADD** | `respecStats()` in `progression.js`; cost/UI lives in Economy's premium shop. |
| Meridian nodes `governing/yangLinking/thrusting/girdle/conception` | **KEEP** | Unchanged stat/perRank/maxRank. |
| Meridian nodes `yinLinking/yangHeel/yinHeel` | **ADD** | Completes the promised 8, FE-gated (Tier 2). |
| `meridianBonuses()` → `effectiveStats` plug-in point | **KEEP** | Same add-line, same signature, no pipeline change. |
| Techniques `ironFist/blazingPalm/heavenStrike/voidRendingFist` | **MERGE** | → `ironFistArt`, one fixed +20%/+20% buff. |
| Techniques `stoneSkin/goldenBell/adamantBody/immortalGoldenBody` | **MERGE** | → `adamantineWard`, one fixed buff. |
| Technique `vitalMeditation` | **MERGE (rename)** | → `vitalCirculation`, same slot, safe/sustain flavor. |
| Technique `berserkFervor` | **KEEP** | Unchanged id/effect — the one real risk/reward pick. |
| Techniques `spiritSeverance`, `goldenCoreAscendance` | **CUT** | Redundant with Ascension's "everything gets stronger" fantasy. |
| Technique `tier`/`prereqs` gating | **CUT** | Replaced by flat `minStage`-only gating, no dependency graph. |
| `activeBuffs`/`cast()` refresh-not-stack mechanism | **KEEP** | Unchanged; durations/costs retuned only. |
| `pillBuffs` (alchemy.js) as a separate buff channel | **KEEP** | Two-pathway split from Sprint 1 stays as-is. |
| `skillPoints` (technique) + meridian-points (derived) → one pool | **MERGE (conditional)** | Needs lead sign-off; fallback = don't merge, ship §2+§3 independently. |

---

## 6. Cross-talk sent / pending

- **Author-Economy:** (a) stat/skill-tree respec cost + gating belongs in the premium shop — I've
  exposed `respecStats()`/`respecSkillTree()` as pure mechanic hooks, need your cost curve and where the
  button lives; (b) confirm premium Qi-cap upgrades are tuned against the **75/hr** retuned baseline,
  not the old 1200/hr; (c) the deferred Qi-regen-rate meridian node (§2.2) — flagging in case you want
  it in the shop instead, or jointly designed.
- **Architect-Cull:** IA input in §2.4 — recommend folding Meridians' modal + Techniques' tab-embedded
  UI into one "Skill Tree" section, but the tab/surface decision is yours.
- **Lead:** §4's pool-merge is the one item needing an explicit go/no-go before any build-wave agent
  touches `progression.js`/`meridians.js`/`techniques.js`/`save.js` concurrently — please confirm before
  freezing the build-wave assignment, and note it must land as one serialized PR if approved.

Message sent to lead on completion, flagging §4 as the one open decision.
