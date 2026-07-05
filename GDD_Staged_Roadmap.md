# [Working Title] — Staged Game Design Document
**Genre:** Browser-based stat-math dungeon-crawler RPG (FallenSword-inspired), offline-first with a designed path to multiplayer
**Platform:** HTML/JS, single-file or modular, itch.io-style distribution for 1.0
**Author:** Mariusz
**Status:** Draft v1

---

## 1. Vision

A solo-friendly grind-and-loot RPG that captures what actually made FallenSword compelling — stamina-gated sessions, transparent stat-math combat, gear progression, and a big world to explore — without needing a server, an account system, or other players. Every system is built so that in 2.0, the "other players" slot can be filled by real people instead of NPCs, without re-architecting the core.

**Design pillars:**
1. **Numbers you can read** — combat outcomes come from visible stats (Attack/Defense/Damage/Armor/HP), not hidden RNG theater.
2. **Sessions, not marathons** — a resource (stamina) gates how much you can do per sitting, encouraging short check-ins over long grinds.
3. **Offline-complete, online-ready** — nothing in 1.0 requires a network call, but every multiplayer-shaped system (guild, market, PvP, world events) exists as a local stub with the same interface a networked version would use.

---

## 2. Core Loop

```
Explore grid map (costs stamina)
  → Encounter creature on tile
    → Attack (costs stamina, resolved via stat-math)
      → Win: gain XP/gold/loot → gear up / level up
      → Lose/retreat: minor setback, no permadeath
  → Stamina depletes → passive regen over time (or offline-accelerated regen, see 4.6)
  → Return to town: repair gear, sell/buy, take quests, allocate points
```

This loop must be fun and complete with zero other systems layered on — everything else (quests, crafting, guild-stub, market-stub) is there to give the loop *texture and goals*, not to replace it.

---

## 3. Systems Breakdown (ported from FallenSword, adapted for offline)

| System | FallenSword original | Your offline adaptation |
|---|---|---|
| World map | Grid-based, tile movement costs stamina | Same — grid map, orthogonal move = 1 stamina, diagonal = 2 |
| Combat | Attack vs Defense = hit chance; Damage vs Armor+HP = outcome | Same formula, tunable constants |
| Stamina | Regenerates hourly in real time, caps ~500+ | Same regen model; consider an optional "accelerated offline regen" toggle so single-player sessions don't feel like they're waiting on a live server clock |
| Leveling | XP scaled to level-gap vs monster; stat points + skill points on level-up | Same; keep the "don't fight things way below your level" tension |
| Gear | Degrades with use, needs repair, has set bonuses | Same; repair costs gold, creates a gold sink |
| Quests | Long quest chains, epic quests with big rewards | Same; author 3–5 zone-based quest chains for 1.0 |
| Guilds | Shared buffs, group attacks, guild vs guild | **Stubbed**: a local "Warband" of hireable NPC companions that grant the same *category* of buffs a guild structure would (stamina gain, XP bonus) — same data shape as a future real guild, just populated by NPCs |
| PvP | Open-world player vs player | **Cut for 1.0** per your call — leave a hook in the combat resolver (`attacker`, `defender` as generic actors) so a future PvP mode calls the same resolver against a real player's saved stat sheet |
| Auction house / trading | Player-driven economy | **Upgraded from "skip" to a full fake-multiplayer market** (see §6.7) — a persistent pool of NPC personas post rotating listings with realistic price variance, buyable via Buy Now, using the same "listing" data structure a real auction house would use so 2.0 can swap in real player listings |
| World events / Legendary creatures | Server-wide weekend bosses | **Stubbed**: scheduled solo "Legendary Creature" encounters (tougher stat-scaled boss with unique loot table), triggered by in-game calendar or milestone, not by other players |

---

## 4. Architecture Notes (built once, used in every stage)

