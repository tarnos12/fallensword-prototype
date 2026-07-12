# Cluster B — Idle / Incremental RPGs vs. Fallen Immortal

**Researcher:** Researcher-Idle. Scope per `00-brief.md`: our offline-first / wall-clock / prestige
cousins. This is the cluster most likely to carry direct, low-risk transferable ideas for our
**Qi wall-clock regen**, **Ascension/NG+** (single-tier, wipe-run/keep-collections/+8%-per-tier), and
long-tail retention (Spirit Cards, Beast Codex, Titles, Achievements). Framed relative to what Sprint 1
(`docs/research/10-core-mechanics.md`, `20-meta-systems.md`, `40-next-steps.md`) already established
about our FallenSword lineage — this doc does **not** re-derive FS facts, only idle-genre facts.

**Fact-quality note:** citations below are wiki pages (`wiki.melvoridle.com`, Fandom wikis), official
Steam store pages, and dev/community sources reachable via WebSearch this session. Anything not
surfaced by a source is tagged **[UNVERIFIED]**. Descriptive only, per the brief — no build
recommendations in this phase.

**Games covered (8, within the brief's "~4–7, add better exemplars" latitude — all 8 anchors turned
out to be real, live/maintained, and each teaches a different lesson, so none were dropped):**
Melvor Idle, NGU Idle, Legends of IdleOn, Idle Champions of the Forgotten Realms, Realm Grinder,
Trimps, Kittens Game, Antimatter Dimensions, plus a short honorable-mention note on Idle Slayer for its
offline-cap contrast specifically.

---

## Cluster overview

Every game in this cluster solves the same core problem we do — *what happens to progress while the
player isn't looking* — but they cluster into two families:

1. **RPG-shaped idlers** (Melvor Idle, NGU Idle, Legends of IdleOn, Idle Champions, Idle Slayer): a
   combat/gear/skill loop wrapped in idle accrual, closest in *feel* to us.
2. **Pure incremental/exponential-growth games** (Realm Grinder, Trimps, Kittens Game, Antimatter
   Dimensions): abstract resource-and-multiplier trees with little or no combat, but the **deepest,
   most battle-tested prestige-layer math in gaming** — this is where the richest transferable ideas
   for a *second* prestige layer above our single Ascension tier live.

The single biggest structural axis that separates this cluster from us: **almost none of them gate
play behind a spendable, capped, session-limiting resource the way our Qi does.** Most either (a) have
no energy resource at all (Melvor, the pure incrementals) or (b) let time-away *itself* be the
resource, uncapped or near-uncapped (Idle Slayer). Only Idle Champions/IdleOn lean on anything close to
a session-gating currency, and even there it's softer than ours. This is the most important
"what FallenSword-and-we do that idle games don't" delta in the whole cluster — see the closing table.

---

## 1. Melvor Idle — the strongest comparator

