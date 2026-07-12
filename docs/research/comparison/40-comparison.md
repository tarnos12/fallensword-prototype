# Reconciled Comparison — FallenSword Lineage vs. Wider Genre (Sprint 3, Phase 2 of 3) — lead

**Author:** Lead (Opus). Reconciles `10-lineage-view.md` (protect-identity lens),
`20-genre-view.md` (adopt-genre-depth lens), and `30-critique.md` (adversarial + convergence
stress-test) into a single decision-grade verdict set. This is **Phase 3's direct input.** Verdicts
here are evaluative, not yet scoped — Phase 3 turns the ADOPT/ADAPT survivors into an actual change
proposal.

## Headline: the two lenses converged, and that convergence mostly survived adversarial pressure

The brief set two analysts against each other with **opposite priors** expecting the 8 tensions to be
sharp identity-vs-genre fights. Instead they converged on a single verdict for nearly every item. That
is a **high-confidence signal, not a failure** — when "protect what makes us *us*" and "the genre
proves we're behind" independently land on the same call, it's robust. Critic3 then verified there was
no source drift, no wrong code claims, and no constraint violations, and — at the lead's request —
adversarially stress-tested the convergence itself rather than rubber-stamping it. Result: the
convergence holds on everything **except two verdicts, which are downgraded to CONDITIONAL** with an
explicit design test each. Those two are the real work Phase 3 must get right.

**The residual differences between the lenses were calibration (how much / how gently), not
pillar-vs-genre conflict.** There is essentially nothing left for the lead to adjudicate as a genuine
lens conflict — the adjudication that matters is the two CONDITIONAL design tests below.

---

## Reconciled verdicts

### The two CONDITIONAL items — Phase 3's crux (get these right or don't ship them)

**T2 · Deepen Ascension with a permanent-unlock currency — ADOPT-CONDITIONAL.**
Both lenses + the 2-cluster genre precedent (KoL Karma-perms, Trimps) support layering a
prestige-currency-buys-**chosen**-permanent-unlocks system on top of the existing flat `+8%/tier`
Ascension scalar (not replacing it; not a full open KoL-Valhalla tree). Currency amount scales with
run quality (echoing Idle Cultivation).
- **The test it must pass (Critic3):** the unlock menu must create **genuine build-vs-build
  opportunity cost** — finite, mutually-trading choices you can't all buy. The analysts' own straw-man
  contents ("perma-unlock a Meridian node," "a small perma-stat bump") FAIL this: they're just *more
  permanent power on the same axis*, which is structurally **Idle Slayer's Ultra Ascension** — the
  exact "bigger multiplier in a costume" counter-pattern Sprint 2 named — not the **Antimatter
  Dimensions** "changes what you optimize" standard both docs cite as the goal.
- **Phase 3 must therefore design the menu contents as the deliverable**, not hand-wave "3–5 curated
  unlocks." If it can't produce a menu with real trade-offs, the honest call is REJECT-for-1.0, not a
  costumed scalar.
- **Concrete shape proposed by the analysts (a starting point, not a mandate):** make the unlocks
  **exclusive-per-cycle picks** — e.g. this ascension you may permanently secure *one* specific
  Meridian rank OR *one* specific technique from content **already in the existing pipeline**, or spend
  on the existing `+8%` scalar itself — **never a new flat stat line** (a new flat line is exactly the
  C7a bloat this sprint just DEFERred). Exclusivity per cycle is what manufactures the opportunity cost.
