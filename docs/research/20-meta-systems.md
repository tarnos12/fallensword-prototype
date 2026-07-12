# Meta Systems — FallenSword vs. Fallen Immortal

Researcher-Meta's deliverable for the research sprint (see `00-brief.md` for shared context). Scope:
Auction House/economy, Guilds→Sect, world/endgame content, collection/retention, quests/progression
gates, and the profile/fake-multiplayer social layer.

Fact-quality note: FallenSword's own wiki (`wiki.fallensword.com`) blocks this session's direct
`WebFetch` (403 from the proxy), so citations below are drawn from `WebSearch` result snippets over
that wiki (and its Fandom mirror `fallensword.fandom.com`), which the search engine could read even
though direct fetch couldn't. Treat wiki-sourced claims as **wiki-search-sourced**, not
fetched-and-reread-in-full — flagged `[UNVERIFIED]` wherever the snippet was thin or forum-only.

---

## 1. Auction House / Economy

### FallenSword mechanics
- Any player can list an item with a **starting bid** and an optional **Buy Now** price; if a bidder
  meets the Buy Now price the auction ends immediately. Auctions run **1–48 hours**.
  Source: [Auction House — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Auction_House)
- Won items land in a **mailbox**; the wiki states you have **12 hours** to collect from the mailbox
  or the item is lost forever. Source: same Auction House page.
- The auction browser is organized into **categories by inventory slot** (one per equipment slot plus
  quest items), with a **Search Preferences** panel for **min/max level** filtering and a toggle to
  hide either gold or FSP (real-money-currency) auctions. Source: same page.
- **Bound items** cannot be traded, gifted, or auctioned at all; **guild-tagged items** are also
  blocked from auction. Everything else is auctionable. Source: same page.
- Prices can be listed in **gold or FSP** (FallenSword Points — the game's paid currency), i.e. there
  is a real-money-adjacent trading lane layered on top of the gold economy. Source: same page.
- **[UNVERIFIED]** Whether there is a listing fee/tax on posting or completing an auction — the
  search snippets didn't surface a specific fee mechanic; do not assume one exists.

### Our current state
- `js/market.js` implements the **Treasure Pavilion** behind `createMarketProvider(state)`:
  `getListings(filters)`, `buyNow(listingId, now)`, `listItem(itemId, price, now)`,
  `cancelListing(listingId)`, `getMailbox()`, `collectMailbox()`, `tick(now)`.
- **Buy Now only** — no bidding, matching FS's own note that true bidding needs a live opponent (GDD
  §6.7.4 explicitly cites this as the reason to skip it for 1.0).
- NPC listings rotate on a wall-clock timer (`REFRESH_INTERVAL_MS = 3 min`, `LISTING_TTL_MS = 20 min`,
  `TARGET_LISTINGS = 12`, `market.js:17-19,90-105`), pulling from the same `generateItem()` rarity
  tables as monster drops (`market.js:67-85`), capped at **Rare** for NPC listings
  (`NPC_RARITY_WEIGHTS`, `market.js:27`) so the Pavilion stays a variance/convenience source, not a
  power spike past farming — Epic+ stays hand-authored loot.
- Deliberate price noise: `noise = 0.6 + rng()*0.9` around `marketValue()` (`market.js:74-76`), so
  listings range 0.6×–1.5× fair value — directly mirrors FS's "some are bargains, some are rip-offs"
  spread.
