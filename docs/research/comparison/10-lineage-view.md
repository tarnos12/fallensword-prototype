# Lineage View — "Protect what makes us US"

**Author:** Analyst-Lineage. Lens: our design pillars + FallenSword ancestry are the asset, not a
constraint to route around. For every candidate I ask: *does adopting this genre convention erode
numbers-you-can-read combat, sessions-not-marathons (the Qi gate), or offline-complete/online-ready?*
Where the answer is genuinely no — or the idea actively *strengthens* the lineage — I say ADOPT. I am
not reflexively conservative; three of the sharpest calls below (tribulation-style breakthroughs, the
Qi regen retune, bound items) are ADOPT precisely because they make our identity *more* itself, not
less. Where the answer is yes, I say so plainly and expect Analyst-Genre to push back.

## Stance in one paragraph

Fallen Immortal's whole value proposition is that it's the FallenSword-shaped game you can finish a
session of during a lunch break, understand every number in, and never worry about a subscription or a
whale wall. The wider genre survey (Sprint 2) is useful precisely *because* it shows how rarely that
combination is chosen deliberately — Melvor drops the stamina gate, Torn/Gladiatus/Idle Champions
monetize the gate, most idle games have no gate at all. Every tension below is really the same
question wearing different clothes: **does this convention exist because it's genre-proven good design,
or because those games have different constraints (a live population, a monetization need, a server) that
we don't share and shouldn't manufacture?** I ADOPT ideas that are good design regardless of population
size. I REJECT ideas that only make sense with a population, a wallet, or a live economy behind them.

---

## The 8 known tensions

### 1. Session-gate identity — Qi spend-and-deplete vs. idle no-gate; uncapped offline regen vs. Melvor's 24h cap
**Two sub-questions, two different verdicts.**

**1a. Keep the Qi gate itself.** **REJECT** softening or removing it. This is the single sharpest
disagreement I expect with Analyst-Genre, and I want to be explicit about why it isn't just inertia:
Melvor Idle *validates* the gateless model, but Melvor is not solving our problem — it's a
persistent-login idle game with no "sessions, not marathons" pillar to protect. PROJECT.md names the Qi
gate as one of three pillars, not an implementation detail. Removing it doesn't make us a better idle
game, it makes us a worse version of Melvor while giving up what makes us *us*. Effort: N/A (this is a
refuse-to-change, not a build). Touches: the core identity, `game.js`.

**1b. Retune the regen RATE toward FS's sourced range.** **ADOPT**, and this is Tier A in Sprint 1 for a
reason. I verified it directly: `js/game.js` line 58-59 — `MAX_QI = 120`, `QI_REGEN_MS = 3_000` → 1200
Qi/hour, against FS's sourced 50-90/hour. At 1200/hr the gate is *nominally* present but functionally
inert — a full pool refills in six minutes. This isn't a genre-convention question at all, it's our own
pillar failing to land because of a placeholder number the code itself flags as temporary. Fixing this
is the highest-leverage thing in this entire comparison for *protecting* the session-gate identity,
not eroding it. Effort: M (`tools/balance.mjs` gate, single constant in `game.js`).

