# Cluster C — Xianxia / Cultivation Games

**Researcher:** Researcher-Xianxia. **Lens:** our entire reflavor is xianxia, so this cluster is
about how these games deliver realm/breakthrough pacing, sect/faction systems, and spirit-stone/
pill/alchemy economies **through mechanics, not just skin** — and specifically the "fast early →
deliberately slows" curve GDD §9.1 wants. Descriptive only; no proposals (that's Phase 3).

**Cross-talk note:** idle-cultivation titles overlap Researcher-Idle's cluster. Per agreed split
(SendMessage exchange, confirmed both sides): I cover the cultivation-*flavor/pacing* lens (realm/
breakthrough bottlenecks, tribulation, sect, alchemy) even on games we both touch; Researcher-Idle
covers the idle-*mechanics* lens (accrual math, prestige math, session-gating). Researcher-Idle
confirmed they're focusing on their own non-cultivation anchor list and will defer realm/tribulation/
sect commentary to this doc.

**Baseline confirmed against our own code before writing this** (so "what we don't do" claims are
accurate): `js/progression.js` gates realm breakthroughs purely by an XP-cost curve (`realmFor`,
per-realm barrier costs at QC9→FE1 and FE9→CF1) — **no failure chance, no tribulation event, no
elixir/material gate**, just "enough XP → auto-advance." `js/alchemy.js` has no success/fail roll on
brewing — pills are deterministic crafts. This matters because several games below build realm
*tension* out of exactly the mechanics we're missing.

---

## 1. Immortal Taoists (mobile idle, "Immortal Taoists-Idle Manga" / "MUD Wuxia")

**What it is:** F2P mobile idle game (iOS/Android), developer credited as Singapore Azure Times
PTE. LTD, originally launched ~2019 (in 2025 marketing it references a "6th Anniversary"), converted
from a xianxia web-novel property. Google Play listing: https://play.google.com/store/apps/details?id=com.immortaltaoists.en
Wiki: https://immortal-taoists.fandom.com/wiki/Immortal_Taoists_Wiki

**Mechanics that matter to us:**
- **Cultivation Base (CB)** is the XP-analog; it accrues passively every ~5 seconds (in-game and
  offline) in a random amount scaled by your current Cultivation Realm — a pure idle-accrual model.
  Source: https://immortal-taoists.fandom.com/wiki/Cultivation_Base
- **Realm structure:** every realm is divided into 10 sub-stages; each stage-up raises both the CB
  required for the next stage *and* a permanent "Efficiency" (accrual-rate) stat — a native "bigger
  number needs bigger number" curve. Source: https://immortal-taoists.fandom.com/wiki/Cultivation_Realm
- **Tribulation/breakthrough is a distinct, risky event, not an automatic level-up.** Once enough CB
  is banked, a tribulation becomes attemptable; it has a **percentage success chance that is NOT
  100%,** and **failure costs a portion of the CB** built up for that attempt (i.e. real downside,
  not just "try again"). Sources: https://immortal-taoists.fandom.com/wiki/Tribulation,
  https://immortal-taoists.fandom.com/wiki/Breaking_Through
- **Pity-style comeback:** failing a tribulation raises the *base* success rate for the next attempt
  by a stated 5%, and specific pills add another +5% each, with companion bonuses stacking further —
  so failure is punishing (CB loss) but self-correcting (rising odds), not a hard wall. Source:
  https://immortal-taoists.fandom.com/wiki/Tribulation
- **Player-side guidance ("don't gamble under 100%") is community wisdom, not a hard rule** — the
  wiki/guides recommend only attempting near-guaranteed tribulations once the CB loss on failure
  starts to sting, which is exactly the "deliberately slows, pushes toward investment" curve GDD
  §9.1 wants. [UNVERIFIED exact loss percentages beyond "a portion of CB"]
- **Companion system** exists (find a "life-long companion," later "ascend" them) layered on top of
  gacha pulls funded by a premium currency ("Jade").

**Monetization flag [LOW/SKIP]:** this is a classic gacha idle title — Jade (premium currency) gates
pulls/upgrades/some gear, and community sentiment specifically calls the monetization "god awful."
Source: community/marketing summaries via https://www.pipiads.com/blog/immortal-taoist-ads-reward-ticket/
and general coverage. The companion-gacha and IAP-currency layer are **[LOW/SKIP]** outright — they
violate our "no monetization surface" reality entirely and shouldn't inform anything beyond noting
the pattern exists.