- **Reject at 1.0 scope:** a *third*, qualitatively-different prestige tier (AD's full lesson) —
  right idea, wrong scope pre-2.0. Both lenses agree.

**T3 · Breakthrough tribulation (risky %-advance with pity) — ADOPT-CONDITIONAL.**
Resolved shape (both analysts, final): **additive/opt-in on top of** the existing silent XP-threshold
auto-advance — never replacing it. The optional tribulation is available on *any* breakthrough
including the two capstone sagas (Heaven-Severing Blade, Stormcrown Mythic), but a failed roll can
never **permanently block** capstone access — the safe auto-advance path always remains as the floor.
Mandatory guardrail (non-negotiable, both lenses independently insisted):
**the success % is always shown** — transparent RNG, like our displayed hit-chance, never a hidden
roll. Does not touch `combat.js`.
- **The test it must pass (Critic3):** an opt-in risk only creates the GDD §9.1 "breakthroughs feel
  *felt*" tension if the risky path's **expected value is deliberately tuned positive** — the actual
  design lever neither analyst named. Too weak → nobody rational opts in, ships as decoration, goal
  unmet. Too strong → it becomes the de-facto default for engaged players, so "preserves the safe
  path" does less work than the label implies. Phase 3 must specify the EV, not trust "opt-in" alone.
- **Open sub-decision for Phase 3:** exempting the two capstone sagas means tension only exists for the
  ~24 generic breakthroughs — i.e. the mechanic deliberately skips the two moments the narrative has
  built the *most* weight around. Confirm that's the intent (gentle-design) vs. a gap.

**Dependency between them:** T2's run-quality currency formula (proposed as "tribulations survived")
**presupposes T3 ships.** Phase 3 must either sequence T3 before T2, or give T2 an independent
currency source so it doesn't hard-depend on T3's scope.

### ADOPT — survives both lenses, constraint-clean, high confidence

| Item | Verdict | Effort | Touches | Note |
|---|---|---|---|---|
| **Qi regen retune** 1200/hr → FS 50–90/hr band | **ADOPT** | M | `game.js` | The single highest-leverage fix — both lenses agree the current rate makes *our own* "sessions not marathons" pillar inert, not just off-FS-spec. Balance-harness gated. |
| **Costed stat respec** (cost-gated from first use, scales w/ invested points) | **ADOPT** | S | `progression.js`¹ | Sprint-1 A3; Trimps precedent. Solo game needs an exit from a bad allocation. |
| **Push-through Qi attack tiers** (20/40/60) | **ADOPT** | S | `combat.js` arg | Sprint-1 B1; Gladiatus mode-caps validate. Parameterize `MAX_TURNS`, keep resolver pure. |
| **`bound` field on capstone items** | **ADOPT** | S | `items.js` | Sprint-1 A2. Additive; stops named rewards being sold on the Pavilion. |
| **Bank vs. cash-on-hand death-penalty split** | **ADOPT** | S–M | `game.js` | Improbable Island. Player agency over `DEATH_STONE_LOSS` exposure without softening the penalty. Additive save field. |
| **Sect capacity scaling** (w/ ascension/achievements) | **ADOPT** | M | `guild.js` | No stat-pipeline touch; long-term Sect investment arc. |
| **Investable drop/card-chance lever** (Find-Item-style) | **ADOPT** | M | existing passive-source pipeline¹ | Deepens the retention loop actively. |
| Level-range market filter · Rivals Favored/Marked split · longevity achievements · per-zone codex completion reward | **ADOPT** | S each | `market.js`/`profile.js`/`achievements.js`/`ui.js` | Low-risk polish, both lenses agree. |

### ADAPT — good idea, must be reshaped to fit a pillar

| Item | Verdict | Touches | The required reshape |
|---|---|---|---|
| **Offline-progression cap** | **ADAPT** | `game.js` | Cap **passive spirit-stone income only** (generous 48–72h window); leave **Qi alone** (already capped via `maxQi()`). Preserves offline-friendliness while closing the "let it cook for a month" stone exploit. |
| **Mailbox expiry** | **ADAPT** | `market.js` | A generous **48–72h** window, NOT FS's harsh 12h — reintroduces "check back in" stakes without punishing a week away. |

### REJECT — conflicts with identity/constraint, or genre evidence is weak

| Item | Verdict | Why |
|---|---|---|
| **Remove/soften the Qi session-gate** | **REJECT** | Both lenses. The gate IS the "sessions not marathons" pillar and core FS DNA; the idle-genre no-gate model is a *different genre's* identity, not an upgrade to ours. |
| **New Sect combat-stat specialty** (Sprint-1 C7a) | **REJECT/DEFER** | `effectiveStats` already has 7 flat sources (base→trained→gear→cards→meridians→sockets→sets); an 8th is legibility bloat without a stated playtest problem. Genre conceded to Lineage's pipeline-legibility argument. |
| **Distinct new "Hell Forge" gear system** | **REJECT** | Redundant with existing reforge/upgrade; the FS "Hell Forge" name doesn't even map to our reversible `sockets.js` (Sprint-1 correction). Revisit only if a real gap appears. |
| **Retrofit a "Dao" build-identity axis** | **REJECT (1.0)** | Genre's own call — a structural rework bolted onto Stage-3-complete content, not an addition. |

### DEFER-2.0 — only meaningful with real multiplayer / a server

Both lenses, no disagreement: GvG / relics / Titan-cooperative bosses / real player-posted bounty
races / FSP-style premium currency / Outwar-style shared crew treasuries / subscription monetization.
These are provider-interface-era features — faking a competitive population single-player is the wrong
shape of problem. (Recorded stance, Genre's addition: if monetization is ever revisited post-1.0,
adopt Eldevin's *"paid buys convenience/cosmetic, never power"* — same studio as FS chose this for
their next game. Policy note only, zero code.)

¹ **Single-owner-file coordination:** respec, the drop-lever, T2, and T3 all touch `progression.js`
and/or `ascension.js`. Per CLAUDE.md, these are single-owner files — if several land in one milestone
they must **serialize or share one PR**, never concurrent edits. T2+T3 specifically both hit
`progression.js`+`ascension.js`; sequence them.

---

## Precision corrections carried from Critic3 (so Phase 3 doesn't inherit an inflation)
- The "prestige currency buys **chosen** unlocks" convergence is **2-cluster (KoL Karma + Trimps)**,
  not 3 — Idle Cultivation's Soul Power is risk-gated *magnitude*, not player *choice*. (My own
  Sprint-2 `50-synthesis.md` §1 said "all three clusters"; that's accurate for "persistent prestige
  currency" broadly but NOT for the *chosen-unlock* variant T2 is about. Phase 3 should cite the
  2-cluster version for the choice mechanic.)
