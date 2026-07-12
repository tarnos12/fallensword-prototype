# Similar-Games Synthesis (Sprint 2, Phase 1 of 3) — lead

**Author:** Lead (Opus). Synthesizes `10-direct-neighbors.md`, `20-idle-incremental.md`,
`30-xianxia-cultivation.md`, and `40-critique.md` into the cross-cutting patterns worth carrying into
Phase 2 (compare vs. the FallenSword study) and Phase 3 (change proposal). **This phase is
descriptive** — it hoists patterns and tags relevance; it does NOT propose changes to our project
(that is Phase 3). Every claim below reflects the Critic's *corrected* reading (over-counts recentred,
mischaracterizations fixed, sources verified against real code where claimed).

## Scope covered
- **Cluster A — browser stat-math MMORPGs** (Researcher-Neighbors): Eldevin, Torn, Sryth, Kingdom of
  Loathing, Gladiatus, Improbable Island, Outwar (+ EpicDuel/AdventureQuest notes).
- **Cluster B — idle/incremental RPGs** (Researcher-Idle): Melvor Idle, NGU Idle, Legends of IdleOn,
  Idle Champions, Realm Grinder, Trimps, Kittens Game, Antimatter Dimensions, Idle Slayer.
- **Cluster C — xianxia/cultivation** (Researcher-Xianxia): Immortal Taoists, Amazing Cultivation
  Simulator, Tale of Immortal, Idle Cultivation, xiuzhen idle, Idle Xanxia.

Full per-game detail and the per-cluster transferable-idea tables live in the three cluster docs; this
synthesis carries only the cross-cutting signal. Fact-quality was adversarially verified (`40-critique.md`).

---

## The five cross-cutting patterns (this is the payload)

### 1. "Prestige currency buys permanent cross-run unlocks" — converges across ALL THREE clusters
The strongest signal in the sprint, and one **no single cluster doc could see** because each only saw
its own games. The same idea appears independently in:
- **KoL (Cluster A, HIGH, best-sourced in the sprint):** Karma is a prestige currency spent in
  Valhalla; "perm"-ing a skill (100 Karma) permanently keeps it across all future ascensions; unspent
  Karma carries across runs.
- **Idle Cultivation (Cluster C, MED):** tribulation-tier-scaled Soul Power persists across resets.
- **Trimps / NGU (Cluster B):** Helium→Perks / partial-persistence carry power across the prestige.

**Why it matters to us:** our Ascension (`ascension.js`) keeps *collections* but grants only a flat
`+8%/tier` scalar — it has no "spend a prestige currency on permanent, chosen unlocks" layer. Three
clusters converging says this is a genre-proven way to deepen a prestige loop. (Carry to Phase 2/3;
constraint: `ascension.js`/`progression.js` are single-owner files.)