**What it does that we don't:** a distinct, risky, percentage-chance breakthrough event with a
real failure cost and a self-correcting pity mechanic. We currently have neither risk nor an event —
realm advance is a silent XP-threshold pass.

---

## 2. Amazing Cultivation Simulator (仙剑客栈? no — 了不起的修仙模拟器, sect-management sim)

**What it is:** PC sim/management game, developed by GSQ Games, published by Gamera Games (Chinese
early access Jan 11 2019, full CN release Nov 25 2020, English localization Q4 2021). Steam:
https://store.steampowered.com/app/955900/Amazing_Cultivation_Simulator/. Wikipedia:
https://en.wikipedia.org/wiki/Amazing_Cultivation_Simulator. A sequel (Amazing Cultivation Simulator
2) has been announced/delayed per Steam news. This is the anchor most relevant to our **Sect**
module, since it's a full sect-management sim rather than a solo-cultivator idle game.

**Mechanics that matter to us:**
- **Sect founding requires at least one promoted "Inner Disciple"**; the Sect has Reputation,
  Alignment, and a Feng Shui Rating as top-level stats, plus a disciple roster that runs it. Source:
  https://amazing-cultivation-simulator.fandom.com/wiki/Sect
- **Branches ("departments") unlock at 2000 Reputation** — you assign a branch leader whose skill
  profile matters, and the **Sect Leader's own "Effectiveness" score adds to every branch**, i.e.
  sect-wide passive bonuses stack from a named leader stat. Source: same page +
  https://amazing-cultivation-simulator.fandom.com/wiki/Sect_Leader
- **Inter-sect diplomacy as a numeric resource**: a "Favor" score with other sects; hitting 1200
  Favor (or conquering them) unlocks unique adventure rewards — a soft "reputation economy" between
  factions, not just player-vs-monster. Source: https://amazing-cultivation-simulator.fandom.com/wiki/Sect
- **Sect Power as an HP-like faction stat**: rival/other sects have a Sect Power score that rises/
  falls from random events; if it drops below 6000 the sect closes down entirely. Source:
  https://amazing-cultivation-simulator.fandom.com/wiki/Sect_Closure
- **Alchemy is a trainable skill, not a flat recipe list**: each alchemy skill level adds +5% yield
  and +4% success rate to crafted items; a disciple needs both the recipe *and* sufficient skill
  level to attempt a craft at all. Source: https://amazing-cultivation-simulator.fandom.com/wiki/Alchemy
- **Spirit Stone economy detail**: Spirit Stones are consumable-for-cultivation as well as a
  currency (500 Qi + a 3-day "Qi Resonance" buff per stone, per one wiki page) — i.e. the base
  currency doubles as a cultivation-speed consumable, tightly coupling economy and progression.
  Source: https://amazing-cultivation-simulator.fandom.com/wiki/Spirit_Stone [community discussion
  numbers around specific profitable recipes — e.g. "100 spirit stones → 6 spirit crystals → 6 Sun
  Pills worth 1000+ stones" — are **[UNVERIFIED]**, sourced only to a Steam community discussion
  thread, not the wiki itself; flagging as color, not fact]

**What it does that we don't:** our Sect (`guild.js`) is a flat hireable-disciple-buffs-plus-Dispatch-
missions system with no skill-leveling, no reputation-gated unlocks, and no rival-faction stat to
interact with. ACS demonstrates a much deeper sect-as-system model: disciples with trainable skills
that mechanically gate what they can produce (alchemy skill → yield/success%), a leader stat that
passively multiplies the whole org, and reputation thresholds that unlock new sect capability tiers.

---

## 3. Tale of Immortal (鬼谷八荒, open-world action RPG)

**What it is:** PC (Steam) open-world sandbox ARPG, developed/published by Ghost Valley Studio
(co-published Lightning Games); early access Jan 27 2021, 1.0 release May 26 2023, Switch port Feb
2024, mobile port Dec 2024/Jul 2025. Over 180,000 concurrent players at EA launch, briefly outranking
GTA V/Apex on Steam's most-played list. Steam: https://store.steampowered.com/app/1468810/_Tale_of_Immortal/.
Wikipedia: https://en.wikipedia.org/wiki/Tale_of_Immortal. This is the most "gamey" (real-time
combat, procedural events, roguelite-adjacent runs) of the cluster, closest in spirit to what a
combat-forward cultivation RPG looks like at AA scale.

