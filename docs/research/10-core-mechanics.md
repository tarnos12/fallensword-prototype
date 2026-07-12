# Core Mechanics — FallenSword vs. Fallen Immortal

**Owner:** Researcher-Core. Scope: combat resolution, stamina/Qi, leveling & stats, gear & rarity,
skills/techniques & buffs. Structure per doc: for each area — (1) FallenSword mechanics (sourced),
(2) our current state (real `js/` code, file:function), (3) gap analysis, (4) opportunities (S/M/L).

**Fact-quality note:** the primary FallenSword wikis (`wiki.fallensword.com`, `fallensword.fandom.com`)
return HTTP 403 to direct fetches from this sandbox (both the live domain and Wayback Machine mirrors
are blocked for this session's WebFetch tool). All FallenSword claims below are sourced via WebSearch
result snippets that quote/paraphrase those wiki pages directly — the URL is cited for every claim so
the exact wiki page can be independently checked. Anything not surfaced by search is tagged
**[UNVERIFIED]** rather than asserted.

---

## 1. Combat resolution

### 1.1 FallenSword mechanics
- **Attack vs Defense determines hit chance.** "Attack points allow a player to actually hit the
  target. The more attack a player has, the more likely that player will actually score a hit... If a
  player has less attack than the opponent's defense, the player is unlikely to score a hit." Defense
  is explicitly described as having "the same 2% automatic chance that the opponent will hit you
  regardless of your defense" — i.e. a hit-floor exists even against overwhelming Defense.
  [Attack — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Attack),
  [Defense — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Defense)
- **Damage vs Armor+HP determines the per-round outcome**, a three-way branch: "Damage > Armor + HP =
  Kill; Damage > Armor = Wound; Damage < Armor = Miss / -1HP." So even a "miss" on the damage side
  still chips 1 HP rather than doing nothing.
  [Damage — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Damage)
- **Capped-stamina attack tiers.** Three attack options: 20/40/60 stamina. "A 20 stamina attack will
  not use more than 20 swings of your weapon. If the creature is still undefeated then this will
  result in 'Combat Unresolved.'" [UNVERIFIED — could not confirm from search snippets] whether
  Combat Unresolved carries any partial reward or is a clean no-op; GDD assumes the latter.
  [Stamina — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Stamina)
- **XP scales with level gap.** "Training on creatures at a lower level than you will yield less
  experience... hunting monsters that are slightly above your level (1-2 levels) is more efficient."
  [Experience Points — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Experience_Points)
- **Death penalty: gold and XP loss, no permadeath, no item loss.** "You will lose XP if you are
  defeated by a creature in combat... you will also loose some gold." Mitigations exist in the live
  game (a "Defiance" buff, or a paid "Protect XP" FSP upgrade) that have no offline analogue.
  [Gold — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Gold)
- [UNVERIFIED] exact death-penalty percentages (gold %, XP %) — search did not surface a specific
  number; GDD's own §8.5 open-tuning-question flags this same gap and notes veteran complaints that
  the real penalty ("roughly half a level's worth of XP for newer players" per GDD's own framing) was
  considered harsh.

### 1.2 Our current state
- `js/combat.js:hitChance` — `attack / (defense * 2)`, clamped `[0.05, 0.95]` (`HIT_FLOOR`/`HIT_CEIL`).
  Equal Attack/Defense = 50% hit, matching FS's directional relationship; our floor (5%) is much more
  generous to the underdog than FS's stated "2% automatic chance," and we also apply a ceiling FS's
  wiki snippet doesn't mention (no stated miss-floor against weak Defense).
- `js/combat.js:rollDamage` — `damage*(0.95+rng()*0.1) - armor*(0.95+rng()*0.1)`, floored at 1 (never a
  true zero-damage hit). This collapses FS's three-way Kill/Wound/Miss-but-chip-1HP branch into a
  single "always chip at least 1" model — we never have a pure "Miss" branch distinct from a Wound;
  every landed swing does *some* damage. Functionally similar outcome (chip damage on a soft hit) but
  arrived at differently (noise-based subtraction vs. a discrete threshold branch).
- `js/combat.js:resolveCombat` — `MAX_TURNS = 20` turn cap, attacker swings first each round, defender
  counters only if still alive; unresolved after 20 turns returns `outcome: 'draw'`.
  `staminaSpent: turns.length` — 1 Qi per turn actually resolved, matching FS's "even a missed swing
  still costs stamina" rule and the "up to 20 swings" tier exactly (we only implement FS's base 20-cap
  tier, not the 40/60 tiers — see §2 gap).
- `js/game.js:canAttack` (line 470-472) gates the Attack button on `qi >= MAX_TURNS` (worst-case 20 Qi)
  up front, then `js/game.js:attack` (line 474+) deducts the *actual* `staminaSpent` after resolving —
  this exactly matches GDD §8.1's "commit worst-case up front, spend only what's used" model, which is
  itself explicitly modeled on FS's up-front stamina check.
- XP level-gap scaling: `js/game.js:scaleXp` (line 416-419) —
  `mult = clamp(1 + 0.25*(creatureLevel - playerLevel), 0.1, 2)`. Punching up caps out at 2x, farming
  far below floors at 0.1x. Directionally matches FS's "higher for punching up, negligible below."
- Death penalty: `js/game.js` lines 545-546 — `DEATH_STONE_LOSS = 0.05` (5% of current spirit stones),
  `DEATH_XP_LOSS = 0.03` (3% of current-level XP progress, not total/account XP). No item loss, no
  permadeath — matches FS's shape (gold/XP loss only) and GDD §8.3's explicit "never send someone back
  a full level" design choice, deliberately gentler than FS's real (unsourced-number but
  reportedly-harsh) penalty.
