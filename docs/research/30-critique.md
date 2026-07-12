# 30 — Critique (Critic)

Adversarial pass on `10-core-mechanics.md` (Researcher-Core) and `20-meta-systems.md`
(Researcher-Meta). Built my own independent FallenSword fact baseline FIRST (Section 1) as a
yardstick before reading either doc, per the brief's cross-talk protocol. Sections 2-5 are filled
in as the researchers' docs land — this doc is being written progressively; treat an empty
section below as "not yet reviewed," not "nothing found."

**Status: COMPLETE.** Both `10-core-mechanics.md` (Researcher-Core) and `20-meta-systems.md`
(Researcher-Meta) reviewed in full: cross-checked against a fresh independent WebSearch pass on
top of the baseline below, and against direct reads of the real `js/` code (`combat.js`,
`progression.js`, `items.js`, `techniques.js`, `boss.js`, `market.js`, `guild.js`, `save.js`,
`meridians.js`, `ascension.js`, `sockets.js`, `sets.js`, `cards.js`, `quests.js`, `bounties.js`,
`trials.js`, `rivals.js`, `duel.js`, `sectmissions.js`, `salvage.js`, `alchemy.js`, `crafting.js`).
Both researchers were messaged directly with pre-emptive flags and post-review disputes; both
had already self-corrected on most of the pre-emptive flags and defended the rest with good
primary sourcing — see their reply messages in-session.

---

## 1. Independent FallenSword fact baseline (sourced)

Built via WebSearch against `wiki.fallensword.com` (the primary wiki; direct `WebFetch` to it
returns HTTP 403 in this environment, so facts below are sourced from search-result snippets that
quote/paraphrase the wiki pages — treat as **secondary-sourced-from-primary**, re-verify with a
human-driven fetch before treating any number as gospel). Fandom mirror + Hunted Cow forums used
as backup. No Wayback access available in this environment (`WebFetch` refused `web.archive.org`).

### Stamina
- Stamina gates movement (1/step, 2/diagonal), combat (1 per swing; 20/40/60-stamina attack
  presets; PvP attacks scale 10-100 stamina), and buff activation (5-50 stamina per cast).