**Mechanics that matter to us:**
- **Ten realms, each split into early/middle/late stages**, grouped under Four Main Realms (Qi
  Refining, Foundation Establishment, Golden Core, Nascent Soul) as the headline tiers. Source:
  https://gamegeekfusion.com/tale-of-immortal-breakthrough-guide/ (cross-checked against
  https://tale-of-immortal.fandom.com/wiki/Breakthrough)
- **Breakthroughs are gated by *materials*, not just accrued progress**: "Treasures" add permanent
  stats on a successful breakthrough, while separate "Materials" determine the probability of
  success — decoupling the *reward* of breaking through from the *odds* of breaking through. Source:
  https://gamegeekfusion.com/tale-of-immortal-breakthrough-guide/
- **Elixirs are required to progress within a realm's early/mid/late sub-stages**, and elixirs for
  even-numbered realms are shop-limited and refresh only once per in-game year — a deliberate supply
  bottleneck, not a grindable-away cost. [UNVERIFIED exact refresh cadence beyond "once a year"
  per the same secondary guide; treat as directionally right, not exact]
- **Higher realms (Reborn, Transcendent) require rare boss-gated items**, not just currency/materials
  — i.e. the bottleneck escalates from "buy elixirs" to "beat a specific encounter" as realms climb,
  which is a concrete mechanical instance of "fast early → deliberately slows."
- **Every breakthrough attempt can fail and trigger a Lightning Tribulation encounter** — tribulation
  here is literally an in-fiction combat/hazard event tied to the breakthrough roll, not just a
  probability check. Source: https://gamegeekfusion.com/tale-of-immortal-breakthrough-guide/
- **Lifespan is a soft stat, not a real constraint**: lifespan increases by a fixed amount on every
  realm breakthrough, and community guidance is that running out is essentially impossible in normal
  play — it's flavor pressure, not a real clock. Source:
  https://tale-of-immortal.fandom.com/wiki/Beginner_Guide (cross-referenced via search synthesis)
- **Righteous/Demonic alignment (not a formal "karma" system)**: NPCs react to your alignment, and
  NPCs of the opposite alignment have a chance to pick fights with you at each in-game month's end.
  [UNVERIFIED exact mechanic wording — sourced only via secondary discussion threads, not the wiki
  directly; the Fandom wiki confirms character Traits with Evil/heroic flavor text but I could not
  independently verify the "monthly opposite-alignment duel chance" detail against a primary wiki
  page — flagging this whole bullet **[UNVERIFIED]**]

**What it does that we don't:** a breakthrough system with two independently-tuned axes (reward via
Treasures, odds via Materials), a supply-bottleneck economy (once-a-year elixir restock) instead of
a pure grind wall, and tribulation as a literal encounter rather than a coin-flip. Lifespan is
included here as a **counter-example**: a "death clock" that the community itself says never bites —
worth noting as a flavor mechanic that *doesn't* actually create pacing tension, i.e. a trap to avoid
copying without teeth.

---

## 4. Idle Cultivation (Steam, idle RPG)

**What it is:** PC idle RPG on Steam, actively updated (news posts as recent as Feb 2026 per Steam
news history). Store: https://store.steampowered.com/app/3697240/Idle_Cultivation/. Representative
of the current wave of Western-made, English-first idle-cultivation games (distinct from Chinese
mobile gacha idles like Immortal Taoists) — no gacha currency observed in store copy.

**Mechanics that matter to us:**
- **Two-tier disciple system**: "outer disciples" are nameless/fungible labor+combat units; "named
  (inner) disciples" act as middle-managers running workshops, generals leading the army, and agents
  sent on a separate "Conquest" resource-gathering screen. Source: store page +
  https://steamcommunity.com/app/3697240/discussions/0/598541260271399458/
- **Reincarnation as the prestige loop, but tribulation-count-gated, not just level-gated**: beating
  your first "Mortal tribulation" unlocks the ability to empower your Soul on reincarnation, and the
  amount of Soul Power earned scales with **how many tribulations you've cleared**, not just how far
  you leveled — tying prestige-currency size to the risk-events survived rather than raw progress.
  Source: https://store.steampowered.com/app/3697240/Idle_Cultivation/. **Concrete multiplier**
  (independently cross-verified by Researcher-Idle via a separate WebSearch pass on their own idle-
  mechanics lens, reported 2026-07-12): the soul-power multiplier steps **0 → 0.2 → 0.6 → 1.0 → 1.5**
  as you clear successive tribulation tiers — i.e. a concrete, discrete step function, not a smooth
  curve. See `20-idle-incremental.md`'s cross-cluster addendum for their independent verification
  note; this doc stays the source of record for the tribulation/realm framing, theirs for the
  accrual-math framing.