- Draw/unresolved: `resolveCombat` returns `outcome: 'draw'` with no rewards, no penalty — Qi already
  spent stays spent. Matches FS's Combat Unresolved (stamina consumed, no result) as adapted by GDD §8.3.
- `combat.js` is a pure function of `(attacker, defender, seed)` — deterministic via `mulberry32`
  (`js/rng.js`) — no game state, UI, or wall-clock inside it (per PROJECT.md hard constraint), which
  has no FallenSword equivalent to compare against (FS is a live server, not a documented pure function)
  but is the correct offline/testable analogue.

### 1.3 Gap analysis
- **Match:** hit-chance direction (Attack vs Defense), damage-vs-armor chip-floor behavior, 20-turn
  cap → draw, up-front stamina commit + per-turn actual spend, XP level-gap curve shape, gold+XP-only
  death penalty with no item/permadeath loss.
- **Divergence — three-way outcome collapsed to two-way.** FS's Kill/Wound/Miss(-but-chip) is a
  genuine three-branch resolution (with a Miss branch that could plausibly do *nothing* on a hard
  miss, as distinct from a Wound); our `rollDamage` always chips ≥1 on a landed hit, with no separate
  "hit but softer than a Wound" tier. Low risk — the practical output (small guaranteed chip on a soft
  hit) is very close to FS's stated floor behavior, just derived via noise instead of a discrete branch.
- **Divergence — only one stamina tier (20), not 20/40/60.** We hard-code `MAX_TURNS = 20`; FS lets the
  player choose a 40 or 60-stamina commitment for tougher fights that would otherwise Combat-Unresolve
  at 20. This is a real player-facing capability gap: our players have no way to commit more Qi upfront
  to push through a longer fight against a tough foe — they either fit in 20 turns or draw, full stop.
- **Divergence — no explicit "Protect XP" / Defiance-style death-penalty mitigation.** FS lets players
  buy or earn XP-loss protection; we have none (no such buff/consumable exists in `techniques.js` or
  `alchemy.js` today). Given our penalty is already far gentler (3%/5% vs. FS's reportedly harsher,
  unsourced numbers), this is likely fine as-is, but worth flagging since it's a real FS system with no
  offline analogue.
- **We do better:** deterministic pure-function combat core makes balance headlessly simulatable
  (`tools/balance.mjs`) in a way a live FS-style server never was for outside analysis — this is a
  genuine advantage of the offline architecture, not a gap.
- **Unverified risk:** exact FS death-penalty percentages are not sourced; our 5%/3% are original
  tuning values, not FS-derived, so there's no mismatch to defend, just nothing to compare precisely.

### 1.4 Opportunities
1. **[S] Add a 40/60-Qi "push through" attack tier.** Let `canAttack`/`attack` accept a stamina-cap
   parameter (raise `MAX_TURNS` per-call up to e.g. 40/60) so a tough fight that would draw at 20 turns
   can be fought to a real conclusion at a steeper Qi cost — this is a documented FS mechanic we
   currently don't offer at all. Touches `js/combat.js` (already parameterizable — `MAX_TURNS` is a
   module constant, would need to become a `resolveCombat` argument) and `js/game.js:canAttack/attack`.
   Respects the "pure function" constraint as long as the cap is passed in, not hard-coded.
2. **[S] Surface the "Combat Unresolved" language/UX explicitly** (currently just "draw") so players
   recognize it as "this matchup wasn't worth it, walk away" per GDD §8.3 intent — a copy/UI change in
   `combatfx.js`/`toast.js`, no engine change.
3. **[M] Consider a genuine third combat branch (soft miss with zero chip)** if playtesting shows the
   always-chip-1 floor makes low-Damage builds feel like they can never truly whiff — would need a
   `js/combat.js:rollDamage` change and a `tools/balance.mjs` re-verify (touches the "pure function"
   constraint's *contents*, not its purity, so it's in-bounds but needs the balance-harness gate).

---

## 2. Stamina / Qi

