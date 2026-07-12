# Genre View — "the genre proves this works and we're leaving depth on the table"

**Author:** Analyst-Genre. Phase 2 of 3 (comparison). Evaluates every tension/idea from `00-brief.md`
through the lens: the wider genre (browser MMORPGs, idle/incremental, xianxia cultivation) has
battle-tested retention and depth mechanics we don't have, and clinging to lineage-fidelity for its
own sake risks a thinner game than the one we could build inside our own constraints. I name what we're
**missing**, argue the upside, and am explicit about the 2-3 places I expect Analyst-Lineage to push
back hardest. Where the genre evidence is weak, or an idea breaks a pillar/hard constraint, I say
REJECT/ADAPT/DEFER-2.0 rather than force an ADOPT — this is advocacy for evolution, not reflexive
expansion.

**Sources read in full:** `00-brief.md`; Sprint 1 (`10-core-mechanics.md`, `20-meta-systems.md`,
`40-next-steps.md`); Sprint 2 (`10-direct-neighbors.md`, `20-idle-incremental.md`,
`30-xianxia-cultivation.md`, `50-synthesis.md`); `PROJECT.md`. Re-read `js/ascension.js` and the
`tickQi`/`tickStone` wall-clock functions in `js/game.js` directly to confirm two load-bearing "current
state" claims (flat `+8%`-per-tier Ascension with no currency-spend layer; Qi/stone offline accrual has
no duration cap — only an implicit ceiling via `MAX_QI`/card caps, not a Melvor-style 24h window).

---

## Stance

Sprint 1's own verdict is that Fallen Immortal is "already a faithful, well-executed FallenSword-shaped
game" — true, and worth protecting. But three independent genre clusters (direct neighbors, idle/
incremental, xianxia) converge on ideas that sit in exactly the spots our own two source docs identify
as *empty*: prestige depth beyond a flat scalar, breakthrough tension, an investable retention loop, and
an explicit offline-progression cap. These aren't genre novelties bolted on for their own sake — they're
proven answers to problems FallenSword itself never had to solve *because it was a live, populated,
monetized MMO* (it can paper over prestige shallowness with a huge live population and GvG; we can't).
An offline single-player game needs the mechanic to *carry the weight* an FS-style social/economic layer
would otherwise carry. That's the case for adoption: not "the genre did it, so we should," but "our
FS-lineage identity, taken alone, under-provides exactly the kind of long-tail depth an offline solo
game needs to not go thin after the third or fourth session." Where the genre case is weak (paid-currency
monetization, guild-vs-guild, merged HP/stamina, full-wipe prestige) I say so and reject it — adoption
isn't the default, it's earned per item.

---

## Part 1 — The 8 known tensions

### 1. Session-gate identity: Qi spend-and-deplete gate vs. idle's no-gate model; uncapped offline Qi/stone regen vs. Melvor's 24h cap

**Two separable questions here — I split my verdict.**

**1a. Should we drop or soften the Qi gate itself (idle-genre "no gate" model)?**
**REJECT.** Melvor Idle and the pure incrementals (Antimatter Dimensions, Kittens Game, Realm Grinder)
have no session-gating resource at all — you pick an action and it runs until you stop it or time
passes. That's a real, successful design point, but it's a *different bet*: those games are asking
"how much real time has passed," not "what will you choose to do in this sitting." Our own pillar
("sessions, not marathons," Qi *is* the session-length lever per PROJECT.md) is the load-bearing design
identity here, and Sprint 2's own synthesis independently names this as "a deliberate FallenSword-
lineage choice, not a genre default" — i.e. even the pro-genre research explicitly frames dropping the
gate as *not* what the evidence recommends. I'm not going to manufacture a case for something the
genre survey itself flags as orthogonal to our identity. This is the one place in this doc where I
agree with what I expect Lineage's position to be — no disagreement to litigate.