- **Sect-as-crafting-network in community-driven design discussion**: player suggestions (not yet
  necessarily shipped — flagging **[UNVERIFIED shipped-vs-proposed]**) describe "Sect Arrays" as
  passive multi-hall bonuses (cultivation/garden/alchemy/talisman/forging arrays) and sect decay
  after reincarnation unless disciple strength/defense arrays hold it off. Source:
  https://steamcommunity.com/app/3697240/discussions/0/598541260271399458/ — treat this bullet as
  "what players are asking the genre for," useful as a signal of what fans want from a sect system,
  not as confirmed Idle Cultivation mechanics.

**What it does that we don't:** ties prestige-currency magnitude to *risk events survived*
(tribulations cleared) rather than pure level/XP reached — a meaningfully different prestige-scaling
lever than our Ascension's flat "+8%/tier regardless of how you got there."

---

## 5. xiuzhen idle (Steam, idle sim)

**What it is:** PC idle placement/sim game on Steam. Store: https://store.steampowered.com/app/1649730/xiuzhen_idle/.
"Xiuzhen" (修真) is the generic Chinese term for cultivation-toward-immortality — this title is a
plainly-named genre entry, useful as a second idle-cultivation data point distinct from Idle
Cultivation above.

**Mechanics that matter to us:**
- **Multiple parallel cultivation "paths"** (elemental/plant, stone, smelting, alchemy, beast-taming,
  painting, etc.) that a player can specialize into — i.e. technique/dao specialization expressed as
  separate skill trees rather than one universal cultivation stat. Source:
  https://store.steampowered.com/app/1649730/xiuzhen_idle/ (store description synthesis)
- **Realm ladder explicitly named** Qi Refining → Foundation → Celestial → Divine, with new systems
  unlocking at each realm transition (not just numbers getting bigger — new mechanics gate open).
- **Reincarnation grants talent bonuses scaled to how much cultivation was completed in the prior
  life**, explicitly speeding up the next run — a standard "new game+ with carried-forward multiplier"
  prestige shape, mechanically similar to our Ascension but the bonus is continuous/scaled rather
  than a flat per-tier step.
- **Sect-building is a mid-game unlock**, not available from the start — recruit disciples, gather
  resources, build sect facilities only after reaching a certain point, gating social/management
  systems behind solo-progression milestones (mirrors our own "Sect unlocks at some level" gate,
  worth comparing exact thresholds if we want parity data later — not sourced precisely here).

**What it does that we don't:** technique specialization expressed as genuinely separate paths
(you pick alchemy-vs-beast-taming-vs-smelting as different progression lanes) rather than our single
Meridian passive tree + technique-slot system; and a continuous (not stepped) new-game+ scaling
formula tied to prior-life completion depth.

---

## 6. Idle Xanxia (itch.io → Steam Early Access, browser/PC idle cultivation RPG)

**What it is:** Solo-dev (Cezae) browser idle cultivation RPG, started on itch.io, now also in Steam
Early Access. Itch page: https://cezae.itch.io/idle-xanxia. Steam:
https://steamcommunity.com/app/4559050. This is the closest thing in the cluster to a small-team/
solo, non-gacha, browser-first cultivation idle — a useful comparator for us as a fellow small/no-
monetization project rather than a mobile gacha giant.

**Mechanics that matter to us:**
- **Floor-climbing structure**: progression is framed as climbing 100 floors (a tower/dungeon ladder)
  rather than (or alongside) an open world — a discrete, countable milestone ladder. Source:
  https://cezae.itch.io/idle-xanxia
- **"Dao" selection + Dao Trees**: players choose a Dao (a philosophical/build-defining path) which
  then branches into a tree — explicit branching build choice layered on the idle numbers, added as
  a major update alongside a Reincarnation system per the devlog. Source:
  https://cezae.itch.io/idle-xanxia/devlog/1490638/idle-xanxia-is-coming-to-steam and community
  devlog references to "Dao Trees" as one of "two major progression systems" added with Reincarnation.
- **"Aspects" awakened during the climb** stack with Dao choice and rebirth — the exact mechanical
  effect of Aspects is **[UNVERIFIED]** (only described in marketing copy as "awakening Aspects,"
  no wiki-level breakdown found).