1. **Deterministic combat resolver as a pure function.** `resolveCombat(attacker, defender, seed)` — takes two generic actor objects and returns an outcome. Whether `defender` is an NPC monster, an NPC "rival," or (in 2.0) a real player's synced stat sheet, the function doesn't care. This is the single most important thing to get right early, because it's what lets 2.0 add PvP without touching combat code.
2. **Actor data model is player-shaped from day one.** Monsters, NPC rivals, and the player all share one `Actor` schema (stats, equipment, level). This is what makes "PvP later" cheap instead of a rewrite.
3. **Guild/market/event systems live behind an interface, not hardcoded to "NPC."** e.g. `GuildProvider.getMembers()` returns local NPCs now; in 2.0 you write a `NetworkGuildProvider` that implements the same interface against a real backend. The rest of the game never knows the difference.
4. **Save data is the only "account" you need for 1.0.** Local save (localStorage or exported save file) — no login system. Structure it so a save file *could* later be uploaded to a server as your account state, rather than needing a parallel online data model.
5. **Modular file structure, not a single monolith.** Dao Unbound worked as one `index.html` because of its scope; this project is bigger (grid map, many zones, quest system, market, guild-stub) — split into modules (`combat.js`, `map.js`, `actors.js`, `quests.js`, `market.js`, `guild.js`, `save.js`) from the prototype stage so it doesn't calcify into unmaintainable spaghetti before 1.0.
6. **Stamina regen and "offline time."** Decide early: does stamina regen while the browser tab is closed (based on wall-clock time, like the original), or only while playing (idle-game style)? Wall-clock regen is closer to FallenSword's feel and rewards checking in; pure play-time regen is more forgiving for offline/no-account play. Recommendation: wall-clock based, since it's core to the genre's addictive loop and costs nothing extra offline (just read `Date.now()` against last-seen timestamp).

---

## 5. Staged Roadmap

### Stage 0 — Prototype
**Goal:** Prove the core loop is fun with placeholder art and one tiny map.

**In scope:**
- One small grid map (e.g. 10x10), 2–3 monster types
- Combat resolver (Attack/Defense/Damage/Armor/HP math) working end-to-end
- Stamina system with basic regen
- One character, no persistence (refresh = reset)
- No UI polish — functional buttons and text only

**Out of scope:** saving, leveling curve balance, quests, gear variety, art, sound.

**Exit criteria:** You can walk the map, fight monsters, win/lose combat, and stamina depletes/regens correctly. Playtest question: *is clicking through 20 fights still interesting, or is the loop already boring at zero polish?* If boring here, fix the loop before adding content.

---

### Stage 1 — MVP
**Goal:** A vertical slice with the systems that make it a *game* rather than a tech demo.

**In scope:**
- Save/load (localStorage)
- Leveling: XP curve, stat point + skill point allocation on level-up
- Gear: at least 2 equipment slots, degradation, repair-for-gold
- 1 full zone with a small quest chain (3–5 quests)
- Modular file structure in place (per Architecture Notes)
- Basic Actor schema shared by player/monsters
- Lifetime kill tracking in the save schema + stat-modifier aggregation pipeline (per §7.3/§7.5 — data foundations only, no Bestiary/Card UI yet)

**Out of scope:** guild-stub, market-stub, world events, multiple zones, art pass.

**Exit criteria:** A new player can go from level 1 to a meaningful mid-point purely through play, saving/loading correctly, gearing up, and finishing the quest chain.

---

### Stage 2 — Demo
**Goal:** A polished, shareable slice you'd put on itch.io as a public demo.

**In scope:**
- 2–3 zones with a difficulty curve
- Full quest chain(s) tying zones together
- NPC "Warband" stub (local companion buffs) introduced
- Fake-multiplayer Auction House introduced: persona pool generator, rotating listings, Buy Now, mailbox (see §6.7) — this is meaty enough it deserves its own demo-stage milestone, not a last-minute add
- Tutorial/onboarding pass
- Visual/UI polish pass (even if simple, needs to look intentional)
- One "Legendary Creature" stub boss encounter
- Bestiary ("Beast Codex") UI + Spirit Card drops for the demo zones' creatures (§7)

**Out of scope:** full 1.0 content breadth, balancing for dozens of hours of play, multiplayer hooks beyond the interface design.