- Player listings resolve asynchronously: sell chance and speed are a function of how competitive the
  ask is vs. `marketValue()` (`listItem`, `market.js:171-201`); sales AND unsold returns land in a
  **mailbox** (`market.js:107-139, 214-239`) — this matches FS's mailbox pattern, but our mailbox
  **never expires** (no analog to FS's stated 12-hour collection window) and unsold listings
  themselves expire after `PLAYER_LISTING_TTL_MS = 30 min` and auto-return (not auto-lost).
- Category/slot filtering exists (`filters.slot`, `filters.rarity`, `market.js:143-149`) but there is
  **no level-range filter** in `getListings(filters)` — FS's Search Preferences min/max-level box has
  no equivalent here.
- No **bound-vs-tradeable** distinction: `js/items.js` has no `bound` field at all (verified by grep —
  the only "bound"-adjacent code is unrelated socket code). Every item the player owns, including
  quest rewards and boss drops, can be listed. GDD §6.8 explicitly calls for a `bound` field; it was
  never implemented.
- No FSP-equivalent (paid currency) lane — single currency (spirit stones) only, which is a deliberate
  simplification, not a gap (Fallen Immortal has no monetization surface at all).
- Sold-into-mailbox items only auto-deliver to inventory if there's room; a full pack blocks item
  collection (`collectMailbox`, `market.js:217-239`) — no FS analog found in the search results, but
  functionally reasonable given no expiry pressure.

### Gap analysis
- **Match:** Buy Now-only, price variance, mailbox pacing device, rotating NPC-sourced listings, one
  `MarketProvider` interface a 2.0 network layer can implement unchanged — all land as designed.
- **Divergence (missing bound/tradeable split):** FS explicitly walls off bound and guild-tagged items
  from auction; our game has no `bound` concept, so quest-reward named items (e.g. the Heaven-Severing
  Blade capstone) can currently be sold on the Pavilion, undermining their "epic reward" weight. This
  is the single most load-bearing gap in this section.
- **Divergence (no level filter):** trivial UX gap — FS's level-range search exists because auctions
  span the whole level range of a huge population; our 12-listing shelf is small enough that a filter
  is optional but still a well-worn genre expectation.
- **Divergence (mailbox has no expiry):** ours never punishes ignoring the mailbox; FS's 12-hour window
  creates real stakes ("check back in or lose it"). Removing that pressure is arguably a fine offline-
  friendliness trade (a player who doesn't log in for a week shouldn't lose gold), but it does drop a
  design lever FS uses deliberately.
- **We do better/differently:** deterministic, seed-driven persona roster (`personas.js`) reused
  across market/sect/profile is a nice unification FS doesn't need (FS has real players); our
  synchronous headless-tunable econ (`tools/balance.mjs` "market sanity" rows per PROJECT.md) gives us
  a verification lever FS's live economy never had.

### Opportunities (ranked)
1. **[S, no constraint conflict] Add a `bound` field to `items.js`** for capstone/epic-quest-reward
   items (at minimum the Heaven-Severing Blade and Stormcrown Mythic), and have `listItem()` reject
   bound items. Small, additive (`save.js` items already round-trip whatever shape `items.js` emits;
   a new item field needs no VERSION bump per the additive-fields rule). Directly closes the biggest
   fidelity gap versus FS and versus our own GDD §6.8.
2. **[S] Level-range filter on `getListings(filters)`** in `market.js`, surfaced as a min/max input in
   the Pavilion UI. Self-contained (owns its own modal per PROJECT.md's module rule); no interface
   change beyond a new optional filter key.
3. **[M] Mailbox expiry window** (e.g. a multi-hour or multi-day `expiresAt` on mailbox entries,
   forfeiting uncollected stones/items past it) — reintroduces FS's real stakes. Needs care: must stay
   wall-clock/offline-safe (persist `expiresAt` per entry, same pattern as `LISTING_TTL_MS`) and must
   not feel punitive for an offline-first single-player game — a generous window (48–72h) preserves
   the "check back in" nudge without punishing a week away.
4. **[S] FSP-equivalent lane** — explicitly **not recommended**. Fallen Immortal has no monetization
   surface and PROJECT.md's design pillars don't call for one; skip.

---

## 2. Guilds → our Sect

### FallenSword mechanics
- Guilds provide **Relics**: capturable magic structures granting stat/enhancement bonuses (attack,
  defense, armor, HP, damage, stamina, gold gain, XP gain, and named enhancements like piercing-strike
  or critical-hit) to **every member of the guild currently in control**, contested via group-capture
  attacks at the relic's map location.
  Source: [Category:Relics — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Category:Relics)
- **Guild Structures**: built by the guild (funded + upkept from the guild bank, itself filled by
  member taxes/donations), each with a build cost and ongoing upkeep cost, unlocking stat boosts,
  enhancements, or guild features.
  Source: [Guild Structures — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Guild_Structures)
- **Guild Conflicts (GvG)**: guilds fight each other; the winning guild earns **Guild Reputation
  Points (RPs)**, spendable on guild-wide buffs or epic items. Combat-buff strategy during a conflict
  emphasizes defensive buffs (Absorb/Deflect/Last Ditch) on every member, including offline members,
  since they remain attackable targets.
  Source: [Guild Conflicts — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Guild_Conflicts)
- A **Guild Buffer** role/mechanic exists — a member (or NPC-ish helper feature)
  dedicated to applying buffs guild-wide. **[UNVERIFIED]** — snippet was thin; treat as "guilds have a
  buffing-support feature," not a confirmed specific mechanic.
  Source: [Guild Buffer — Fandom mirror](https://fallensword.fandom.com/wiki/Guild_Buffer)

### Our current state
- `js/guild.js` implements the **Sect** stub behind `createGuildProvider(state)`:
  `getMembers()`, `getRecruits()`, `hire(personaId)`, `dismiss(personaId)`, `buffs()`.
- **`SECT_CAPACITY = 3`** disciple slots (`guild.js:15`) — dramatically smaller than a FS guild
  (dozens to hundreds of members).
- Four disciple specialties (`SPECIALTIES`, `guild.js:22-26`): War (xpPct), Merchant (stonePct),
  Alchemist (stonesPerHour passive income), Meditation (qiCap) — these are **economy/utility buffs
  only**; none touch combat stats (attack/defense/damage/armor), unlike FS relics/structures which
  explicitly do grant combat stats.
- Buffs are **aggregated flatly** (`guildBuffs`, `guild.js:76-85`) and consumed read-only by
  `js/profile.js` (`sectBuffViews`, `profile.js:91-99`) and (per PROJECT.md) the game layer's XP/stone
  reward math — not routed through `effectiveStats`, because none of the current buff types are combat
  stats.
- `js/sectmissions.js` adds **Sect Dispatch**: timed wall-clock missions (`MISSION_TYPES`,
  `sectmissions.js:18-22`, 20/45/90 min) a hired disciple runs solo, paying stones+XP scaled by
  disciple level × mission length (`missionReward`, `sectmissions.js:27-33`) — this has **no direct FS
  analog** in the sourced material; it reads as an idle-game-style addition layered onto the Sect
  concept, not a port of anything FS-specific.
- **No guild-vs-guild**, **no relics/territory capture**, **no guild bank/tax/upkeep**, **no guild
  structures**, and **no combat-stat guild buffs** — the entire GvG/relic/structure layer of FS guilds
  is absent, which is an intentional per-CLAUDE.md/PROJECT.md scope cut (there's no second guild to
  fight — this is a single-player game), not an oversight.
- Recruits are drawn from the shared `personas.js` roster with a curated recruit board
  (`RECRUITS`, `guild.js:41-50`) guaranteeing a spread across specialties — this is a Fallen-Immortal-
  specific design (FS doesn't need to fabricate recruits; real players fill guild rosters).

### Gap analysis
- **Match (buff category, not stat-vector):** GDD §3 explicitly scopes the Sect as delivering "the
  same *category* of buffs a guild structure would (stamina gain, XP bonus)" — our four specialties
  land exactly there. This was a deliberate stub, not a miss.
- **Divergence (no combat-stat buffs):** FS relics/structures grant attack/defense/armor/HP/damage —
  real combat power, not just economy. Our Sect grants zero combat stats. This is arguably correct
  restraint (a guild-shaped stat buff on top of gear+cards+meridians+sets+ascension is another
  aggregation-pipeline source to justify), but it's the most visible power-category gap versus FS
  guilds specifically.
- **Divergence (no GvG/territory):** entirely absent, and **should stay absent** — there is no second
  guild to fight in an offline single-player game. Faking "rival sects attacking your Sect" would
  require simulating an adversarial NPC guild's actions against the player, which is a much bigger
  build than the current NPC-personas-as-flavor-text approach, and starts to resemble actual PvP
  (a 2.0-scoped concern per PROJECT.md).
- **We do better/differently:** Sect Dispatch's timed missions are a wall-clock engagement loop FS's
  guild system doesn't really have at the individual-member level (FS's guild engagement is GvG/relic
  capture, which needs a live guild). Sect Dispatch gives the single-player Sect stub something to
  *do* daily, which is arguably better UX for our offline context than porting relic capture would be.

### Opportunities (ranked)
1. **[S, touches the stat pipeline] A capped, small combat-stat Sect buff.** Add one more specialty
   (e.g. a "Vanguard Disciple" granting a small flat attack/defense bonus) that plugs into
   `effectiveStats` as a new passive source, same insertion point cards use (PROJECT.md: "a new
   passive flat source plugs in as one add-line in this pipeline, before the % buffs"). Keep it small
   relative to gear/cards so it doesn't undermine gearing decisions. **Coordinate with
   Researcher-Core** before doing this — it's a stat-pipeline change, squarely in their territory.
2. **[M] Sect capacity scaling** — let `SECT_CAPACITY` grow with Sect-related achievements/ascension
   tier rather than a flat 3, giving a long-term Sect-investment goal analogous to FS's guild-growth
   arc (bigger guild = more structures = more power). Contained to `guild.js`.
3. **[L, likely post-2.0] Any GvG/relic-capture analog** — explicitly deprioritized. It only makes
   sense once `NetworkGuildProvider` exists and there's a real second guild to contest against; faking
   it single-player would be a lot of simulation work for a mechanic (contested territory) that
   depends on genuine multiplayer stakes to feel meaningful.

---

## 3. World / Endgame Content

### FallenSword mechanics
- **Titan Events**: server-wide, giant-scale bosses visible on the realm map; each titan must be
  killed a set number of times (1–10) before it "moves" to a different map square. First titan event
  was May 2009 (Ogalith, Fuvayu); titans span a huge level range (Ogalith ~Lv100 up to Kojin ~Lv1200).
  Source: [Titan Event — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Titan_Event);
  [Category:Titan Beasts](https://wiki.fallensword.com/index.php/Category:Titan_Beasts)
- **Correction from Critic's independent baseline (adopted here):** Titans are specifically
  **guild-cooperative** — the kill is tracked against a shared "Titan HP" pool, and the reward goes to
  whichever guild contributed **≥50%** of the damage to that pool; 2nd–5th place contributing guilds
  still earn bonus points. There are reportedly **2–5 Titan events per day**. This is a structurally
  different mechanic from a solo encounter: it requires (a) a guild, and (b) other guild members
  racing the same shared HP bar. Source (via Critic, same wiki page):
  [Titan Event — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Titan_Event).
- **Legendary Creatures/Events**: a related but distinct scheduled-boss category (per GDD §3's own
  framing: "World events / Legendary creatures — Server-wide weekend bosses"). **[UNVERIFIED]** — the
  Legendary_Event wiki page itself returned only a title in search, no extractable mechanical detail
  beyond what GDD.md already asserts; do not treat "weekend" cadence as confirmed beyond GDD's own
  paraphrase.
- **Relics** (see §2) function as a world/endgame layer too — capturable, contested, persistent map
  structures, not just a guild-internal mechanic.
- **PvP Arena**: a *separate*, gear-normalized tournament mode — item level is capped to the
  tournament's "Max Equip Level," and **level-up points, relics, buffs and guild structures are all
  ignored** inside the arena, so a high-level player gets no advantage beyond the same capped gear a
  max-level-for-bracket player has. Players pick 10 combat moves (max 3 copies of each, earned by
  winning tournaments). The Arena is explicitly **separate from PvP Rating** (open-world PvP has its
  own separate rating/prestige track). Launched 19 Jun 2008.
  Source: [PvP Arena — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/PvP_Arena)
- **PvP Prestige**: a separate progression track from open-world PvP wins — fixed prestige per attack
  type (+10 standard attack, +1 bounty). Source:
  [PvP Prestige — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/PvP_Prestige)
- **Relics** grant stamina gain, gold gain, XP gain, and enhancement effects as passive world-layer
  bonuses (see §2 citation) — i.e., relics double as both guild and "world content" reward.
- **Medals**: awarded for leaderboard longevity (Top 250 Players, Richest Player, PvP Ladder — staying
  on top X days) or count-based milestones (bounties completed, Global Quest participation/top-100),
  across six tiers (bronze/silver/gold/crystal/ruby/diamond).
  Source: [Medals — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Medals)
- **Global Quests**: time-boxed, server-wide kill-target events with their own qualification and
  top-100 medal tiers (see Medals citation above).
- **Bounty Board (per Critic's independent baseline — adopted here):** FS's actual Bounty Board is
  **player-posted**, not system-generated: a player sets both the reward and the kill target on a
  specific creature, and other players **race to complete it first**; whoever loses the race gets
  nothing back. This is a fundamentally different shape from a system-curated offer board — it's a
  player-vs-player race for a player-funded reward. Source (via Critic):
  [wiki.fallensword.com bounty pages]. Treat any comparison of our `bounties.js` to "the FS Bounty
  Board" as a *name* match only, not a mechanic match — see correction below.
- **Level-gap XP tension**: killing lower-level creatures yields sharply reduced XP (worked example:
  a level-10 character earns ~40 XP from a level-10 kill but only ~10 XP from a level-5 kill) — the
  "don't farm trivial mobs" pressure GDD §3/§8.3 explicitly calls out as a mechanic to keep.
  Source: [Experience Points — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Experience_Points)

### Our current state
- `js/boss.js` implements three **calamity bosses** (Xuanming/Zhulong/Jiuxiao) as a `BOSSES` registry
  — fixed-lair, cooldown-gated, stage-gated solo encounters (`bossAtLair`, `bossEligible`,
  `bossCooldownRemaining`, `boss.js:152-180`), each with hand-authored stats "headless-tuned against
  player sheets at the boss's gate realm" (per the file's own header comment) via `tools/balance.mjs`.
  This is architecturally closest to FS's **Legendary Creature** framing (solo, scheduled, gated) —
  explicitly **not** the multi-kill, map-roaming, server-wide **Titan** model; our bosses are single-
  player-solo by construction (no titan-style "kill N times to force it to move").
- Boss cooldowns are per-boss wall-clock timers (`cooldownMs`: 30/45/60 min, `boss.js:47,68,94`) —
  functions as a repeatable-content pacing device with no FS Titan/Legendary-event citation for the
  specific cooldown design; this is our own invention layered on the "scheduled solo encounter" idea
  GDD §3 stubs.
- `js/bounties.js` implements a **Bounty Board**: rotating "slay N of creature X" offers
  (`offeredBounties`, `bounties.js:65-88`), reading progress live off `bestiary[typeId].kills` with no
  combat-path hook needed. Structurally this is **system-generated and non-competitive** — the board
  rotates on a wall-clock timer (`BOARD_MS = 15 min`) and any number of players (well, the one player)
  can complete an offer without racing anyone. **Per Critic's correction, this shares only the name
  with FS's actual Bounty Board**, which is player-posted and a first-to-complete race (see FS
  mechanics above) — our version is architecturally closer to a miniature, individual-scale Global
  Quest (kill-target, time-boxed) than to FS's own Bounty Board. No leaderboard, no top-100 medal tier,
  because there is no server population to rank against or race.
- `js/trials.js` implements **Daily Trials**: one deterministic, day-seeded benchmark fight per UTC
  day (`todaysTrial`, `trials.js:70-103`), benchmarked off player level (not player's own effective
  stats) so gear/allocation improvements matter (`benchmark`, `trials.js:56-65`) — **no FS-sourced
  analog found**; this reads as an original daily-login-reward mechanic, not a port.
- `js/duel.js` + `js/rivals.js` implement **Sparring**: the player fights a deterministic NPC-persona
  stat sheet through the *same* `resolveCombat()` a real PvP mode would use (`runSpar`, `duel.js:30-42`;
  `rivalActor`, `rivals.js:59-69`), tallied in `player.sparRecord` — this is explicitly the PvP hook
  GDD §4.1/architecture notes call for (pure resolver, generic actors), **not** FS's PvP Arena's
  gear-normalization rule: our spar uses the player's full live effective stats, with no equip-level
  cap and no separate combat-move-pool mechanic. There is **no arena-style gear-capped tournament
  bracket** and **no separate PvP Rating/Prestige track** — sparring is bragging-rights only
  (win/loss/draw tally), which matches the GDD's "PvP cut for 1.0, hook left in the resolver" call.
- **No relics, no titans, no medals/leaderboards, no global quests.** `js/achievements.js` (23
  milestones) is our closest analog to FS Medals, but ours are single-player predicate checks
  (kills/level/gear/sect size/etc.), not leaderboard-longevity or server-wide-event medals — there is
  no population to rank against, so the leaderboard-medal category has no meaningful single-player
  equivalent as designed.
- Level-gap XP tension is implemented directly: `scaleXp(baseXp, playerLevel, creatureLevel)` in
  `js/game.js:416-419` — `mult = clamp(0.1, 2, 1 + 0.25*(creatureLevel - playerLevel))` — punching up
  pays up to 2×, farming far below level floors at 0.1×. This is a close structural match to FS's
  documented level-gap XP penalty (both punish farming trivially-low creatures), though the exact
  curve/shape is our own tuning, not a copy of FS's numbers.

### Gap analysis
- **Match (level-gap XP tension):** both games explicitly punish farming below-level content to push
  players upward; our multiplier is a different curve but the same design intent, independently
  confirmed on both sides.
- **Match (PvP kept as a resolver hook, not a live mode):** GDD's own call ("PvP cut for 1.0... leave
  a hook") is honored exactly by `duel.js`/`rivals.js` — this is a correct, deliberate scope cut, not
  a gap.
- **Divergence (Titan vs. Legendary Creature model) — sharper than first framed, per Critic's
  correction:** our three bosses are single-player-solo, cooldown-gated encounters with **zero
  other-players/guild-contribution layer**. FS Titans are not just "bigger" — they are a
  **guild-cooperative shared-HP-pool** mechanic (≥50% contribution wins the reward, 2nd–5th place
  guilds get bonus points, 2–5 events/day). Our calamities have no analog to any of: a shared damage
  pool, a contribution-based reward split, or competing guilds. This is structurally the "Legendary
  Creature" stub GDD §3 asked for (a scheduled solo encounter), **not** a Titan, and the gap is not
  closeable without real multiplayer — a true Titan requires a live population racing a shared bar,
  which single-player busywork (e.g., fake "other guilds" contributing) would only simulate poorly.
  Correct to leave this as a 2.0-network-provider-era feature, not attempt it now.
- **Divergence (Bounty Board is same-name, different-mechanic):** our `bounties.js` board is
  system-generated and non-competitive; FS's Bounty Board is player-funded and a completion race. This
  is a **naming collision worth fixing in our own docs/copy**, not a mechanical gap to close — a
  player-funded race has no meaning without other real players to race against or fund the reward, so
  porting the actual FS mechanic isn't sensible pre-2.0. Recommend the lead's synthesis note this so
  nobody later assumes `bounties.js` was built as an FS Bounty Board port.
- **Divergence (no medals/leaderboards):** entirely absent, and largely **can't be ported** faithfully
  — FS medals are fundamentally about *rank amongst other players* (Top 250, PvP Ladder). Our
  achievements are the correct single-player substitute already in place.
- **Gap worth flagging (no arena-style gear-normalized PvP mode):** FS's Arena explicitly caps gear to
  a bracket's "Max Equip Level" so power gaps disappear inside the mode — this is a *different* kind
  of PvP than open-world (skill/build-expression over gear-grind). Our sparring has no such
  normalization; a maxed player always crushes an under-geared rival. If a future 2.0 network PvP mode
  is ever built, FS's own design explicitly separates "gear-race PvP" (open world) from
  "build-expression PvP" (Arena) — worth remembering as a distinct opportunity, not assuming
  open-world PvP covers both needs.
- **We do better/differently:** Daily Trials appear to be an original addition (no FS source found)
  that gives single-player daily-login value FS gets for free from a live population; it's arguably a
  *better* fit for offline-first design than trying to port Global Quests would have been.

### Opportunities (ranked)
1. **[S] A fourth/rotating boss tier framed explicitly as "Titan-flavored"** — e.g. an optional
   *repeatable* (not single-kill) mega-boss requiring several defeats in a session/day before it
   "moves," purely as single-player flavor text (no real relocation needed, just a kill-counter UI
   framing), to capture more of the Titan feel without needing a population. Pure content addition —
   goes through `tools/balance.mjs` like the existing three.
2. **[M, provider-safe] A gear-normalized "Arena" mode as a sparring variant** — cap effective stats to
   a level bracket inside `duel.js`'s spar path only (never mutate the player's real
   `effectiveStats` — compute a bracket-capped copy for the fight, discard it after). This is
   consistent with the constraint that `combat.js` stays pure and only ever receives two stat sheets;
   it's an alternate *caller* of the same resolver, not a change to it. Flag: if this ever becomes
   real PvP (2.0), the bracket-cap logic should live behind the same kind of provider interface as
   `MarketProvider`/`GuildProvider`, not hardcoded into `duel.js`.
3. **[S] Extend achievements with "longevity" flavor** (e.g. "N consecutive days played," "N days
   since last boss defeat reset") as our closest single-player analog to FS's leaderboard-longevity
   medals, without needing a real population.

---

## 4. Collection / Retention

### FallenSword mechanics
- **Bestiary**: per-creature wiki-style pages tracking approximate drop rates (ratio of drops to
  kills); a "Find Item" skill increases a creature's effective drop rate by +0.1%/point, meaning
  investment in the collection loop pays back mechanically, not just cosmetically.
  Source: [Approximate Drop Rate](https://wiki.fallensword.com/index.php/Approximate_Drop_Rate);
  [Find Item](https://wiki.fallensword.com/index.php/Find_Item)
- **[UNVERIFIED]** Whether FallenSword itself has an in-client, progressive-disclosure bestiary UI (as
  opposed to the community wiki's bestiary pages) wasn't confirmed in the search results — the "Find
  Item" skill and "Approximate Drop Rate" pages describe *drop-rate mechanics*, and it's the fan wiki,
  not necessarily an in-game panel, that catalogs them. Note this distinction explicitly: **GDD §7.1's
  "Bestiary (Beast Codex)" with kill-count progressive disclosure appears to be our own design
  invention inspired by the *idea* of a bestiary**, not a confirmed FS in-client feature. Do not cite
  GDD §7 claims about FS's own bestiary UI as sourced fact.
- **Medals** (see §3) are FS's closest thing to a title/rank ladder — earned rank badges shown on a
  player's profile.
- **[UNVERIFIED]** No FS-specific "Spirit Card"-equivalent collection mechanic was found in the
  sourced material. This appears to be a **Fallen Immortal-original system**, not a FallenSword port —
  treat GDD §7.2's Spirit Cards as our own design, not FS lineage, unless a source turns up.

### Our current state
- **Beast Codex is real and shipped — but lives inside `js/ui.js`, not a standalone `bestiary.js`
  module.** Verified by direct read: `js/ui.js` lines ~820–1010 implement `codexEntry()`,
  `codexCardSlot()`, a `bossCodexEntry()` variant for calamities, and the modal open/close wiring
  (`$('btn-codex')`, `ui.js:1006-1007`). This contradicts the brief's open question ("bestiary? check")
  — **the Bestiary UI did ship**, contrary to any assumption it might be Stage-1-data-only per GDD
  §7.5's roadmap note ("Bestiary UI lands later" in Stage 1 — it landed by Stage 2/3 as promised).
  Progressive disclosure matches GDD §7.1 closely: combat stats reveal at a kill threshold
  (`CODEX_STATS_AT`), drop table at another (`CODEX_DROPS_AT`), card drop chance + "mastered" mark at
  a `CODEX_CARD_AT` threshold (100, per the mastery tooltip text at `ui.js:876`) — this is a direct,
  well-executed match to the GDD's own progressive-disclosure spec.
- Kill tracking lives on `player.bestiary: { [typeId]: { kills, firstSeenAt } }`
  (`createPlayer`, `game.js:86`; `ensureSeen`/`markSeen`/`trackKill`, `game.js:421-439`) — created on
  first encounter (inspect OR fight), matching GDD §7.1's spec exactly.
- **Spirit Cards** (`js/cards.js`): one card per creature (`CARDS` registry, `cards.js:20-47`),
  separate drop roll from loot (`rollCardDrop`, `cards.js:76-80`), duplicate-upgrade to `maxLevel: 5`
  with beyond-max converting to a `DUPLICATE_STONE_PAYOUT` (`acquireCard`, `cards.js:104-118`).
  Combat-stat cards (`STAT_BONUS_TYPES`) feed `effectiveStats` as the "third source after gear and
  techniques" per the file's header; meta cards (`qiCap`, `stones`) are consumed by the game layer.
  This is architecturally exactly what GDD §7.2/§7.3 spec'd — but per the FS-mechanics section above,
  **there is no confirmed FS-native card system this is porting**; it's an original addition dressed
  in the bestiary's clothes.
- **Titles** (`js/titles.js`): an 18-rung, read-only, derived cosmetic ladder (`TITLES`,
  `titles.js:154-281`) spanning kill counts, stage breakthroughs, technique counts, boss defeats, card/
  meridian/set completion, achievement counts, and ascension tiers — functions as our
  medals/leaderboard-badge analog, but entirely single-player-predicate-based (no rank-amongst-others
  component, since there's no population). Self-contained: own button, modal, HUD chip
  (`initTitles`/`injectChip`, `titles.js:313-375`), own localStorage keys for the display preference
  and the "seen" notification ledger (explicitly **not** save-schema fields, per the file's header
  comment) — a clean example of the "own territory" rule from CLAUDE.md.
- `js/achievements.js`: 23 milestones (`ACHIEVEMENTS`, `achievements.js:81-129`), a flat unlocked-id
  ledger on `player.achievements`, read-only predicate checks against existing state
  (`unlockedIds`/`recordAchievements`, `achievements.js:134-157`) — same shape as Titles but a
  denser/lower-level ladder; the two systems overlap somewhat (e.g. both track ascension count,
  card-collection completion) by design, as parallel "long-tail goal" surfaces per their own header
  comments.

### Gap analysis
- **Match, and a correction to the brief:** the brief flagged "verify whether a Bestiary UI actually
  shipped" — **confirmed shipped**, in `ui.js` (not a separate `bestiary.js` file as the brief's
  module list implied). This is worth flagging to the lead: PROJECT.md's module list doesn't mention a
  `bestiary.js` because there isn't one — the Beast Codex is deliberately part of `ui.js`'s "shared
  renderers" bucket (item tooltip / char sheet / gear / quest panel are named explicitly in
  PROJECT.md's description of `ui.js`; the codex fits the same "shared renderer, everyone reads it"
  category and was reasonably folded in rather than split out).
- **Divergence (Spirit Cards, Titles have thin/no FS lineage):** both are polished, well-integrated
  systems, but this research could not confirm either has a direct FallenSword ancestor. This isn't a
  gap against FS so much as a labeling correction: treat them as Fallen-Immortal-original retention
  systems inspired by the *genre* (collection-game bestiary/card conventions), not literal FS ports.
  Recommend the lead's synthesis doc note this distinction so future comparisons don't over-claim FS
  fidelity for these two systems specifically.
- **Match (drop-rate-as-retention-lever):** FS's "Find Item" skill literally buys a better drop rate
  via sustained play — our card/gear drop chances are static (not investable), which is a minor
  divergence; see opportunity below.
- **We do better/differently:** the mastery-mark-at-100-kills + card-slot-in-codex-entry UI unifies two
  collection systems (bestiary + cards) into one screen per GDD §7.2's own recommendation ("bestiary
  integration... makes the bestiary double as the card-collection UI") — this is executed faithfully
  and is arguably tighter UX than FS's separate wiki-bestiary/in-game-drop-mechanic split.

### Opportunities (ranked)
1. **[S] Correct the module-ownership record** — no code change; the lead's synthesis doc should note
   the Beast Codex lives in `ui.js`, not a standalone module, so future teammates don't waste time
   looking for (or worse, creating a duplicate) `bestiary.js`.
2. **[M] An investable "Find Item"-style lever** — a Meridian node, technique, or Alchemy pill
   (`js/meridians.js` / `js/techniques.js` / `js/alchemy.js` are all plausible owners) that nudges
   card- or drop-chance upward, giving players an active investment path into the collection loop
   the way FS's Find Item skill does. Small, additive, and slots into an *existing* passive-source
   pipeline rather than creating a new one — **coordinate with Researcher-Core**, since this touches
   whichever module ends up owning the bonus type.
3. **[S] Per-zone codex completion reward** — GDD §7.1 itself flags this as a "post-1.0 candidate"
   ("complete all Zone 1 entries → small permanent bonus"); still unbuilt. Cheap, self-contained in
   `ui.js`'s codex section + a new achievement/title entry, converts the bestiary from passive record
   into an explicit goal exactly as GDD intended.

---

## 5. Quests & Progression Gates

### FallenSword mechanics
- **Epic Quests**: explicitly harder than average quests — "some may require help from others or
  feature monsters so powerful they can only be defeated with special items" — rewarding **epic
  items** on completion, plus XP, quest items, and stamina-related upgrades (current-stamina refills,
  max-stamina increases, stamina-gain-per-hour boosts) as worked examples from specific epic quest
  chains (e.g. "Gate of the Abyss").
  Source: [Category:Epic Quests](https://wiki.fallensword.com/index.php/Category:Epic_Quests);
  [Gate of the Abyss (Epic)](https://wiki.fallensword.com/index.php/Gate_of_the_Abyss_(Epic))
- **Global Quests**: time-boxed, server-wide kill-target events with their own qualification medal and
  a top-100 medal tier (see §3 Medals citation) — a *quest* mechanic that is explicitly populated by
  and ranked against the live server, structurally different from FS's per-character epic quest
  chains.
- Standard quests scale reward size with quest difficulty/level; not all quests grant XP, but most do.
  Source: [Experience Points — Fallen Sword Wiki](https://wiki.fallensword.com/index.php/Experience_Points)
  ("Other Ways to Gain Experience" section).
- **[UNVERIFIED]** Zone-gating mechanics specifically (i.e., whether FS hard-gates access to areas
  behind a quest/level flag the way our `minStage`-gated portals do) weren't directly confirmed by a
  dedicated source in this pass — treat any specific FS zone-gating claim as unconfirmed.

### Our current state
- `js/quests.js`: a flat, ordered `QUESTS` array (`quests.js:5-78+`) spanning kill/reach/face/stage
  quest types, event-driven ("game.js reports kills, movement, combat outcomes, and breakthroughs;
  quests never reach into game state themselves" per the file's own header) — the sequential design
  matches FS's "long quest chains" (GDD §3's own framing) reasonably closely, at a much smaller scale
  (per PROJECT.md: 9+5+5-step chains across three zones, vs. FS's much larger long-running quest
  catalog).
- **Epic quest analog confirmed in PROJECT.md**: "two named-item endgame sagas (Heaven-Severing Blade
  capstone Legendary; Stormcrown saga's capstone Mythic)" — these map cleanly to FS's Epic Quest
  category (hard, rewards a named/epic-tier item). Structurally close to FS's Gate-of-the-Abyss-style
  epic chains, modulo scale.
- **Zone gating**: `js/zones/registry.js` composes zones from independent modules
  (`ZONE_MODULES = [azuremist, cindervein, thunderpeak]`); per PROJECT.md, Cindervein Gorge is a
  "stage-gated portal from Azuremist" and Stormcrown Peak is gated at `minStage 19` from Cindervein —
  a level/stage gate on zone transitions, the same *shape* of gate `boss.js`'s `minStage` uses for
  boss eligibility (`bossEligible`, `boss.js:166-168`). This is a clean, consistent gating pattern
  across zones and bosses, even though the FS-side zone-gating claim above is unconfirmed.
- **No Global Quest analog** — and this is architecturally sound to skip: Global Quests are inherently
  a server-wide, ranked, live-population mechanic; our `js/bounties.js` (see §3) is the correct
  single-player substitute for the "kill-target quest" *shape* of a Global Quest, just without the
  ranking/medal-tier layer that depends on a population.
- `js/ascension.js` implements **New Game+** (`performAscension`, `ascension.js:37-59`): wipes level/
  XP/stats/gear/techniques/meridians/loadouts, keeps collections (cards, bestiary, Sect, rivals, spar
  record, achievements, boss/trial/bounty progress), and grants a permanent stacking
  `+8%`-per-tier all-stats scalar as "the final scalar in `effectiveStats`" per the file's header — no
  FS-sourced "prestige/reincarnation" mechanic was confirmed in this pass (the search surfaced only a
  forum thread mentioning a "reincarnate... reset to level 1 with benefits" option, explicitly
  **[UNVERIFIED]**, not wiki-confirmed). Treat Ascension as likely an original addition inspired by the
  genre convention of NG+, not a confirmed FS port — **flag this for the Critic**, since GDD/PROJECT.md
  don't cite FS lineage for Ascension either, so this may already be understood internally as
  original.

### Gap analysis
- **Match:** the epic-quest-chain-rewards-named-item pattern (Heaven-Severing Blade, Stormcrown Mythic
  saga) is a faithful structural match to FS's Epic Quest category, at a scale appropriate for a
  three-zone offline game vs. FS's much larger live catalog.
- **Divergence (no Global Quests) — correct scope cut:** requires a live population to rank against;
  `bounties.js` already covers the individual-kill-target *shape* of the mechanic. No action needed.
  beyond what's already flagged for bounties in §3.
- **Unconfirmed lineage flag:** Ascension/NG+ has no sourced FS ancestor found in this pass — worth the
  lead/Critic explicitly deciding whether "NG+ prestige" belongs in a "FallenSword-inspired" pitch, or
  whether it should be framed purely as a Fallen-Immortal design choice (both are legitimate; it's a
  framing/marketing question, not a build question).
- **We do better/differently:** the `minStage`-gate consistency between zone portals and boss
  eligibility is a clean, DRY-feeling design choice; nothing in the FS sourcing suggests their zone
  gating is architecturally this uniform (though this is a comparison FS's own documentation didn't
  confirm either way).

### Opportunities (ranked)
1. **[S] No urgent gaps here** — quests/progression gating is one of the stronger-matched systems in
   this audit. The one open item is documentation/framing, not code:
2. **[S] Resolve the Ascension-lineage question** — have the lead/Critic decide (and note in
   `40-next-steps.md`) whether Ascension is marketed as "FS-inspired" or "original," since this
   research pass couldn't confirm FS has an equivalent prestige mechanic. Zero code impact either way.
3. **[M] A light Global-Quest-flavored event** — a rotating, calendar-scheduled (`js/events.js` already
   has the wall-clock rotation machinery — see §6) "hunt challenge" bounty variant with a bigger,
   rarer reward, framed as a special one-off rather than routing through the existing Bounty Board.
   Low priority: `bounties.js` + `events.js` already cover most of the underlying need.

---

## 6. Profile / Fake-Multiplayer Social Layer

### FallenSword mechanics
- **Allies and Enemies**, shown at the bottom-left of the profile page. **Allies require mutual
  acceptance** (the other player must accept your request) — an alliance is not automatically
  reciprocal (you can have someone as an ally without them reciprocating, if they haven't removed you,
  but *adding* one requires their acceptance). **Enemies have no such restriction** — add anyone,
  unconsentingly; many players use the enemy list as an informal extended-ally list or a directory of
  useful service-providers (buff/potion sellers). Both lists start at a cap of **5 each**, raisable via
  a character upgrade.
  Source: [Newbie tutorial](https://wiki.fallensword.com/index.php/Newbie_tutorial) (profile-page
  section); general profile-mechanics summary corroborated across multiple wiki category pages.
- GDD §6.5 itself already documents the source mechanic accurately: "an allies and enemies list
  (asymmetric — you can add someone as an ally or enemy without their consent or reciprocation)" —
  **this GDD claim is only half-right per the sourced material**: enemies are unconsented/asymmetric,
  but allies specifically require the other party's acceptance per the wiki tutorial snippet. Flag
  this as a GDD inaccuracy worth correcting, not a code gap.
- Profile also surfaces **currently active buffs and remaining time**, and a **recently-online-at-
  your-level** list (social + PvP-scouting utility) — both directly cited already in GDD §6.5 and
  consistent with what this research turned up.

### Our current state
- `js/profile.js` implements `createProfileProvider(state)`: `summary()`, `buffs()`, `rivals()`,
  `rivalCandidates()`, `isRival()`, `addRival(id)`, `removeRival(id)`, `recentlyActive()`.
- **Rivals, not allies+enemies**: our implementation collapses FS's two-list (ally/enemy) asymmetric
  system into **one list** (`player.rivals`, `rivalIds`/`isRival`/`addRival`/`removeRival`,
  `profile.js:33-57`) — no ally/enemy distinction, and **no consent asymmetry at all**: `addRival` is
  unconditionally unconsented (matches FS's *enemy*-list behavior, not its ally-list behavior, since
  our NPC personas can't "accept" anything anyway — there's no one to ask). This is a reasonable
  simplification given the personas are NPCs, but it means we've implicitly modeled FS's *enemies*
  behavior and dropped the *allies* consent-gate distinction entirely, rather than choosing between
  them deliberately.
- **Active buffs**: `allBuffViews()` (`profile.js:101-103`) unifies **three** sources — technique buffs
  with countdown (`techniqueBuffViews`, remaining `expiresAt - now`), always-on Spirit Card bonuses
  (`cardBuffViews`), and always-on Sect buffs (`sectBuffViews`) — a direct, faithful match to GDD
  §6.5's "currently active buffs and their remaining time" spec, arguably more complete than a literal
  FS port would need to be (we have three passive-buff *sources* to unify; FS's profile just shows
  active skill-buffs).
- **Recently Active feed**: `recentlyActive()` (`profile.js:140-161`) — a deterministic, time-bucketed
  (`FEED_BUCKET_MS = 3 min`) slice of the shared `PERSONAS` roster, weighted toward the player's own
  level (`w = rng() + 2/(1+Math.abs(p.level-lvl))`, `profile.js:145`), with per-persona flavor activity
  lines (`ACTIONS`, `profile.js:117-126`) and a synthesized "minutes ago" — directly implements GDD
  §6.5's "recently-online players at your level" spec, entirely as fake-multiplayer texture (no PvP-
  scouting utility yet, since there's no PvP mode to scout for).
- Persona roster (`js/personas.js`) is the single shared cast reused across Market sellers/buyers, Sect
  recruits, and this Rivals/Recently-Active feed — exactly the "build once, consume everywhere"
  pattern GDD §6.8 calls for (`Persona schema` data-model note), and a genuinely well-executed piece of
  cross-system consistency.
- `js/duel.js`'s Spar feature is wired to Rivals specifically (`onSpar` injected callback,
  `profile.js:219-220`, consumed by `duel.js`'s `openDuel`) — Rivals aren't just a social list, they're
  the PvP-preview hook's target list, which has no direct FS analog (FS's ally/enemy lists are purely
  social/informational + a directory convenience, not a spar-target list, since real PvP exists
  separately).

### Gap analysis
- **Match:** buffs-with-remaining-time and a recently-active-at-your-level feed are both faithful,
  well-cited implementations of GDD §6.5's spec.
- **Divergence (collapsed ally/enemy asymmetry) — a GDD-vs-source correction, not a code bug:** GDD
  §6.5 describes FS's ally/enemy system as symmetric-in-its-asymmetry ("add either without consent");
  the sourced wiki tutorial says **allies specifically need acceptance**, only enemies are unconsented.
  Our single unconsented Rivals list matches the *enemies* half of FS's design, not the *allies* half.
  Given our personas are NPCs (no one to "accept" a request), full ally-consent-gating isn't
  meaningfully portable anyway — but the GDD's characterization of FS itself should be corrected in
  any future GDD revision, independent of what we build.
- **We do better/differently:** unifying three buff *sources* into one profile view, and reusing one
  persona cast across three otherwise-separate systems (market/sect/profile), are both tighter
  integrations than a literal single-feature port would have produced — this is Fallen Immortal's
  strongest showing in this research pass.

### Opportunities (ranked)
1. **[S] No urgent gap** — this is the most faithfully-and-cleanly executed section of the six audited
   here. The one item worth doing:
2. **[S] Split Rivals into "Favored"/"Marked" (ally/enemy-flavored) sub-lists**, purely cosmetic —
   e.g. a Rival can be tagged as an ally-flavored "Favored Cultivator" (maybe grants a small spar-
   record display quirk) vs. an enemy-flavored "Marked Rival" (maybe a flavor-text framing difference
   in the Recently Active feed's rival-mark). This is a thin, self-contained `profile.js`-only change
   that would make GDD §6.5's "allies and enemies" wording literally true without adding any new
   provider surface or persistence shape (a `kind: 'favored'|'marked'` field on the existing rival
   entry). Low priority — purely a flavor/fidelity nice-to-have, not a functional gap.
3. **[M, provider-safe] "Recently Active" feed as future PvP scouting surface** — GDD §6.5 explicitly
   calls out FS's version as serving double duty (social texture + PvP scouting). If/when a 2.0
   network PvP mode exists, `recentlyActive()`'s existing shape (persona + level + activity) is
   already close to what a scouting list needs; flag this as a reason to keep `recentlyActive()`'s
   output shape stable rather than reshaping it casually in the meantime — future callers (a real PvP
   scouting UI) will want the same fields.

---

## Constraint-violation check (per the brief's requirement)

None of the opportunities above route a multiplayer-shaped concept outside its provider interface.
Specific checks:
- Opportunity 2.1 (Sect combat-stat buff) stays inside `guild.js`'s existing `GuildProvider.buffs()`
  shape, consumed the same way XP/stone buffs already are — no new provider needed.
- Opportunity 3.2 (gear-normalized Arena spar variant) computes a bracket-capped stat sheet *inside*
  `duel.js` as an alternate caller of the still-pure `resolveCombat()` — `combat.js` itself is
  untouched, matching the hard constraint that it never gains game-state awareness. Flagged explicitly
  in §3 that if this becomes real PvP later, the bracket-cap logic should be pulled behind a provider
  interface rather than staying hardcoded in `duel.js`.
- Opportunity 6.3 explicitly recommends *not* reshaping `recentlyActive()`'s output now, specifically
  to protect a future provider-backed PvP-scouting caller from a breaking shape change later.
- No opportunity proposes guild-vs-guild, real bidding, or any other feature that would require a
  second live participant to function — the two places FS depends on genuine multiplayer (GvG/relics,
  Global Quest leaderboards) are explicitly called out as **not recommended to fake**, consistent with
  the "providers behind interfaces, build for 2.0" constraint rather than trying to simulate an
  adversarial population single-player.