- **Active early-access churn**: the dev explicitly says the itch version is for experimentation
  while the Steam version is "where progression will be more standardized," i.e. numbers/balance are
  actively in flux — treat any specific pacing claim from this title as a moving target, not a
  settled reference the way Tale of Immortal's shipped-since-2023 numbers are.

**What it does that we don't:** a discrete "floor" ladder as the primary progress metric (countable,
legible milestones) layered under the Dao/rebirth systems, plus an explicit "Dao" as a named build-
identity choice distinct from our Meridian/technique system (which doesn't currently ask "which Dao
are you" as a single defining choice).

---

## Transferable ideas

| Idea | Game(s) | Relevance | Our pillar/module | One-line why |
|---|---|---|---|---|
| Breakthrough as a distinct risky event (% success, real failure cost) instead of silent XP-threshold pass | Immortal Taoists, Tale of Immortal | **HIGH** | `progression.js` (realm breakthrough) | Directly targets the GDD §9.1 "deliberately slows" curve we don't currently implement — our realms auto-advance with no risk/tension at all. |
| Failure raises next-attempt success rate (pity-style) so risk is punishing but self-correcting | Immortal Taoists | **HIGH** | `progression.js` | Cheap, additive, non-monetized way to avoid a breakthrough wall feeling unfair — no server/multiplayer needed. |
| Decouple breakthrough *reward* (stat treasures) from breakthrough *odds* (materials/pills) as two separate inputs | Tale of Immortal | **MED** | `progression.js`, `alchemy.js` | Gives pills/alchemy a second use (odds-boosting) beyond flat buffs, without touching the pure `combat.js` core. |
| Alchemy as a trainable skill: skill level adds flat %yield and %success to crafts | Amazing Cultivation Simulator | **MED** | `alchemy.js` | Our alchemy has no success/fail roll today; a skill-gated success% would add a real economy sink/investment loop. |
| Sect Branches/departments that unlock at a reputation threshold, each led by a stat-scoring leader | Amazing Cultivation Simulator | **MED** | `guild.js` (Sect) | Our Sect is flat hire-and-buff; reputation-gated capability tiers would deepen it without new UI paradigms. |
| Rival-faction "Sect Power" stat that rises/falls and can collapse a faction | Amazing Cultivation Simulator | **LOW/SKIP** | `guild.js`, `rivals.js` | Needs a live population of competing factions to mean anything — exactly the kind of fake-multiplayer-without-a-server trap PROJECT.md's Tier D already flags for GvG-shaped systems. |
| Prestige currency scaled by *risk events survived* (tribulations cleared) rather than flat tier count | Idle Cultivation | **MED** | `ascension.js` | Our Ascension is flat +8%/tier regardless of path; tying bonus size to breakthroughs-survived would reward the "risk it" playstyle the tribulation idea (above) would introduce. |
| Named "Dao" as a single build-identity choice (branches into a tree), distinct from technique slots | Idle Xanxia, xiuzhen idle (parallel cultivation paths) | **MED** | `techniques.js`, `meridians.js` | We have technique categories (Offense/Defense/Special) and a Meridian passive tree, but no single top-level "what kind of cultivator are you" choice players declare and build around. |
| Continuous (not stepped) NG+ multiplier scaled to prior-run completion depth | xiuzhen idle | **LOW** | `ascension.js` | Interesting alternative to our flat per-tier step, but reworking a shipped, balance-harness-gated prestige formula for a marginal curve-shape change is high-risk-low-reward pre-2.0. |
| Lifespan as a cultivation-tied stat that increases on breakthrough | Tale of Immortal | **LOW/SKIP** | (flavor only) | Sourced community consensus is this "clock" never actually threatens the player in normal play — a flavor mechanic without real teeth; not worth building purely for flavor. |
| Gacha companion pulls funded by premium currency | Immortal Taoists | **LOW/SKIP** | — | Directly violates our "no monetization surface" reality; flagged only as a genre-pattern to avoid. |
| Two-tier disciple system: nameless "outer" labor pool vs. named "inner" disciples with manager/general roles | Amazing Cultivation Simulator, Idle Cultivation | **MED** | `guild.js` | Our Sect already uses named hireable disciples; adding a larger nameless "outer disciple" labor pool underneath could give Sect Dispatch missions more depth without changing the provider interface. |
| Discrete "floor"/tower ladder as a legible milestone counter layered under the open-world map | Idle Xanxia | **LOW** | `map.js`/zones | We already have a legible realm-ladder (QC→FE→CF) and zone structure; a parallel floor-counter would be redundant rather than additive. |

---

**Status: done.** Notifying the lead next.