**1c. Offline cap on Qi/stone regen.** Here I want to correct the tension as stated in the brief: **Qi
itself is already effectively capped**, just via a different mechanism than Melvor's. `tickQi`
(`game.js:372-377`) is clamped at `maxQi()` — once the pool is full, no more Qi accrues, offline or not.
That's functionally the same *idea* as Melvor's "one cap, applied everywhere" (confirmed independently
by Sprint 2's idle-cluster doc: "we already cap implicitly via `MAX_QI`"). So there's no real gap on Qi
specifically. The genuinely uncapped thing is **passive spirit-stone income** (Alchemist disciple
stones/hour, any future passive-income source) — that keeps accruing indefinitely while the game is
closed, with no ceiling at all. **ADAPT**: add a generous (48-72h, matching my C2 recommendation below)
soft cap specifically on *passive stone accrual*, not on Qi (already capped, don't re-solve a solved
problem). A generous window protects "offline-complete" (a week away shouldn't feel punished) while
closing the "let it cook for a month, come back rich" exploit a genuinely uncapped passive-income tap
invites. Effort: S. Touches `game.js`.

### 2. Prestige depth — flat Ascension (+8%/tier, keeps collections) vs. Karma-style permanent chosen unlocks / "2nd tier changes what matters"
**ADAPT.** The flat `+8%×tier` scalar (verified: `js/ascension.js` — one integer, one multiplier, applied
as "the final scalar" per its own header comment) is exactly the kind of number our "numbers you can
read" pillar wants: a player can compute their own power from four numbers. A KoL-style Karma system
that lets you *spend* a prestige currency on a big menu of permanent unlocks is real depth, but done
wrong it becomes a spreadsheet meta-game exactly the genre's own worse examples (Realm Grinder's
faction-combination math) warn against. My verdict: keep the flat scalar as the *baseline* (don't
replace it), and ADAPT the Karma idea down to something small and legible — a curated handful of
permanent, plainly-numbered unlocks (e.g., "spend 200 ascension-essence, permanently keep Meridian node
X across all future runs") rather than an open tree. This is additive to, not a replacement of, the
existing scalar, so it doesn't touch the pillar. I explicitly **REJECT** importing Antimatter
Dimensions' "2nd tier changes what matters" lesson at 1.0-scope: that pattern is proven at the scale of
games with years of accumulated systems and (per Sprint 2's own honest caveat) is easy to over-cite —
Realm Grinder's own "Ascension" tier turned out to be a technical rescale, not a design lever. Building
a second qualitatively-different prestige layer now, before 2.0 network providers exist, is scope we
don't need and it's the kind of complexity-for-its-own-sake the genre's *worst* incremental games are
guilty of. Effort: M. Touches `ascension.js`/`progression.js` (single-owner — lead sign-off).
**Expect disagreement** with Analyst-Genre here on how big the Karma layer should be.

### 3. Progression tension — silent XP-threshold breakthroughs + no-alchemy-roll vs. tribulation risky %-breakthrough + pity, decoupled reward/odds
**ADOPT — with the guardrail as a hard requirement, not a suggestion.** I want to be honest that this
is a case where my "protect the lineage" lens says *yes, take the genre idea*, because it doesn't cost
us anything and it's more xianxia-authentic than what we have. Verified against our own code: realm
breakthroughs (`progression.js`) are a pure XP-threshold auto-advance, and `alchemy.js` has zero
success/fail roll anywhere — confirmed by both Sprint 1 and Sprint 2's independent code reads. A
tribulation event (show the %, real-but-recoverable failure cost, pity that raises next-attempt odds) is
not "adopting idle-genre convention," it's filling in a gap our own xianxia flavor text has been writing
checks for since Stage 1 (breakthrough = tribulation is baked into the *name itself*). It's also a
perfect fit for the "numbers you can read" pillar specifically *because* it's the same transparent-%
pattern our `hitChance` already uses in combat — this is not new architecture, it's the existing
transparent-RNG pattern applied to a second system. **Non-negotiable condition**: the % must be
displayed before the player commits, exactly like combat hit-chance — a hidden roll here would be the
single worst violation of our identity in this entire document, turning "read the numbers" into
"hope for the best," which is precisely the hidden-RNG theater the pillar was written to reject.
Failure cost must stay gentle (consumed materials/some banked progress, never gear, never a level
regression) to match our already-deliberately-soft death penalty philosophy. Effort: M
(`progression.js`, single-owner — needs lead sign-off; balance-harness gate).

Decoupling breakthrough *reward* from breakthrough *odds* (Tale of Immortal) — **ADAPT**: gives pills a
second job (odds-boosting) beyond flat buffs, but mind the landmine Sprint 2 flagged: `pillBuffs`
deliberately bypasses `effectiveStats` (architectural choice to avoid touching `ui.js`), so an
odds-boost pathway needs to pick a lane on purpose, not accidentally create a third parallel buff list.
Effort: M.

Alchemy success/fail roll on brewing (Amazing Cultivation Simulator's skill-gated yield/success%) —
**ADAPT**, same guardrail: show the %, keep the failure cost to "wasted materials," never punishing.
Effort: M.

### 4. Respec — absent in ours; FS (paid), Trimps (free-per-cycle)
**ADOPT**, Sprint-1 A3. This is pure quality-of-life with no identity cost: a spirit-stone-scaling
respec doesn't add a new number system, it lets players fix a bad early read of an *existing* one. The
one thing I'll insist on as a lineage-protection condition: the cost must stay real enough that stat
allocation still feels like a decision with weight the first time — a free-and-frequent respec (Trimps'
literal "one free per cycle") would undercut the meaningfulness of the choice in the first place, which
is a real cost even though it looks like pure upside. My read: gate behind cultivation level (not
available from square one, matching FS's own "not a starter tool" framing) with cost scaling to points
invested, per Sprint-1's own original recommendation — not Trimps' free-every-cycle model. Effort: S.
Touches `progression.js` (single-owner, lead sign-off).

### 5. Combat push-through tiers — FS 40/60 + Gladiatus mode-caps vs. our single MAX_TURNS=20
**ADOPT.** This is a genuinely clean case: parameterize `MAX_TURNS` as a `resolveCombat` argument
(keeps the pure-function constraint intact — the cap is passed in, not hard-coded), thread a player
choice through `canAttack`/`attack`. It doesn't just avoid eroding "numbers you can read," it *improves*
it: right now a tough fight just silently draws at turn 20 with no player agency; a 20/40/60 choice
makes the Qi-cost-vs-certainty tradeoff a legible, upfront decision, which is the pillar working as
intended. Gladiatus's mode-varying caps (Sprint 2) independently confirm this is a well-trodden genre
pattern, not a speculative one. Effort: S. Touches `combat.js` (parameterization only) + `game.js`.

### 6. Retention loop — Cards/Beast-Codex/Titles vs. investable drop-rate (FS Find Item), collection depth
**ADOPT.** An investable, transparent drop-rate/card-chance bonus (a Meridian node, technique, or pill
that shows "+X% card drop chance") is additive to an existing passive-source pipeline, doesn't create a
new aggregation system, and gives the collection loop a lever players can actually pull rather than a
purely passive record. Low identity risk, meaningful retention upside. Effort: M. Coordinate on whoever
owns the bonus-type enum (flagged in both Sprint 1 §4.4/§4.2 and Sprint 2).

### 7. Economy fidelity — bound items, mailbox expiry, offline-income caps
**Bound items: ADOPT, no hesitation.** This is a case where the FS convention directly *reinforces* our
own identity rather than testing it — a capstone named item (Heaven-Severing Blade, Stormcrown Mythic)
being sellable on the Pavilion undercuts the exact epic-reward weight the quest saga was built to
deliver. Fixing this is protecting our own already-stated design intent (GDD §6.8), not importing an
alien convention. Effort: S, additive field, no VERSION bump.

**Mailbox expiry: ADAPT, not a straight port.** FS's actual number (12 hours) is a genuinely harsh
convention that exists because FS has always been a live-server game where "you'll probably be back
today" is a safe assumption; porting that number verbatim would directly violate offline-friendliness,
which is one of our three named pillars. I REJECT the 12-hour figure specifically. A generous window
(48-72h, wall-clock/offline-safe, same pattern as `LISTING_TTL_MS`) reintroduces some "check back in"
pacing without punishing a player who takes a week off — that's the adaptation, not a rejection of the
underlying idea that *some* pressure is a legitimate design lever. Effort: M.

**Offline-income caps:** covered under tension 1c above (ADAPT — cap passive stone accrual specifically,
leave Qi alone since it's already capped by pool size).

### 8. Positioning — Fallen Sword II ships Q3 2026 vs. lean into heritage or differentiate
**ADOPT differentiation, explicitly.** This is close to the thesis of this whole document. FS II is
turn-based, six classes, guild-vs-Titans, live-service, presumably monetized, presumably needs a
population to feel alive. Every one of those is either something we've deliberately cut (GvG, needs a
population) or something we structurally can't chase without becoming a worse copy of a AAA-studio
sequel with an 8-years-in-development sister-MMO behind it (Eldevin, per Sprint 2, is Hunted Cow's *own*
answer to "what comes after FS," and they dropped the stamina gate and the auction house entirely — a
strong signal that even FS's own studio doesn't think porting FS's exact shape forward is the winning
move). Our actual differentiators — offline-complete, zero monetization surface, xianxia flavor,
transparent stat-math you can literally read in the tooltip — are not consolation prizes for lacking a
server. They're the pitch. I'd frame any marketing/positioning decision as: **we are not competing with
FS II on its terms (live population, monetization, scale); we are the answer for the FS fan who wants
their lunch-break dungeon crawl to still be there in five years with no server to keep paying for.**
Effort: N/A — a framing decision for the lead/author, zero code.

---

## Sprint-1 opportunities (A/B/C tiers)

| Item | Verdict | Reasoning | Effort | Touches |
|---|---|---|---|---|
| **A1** Qi regen retune to FS's 50-90/hr band | **ADOPT** | Same as tension 1b — the single highest-leverage identity fix in the whole backlog; the pillar is currently nominal, not real | M | `game.js` |
| **A2** `bound` field, reject in `listItem()` | **ADOPT** | Same as tension 7 — protects capstone-item weight, reinforces our own stated intent | S | `items.js`, `market.js` |
| **A3** Spirit-stone stat respec | **ADOPT** | Same as tension 4 — QoL without eroding allocation-as-a-real-decision, if gated/costed correctly | S | `progression.js` |
| **B1** 40/60-Qi push-through tier | **ADOPT** | Same as tension 5 — improves legibility of the Qi-cost/certainty tradeoff | S | `combat.js`, `game.js` |
| **B2** Investable Find-Item-style drop lever | **ADOPT** | Same as tension 6 | M | bonus-type owner (coordinate) |
| **B3** Distinct "Hell Forge" system alongside sockets/reforge | **REJECT** as a new separate system | We'd have three flat-stat-upgrade mechanisms (reforge, upgrade-level, hypothetical Hell Forge) doing overlapping jobs. That's the opposite of "numbers you can read" — more parallel systems for the player to reconcile for marginal differentiated value. If more late-game gear-power-up depth is genuinely wanted, extend `upgradeItem`'s existing curve/cap rather than standing up a fourth mechanism. | — | `items.js` |
| **B4** Gear-normalized "Arena" spar variant | **ADAPT** | Provider-safe (bracket-capped stat sheet computed inside `duel.js`, `combat.js` untouched) and cheap, but low urgency while sparring stays bragging-rights-only — build only if playtest signal shows people want build-expression PvP, don't front-load it | M | `duel.js` |
| **C1** Surface "Combat Unresolved" language | **ADOPT** | Pure copy/UX, directly reinforces legibility of what just happened | S | `combatfx.js`/`toast.js` |
| **C2** Mailbox expiry window | **ADAPT** | Same as tension 7 — generous window (48-72h), not FS's harsh 12h | M | `market.js` |
| **C3** Level-range filter on Pavilion | **ADOPT** | Harmless UX parity, zero identity risk | S | `market.js` |
| **C4** Split Rivals into Favored/Marked | **ADOPT** | Cosmetic-only, makes GDD's ally/enemy framing literally true at zero mechanical cost | S | `profile.js` |
| **C5** Per-zone Codex completion reward | **ADOPT** | Reinforces existing retention loop, no new system | S | `ui.js` codex section |
| **C6** Longevity-flavored achievements | **ADOPT** | Harmless, single-player-safe analog to leaderboard medals | S | `achievements.js` |
| **C7a** Small capped Sect combat-stat specialty | **REJECT (for now)** | Our stat pipeline already has six flat sources (base→trained→gear→cards→meridians→gems→sets) before ascension's %/scalar layer. A seventh, even small, is the kind of gradual pipeline bloat that erodes "you can read every number" — each addition makes the char-sheet tooltip breakdown one line longer and one line harder to hold in your head. Sect's current economy-only scope (per Sprint 1's own gap analysis, "arguably correct restraint") is a deliberate, already-good choice, not an oversight. Revisit only if real playtest data says Sect specifically feels irrelevant, not on genre-parity grounds alone. | — | `guild.js`/`progression.js` |
| **C7b** Sect capacity scaling with ascension/achievements | **ADOPT** | Contained entirely to `guild.js`, gives a long-term Sect goal without touching the stat pipeline | M | `guild.js` |

---

## Sprint-2 transferable ideas (all three clusters + the synthesis's cross-cutting patterns)

| Idea | Source | Verdict | Reasoning | Effort |
|---|---|---|---|---|
| Prestige currency → permanent chosen unlocks | KoL / Idle Cultivation / Trimps (3-cluster convergence) | **ADAPT** | Covered at tension 2 — yes, but small/curated, not an open tree; keep the flat scalar as baseline | M |
| 2nd prestige tier changes *what matters* | Antimatter Dimensions | **REJECT for 1.0** | Covered at tension 2 — right lesson, wrong scope for a pre-2.0 offline game; revisit only alongside real network-provider work | — |
| Risky %-breakthrough + pity | Immortal Taoists | **ADOPT (guardrail mandatory)** | Covered at tension 3 | M |
| Decouple breakthrough reward from odds | Tale of Immortal | **ADAPT** | Covered at tension 3 | M |
| Opt-in harder-run-for-more-Karma (Hardcore) | KoL | **DEFER-2.0** | A real difficulty/reward dial, but it's additive complexity on top of an already-changing Ascension (tension 2) — sequence after the base tribulation/respec work lands and playtested, not concurrently. Not a rejection of the idea, a sequencing call. | L |
| Free/paid respec per cycle | Trimps | **ADOPT (with a cost, not free)** | Covered at tension 4 — Trimps' *free* cadence specifically rejected, the underlying "let players fix a bad build" idea adopted | S |
| Mode-varying turn caps | Gladiatus | **ADOPT** | Covered at tension 5, and B1 | S |
| Bank vs. cash-on-hand death-penalty split | Improbable Island | **ADOPT** | Gives players *agency* over `DEATH_STONE_LOSS` exposure without softening the penalty's actual harshness — that's a genuine strengthening of our "never send someone back a full level, but still make death sting" design intent (Sprint-1 §1.2), not a genre import that dilutes it. Additive save field, no VERSION bump. | S |
| Alchemy as trainable skill (yield%/success%) | Amazing Cultivation Simulator | **ADAPT** | Same guardrail as tension 3 — transparent % only | M |
| Reputation-gated Sect branches | Amazing Cultivation Simulator | **DEFER** | Interesting depth for `guild.js`, but layer it on top of C7b (capacity scaling) rather than concurrently — and it must stay economy/utility-flavored, not a backdoor to combat stats (see C7a's rejection) | M |
| Offline-progression cap / rate throttle | Melvor / Idle Slayer | **ADAPT** | Already resolved at tension 1c — cap passive stone income generously, leave Qi alone (already capped by pool size) | S |
| "Happy"-style training-efficiency brake | Torn | **REJECT** | A second braking mechanism on top of Qi is solving a problem the Qi-rate retune (A1) already solves once it lands — adding it *before* A1 would be treating a symptom while the root cause (1200/hr) sits unfixed; adding it *after* A1 is redundant complexity for a resource that will already be meaningfully scarce. Either way, skip. | — |
| Fair-Fight-style "closer stats = better reward" PvP multiplier | Torn | **DEFER-2.0** | Only meaningful once real PvP stakes exist; correctly out of scope while sparring is bragging-rights-only | — |
| PvP-loss strips a real stake (XP) | Outwar | **DEFER-2.0** | Same reasoning — GDD's own "PvP cut for 1.0, hook left in resolver" call is correct, don't add teeth to a mode with no live opponent | — |
| In-combat resource throttling (regen slows *during* a fight) | Eldevin | **REJECT / already-covered** | Our per-turn Qi spend already delivers this; naming a mechanism we already have as a "new idea" would be scope creep for zero gain | — |
| Two-tier disciple system (nameless "outer" labor pool under named disciples) | Amazing Cultivation Simulator / Idle Cultivation | **DEFER** | Genuine depth for Sect Dispatch, but sequence behind C7b/reputation-branches rather than all three landing on `guild.js` at once — one PR/session per touch, per PROJECT.md's shared-file discipline | M |
| Named "Dao" build-identity choice (branches into a tree) | Idle Xanxia / xiuzhen idle | **REJECT for now** | We already have Meridian tree + technique categories (Offense/Defense/Special) as our build-expression surface. Adding a *third* top-level "what kind of cultivator are you" system on top of those two risks the exact bloat C7a warns against, applied to build-identity instead of stats — more systems asking the player to declare an identity, not more depth per system. If build expression genuinely feels thin post-playtest, deepen Meridians/Techniques first before adding a third axis. | — |
| Continuous (not stepped) NG+ scaling curve | xiuzhen idle | **REJECT** | Reworking a shipped, balance-harness-gated `+8%/tier` formula for a curve-shape change with no stated problem behind it is pure risk for a cosmetic difference in how the same number arrives | — |
| Discrete "floor"/tower ladder | Idle Xanxia | **REJECT** | Redundant with our existing legible realm ladder (QC→FE→CF) and zone structure; would be a second progress-counter competing for the same "how far am I" mental model | — |
| Gacha companion pulls / premium currency / subscription monetization | Immortal Taoists / Torn / Outwar / Gladiatus | **REJECT, hard no** | Directly violates the no-monetization-surface reality; not a lens disagreement, just out of scope entirely | — |
| Inter-sect "Sect Power" conflict / shared spendable crew treasury / GvG | Amazing Cultivation Sim / Outwar | **DEFER-2.0** | Needs a real second participant to mean anything; faking it single-player is exactly the trap PROJECT.md's Tier D already flags | — |
| "Paid buys convenience/cosmetic, never power" as a monetization *stance* | Eldevin | **ADOPT (as a stance only, no code)** | Consistent with our current zero-monetization pillar; worth recording as the fallback stance *if* monetization is ever revisited post-1.0, not actionable today | — |

---

## Where I expect Analyst-Genre to disagree (flagging before cross-talk)

1. **The Qi gate itself (tension 1a).** I hold this as non-negotiable identity; Analyst-Genre's opposite
   prior ("adopt genre conventions, we're behind") will likely read Melvor's gateless model as evidence
   we're leaving a whole design space unexplored. I don't think there's a middle ground on *removing* the
   gate — but there may be room to converge on the regen-rate fix (1b) and the passive-income cap (1c) as
   a shared "this is what 'fixing the gate' actually means" position.
2. **How big the Ascension/Karma layer should be (tension 2).** I've scoped it small and curated on
   purpose; I expect Analyst-Genre to argue for something closer to the full KoL Valhalla-tree model,
   citing the three-cluster convergence as stronger evidence than I'm crediting it.
3. **Sect combat-stat buffs (C7a) and mailbox harshness (tension 7/C2).** These are both places I'm
   choosing restraint over genre-parity on "numbers you can read" / offline-friendliness grounds
   specifically; Analyst-Genre may see the FS-fidelity gap (guilds grant real power; mailboxes have real
   stakes) as underweighted here.

Sending cross-talk to Analyst-Genre on all three now.

---

*Status: draft complete, cross-talk pending. Will update this footer once Analyst-Genre responds and any
verdicts above are revised through discussion.*
