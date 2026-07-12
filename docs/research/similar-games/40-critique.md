# Critique — Similar-Games Research (Sprint 2, Phase 1)

**Author:** Critic (Sonnet), adversary role. This doc reviews `10-direct-neighbors.md`,
`20-idle-incremental.md`, `30-xianxia-cultivation.md` against an independently-sourced baseline. I
edit ONLY this file (Rule 1).

Status: baseline complete; adversarial pass on researcher docs in progress as they land.

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

*(Filled in as each researcher doc lands — pending as of this baseline pass.)*

## 3. Disputed / unverified claims

*(Pending — will SendMessage the owning researcher directly per claim and log the exchange here.)*

## 4. Over-claimed relevance / pillar-constraint violations

*(Pending.)*

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
  whose lens (per the brief) is combat/PvP/economy, not prestige — there's a risk Researcher-Neighbors
  skips it because prestige "belongs" to Researcher-Idle's cluster. Flagging so nobody misses it.
