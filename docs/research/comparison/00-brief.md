# Research Sprint 3 — Comparison (FallenSword lineage vs. wider genre)

**Purpose:** Reconcile our two prior studies into a single decision-grade comparison: where does our
**FallenSword lineage** and the **wider genre** (neighbors / idle / xianxia) *agree*, where do they
*conflict*, and which transferable ideas survive **both** lenses? This is **Phase 2 of 3**:
(1) FallenSword study ✓ → (2) THIS comparison → (3) a later team writes a change proposal. Keep this
phase **evaluative, not prescriptive** — you produce verdicts + reasoning on candidate ideas/tensions;
the actual change proposal (with scoping) is Phase 3. But your verdicts should be sharp enough that
Phase 3 can build directly on them.

This is the **shared context doc**. You woke with no conversation history — read this fully, then read
the two source bodies it points to.

## The two source bodies (READ BOTH FULLY — this phase adds no new external research)
**Sprint 1 — FallenSword study:**
- `docs/research/10-core-mechanics.md`, `docs/research/20-meta-systems.md`,
  `docs/research/30-critique.md`, `docs/research/40-next-steps.md` (the lead synthesis + tiered
  opportunities A1–C7).

**Sprint 2 — similar-games study:**
- `docs/research/similar-games/10-direct-neighbors.md` (browser MMORPGs),
  `docs/research/similar-games/20-idle-incremental.md` (idle/incremental),
  `docs/research/similar-games/30-xianxia-cultivation.md` (cultivation),
  `docs/research/similar-games/40-critique.md`, `docs/research/similar-games/50-synthesis.md`
  (the lead synthesis + cross-cluster patterns).

**No new games/web research is needed or wanted** — work from these two bodies (you MAY re-read our
real `js/` code to check a claim about our current state). If you find a gap that genuinely needs a
new fact, flag it to the lead rather than opening a fresh research rabbit hole.

## Who we are (context)
- `PROJECT.md` (shipped reality: **Fallen Immortal**, offline-first xianxia FallenSword-like, Stages
  0–3 done) + `GDD.md` (design authority) + `CLAUDE.md` (team methodology; the 3 rules bind you).
- **Design pillars (the lineage's soul):** numbers-you-can-read combat; sessions-not-marathons (Qi
  gate); offline-complete/online-ready (providers behind interfaces).
- **Hard constraints:** `combat.js` pure; single `effectiveStats` pipeline; additive save schema;
  `progression.js`/`ascension.js`/`save.js` single-owner; self-contained modules.

## The known tensions to resolve (from the two synthesis docs — not exhaustive; find more)
1. **Session-gate identity:** our Qi spend-and-deplete gate (FS lineage core) vs. the idle genre's
   no-gate/always-idle model. Plus: our Qi/stone offline regen is **uncapped**; Melvor caps at 24h.
2. **Prestige depth:** our flat Ascension (+8%/tier, keeps collections) vs. the cross-cluster
   "prestige currency buys permanent chosen unlocks" (KoL Karma / Idle Cultivation / Trimps) and
   "2nd tier changes *what matters*" (Antimatter Dimensions).
3. **Progression tension:** our zero-risk silent-XP-threshold breakthroughs + no-alchemy-roll
   (code-verified) vs. cultivation tribulations (risky %-breakthrough + pity) and decoupled
   reward-vs-odds. **Guardrail:** transparent RNG only (show the %, never a hidden roll).
4. **Respec:** absent in ours; present in FS (paid) and Trimps (per-cycle). Sprint-1 A3.
5. **Combat push-through tiers:** FS 40/60 + Gladiatus mode-caps. Sprint-1 B1.
6. **Retention loop:** our Cards/Beast-Codex/Titles vs. investable drop-rate (FS Find Item),
   collection depth.
7. **Economy fidelity:** bound items, mailbox expiry, offline-income caps.
8. **Positioning:** Fallen Sword II ships Q3 2026 (turn-based, six classes, guild-vs-Titans) — lean
   into shared heritage, or deliberately differentiate on our offline/no-monetization/xianxia/
   transparent-math identity?

## Verdict taxonomy (apply to every candidate idea AND every tension)
- **ADOPT** — survives both lenses; genre-proven AND lineage-consistent AND constraint-safe.
- **ADAPT** — the idea is good but must be reshaped to fit a pillar/constraint (say exactly how).
- **REJECT** — conflicts with a pillar/our identity, or the genre evidence is weak; say which.
- **DEFER-2.0** — only meaningful with real multiplayer/a server (provider-interface era).
Tag each with rough effort (S/M/L) and which of our modules/pillars it touches.

## Output & ownership (RULE 1 — you edit ONLY your own file)
- **Analyst-Lineage** → `docs/research/comparison/10-lineage-view.md` — evaluate every tension/idea
  through the "protect what makes us *us*" lens (pillars + FS lineage). Argue what to keep and where
  adopting a genre convention would erode our identity. Give a verdict + reasoning per item.
- **Analyst-Genre** → `docs/research/comparison/20-genre-view.md` — evaluate through the "the genre
  proves this works and we're leaving depth/retention on the table" lens. Argue for adoption and name
  what we're missing. Give a verdict + reasoning per item.
- **Critic** → `docs/research/comparison/30-critique.md` — verify BOTH analysts represent the two
  source studies accurately (no drift/invention), challenge overclaimed "survives both" verdicts, and
  flag any verdict that violates a hard constraint. Independently re-read our `js/` code where a
  verdict rests on "our current state."
- **Lead (Opus)** → `docs/research/comparison/40-comparison.md` (do NOT touch) — the reconciled
  comparison: one verdict per item where the two lenses converge, and for genuine conflicts, the
  resolved call with the trade-off stated. This is Phase 3's input.

Each analyst doc: a short stance statement, then a per-item table/section (item · your verdict ·
reasoning · effort · module/pillar touched), covering at least the 8 tensions above plus the Sprint-1
A/B/C opportunities and the Sprint-2 transferable-ideas table. Where you and the other analyst will
obviously disagree (e.g. the Qi-gate tension), say so explicitly and engage them.

## Cross-talk protocol (RULE 2 — mesh, not hub — THIS IS THE POINT OF A TEAM HERE)
- The two analysts hold **opposite priors on purpose.** For each tension where you disagree,
  `SendMessage` the other analyst directly, argue it out, and try to converge on ADOPT/ADAPT/REJECT/
  DEFER — or crisply document *why* you can't (that residual disagreement is signal for the lead).
- Critic challenges either analyst by name on accuracy/overclaim; notify the lead of load-bearing
  disputes.
- Message the lead (this session) when your deliverable is done, and flag the 2–3 tensions where the
  lenses genuinely conflict so the lead can adjudicate in `40-comparison.md`.