### 2. A second prestige tier should change WHAT MATTERS, not just stack a bigger multiplier
Recentred after adversarial review (the researcher's "four games converge" was over-counted):
- **Antimatter Dimensions — the load-bearing case.** Infinity→Eternity→Reality each add a
  qualitatively new *system* (Time Studies at Eternity; equippable **Glyph** itemization at Reality),
  not just a larger number.
- **Realm Grinder (Reincarnation) & NGU (difficulty tiers) — moderate support**, different mechanisms
  (currency-swap; "same systems, harder, pick a lane"). *(Note: RG's separate "Ascension" tier is a
  technical big-number rescale, not a design lever — do not cite it as one.)*
- **Idle Slayer — counter-example.** Its Ultra Ascension buys "stronger permanent bonuses" = a bigger
  multiplier — i.e. the shallow pattern the lesson says to avoid.

**Takeaway:** if a deeper prestige layer is ever proposed, the design test is "does the new tier change
what the player optimizes," not "is the multiplier bigger."

### 3. Cultivation games build their pacing tension exactly where ours is empty
**Verified against our real code** (`progression.js`/`alchemy.js`, confirmed by the Critic):
- Our realm breakthroughs are a **silent XP-threshold auto-advance — zero failure chance, zero
  tribulation, zero material/elixir gate.** Cost spikes exist at realm barriers, but no *tension* event.
- Our `alchemy.js` pills are **deterministic — no success/fail roll anywhere.**

Cultivation games put their whole "fast early → deliberately slows" curve (the one GDD §9.1 explicitly
wants) right here:
- **Immortal Taoists** — tribulation: a risky %-success breakthrough with a self-correcting *pity*
  (failure and consumed pills raise the next attempt's odds). *(Exact +5%/+5% pity figures flagged for
  re-verification before anyone quotes them as targets.)*
- **Tale of Immortal** — decouples breakthrough *reward* (treasures) from breakthrough *odds*
  (materials/pills), so preparation and payoff are separate decisions.

**Guardrail (from the Critic, important):** a %-success breakthrough introduces RNG into progression,
which only respects our "numbers you can read, not hidden-RNG theater" pillar if **the success % is
shown to the player** (transparent, like our displayed hit-chance) — never a hidden roll. It does NOT
touch `combat.js` (pure resolver stays untouched). Landmine: alchemy has two buff pathways
(`pillBuffs` bypasses `effectiveStats` by design) — a "pills improve breakthrough odds" feature must
pick a pathway deliberately.

### 4. "Risk-for-reward, opt-in" is one lever approached from two ends
KoL's **Hardcore** ascension (accept harsher restrictions → earn more Karma, 211 vs 111) and the
cultivation **tribulation** (accept a fail-chance → progress) are the same underlying idea — voluntary
added risk for added reward — reached from the prestige end (KoL) and the progression end (xianxia).
Worth treating as one design theme in Phase 3, not two.

### 5. Offline-progression caps — a cross-cutting retention question none of the clusters "owns"
**Melvor caps offline catch-up at 24h**; most idle games throttle or cap offline gains
(Idle Slayer's offline *rate* caps at 90%). Our Qi/stone wall-clock regen (`lastQiTick`/`lastStoneTick`)
appears **uncapped**. This cuts both ways — a cap prevents "let it cook for a month" exploits and is a
genre-standard pattern, but our whole pillar is offline-friendliness. Flagged as an open question for
the comparison/proposal phases, not a recommendation.

**Bonus framing point:** our **Qi spend-and-deplete session gate is atypical for the idle cluster** —
Melvor and the pure incrementals have no such resource at all. That sharpens that Qi-gating is a
deliberate FallenSword-lineage choice, not a genre default — relevant when Phase 2 weighs "keep the FS
DNA" vs. "adopt idle-genre conventions."

---

## Consolidated transferable ideas (cross-cluster, relevance-tagged, constraint-annotated)

Deduplicated across the three docs; effort is rough (S/M/L). Full inventory in the cluster docs.

| Idea | Cluster / game | Relevance | Touches | Note |
|---|---|---|---|---|
| Prestige currency → permanent chosen unlocks (deepen Ascension past flat +8%) | A KoL / C Idle Cult. / B Trimps | **HIGH** | `ascension.js` (single-owner) | 3-cluster convergence (§1) |
| Second prestige tier that changes *what matters* | B Antimatter Dimensions | **HIGH** | `ascension.js` | design test, not a multiplier (§2) |
| Risky %-success breakthrough w/ pity | C Immortal Taoists | **HIGH** | `progression.js` (single-owner) | **only if % is shown** (§3 guardrail) |
| Decouple breakthrough reward from odds | C Tale of Immortal | **MED** | `progression.js` + `alchemy.js` | mind the `pillBuffs` pathway |
| Opt-in harder-run-for-more-reward (Hardcore) | A KoL | **MED** | `ascension.js` | same lever as tribulation (§4) |
| Free respec per prestige cycle, paid beyond | B Trimps | **MED** | `progression.js` (single-owner) | validates Sprint-1 A3 (missing respec) |
| Mode-varying turn caps | A Gladiatus | **MED** | `combat.js` arg | validates Sprint-1 B1 (parameterize `MAX_TURNS`) |
| Bank vs cash-on-hand death-penalty split | A Improbable Island | **MED** | `game.js` | additive save field, provider-safe |
| Alchemy as a trainable skill (yield%/success% scaling) | C Amazing Cultivation Sim | **MED** | `alchemy.js` | adds depth to deterministic pills |
| Reputation-gated Sect branches (deepen flat Sect) | C Amazing Cultivation Sim | **MED** | `guild.js` | single-player-safe deepening |
| Offline-progression cap / rate throttle | B Melvor / Idle Slayer | **MED** | `game.js` | open question, cuts both ways (§5) |
| "Effort/Happy"-style training-efficiency brake | A Torn | **LOW-MED** | `game.js` | alt answer to the Qi-burst problem |
| Paid energy-refill (Xanax/LSD) | A Torn | **LOW/SKIP** | — | monetization; violates our reality |
| Gacha companion pulls / VIP | C Immortal Taoists | **LOW/SKIP** | — | monetization; violates our reality |
| Inter-sect "Sect Power" conflict | C Amazing Cultivation Sim | **LOW/SKIP** | — | needs live population (= Tier-D/2.0) |

---

## Timely external signal (context for Phase 3's framing)

**Fallen Sword II is real and imminent** — confirmed across Hunted Cow's own announcement, MMORPG.com,
and MassivelyOP (2026-01-13): **Q3 2026**, PC/iOS/Android, six classes, fast-paced **turn-based**
combat, Gauntlets, **guild-vs-Titans**. *(The neighbors doc's "card-game-like combat" descriptor was
unsourced and is being dropped — no source calls it card-based.)* This directly concerns the project's
own "FallenSword-inspired" positioning: our lineage game is getting a modern successor this year. Worth
weighing in Phase 3 — do we lean into the shared heritage, or deliberately differentiate (our offline,
no-monetization, xianxia, transparent-stat-math identity)?

## Cross-references to Sprint 1 (FallenSword study)
- Sprint-1 **A3 (missing stat/technique respec)** is independently reinforced by **Trimps'** per-cycle
  respec — a concrete genre precedent.
- Sprint-1 **B1 (parameterize `MAX_TURNS` for push-through tiers)** is validated by **Gladiatus'**
  mode-varying turn caps.
- Sprint-1 flagged **Ascension as "no FS ancestor"** — it has a **genre ancestor: Kingdom of Loathing**
  (KoL coined "Ascension" as an NG+ term), and KoL's Karma model is the deepening path.

## Hand-off to the next phases
- **Phase 2 (comparison team):** reads BOTH studies (Sprint 1 `docs/research/*` + Sprint 2
  `docs/research/similar-games/*`) and resolves where our FS lineage and the wider genre agree vs.
  diverge — e.g. does the idle-genre "no session-gate resource" finding argue for softening Qi, or does
  FS lineage argue for keeping it? Which transferable ideas survive BOTH lenses.
- **Phase 3 (proposal team):** turns the survivors into an actual change proposal (big changes allowed),
  each checked against our hard constraints — or explicitly calling out where a big change would require
  relaxing one (e.g. transparent-RNG guardrail on breakthroughs, single-owner-file serialization on
  `progression.js`/`ascension.js`).

**Constraint carry-forward:** `progression.js`, `ascension.js`, and `save.js` are single-owner files;
several HIGH ideas touch them and must serialize if co-scoped. The transparent-RNG guardrail (§3) and
the alchemy dual-buff-pathway landmine are the two design gotchas most likely to bite an implementer.