**1b. Should offline Qi/stone accrual get a duration cap (Melvor's 24h precedent), given ours is
currently uncapped in duration (confirmed by direct code read: `tickQi`/`tickStone` in `js/game.js`
compute `gained` from raw wall-clock delta with no cap on the delta itself — the only ceiling is the
implicit `MAX_QI`/stone-cap constants, which a week-long absence will hit and then just idle at, not
"lose" anything, but also gain nothing past the cap for the remaining absence)?**
**ADOPT.** This is the sharper, more useful half of tension 1, and genre-proven independently by Melvor
Idle (hard 24h cap, uniform across every subsystem including side-modes) and Idle Slayer (duration
uncapped but *rate* capped at 90%) — i.e. even the game at the "generous" end of the spectrum still
throttles something. Here's the case for us specifically: our Qi ceiling already does the capping
implicitly (you can't bank more than `MAX_QI`), so in practice a returning player already gets "whatever
fits in the tank," not literally infinite catch-up. The place this actually bites is **spirit-stone
passive income** (`tickStones`, Alchemist-disciple stones/hour), which has no natural ceiling the way Qi
does — a month-long absence currently pays out a month of stones, uncapped, which is a bigger "let it
cook" exploit than Qi ever is. Capping *that* specifically (a generous cap, e.g. 72h, matching Sprint-1's
own C2 mailbox-expiry precedent for "generous but real") closes an actual economy-balance gap without
touching the Qi-gate identity question at all. **Effort S, `game.js` (single-owner constant + timestamp
math already in place, no schema change).**
**Expect disagreement with Lineage here:** I anticipate Lineage will argue any offline cap cuts against
our "offline-complete" pillar (a stated design pillar, not just an idle-genre nice-to-have) and that a
week-away player shouldn't come back to a diminished-feeling game. My counter: a *cap*, not a *penalty*
— nobody loses anything, they just stop *gaining* past a generous window, exactly Melvor's shape. This
is a genuinely arguable point and I'll message Lineage directly on it (see cross-talk below).

### 2. Prestige depth: flat +8%/tier Ascension vs. "prestige currency buys permanent chosen unlocks"

**ADOPT — this is my strongest single push in this entire document.**

Confirmed by direct read of `js/ascension.js`: `performAscension` wipes level/stats/gear/techniques/
meridians, keeps collections, and grants `player.ascension += 1` feeding a flat `ASCENSION_STAT_PER_TIER`
scalar (`ascensionBonusPct`) — no other output. There is no currency, no choice, no "what did that
ascension *buy* me" beyond a bigger number on the same axis every stat already scales on. This is the
single most load-bearing finding across *both* research sprints: three independent genre clusters
converge on "prestige currency buys permanent, chosen, cross-run unlocks" — Kingdom of Loathing's Karma
(best-sourced: "perm" a skill for 100 Karma, permanently unlocked across all future runs), Idle
Cultivation's tribulation-tier-scaled Soul Power, and Trimps' Helium→Perks. None of these three games
know about each other's design, and none of them know about FallenSword. That's real convergent
evidence, not a single studio's idiosyncrasy.

**Why this specifically matters for an offline solo game and not just "more numbers":** FallenSword's
prestige-adjacent depth (to the extent Sprint 1 found any — it found *none*, Ascension has no confirmed
FS ancestor at all) never had to answer "what makes ascending again feel different from the first time,"
because FS's actual endgame retention comes from guilds, PvP rating, and a live market — none of which
we have or should fake. Our Ascension is currently the *only* long-tail systemic hook after Core
Formation 9, and today it's "the same run, but the number is 8% bigger." A currency-and-choice layer
gives repeat-Ascension players an actual decision instead of a rubber stamp.

**Concrete proposal shape (evaluative, not build-spec per the brief's Phase-2 scope):** on each
ascension, in addition to the flat scalar, grant a small amount of a new prestige currency (e.g. "Karmic
Insight" or similar flavor) scaled to *how far/how well* the run went (echoing Idle Cultivation's
"tribulations survived," not just "did you hit the level cap") — spendable in the same Ascension modal
on a short, curated list of permanent, chosen unlocks: perma-unlock a Meridian node without re-earning
it every run, perma-learn one technique across resets, or a small perma-stat bump. This slots into the
exact same "keeps collections" precedent `ascension.js`'s header comment already establishes — it's not
a new category of thing, it's a new *kind* of kept thing.

**Effort M-L** — touches `ascension.js` and `progression.js` (both single-owner; needs lead sign-off
per PROJECT.md), needs a `tools/balance.mjs` pass since it changes long-run power growth, and the exact
"what's on the shopping list" content is more a Phase-3 design question than something to spec here.
**Guardrail I volunteer myself, unprompted:** Antimatter Dimensions' lesson (a second prestige *tier*
should change *what the player optimizes*, not just add a bigger multiplier) argues against ever adding
a *third* stacked reset tier on top of Ascension for its own sake — that's a DEFER-2.0-shaped idea at
best, low priority, not something I'm pushing. The currency-and-choice layer is a depth add to the
**existing single tier**, not a new tier — an important distinction Phase 3 should keep clean.
**Expect disagreement with Lineage here:** I expect this is the tension where Lineage is most likely to
argue "our Ascension is deliberately simple — `numbers you can read` extends to prestige too, and a
shopping-list-of-permanent-unlocks is exactly the kind of scope creep CLAUDE.md's `readiness gate`
warns about for a single-owner file." I'll make the counter-case directly to them (see cross-talk) that
a short, curated list (3-5 items, not an open tree) keeps this legible while still being a real choice.

### 3. Progression tension: silent XP-threshold breakthroughs (zero risk, no alchemy roll) vs. cultivation tribulations (risky %-breakthrough + pity) and decoupled reward-vs-odds

**ADAPT — strongly in favor of adoption, but the shape must be opt-in and the % must be shown. This is
likely the single sharpest disagreement with Lineage in the whole document, and I want to make my
strongest case for it.**

Confirmed directly (Sprint 1 + the brief's own baseline check of our code): `progression.js` gates
every realm breakthrough purely by an XP-cost curve — "enough XP → auto-advance," zero failure chance,
zero event, zero material gate. `alchemy.js` pills are fully deterministic crafts, no success/fail roll
anywhere. This is not a minor gap — it's the exact spot where **every** cultivation game in Cluster C
builds its whole "fast early → deliberately slows" curve, which is GDD §9.1's own stated design goal for
realm pacing. We have the *cost* half of that curve (the ~10x XP spike at realm barriers) but none of the
*tension* half. Immortal Taoists' tribulation (risky %-success breakthrough, failure costs banked
progress but *raises* the next attempt's odds — a self-correcting pity, not a hard wall) and Tale of
Immortal's decoupled reward-vs-odds (Treasures determine what you gain, Materials determine whether you
succeed) are both concrete, well-evidenced answers to "how do you make a level-up moment feel like
something happened" rather than a number silently ticking over.

**Why I think this is worth the fight, not just a nice-to-have:** our breakthroughs are currently the
least *felt* moment in the entire progression stack — everything else (gear drops, card acquisitions,
boss kills, quest completions) has a moment of resolution; hitting a realm barrier does not. A genre
that has independently converged on "make this an event" across multiple, unrelated titles is strong
evidence this is a real design gap, not a stylistic preference.

**The guardrail that makes this constraint-compatible (I raise this myself, not because the Critic
will):** any %-success roll into progression is only compatible with our "numbers you can read, not
hidden-RNG theater" pillar if the percentage is **displayed to the player before they commit** — exactly
like our shown hit-chance in combat, never a silent roll. This does **not** touch `combat.js` (the pure
resolver stays untouched — this is a `progression.js`-side event, a different caller of `rng.js`, not a
combat mechanic). It also must pick a buff pathway deliberately if pills are wired to affect odds — Sprint
2's synthesis already flags the `activeBuffs`/`pillBuffs` dual-pathway landmine, and I agree it's real.

**My actual recommended shape, to make this land as ADAPT rather than a raw ADOPT of tribulation-as-
mandatory-gate:** don't make the roll unconditional. Keep the current silent auto-advance as the *safe
default* once XP is banked — that preserves the "zero risk, always eventually get there" promise Lineage
correctly values for a solo game with no market/guild safety net to bail out an unlucky player. Layer an
**optional early-breakthrough attempt** on top: once some threshold below full XP is reached, the player
may *choose* to attempt an early, transparent-%, reduced-cost breakthrough for a small bonus (a Tale-of-
Immortal-style extra Treasure) at the risk of losing some banked progress on failure (Immortal-Taoists-
style pity: each failure raises the next attempt's shown %). This is opt-in risk for opt-in reward, not a
mandatory RNG wall blocking a story-critical capstone quest — it should not gate anything the two named
sagas (Heaven-Severing Blade, Stormcrown Mythic) depend on. **Effort M-L**, touches `progression.js`
(single-owner, needs lead sign-off) and possibly `alchemy.js` (an odds-boosting pill use-case, deliberately
choosing the `effectiveStats`-adjacent pathway, not the `pillBuffs` fight-time-only one, so the effect
persists through the breakthrough-attempt UI rather than needing an active fight). Needs a
`tools/balance.mjs` pass for the XP-economy rows.

**Cross-talk flag:** I will message Analyst-Lineage directly on this one — I expect they'll want a flat
REJECT ("we deliberately built zero-risk progression, adding *any* RNG to it — even opt-in, even
transparent — is a pillar violation, not a depth add"), and I want to push back with the opt-in framing
before we hand the lead two flatly opposed verdicts.

### 4. Respec: absent in ours; present in FS (paid) and Trimps (per-cycle)

**ADOPT.** Sprint 1's own A3 opportunity already recommends this from the FS-fidelity angle (GDD §6.3
proposed it, never built); Trimps' "one free respec per prestige cycle, paid/scarce beyond that" is an
independent, well-tested genre precedent for exactly the shape a spirit-stone-gated respec should take —
free-ish early, scarce/costed as a repeat convenience. I don't expect real disagreement here; this is a
case where FS-fidelity and genre-evidence point the same direction, which is exactly the kind of item
that should converge cleanly. **Effort S**, `progression.js` (single-owner, lead sign-off), stone-cost
scaling with points invested, `tools/balance.mjs` gate to confirm the sink doesn't distort the economy
Researcher-Meta already flagged as shared territory.

### 5. Combat push-through tiers: FS 40/60 + Gladiatus mode-caps

**ADOPT.** Independently confirmed twice now — FS's own 40/60-stamina tiers (Sprint 1) *and* Gladiatus's
per-mode round caps (20 Expeditions / 15 Arena / unlimited Dungeons, Sprint 2) both validate this as a
well-trodden, not speculative, genre pattern. This is Sprint-1's B1, parameterizing `MAX_TURNS` as a
`resolveCombat` argument rather than a module constant — respects the pure-function constraint exactly
(the cap is passed in, not hard-coded), so there's no constraint tension to litigate. **Effort S.**

### 6. Retention loop: Cards/Beast-Codex/Titles vs. investable drop-rate (FS Find Item), collection depth

**ADOPT.** FS's "Find Item" skill (+0.1%/point drop rate) is the one concrete genre mechanic that turns a
collection system from a passive record into something you can *invest in* — and notably this isn't even
a "the wider genre proves it," it's FS's *own* mechanic that we simply never ported despite building a
faithful Beast Codex. Our card/drop chances are entirely static today. This is a small, additive plug-in
to an *existing* passive-source pipeline (a Meridian node, technique, or Alchemy pill bumping card- or
drop-chance), not a new system. **Effort M**, needs coordination on whichever module ends up owning the
bonus-type enum (flagged by Sprint 1 as a cross-talk item already, not new territory).

### 7. Economy fidelity: bound items, mailbox expiry, offline-income caps

**Three sub-items, three verdicts:**
- **Bound items — ADOPT.** Capstone named rewards (Heaven-Severing Blade, Stormcrown Mythic) currently
  sellable on the Pavilion undermines their weight; FS explicitly walls off bound/guild-tagged items from
  auction, and this is Sprint-1's own A2. Clean, additive, no disagreement expected. **Effort S.**
- **Mailbox expiry — ADAPT.** FS's real 12-hour window creates genuine "check back in or lose it" stakes;
  a literal 12h port would punish an offline-friendly game's own core promise. Sprint-1's C2 already
  lands on the right answer: a generous 48-72h window, wall-clock/offline-safe, that reintroduces *some*
  stakes without contradicting "never punish a week away." I'm endorsing the adapted version, not the raw
  FS number. **Effort M.**
- **Offline-income caps — ADOPT**, same reasoning and same fix as tension 1b above (the stone-tick
  duration cap) — not a separate item, just restating it here since the brief lists it under economy too.

### 8. Positioning: Fallen Sword II ships Q3 2026 (turn-based, six classes, guild-vs-Titans)

Not a mechanic verdict, but the brief asks for a stance. **My read: differentiate, don't chase.** FS2 is
explicitly leaning further into live-service/social territory (guild-vs-Titans is a multiplayer-stakes
feature we've correctly scoped as DEFER-2.0 across both research sprints). If we spend our limited scope
trying to track FS2 feature-for-feature, we're competing on the one axis (live population, social stakes)
where a solo dev offline game structurally cannot win. The genre survey's actual contribution to this
question is: our real differentiators — offline-complete, no-monetization, transparent-math, xianxia
flavor — are *also* the exact axes where the wider genre's best-regarded titles (Melvor's "numbers you
can read" formula-publishing, Eldevin's "paid never buys power" stance even as FS's own sister-studio
product) earn their strongest reputations. Leaning into genre-proven **depth** (prestige currency,
breakthrough tension, investable retention) *is* the differentiation from FS2, not a hedge against it —
FS2 is turn-based-and-social; we can be transparent-math-and-deep-solo. I don't expect Lineage to
disagree with the *direction* here, only possibly with how much genre-adoption is required to get there,
which is really tensions 2 and 3 again, not a new fight.

---

## Part 2 — Sprint-1 opportunities (A/B/C tiers)

| Item | Verdict | Reasoning | Effort | Module/pillar |
|---|---|---|---|---|
| **A1** Retune Qi regen toward FS's 50-90/hr band | **ADAPT** | I don't think blind FS-number-fidelity is the right target for a genre analyst — the *design goal* (make the buff-or-save-Qi tension in GDD §6.4 actually bite) matters more than matching FS's specific historical rate. Idle-genre evidence is mixed here: some idle titles have no gate at all (irrelevant to us per tension 1a), but none of them argue for a *specific* rate — that's purely an FS-fidelity argument, not a genre one. Tune via `tools/balance.mjs` to the point where technique/pill costs create a real decision, and stop there; don't treat FS's number as sacred. | M | `game.js` (single constant), balance-harness gate |
| **A2** `bound` field + reject in `listItem()` | **ADOPT** | Closes a real fidelity gap; no genre tension. | S | `items.js` + `market.js` |
| **A3** Spirit-stone stat respec | **ADOPT** | Reinforced independently by Trimps' per-cycle respec (see tension 4). | S | `progression.js` (single-owner) |
| **B1** 40/60-Qi push-through tier | **ADOPT** | Doubly genre-confirmed (FS + Gladiatus, see tension 5). | S | `combat.js` (parameterized), `game.js` |
| **B2** Investable "Find Item"-style drop lever | **ADOPT** | See tension 6. | M | Meridian/technique/pill bonus-type owner |
| **B3** Distinct FS-flavored "Hell Forge" (permanent, capped-uses, alongside sockets) | **REJECT (as framed) / ADAPT (folded into existing sinks)** | This is the one Sprint-1 idea I push back on hardest as a genre analyst. It's motivated by FS-fidelity alone — no wider-genre neighbor validates "add a fourth parallel gear-power-up sink" as a retention-improving pattern; if anything, the genre pattern (Melvor, Eldevin, most idle titles) favors *consolidating* gear progression into fewer, deeper sinks rather than stacking parallel ones for their own sake. Also FS's own rarity-ladder ordering that would inform "where Hell Forge sits" is itself flagged [UNVERIFIED] by Sprint 1. I'd rather see the reforge/upgrade/salvage triad deepened (e.g. add a scaling-with-level flat-stat step to `upgradeItem`'s existing curve) than stand up a new parallel system. | M | `items.js` (if adapted into existing systems, not new) |
| **B4** Gear-normalized "Arena" sparring variant | **ADOPT** | Provider-safe (bracket-capped copy inside `duel.js`, never touches `combat.js` purity), and sets up the FS-genre-standard "gear-race vs. build-expression PvP" split for whenever 2.0 PvP exists. Low urgency but no reason to defer the low-risk prep work. | M | `duel.js` |
| **C1** "Combat Unresolved" copy | **ADOPT** | Trivial, no tension. | S | `combatfx.js`/`toast.js` |
| **C2** Mailbox expiry (generous window) | **ADOPT** (see tension 7) | — | M | `market.js` |
| **C3** Level-range filter on Pavilion | **ADOPT** | Trivial UX parity. | S | `market.js` |
| **C4** Split Rivals into Favored/Marked | **ADOPT** | Low-stakes flavor fidelity; also echoes the wider genre's near-universal ally/enemy-shaped social list convention (Torn, FS itself). | S | `profile.js` |
| **C5** Per-zone Beast Codex completion reward | **ADOPT** | Converts a passive record into an explicit goal — exactly the "investable collection" instinct behind tension 6, at near-zero cost. | S | `ui.js` codex section |
| **C6** Longevity-flavored achievements | **ADOPT** | Genre-convergent single-player substitute for FS Medals' leaderboard-longevity *and* the idle genre's "come back tomorrow" retention hooks — cheap, high alignment with "leaving retention depth on the table" being my whole thesis. | S | `achievements.js` |
| **C7** Small capped combat-stat Sect specialty + capacity scaling | **ADOPT** | FS relics/guild-structures grant real combat stats, not just economy buffs — our Sect currently grants zero. A small, capped addition (explicitly smaller than gear/cards, per Sprint-1's own framing) closes this without unbalancing gearing decisions. Sect capacity scaling with ascension/achievements also gives the Sect a long-term investment arc, mirroring Gladiatus/Outwar's "bigger guild = more power" shape at solo scale. | S/M | `guild.js`, coordinate on `progression.js` pipeline touch |
| **Tier D** (buff caster/target field, `recentlyActive()` shape stability, GvG/relics/Global-Quest leaderboards) | **DEFER-2.0** | Correctly gated on real multiplayer per the brief's own taxonomy — I agree with Sprint 1's framing outright, nothing to add. | — | provider-interface era |

---

## Part 3 — Sprint-2 transferable ideas (cross-cluster + notable cluster-specific items)

### 3a. The cross-cluster consolidated table (from `50-synthesis.md`)

| Idea | Verdict | Reasoning | Effort | Module |
|---|---|---|---|---|
| Prestige currency → permanent chosen unlocks | **ADOPT** | See tension 2 — my centerpiece push. | M-L | `ascension.js` |
| Second prestige tier that changes *what matters* | **DEFER-2.0-adjacent / not now** | Genre-sound principle (Antimatter Dimensions), but we don't have a first-tier-depth problem to solve with a *second tier* yet — deepen the existing Ascension first (the currency-unlock idea above); a true second tier is a bigger, later, likely post-1.0 conversation once the currency layer has been played with. Not rejecting the idea, just sequencing it after its prerequisite. | L | `ascension.js` (future) |
| Risky %-success breakthrough w/ pity | **ADAPT** | See tension 3 — opt-in, transparent-%, doesn't gate the two capstone sagas. | M-L | `progression.js` |
| Decouple breakthrough reward from odds | **ADAPT** | Folds into the same opt-in-breakthrough shape as tension 3 — Treasures/Materials-style split is a reasonable *internal* structure for the odds-vs-reward inputs, not a separate feature. | M | `progression.js` + `alchemy.js` |
| Opt-in harder-run-for-more-reward (KoL Hardcore) | **DEFER (not now)** | Same underlying lever as tension 3's tribulation risk (per Sprint-2's own "one theme, two ends" framing) — once the opt-in breakthrough-risk system exists, this is a natural extension (opt into harsher Ascension terms for more prestige currency), but it's additive complexity on top of an already-nontrivial change; sequence after, don't bundle in. | M | `ascension.js` |
| Free respec per prestige cycle, paid beyond | **ADOPT** | See tension 4 / Sprint-1 A3. | S | `progression.js` |
| Mode-varying turn caps | **ADOPT** | See tension 5 / Sprint-1 B1. | S | `combat.js` arg |
| Bank vs. cash-on-hand death-penalty split | **ADOPT** | Improbable Island's bank/cash split gives players real agency over `DEATH_STONE_LOSS` exposure without softening the penalty's actual harshness — a genuinely good idea I hadn't seen flagged elsewhere in either sprint's tension list, and it's additive (a new spirit-stone storage split, no VERSION bump). Worth calling out explicitly since it's easy to undercount relative to the louder prestige/breakthrough items. | S-M | `game.js` |
| Alchemy as a trainable skill (yield%/success% scaling) | **ADAPT** | Amazing Cultivation Simulator's model (skill level → +yield%/+success%) is a good shape, but I'd fold the "success%" half into the same opt-in-risk framing as tension 3 rather than add it as an unrelated third RNG surface in the game (breakthroughs, and now also alchemy, both rolling independently is more surfaces than the pillar wants) — make alchemy skill level a *lever that improves breakthrough odds* specifically (tension 3's material/pill input), not a separate craft-success roll bolted onto `alchemy.js` in isolation. | M | `alchemy.js` |
| Reputation-gated Sect branches | **ADOPT** | Deepens Sect without needing a live population — directly answers "our Sect is flat, ACS's is a real system" with a single-player-safe mechanism (reputation thresholds unlocking capability tiers, not contested resources). | M | `guild.js` |
| Offline-progression cap/rate throttle | **ADOPT** | See tension 1b. | S | `game.js` |
| "Happy"-style training-efficiency brake | **REJECT** | Torn's own cluster doc already flags this as lower-leverage than fixing the root Qi-rate issue (A1) — I agree. Adding a *second* braking mechanism before even confirming the first one (Qi rate) is tuned right is solving a problem we haven't verified exists yet, and adds a resource-complexity axis against our "numbers you can read" simplicity pillar (Torn's own three-resource model is explicitly the complexity end of the spectrum, not something to partially import). | — | `game.js` |
| Paid energy-refill (Xanax/LSD) | **REJECT** | No monetization surface; not even a close call. | — | — |
| Gacha companion pulls / VIP | **REJECT** | Same — not a close call, and Immortal Taoists' own community sentiment ("god awful" monetization) is itself a cautionary data point, not just an out-of-scope one. | — | — |
| Inter-sect "Sect Power" conflict | **DEFER-2.0** | Needs a live rival faction to mean anything; correctly gated. | — | `guild.js` (2.0) |

### 3b. Notable cluster-specific items not captured in the consolidated table

| Idea | Game | Verdict | Reasoning | Effort | Module |
|---|---|---|---|---|---|
| "Paid buys convenience/cosmetic, never power" monetization stance | Eldevin | **ADOPT (as a stance, no code)** | Not actionable today (no monetization surface exists or is planned), but worth formally recording as our own committed future-monetization stance rather than leaving it undecided — Eldevin is a decade-plus live proof this sustains a genre-sibling MMO, and it's literally the same studio that made FallenSword choosing this path for their next game. Zero code impact, pure policy statement for whenever (if ever) a monetization conversation happens post-1.0. | — | policy note only |
| Fair-Fight-style "closer stats = better reward" PvP multiplier | Torn | **DEFER-2.0** | Only meaningful once sparring has real stakes; correctly deferred per GDD's own "PvP cut for 1.0" scope. Agree with Sprint-2's own framing. | — | `duel.js` (2.0) |
| PvP-loss strips a real stake (XP) | Outwar | **DEFER-2.0** | Same reasoning. | — | `duel.js` (2.0) |
| In-combat resource throttling (regen slows during a fight) | Eldevin | **REJECT (redundant)** | Already effectively covered by our per-turn Qi spend during combat — adding a second throttle on top would be double-dipping the same design goal, not a new lever. | — | — |
| Dual-sourced (grindable + buyable) premium currency | Sryth | **DEFER (awareness only)** | Not actionable — no monetization surface exists. Worth remembering as a softer shape than a pure paywall *if* that conversation ever happens, nothing more. | — | future monetization (if any) |
| Two-tier disciple system (nameless "outer" labor pool + named "inner" disciples) | ACS, Idle Cultivation | **ADAPT** | Genuinely interesting deepening for Sect Dispatch — a larger, nameless "outer disciple" labor pool feeding missions, distinct from the named hireable roster — but it's additive complexity on a module (`guild.js`) that's currently a clean, contained stub; I'd sequence this well after the reputation-gated-branches idea above, not alongside it, so `guild.js` doesn't take two structural changes in one pass. | M | `guild.js` |
| Named "Dao" as a single build-identity choice | Idle Xanxia, xiuzhen idle | **REJECT (for 1.0 scope)** | Appealing flavor idea (declare "what kind of cultivator you are" as a single top-level choice), but retrofitting a build-identity axis on top of an already-shipped Meridian tree + technique-category system this late is a structural rework, not an addition — the kind of thing that should be a from-the-start design decision, not bolted onto Stage-3-complete content. Flagging as a genuine "no" rather than soft-pedaling it: the genre case is real but the retrofit cost here is too high for what it buys. | L | `meridians.js`/`techniques.js` |
| Passive prestige-currency trickle without resetting | Kittens Game (Paragon) | **REJECT** | Directly undercuts the incentive to actually Ascend, which is the opposite of what tension 2's currency-and-choice layer is trying to achieve (make Ascension feel like a real decision with real payoff) — a background trickle that requires no decision is the shallow-idle-game failure mode, not a depth add. Sprint 2's own doc flags this as needing "real design scrutiny," and on scrutiny I land on reject. | — | — |
| Explicit "time to first clear" pacing target per prestige layer | Antimatter Dimensions | **ADOPT (as a design discipline, not a mechanic)** | Not a feature to build — a practice to adopt: when the Ascension-currency-unlock layer (tension 2) is scoped in Phase 3, state an explicit target for "how long until a player has enough currency for their first meaningful unlock," the same way GDD §9.1 already states a target curve for realm pacing. Costs nothing, prevents the depth-add from accidentally becoming either trivial or grindy by accident. | — | design process note |
| Survivability-style stat that only matters while unattended | Legends of IdleOn, Idle Champions | **REJECT** | The underlying philosophy (reward active play over idling) is close to inverted from our own "sessions, not marathons, Qi gates active play" pillar — IdleOn is solving "make idling safe," we're solving "make active sessions meaningful and bounded." Importing this would be importing the opposite design problem. | — | — |
| Discrete "floor"/tower ladder as a milestone counter | Idle Xanxia | **REJECT** | Redundant with our existing legible realm-ladder (QC→FE→CF) + zone structure; would be a second counter measuring approximately the same thing. | — | — |
| Shared, spendable guild/crew treasury (a real cooperative pot members fund and draw from, not just a buff generator) | Outwar | **DEFER-2.0** | Needs a genuine second contributing player to mean anything; faking it with our single hireable-NPC Sect would just be a reskinned personal currency sink, not a cooperative mechanic. Correctly out of bounds per Critic3's flag — agreeing explicitly rather than leaving it uncovered. | — | `guild.js` (2.0) |
| Recurring subscription monetization ("Preferred Player") | Outwar | **REJECT** | No monetization surface exists or is planned; a third monetization archetype in this cluster, none of which are actionable for us. | — | — |

---

## Cross-talk summary (for the lead and for Analyst-Lineage directly)

I'm messaging Analyst-Lineage now on the three tensions where I expect genuine, load-bearing
disagreement rather than just different emphasis:

1. **Tension 3 (progression risk/tribulation)** — I expect a flat REJECT from Lineage on principle
   ("zero-risk progression was a deliberate choice, don't add any RNG to it"); I'm arguing ADAPT via an
   **opt-in**, transparent-%, capstone-quest-exempt early-breakthrough mechanic. This is the sharpest
   likely conflict in the whole document.
2. **Tension 1b (offline-accrual duration cap)** — I expect Lineage to weigh our "offline-complete"
   pillar against any cap; I'm arguing the cap only needs to bite the *uncapped* stone-income tail (Qi
   already self-caps via `MAX_QI`), so it's a narrower ask than "cap everything Melvor-style."
3. **Tension 2 (prestige currency-and-choice layer)** — I expect Lineage may accept the *principle* but
   push for something thinner than a shopping list of unlocks, worried about single-owner-file scope
   creep in `ascension.js`/`progression.js`. I've pre-committed to a short, curated list (3-5 items) to
   keep this from ballooning, and explicitly ruled out a third prestige *tier* to keep scope bounded.

Will report back to the lead with the resolution (or documented non-resolution) of these three once
Lineage responds.
