# Cluster A — Direct Browser Stat-Math MMORPG Neighbors

**Owner:** Researcher-Neighbors. Scope per `00-brief.md`: FallenSword's actual genre cousins — browser
stat-math RPGs that gate play on an energy/stamina resource, resolve combat via visible-ish
attack/defense math, and layer gear tiers, PvP, and a player-facing (or fake) economy on top. This
doc is **descriptive**, not prescriptive — "the game does X" is a sourced fact, "we could adapt X" is
my own relevance judgment, kept clearly separate. Phase 3 is where changes get proposed, not here.

**Fact-quality note:** most of these games are small-studio or single-developer, some are 15-20+
years old, several are still-live-but-niche. I searched (WebSearch) and cite the best available
source per claim — usually an official wiki, the game's own site, or a fan wiki that's been the de
facto documentation for the game for years (these communities often don't have "official" docs beyond
a wiki). Anything I couldn't pin to a source is tagged **[UNVERIFIED]**.

---

## Cluster overview

All seven games below share FallenSword's core shape: a resource that gates how much you can *do*
per session (energy/stamina/turns), a stat-vs-stat combat resolution (sometimes exposed as a
documented formula, sometimes reverse-engineered by the playerbase), gear/item tiers, and *some* kind
of player economy or social layer. Where they diverge from us is instructive:

- **Torn** and **Kingdom of Loathing** are still-live, large, real-money-monetized MMOs where the
  energy resource is explicitly a monetization lever (buy more turns/energy with real money) — a
  pressure Fallen Immortal doesn't have and shouldn't invent, but worth understanding as the "why"
  behind genre-standard stamina caps.
  Improbable Island** are much smaller/scrappier and closer to our own solo-with-NPC-flavor shape —
  Sryth in particular is *mostly* single-player, which is unusually close to our own architecture.
- **Kingdom of Loathing** is the single most load-bearing find in this doc: it is the origin of the
  term **"Ascension"** as a New-Game-Plus prestige mechanic — the exact same word Fallen Immortal
  uses for its own prestige system (`js/ascension.js`). Sprint-1's `40-next-steps.md` flagged our
  Ascension as having "no sourced FS ancestor" — it may have a *different* genre ancestor instead. See
  KoL section below.
- A genuinely important out-of-cluster finding surfaced while researching Eldevin (Hunted Cow's own
  MMO, listed as an anchor): **FallenSword itself has an announced sequel, "Fallen Sword II," slated
  for 2026** — see the callout at the end of this doc. This isn't a "neighbor" (it's literally the
  source lineage), but given today's date it's timely enough that the lead should know regardless of
  cluster boundaries.

**Anchor list changes from the brief:** all nine suggested anchors were checked. **Duels.com** no
longer exists as the browser stat-math MMORPG the brief implied — the modern "Duels" is a mobile
auto-battler (see its section below) — so I swapped in **EpicDuel** (Artix Entertainment's actual
browser PvP stat-math MMORPG) as a better-fitting replacement, and dropped **AdventureQuest/BattleOn**
to a short note rather than a full section, since it's a Flash-era single-player turn-based RPG with
much thinner stat-math/economy/PvP surface than the other seven — a weaker match to "the same
problems we do" than the other anchors. Final roster: **Eldevin, Torn, Sryth, Kingdom of Loathing,
Gladiatus, Improbable Island, Outwar** get full sections; **EpicDuel** and **AdventureQuest** get a
shorter combined note.

---

## 1. Eldevin