**Exit criteria:** A stranger can install/play with zero explanation from you, complete the demo content, and understand what the full game will offer. Get external feedback here before committing to full 1.0 scope.

---

### Stage 3 — 1.0 Release (Offline)
**Goal:** A complete, sellable/shippable single-player game.

**In scope:**
- Full realm map with multiple zones (aim for scope similar to a small commercial browser RPG, not FallenSword's "thousands of levels" — pick a number you can actually finish, e.g. 8–15 zones)
- Full quest content across all zones, including at least one "epic quest" chain with a strong reward
- Complete gear/crafting system with sets and bonuses
- Warband (NPC guild-stub) fully fleshed out with meaningful buffs
- Fake-multiplayer Auction House fully populated: full persona roster (60–150), tuned price variance, player-selling resolution loop, "Recently Active" and Rivals feeds sharing the same persona data
- Multiple scheduled/solo Legendary Creature encounters as end-game content
- Full Spirit Card set across all zones (incl. boss/Legendary cards) with duplicate-upgrade tuning; complete Bestiary coverage (§7)
- Full save/export/import (so players can back up saves without an account)
- Balancing pass across the full level range
- Itch.io packaging, store page, screenshots

**Out of scope:** anything requiring a server — no accounts, no real players, no live events.

**Exit criteria:** Feature-complete, balanced, and playable start-to-finish with no known network dependency. This is your commercial (or portfolio) release.

---

### Stage 4 — 2.0 (Multiplayer)
**Goal:** Swap the offline stubs for real networked systems using the interfaces you built from Stage 0 onward.

**In scope:**
- Backend/account system (auth, save sync)
- Replace `NpcGuildProvider` with `NetworkGuildProvider`: real guilds, real group attacks
- Replace NPC market with a real player-driven auction house
- PvP mode using the existing `resolveCombat()` against synced player stat sheets
- Real server-wide Legendary Creature / world events
- Anti-cheat/validation (server-authoritative combat resolution, since client-side stat math is now attackable)
- Migration path for existing offline saves into online accounts

**Out of scope until this stage:** everything above — this is deliberately the *last* thing you build, and it's cheap specifically because Stages 0–3 were built against interfaces rather than hardcoded NPC logic.

**Exit criteria:** Existing 1.0 players can migrate a save into an online account and immediately participate in guilds, market, and PvP without their single-player progress being invalidated.

---

## 6. Deep-Dive: Items, Inventory, Progression, Profile/Map UI, and the Auction House

This section goes one level deeper on the systems you flagged as most important, with the FallenSword mechanics that inform them and concrete offline adaptations — including designing the Auction House as a **convincing fake-multiplayer economy** for 1.0.

### 6.1 Item Rarity

FallenSword uses rarity tiers that gate both power and scarcity — from most to least common: Common, Rare, Unique, Legendary, Crystalline, Super-Elite, and Epic, with epic items being the rarest tier in the game, typically very powerful, and obtained mainly from titans, epic quests, or crafting/invention rather than normal drops.

**Offline adaptation:** Keep a similar ladder, e.g. `Common → Uncommon → Rare → Epic → Legendary → Mythic`. Two things matter more than the exact names:
- **Rarity should gate stat *rolls*, not just base stats** — a Rare sword rolls from a wider/better range than a Common one, so two items of the same rarity aren't identical (gives loot variance without needing an "affix" system yet).
- **Reserve your top 1–2 tiers for named, hand-authored items** (boss drops, quest rewards, crafted uniques) rather than random drops — this is what made Epic/Legendary feel special in FallenSword rather than just "a bigger number."

### 6.2 Inventory / Backpack

The backpack starts small (3 slots in FallenSword, 12 slots per page, upgradeable) — clicking an equipped-slot item equips it and swaps the previously worn item back into the backpack, and players can maintain multiple **Combat Sets** (e.g., a leveling set and a defensive set) to swap gear loadouts without manually re-equipping each piece.

**Offline adaptation:**
- Grid inventory, small starting size (creates early-game tension: sell/drop vs hoard), expandable via gold or level milestones (skip FSP-gated expansion since there's no premium currency yet).
- **Combat Sets are worth building early** — it's a small feature (save/load a named list of equipped-item IDs) that adds real tactical depth (grinding gear vs. tougher-boss gear) for cheap.
- Support "destroy" (permanent, confirm dialog) and "sell to vendor" as the two ways to clear space, since a full backpack should be a meaningful moment-to-moment decision, matching the original's warning that a full pack blocks new loot until you clear it.

### 6.3 Leveling & Stats

Each level-up grants a small number of stat points (for Attack/Defense/Damage/Armor/HP) and a separate pool of skill points (for buffs), and veteran-authored guides consistently recommend concentrating stat points into Attack and Damage rather than spreading them evenly, since attack determines whether you hit at all and damage determines the kill.

**Offline adaptation:**
- Keep the two separate pools (stat points vs skill points) — it creates two independent build decisions instead of one, which is good for replay variety even solo.
- Consider whether to allow a (limited, costly) respec — FallenSword allows skill resets via premium currency; for offline, a gold-cost respec available after a certain level is a fair substitute.
- Balance early XP so 1–2 hit kills feel achievable with focused stat investment — the original's own tutorial guidance was literally "get to where you one-hit-kill things at your level," which is a good tuning target.

### 6.4 Skills / Buffs

Skills are grouped into Offense, Defense, and Special categories, each has a minimum character level to learn, some have prerequisite chains (e.g., a capstone skill requiring two prior skills), and skills are cast as temporary timed buffs that cost a resource to activate, with veteran advice being to avoid over-buffing yourself since re-casting constantly burns resources fast.

**Offline adaptation:**
- Keep the three categories and a light dependency tree (2–3 tiers deep is plenty for 1.0 — you don't need FallenSword's ~160 skills).
- Buffs cost stamina to activate and have a real-time duration, same as the original — this is a nice sink that makes stamina management (do I buff before a big fight, or save stamina for kills?) a genuine decision.
- **Buff trading between players is a core FallenSword social/economic behavior you're cutting for 1.0** (buffs are commonly traded via a "Buff Market") — note this explicitly as a 2.0 feature, since it implies your buff system should store buffs as data (caster, target, effect, duration) generic enough to later support one player buffing another.

### 6.5 Profile Page

The profile page/HUD surfaces: currently active buffs and their remaining time, an allies and enemies list (asymmetric — you can add someone as an ally or enemy without their consent or reciprocation), and a list of recently-online players at your level (useful both socially and as PvP scouting).

**Offline adaptation:** Repurpose this directly into your fake-multiplayer layer (see 6.7) — a profile page showing your active buffs, a "Rivals" list (reskinned allies/enemies, populated with your persistent NPC cast), and a "Recently Active" feed populated by the same fake-player pool that runs your Auction House. This costs little extra to build since it's mostly UI over data you'll already have, and it makes the world feel populated well before real players exist.

### 6.6 Map Page

The map is a grid; each tile shows a list of "Actions for Location" (quests, shops, stairs/portals appear first), then any monsters present with a name, an inspect ("eye") icon showing level/stats, and attack buttons letting you cap the stamina spent per attack (the original offers 20/40/60-stamina attack caps, useful against tougher monsters where you're not sure how many hits it'll take).

**Offline adaptation:**
- Keep the capped-attack pattern (e.g., "attack, spend up to X stamina") — it's a clean way to let players fight monsters above their effortless-kill range without an unbounded stamina risk if the fight goes long.
- Keep the inspect-before-you-commit pattern (hover/click to preview a monster's level and stats before attacking) — respects the player's stamina as a resource.
- Multi-monster tiles: letting a player click through several monsters on one tile speeds up grinding sessions, per player-written efficiency guides.

### 6.7 Auction House — Fake Multiplayer for 1.0

This is the system worth the most design care, since it's your best tool for making the offline game *feel* like a living online world.

**How the real one works:** any player can list an item with a starting bid and an optional "Buy Now" price; auctions run 1–48 hours; the listing browser is organized by item category with level-range search filters; and won items land in a mailbox that expires after a fixed window if not collected — creating light time-pressure even for asynchronous trading.

**Your fake-multiplayer design for 1.0:**

1. **Persistent fake-player pool.** Generate a modest roster (60–150) of NPC personas — name, level band, a flavor guild tag — created once and reused everywhere (Auction House sellers, "Recently Active" list, profile Rivals/Enemies). Consistency here is what sells the illusion; a name you've seen "sell" gear before feels like a real economy, a random string each time doesn't.
2. **Listings refresh on a timer, not per-visit.** Generate a batch of fake listings (item + rarity + price) on a schedule (e.g., every N in-game hours or on each stamina-regen tick), pulled from the same loot/rarity tables as monster drops so prices stay internally consistent. Old unsold listings expire and get replaced — this is your "static items that refresh over time" request, and it also naturally rate-limits how much gold-sink/gold-source the AH represents.
3. **Price variance, deliberately.** Don't price listings at a clean "fair value" — roll some noise so a few are bargains and a few are overpriced, mirroring the real AH's very visible spread between lowball buyouts and desperate high asks. This alone makes browsing feel like a real market instead of a shop.
4. **Buy Now only for 1.0; skip real bidding.** True bidding requires an opponent who can out-bid you in real time, which you don't have offline. Buy Now (fixed price, instant) preserves the core "browse and snipe a good deal" feeling without needing to fake a bidding war. (If you want the competitive feel later, a lightweight version — a fake bid that occasionally "beats" your low bid after a delay — is a cheap 1.0-friendly compromise, but Buy Now-only is simpler and still satisfying.)
5. **Let the player sell into the fake economy too.** When the player lists an item, resolve it asynchronously: after some delay, roll whether a fake buyer "purchases" it at or near your asking price (weighted by how competitive your price is versus current listings of similar items). This gives selling a reason to exist beyond vendor-trash, and mirrors the original's actual seller behavior of re-listing until something sells or eventually just vendoring it.
6. **Keep the mailbox pattern.** Completed sales/purchases land in a mailbox rather than resolving instantly — it's a small but important pacing device (creates a reason to check back in) and matches the original's flow exactly.
7. **Architect it as `MarketProvider` (per §4.3).** All of the above should be implemented behind the same interface a real networked auction house would use: `listItem()`, `getListings(filters)`, `buyNow(listingId)`, `collectMailbox()`. In 2.0, you write a `NetworkMarketProvider` that talks to a real backend with real player listings — the UI and the player's mental model don't change at all.

### 6.8 Data Model Additions Implied by This Section

- **Item schema** needs: `rarity`, `statRollRange` (per rarity), `levelRequirement`, `setId` (optional), `bound` (true/false — mirrors FallenSword's bound-vs-tradeable distinction and matters once you reach a real market).
- **Skill schema** needs: `category` (Offense/Defense/Special), `prerequisites[]`, `duration`, `staminaCost`, `effect`.
- **Persona schema** (new) needs: `name`, `level`, `guildTag`, used by both the Market and the Profile/Rivals feed — build this once, consume it everywhere.
- **Listing schema** needs: `itemId`, `sellerPersonaId`, `price`, `postedAt`, `expiresAt` — same shape a real listing table would have.

---

## 7. Bestiary & Spirit Card System

Two linked collection systems that give every creature in the game long-term value beyond its XP — critical for the intended grindy pacing, since they keep low-level zones worth revisiting after their XP goes trivial.

### 7.1 Bestiary ("Beast Codex")

A per-creature catalog that fills in through play:

- **An entry is created on first encounter** (inspecting or fighting a creature) and tracks lifetime kills per creature type.
- **Progressive disclosure by kill count** — thresholds reveal more of the entry, e.g.:
  - 1 kill: name, level, flavor text
  - 10 kills: full combat stats (makes the inspect-eye redundant for farmed creatures)
  - 50 kills: full drop table
  - 100 kills: the creature's Spirit Card drop chance (see 7.2) + a codex "mastery" mark
- **Cheap to build, high retention value:** the combat resolver already produces per-kill data; the bestiary is UI over a `{ creatureId: killCount }` map in the save. Kill tracking should be recorded in the save schema from Stage 1 even though the Bestiary UI lands later — retrofitting lifetime kill counts is impossible.
- **Later (post-1.0 candidate):** per-zone codex completion rewards (e.g. complete all Zone 1 entries → small permanent bonus), which converts the bestiary from passive record into an explicit goal.

### 7.2 Spirit Cards

Every creature type has a corresponding **Spirit Card** with a small chance to drop on kill. Collected cards grant **always-on passive bonuses** — no equipping, no slot management; the collection itself is the power.

- **Drop model:** low base chance per kill (tuning start: 0.5–2% for normal creatures, higher for bosses/Legendaries). The card roll is separate from the normal loot roll, so a card never "replaces" an item drop.
- **Bonus types at launch:**
  - Qi regen rate (+X per hour)
  - Qi cap (+X max)
  - Spirit stones per hour (passive wall-clock income — uses the same last-seen-timestamp machinery as Qi regen)
  - Extra inventory slots
  - (extensible enum — XP gain %, repair discount, drop-rate % etc. can be added without schema changes)
- **Duplicates upgrade the card** (level 1→5, bonus scales per level, later copies beyond max convert to a small spirit-stone payout). This is the grind-longevity lever: a 1% card at level 5 is a long-term chase goal that keeps a zone alive for hundreds of kills, which is exactly the pacing profile we want.
- **Cards are account-bound in 1.0.** Whether rare cards become tradeable on the market in 2.0 is an open economy question — flag it, don't decide it now.
- **Bestiary integration:** each codex entry shows that creature's card (silhouetted until owned, with owned level), making the bestiary double as the card-collection UI instead of building a separate album screen.

### 7.3 Architecture Implication: Stat Modifier Aggregation

Cards are the third source of passive modifiers after gear and techniques, which forces a decision we should make in **Stage 1**, not later: the player's effective stats must be computed through a single aggregation pipeline —

```
effectiveStats = base + allocatedPoints + gearBonuses + activeTechniques + cardBonuses
```

— rather than mutating stats in place when things equip/unequip/drop. Every future passive source (sect buffs, set bonuses, codex completion rewards) then plugs into the same pipeline. This also matters for 2.0 server-side validation: a save is verifiable if effective stats are always derivable from owned sources.

### 7.4 Data Model Additions

- **Creature schema** gains: `cardId`.
- **Card schema** (new): `id`, `creatureId`, `bonusType`, `bonusValuePerLevel`, `maxLevel`, `dropChance`.
- **Save schema** gains: `bestiary: { creatureId: { kills, firstSeenAt } }`, `cards: { cardId: level }`.
- **Passive income/regen** generalizes: instead of a Qi-only regen calculation, one wall-clock tick function applies all per-hour accruals (Qi regen, spirit stones/hour) from the aggregated modifier set.

### 7.5 Roadmap Placement

- **Stage 0:** nothing — no persistence yet.
- **Stage 1:** kill tracking in the save schema + the stat-modifier aggregation pipeline (§7.3). No UI.
- **Stage 2:** Bestiary UI + Spirit Cards live for the first 2 zones' creatures (this is the stage where retention systems earn their keep in a public demo).
- **Stage 3:** full card set across all zones, duplicate-upgrade tuning, boss/Legendary cards.

---

## 8. Combat System Specification

Your spec — press Attack, spend stamina, cap at 20 turns with a draw if unresolved, lose a % of gold/XP on death, gain XP/gold/drop chance on win — maps closely onto FallenSword's actual system, where a capped attack (their base tier is 20 stamina/swings) that doesn't finish the creature off resolves as "Combat Unresolved," and even a missed swing still costs stamina. That's a good sign: it means the shape is proven to work. Here's the fleshed-out version with the decisions your one-liner implies but doesn't state yet.

### 8.1 Combat Trigger & Stamina Check

- Player selects a creature on the current tile and presses **Attack**.
- **Stamina check happens before combat starts**, not per-turn: if current stamina is below the attack's stamina cost, the Attack button is disabled/greyed out with a tooltip (e.g., "Need 20 stamina"). This avoids the awkward case of a fight cutting off mid-combat because stamina ran out — the resource is committed up front, like FallenSword's own 20/40/60-stamina attack tiers.
- **Cost model:** 1 stamina per turn actually resolved, up to the 20-turn cap — so a fight that ends in 6 turns only costs 6 stamina, and stamina is deducted turn-by-turn as combat resolves (matching the original's "even a miss costs stamina" rule) rather than all 20 up front. This keeps efficient fighters (good gear, fewer turns needed) rewarded with lower stamina cost per kill, which is the core skill-expression loop the genre depends on.

### 8.2 Turn Resolution (per turn, up to 20)

Each turn is a simultaneous exchange:
1. **Player swings first.** Hit/miss via Attack vs Defense (± a small random percentage on both sides, e.g. ±5%, so outcomes aren't 100% predictable even at a stat advantage). On a hit, Damage vs the creature's Armor+HP determines a Kill / Wound / Miss-but-chip-1HP outcome, same three-way logic as the original.
2. **If the creature dies on the player's swing, combat ends immediately as a Win** — no counter-swing.
3. **Otherwise, the creature swings back** using the same Attack/Defense/Damage/Armor/HP math against the player.
4. **If the player dies on the creature's counter-swing, combat ends immediately as a Loss.**
5. If neither dies, stamina ticks down by 1 and the loop continues.
6. **After 20 turns with both still alive: Draw.** Stamina spent is kept spent (you paid for the attempt), but no rewards and no death penalty — a clean "this fight wasn't worth it, walk away and find something else" signal to the player.

### 8.3 Outcomes & Rewards

**Win:**
- XP awarded, scaled by the level gap between player and creature (higher for punching up, negligible for punching far down) — same curve logic as the original, which is what discourages endlessly farming trivial creatures.
- Gold awarded (creature-level-scaled).
- **Item drop roll**, weighted by the creature's drop table and the rarity tiers from §6.1 (higher-level/boss creatures roll better rarity chances).

**Loss:**
- Lose a % of current gold and a % of current-level XP (not total account XP — never send someone back a full level from one bad pull, that's excessively punishing for a solo game with no one to lean on for recovery buffs).
- **Suggested starting values: 5% gold, 3% of progress toward next level** — noticeably worse than winning nothing, but not run-ending. Tune from playtesting; the original's actual death penalty (roughly half a level's worth of XP for newer players) drew real player complaints for being brutal, and you don't have the multiplayer safety net (guild buffs, other players carrying you) to offset that harshness the way FallenSword did.
- No permadeath, no item loss on death — losing gear on top of gold/XP would be excessive for this genre.

**Draw (20-turn cap reached):**
- No reward, no penalty beyond stamina spent. This is your safety valve against "picked a fight I can't win *or* lose" stalemates — signals to the player that this matchup isn't worth continuing, without punishing them for trying.

### 8.4 Data Model

Extend the `resolveCombat(attacker, defender, seed)` function from §4.1 to return a structured result:
```
{
  outcome: "win" | "loss" | "draw",
  turns: [ { round, playerRoll, creatureRoll, playerHpAfter, creatureHpAfter }, ... ],
  staminaSpent: number,
  rewards: { xp, gold, itemDrop } | null,
  penalty: { goldLost, xpLost } | null
}
```
Keeping the full turn-by-turn log (even if the UI only shows a summary by default) gives you a free "watch the replay" feature later, and makes debugging combat balance far easier than trusting only the final outcome.

### 8.5 Open Tuning Questions

- Exact gold%/XP% loss on death — needs playtesting, not just a spec number.
- Whether "Wound" (hit but not killed) has any effect beyond HP loss (e.g., a small chance to reduce the creature's stats mid-fight), or stays purely HP-driven as described.
- Whether multi-monster tiles (per §6.6) let the player queue several 20-turn fights back to back with one click, or require re-triggering Attack per creature.

### 8.6 Presentation: Instant Resolution, Turn-by-Turn Playback

Resolve the whole fight synchronously the moment Attack is pressed (you already have every turn's outcome from §8.4's data structure before any animation starts), then **play it back to the player one turn at a time** rather than instantly dumping the result. This mirrors what FallenSword actually did — combat resolves immediately, but the client steps through it turn-by-turn, and offered a preference to change the "Combat Display Speed," including an instant option for players who'd rather skip straight to the outcome, along with quick-kill tooling that let veterans hover over a result to see the hit-by-hit report only if they wanted it.

**Implementation shape:**
1. Call `resolveCombat()` — get the full result object back immediately (outcome, full turn array, rewards/penalty), before any UI plays.
2. Feed the `turns[]` array into a simple playback loop: render turn 1, wait (e.g., 300–600ms), render turn 2, etc. — each turn showing attacker/defender, hit or miss, damage dealt, HP remaining.
3. **After the last turn resolves, show the outcome banner and rewards** (XP/gold/item drop, or the loss penalty) as a distinct final beat — don't blend it into the turn animation, since rewards are the payoff moment and deserve their own visual beat.
4. **Add a "skip"/instant toggle** early (Stage 1 MVP is a fine time) — either a settings preference or a button to fast-forward the current animation to the end state. This costs little to build now and saves you from needing to retrofit it once players start asking for it, which they will the moment they're grinding the same fight for the 50th time.
5. Because resolution and presentation are decoupled (the whole result exists before playback starts), you get a couple of things for free: a **replay/share the last fight's log** feature is trivial later, and **automated testing of combat balance doesn't require the animation to run at all** — you can call `resolveCombat()` in bulk for tuning without ever touching the playback code.

---

## 9. Open Questions — RESOLVED (2026-07-05)

### 9.1 Setting & Working Title
**Xianxia fantasy** — cultivators, immortals, sects, spirit beasts. Working title: **Fallen Immortal** (placeholder, echoes the FallenSword heritage; rename freely later).

This choice reflavors several core systems without changing their mechanics:

| Generic system | Xianxia flavor |
|---|---|
| Levels / XP | Cultivation realms & stages (e.g. Qi Condensation 1–9 → Foundation Establishment → Core Formation → …) — progress bar is "cultivation progress toward breakthrough" |
| Stamina | Spiritual Energy (Qi) — spent to move, fight, and activate techniques; regenerates on wall-clock time ("passive cultivation") |
| Gold | Spirit Stones |
| Gear | Artifacts / treasures (still degrade, still repaired — "artifact maintenance") |
| Skills / buffs | Techniques (Offense/Defense/Special categories map cleanly) |
| Guild / Warband stub | Sect — hireable NPC fellow disciples grant sect-style buffs |
| Monsters | Demonic beasts, rogue cultivators, spirits |
| Legendary Creatures | Ancient Terrors / calamity beasts |
| Auction House | Treasure Pavilion — same MarketProvider design, xianxia skin |

**Key design note:** realm-based leveling natively delivers the intended pacing — early stages break through quickly, later realms demand exponentially more cultivation progress, better artifacts, and technique investment. The XP curve should be authored per-realm, not as one smooth exponential.

### 9.2 Scope for 1.0
The long-term target is **MMO-scale content** (this is a fake-MMO that should eventually feel like a big world), with grindy pacing: fast early progression that deliberately slows, pushing players toward gear hunting and realm breakthroughs. The 8–15 zone figure in Stage 3 is a floor, not a ceiling — revisit once pacing data exists.

**Immediate commitment: start with 2 zones** to validate the core loop and pacing model before committing to full content breadth. Stage 0/1 scope is unchanged; Stage 2's "2–3 zones" becomes these first 2 zones done properly.

### 9.3 Stamina Regen
**Wall-clock based** (per Architecture Notes §6 recommendation) — `Date.now()` against last-seen timestamp, regen accrues while the game is closed. Fits both the genre's check-in loop and the cultivation flavor ("your Qi recovers while you meditate away from the screen").

### 9.4 Art Direction
**Text/geometric UI** — clean CSS panels, iconography, rarity-colored text; no sprite art through 1.0. Art can be layered on later without rework.
