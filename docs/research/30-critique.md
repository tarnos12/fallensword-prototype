# 30 — Critique (Critic)

Adversarial pass on `10-core-mechanics.md` (Researcher-Core) and `20-meta-systems.md`
(Researcher-Meta). Built my own independent FallenSword fact baseline FIRST (Section 1) as a
yardstick before reading either doc, per the brief's cross-talk protocol. Sections 2-5 are filled
in as the researchers' docs land — this doc is being written progressively; treat an empty
section below as "not yet reviewed," not "nothing found."

**Status: baseline complete, actively polling researcher docs.**

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

*(Filled in once each doc has content — currently only `00-brief.md` exists in `docs/research/`.
Polling every pass.)*

## 3. Disputed/unverified claims

*(Pending doc content.)*

## 4. Constraint violations in recommendations

*(Pending doc content.)*

## 5. Blind spots — what BOTH researchers missed

*(Preliminary, will finalize once docs land.)*
- **FSP / premium currency is a deliberate, correct omission** — neither doc should recommend
  adding a real-money-analog currency; that's out of scope for an offline-first prototype. Watch
  for a recommendation that smuggles this in as "a second currency for whales."
- **Titans are guild-cooperative, not solo** — our whole calamity/boss system is a solo
  reinterpretation. Any opportunity that says "add FS-style Titans" needs to grapple with the fact
  we have no other-players layer yet (NPC-backed provider only); it's a 2.0-scale idea at best.
- **FS's Character Reset is a respec, not a power-prestige loop** — our `ascension.js` (+8%
  compounding) is our own invention layered on top of the xianxia "ascension" trope, not a FS port.
  Neither doc should claim ascension is "how FallenSword does prestige."
- **There are already TWO buff pathways, not one, and both researchers need to know this before
  recommending a "new buff type."** `techniques.js` `activeBuffs` are percentage modifiers folded
  into `progression.js effectiveStats` (the documented single pipeline). But `alchemy.js` pill
  buffs are a SEPARATE `player.pillBuffs` list applied directly to the combat-actor snapshot at
  fight time (`applyPillBuffs`, called from `game.js`, never touching `effectiveStats`) —
  explicitly to avoid `ui.js`'s technique-only buff renderer (see `alchemy.js` header comment,
  lines 4-12). This is a real, shipped, deliberate exception to the "one aggregation pipeline"
  framing in `PROJECT.md`, and it is easy to miss by reading `progression.js` alone. Any
  opportunity proposing a new timed-buff source must pick ONE of these two existing patterns
  explicitly (feed `effectiveStats` like techniques, or snapshot-patch like pills) — inventing a
  third pathway would be a real constraint violation. Watch for either doc's recommendations
  silently assuming buffs only ever go through `effectiveStats`.
- **Boss cards intentionally out-scale zone cards, and duplicate-card design already has a
  stone-payout sink** (`cards.js` `DUPLICATE_STONE_PAYOUT`) — if either doc proposes an "expand
  the collection game" opportunity, it should build on this existing longevity lever rather than
  treat cards as undertuned.
- **Sect Dispatch (`sectmissions.js`) already covers "send NPCs on timed missions for offline
  income,"** and `bounties.js` already covers "hunt-board with rotating targets." A common
  FS-inspired recommendation pattern ("add idle income," "add a bounty board") may already be
  shipped under different terminology — researchers comparing GDD section numbers to FS features
  should double check `js/` before flagging something as missing.