**What it is:** Hunted Cow Studios' *own* fantasy MMORPG (the same studio that makes FallenSword),
free-to-play, browser + Steam client, real-time 3D combat, launched after ~8 years in development.
Still live. [Eldevin — Hunted Cow Games](https://huntedcow.com/games/eldevin);
[Eldevin on Steam](https://store.steampowered.com/app/298160/Eldevin/);
[GamesBeat coverage](https://gamesbeat.com/after-eight-years-of-work-hunted-cow-unveils-its-eldevin-massively-multiplayer-online-fantasy-game-eldevin/)

**Mechanics that matter to us:**
- **Combat is real-time with cooldowns, not turn/energy-gated.** Abilities have cooldowns modified by
  a "Haste" stat (50% haste halves cooldown); mana regenerates at only 20% of its normal rate *during*
  combat, creating in-fight resource pressure instead of a pre-fight stamina toll.
  [Talents — Eldevin Wiki](https://eldevin.fandom.com/wiki/Talents)
- **Loot rarity is a 5-tier color ladder**: grey (mundane) → white (common) → green (fine) → blue
  (rare) → gold (heroic), with gem-fusion mechanics gated to specific tiers.
  [Category:Abilities / item pages — Eldevin Wiki](https://eldevin.fandom.com/wiki/Category:Abilities)
- **No auction house, by deliberate choice**, even years post-launch — players trade via a market
  forum and world chat instead; the studio has stated an AH "isn't on their current priority list."
  [Steam Community discussion](https://steamcommunity.com/app/298160/discussions/0/620696522140449676/)
- **Monetization is classic F2P**: a cosmetics/convenience item-shop (vanity overrides, emotes,
  inventory-bag expansions, cooldown resets), most non-cosmetic items *also* purchasable with in-game
  gold or loyalty points — i.e. real money buys *convenience*, not exclusive power.
  [Eldevin Market — Eldevin Wiki](https://eldevin.fandom.com/wiki/Eldevin_Market)
- 14 gatherable/craftable professions, class-less ability-based build system (100+ learnable
  abilities), level cap 49.

**What it does that FallenSword (and we) don't:**
- **It's the same studio's answer to "what comes after a turn/stamina-gated browser MMO."** They kept
  gear tiers, professions, and PvP arenas, but **dropped stamina-gating for combat entirely** in favor
  of real-time cooldown pacing, and **dropped the auction house** in favor of informal trading. That's
  a meaningful signal about which FS-genre conventions a studio with FS's own institutional experience
  chose *not* to carry forward.
- Explicit "power isn't for sale" monetization stance (paid = convenience/cosmetic only, not gear).

**Relevance tags:**
- **[LOW/SKIP]** Dropping stamina/Qi-gating entirely — directly violates our "sessions, not marathons"
  pillar; Eldevin can afford this because it's a persistent live MMO with social pull keeping people
  in-session, we're offline-first and Qi *is* the session-length lever.
- **[MED]** In-combat resource pressure (mana regen throttled *during* the fight, not just gating
  entry) is an interesting alternate lever we don't have — our Qi is spent per-turn already
  (`combat.js`/`game.js:attack`), so this is arguably already covered, just worth naming as a pattern.
- **[LOW]** No-auction-house-by-design doesn't apply to us — our Treasure Pavilion is fake-multiplayer
  NPC-driven specifically because there's no live population; Eldevin's choice is about a *real*
  population preferring informal trade, a different problem than ours.
- **[HIGH]** "paid buys convenience/cosmetic, never power" as a monetization *stance* — directly
  compatible with PROJECT.md's "no monetization surface in 1.0" but worth keeping in mind if that ever
  changes: Eldevin is a live proof-point that this model sustains an MMO for over a decade.

---

## 2. Torn

**What it is:** A still-very-live (since 2004), browser-based crime/RPG hybrid MMO — less "dungeon
crawler," more "text-based GTA": players commit crimes, train stats, join factions, and attack each
other. [wiki.torn.com](https://wiki.torn.com/wiki/FAQ)

**Mechanics that matter to us:**
- **Energy**: regenerates 5 per 15 minutes, cap 100 (150 with paid "Donator" status) — spent on gym
  training and PvP attacks. [Energy — Torn Wiki](https://wiki.torn.com/wiki/Energy)
- **Nerve** (a *second*, separate resource): regenerates 1 per 5 minutes, gates "Crimes" (a
  risk/reward minigame separate from combat); max nerve grows with crime experience, i.e. **investment
  in one system raises that same system's own resource cap** — a self-reinforcing loop.
  [Nerve — Torn Wiki](https://wiki.torn.com/wiki/Nerve)
- **Happy** (a third resource) is spent by training and *constrains training efficiency* — each
  battle-stat train burns 40-60% of the energy spent as "happy," meaning training too hard, too fast,
  degrades your own training efficiency until happy recovers. [Happy — Torn Wiki](https://wiki.torn.com/wiki/Happy)
- **PvP outcome tiers, not binary win/lose**: "Leave" (least hospital time, most XP for attacker),
  "Mug" (steals 5-15% of the target's cash-on-hand, mid hospital time), "Hospitalize" (longest hospital
  time, 3-3.5 hours base). [Attacking — Torn Wiki](https://wiki.torn.com/wiki/Attack)
- **"Fair Fight" bonus**: a reward multiplier (up to ×3) that scales with how *close* your stats are to
  your target's, explicitly rewarding fighting near-equals rather than stomping much-weaker targets —
  the PvP-specific analogue of our own PvE level-gap XP scaling.
  [Battle Stats — Torn Wiki](https://wiki.torn.com/wiki/Battle_Stat)
- **Monetization is a real-money points economy**: $5 buys a "Donator Pack" (60 points, raises energy
  cap to 150); a subscription grants 90 points/month. Points buy an instant once-daily energy refill
  (~25 points), and consumable items (Xanax: +250 energy, risk of "overdose" from overuse) also refill
  energy. [Points — Torn Wiki](https://wiki.torn.com/wiki/Points); search-sourced Xanax/Donator figures.
- **Education system**: real-time-gated "courses" (some take real days) that permanently unlock
  passive bonuses (e.g. +10% throat damage from a specific course) — a slow, wall-clock-gated
  permanent-upgrade track parallel to, but separate from, stat training.

**What it does that FallenSword (and we) don't:**
- **Three parallel gating resources** (Energy/Nerve/Happy) instead of one, each with a different
  regen rate and a different gameplay domain (combat-training / crime-minigame / training-efficiency
  brake) — a much more layered "session budget" than our single Qi pool.
- **A monetized "overdose" risk on a consumable energy refill** (Xanax) — a real-money-adjacent item
  that's also a soft risk/reward gamble, not just a flat refill.
- **PvP reward explicitly shaped by how fair the fight was**, not just win/lose.

**Relevance tags:**
- **[LOW/SKIP]** Multiple parallel session-gating resources — adds real complexity for a debatable
  payoff; our single-Qi model is a deliberate simplicity choice (PROJECT.md pillar: "numbers you can
  read") and three resources with three regen rates would work against that.
- **[LOW/SKIP]** Real-money points/energy-refill economy — no monetization surface exists or is
  planned for 1.0; explicitly out of scope per PROJECT.md.
- **[MED]** "Happy"-style training-efficiency brake (spend a resource too fast, temporarily degrade
  your own returns) is a genuinely interesting anti-grind-burst lever we don't have anywhere in
  `progression.js`/`game.js` — but it's added complexity for a game whose Qi-regen is *already*
  flagged as too fast (see Sprint-1's A1 finding); tackling the root Qi-rate issue first is likely
  higher leverage than bolting on a second braking mechanism.
- **[HIGH]** A Fair-Fight-style "closer stats = better reward" multiplier is directly relevant **if**
  a future sparring/PvP mode (our `duel.js`/`rivals.js` hook) ever goes live-networked — it would
  discourage stat-stomping a much-weaker rival for reward farming, a real risk once real players
  exist. Provider-safe: it's a reward-scaling function, not a `combat.js` change.
- **[LOW]** Education-style wall-clock permanent-unlock track — interesting but redundant with what
  Meridians/Techniques/Ascension already cover; would need a strong standalone reason to add a fourth
  slow-unlock system.

---

## 3. Sryth

**What it is:** A long-running (2000s-era), primarily **single-player** text/browser "game book" RPG
with light multiplayer elements — closer to an interactive gamebook than an MMO. Still maintained by
its solo developer, Matthew H. Yarrows.
[sryth.com](http://www.sryth.com/ci.php?f_c=docs.inc); [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/Sryth)

**Mechanics that matter to us:**
- **Stamina Points (SP)** double as both a session-gating resource *and* an HP-like health pool: they
  drop from fighting **and** from narrative "bad events" outside combat (an arrow strike, a falling
  rock), and hitting zero SP kills the character outright. Gear (armor, weapons) can raise max SP.
  [Stamina Points — Sryth Wiki](https://sryth.fandom.com/wiki/Stamina_Points)
- **Turn-based combat**, 18 skills + 11 magical disciplines to develop.
- **Adventurer Tokens (AT)**, the premium/rare currency, are earned through gameplay events (e.g. a
  recurring "Proving Grounds" activity) *and* real-money donations, spendable on powerful items and
  feature unlocks (a "quickstone," a player "residence"). This is a real-money-adjacent lane, but
  notably **earnable through play, not gated behind a paywall** — donations top up the same currency
  players can also grind for.
  [Adventurer Tokens — Sryth Wiki](https://sryth.fandom.com/wiki/Adventurer_Tokens)
- Organizations exist (Adventurers' Guild, the Grey Circle) as questline/faction gates rather than
  live social guilds — consistent with the game being mostly single-player.

**What it does that FallenSword (and we) don't:**
- **Collapsing "stamina" and "HP" into one resource** that both session-gates *and* kills you — a
  tighter, higher-stakes design than our clean Qi/HP split (Qi gates play, HP is separately at risk
  only *during* a fight). Sryth's model means non-combat narrative events also threaten your life
  total, which raises overall tension per unit of content.
- **A single premium-adjacent currency that's dual-sourced** (grindable AND buyable) rather than
  strictly cash-only — softer monetization shape than most of this cluster.
- Is architecturally the *closest* comparator to our own game in this cluster: primarily single-player,
  narrative-quest-driven, without a live economy or real guilds to fake.

**Relevance tags:**
- **[LOW/SKIP]** Merging stamina and HP into one pool — conflicts with our clean separation (Qi gates
  play, HP is the in-fight stake); merging them would make every non-combat action carry lethal risk,
  a tone shift PROJECT.md doesn't call for.
- **[MED]** Dual-sourced (grindable + optionally-buyable) premium currency shape is worth remembering
  *if* Fallen Immortal ever adds any monetization surface post-1.0 — softer than a pure cash-wall, and
  precedented in a genre-adjacent solo-friendly game. Not actionable now (no monetization surface
  exists), flagging for awareness only.
- **[LOW]** Sryth's overall "mostly single-player, narrative gamebook" shape is closest to what we
  already are — more a confirmation that our architecture is a valid point in the genre's design
  space than a source of a specific transferable mechanic.

---

## 4. Kingdom of Loathing (KoL)

**What it is:** A long-running (since 2003), free-to-play, satirical/comedic browser turn-based RPG,
famous for spawning an entire sub-genre of ASCII/stick-figure-art comedic RPGs. Still live, run by
Asymmetric Publications. [Wikipedia](https://en.wikipedia.org/wiki/Kingdom_of_Loathing);
[A KoL Wiki](https://wiki.kingdomofloathing.com/Adventures)

**Mechanics that matter to us:**
- **"Adventures"** are the session-gating resource: a base of 40/day, regenerating daily (not
  continuously by the clock the way our Qi does), extendable by consuming in-game food/booze items —
  i.e. KoL's "stamina" is a **daily allowance topped up by consumables**, not a wall-clock regen meter.
  [Adventures — A KoL Wiki](https://wiki.kingdomofloathing.com/Adventures)
- **Three player stats** (Muscle/Mysticality/Moxie) each double as a class's primary combat stat *and*
  a secondary resource pool (HP from Muscle, MP from Mysticality) — stat allocation and resource pools
  are the same lever, more tightly coupled than our five-stat/HP split.
  [Wikipedia](https://en.wikipedia.org/wiki/Kingdom_of_Loathing)
- **A fully-documented, community-spaded hit-chance formula**: monster "Awesomeness" = Attack minus
  Moxie; a ~6% flat crit/miss chance; otherwise two 10-sided dice rolled and compared, with hard
  thresholds (Moxie 10+ above monster level = always dodge, Moxie -9 or below = always hit) — i.e.
  despite KoL's absurdist comedic skin, the actual combat math is exactly the kind of transparent,
  reverse-engineerable stat arithmetic our "numbers you can read" pillar wants; it's just not
  officially published by the devs, it's community-spaded from observed play.
  [Talk:Hit Chance — A KoL Wiki](https://wiki.kingdomofloathing.com/Talk:Hit_Chance)
- **The Mall of Loathing**: a real player-run auction/store economy (once a player hits level 9),
  described by outside game-culture scholarship as "vibrant." [Wikipedia](https://en.wikipedia.org/wiki/Kingdom_of_Loathing)
- **"Ascension"** — genuinely load-bearing for us. KoL's Ascension is exactly a New-Game-Plus prestige
  loop: level resets to 1, a **new class/sex/birthsign** can be chosen, currency and *items* are kept
  (unlike our full-wipe-except-collections model), zones can unlock progressively across ascensions,
  and completing one grants **Karma**, a prestige currency spendable in a hub area ("Valhalla") to
  permanently "perm" (permanently unlock across all future ascensions) any skill the player has learned
  — i.e. **a currency that buys permanent cross-run unlocks**, directly analogous in shape to what our
  `+8%/tier` Ascension scalar does more simply. KoL also lets players **opt into harder self-imposed
  ascension restrictions** (e.g. "no eating or drinking") **in exchange for more Karma** — a
  risk/reward difficulty dial on the prestige run itself that we don't have.
  [Ascension — A KoL Wiki](https://wiki.kingdomofloathing.com/Ascension);
  [official Ascension page](https://www.kingdomofloathing.com/static.php?id=ascension)

**What it does that FallenSword (and we) don't:**
- **A daily-allowance-plus-consumable-extension** stamina model, distinct from both FS's wall-clock
  regen and our own — worth naming as a third pacing archetype (continuous regen vs. daily reset vs.
  hybrid).
- **Ascension predates and is mechanically deeper than ours**: a currency (Karma) that buys *permanent,
  cross-run* unlocks, difficulty-for-reward opt-in restrictions, and a *choice* of new build (class)
  each run, vs. our single flat stacking scalar with no meaningful in-run choice.
- Community-verified, not developer-published, transparent combat math — proof that "documented enough
  to reverse-engineer precisely" satisfies a "numbers you can read" pillar even without an official
  publish.

**Relevance tags:**
- **[HIGH]** Karma-style "spend prestige currency on permanent cross-run unlocks" — directly
  applicable to deepen `js/ascension.js` beyond a flat `+8%×tier` scalar: e.g. an ascension-currency
  spend that permanently unlocks a technique, meridian node, or a small stat bump *without* needing to
  re-earn it every run. This is squarely a `progression.js`/`ascension.js` single-owner-file change,
  needs `tools/balance.mjs` coverage since it changes long-run power growth, but fits our existing
  "keeps collections across ascension" precedent structurally.
- **[MED]** Opt-in harder-ascension-for-more-reward (self-imposed restrictions) — an interesting
  difficulty/reward dial bolt-on to Ascension; lower priority than the Karma idea since it's more
  complex to implement (needs restriction-tracking + verification) for a smaller expected payoff.
- **[MED]** Daily-allowance-plus-consumable stamina model — worth naming as an alternative to our
  continuous wall-clock Qi regen, but a full swap would be a much bigger pacing change than the
  Sprint-1-flagged Qi-rate retune (A1); more useful as a mental model check than a concrete build.
- **[LOW]** Community-spaded (not officially published) transparent combat math as a "genre precedent"
  — reassuring context, not something to build, since our `combat.js` is already fully open (it's our
  own code).

---

## 5. Gladiatus

**What it is:** A very long-running (since 2003, Gameforge-published), turn-based gladiator-combat
browser RPG set in ancient Rome — one of the older browser MMO franchises still operating.
[Gameforge](https://gameforge.com/en-GB/games/gladiatus.html)

**Mechanics that matter to us:**
- **Combat is round-capped, not stamina-metered per swing**: Expeditions run to death or 20 rounds,
  Arena PvP to death or 15 rounds, Dungeons have no round limit — directly comparable to our own
  `MAX_TURNS = 20` draw-cap design (see Sprint-1's `10-core-mechanics.md` §1), though Gladiatus varies
  the cap **by mode** rather than using one constant everywhere.
  [Gladiatus Formulas — fansite](https://gladiatus.gamerz-bg.com/formulas)
- **Item power tiers by color**: white (standard) → green → blue → violet → orange, a 5-tier ladder
  distinct from FS's own tier names — another genre data point that "colored rarity ladder" is a
  near-universal convention, with each studio picking its own tier count/names.
  [Items — Gladiatus Wiki](https://gladiatus.fandom.com/wiki/Items)
- **Guilds are free to found** (level 5 minimum), fund up to 11 different guild-building types from a
  member-donated guild treasury — structurally close to what FS's guild structures do (per Sprint-1's
  `20-meta-systems.md` §2), reinforcing that "guild bank funds guild buildings" is a standard genre
  pattern, not an FS-specific one.
  [Guild — Gladiatus Wiki](https://gladiatus.fandom.com/wiki/Guild)
- **Health regenerates by waiting or via a "Guild Medic"** (a social/guild-provided heal), rather than
  a separate stamina pool — Gladiatus's HP *is* its pacing resource, closer to Sryth's merged model
  than to our Qi/HP split.
- **Rubies**, the premium currency, are the monetization backbone — theoretically earnable at very low
  rates via drops/logins/events, but "meaningful progression requires purchase" per third-party
  coverage — used for cooldown reduction, gear enhancement, and a subscription tier ("Centurion").
  [playgladiatus.com coverage](https://playgladiatus.com/the-yakut-curse-how-ruby-bugs-and-exploits-shaped-gladiatus-history/)

**What it does that FallenSword (and we) don't:**
- **Mode-specific turn/round caps** (20 for Expeditions, 15 for Arena, unlimited for Dungeons) rather
  than one constant everywhere — a more granular pacing lever than our single `MAX_TURNS`.
- **HP-as-the-only-pacing-resource**, healed by waiting or by a social guild feature, instead of a
  separate energy pool — another data point (with Sryth) that "one merged resource" is a viable genre
  alternative to FS/ours' clean stamina/HP split.

**Relevance tags:**
- **[HIGH]** Sprint-1's B1 opportunity (a 40/60-Qi "push-through" attack tier) is exactly what
  Gladiatus already validates at the genre level via its per-mode round caps — this cluster survey
  independently confirms that idea is a well-trodden, not speculative, pattern (Gladiatus varies caps
  by *mode*, FS varies by *chosen stamina commitment*; either shape supports B1).
- **[MED]** Guild-funded structures (11 building types from a member-donated treasury) is close to
  what FS's own guild structures do (per Sprint-1's Meta doc) — mostly a confirmation that "guild bank
  funds guild buildings" is a standard genre pattern rather than an FS-specific one; not a new idea for
  our Sect since `guild.js` already covers the "buff category" shape without a live guild to fund it.
- **[LOW/SKIP]** Real-money-gated "meaningful progression requires purchase" model — explicitly
  contrary to PROJECT.md's no-monetization-surface pillar; not recommended even as a future direction
  without a much larger scoping conversation than this research phase covers.
- **[LOW]** Merged HP-as-pacing-resource — same reasoning as Sryth: conflicts with our deliberate
  Qi/HP split, not recommended.

---

## 6. Improbable Island

**What it is:** A free, browser-based, text-heavy multiplayer RPG built on the "Legend of the Green
Dragon" codebase, set in a comedic "20 minutes into the future" pop-culture-referencing zombie-island
setting. Still live, community-run. [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/ImprobableIsland);
[jayisgames review](https://jayisgames.com/review/improbable-island.php)

**Mechanics that matter to us:**
- **Stamina resets on a "New Game Day," which ticks every 4 real-world hours** (not a continuous
  wall-clock trickle) — a third distinct pacing archetype alongside FS/ours' continuous regen and
  KoL's once-daily reset: a **fixed, sub-daily tick** that resets a full pool rather than accruing it
  gradually. [wiki.improbableisland.com](https://wiki.improbableisland.com/doku.php?id=gameplay:guides:newbie)
- **Death penalty**: lose 10% of current XP and **all cash currently on hand** (not banked cash), then
  get sent to a "Failboat" holding area to earn your way back — notably, a **bank** exists specifically
  so death-penalty cash-loss has a safe harbor: "keep all your money... before venturing outside an
  Outpost. If you die, you lose all your money in hand but your money in the bank is safe."
  [jayisgames review](https://jayisgames.com/review/improbable-island.php);
  [Newbie guide — Improbable Island Wiki](https://wiki.improbableisland.com/doku.php?id=gameplay:guides:newbie)
- **Prestige ("Drive Kill")**: at level 15+ the player can kill "the Improbability Drive," resetting to
  level 1 with new unlocked race options — but **this is a harsher prestige than KoL's or ours**: gear
  is destroyed with no refund, and both hand *and banked* requisition tokens are wiped. This is the
  most punishing NG+ model in the cluster — a full asset wipe, not a "keep collections" model.
  [Drive Kill — Improbable Island Wiki](https://improbableisland.fandom.com/wiki/Drive_Kill)
- Core loop is explicitly stated by the community itself as: "kill stuff to get experience and money...
  trading experience for levels and money for equipment... going back out to kill bigger stuff" — a
  clean one-sentence description that is *also* an accurate one-sentence description of our own loop.

**What it does that FallenSword (and we) don't:**
- **A "bank vs. cash-on-hand" split specifically as a death-penalty safety valve** — players can
  proactively protect their currency from a death penalty by depositing it, turning the penalty into a
  *player-manageable risk* rather than a flat, unavoidable tax. We currently apply `DEATH_STONE_LOSS`
  (5% of *current* spirit stones) unconditionally with no player lever to reduce exposure.
- **A much harsher, opt-in prestige reset** (full gear+currency wipe, not just level/stats) as an
  extreme alternative to a gentler NG+ — useful as a *contrast* point for how gentle our own Ascension
  already is.
- **Fixed sub-daily tick resets** as a third pacing archetype distinct from continuous wall-clock regen.

**Relevance tags:**
- **[HIGH]** A bank vs. on-hand-currency split as a death-penalty mitigation lever — directly
  compatible with our "never send someone back a full level" gentle-death-penalty design intent (per
  Sprint-1 `10-core-mechanics.md` §1.2): it gives players *agency* over their own death-penalty
  exposure without changing the penalty's harshness, by letting them choose to bank spirit stones.
  Touches `js/game.js` (spirit-stone storage split) — additive to the save schema, no VERSION bump.
- **[LOW/SKIP]** Full-wipe prestige (gear + currency destroyed) — directly contrary to our Ascension's
  explicit "keeps collections" design, which Sprint-1 confirms is a deliberate, already-good choice;
  not recommended to harshen.
- **[LOW]** Fixed 4-hour tick reset for stamina — an interesting alternative pacing archetype, but a
  full swap away from continuous wall-clock Qi regen is a much bigger, riskier pacing change than the
  Sprint-1-flagged Qi-rate retune; more useful as a "here's a third model that exists" data point than
  an actionable build.

---

## 7. Outwar

**What it is:** A very long-running (20+ years), free browser-based text/2D MMORPG from Rampid
Interactive; players choose a starting archetype (monster/gangster/popstar) and build power through
hunting, questing, and crew (guild) play. Still live.
[outwar.com](http://www.outwar.com/); [Outwar Wiki — Fandom](https://outwar.fandom.com/wiki/Outwar_Wiki)

**Mechanics that matter to us:**
- **Crews (guilds) have a shared treasury**, spendable by permissioned members on items placed
  directly into a shared "crew vault" — i.e. a genuinely *shared, spendable inventory*, not just a
  stat-buff source the way our Sect specialties are.
  [outwar.info wiki](https://outwar.info/wiki/PvP)
- **A Bounty Hunter system** exists as a distinct PvP sub-mode with its own dedicated equipment set
  (purchasable on the marketplace) — bounty-hunting is a *build identity*, not just a board of offers.
  [Bounty Hunter Set — Outwar Wiki](https://outwar.fandom.com/wiki/Bounty_Hunter_Set)
- **PvP loss has a stat cost**: losing a PvP fight strips the loser's XP — a harsher, more consequential
  PvP-loss penalty than our own bragging-rights-only sparring (`duel.js`'s tally has no stakes).
  [outwar.info wiki](https://outwar.info/wiki/PvP)
- **"Preferred Player"** is a real-money subscription service with tiered monthly cost, granting
  ongoing account-wide benefits rather than a one-time purchase — a recurring-revenue monetization
  shape distinct from FS's FSP or Gladiatus's Rubies (both spendable one-shot currencies).
  [Preferred Player — outwar.info wiki](https://outwar.info/wiki/Preferred_Player)
- Crew-wide raid encounters against "enormous boss mobs" for elite item drops — a cooperative-guild
  boss-kill model.

**What it does that FallenSword (and we) don't:**
- **A shared, spendable guild treasury/vault** as a genuine cooperative resource, not just a
  buff-generator — our Sect has no analogous shared "pot" members contribute to and draw from.
- **PvP with a real XP stake for the loser** — meaningfully raises PvP tension versus our
  bragging-rights-only sparring.
- **Subscription-model monetization** as a third monetization archetype in this cluster (alongside
  one-shot premium currency and cosmetic-only microtransactions).

**Relevance tags:**
- **[LOW/SKIP]** Shared spendable crew treasury — needs a *real* second player contributing to a
  shared pot to mean anything; faking it with our single hireable-NPC-disciple Sect would just be a
  reskinned personal currency sink, not a genuine cooperative mechanic. Correctly a 2.0-network-era
  idea (once `NetworkGuildProvider` exists), not now.
- **[MED]** PvP-loss-strips-XP as a real stake — relevant *if* sparring ever becomes real 2.0 PvP; not
  applicable to today's bragging-rights-only `duel.js`, and Sprint-1's own framing (GDD's "PvP cut for
  1.0, hook left in the resolver") suggests deliberately keeping stakes at zero for now is correct.
  Worth flagging forward per Sprint-1's Tier D 2.0 notes rather than building today.
- **[LOW/SKIP]** Subscription monetization — no monetization surface exists or is planned; out of
  scope entirely.

---

## Anchors considered and set aside (shorter note)

- **Duels.com → EpicDuel (swap).** The brief's "Duels.com" anchor no longer describes a live browser
  stat-math MMORPG — the current "Duels: Epic Fighting PVP Game" is a mobile-first auto-battler
  (Google Play/App Store), a different genre shape (idle-adjacent auto-combat, not session-gated
  stat-math). [Duels — Google Play](https://play.google.com/store/apps/details?id=com.deemedyainc.duels&hl=en_US)
  A much closer match to what the brief was pointing at is **EpicDuel** (Artix Entertainment,
  launched 2009): a genuinely browser-based, sci-fi-themed, turn-based **PvP-centric** MMORPG with an
  energy-management combat layer and gear-driven builds. [epicduel.artix.com](https://epicduel.artix.com/)
  I did not write it a full section since its focus (competitive 1v1 PvP builds, not a
  dungeon-crawl/loot-chain economy) is a narrower slice of "the same problems we do" than the other
  seven — but it's worth the lead knowing this substitution happened and why, since a synthesis
  citing "Duels.com" against the brief's original anchor would be citing a different, no-longer-
  accurate game.
- **AdventureQuest / BattleOn.** Real and still historically significant (Artix Entertainment, since
  2002) — turn-based combat with elemental resistances, six stats affecting damage/hit chance, and a
  premium "Founder" status granting unlimited energy/turns. [AdventureQuest — Wikipedia](https://en.wikipedia.org/wiki/AdventureQuest)
  But it's fundamentally a single-player Flash-era RPG (now largely inaccessible without a Flash
  emulator) with no real player economy, auction house, or PvP layer — the parts of "the same problems
  we do" that matter most for this cluster (economy, PvP, gear trading) are thin-to-absent here versus
  the other seven. Kept to this note rather than a full section for that reason.

---

## Notable aside: FallenSword itself has an announced sequel (outside cluster scope, but timely)

While researching Eldevin (an anchor explicitly named in the brief), search surfaced that Hunted Cow
Games has **announced "Fallen Sword II," an explicit "spiritual successor" to the original 2006
browser MMO, targeting a 2026 release** (reporting varies between "2026" generally and a more specific
Q3 2026 window). It is described as a **cross-platform, turn-based RPG with a card-game-like combat
system**, six class paths (Cleric, Guardian, Mage, Ranger, Rogue, Warrior), carrying forward dungeon
encounters, skill mastery, crafting, and alchemy from the original but in a visually modernized,
smaller-in-scope package.
[TechPowerUp](https://www.techpowerup.com/344182/hunted-cow-games-announces-fallen-sword-ii-for-2026);
[MassivelyOP](https://massivelyop.com/2026/01/13/fallen-sword-2-bills-itself-as-a-spiritual-successor-to-the-2006-browser-mmo/);
[Hunted Cow's own announcement](https://huntedcow.com/news/announcing-fallen-sword-ii-coming-2026)

This is **not a Cluster-A neighbor** (it's the source game's own sequel, not a genre cousin), so it
doesn't get a full section or relevance-tagged ideas here — but given the project's own framing is
explicitly "FallenSword-inspired," and this is landing in the same calendar year as this research
sprint, the lead/synthesis should be aware of it. Flagging it here rather than silently omitting it
because it surfaced directly from an in-scope anchor's research and is unambiguously relevant context
for anyone positioning Fallen Immortal against "what FallenSword itself is becoming."

---

## Transferable ideas — summary table

| Idea | Game(s) | Relevance | Our pillar/module | One-line why |
|---|---|---|---|---|
| Prestige currency buys permanent cross-run unlocks (not just a flat scalar) | Kingdom of Loathing (Karma/Ascension) | **HIGH** | `ascension.js`/`progression.js` | Deepens our Ascension beyond a flat `+8%/tier`; fits "keeps collections" precedent already in place |
| Bank vs. cash-on-hand split as a death-penalty mitigation lever | Improbable Island | **HIGH** | `game.js` death penalty | Gives players agency over `DEATH_STONE_LOSS` exposure without softening the penalty itself; additive save field |
| Mode/context-varying turn caps (not one global constant) | Gladiatus (20/15/unlimited by mode) | **HIGH** | `combat.js`/`game.js` (validates Sprint-1's own B1) | Independent genre confirmation that a push-through/variable-cap attack tier is a well-trodden pattern, not speculative |
| "Paid buys convenience/cosmetic, never power" monetization stance | Eldevin | **HIGH** (as a stance, not an action) | future monetization (if any, post-1.0) | Live decade-plus proof a non-pay-to-win model sustains a genre-sibling MMO; consistent with our current no-monetization pillar |
| Opt-in harder-run-for-more-reward prestige restrictions | Kingdom of Loathing | **MED** | `ascension.js` | Adds a real difficulty/reward dial to Ascension; more implementation cost than the Karma idea for a smaller expected payoff |
| Fair-Fight-style "closer stats = better reward" PvP multiplier | Torn | **MED** | `duel.js`/`rivals.js` (2.0 PvP) | Discourages stat-stomping weak rivals once real PvP stakes exist; not needed while sparring is bragging-rights-only |
| Training-efficiency brake (spend a resource too fast, temporarily degrade returns) | Torn (Happy) | **MED** | `game.js`/Qi economy | Interesting anti-grind-burst lever, but the Qi-rate root cause (Sprint-1 A1) is likely higher leverage to fix first |
| PvP-loss strips a real stake (XP), not just bragging rights | Outwar | **MED** | `duel.js` (2.0 PvP) | Only matters once sparring becomes real stakes-bearing PvP; correctly deferred per GDD's 1.0 scope cut |
| Dual-sourced (grindable + buyable) premium currency, not cash-only | Sryth | **MED** (awareness only) | future monetization (if any) | Softer monetization shape than a pure paywall; not actionable — no monetization surface exists today |
| In-combat resource throttling (regen slows *during* a fight, not just gated at entry) | Eldevin | **MED** | `combat.js`/Qi economy | Arguably already covered by our per-turn Qi spend; worth naming as a confirmed pattern, not a gap |
| Daily-allowance-plus-consumable-extension stamina model | Kingdom of Loathing | **LOW** | Qi economy (pacing) | A third pacing archetype worth knowing exists; a full swap is a much bigger change than the flagged Qi-rate retune |
| Fixed sub-daily tick reset (vs. continuous wall-clock regen) | Improbable Island | **LOW** | Qi economy (pacing) | Alternative pacing model; same reasoning as above — informative, not an actionable build |
| Merged HP+stamina into one resource | Sryth, Gladiatus | **LOW/SKIP** | `game.js`/`combat.js` | Conflicts with our deliberate Qi/HP split; would raise non-combat lethality in a way PROJECT.md doesn't call for |
| Shared, spendable guild/crew treasury | Outwar | **LOW/SKIP** | `guild.js` (2.0) | Needs a real second player contributing; faking it single-player is just a reskinned personal sink |
| Real-money-gated "meaningful progression requires purchase" | Gladiatus | **LOW/SKIP** | — | Directly contrary to the no-monetization-surface pillar |
| Recurring subscription monetization | Outwar | **LOW/SKIP** | — | No monetization surface planned; out of scope |
| No-auction-house-by-design / informal trade only | Eldevin | **LOW** | `market.js` | Doesn't apply — our Pavilion is fake-multiplayer NPC-driven specifically because there's no live population, a different problem than Eldevin's |
| Full-wipe (gear+currency) prestige reset | Improbable Island | **LOW/SKIP** | `ascension.js` | Contrary to our Ascension's "keeps collections" design, already confirmed correct by Sprint-1 |
| Multiple parallel session-gating resources (Energy/Nerve/Happy) | Torn | **LOW/SKIP** | Qi economy | Adds complexity against our "numbers you can read" simplicity pillar; one clean Qi pool is the deliberate choice |

---

*Status: complete. All seven full-section games + two noted-and-set-aside anchors verified to exist
and checked against their actual current state (not assumed from the brief). Non-obvious claims cited
per the fact-quality rules; nothing asserted as fact without a source. One item flagged for the lead
outside strict cluster scope: the FallenSword II 2026 sequel announcement. Message sent to the lead on
completion.*
