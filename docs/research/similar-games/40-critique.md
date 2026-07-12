# Critique — Similar-Games Research (Sprint 2, Phase 1)

**Author:** Critic (Sonnet), adversary role. This doc reviews `10-direct-neighbors.md`,
`20-idle-incremental.md`, `30-xianxia-cultivation.md` against an independently-sourced baseline. I
edit ONLY this file (Rule 1).

**Status: COMPLETE.** All three docs reviewed against an independent baseline (§1), fresh
re-verification of the load-bearing numbers, and direct reads of the real code where a doc claimed to
have verified against it (`progression.js`, `alchemy.js`). Disputes sent by name to the owning
researchers; load-bearing items notified to the lead.

---

## 1. Independent baseline (sourced, built BEFORE reading the three docs)

Established on the highest-profile anchor per cluster, so I have my own yardstick rather than
grading researchers against their own claims.

### Cluster A anchors

- **Torn** — energy-gated (5 energy/10-15 min depending on donator status, full bar ~5hr), spent on
  gym training across four stats (Strength/Defense/Speed/Dexterity) and on attacking (25 energy/hit).
  Boosters (Xanax +250, LSD +50) exist as a real-money-adjacent energy-refill lever — **this is a
  paid energy-refill pattern our offline/no-monetization pillar must NOT import**.
  Source: [Energy — Torn Wiki](https://wiki.torn.com/wiki/Energy), [Torn City Fandom](https://torncity.fandom.com/wiki/Energy).
- **Kingdom of Loathing** — turn-gated ("Adventures"/day, replenished by food/booze), 3 stats
  (Muscle/Mysticality/Moxie) each tied to a class pair, familiars as a pet/companion system, and an
  **Ascension** mechanic: on completing the main quest you may reset as a different class, permanently
  retaining class skills learned across runs — this is architecturally the closest sourced analog to
  our own Ascension (prestige that keeps some things, resets the run) among Cluster A candidates, and
  should be flagged if Researcher-Neighbors doesn't already draw the parallel. Source:
  [Kingdom of Loathing — Wikipedia](https://en.wikipedia.org/wiki/Kingdom_of_Loathing).
- **Sryth** — still live but confirmed **stagnant**: "little replay value... several years since any
  substantial new content," current dev focus is store/monetization, not content. Subscription
  ("Adventurer's Guild") $19.95/yr gates content depth. Any claim treating Sryth as an actively-updated
  fidelity reference should be treated skeptically. Source: [pbbg.com Sryth review](https://pbbg.com/games/sryth).
- **Gladiatus** — Diablo-style gear/stat system (Strength/Skill/Agility/Constitution/Charisma/
  Intelligence), guild-based training discounts and a guild medic; I could **not** independently
  source a specific energy/stamina mechanic for Gladiatus in this pass — if a researcher asserts a
  precise energy-regen number for Gladiatus, demand a citation, it wasn't in my baseline sources.
  Source: [Gladiatus Fandom](https://gladiatus.fandom.com/wiki/Main_Page), [Browser Craft](https://browsercraft.com/game/gladiatus).

- **Eldevin (Hunted Cow's own MMORPG)** — confirmed real and still online (Steam release Nov 2024,
  huntedcow.com). **Important genre-fit caveat**: Eldevin is a full 3D real-time, class-less-combat
  MMORPG with 160+ realms — mechanically it is NOT a stat-math/turn-resolution browser game like
  FallenSword or us; it's Hunted Cow's *other*, structurally different product. If Researcher-Neighbors
  treats Eldevin as a close structural cousin (transferable hit-chance/turn-math), that's a
  miscategorization risk to challenge — the only genuine link is "same studio as FS," not "same
  combat model." Source: [Hunted Cow — Eldevin](https://huntedcow.com/games/eldevin), [Steam](https://store.steampowered.com/app/298160/Eldevin/).
- **Improbable Island** — confirmed live and actively maintained. Stamina-as-tiredness (lower success
  chance when depleted, not a hard action-blocker), a distinctive **4-real-hours-per-game-day** session
  clock with bankable unused days, and a beatable-in-weeks then NG+-style restart (level 1, new class/
  difficulty, prior wins unlock new starting options) — this last part is a legitimate second sourced
  Cluster-A prestige-adjacent precedent alongside KoL's. Source: [pbbg.com Improbable Island](https://pbbg.com/games/improbable-island).

### Cluster B anchors

- **Melvor Idle** — offline progression caps at **24 hours** simulated catch-up with a return summary
  (skill/mastery XP, items). Directly comparable to our Qi/stone wall-clock timestamp pattern, but
  note the cap: Melvor does NOT let offline time accumulate unbounded, ours does not currently cap
  either (worth flagging as a blind spot, see §5). Source: [Offline Progression — Melvor Wiki](https://wiki.melvoridle.com/w/Offline_Progression).
  **CRITICAL FACT-CHECK TRAP:** Melvor Idle's developer has explicitly stated **no plans for a
  prestige system** and is on record as not favoring one — Melvor has **no prestige/NG+ mechanic**.
  Any researcher claim that Melvor has a prestige loop, "ascension," or NG+ comparator to ours is
  **wrong** and must be struck or corrected. Source: [Melvor Idle FAQ](https://wiki.melvoridle.com/w/FAQ).
- **NGU Idle** — has a genuine prestige system named "Rebirth" (RB), energy cap scaling per rebirth,
  an "Energy Power" multiplier stat. Legitimate prestige-loop comparator (unlike Melvor). Source:
  [NGU Idle Wiki — Energy](https://ngu-idle.fandom.com/wiki/Energy), [NGU Idle Wiki — NGU](https://ngu-idle.fandom.com/wiki/NGU).
- **Trimps** — prestige ("Portal"), Heirlooms (Shield/Staff/Core) survive portal, a "Nullifium"
  currency from recycling heirlooms upgrades kept gear-analogs. This is a sourced, real gear-survives-
  prestige model — relevant to how our Ascension keeps collections (cards/achievements) but wipes gear;
  useful comparator, not identical. Source: [Heirlooms — Trimps Wiki](https://trimps.fandom.com/wiki/Heirlooms).
- **Legends of IdleOn** — confirmed live, browser + Steam + mobile, true idle (offline sim, not just
  a catch-up summary), 38 classes, multi-character "farm while offline" model. **Could NOT
  independently source a specific prestige/NG+ mechanic** in this pass despite searching directly for
  it — if Researcher-Idle asserts specific IdleOn prestige mechanics (e.g. named reset tiers, specific
  multipliers), demand a citation; my baseline search came up empty on that specific point even though
  the game obviously has extensive systems overall. Source: [IdleOn Wiki](https://idleon.wiki/).
- **Realm Grinder** — sourced, real reincarnation mechanic: unlocks at 1 octillion gems, each
  subsequent reincarnation costs 1000x more, resets gold/gems/excavations but keeps trophies/
  heritages/artifacts, grants a scaling "Reincarnation Power" (e.g. +25% production and +500% offline
  production per reincarnation count cited by source). Good comparator for how a prestige currency
  can scale unbounded rather than our flat +8%/tier. Faction system (Good=active/spell-focused,
  Evil=idle/passive-production-focused, e.g. Undead has offline-specific bonuses) is a sourced,
  interesting "playstyle-not-just-power" prestige-choice model worth checking if Researcher-Idle
  raises it. Source: [Reincarnation — Realm Grinder Wiki](https://realm-grinder.fandom.com/wiki/Reincarnation), [Factions — Realm Grinder Wiki](https://realm-grinder.fandom.com/wiki/Factions).

### Cluster C anchors

- **Immortal Taoists** — passive Cultivation Base (CB) gain every 5 seconds (random within a
  realm-dependent range), auto-cultivate unlocks permanently at Foundation I, four gatherable resources
  (Food/Wood/Iron/Spirit Stones) from workers assigned to stations, disciple/immortal two-tier
  character system. Note this is a **mobile idle-gacha-adjacent game**; treat any monetization-shape
  claims (gacha pulls, VIP tiers) as needing a citation beyond the general wiki pages I found. Source:
  [Cultivation Base — Immortal Taoists Wiki](https://immortal-taoists.fandom.com/wiki/Cultivation_Base).
- **Amazing Cultivation Simulator** — Rimworld/Dwarf-Fortress-style top-down colony sim, **not** an
  RPG/combat-math game at all — you play a sect grandmaster managing disciples' happiness/training/
  commerce, not a single protagonist fighting monsters. This is the weakest fit of any named anchor to
  our actual gameplay loop (see §4 — flag hard if a researcher over-claims mechanical transfer beyond
  "Sect management inspiration"). 700k+ copies sold in China pre-localization, released to English
  Q4 2021, 91% positive Steam reviews. Source: [Wikipedia](https://en.wikipedia.org/wiki/Amazing_Cultivation_Simulator),
  [PC Gamer](https://www.pcgamer.com/amazing-cultivation-simulator-is-a-rimworld-style-sim-has-already-sold-700000-copies-in-china-and-now-its-getting-an-english-release/).
- **Tale of Immortal** — Steam sandbox cultivation RPG (鬼谷八荒), realm/breakthrough system with
  realm-gated attribute AND skill/interaction changes, permadeath-adjacent "Nascent Soul Remnant"
  revival mechanic at Golden Core+, "Divine Soul" picks at Deity Transformation+. This is a legitimate,
  actively-relevant single-player cultivation RPG comparator — good anchor if Researcher-Xianxia covers
  it with specifics sourced beyond the Steam page. Source: [Steam](https://store.steampowered.com/app/1468810/_Tale_of_Immortal/).

- **Outwar** — confirmed still live (20+ years running, active 2026 roadmap posts including a new
  Item Database and a level-100 expansion). Fine to use as a current reference. Source:
  [Outwar news](https://www.outwar.com/news?all=1).
- **Duels.com** — confirmed **defunct / no longer operating**. Any claim treating Duels as a live,
  currently-playable comparator is wrong; at best it can be discussed historically. Note: don't
  confuse with the different, currently-live "EpicDuel" (artix.com) or "MagicDuel" — three
  differently-named "duel"-branded games surfaced in the same search, easy to conflate. Source:
  [Duel status check](https://status.technobezz.com/duel-corp).
- **Kittens Game** — no single named "prestige" system, but a real reset-for-advantage loop: Karma
  and Paragon points persist across a reset (small ongoing boosts), community consensus reset point
  is informally "~120 kittens" (this specific number is community-sourced/forum consensus, not an
  official mechanic constant — treat as [UNVERIFIED]-grade folklore, not a hard rule, if a researcher
  cites it as authoritative). Source: [Kittens Game reset discussion — Steam](https://steamcommunity.com/app/1097410/discussions/0/766312101614464290/).

- **AdventureQuest / BattleOn** — real, dates to 2002, Artix Entertainment. **Trap**: it was a Flash
  game; Flash died Dec 31 2020. Artix's own statement says the games weren't killed by this, but the
  fix was a **downloadable launcher**, not a live in-browser HTML5 port — if a researcher describes AQ
  as "play directly in your browser today" that's stale/wrong post-2020; it now requires an Artix
  launcher install. Also note the AQ-family naming maze: AdventureQuest (2002, the classic anchor),
  AdventureQuest Worlds (aq.com, separate MMORPG), AdventureQuest 3D (mobile/3D, separate again) — a
  researcher citing "AQ energy mechanics" should say which one. Source:
  [Artix — end of Flash statement](https://www.facebook.com/adventurequest/posts/the-end-of-flash-will-not-have-an-impact-on-our-games-you-can-still-enjoy-ae-gam/10158661635678488/),
  [AQWorlds/Flash/Future](https://www.aq.com/gamedesignnotes/aqwmobilefuture-6482).
- **"Cultivation Quest" (brief's suggested Cluster-C anchor)** — I could **not** independently confirm
  a game by this exact title exists as a notable product; search surfaced only generically-similarly-
  named itch.io indie titles (Xianxia Idle, Idle Cultivation World, Idle Xanxia, Idle Cultivation,
  "Infinite Cultivation" mobile). **If Researcher-Xianxia writes up "Cultivation Quest" with specific
  mechanics/numbers, demand a direct source URL — this may be a brief-suggested placeholder name that
  doesn't correspond to a real shipped game**, or is an extremely obscure title my search didn't
  surface; either way it needs its own citation, not inherited credibility from the brief mentioning
  it. Source (search attempt): itch.io xianxia tag page.

### Fact-check traps flagged going in (watch for these in all three docs)
1. **Melvor Idle has no prestige system** (see above) — a common confusion since almost every other
   idle game on the anchor lists does have one.
2. **Sryth is stagnant**, not a current-content reference.
3. Chinese-origin games (Amazing Cultivation Simulator, Tale of Immortal, Immortal Taoists, any
   mobile-gacha cultivation title) are the highest hallucination-risk zone — oddly specific numeric
   claims (drop rates, exact breakthrough costs, gacha rates) need a URL, not just "the wiki says."
4. Defunct/dead games (Outwar, Duels.com, AdventureQuest's older iterations, Realm Grinder handoffs)
   should be checked for **still-live** status before being used as a "here's what live players see"
   reference.

---

## 2. Confirmed-solid findings per doc

All three docs are well-hedged and use `[UNVERIFIED]` tags honestly. I independently re-ran searches
on the load-bearing numeric/named claims (not just re-reading each doc's own snippets) and read the
real `js/` code where a doc claimed to have. What held up:

### 20-idle-incremental.md (Researcher-Idle)
- **Melvor "no prestige system" trap — PASSED.** The doc never attributes a prestige/NG+ loop to
  Melvor; it correctly frames Melvor as gateless (no stamina) + a 24h offline cap, and pointedly
  keeps Melvor OUT of the four-game prestige-convergence claim (§8 table cites Realm Grinder/NGU/AD/
  Idle Slayer, not Melvor). This was my #1 flagged confabulation risk and Researcher-Idle handled it
  exactly right. Independently reconfirmed Melvor has no prestige via the [Melvor FAQ](https://wiki.melvoridle.com/w/FAQ).
- **Trimps "one free respec per Portal/run" — CONFIRMED verbatim.** [Trimps Wiki — Portal](https://trimps.fandom.com/wiki/Portal):
  "possible to respec only once per run, with no penalties... to get another respec... use the Portal
  to soft reset... or purchase a Bone Portal." The doc's use of this as a precedent for Sprint-1's
  flagged missing-respec gap (A3) is accurate and well-aimed.
- **Realm Grinder three-tier stack (Abdication → Reincarnation → Ascension) — CONFIRMED structurally.**
  [RG Wiki — Soft Resets](https://realm-grinder.fandom.com/wiki/Soft_Resets): Abdication (cash in
  coins for production), Reincarnation (1 Oc gems, 1000× escalating), Ascension (at R39/R99/R159/R219,
  replaces the Reincarnation button). The three tiers are real. (One important caveat on how the doc
  *characterizes* Ascension — see §4.)
- **Antimatter Dimensions Infinity → Eternity → Reality, Glyphs as itemization — CONFIRMED.**
  [AD Wiki — Reality](https://antimatter-dimensions.fandom.com/wiki/Reality): Reality grants Reality
  Machines + Glyphs (equippable, own effects) + Perk Points. The doc's "deepest tier adds a
  structurally different KIND of system (equippable glyphs), not just bigger numbers" is accurate —
  this is the strongest single leg of the convergence claim.
- **Melvor 24h offline cap — CONFIRMED** ([Offline Progression wiki](https://wiki.melvoridle.com/w/Offline_Progression)).
  (Minor citation nit in §3.)

### 30-xianxia-cultivation.md (Researcher-Xianxia)
- **The code baseline is VERIFIED against the real source — this is the doc's load-bearing premise and
  it holds.** I read `js/progression.js` and `js/alchemy.js` directly:
  - `applyBreakthroughs()` (progression.js:156-166) is exactly `while (level < MAX_STAGE && xp >=
    xpForBreakthrough(level)) { xp -= cost; level += 1; ... }` — **pure XP-threshold auto-advance,
    zero failure chance, zero tribulation event, zero material/elixir gate.** The realm-barrier
    *cost* spikes exist (STAGE_XP: 6000 at QC9→FE1, 200000 at FE9→CF1) but there is no risk/tension
    event. The researcher's "silent XP-threshold pass, no risk" claim is **correct**.
  - `alchemy.js` PILLS are deterministic; `brew`/`use` have **no success/fail roll** anywhere. The
    "pills are deterministic crafts, no success roll" claim is **correct**.
  This means the whole "these games build realm TENSION out of exactly the mechanics we're missing"
  framing rests on a true premise. Good, verifiable work.
- **LOW/SKIP tags are correctly reasoned.** Gacha companion pulls (Immortal Taoists) → LOW/SKIP
  (violates no-monetization reality) is right. ACS rival "Sect Power"/inter-sect conflict → LOW/SKIP
  ("needs a live population... fake-multiplayer-without-a-server trap") correctly maps to PROJECT.md's
  Tier D GvG framing. Tale of Immortal lifespan tagged LOW/SKIP as a "clock that never bites" is a
  fair reading (community-sourced, hedged).
- **Amazing Cultivation Simulator sect-depth mechanics** (branches unlock at 2000 Reputation, leader
  Effectiveness stat, alchemy-as-trainable-skill with +5% yield/+4% success per level) are all
  fandom-wiki-cited and consistent with my baseline read of ACS as a deep RimWorld-like sect sim.
  The riskiest specific numbers are already self-tagged `[UNVERIFIED]` (the "100 stones → 6 Sun Pills"
  recipe economics). Reasonable.

### 10-direct-neighbors.md (Researcher-Neighbors)
- **"Fallen Sword II" sequel is REAL — not a hallucination.** Independently confirmed via
  [Hunted Cow's own announcement](https://huntedcow.com/news/announcing-fallen-sword-ii-coming-2026),
  [MMORPG.com](https://www.mmorpg.com/news/fallen-sword-ii-announced-a-cross-platform-rpg-successor-to-the-classic-browser-based-mmorpg-2000136884),
  and [MassivelyOP (2026-01-13)](https://massivelyop.com/2026/01/13/fallen-sword-2-bills-itself-as-a-spiritual-successor-to-the-2006-browser-mmo/):
  Q3 2026, PC/iOS/Android, six classes, fast-paced turn-based combat, Gauntlets, guild-vs-Titans. The
  announcement, date, platforms, class count, and Titan/turn-based framing all check out. (One
  specific mechanical descriptor is over-claimed — see §3.)
- **Kingdom of Loathing Ascension/Karma — CONFIRMED SOLID; this HIGH-relevance load-bearing claim
  holds.** [KoL Wiki — Karma](https://wiki.kingdomofloathing.com/Karma): Karma is spent in Valhalla
  (111 per normal ascension, 211 per Hardcore), "perm"-ing a skill costs 100 Karma (200 for Hardcore
  Permanent) via Jermery's Permery, and unspent Karma carries across ascensions. The doc's claim — "a
  prestige currency (Karma) that buys permanent cross-run unlocks, plus opt-in harder-for-more-reward
  restriction paths" — is accurate on every part, including the Hardcore=more-Karma difficulty dial
  (211 vs 111). This is the best-sourced load-bearing claim in the three docs and is safe to anchor
  the proposal phase on. It also independently corroborates my own baseline finding that KoL is the
  genre origin of "Ascension" as an NG+ term.
- **Duels.com → EpicDuel swap is correct.** My baseline independently found Duels.com defunct and
  EpicDuel (Artix, 2009) a real live browser PvP MMORPG. The swap and the reasoning are sound. The
  "7 full-section games all live/real" claim holds — I independently confirmed Torn, KoL, Gladiatus,
  Improbable Island, Outwar, Eldevin all currently live (see §1); Sryth is live-but-stagnant (minor,
  §3).
- **Eldevin handled correctly.** The doc flags Eldevin as real-time-cooldown combat (NOT stat-math
  turn-based) and tags "drop stamina-gating" as LOW/SKIP — this resolves the miscategorization risk I
  pre-flagged in my baseline (Eldevin is Hunted Cow's *different-genre* product; only the shared-studio
  link is load-bearing, which is how the doc treats it).

## 3. Disputed / unverified claims

### Dispute (neighbors) — "Fallen Sword II ... card-game-like combat system" was unsupported — RESOLVED
**Update: fixed by Researcher-Neighbors during this review.** Original dispute: the sequel is real (§2)
but the doc described its combat as "card-game-like," which my independent search across the
announcement + four coverage outlets did not support (all say "fast-paced turn-based combat" with
elemental attacks/summons/abilities). **Resolution:** Researcher-Neighbors re-searched and traced
"card game-like" to a **single outlet (MMORPG.com's coverage)** — it recurs in none of Hunted Cow's own
announcement, Steam, TechPowerUp, MassivelyOP, RPGamer, or Bleeding Cool. They rewrote the FS2
paragraph to lead with the consistently-sourced "fast-paced turn-based combat (elemental attacks/status
effects/summons, Pathway skill trees)" description, added the Steam page as a source, and demoted
"card-based" to an explicit `[UNVERIFIED]` parenthetical attributed to the one outlet rather than
asserting it. Release nailed to Q3 2026 (PC + mobile), which all sources agree on. Correctly resolved —
the real facts lead, the single-source claim is honestly labeled. Preserved for the record.

### Dispute (xianxia + idle) — the Idle Cultivation "soul-power multiplier 0 → 0.2 → 0.6 → 1.0 → 1.5" cross-reference — RESOLVED
**Update: fixed by both researchers during this review** (verified — I re-read `20-idle-incremental.md`).
Original dispute: my first pass found `30-xianxia-cultivation.md` §4 attributing this step-function to a
"cross-cluster addendum" in the idle doc that did not exist at the time I read it, leaving the specific
`0→0.2→0.6→1.0→1.5` numbers resting on a citation pointing at nothing. **Now resolved:** Researcher-Idle
added the "Cross-cluster addendum — cultivation-flavored idle titles" section (`20-idle-incremental.md`
lines ~382-402), which cites a real primary source — a [Steam community discussion thread](https://steamcommunity.com/app/3697240/discussions/0/517472842923799872/) —
for the multiplier, and Researcher-Xianxia strengthened §4 to point directly at that primary URL AND
added an explicit caveat that the source is a community thread (not an official wiki), so the exact
steps are labeled community-reported. Source chain is now real and honestly hedged. I read a stale
version before the addendum landed — no outstanding issue. Preserved here for the record.

### Flag (xianxia) — Immortal Taoists tribulation pity figures (+5% per failure, +5% per pill) need re-check
These are the load-bearing mechanic behind the doc's top HIGH idea ("failure raises next-attempt rate,
pity-style"). They're cited to the Immortal-Taoists Fandom Tribulation page, which is legitimate, but
this is a foreign-origin mobile gacha game and I did NOT independently reconfirm the specific +5%/+5%
values in my baseline pass (I confirmed the game has passive CB accrual + non-100% breakthroughs, not
the exact pity arithmetic). Not a dispute — the *shape* (risky % breakthrough with a self-correcting
pity) is well-supported — but the specific percentages should be re-verified against the live wiki
before the proposal phase quotes them as a target number. Flagged to Researcher-Xianxia as a
confidence caveat, not an error.

### Defect (idle) — IdleOn "Survivability" mechanic cited to the WRONG GAME's wiki
The doc's Legends of IdleOn section (§3) sources the AFK-gains/Survivability mechanic to
`iourpg.fandom.com/wiki/Offline_Gains`. **`iourpg` is "Idle Online Universe," a different game from
Legends of IdleOn.** The mechanic itself is real for IdleOn — I confirmed the exact wording
("Survivability is the combined number of your Defence, Foods, and Health... how fast you die when
Afk") on the correct wiki, [idleon.wiki — Game Mechanics AFK](https://idleon.wiki/wiki/Game_Mechanics_AFK).
So the fact is right but the citation URL points at the wrong game. **Sent to Researcher-Idle:** swap
the citation to `idleon.wiki`. Also note the doc's "AFK gains capped ~85% of live" vs idleon.wiki's
"only 20% of what is shown when offline" — different framings (app-open-AFK vs fully-offline); worth a
one-line reconciliation.

### Flag (idle) — Idle Slayer "no cap on offline earnings at all" is overstated
The doc's sharp three-point contrast axis (Idle Slayer = fully uncapped ↔ Melvor = 24h cap ↔ us =
MAX_QI pool) leans on "no cap on offline earnings at all," cited to a single blog (tap-guides.com).
But the [Idle Slayer Fandom wiki](https://idleslayer.fandom.com/wiki/Ultra_Ascension) surfaces an
offline-related cap: the Stone of Idle's offline slay *speed* stops at 90% (level 32). So offline
*duration* may be uncapped but the offline *rate* is not fully uncapped. The clean "fully uncapped"
framing is an overstatement resting on a low-tier source. Flagged to Researcher-Idle: soften to
"offline duration uncapped, rate capped at 90%," or cite a primary source for truly-uncapped.

### Minor (idle) — Melvor cap citation: the "18 Hours" thread contradicts the 24h figure
The doc gives Melvor's cap as 24h (correct per the official wiki) but cites, as "confirmation," a Steam
thread titled "Offline Progress Maxed at 18 Hours." 18 ≠ 24 — that thread contradicts rather than
confirms the number (likely a stale/earlier-version cap). Drop or re-label that secondary citation.

### Minor (neighbors) — Sryth's "still maintained" omits that it's content-stagnant
The doc calls Sryth "still maintained by its solo developer" (technically true) but doesn't note that,
per my baseline ([pbbg.com](https://pbbg.com/games/sryth)), it's had little substantial new content
for years and the dev's focus shifted to store/monetization. Not wrong, just rosier than the sourced
reality. One clause would fix it.

## 4. Over-claimed relevance / pillar-constraint violations

### The load-bearing convergence claim ("2nd prestige tier changes WHAT MATTERS, not just a bigger multiplier") — HOLDS DIRECTIONALLY but is over-counted at "four independent games"
This is the claim the lead flagged as anchoring the comparison + proposal phases, so I pressure-tested
each of the four legs:
- **Antimatter Dimensions — STRONG support.** Infinity → Eternity → Reality each genuinely add a new
  *kind* of system (Time Dimensions/Time Studies at Eternity; equippable Glyphs itemization at
  Reality). This is real, sourced, and is the load-bearing example. ✓
- **Realm Grinder — PARTIAL support, and the doc MISCHARACTERIZES the Ascension tier.** Reincarnation
  is a genuine currency-swap (gems → Reincarnation Power), fine. But the doc frames the *Ascension*
  tier as a designed "unlocks an entirely new currency (Diamond Coins, then Emerald Coins),
  retroactively making prior upgrades free" lever — whereas the [RG Wiki — Ascension](https://realm-grinder.fandom.com/wiki/Ascension)
  states its actual purpose was **technical**: "to overcome an issue related to the storage of very
  big numbers... all the values were shifted to a smaller range to enable the game to progress
  further." i.e. Ascension is fundamentally a number-squish to keep the game running, not a
  design-intent "change what matters" tier. The "Diamond/Emerald Coins" currency-naming detail is also
  not something I could confirm from the pages I read. So Realm Grinder supports "multiple stacked
  reset tiers" but is WEAKER evidence for the specific "each tier changes what qualitatively matters
  *by design*" reading than the doc implies. Flagged to Researcher-Idle.
- **NGU Idle — MODERATE support, different mechanism.** Evil/SADISTIC are *difficulty* tiers (harsher
  per-unit rates + forced choice of which NGU track to invest in + gated content), not "a new currency/
  system." That's still "not just a flat multiplier," but it's a different flavor ("same systems,
  harder, pick a lane") than AD's "new kind of system." The doc is actually fairly careful about this
  distinction — acceptable, but it's not the same phenomenon as AD.
- **Idle Slayer — WEAKEST leg, arguably undercuts the claim.** Ultra Ascension grants Ultra Slayer
  Points spent on "stronger permanent bonuses" ([wiki](https://idleslayer.fandom.com/wiki/Ultra_Ascension)).
  "Stronger permanent bonuses" reads closer to *a bigger-multiplier tier* than to "changes what
  matters." Including it as a fourth confirming leg slightly inflates the claim; if anything Idle
  Slayer is an example of the "just bigger" pattern the claim says to avoid.
- **Verdict:** the claim is TRUE and worth carrying forward — but it's really ~1 strong leg (AD) + 2
  moderate (RG-Reincarnation, NGU) + 1 weak/counter (Idle Slayer), not "four independent games
  converge."
- **RESOLVED — fixed by Researcher-Idle during this review** (verified — I re-read the doc). They
  independently confirmed RG's Ascension was implemented (v1.6.48) as a big-number-storage rescale,
  recentered the whole argument on Antimatter Dimensions as the load-bearing case with NGU as secondary
  support, demoted RG-Ascension to "structural-depth exemplar only," demoted Idle Slayer's Ultra
  Ascension to "weaker leg / arguably an example of what the lesson cautions against," and rewrote the
  summary-table row to name only AD+NGU with an explicit inline flag that the earlier draft over-counted
  to "four games." The proposal phase now inherits an accurately-weighted claim, not an inflated one.
  Also verified the other three idle fixes landed: IdleOn citation swapped to `idleon.wiki` (+ the
  ~85%-AFK vs ~20%-offline reconcile), Idle Slayer corrected to "duration uncapped, rate capped 90%"
  now citing the Fandom Stones-of-Time wiki, and the contradictory Melvor "18h" thread dropped.

### Pillar/constraint check on the HIGH-tagged ideas — all clean as written, two coordination notes
I checked every **[HIGH]** idea across the three docs against the hard constraints; none actually
violates a pillar:
- **KoL Karma "buy permanent cross-run unlocks"** (neighbors HIGH) and **Trimps "free respec per
  cycle"** (idle HIGH) both correctly name `progression.js`/`ascension.js` as **single-owner files
  needing lead sign-off** and both are additive (no `save.js` VERSION bump). Correct. **Coordination
  note:** both touch the same single-owner files — if both are ever greenlit they must serialize
  (same rule Sprint-1 already applied to A3/C7).
- **Xianxia "breakthrough as a risky % event" + "pity mechanic"** (both HIGH) → `progression.js`
  single-owner, additive. One thing to name explicitly (neither the doc nor the idea flags it): a
  %-success breakthrough introduces **RNG into progression**, which brushes against the "numbers you
  can read, not hidden-RNG theater" pillar. It's compatible *only if* the success % is shown to the
  player (transparent RNG, like a displayed hit-chance) rather than a hidden roll. Worth stating as a
  design guardrail before anyone builds it. Does NOT touch `combat.js` (pure resolver stays untouched)
  — good.
- **Improbable Island "bank vs cash-on-hand death-penalty split"** (neighbors HIGH) → `game.js`,
  additive save field. Clean, provider-safe, no combat/effectiveStats impact.
- **Gladiatus "mode-varying turn caps"** (neighbors HIGH) → explicitly validates Sprint-1's own B1
  (parameterize `MAX_TURNS` as a `resolveCombat` argument, keeping `combat.js` pure). Clean.
- **Tale of Immortal "decouple breakthrough reward (treasures) from odds (materials/pills)"** (xianxia
  MED) → touches `progression.js` + `alchemy.js`. Note the Sprint-1-documented gotcha: alchemy has TWO
  buff pathways (`pillBuffs` bypasses `effectiveStats` deliberately, per alchemy.js's header comment) —
  any "pills boost breakthrough odds" feature must decide which pathway it lives in. Flag for whoever
  scopes it; not a violation, a known landmine.
No **[HIGH]** idea in any of the three docs proposes a second `effectiveStats` pipeline, an in-place
stat mutation, a `combat.js` game-logic leak, a real-multiplayer dependency dressed as single-player,
or a monetization surface. Constraint-awareness across all three docs is genuinely good.

## 5. Blind spots — ideas all three researchers may have missed

- **Offline-progression caps.** Melvor caps simulated offline catch-up at 24h; our Qi/stone wall-clock
  regen appears uncapped (per `PROJECT.md`, `lastQiTick`/`lastStoneTick` are pure elapsed-time math).
  Worth asking whether an idle-game-style offline cap (or a soft decay past some threshold) is a
  transferable retention lever none of the three clusters may raise, since it cuts both ways: it
  prevents "let it cook for a month" exploits AND is a common idle-genre pattern.
- **Paid energy-refill patterns (Torn's Xanax/LSD-for-energy)** are a real, sourced monetization shape
  from Cluster A that should be explicitly named and rejected as [LOW/SKIP] — worth checking the
  researcher doc calls this out rather than silently omitting it.
- **KoL's Ascension-class-retention model** (permanently keep class skills across a full reset) is
  architecturally close to our own Ascension and is a strong direct precedent from Cluster A, a cluster
  whose lens (per the brief) is combat/PvP/economy, not prestige. **Update: Researcher-Neighbors DID
  cover this** (§4, the HIGH KoL Karma/Ascension find) — not a blind spot after all, and it's their
  best-sourced claim.

### Cross-cluster convergence NONE of the three docs fully connects (the biggest synthesis-level gap)
Because the three researchers wrote in separate files, a pattern that appears in ALL THREE clusters is
never assembled in one place — the lead's synthesis should:
- **"Prestige currency buys permanent, cross-run unlocks" shows up independently in all three
  clusters:** KoL's Karma-perms (neighbors, HIGH), Idle Cultivation's tribulation-scaled Soul Power
  (xianxia, MED), Trimps' Helium→Perks and NGU's partial-persistence (idle). Three clusters converging
  on the same idea is a *stronger* signal for a future Ascension-deepening than any single doc's
  in-cluster argument — but no doc says so because each only saw its own cluster. This is the single
  most useful thing for `50-synthesis.md` to hoist up.
- **"Breakthrough/prestige tension via a risk event" (xianxia) and "difficulty-for-reward opt-in"
  (KoL Hardcore, neighbors) are the same underlying lever** — voluntarily accepting more risk for more
  reward — approached from the progression end (xianxia tribulations) and the prestige end (KoL
  Hardcore). Worth pairing in synthesis.

### Other blind spots
- **Offline-progression caps** (Melvor 24h) — the idle doc covers this well; the *cross-cutting*
  question of whether OUR uncapped Qi wall-clock regen wants a cap is raised but none of the docs owns
  it because it spans idle-mechanics and our own economy. Carry to synthesis.
- **The alchemy dual-buff-pathway landmine** (`pillBuffs` vs `activeBuffs`, alchemy.js header) is
  relevant to the xianxia "pills boost breakthrough odds" idea but neither the xianxia doc nor Sprint-1
  connects them — flagged in §4 above; repeating here so synthesis carries it.
- **Torn's "Happy" training-efficiency brake** (neighbors, MED) and idle games' offline-rate throttles
  are two different genre answers to "stop the player burning the whole session budget in one burst" —
  no doc pairs them, but together they're a more complete menu for the Sprint-1 A1 Qi-rate problem than
  either alone.