- The "2nd tier changes what matters" standard rests on **Antimatter Dimensions** alone as load-bearing
  (NGU secondary); RG-Ascension and Idle Slayer are NOT support. Don't re-inflate to "four games."

## Positioning finding (for Phase 3's framing, not a mechanic)
The lenses agree our identity is the **deliberate differentiator** from where the genre — and our own
lineage — is heading: **Fallen Sword II (Q3 2026)** is going turn-based/six-class/guild-vs-Titans and
cross-platform; we are offline-complete, no-monetization, xianxia, transparent-stat-math, single-player.
Phase 3's proposal should lean *into* that identity (deepen the solo cultivation loop) rather than
chase the sequel's live-service shape.

---

## Hand-off to Phase 3 (the change-proposal team)
1. **The ADOPT/ADAPT block above is the greenlit backlog** — proposal-ready as-is, constraint-clean,
   both-lens-endorsed. Bundle with the retuned Qi economy as the coherent "1.0 depth & balance" pass.
2. **The two CONDITIONAL items (T2, T3) are the design-risk centerpieces** — Phase 3's real job is to
   *pass their tests*: for T2, design an unlock menu with genuine build-vs-build opportunity cost (or
   honestly reject it as a costumed scalar); for T3, specify the risky-path EV and the capstone-exempt
   decision. If Phase 3 wants "big changes," this is where the ambition belongs — a prestige layer that
   truly changes what you optimize, done to the AD standard, is the biggest swing available that still
   respects every pillar.
3. **Carry the guardrails:** transparent-% RNG only; single-owner-file serialization; T2→T3 currency
   dependency; additive save schema (no VERSION bump found necessary anywhere in this sprint).
4. **Big changes are allowed (per the user's Phase-3 framing)** — where a proposed change would require
   relaxing a hard constraint or a pillar, Phase 3 must call that out explicitly and make the case,
   rather than smuggling it in.