- Base regen: 50 stamina/hour: purchasable upgrades (FSP) and guild structures add more.
- Base max stamina: 500, raised by items/sets/relics/guild structures/quests.
- Source: [Stamina](https://wiki.fallensword.com/index.php/Stamina), [Stamina Gain](https://wiki.fallensword.com/index.php/Stamina_Gain), [Max Stamina](https://wiki.fallensword.com/index.php/Max_Stamina)

### Leveling / stats
- Level-up grants points into the first five stats (attack/defense/hitpoints/etc. — search did not
  surface confirmed canonical names for all five; **[UNVERIFIED]** exact stat list beyond
  attack/defense/armor/damage/HP terminology used elsewhere on the wiki).
- Source: [Level](https://wiki.fallensword.com/index.php/Level), [Category:Stats](https://wiki.fallensword.com/index.php/Category:Stats)

### Skills / buffs
- Skills = timed buffs, three categories (Offense/Defense/Special) — **this taxonomy is an exact
  match to our `techniques.js` CATEGORIES array**, worth flagging as a suspiciously clean parallel
  to double check isn't circular (did our own GDD authors take this from the FS wiki already?).
- Skills gated by minimum level + a prerequisite dependency chain (~10 points sunk in the tree to
  unlock deep skills).
- Casting costs stamina for the caster only, not the target; buffs are commonly traded
  player-to-player (low-level players pay high-levels to cast on them).
- Source: [Skills Guide](https://wiki.fallensword.com/index.php/Skills_Guide), [Brute Strength](https://wiki.fallensword.com/index.php/Brute_Strength)

### Items / durability / sets
- Equipment loses durability in normal combat; repaired at the Blacksmith for gold (withdrawable
  from personal/guild bank).
- "Crystalline Items" are a special category: they do NOT lose performance as they degrade, but
  cannot be repaired — dead forever once durability hits 0. **We have no equivalent** (our
  `items.js` broken gear always grants nothing until repaired, no unrepairable tier).
- 448 total cataloged Item Sets on the wiki (200+ pages indexed) — i.e. FS's set-bonus system is
  enormous in scope vs. our 3 hand-authored 2-piece sets.
- Source: [Detailed Tutorial/tLHT/Actions](https://wiki.fallensword.com/index.php/Detailed_Tutorial/tLHT/Actions), [Category:Crystalline_Items](https://wiki.fallensword.com/index.php/Category:Crystalline_Items), [List of Item Sets](https://wiki.fallensword.com/index.php/List_of_Item_Sets)

### Auction House
- Central player-to-player marketplace; seller sets price in gold OR FSP; auction duration 1-48h;
  new players capped at 2 concurrent auctions (FSP-upgradeable); bound/guild-tagged items excluded.
- Source: [Auction House](https://wiki.fallensword.com/index.php/Auction_House)

### FSP (Fallen Sword Points) — premium currency
- FSP is the "true currency," obtained via real-money purchase, referrals, offers, or bought
  for gold on a player-driven marketplace; many top listings/items are FSP-only.
- **We have no FSP equivalent** — Treasure Pavilion is spirit-stones (gold-analog) only, no
  premium-currency layer. Worth flagging as a deliberate, correct omission (no real-money loop
  wanted) rather than a gap.
- Source: [Fallen Sword Point](https://wiki.fallensword.com/index.php/Fallen_Sword_Point)

### Guilds
- Guild Structures (build cost + upkeep, paid from guild bank) grant member-wide stat/utility
  bonuses; Scout Tower (tiered: L1 view titan kill totals, L2 per-member, L3 post-kill record
  archive) is titan-hunting infrastructure; personal bank vs. guild bank are distinct, guild bank
  withdrawal needs founder-granted permission.
- Source: [Guild Structures](https://wiki.fallensword.com/index.php/Guild_Structures), [Scout Tower](https://wiki.fallensword.com/index.php/Scout_Tower), [Bank](https://wiki.fallensword.com/index.php/Bank)

### Titans (world-boss event)
- Titans are a recurring scheduled event (2-5/day), guild-vs-monster, NOT solo: reward goes to
  the guild with ≥50% of total kill contribution; 2nd-5th place guilds get bonus Titan Kill Points.
  Titans have a "Titan HP" pool representing total-kills-needed, tracked across the whole
  contributing guild, not a single fighter's damage. **This is structurally different from our
  `boss.js` calamities**, which are solo, stage-gated, wall-clock-cooldown encounters with no
  guild-contribution mechanic — a legitimate and known divergence (we have no other-players layer
  at all yet), not a defect, but researchers should not claim our bosses "are" FS Titans without
  that caveat.
- Source: [Titan Event](https://wiki.fallensword.com/index.php/Titan_Event)

### Legendary creatures / Legendary Event
- Legendary creatures only spawn during scheduled "Legendary Events" (not always-available like
  our calamities); 179 legendary beasts cataloged; each Legendary Event surfaces a subset, not all.
  Drop legendary-tier items.
- Source: [Legendary Event](https://wiki.fallensword.com/index.php/Legendary_Event), [Category:Legendary Beasts](https://wiki.fallensword.com/index.php/Category:Legendary_Beasts)

### PvP
- PvP Rating: Elo-like, ladder periodically reset (all reset to 1000), max single-fight rating
  transfer capped at 50. Top 3 per PvP Band at each reset get PvP Ladder Tokens (5/2/1) redeemable
  for rewards. PvP Prestige accrues every 50 rating points (cap 450 = +10% XP) and can be burned
  for a temporary XP-boost skill.
- Source: [PvP Rating](https://wiki.fallensword.com/index.php/PvP_Rating), [PvP Ladder](https://wiki.fallensword.com/index.php/PvP_Ladder), [PvP Prestige](https://wiki.fallensword.com/index.php/PvP_Prestige)

### Bounty Board
- Player-posted bounties: post a kill-count target + gold/FSP reward; first hunter to complete it
  wins the reward (others get nothing back for spent tickets — a race, not a shared quota);
  completions bank Bounty Points toward a Bounty Hunter ranking ladder.
- **Structurally different from our `bounties.js`** (need to verify against researcher's read of
  our code — ours is presumably NPC/system-posted, not player-posted, since we have no other
  players). Flag if the Meta doc conflates the two without noting the structural gap.
- Source: [Bounty Board](https://wiki.fallensword.com/index.php/Bounty_Board)

### Character Reset ("prestige")
- FS has a "Character Reset/Upgrade" that wipes stat-point ALLOCATION only (not level/gear/
  collections) for an FSP fee that increases each use (anti-abuse escalation). This is **not** a
  NG+/prestige-power-loop like our `ascension.js` (+8%/tier compounding stat scalar, wipes the run
  but keeps collections) — FS's version is a respec, not a prestige multiplier. **Any claim that
  FS "has ascension/NG+ like ours" is unsourced and should be disputed** — I could not find a FS
  mechanic resembling a compounding-power prestige loop.
- Source: [Character Upgrades](https://wiki.fallensword.com/index.php/Character_Upgrades)

### Composing (crafting/alchemy analog)
- "Composing" (level 50+ gate) sacrifices unneeded item drops to create custom potions, up to 5
  effects per potion; potions can be bound or guild-bound at creation. Separate "fragmenting"
  breaks tradable items into crafting fragments. This is FS's actual analog to our combined
  `alchemy.js` + `salvage.js` — closer to a single unified system in FS than our two-module split.
- Source: [Composing](https://wiki.fallensword.com/index.php/Composing)

### Not found / likely absent in FS (worth flagging if either doc claims otherwise)
- No sourced evidence of pets/familiars/companion-creature collection as a core FS system (search
  only surfaced a creature *bestiary*, not a collectible-companion mechanic) — treat our
  `cards.js` Spirit Cards as an original addition inspired by the bestiary idea, not a ported FS
  system, unless a researcher finds a direct FS source.
- No sourced evidence of a gem-socket/enchanting system distinct from Item Sets — **[UNVERIFIED]**
  whether FS has gem sockets at all; searches only surfaced Item Sets, not a socket mechanic. If
  either doc asserts "FS has gem sockets that work like X," demand a source.
- Daily Quests exist (community "Daily Checklist" sources confirm) but I could not source a
  world-event calendar/banner system comparable to our `events.js` — **[UNVERIFIED]**, don't let
  either doc claim our event-calendar is "just like FS's."

---

## 2. Confirmed-solid findings from each doc

Both docs are unusually well-hedged and already self-flag most of their own weak spots
([UNVERIFIED] tags, "treat as approximate" caveats). I independently re-ran WebSearch against the
specific numeric/named claims below (not just re-reading the same snippets the researchers had)
and every one held up.

### 10-core-mechanics.md (Researcher-Core)
- **Qi/stamina regen gap, the single biggest quantitative finding in either doc.** Independently
  reconfirmed FS's 90/hr ceiling breaks down exactly as 50 base + 25 (upgrade) + 15 (guild
  Endurance Shrine) = 90/hr. Cross-checked our own `js/game.js:58-59` directly:
  `MAX_QI = 120`, `QI_REGEN_MS = 3_000` → 1200 Qi/hour, ~13-24x FS's 50-90/hr band. The code
  comment at those lines already says this is placeholder ("1.0 tuning will slow this
  dramatically"), so this is a confirmed, real, load-bearing, **already-acknowledged** gap — the
  doc's framing of it as "not a surprise, but now precisely quantified" is accurate and useful.
- **Hell Forge vs. our `sockets.js` — confirmed materially different systems.** Independently
  verified: Hell Forge is a *permanent*, capped-at-exactly-5-uses, FSP+gold-gated, flat
  +5-per-tier (scaling +1/50 item-levels) stat upgrade with **no removal/reallocation** — cost
  example confirmed (7,500/15,000/30,000/60,000/90,000 gold for a sub-50 item, doubling per use).
  Our `sockets.js` gems slot/unslot freely and gear drops loose gems independently. Core's
  "don't call sockets.js an FS port" flag is correct and important — I'd elevate this from a nice-
  to-have doc correction to something the lead's synthesis should state explicitly, since it
  affects whether a future "Hell Forge" feature (Core's opportunity 4.4.2) gets built *alongside*
  sockets rather than confused with it.
- **"Concentrate Attack/Damage" veteran meta — confirmed via primary source.** Independently found
  the exact quote on the Hunted Cow forums ("ALWAYS PUT STAT POINTS IN DAMAGE AND ATTACK... put
  all your points in damage. All of them"). Cross-checked `progression.js:52-53` directly and
  confirmed the code comment explicitly names this meta and counters it with `POINT_VALUE.hp = 4`
  (a deliberate 4x HP-point discount). This is a genuinely well-caught, well-verified finding — the
  team read FS's own community meta and pre-countered it in the design, and Core's doc is the
  first place that connects those two facts explicitly with sourcing on both sides.
- **No stat/technique respec anywhere in the codebase — independently reconfirmed by direct
  read.** I grepped/read `progression.js` (`allocateStat`, lines 168-173: only ever increments)
  and `techniques.js` (`learn`, lines 115-121: only ever spends/adds to `learnedTechniques`) myself
  before seeing Core's claim; there is no unallocate/unlearn function anywhere. Confirmed correct.
- **The two-parallel-buff-systems architecture note (§5.2/5.3)** — technique buffs feed
  `effectiveStats` via `player.activeBuffs`; pill buffs (`alchemy.js`) patch the combat-actor
  snapshot directly via `player.pillBuffs`, deliberately bypassing `effectiveStats` per that file's
  own header comment. I'd independently flagged this exact same architectural nuance in my own
  blind-spots section (written before reading Core's doc) — strong independent confirmation from
  two directions that this is a real, non-obvious thing any future buff-adding opportunity needs
  to respect.
- All combat-formula claims (hit-chance direction, the FS "2% automatic hit chance" floor, the
  Kill/Wound/Miss three-way branch, the 20/40/60 stamina attack tiers, XP level-gap curve
  direction) independently re-verified against fresh search — all check out as accurately quoted.

### 20-meta-systems.md (Researcher-Meta)
- **Auction House mailbox "12 hours or lost forever"** — independently reconfirmed verbatim
  ("You only have twelve hours to collect your item from your Mailbox or it will disappear
  forever"). Correctly used as the basis for a real, well-scoped divergence claim (our mailbox
  never expires) with a sensibly-hedged opportunity (48-72h grace window, not a literal 12h port).
- **PvP Arena launch date (19 Jun 2008) and "Max Equip Level" gear-normalization rule** —
  independently reconfirmed both the date and the core mechanic (item level capped per-tournament,
  level-up points/relics/buffs/guild structures all ignored inside the arena).
- **Titan Event first-instance names/date (Ogalith & Fuvayu, May 2009) and the guild-cooperative
  shared-kill-pool mechanic** — independently reconfirmed. This was one of the specific factoids I
  flagged as high hallucination-risk before reading the doc (oddly specific names/dates are a
  classic LLM confabulation pattern) and it held up under a fresh, differently-worded search.
- **"Find Item" skill: +0.1% drop rate per point** — independently reconfirmed verbatim, including
  the worked example (Find Item 175 → +17.5% relative increase on a base drop rate).
- **Allies/Enemies cap of 5 each, raisable via character upgrade, allies require mutual acceptance
  while enemies don't** — independently reconfirmed all three parts, including the specific
  asymmetry (allies need the other party's consent, enemies don't) that the doc uses to correct
  GDD §6.5's own claim that FS's list is symmetric-in-asymmetry. This is a genuine GDD-inaccuracy
  catch, correctly scoped as "fix the GDD's characterization of FS," not a code gap.
- **Guild Conflicts RP mechanics (10 RP per conflict win) and Relic group-capture-combat model** —
  independently reconfirmed.
- **Medals' six-tier system (bronze/silver/gold/crystal/ruby/diamond)** — independently
  reconfirmed.
- **The Beast Codex module-location correction** (`js/ui.js`, not a standalone `bestiary.js`) —
  I independently read `js/ui.js` and confirm the codex renderer (`codexEntry`/`codexCardSlot`/
  `bossCodexEntry`) lives there, matching the doc's correction to the brief's open question.
- Both docs' **"[UNVERIFIED]" tags are used honestly** — I spot-checked several (e.g. Core's exact
  "10 skill points" dependency framing, Meta's "no FS Global-Quest zone-gating source found") and
  in every case the underlying wiki page genuinely did not surface a clean number/confirmation in
  my own independent search either. Neither researcher is padding their confidence.

## 3. Disputed/unverified claims

### Dispute — Core §4.1's FS rarity-ladder ORDERING is under-sourced and internally inconsistent — RESOLVED
**Update: fixed by Researcher-Core during this review** (verified — `10-core-mechanics.md` §4.1 and
the summary table now split the claim into sourced tier *names* (each has its own wiki category
page, individually cited) vs. the specific linear *ordering* + "Epic is rarest" framing, which is
now correctly tagged `[UNVERIFIED]` with the fragment-tier inconsistency I raised documented
inline as the reason). Original dispute preserved below for the record.

Core's doc states the ladder as "Common → Rare → Unique → Legendary → Crystalline → Super-Elite,"
separately describing Epic as "a distinct, separately-described 'rarest tier.'" I independently
confirmed Unique, Crystalline, and Super-Elite are all real FS wiki categories, and separately that
Epic items are described on their own category page as "extremely rare (the most rare in the
game)." But I could not find any single source that states the full linear ordering, and the
two citations Core gives for the ladder claim (the Composing page, Category:Epic_Items) don't
establish an ordering at all. It's also internally suspicious as written: Legendary, Crystalline,
and Super-Elite items each yield their own named "Fragments" (a materials-tier naming pattern that
reads as a *progression* above Legendary), which is hard to reconcile with Epic simultaneously
being called "the rarest tier" if three more tiers sit above it in the same list. **Sent to
Researcher-Core directly**, asking them to either find one source stating the actual order or
downgrade the ordering claim (not the tier names, which are fine) to [UNVERIFIED]. This matters
because Core's own opportunity 4.4.2 ("a genuinely FS-flavored Hell Forge system") and the
lead's eventual synthesis may end up citing "the FS rarity ladder" as an anchor point — it should
rest on a real citation, not a plausible-sounding reconstruction.

### Minor — Core §5.1's buff-market citation leans on a low-tier fan site
The claim that buff-trading is a real player-driven economy is independently wiki-sourced
elsewhere in the same bullet (Skills Guide), but the specific "how buffers advertise" framing
cites `fallen-empire.wzarlon.dk`, a third-party guild fansite rather than a wiki/forum primary
source, which the brief asks researchers to deprioritize ("prefer primary/archived sources... over
blog hearsay"). Not load-bearing (the core fact holds without that citation) — flagged to Core as
a citation-hygiene nit, not a fact dispute.

### Non-dispute, but worth the lead's attention — both docs agree Ascension/NG+ has no FS lineage
Both researchers independently (Core didn't discuss it at all since it was out of their scope;
Meta explicitly researched and reported no sourced FS prestige-loop equivalent) converged with my
own baseline finding: FS's "Character Reset" is a stat-point respec, not a compounding
power-prestige loop. All three of us agree `ascension.js` is a Fallen-Immortal-original xianxia
NG+ invention. This isn't a dispute between researchers — it's a rare case of independent
triangulation all landing in the same place — but Meta's doc correctly flags it as a framing
question the lead should decide explicitly (market Ascension as "original" vs. "FS-inspired"),
which I'd endorse as-is.

## 4. Constraint violations in recommendations

**None found that actually violate a hard constraint as currently written** — both docs show
real constraint-awareness (Meta's doc even includes its own explicit "Constraint-violation check"
section, which I independently re-verified rather than taking at face value). Specific checks:

- **`combat.js` purity**: Core's opportunity 1.1 (parameterize `MAX_TURNS` for a 40/60-Qi
  push-through tier) and opportunity 1.3 (a third combat branch) both keep `resolveCombat` a pure
  function of its arguments — turning `MAX_TURNS` into a passed argument rather than a hardcoded
  module constant is the *correct* way to add this, not a violation. Meta's opportunity 3.2
  (gear-normalized Arena spar variant) explicitly computes the bracket-capped stat sheet *outside*
  `combat.js`, in `duel.js`, and discards it after — confirmed this is how it's written, not just
  claimed to be.
- **Single `effectiveStats` pipeline**: Meta's opportunity 2.1 (a small combat-stat Sect buff)
  explicitly proposes plugging into `effectiveStats` as a new flat source at the same insertion
  point cards/meridians/sockets/sets already use, and explicitly flags "coordinate with
  Researcher-Core" before doing it (correct — `progression.js` is the single-owner file per
  PROJECT.md). Core's opportunity 3.1 (stat respec) and 5.2 (unifying buff lists) both explicitly
  flag `progression.js`/the buff lists as needing lead sign-off before a single-owner-file touch,
  rather than just doing it. No opportunity in either doc proposes a second aggregation pipeline
  or an in-place stat mutation.
- **Provider interfaces for multiplayer-shaped systems**: neither doc proposes guild-vs-guild,
  real bidding, or anything else requiring a second live participant. Meta explicitly rules out
  Titan-style GvG and FS-style Global Quest leaderboards as "not recommended to fake single-player"
  — correct per the provider-interface/2.0-network-provider constraint, since faking a second
  player's competitive presence isn't the same shape of problem a `NetworkXProvider` solves later.
  Meta's opportunity 6.3 explicitly asks to keep `recentlyActive()`'s output shape stable *for* a
  future provider-backed PvP-scouting caller, which is the right instinct.
- **Additive save schema**: no opportunity in either doc proposes a `save.js` VERSION bump; every
  new-field proposal (Meta's `bound` field on items, a `kind: 'favored'|'marked'` tag on rivals;
  Core's respec functions operating on existing fields) is additive-only, consistent with the
  hard constraint's "new fields are additive, no VERSION bump" rule.
- **Self-contained feature-module rule**: neither doc proposes editing `index.html` or `ui.js`
  outside of a shared-renderer touch already named in PROJECT.md (Meta's Beast Codex correction
  notes it's *already* inside `ui.js` for a defensible reason — shared-renderer bucket — not a
  violation to fix).

One thing to watch, not a violation yet: Core's opportunity 4.4.2 (a distinct Hell-Forge-style
permanent item-upgrade system) and Meta's opportunity 1.1 (a `bound` item field) both touch
`items.js` — not a conflict since neither is a single-owner file in the same sense as
`progression.js`/`save.js`, but if both get greenlit in the same milestone the lead should
sequence them (or land them in one PR) rather than risk two teammates editing `items.js`
simultaneously, per CLAUDE.md's "don't let two agents share/overwrite a file" rule.

## 5. Blind spots — what BOTH researchers missed

Most of my pre-emptive flags (sent to both researchers before either doc existed) turned out to
already be handled correctly by the time each doc landed — noted below as "caught" vs. genuinely
missed by both.

- **FSP / premium currency** — **caught by both.** Meta explicitly lists it as "not recommended"
  with zero code change; Core doesn't propose one either. No action needed.
- **Titans are guild-cooperative, not solo** — **caught by Meta** (added the ≥50%-contribution/
  shared-kill-pool detail and explicitly frames our `boss.js` as the "Legendary Creature" stub, not
  a Titan port, recommending any Titan-flavored feature stay single-player-flavor-only until a real
  guild layer exists). Core doesn't touch bosses (out of scope). No action needed.
- **FS's Character Reset is a respec, not a prestige loop** — **caught by Meta**, independently
  triangulated by all three of us (see §3 above). No action needed.
- **Two parallel buff pathways (`activeBuffs` vs `pillBuffs`)** — **caught by Core** (§5.2/5.3,
  independently of my own note on the same nuance) and explicitly flagged as something a third
  buff-adding opportunity must respect. Genuinely well-covered; no action needed.
- **Boss cards out-scaling zone cards + the duplicate-stone-payout sink already existing** — neither
  doc discusses this directly since neither proposes a new card-tuning opportunity, so this
  remains a live blind spot for whoever picks up a future "expand collection" idea, even though it
  wasn't wrong in either doc as written. Worth carrying into `40-next-steps.md` as a standing note:
  if a card/collection opportunity ever gets scoped, it should build on `DUPLICATE_STONE_PAYOUT`
  rather than re-invent a longevity lever from scratch.
- **Sect Dispatch / Bounty Board terminology collision** — **partially caught by Meta**: their §3
  correctly notes `bounties.js` is architecturally closer to a mini Global Quest than to FS's
  actual player-posted Bounty Board, and flags the naming collision as a documentation fix. What
  neither doc explicitly says in one place: a lead or future contributor skimming PROJECT.md's
  module list next to FS terminology could still reasonably assume "we're missing a bounty board"
  or "we're missing idle income" when both already ship (`bounties.js`, `sectmissions.js`). Worth
  a one-line glossary note in `40-next-steps.md` mapping FS-genre terms to our shipped modules so
  this doesn't get re-proposed as new work later.
- **Genuinely missed by both: the rarity-ladder ordering issue (§3 above)** is the one real gap
  that fell through — Core asserted a specific linear FS rarity ordering that doesn't hold up to
  a fresh check, and nothing in Meta's doc (which also discusses rarity tangentially via Epic
  Quests/items) caught the inconsistency. Now flagged directly to Core.
- **Genuinely missed by both: neither doc explicitly cross-references the `js/zones/` /
  `registry.js` per-zone architecture** (PROJECT.md's "to add a zone: create one `js/zones/<id>.js`
  and add it to `ZONE_MODULES`") when discussing world content (Meta §3) or quest chains (Meta
  §5). Any opportunity proposing new world content (e.g. Meta's "fourth/rotating Titan-flavored
  boss tier," opportunity 3.1) will need a zone or an existing zone's boss slot — worth the lead
  confirming which zone/slot before greenlighting, since neither doc names one.