**What it is:** A single-player, browser/Steam, RuneScape-inspired idle RPG — skilling (woodcutting,
mining, etc.) and a full combat system, still actively updated, with a sequel (**Melvor Idle 2**) in
Early Access as of this research. Steam page: released Nov 18, 2021, tagged Singleplayer.
[Melvor Idle — Steam](https://store.steampowered.com/app/1267910/Melvor_Idle/),
[Melvor Idle 2 — Steam](https://store.steampowered.com/app/3218350/Melvor_Idle_2/)

**Mechanics that matter to us:**
- **No stamina/energy resource at all.** You pick an action (mine, fight, craft) and it runs
  continuously — online or idled — until you change it or run out of consumables. There is no
  spendable "Qi-equivalent" gating how much you can *do* per session; the only gate is real elapsed
  time. [Offline Progression — Melvor Idle Wiki](https://wiki.melvoridle.com/w/Offline_Progression)
- **Offline progression is capped at 24 hours.** Reopening the game calculates elapsed wall-clock time
  (up to the cap) and grants the XP/items/mastery-XP that would have accrued, as if you'd stayed
  online — this applies uniformly across skilling **and** combat **and** even the Golbin Raid /
  Ancient Relics roguelike-ish side modes. Past 24 hours, additional offline time is simply not
  rewarded (a hard ceiling, not a diminishing return). The 24h figure is stated on the wiki page
  itself; a commonly-cited community claim of an "18-hour" cap is either outdated or reflects an
  upgrade-unlocked default lower than the 24h maximum — treating the wiki's 24h as the sourced ceiling.
  [Offline Progression — Melvor Idle Wiki](https://wiki.melvoridle.com/w/Offline_Progression)
- **Combat math is fully transparent, formula-documented on the wiki** — `Accuracy Rating = floor(
  (Effective Skill Level + 9) × (Base Accuracy Bonus + 64) × (1 + Accuracy Modifier/100) )`, and Max
  Hit is derived from effective skill level the same way for melee/ranged/magic. This is a "numbers you
  can read" design philosophy independently convergent with our own pillar — Melvor publishes the
  actual formula, not just flavor text. [Combat — Melvor Idle Wiki](https://wiki.melvoridle.com/w/Combat)
- The original Melvor Idle **required an internet connection** to play (server-authoritative saves)
  until an Offline Client entered beta in late 2024; Melvor Idle 2 ships **offline-by-default** from
  the start. [Melvor Idle — Offline Client Beta — Steam
  News](https://store.steampowered.com/news/app/1267910/view/6279801209480020153) — notable since our
  own game is offline-first from day one, the inverse of Melvor's original architecture.

**What it does that FallenSword (and we) don't:**
- Removes the session-gating resource entirely, replacing "how much can I do right now" with "how much
  real time has passed since I last looked" as the *only* pacing lever. **[HIGH]** relevance as a
  contrast case: it demonstrates a viable idle-RPG design with zero Qi-equivalent, which sharpens why
  our Qi-gated model is a deliberate choice (per PROJECT.md's "sessions, not marathons" pillar) rather
  than a genre default — worth naming explicitly in any future pitch/synthesis as "we chose the FS-style
  gated model over the Melvor-style gateless model, on purpose."
- A hard, uniform offline cap (24h) across every subsystem including side-modes, rather than a per-
  system special case. **[HIGH]** — directly informs how a wall-clock offline cap could be designed
  for Qi (a single cap constant reused everywhere `tickQi`-style logic lives) if we ever wanted to bound
  offline gains rather than let Qi simply cap at `MAX_QI` (which we already do implicitly via the Qi
  ceiling itself — Melvor's approach is really just "the resource has a ceiling," which is what our
  `maxQi()` clamp already does structurally, just confirms the pattern is genre-standard).
- Publishing the literal combat formula on a wiki as a stated design value. **[MED]** — reinforces our
  own "numbers you can read" pillar as good, not novel, company; no new idea here beyond validation.

---

## 2. NGU Idle — hybrid active/idle, humor-driven, deep multi-layer resets

**What it is:** A free-to-play PC/browser idle RPG with heavy comedic writing, hundreds of
hand-drawn bosses/equipment, released on Steam Oct 1, 2019, tagged Singleplayer, blending idle and
active play. [NGU IDLE — Steam](https://store.steampowered.com/app/1147690/NGU_IDLE/)

**Mechanics that matter to us:**
- **Energy is a *rate-limited accumulation* resource, not a spend-and-deplete one the way our Qi is.**
  You generate Energy as a bar fills, capped (starting at 500, growing +1 per 20 Energy earned per
  rebirth up to a 100,000 soft cap), then spend it on permanent NGU (Number Go Up) upgrades — this is
  structurally the *inverse* of our Qi (ours depletes on action and regens on wall-clock; NGU's Energy
  regens on *play* and is a currency, not an action-gate).
  [Energy — NGU Idle Wiki](https://ngu-idle.fandom.com/wiki/Energy)
- **Three stacked prestige/reset tiers, each unlocking a harder difficulty layer with its own
  progression multiplier curve**: Normal → **Evil** (unlocked partway through, features level slower,
  new content unlocked; Evil's rebirth bonus formula is 1.5^bosses-beaten vs Normal's 2^bosses-beaten,
  and Evil NGUs run ~1 billion times slower per unit invested) → **SADISTIC** (unlocked after beating
  boss 300 on Evil; bonus formula drops again to 1.2^bosses-beaten, features run ~5×10^19 times slower).
  Each layer forces a **choice** of which NGU track (normal/evil/sadistic) to invest Energy/Magic into —
  you cannot power all three simultaneously.
  [Rebirths](https://ngu-idle.fandom.com/wiki/Rebirths),
  [Evil difficulty](https://ngu-idle.fandom.com/wiki/Evil_difficulty),
  [SADISTIC difficulty](https://ngu-idle.fandom.com/wiki/SADISTIC_difficulty)
- **Some progression persists through Rebirth** (9 Energy NGUs + 7 Magic NGUs keep their levels across
  resets) while other systems fully wipe — a **partial-persistence prestige**, more granular than a
  binary "wipe everything except collections" model.
  [NGU — NGU Idle Wiki](https://ngu-idle.fandom.com/wiki/NGU)

**What it does that FallenSword (and we) don't:**
- **A prestige ladder with progressively *harsher* per-unit rates at each successive tier, not just a
  flat repeatable +X% like our Ascension.** Each NGU reset tier is deliberately slower-per-point than
  the last, forcing the player to lean on the *accumulated* rebirth-count multiplier rather than raw
  per-tier grinding — this is a very different depth model from our linear `+8%×tier` scalar. **[HIGH]**
  — directly relevant if we ever consider a second Ascension-like layer above the current one: NGU's
  lesson is that a second layer shouldn't just be "Ascension but resets more," it should change the
  *economy* of investment (harder to level, but each level matters more) so the two layers feel
  qualitatively distinct rather than one being a bigger version of the other.
- **Selective persistence granularity** (specific named sub-systems survive a reset, not "collections
  as a single wholesale bucket"). **[MED]** — our Ascension's "keeps collections" bucket (cards,
  bestiary, Sect, rivals, achievements) is already closer to this than a naive full-wipe, so this is
  more a confirmation of our existing design than a new idea, but suggests a future second-tier prestige
  could name individual systems for fine-grained persistence rather than an all-or-nothing collections
  bucket.
- Difficulty-gated content unlocks tied to prestige tier (Evil/SADISTIC each add new zones/bosses/
  stories). **[MED]** — parallels our realm-gated zone structure already, just applied to *repeat* runs
  instead of first-time realm progression; a candidate lens for "what does post-Ascension content look
  like" beyond a flat stat scalar.

---

## 3. Legends of IdleOn — idle MMO, AFK-simulation offline model, multi-character

**What it is:** A free-to-play, browser + Steam + mobile "Idle MMO" — persistent account with up to 11
characters of different classes sharing one stash/world. Long-running Early Access (since Apr 2, 2021)
that exited into a full Steam release Nov 6, 2025.
[Legends of IdleOn — Steam](https://store.steampowered.com/app/1476970/Legends_of_IdleOn__Idle_MMO/)

**Mechanics that matter to us:**
- **AFK Gains are a *simulated play* model, not a flat-rate accrual.** The IdleOn wiki frames it as
  "a simulation of what would happen if you played the game yourself" — it factors in the character's
  stats, skill level, monster spawn rate, and damage output, but explicitly does **not** optimize
  positioning/targeting the way a live player would, so AFK gains are below live-play efficiency.
  [Game Mechanics AFK — IdleOn MMO Wiki](https://idleon.wiki/wiki/Game_Mechanics_AFK)
  *(Reconcile note on the rate figures: the cited "~85%" is the app-open-but-AFK gain rate; the IdleOn
  wiki separately gives roughly 20% of on-screen rates when the game is fully closed/offline. Two
  different states — app-open-idling vs. fully-offline — with different multipliers; do not conflate.)*
- **A distinct "Survivability" stat matters only while AFK** — a combination of Defence + Foods + Health
  that determines how fast your character "dies" while unattended, directly throttling AFK gains if
  neglected. This makes gearing choices matter differently depending on whether you're actively playing
  or leaving the game idle, without a separate resource. [Game Mechanics AFK — IdleOn MMO
  Wiki](https://idleon.wiki/wiki/Game_Mechanics_AFK) *(exact "Defence + Foods + Health / how fast you
  die AFK" wording independently confirmed on this page by Critic2's review pass)*
- **Monetization is real-money "packs" and account/character slot purchases layered onto a fully
  free-playable core** — not gated content, but genuine pay-for-convenience/speed.
  **[UNVERIFIED specific price points this pass]**, but broadly consistent with known "idle MMO" F2P
  shape.

**What it does that FallenSword (and we) don't:**
- **Live-play vs. idle-play are explicitly different efficiency modes with a stat that only matters in
  one of them (Survivability).** **[HIGH]** relevance as an idea, but needs care: it's the mirror image
  of our "sessions, not marathons" pillar — IdleOn *rewards* active engagement over idling (opposite of
  systems that reward walking away), which cuts against our Qi-gates-active-play model. Worth naming as
  a genuinely different philosophy, not directly portable, but the *idea* of "a stat that specifically
  shapes offline-safety vs. active-play efficiency" could inform a future Qi-adjacent passive (e.g. a
  Meridian node that changes offline Qi regen specifically, distinct from active-play regen) — **[MED]**
  as a concrete transferable mechanic, **[HIGH]** as a framing lens.
- Multiple characters sharing one persistent economy (11-class roster) is an MMO-idle-hybrid structure
  with **no analog in a solo-Actor game like ours** — **[LOW/SKIP]**, would require an entirely
  different save-schema shape (multiple simultaneous player actors) that isn't a good fit for our single
  cultivator's-journey framing.

---

## 4. Idle Champions of the Forgotten Realms — premium-IP idle, aggressive monetization contrast

**What it is:** A free-to-play D&D-licensed idle formation-battler (Codename Entertainment), long-
running live-service game with heavy crossover-character monetization.
[Codename Entertainment — Idle Champions](https://www.codenameentertainment.com/?page=idle_champions&post_id=993)

**Mechanics that matter to us:**
- **Offline progress approximates roughly one map "area" per minute** of elapsed offline time
  (bounded by whether your formation could actually survive that area), rather than a flat XP/hour
  rate — i.e. offline simulation checks a survivability gate per area, similar in spirit to IdleOn's
  Survivability idea. Boss kills, loot, and challenge progress are all simulated identically to live
  play. [Steam community discussion, corroborated across multiple
  threads](https://steamcommunity.com/app/627690/discussions/0/3609015230786416930/)
- **Monetization is widely criticized as aggressive/predatory** — a "Platinum coin" secondary currency
  system, and champion packs (one cited example: a $45 pack criticized as containing items "easily
  farmed in days" for characters otherwise available free) — described by players as designed to create
  a persistent "just behind the peak" feeling for non-payers. **[UNVERIFIED — specific dollar figures
  and reviewer framing are player-sourced, not official]**, but the pattern (F2P-with-real-money-power-
  gaps) is consistently reported across multiple independent Steam discussion threads.

**What it does that FallenSword (and we) don't:**
- Nothing here is a positive transferable mechanic beyond "offline simulation gated by a
  survivability/difficulty check" (see IdleOn, same idea, better-documented there). **[LOW/SKIP]** for
  monetization shape entirely — Fallen Immortal has no monetization surface and PROJECT.md's pillars
  don't call for one; this game is included specifically as the cluster's **cautionary contrast case**:
  it shows what an idle-RPG-plus-live-service-monetization looks like, useful context for *why* we
  should NOT reach for FSP/gacha-currency-style systems even though FallenSword itself has an FSP lane
  (Sprint 1's `10-core-mechanics.md` already correctly flags FSP as deliberately out of scope for us).

---

## 5. Realm Grinder — the deepest *stacked* prestige-tier exemplar

**What it is:** A browser/Steam incremental "kingdom management" game (Kongregate origin) with faction
alignment choices (Good/Evil/Neutral races) driving multiplier strategy; no combat, pure
resource-and-multiplier growth. [Realm Grinder — Steam
discussion on Reincarnate](https://steamcommunity.com/app/610080/discussions/0/1700542332339423336/)

**Mechanics that matter to us — this is the sharpest single example of multi-layer prestige in the
whole cluster:**
- **Three distinct soft-reset tiers, escalating in scope: Abdication → Reincarnation → Ascension.**
  [Soft Resets — Realm Grinder Wiki](https://realm-grinder.fandom.com/wiki/Soft_Resets)
- **Reincarnation** (first available at 1 Octillion / 1e27 gems, each subsequent reincarnation costing
  1000× more gems than the last) resets stats/excavations and removes gems, but **keeps trophies** and
  grants a permanent "Reincarnation Power" upgrade each time — i.e. a classic single-currency prestige
  loop, similar in shape to our Ascension. [Reincarnation — Realm Grinder
  Wiki](https://realm-grinder.fandom.com/wiki/Reincarnation)
- **Ascension** is a rarer, milestone-gated *replacement* for reincarnation at specific reincarnation
  counts (R39, R99, R159, R219) — pressing it resets everything a normal reincarnation would, but does
  **not** reset the reincarnation-count itself, and switches the main currency to a new tier (Diamond
  Coins, then later Emerald Coins), making prior-currency upgrades free.
  [Ascension — Realm Grinder Wiki](https://realm-grinder.fandom.com/wiki/Ascension)
  **Important caveat (per Critic2's review):** the RG wiki states Ascension was implemented (v1.6.48) to
  **overcome a technical big-number-storage limit** — "all the values were shifted to a smaller range
  to enable the game to progress further" — and Diamond/Emerald Coins are the *rescaled* currency that
  results. So Ascension's design *purpose* is a numeric rescale to dodge floating-point limits, **not**
  a deliberately-authored "new currency that changes what matters" lever. It has the *surface shape* of
  a currency-swap prestige, but should NOT be cited as intentional evidence for the "second tier changes
  what matters" pattern the way Antimatter Dimensions genuinely is. Treat RG's Ascension as a weak/
  ambiguous leg of that argument, not a strong one.
  [Ascension — Realm Grinder Wiki](https://realm-grinder.fandom.com/wiki/Ascension)
- **Prestige Factions**: a second dimension of prestige-adjacent choice — dual-alignment combination
  factions (e.g. Dwarf+Fairy = "Dwairy") purchased *in addition to* a base faction, layering a build-
  strategy meta on top of the numeric reset ladder, with elite end-tier factions (Archons, Djinn,
  Makers) requiring deep reincarnation counts and specific unlocks. [Factions — Realm Grinder
  Wiki](https://realm-grinder.fandom.com/wiki/Factions)

**What it does that FallenSword (and we) don't:**
- **A genuinely three-deep prestige stack** (Abdication → Reincarnation → Ascension) — the clearest
  demonstration in this cluster that a single idle game can carry multiple nested reset tiers with
  different scopes and cadences. **[HIGH]** as a *structural* exemplar of multi-layer prestige depth.
  *Caveat (see above): the currency-swap at Ascension is a technical big-number rescale by design, not
  an intentional "changes what matters" lever — so cite RG for the **depth/nesting** of its reset stack,
  and lean on Antimatter Dimensions (not RG) as the load-bearing evidence that a second tier is best
  justified by adding a qualitatively new kind of progression.*
- **Build-strategy choice layered onto the reset ladder** (faction combinations) rather than a single
  numeric "+X%" per tier. **[MED]** — suggests Ascension *could* eventually offer a choice-of-flavor
  (not just a flat scalar) without necessarily adding raw power, giving replay variety to repeat
  Ascension cycles — interesting but a bigger design lift than our current single-scalar model, and
  would need real playtesting signal that repeat-Ascension monotony is actually a felt problem before
  justifying the complexity.

---

## 6. Trimps — clean single-portal prestige with a respec safety valve

**What it is:** A long-running (web since 2015, Steam release 5/2/2022) text/incremental idle game
with automatable exploration/combat, built by Greensatellite; 90% positive Steam reviews.
[Trimps — Steam](https://store.steampowered.com/app/1877960/Trimps/)

**Mechanics that matter to us:**
- **Portal** is Trimps' single main prestige mechanic (unlocked after zone 20), converting progress into
  **Helium**, spent on permanent **Perks**. Portaling deletes most run-state but explicitly **keeps**
  a named list of permanent resources (Bones, Imp-orts, Helium, Perks, Nullifium, equipped/carried
  Heirlooms, Dark Essence, Masteries, Dimensional Generator upgrades, Magmite) — a much longer
  "keeps-on-reset" allowlist than our Ascension's collections bucket, because Trimps has accumulated many
  more parallel permanent-currency systems over a decade of updates.
  [Portal — Trimps Wiki](https://trimps.fandom.com/wiki/Portal)
- **One free stat respec per run, with an explicit design note that repeat respecs cost a resource
  (another Portal, or a purchasable "Bone Portal").** [Portal — Trimps
  Wiki](https://trimps.fandom.com/wiki/Portal) — directly relevant to Sprint 1's flagged gap (we have
  **no** stat respec at all, per `10-core-mechanics.md` §3.4 opportunity A3).

**What it does that FallenSword (and we) don't:**
- **A built-in "one free respec per prestige cycle" design**, rather than a permanent one-way stat
  allocation. **[HIGH]** — this is a directly relevant idea for our already-identified respec gap
  (Sprint 1 flagged GDD §6.3's proposed spirit-stone-cost respec as unbuilt): Trimps' model of "free
  once per run, paid/scarce beyond that" is a concrete, well-tested shape for exactly the feature our own
  research already flagged as missing — worth citing as a precedent in the eventual proposal phase.
- **A long, named "survives prestige" allowlist accumulated feature-by-feature over years**, which
  mirrors (validates) our own approach of listing specific systems (cards/bestiary/Sect/rivals/spar/
  achievements/boss-trial-bounty progress) as the Ascension keep-list rather than a vague "collections"
  bucket. **[MED]** — more a validation than a new idea.

---

## 7. Kittens Game — pure incremental, no combat, dual-currency soft-reset

**What it is:** A free, ad-free, browser-first (2014, creator "bloodrizer") village-management
incremental with zero combat — pure resource/building/tech-tree growth, also on Steam and mobile.
[Kittens Game — official site](https://kittensgame.com/web/)

**Mechanics that matter to us:**
- **Two parallel soft-reset currencies with different trigger conditions and different effects:**
  **Karma** (gained on reset if you have more than 35 kittens at reset time, converted via a
  diminishing-returns formula into a flat, permanent +1%-happiness-per-point global buff) and
  **Paragon** (gained on reset if you have more than 70 kittens, *or* passively at a rate of 1 per 1000
  in-game years even without resetting, spent on a separate "Metaphysics" upgrade tree).
  [Karma — Kittens Game Wiki](https://wiki.kittensgame.com/en/general-information/resources/karma),
  [Paragon — Kittens Game Wiki](https://wiki.kittensgame.com/en/general-information/resources/paragon)
- Paragon's passive accrual-over-time-without-resetting (1 per 1000 years, independent of the reset
  decision) is an unusual design: it decouples "time invested" from "chose to prestige" as two
  independent sources of the same permanent-currency pool.

**What it does that FallenSword (and we) don't:**
- **A prestige currency that can accrue passively over long, uninterrupted play *without* requiring a
  reset at all**, alongside the normal reset-triggered path. **[MED]** — an interesting alternative to
  our Ascension's binary "wipe now or don't" model: a small trickle of Ascension-adjacent value for
  long, patient single-run play could reward a different playstyle (the "I don't want to wipe my gear,
  I just want to keep playing this character" player) without requiring the wipe. Would need real design
  thought about whether it undermines Ascension's incentive to actually prestige — flagged as a
  discussion point, not a ready-made feature.
- **Two soft-reset thresholds tied to different population sizes (35 vs 70 kittens) feeding two
  differently-purposed currencies** (a happiness buff vs. a separate upgrade-tree spend) rather than one
  currency feeding one flat scalar. **[LOW/MED]** — the underlying idea (multiple prestige currencies
  with different qualitative effects, not just more of the same +% stat) echoes NGU's and Realm
  Grinder's lesson above; Kittens Game is a third independent confirmation of the same pattern from a
  genre corner with zero combat, suggesting it's a fairly universal idle-design convergence, not a
  one-off.

---

## 8. Antimatter Dimensions — the deepest stacked-prestige exemplar in the genre

**What it is:** A free browser idle/clicker (created 2016 by Hevipelle, Steam release Dec 17, 2022,
91% positive reviews, optional non-required IAP on Steam/mobile) — pure numeric "number go up" with no
combat, built entirely around prestige-layer depth as its core design identity.
[Antimatter Dimensions — Steam](https://store.steampowered.com/app/1399720/Antimatter_Dimensions/)

**Mechanics that matter to us:**
- **Three major, sequential prestige layers, each introducing a new currency and mechanic set:
  Infinity → Eternity → Reality.** [Prestige — Antimatter Dimensions
  Wiki](https://antimatterdimensions.wiki.gg/wiki/Prestige)
  - **Infinity** (1st layer): introduces Infinity Points and Infinity upgrades.
  - **Eternity** (2nd layer, "the 4th consecutive reset system"): resets everything **except**
    Achievements, Statistics, Challenge times, Time Dimensions, Eternity Upgrades, Time Studies,
    Eternity Milestones, and Eternity Challenges — a long, explicit persistence allowlist, same pattern
    Trimps uses. [Eternity — Antimatter Dimensions Wiki
    (Fandom)](https://antimatter-dimensions.fandom.com/wiki/Eternity)
  - **Reality** (3rd layer): introduces Reality Machines **and** an entirely separate itemization
    system (Glyphs) layered on top of the numeric prestige stack — i.e. the deepest prestige tier
    doesn't just add more numbers, it adds a *structurally different kind of system* (equippable glyphs
    with their own effects) bolted onto the reset ladder.
- **Pacing is explicitly telegraphed to players by design**: first Infinity in hours-to-days, first
  Eternity in days-to-a-week, first Reality in a week-to-a-month — the game's own community guide states
  this progression timeline outright, i.e. the *devs* treat "how long until the next prestige layer"
  as a stated, tunable pacing lever, not an emergent accident.
  [Guide — Antimatter Dimensions Wiki (Fandom)](https://antimatter-dimensions.fandom.com/wiki/Guide)

**What it does that FallenSword (and we) don't:**
- **The clearest evidence in this whole cluster that top-tier idle games treat "how many prestige
  layers, and how long between them" as a first-class, explicitly-paced design decision**, not an
  incidental feature. **[HIGH]** relevance as a *framing* lesson for any future discussion of a second
  Ascension-like tier: Antimatter Dimensions' layers get *qualitatively* richer each time (new currency
  → new upgrade categories → new itemization system), mirroring the Realm Grinder/NGU lesson from a
  different angle — a second prestige tier is best justified by adding a new *kind* of progression, not
  just another multiplicative stack on the same one.
- **A stated, deliberate pacing target for each layer's first-clear time** — directly analogous to our
  own "sessions not marathons" pacing pillar, just applied to the prestige-layer cadence instead of the
  session-length cadence. **[MED]** — if a second Ascension-style tier is ever considered, this suggests
  explicitly authoring an intended "time to first clear" target for it (the way GDD §9.1 already targets
  a fast-early/slows-later curve for realms) rather than letting it emerge from balance math alone.

---

## Cross-cluster addendum — cultivation-flavored idle titles (accrual/pacing angle only)

Researcher-Xianxia's cluster (`30-xianxia-cultivation.md`) independently sourced three cultivation-
flavored idle games during their realm/tribulation/sect-flavor pass and shared the accrual-math angle
back to this doc to avoid double research. Per our agreed lens split, **full realm/tribulation/
alchemy-flavor treatment of these three lives in Xianxia's doc** — noted here only for the prestige-
math/pacing data point each contributes, independently re-verified via WebSearch this pass:

- **Idle Cultivation** ([Steam](https://store.steampowered.com/app/3697240/Idle_Cultivation/)) — its
  Reincarnation/Soul Power system scales the permanent-currency payout by a **multiplier tied to which
  tribulation tier you've cleared**, not by raw level: soul-power gain is your total skill level
  multiplied by a tribulation-tier factor that is **0 until the first (Mortal) tribulation is cleared**,
  then steps up through Earth/Heaven/Immortal tiers (0.2 / 0.6 / 1.0 / 1.5, confirmed via [Steam
  discussion — soul point
  gain](https://steamcommunity.com/app/3697240/discussions/0/517472842923799872/)). **[MED]** — a
  fourth independent confirmation (after Realm Grinder/NGU/Antimatter Dimensions) that top idle games
  gate a prestige currency's *rate*, not just its *amount*, behind a milestone/difficulty tier rather
  than a flat formula — reinforces the "second prestige tier changes the economy, not just the number"
  pattern from a cultivation-flavored angle specifically relevant to how a future Ascension-tier-2 might
  gate its payout behind (for example) which realm-tier the player reached pre-Ascension, not just
  total stats.
- **xiuzhen idle** ([Steam](https://store.steampowered.com/app/1649730/xiuzhen_idle/)) — its rebirth/
  reincarnation grants a **continuous talent bonus scaled to how far the previous life progressed**,
  rather than NGU/Realm-Grinder-style discrete stepped tiers — per the store page's own framing, "you
  will gain [a] talent bonus according to the previous life[']s practice, so that cultivation becomes
  faster and easier" each successive life. **[LOW/MED]** — a useful *contrast* data point against the
  stepped-tier prestige model (NGU's Normal/Evil/SADISTIC, Realm Grinder's Reincarnation/Ascension):
  a smooth, continuously-scaling carry-over bonus is a simpler formula shape than a milestone-gated
  step function, worth naming as an alternative if a future Ascension-tier-2 wants to avoid the
  complexity of discrete gates.
- **Idle Xanxia** (itch.io / Steam, per Xianxia's sourcing) — flagged by Xianxia as a small, non-gacha,
  non-monetized solo-dev browser idle, the closest production-scale analog to Fallen Immortal itself in
  this entire research sprint (small team, no monetization surface, cultivation flavor). **[UNVERIFIED
  by this researcher — not independently re-searched this pass]**; Xianxia's doc is the source of
  record for its specifics. Relevance noted here only as a "closest comparable scale" data point, not
  for any specific mechanic claim.

---

## Honorable mention — Idle Slayer (offline-cap contrast)

**What it is:** A mobile/Steam tap-and-idle "slayer" game (Pablo Leban) — minions auto-attack, player
taps for burst damage, Slayer Points (SP) drive an Ascension prestige loop.
[Idle Slayer Wiki — Fandom](https://idleslayer.fandom.com/wiki/Idle_Slayer_Wiki)

**One sharply relevant fact (corrected per Critic2):** Idle Slayer's offline *duration* appears
uncapped — a community guide states "if you're gone for 5 days, you return to five days worth of
earnings" [Idle Slayer Offline Earnings
Guide](https://tap-guides.com/2025/10/08/idle-slayer-offline-earnings/) (a single blog, treat as
soft-sourced) — **but the offline *rate* is capped**: the Fandom wiki shows the "Stone of Idle"
offline slay-speed bonus hard-caps at **90% at level 32**.
[Stones of Time — Idle Slayer Wiki](https://idleslayer.fandom.com/wiki/Stones_of_Time) So the precise
claim is "offline **duration** uncapped, offline **rate** capped at 90%," **not** "no cap on offline
earnings at all" — that earlier phrasing was overstated.
Its own Ascension mechanic scales CpS (coins-per-second) bonuses with lifetime Slayer Points, and has a
**second, rarer prestige-inside-a-prestige tier** — **Ultra Ascension**, unlocked at 2,000,000 SP,
resetting far more but granting Ultra Slayer Points spendable on stronger permanent bonuses.
[Ultra Ascension — Idle Slayer Wiki](https://idleslayer.fandom.com/wiki/Ultra_Ascension)

**Relevance:** **[MED–HIGH]** as a *contrast* to our own hard-capped Qi (`MAX_QI`): Idle Slayer sits
near the "uncapped offline duration" end of the spectrum (though rate-throttled), Melvor Idle is
"capped at a clean 24h," and we sit at "capped at a fixed pool size (`MAX_QI`), refilled at a
wall-clock rate" — all valid, deliberately different design points on the same axis, worth naming
explicitly rather than assuming one is "the genre standard." Note (per Critic2): Idle Slayer's
Ascension→Ultra Ascension stack is really a **bigger-permanent-bonus** second tier (USP → stronger
bonuses), so it reads closer to the "just a bigger multiplier" model than to the "changes what matters"
model — i.e. it is a *weaker* leg for the second-prestige-tier lesson and arguably an example of the
thing that lesson cautions against, not a confirmation of it. The load-bearing evidence for
"second tier should add a qualitatively new kind of progression" is **Antimatter Dimensions**
(new currency → new upgrade categories → new Glyph itemization system); NGU's difficulty-tier NGUs are
a secondary supporting case; RG's Ascension and Idle Slayer's Ultra Ascension are *not* strong support
for it (see the RG caveat above and this note).

---

## Transferable ideas — summary table

| Idea | Game(s) | Relevance | Our pillar/module | One-line why |
|---|---|---|---|---|
| Second prestige tier should add a *qualitatively new kind of progression*, not just multiply the existing scalar | **Antimatter Dimensions** (Infinity→Eternity→Reality/Glyphs — load-bearing case), NGU Idle (Evil/SADISTIC difficulty NGUs — secondary support) | **HIGH** | `ascension.js` (future 2nd tier) | AD is the strong evidence: each layer adds a new currency → new upgrade categories → new itemization system, so a flat "Ascension II, bigger number" would feel redundant. **Caveat per Critic2:** Realm Grinder's Ascension is a technical big-number rescale (not a designed "changes what matters" lever) and Idle Slayer's Ultra Ascension is really a bigger-bonus tier — do NOT count these as support for this lesson (earlier draft over-counted to "four games"; corrected) |
| Built-in "one free respec per run/cycle," paid/scarce beyond that | Trimps (Portal respec) | **HIGH** | `progression.js` (stat respec — already flagged as a gap in Sprint 1 §3.4) | Directly matches our already-identified missing-respec gap; Trimps is a concrete, well-tested precedent for the "free once, costly after" shape |
| A hard, uniform offline-progress cap (e.g. 24h) reused across every subsystem | Melvor Idle | **MED** | `game.js` (`tickQi`/`maxQi`) | We already cap implicitly via `MAX_QI`; Melvor validates "one cap constant, applied everywhere" as clean design, not a new mechanic to add |
| Uncapped offline *duration* (rate still throttled) | Idle Slayer (duration uncapped, rate capped 90% via Stone of Idle) | **LOW/SKIP** | `game.js` Qi regen | Violates "sessions, not marathons" — removing the Qi ceiling would erase our core session-gating pillar entirely, not a fit. (Note: even Idle Slayer caps the *rate*, not just us — the "fully uncapped" framing was overstated, corrected per Critic2) |
| A stat/resource that only matters during *unattended* play (e.g. Survivability), rewarding active engagement differently than idling | Legends of IdleOn, Idle Champions | **MED** | `meridians.js` / future Qi-adjacent passive | Interesting inverse-framing device — a passive that shapes offline Qi regen specifically vs. active-play regen could be a novel plug-in, but the underlying "reward active over idle" philosophy partly cuts against our current design intent, needs care |
| Multiple parallel soft-reset currencies with different trigger conditions and different qualitative effects (not one currency → one flat buff) | Kittens Game (Karma/Paragon), Trimps (Helium + long keep-list), Realm Grinder (Prestige Factions) | **MED** | `ascension.js` | Three independent idle games avoid a single monolithic "keeps collections" bucket in favor of named, differently-purposed permanent resources — validates our existing granular keep-list design, and suggests room for a second, differently-purposed currency if a 2nd tier is ever built |
| Passive prestige-currency accrual over long uninterrupted play, independent of choosing to reset | Kittens Game (Paragon's 1-per-1000-years trickle) | **LOW/MED** | `ascension.js` | Rewards patient non-resetting play without forcing a wipe; needs real design scrutiny — risks undercutting the incentive to actually Ascend, flag as a discussion point not a ready feature |
| Explicitly authoring a "time to first clear" pacing target per prestige layer, not just letting it emerge from balance math | Antimatter Dimensions (hours→days→week→month stated targets) | **MED** | `ascension.js` / GDD §9.1 pacing | Mirrors our own realm-pacing-curve intent (GDD §9.1's fast-early/slows-later target); suggests treating a future 2nd-tier prestige's pacing as a stated design target the same way |
| Publishing/documenting the literal combat formula for players | Melvor Idle | **MED** | `combat.js` / player-facing docs | Validates (doesn't add to) our "numbers you can read" pillar — Melvor shows a live, successful idle RPG treating formula transparency as a stated value |
| Multi-character/multi-actor shared-economy idle MMO structure | Legends of IdleOn | **LOW/SKIP** | save schema / Actor model | Needs a fundamentally different save shape (N simultaneous player actors) that doesn't fit our single-cultivator framing; not a good architectural fit |
| Aggressive real-money monetization layered on a F2P idle core | Idle Champions | **LOW/SKIP** | — | Explicitly against our no-monetization-surface design; included only as a cautionary contrast, not a lever to pull |
| A survivability-gated offline-simulation model (offline gains scale with a specific "won't die while idle" stat) | Legends of IdleOn, Idle Champions | **MED** | `game.js` (Qi regen / passive stone income) | An alternative to a flat wall-clock rate — offline gains could theoretically scale with a stat, though this adds complexity our current flat-rate `tickQi` doesn't have and isn't clearly needed absent a stated problem |
| Gate a prestige currency's *rate* (not just its amount) behind which milestone/difficulty tier was cleared pre-reset | Realm Grinder, NGU Idle, Antimatter Dimensions, Idle Cultivation (cross-cluster, via Researcher-Xianxia) | **MED** | `ascension.js` | Fourth independent idle game confirming the same pattern from a cultivation-flavored angle — a future Ascension-tier-2 could scale its payout by realm-tier reached, not just total stats, echoing the "qualitative, not just bigger" lesson above |

---

*Status: complete. Cross-talk: acknowledged Researcher-Xianxia's lens-split proposal on idle-cultivation
overlap (idle-mechanics lens is mine, realm/tribulation/sect-flavor lens is theirs) — did not end up
needing to cover any idle-cultivation title directly, since all 8 covered games here are non-cultivation
idle/incremental exemplars, so no collision occurred in practice. Ready for Critic review and lead
synthesis.*