### 2.1 FallenSword mechanics
- **Base regen: 50 stamina/hour** for a new player; **max regen with upgrades + guild structures: 90/hour**,
  further boostable via epic-item bonuses beyond that. [Stamina Gain / Max Stamina — Fallen Sword Wiki
  via search](https://wiki.fallensword.com/index.php/Stamina)
- Stamina is spent on movement/attacks and skill-casting (see §5); regen continues while offline
  (wall-clock based) — consistent with the genre's "check in periodically" loop.
  [Stamina — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Stamina)
- [UNVERIFIED] the exact base/max **stamina cap** (as opposed to regen rate) — search results
  surfaced regen-rate numbers clearly but not a definitive numeric stamina ceiling; do not treat "50/hr"
  or "90/hr" as a cap, they are accrual rates.

### 2.2 Our current state
- `js/game.js:MAX_QI = 120`, `QI_REGEN_MS = 3_000` → **1 Qi per 3 seconds wall-clock**, i.e. 1200 Qi/hour
  base — roughly **13-24x FS's stated 50-90/hour** rate. The file's own comment flags this directly:
  "Prototype regen is fast so playtesting isn't gated on a real clock; 1.0 tuning will slow this
  dramatically (GDD §9.3)" (`js/game.js` lines 56-59) — i.e. the team already knows this number is a
  placeholder, not a final balance decision.
- `js/game.js:maxQi(player)` — effective cap is `MAX_QI + cardBonuses(player).meta.qiCap +
  guildBuffs(player).qiCap`, i.e. Spirit Cards and Sect disciples can raise the cap, mirroring FS's
  "upgrades and guild structures" raising the regen rate — though ours raises the *cap*, FS's cited
  mechanic raises the *rate*. Worth double-checking which lever FS actually exposes for cap vs rate
  (search snippets only clearly confirm rate-boosting upgrades).
- `js/game.js:tickQi` (line 366-377) — wall-clock delta since `lastQiTick`, floor-divided by
  `QI_REGEN_MS`, capped at `maxQi()`. `js/game.js:createGame` (line 134-138) calls `tickQi` on load and
  records `offlineQi` gained — this is the "regen while the game is closed" behavior, matching FS's
  wall-clock model.
- Qi is spent on: movement (`tryMove`, `moveCost` — cost not shown in this pass but gated the same way),
  combat (`attack`, 1 per resolved turn up to 20, see §1), and technique/pill buffs (`qiCost` field in
  `TECHNIQUES`/`PILLS`, 8-42 range — see §5).
- `js/alchemy.js:PILLS.qi_pill` — a brewable "Spirit-Gathering Pill" that restores up to 200 Qi
  instantly (an FS-style consumable Qi refill, no FS mechanic search-confirmed as directly comparable,
  though FS does have stamina potions in its item economy — [UNVERIFIED] specific item names/costs).

### 2.3 Gap analysis
- **Match (structural):** wall-clock regen, offline accrual, a raisable cap via secondary systems
  (cards/guild in ours, guild structures/upgrades in FS), Qi/stamina spent on move+combat+buffs.
- **Divergence — regen rate is ~13-24x faster than FS's sourced numbers**, acknowledged in-code as
  intentional-for-now prototype tuning, not a final decision. This is the single largest
  quantitatively-sourced mismatch in the whole engine and is flagged by the codebase itself as pending
  1.0 tuning work — not a surprise finding, but worth stating precisely with the real numbers now that
  we have them (FS 50-90/hr vs. ours 1200/hr).
- **Divergence — cap-raising vs rate-raising.** Our secondary sources (cards, guild) buff the *cap*;
  FS's sourced mechanic buffs the *rate*. Both are valid design choices, but if the goal is genre
  fidelity, FS's model rewards patience/investment with faster *recovery*, while ours rewards it with a
  bigger *battery*. Given our regen rate is already extremely fast, cap-raising is arguably the more
  balance-safe lever for us specifically — not a bug, just worth naming as a deliberate choice.

### 2.4 Opportunities
1. **[M] Retune `QI_REGEN_MS` toward FS's sourced 50-90/hr band before 1.0**, now that we have real
   comparison numbers (this was already an acknowledged open item in `js/game.js`'s own comment) — e.g.
   ~40-72s per Qi point would land in FS's range. Needs a `tools/balance.mjs` pass (session-length /
   Qi-gate rows) since this directly changes the "sessions not marathons" pacing pillar. Touches only
   `js/game.js` (single-owner constant), no schema change (timestamps already persisted).
2. **[S] Add a rate-boosting source (not just cap) to at least one existing system** (e.g. a Sect
   disciple or Spirit Card bonus type for Qi-regen-rate, not just Qi-cap) to mirror FS's actual lever —
   `cardBonuses`/`guildBuffs` already have an extensible bonus-type enum per GDD §7.2, so this is
   additive, no schema break.

---

## 3. Leveling & stats

### 3.1 FallenSword mechanics
- **Two independent point pools per level: stat points (Attack/Defense/Damage/Armor/HP) and skill
  points** (for buffs) — "for each level you gain, you get 2 level up points" [that specific "2" figure
  is from a single non-wiki guide, treat as approximate/possibly outdated —
  **[UNVERIFIED]** exact current per-level stat-point count].
  [Getting started in Fallen Sword](http://www.terrygonda.com/misc/fsintro.html)
- **The dominant veteran-guide meta is "concentrate Attack/Damage."** Direct quotes: "ALWAYS PUT STAT
  POINTS IN DAMAGE AND ATTACK (a 2 to 1 or 3 to 1 ratio is suggested), or put all your points in
  damage... Your damage should beat the sum of his armor and HP... Attack is critical... you will
  waste a lot of Stamina in the game if you can't hit your enemies." This is the single most
  consistently repeated piece of veteran advice found across guide sources.
  [How to plan your equipment — Hunted Cow forums](https://forums.huntedcow.com/index.php?showtopic=27520)
- **XP level-gap efficiency** (see §1) reinforces the same meta: better Attack/Damage → fewer stamina
  spent per kill at the same XP, "may reduce the amount of stamina used to 1 or 2 while still
  maintaining the 50 experience points per kill number," explicitly framed as the efficient-leveling
  goal. Same source as above.
- **Skill-point respec exists (paid, FSP), stat-point respec is far more restricted.** "Currently this
  is the only way to reset allocated level up points" refers to an escalating-cost FSP skill-unassign
  upgrade — implying **stat (level-up) points are NOT freely respec-able** the way skill points are
  gated by an increasing FSP cost; the wiki phrasing suggests level-up-point resets are rare/limited
  compared to skill resets. Single skill reset: 15 FSP; full skill-point reset: 100 FSP (escalating on
  reuse). [Skills Guide — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Skills_Guide),
  [Character Upgrades — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Character_Upgrades)

### 3.2 Our current state
- `js/progression.js` — two pools confirmed: `STAT_POINTS_PER_STAGE = 3`, `SKILL_POINTS_PER_STAGE = 1`
  (line 47-48), granted together in `applyBreakthroughs` (line 156-166) on every stage-up. This matches
  FS's "two independent pools" shape exactly, though our specific per-level *counts* (3 stat / 1 skill)
  are original tuning, not FS-sourced numbers.
  the 3 stat points per level are worth ~5x fewer HP/point than for the other four stats — the code
  comment literally says: "HP is cheaper per point so it can compete with offensive stats (veteran FS
  advice is all-in Attack/Damage; HP needs the discount to ever be worth picking)" — i.e. **the team
  already read and deliberately countered the "concentrate Attack/Damage" meta** by discounting HP's
  point cost, rather than leaving all five stats at parity (which would make HP strictly dominated,
  reproducing FS's exact meta).
- `js/progression.js:ALLOC_STATS = ['attack','defense','damage','armor','hp']` — all five stats are
  player-allocatable (unlike some MMOs that lock some stats to gear-only), so the "concentrate
  Attack/Damage" choice is a live, meaningful in-game decision here too — but with HP's discount as a
  built-in nudge against fully reproducing the FS meta.
  the FS-cited 2:1/3:1 Attack:Damage ratio has no offline equivalent to compare against numerically
  (our stats aren't ratio-gated), but the *qualitative* incentive (Attack determines hit-at-all,
  Damage determines kill) is structurally identical since `hitChance` and `rollDamage` in `combat.js`
  use exactly that split.
- **No stat-point respec exists at all.** Grepped `progression.js`/`game.js` — `allocateStat` (line
  168-173) only ever adds a point, there is no "unallocate"/"reset stats" function anywhere in the
  codebase. GDD §6.3 explicitly flagged this as an open design question ("Consider whether to allow a
  limited, costly respec... a gold-cost respec available after a certain level is a fair substitute")
  that was never implemented.
- **Skill (technique) "respec" is also entirely absent** — `js/techniques.js:learn` (line 115-121) only
  spends skill points to permanently learn a technique; there's no way to unlearn/refund one. FS's paid
  FSP skill-reset (real money/scarce currency) has no offline analogue at all, gold-cost or otherwise.
- Realm/level structure: `js/progression.js:REALMS`/`MAX_STAGE = 27`, `STAGE_XP` authored per-stage
  with an explicit ~10x spike at each of the two realm barriers (QC9→FE1, FE9→CF1) — this is a
  xianxia-flavor decision layered on top of a generically-FS-like escalating-XP-curve, not something
  FS itself has (FS has no "realm barrier" concept, just continuous leveling) — a deliberate,
  documented divergence (GDD §9.1's "realm-based leveling natively delivers the intended pacing").

### 3.3 Gap analysis
- **Match:** two independent point pools per level-up; Attack-determines-hit / Damage-determines-kill
  split is structurally identical to FS's stated logic (confirmed at the `combat.js` formula level, not
  just narratively); all combat stats are player-allocatable.
- **Notable strength — the team already defused the exact FS meta risk.** Rather than reproducing "all
  points into Attack/Damage, HP is a trap stat" (which is presented in FS veteran guides as *the*
  established meta, not a complaint), `POINT_VALUE.hp = 4` (4x cheaper) is a direct, documented,
  intentional counter-measure already in the shipped code. This is worth calling out as a deliberate
  win, not flagging as a gap.
- **Gap — no stat-point respec, despite GDD explicitly proposing one.** FS gates this behind a
  friction/scarce-currency wall (rare, escalating FSP cost) rather than removing it; we removed it
  entirely. For a solo offline game without a market to buy a "confidently wrong build" out of trouble,
  this is a real quality-of-life gap — a bad early allocation (e.g. dumping into Armor before reading
  the Attack/Damage meta) is currently permanent for the life of a save.
  - **Cross-talk flag:** the market/economy angle of a spirit-stone respec cost is Researcher-Meta's
    territory (Treasure Pavilion / spirit-stone sinks) — sent a cross-talk message (see below) rather
    than deciding the sink design unilaterally here.
- **Gap — no skill (technique) respec at all**, vs. FS's (paid but real) reset option. Lower priority
  than stat respec since technique choices are lower-stakes (buffs are situational/re-castable,
  learning order mostly just gates access) but still a one-way door with no recovery.

### 3.4 Opportunities
1. **[S] Add a spirit-stone-cost stat respec**, per GDD §6.3's own suggestion, gated by cultivation
   level (e.g. available from FE1 / level 10 onward, matching FS's "not from square one" framing where
   full resets are a mid/late-game convenience, not a starter tool). Needs: an `unallocateAll`/
   `respecStats` function in `progression.js` (single-owner file — flag to the lead before touching),
   a spirit-stone cost formula (probably scaling with `statPoints` spent, i.e. total invested), and a
   `tools/balance.mjs` sanity check that respec cost isn't a de facto second currency sink that trivializes
   the economy Researcher-Meta is covering.
2. **[S] Add a lower-friction technique respec** (e.g. a flat spirit-stone cost to unlearn one
   technique and refund its skill point) — lower risk than stat respec since technique effects are all
   percentage buffs with no compounding build-lock-in the way stat points have.
3. **[M] Consider whether the HP-discount is enough, or whether Defense/Armor also need a
   counter-nudge** — worth a `tools/balance.mjs` sweep comparing an "all-in Attack/Damage" simulated
   build against a "balanced" build's kills-per-Qi to see whether our numbers still favor the FS meta
   despite the HP discount (Defense/Armor have no discount today).

---

## 4. Gear & rarity

### 4.1 FallenSword mechanics
- **Rarity tier names confirmed to exist (sourced, each has its own wiki category page): Common, Rare,
  Unique, Legendary, Crystalline, Super-Elite, and Epic.** [Category:Crystalline Items](https://wiki.fallensword.com/index.php/Category:Crystalline_Items),
  [Category:Super Elite Items](https://wiki.fallensword.com/index.php/Category:Super_Elite_Items),
  [Category:Legendary Items](https://wiki.fallensword.com/index.php/Category:Legendary_Items),
  [Category:Unique Items](https://wiki.fallensword.com/index.php/Category:Unique_Items),
  [Category:Epic Items](https://wiki.fallensword.com/index.php/Category:Epic_Items).
  **[UNVERIFIED] the specific linear ordering "Common → Rare → Unique → Legendary → Crystalline →
  Super-Elite, with Epic separately as the single rarest tier."** GDD §6.1 states this exact ordering,
  and it was carried into this doc's first draft on that authority, but a second, independent
  search pass (prompted by the Critic's challenge) could not find any single primary source that
  states the ladder as an explicit ordered list — every search only turns up the individual tier
  category pages plus AI-search-synthesis inferring an order from them, which is not a citable source.
  It's also **internally in tension**: Crystalline/Super-Elite items are described elsewhere as
  breaking down into their own named "Fragments" tier in the Composing/crafting system in a way that
  reads as sitting *above* Legendary, which is hard to reconcile with Epic simultaneously being "the
  rarest tier" if three more tiers (Legendary, Crystalline, Super-Elite) are listed above it in the
  same breath. Treat the tier *names* as sourced, the *ordering and "Epic is rarest" framing* as
  unverified — this directly affects §4.4 opportunity 2 below (a "Hell-Forge-style" system referencing
  FS's rarity hierarchy), so don't cite a specific FS rarity order in the synthesis without a better
  source. Epic's sourcing-rule claim ("mainly from titans/epic quests/invention, not normal drops") is
  separately confirmed and NOT affected by this dispute.
  [Composing — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Composing),
  [Category:Epic Items — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Category:Epic_Items)
- **Items degrade with damage and can be repaired**, EXCEPT the Crystalline tier: "Crystalline items do
  not degrade their performance when they are damaged (as opposed to all other items)... These items
  cannot be repaired and once a crystalline item is completely broken (durability 0) it is useless."
  This confirms (a) degradation-with-damage is real and applies to "all other items," and (b) FS has a
  named exception tier where broken = permanently useless, no repair possible at all — a harsher
  end-state than anything in our system. [UNVERIFIED — what specifically damages an item: search did
  not surface whether it's per-combat-use, PvP-specific, or some other trigger distinct from our
  per-fight-win-or-lose model].
- **Set bonuses exist and stack on top of individual piece stats** — e.g. "Sleepwalkers Set gives
  [an] unlisted 88 hp from set bonus in addition to... Enhancement when fully forged," "Rions Set gives
  unlisted 408 hp from set bonus" — i.e. sets grant a bonus *beyond* the sum of piece stats, gated on
  wearing the complete set, matching our `sets.js` model directly.
  [List of Item Sets — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/List_of_Item_Sets)
- **"Hell Forge" flat-stat upgrade, not a gem-socket system.** "You can use the Hell Forge to boost the
  stats of any item... upgrade any item a maximum of five times. A single upgrade will add a +5 point
  bonus to any statistic, and for each 50 levels another 5 points are added with the 5th upgrade, so a
  level 150 item would receive a total of +65 points to all its stats." This is a **flat repeatable
  item-power-up mechanic**, not a removable/swappable gem-in-socket system — worth being precise about,
  since our `sockets.js` (gems you slot/unslot) is a *different* mechanic shape than FS's actual
  "Hell Forge" (a permanent, non-reversible per-item upgrade with a hard 5-use cap).
  [Enhancements Guide — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Enhancements_Guide)
- **[UNVERIFIED]** a true gem/socket system distinct from Hell Forge — search surfaced "Composing"
  (potion-making, level-50+ gated) and "Inventing" (recipe-based crafting) as FS's other item-adjacent
  systems, neither of which search-confirmed as a gem-socketing mechanic. Do not assume FS has a direct
  gem-socket analogue to ours; treat `sockets.js` as an original addition, not a reproduced FS system,
  until a source says otherwise.

### 4.2 Our current state
- `js/items.js:RARITIES` — `common → uncommon → rare → epic → legendary → mythic`, 6 tiers, each
  gating **attribute count** (1→5) not just a stat multiplier (`mult` 1.0→3.6) — matches GDD §6.1's
  "rarity gates the number of attributes rolled" resolution, and structurally mirrors FS's
  gate-on-scarcity-tier idea, though our specific tier *names* diverge from FS's own ladder (we dropped
  "Unique"/"Crystalline"/"Super-Elite" in favor of the more generic Uncommon/Epic/Mythic naming — a
  deliberate reflavor choice per GDD §6.1, not an oversight).
- `js/items.js:generateItem` — random drops only reach `rare` (weight-table caps Epic/Legendary/Mythic
  at `weight: 0`, line 18-20); Epic+ only via `mintNamedItem`/`NAMED_ITEMS` (boss/quest rewards). This
  matches FS's "Epic mainly from titans/epic quests, not normal drops" framing precisely.
- **Degradation:** `js/items.js:degradeEquipment` (line 296-300) — every equipped item loses 1
  durability per fight, **win or lose**; `bonuses` stop applying once `durability <= 0`
  (`effectiveStats`'s equipment loop, `progression.js` line 84: `if (!item || item.durability <= 0)
  continue`). This matches FS's "items degrade... broken = grants nothing" shape, but our trigger
  (1 durability per *fight*, regardless of outcome) is an original tuning choice — FS's exact
  degradation trigger is [UNVERIFIED] from available sources, so this is a plausible-but-unconfirmed
  match on cause, confirmed match on effect (broken gear stops contributing).
- **Repair:** `js/items.js:repairCost` — `missing * RARITIES[rarity].repairPerPoint` (spirit stones);
  higher rarity costs more per point (0.5 → 8 across the 6 tiers). No "unrepairable" tier exists in our
  system — **we have no Crystalline-style permanent-break exception**; every item is repairable at any
  durability, including 0, for a stone cost. This is a genuine simplification vs. FS's real model, and
  arguably the right offline call (permanently bricking a player's best weapon with no recourse is
  much harsher in a solo game with no guild/market safety net) but worth naming explicitly as a
  divergence rather than an oversight.
- **Sets:** `js/sets.js` — 2-piece sets (`skydancer`/`phoenix`/`nineHeavens`, one per Rare/Epic/Legendary
  tier), all-or-nothing bonus at the `bonusAt: {2: {...}}` threshold, honoring the broken-gear rule
  (`equippedSetCount` only counts `durability > 0` pieces) — matches FS's "bonus beyond piece stats,
  gated on full-set wear" model exactly, at a smaller scale (2 slots total in our game vs FS's typically
  larger equipment-slot count, hence larger sets like the cited 9-piece Hell-Forge example).
- **Sockets:** `js/sockets.js` — Rare+ gear rolls 1-3 empty sockets (`SOCKET_COUNTS`), loose gems drop
  independently (`GEM_DROP_CHANCE = 0.18` of a successful drop roll) and can be slotted/unslotted
  freely (`slotGem`/`unslotGem`, fully reversible, gem returns to pack). **This is a materially
  different mechanic from FS's sourced Hell Forge** (permanent, capped-at-5-uses, no
  removal/reallocation) — ours is closer to a Diablo-style reversible socket/gem system than to
  anything FS-sourced so far. Not wrong, but should not be described as "the FS enchant system
  reproduced" in any downstream doc — it's an original system inspired by the genre, not FS specifically.
- **Forge/reforge/upgrade:** `js/crafting.js` + `js/items.js:reforgeItem`/`upgradeItem` — reforge
  rerolls an item's existing attribute values at the same rarity/level (chase a better spread);
  upgrade raises `item.level` (scaling bonuses via the same per-level curve as generation) up to
  `MAX_FORGE_LEVEL = 20`. This has real conceptual overlap with FS's Hell Forge (a repeatable,
  cost-gated item-power-up path) but a different mechanism (reroll-in-place / level-up vs. FS's flat
  +5-per-use-to-a-5-use-cap) — worth noting as convergent-but-not-identical design, not a direct port.
- **Salvage:** `js/salvage.js` — unwanted gear/gems break down into rarity-tiered "spirit essence"
  materials, spendable on a cheaper anywhere-repair (`essenceRepairCost`) than the stone-based Forge
  repair. No FS-sourced analogue found for this specific loop (FS's "Composing"/"Inventing" are
  higher-level-gated potion/recipe systems, not a salvage-for-cheap-repair loop) —
  **[UNVERIFIED against FS, likely an original system]**.

### 4.3 Gap analysis
- **Match:** rarity gates attribute count + scarcity of top tiers (random-drop cap at Rare/our-Rare,
  Epic+ hand-authored); degrade-with-use + broken-gear-grants-nothing; set bonuses stacking on top of
  piece stats, all-or-nothing at full-set wear.
- **Divergence — our "sockets" ≠ FS's sourced "Hell Forge."** This is the most important naming/scope
  correction from this research pass: do not describe `sockets.js` as an FS-mechanic port in any
  downstream synthesis. It's functionally closer to a generic ARPG gem system. If genre-fidelity to FS
  specifically matters for a future feature, a true Hell-Forge-style mechanic (permanent, capped-uses,
  scaling-with-item-level flat stat adds, non-reversible) would be a *different* system worth
  considering alongside sockets, not instead of them necessarily.
- **Divergence — no unrepairable/bricked tier.** FS's Crystalline items can be permanently destroyed by
  degradation with zero recourse; every item in our game is always repairable. Likely the correct
  offline-solo-game call (no guild to bail you out, no market to buy a replacement quickly) — flagging
  as an intentional-looking simplification worth confirming with the lead/PROJECT.md rather than an
  unowned gap.
- **We do more than FS (sourced so far) in one direction:** salvage-for-cheap-repair is not confirmed
  as an FS mechanic at all — this looks like a net-new system filling a gap FS doesn't obviously have,
  which is fine, just shouldn't be cited as "how FS does it."

### 4.4 Opportunities
1. **[S] Correct terminology in any downstream synthesis** — flag to the lead that `sockets.js` should
   not be described as "the FallenSword enchant system" in `40-next-steps.md`; it's original,
   ARPG-genre-inspired, not FS-sourced. Zero code change, just a documentation-accuracy note.
2. **[M] Consider a genuinely FS-flavored "Hell Forge" system as a distinct feature** from sockets —
   permanent, capped-count (e.g. 5 uses), scaling-with-item-level flat stat boosts, spirit-stone gated
   — as an *additional* gear-progression sink alongside (not replacing) sockets/reforge/upgrade. Touches
   `js/items.js` (new pure helpers) + a new or extended `js/crafting.js` UI; needs `tools/balance.mjs`
   coverage before merge per the hard constraint on stat-affecting changes.
3. **[S] Cross-check with Researcher-Meta**: gear/stats overlap with the economy (spirit-stone sinks
   for repair/reforge/respec all compete for the same currency pool) — sent a cross-talk message (see
   below) to align on total spirit-stone sink budget before either doc recommends new stone-cost
   features independently.

---

## 5. Skills/techniques & buffs

### 5.1 FallenSword mechanics
- **Three categories: Offense, Defense, Special.** "Skills are grouped into three categories: Offense,
  Defense and Special." [Skills Guide — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Skills_Guide)
- **Level-gated with prerequisite chains.** "Each skill has an associated level which denotes the
  minimum level a player must be before being able to learn that skill... a dependency tree... in
  practice, the player needs at least 10 skill points allocated to dependent skills [before some
  higher-tier skills]." [UNVERIFIED — exact "10 skill points" framing is a paraphrase from a single
  search snippet; treat as approximate, not an exact FS constant to match precisely].
  [Skills Guide — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Skills_Guide)
- **Skills are timed buffs, cast on self or another player, cost stamina only for the caster.**
  "Skills, or 'buffs'... are spells cast on a player to temporarily improve some characteristic...
  cast on the caster himself or on any other player." "Skills cost stamina for the player who is
  casting it but not for the receiver... Each buff has its own cost between 5 and 50 stamina."
  [Skills Guide — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Skills_Guide)
- **Buff trading is a real, player-driven economy** ("Buff Market"): "low level players get access to
  otherwise inaccessible buffs by paying a higher level player to cast buffs on them," via one-time
  gold/FSP payment, lifetime service deals, or buff-for-buff trades — explicitly untrusted/unenforced
  by the game itself ("no built-in mechanism to trade buffs... up to the players... to trust each
  other"). Primary claim (buffs are tradeable, cast on other players) is wiki-sourced:
  [Skills Guide — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Skills_Guide) ("cast on
  the caster himself or on any other player"); the payment-mechanics color (gold/FSP/lifetime-deal/
  trust-based) additionally comes from a fan-run guild site, a lower-tier source than the wiki —
  cited for color, not as the load-bearing claim: [Find players who can buff — Fallen Empire
  Guild](http://fallen-empire.wzarlon.dk/find-buffers.asp).
- **Veteran "don't over-buff" advice** is asserted directly in GDD §6.4 as an FS-community norm
  ("veteran advice being to avoid over-buffing yourself since re-casting constantly burns resources
  fast") — search did not turn up an independent primary-source quote for this exact framing beyond
  the GDD's own paraphrase; **[UNVERIFIED against a fresh primary source this pass]**, though it's
  consistent with the sourced stamina-cost-per-buff mechanic above (any resource-costed timed buff
  naturally implies a "don't spam recasts" norm; that logical inference is fine, but the specific
  "veteran advice" framing itself is not independently re-confirmed here).

### 5.2 Our current state
- `js/techniques.js:CATEGORIES = ['Offense', 'Defense', 'Special']` — exact match to FS's three
  categories, both in count and (per GDD's own explicit design choice) presumably in naming.
- Prerequisite tree: `TECHNIQUES` entries carry `minStage` (level gate) and `prereqs: [id]`
  (dependency chain) — e.g. `heavenStrike` (tier 3, `minStage: 10`) requires `blazingPalm` (tier 2)
  which requires `ironFist` (tier 1). Three depth-tiers per category plus a 4th "Core Formation" tier
  gated at `minStage: 19` requiring the tier-3 art — a 4-tier chain, one level deeper than GDD §6.4's
  stated "2-3 tiers deep is plenty for 1.0" target, added later (Stage 3, per the code comment "Core
  Formation techniques (tier 4, gated to the 3rd realm").
- `js/techniques.js:canLearn` (line 103-113) checks level, skill-point cost, and every `prereqs` entry
  via `isLearned` — a straightforward chain-gate matching FS's "level + prior skills known" model.
- **Timed buffs cost Qi, percentage-modify stats, real-time duration.** `cast()` (line 132-146) pushes
  `{techniqueId, effect, expiresAt: now+duration}` onto `player.activeBuffs`; `qiCost` ranges 8-42
  across the technique list, `duration` 45,000-120,000ms (45s-2min) — matches FS's "5-50 stamina,
  timed" shape at a comparable order of magnitude, scaled to our much-faster Qi economy (see §2's
  regen-rate gap — a 42-Qi buff is trivial to re-afford at 1200 Qi/hour but would be a real commitment
  at FS's sourced 50-90/hour).
- `js/progression.js:effectiveStats` (line 122-128) applies `activeBuffs` as **percentage modifiers on
  the flat (gear+card+meridian+socket+set) subtotal**, the last flat-adjacent step before the
  ascension global scalar — this is the single aggregation-pipeline point GDD §7.3/PROJECT.md calls
  out as the one required plug-in point for every new passive/temporary source.
- **No buff-trading / cast-on-another-player exists at all.** Every `cast()` call operates on `player`
  (self) only — there is no parameter or code path for a source player's buff to target a different
  actor. GDD §6.4 flags this explicitly as "a core FallenSword social/economic behavior you're cutting
  for 1.0," and the data shape (`{techniqueId, effect, expiresAt}`) is *generic enough* to extend later
  per that same GDD note — but nothing in `techniques.js` currently threads a caster/target distinction.
- **Pills are a parallel, separate buff channel** (`js/alchemy.js:pillBuffs`) that explicitly avoids
  touching `player.activeBuffs`/`effectiveStats` — applied directly to the combat-actor snapshot at
  fight time instead (`applyPillBuffs`, called from `game.js:attack` before `resolveCombat`). This is a
  deliberate architectural choice (documented in the file's header comment) to avoid touching
  `ui.js`/`techniques.js`'s shared buff renderer, not an FS-sourced distinction — FS doesn't (as far as
  search surfaced) have two structurally separate buff systems, this is our own modularity workaround.
- **No "over-buffing" soft-cap or warning UI** — nothing in `techniques.js`/`alchemy.js` warns a player
  against re-casting; the natural brake is only Qi cost (rechecked per §2's much-faster regen, this
  brake is far weaker in our economy than FS's sourced rate would produce).

### 5.3 Gap analysis
- **Match:** three named categories (Offense/Defense/Special) exact; prerequisite-chain-plus-level-gate
  shape; timed percentage buffs costing a spendable resource; a single stat-aggregation pipeline that
  every buff source plugs into (this is GDD's own architecture decision, explicitly modeled on the
  problem FS's buff system implies, not a literal FS mechanic to source).
- **Divergence — buff trading/cast-on-other-player is entirely absent**, which GDD already flags as
  deliberate 1.0 scope-cut, not an oversight — no action needed beyond confirming the data shape stays
  extensible (it does: `{techniqueId, effect, expiresAt}` has no self-only assumption baked into its
  *shape*, only into `cast()`'s current signature).
- **Divergence — the "don't over-buff" resource-pressure norm is much weaker here than in FS**, as a
  direct consequence of §2's Qi-regen-rate gap. At FS's sourced 50-90 stamina/hour, a 20-50-stamina buff
  is a real chunk of an hour's regen; at our 1200 Qi/hour, even the priciest technique (42 Qi,
  `goldenCoreAscendance`) is under 3 minutes of regen. **This means our current tuning cannot deliver
  the "buff before a big fight, or save Qi for kills" tension GDD §6.4 explicitly wants** — the
  resource isn't scarce enough yet for that decision to bite. This is the same root cause as the §2
  Qi-regen gap, not a separate bug in `techniques.js` itself.
- **Divergence — a 4th technique tier exists beyond GDD's stated "2-3 tiers is plenty."** Not
  inherently wrong (Stage 3 added it deliberately for Core Formation), but worth flagging since it's a
  scope expansion past the GDD's own stated ceiling — likely fine, just noting the drift for the lead's
  synthesis.
- **Two parallel buff systems (`activeBuffs` for techniques, `pillBuffs` for pills)** is an
  architecture note, not a bug — deliberately kept separate to respect file ownership, per the code's
  own comment. Worth flagging to the lead only if a *third* buff-granting system appears later, since
  three parallel lists (rather than one generic buff list with a `source` field) would start to smell
  like the exact "every future passive source plugs into one pipeline" principle being violated at the
  *buff* layer even though it's respected at the *stat* layer.

### 5.4 Opportunities
1. **[M] Retune technique/pill Qi costs (or fix the root cause: §2's regen-rate) so the "don't
   over-buff" tension actually exists** — this is really the same lever as opportunity 2.1 in §2; listing
   it here too because it's the direct gameplay symptom GDD §6.4 cares about. Needs `tools/balance.mjs`
   coverage for buff-uptime-vs-Qi-spent before/after any regen retune.
2. **[S] Flag to the lead: consider unifying `activeBuffs`/`pillBuffs` into one generic buff list**
   with a `source: 'technique'|'pill'` field, *if* a third timed-buff source is ever added — not urgent
   today (two lists is a deliberate, documented, file-ownership-respecting choice), but worth a note so
   a third system doesn't get bolted on as yet another parallel list by default.
3. **[L] Buff-trading is explicitly out of scope for 1.0 per GDD** — no opportunity to act on now, but
   worth confirming in the 2.0 network-provider design (per PROJECT.md's "Next" section) that
   `{techniqueId, effect, expiresAt}` gets a `casterId`/`targetId` pair added when a real second player
   exists, so this doesn't require a buff-schema rework later. Pure forward-compatibility note, zero
   code today.

---

## Summary table (quick reference for the lead)

| Area | FS-sourced? | Match strength | Biggest gap |
|---|---|---|---|
| Hit chance (Atk vs Def) | Yes | Strong | Our hit-floor (5%) more generous than FS's cited 2% |
| Damage vs Armor/HP | Yes | Strong (behaviorally) | 3-way branch collapsed to always-chip-1 |
| 20-turn cap / draw | Yes | Exact | Missing FS's 40/60-stamina push-through tiers |
| XP level-gap curve | Yes | Directionally exact | — |
| Death penalty (no item loss) | Yes (shape); no (%) | Shape match, numbers original | FS's exact % unsourced |
| Qi/stamina regen rate | Yes | **Weak — ~13-24x too fast**, acknowledged in-code | Retune before 1.0 |
| Stat/skill point pools | Yes | Strong | No respec of either, unlike FS's (paid) options |
| "Concentrate Atk/Dmg" meta | Yes | Directly countered via HP point-discount | Armor/Defense uncountered |
| Rarity ladder + scarcity | Tier names yes; **ordering [UNVERIFIED]** | Strong (reflavored names) | No sourced linear order for FS's own 7-tier ladder |
| Gear degrade + broken=inert | Yes (shape) | Strong | No unrepairable/Crystalline-style tier |
| Set bonuses | Yes | Strong | — |
| Gem sockets | **No — likely original**, not FS's Hell Forge | N/A | Mislabeling risk in downstream docs |
| Skill categories + prereq tree | Yes | Strong | 4th tier exceeds GDD's stated 2-3 ceiling |
| Timed buffs cost a resource | Yes | Shape match | Resource too abundant for intended tension |
| Buff trading | Yes (real FS system) | Deliberately cut for 1.0 | None — documented scope cut |

---

*Status: complete, Critic-reviewed. Cross-talk sent to Researcher-Meta on stat-respec/spirit-stone-sink
overlap (§3.4/§4.4), confirmed no collision (Researcher-Meta's only stone-sink proposal is Sect-capacity
scaling, unrelated). Critic independently re-verified the 4 most load-bearing numeric claims (Qi regen
50-90/hr, Hell Forge mechanics, "concentrate Atk/Dmg" meta, no-respec) — all held up. One Critic dispute
resolved: §4.1's FS rarity-tier **ordering** (not the tier names, which are independently sourced) was
downgraded to [UNVERIFIED] after a second search pass found no single source stating the linear
hierarchy, and the claim was internally in tension with Crystalline/Super-Elite's fragment tier reading
as sitting above Legendary. Minor citation-hygiene fix also applied (buff-market color source). Lead
notified on completion — see session messages.*
