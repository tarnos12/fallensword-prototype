# Next Steps — FallenSword Research Synthesis (lead)

**Author:** Lead (Opus). Synthesizes `10-core-mechanics.md` (Researcher-Core),
`20-meta-systems.md` (Researcher-Meta), and `30-critique.md` (Critic) into a single prioritized
plan. Every claim below survived the Critic's adversarial pass (independent FS fact baseline +
direct reads of 22 `js/` modules + fresh re-verification of ~15 high-risk numbers).

## TL;DR

Fallen Immortal is **already a faithful, well-executed FallenSword-shaped game** through Stage 3.
Most FS mechanics are matched in shape; the divergences are overwhelmingly *deliberate and correct*
for an offline single-player game (no FSP premium currency, no GvG/relics, no player-posted bounty
races, no unrepairable Crystalline tier). The research found **one load-bearing balance gap** (Qi
regen ~13–24× too fast — already flagged in-code as pending 1.0 tuning) and a handful of **small,
additive fidelity wins**. Nothing requires touching the pure combat core or breaking a constraint.

The highest-leverage next move is a **"1.0 Balance & Fidelity" pass**, not new systems.

---

## Glossary — FS genre terms → our shipped modules (READ THIS before proposing "missing" work)

The Critic flagged that a future contributor skimming FS terminology against PROJECT.md could
re-propose things we already ship. Map before you build:

| FS term | Our shipped equivalent | Module |
|---|---|---|
| Stamina | Qi | `game.js` |
| Gold | Spirit Stones | economy modules |
| Auction House | Treasure Pavilion (Buy-Now, mailbox, NPC personas) | `market.js` + `personas.js` |
| Guild | Sect (hireable NPC disciples, Sect Dispatch missions) | `guild.js`, `sectmissions.js` |
| Bounty Board | Hunt bounties (system-generated, **not** FS's player-posted race) | `bounties.js` |
| Idle/passive income | Sect Dispatch timed missions + Alchemist disciple stones/hr | `sectmissions.js`, `guild.js` |
| Titan / Legendary Creature | Calamity bosses (solo, gated, cooldown) — the **Legendary** stub, not Titan | `boss.js` |
| Bestiary | Beast Codex (progressive disclosure) — **lives in `ui.js`, NOT a `bestiary.js`** | `ui.js` ~820–1010 |
| Medals / leaderboard badges | Titles (18-rung) + Achievements (23) — single-player predicates | `titles.js`, `achievements.js` |
| Daily quest | Daily Trials (day-seeded benchmark fight) | `trials.js` |
| PvP (open world) | Sparring hook (same `resolveCombat`, bragging-rights only) | `duel.js`, `rivals.js` |
| Composing/Inventing | Alchemy (pills) + Salvage (essence) — split across two modules | `alchemy.js`, `salvage.js` |
| Hell Forge (permanent +5 enchant) | **No equivalent.** `sockets.js` is a *reversible gem* system, a different mechanic | — |
| NG+/prestige | Ascension (+8%/tier) — **FI-original, no FS ancestor** | `ascension.js` |
| Spirit Cards | **FI-original**, inspired by the bestiary idea, no FS card system | `cards.js` |

---

## Framing / documentation corrections (zero code — settle these first, they're free)

1. **`sockets.js` is NOT FallenSword's "Hell Forge."** Ours is a reversible slot-a-gem system
   (ARPG-genre-inspired); FS's Hell Forge is permanent, capped at exactly 5 uses, non-reversible,
   flat +5-per-tier. Don't cite sockets as an FS port anywhere. (Confirmed by Core + Critic.)
2. **Ascension, Spirit Cards, Daily Trials, and Sect Dispatch are Fallen-Immortal originals**, not
   FS ports — no sourced FS ancestor for any of them (triangulated independently by all three
   teammates for Ascension). This is a *marketing/framing* decision, not a build one: decide whether
   the pitch says "FallenSword-inspired, with original systems X/Y/Z" vs. implying full FS lineage.
3. **FS's Bounty Board is player-posted and a first-to-complete race**; our `bounties.js` shares only
   the name (system-generated, non-competitive, closer to a mini Global Quest). Note this so nobody
   "ports the real one" pre-2.0 (it needs a live population to mean anything).
4. **GDD §6.5 is inaccurate about FS itself**: it says FS's ally/enemy lists are both unconsented.
   Sourced truth — FS *enemies* are unconsented, but FS *allies require mutual acceptance*. Our
   single unconsented Rivals list actually models FS's *enemy* behavior. Fix the GDD characterization
   in a future GDD revision (author's call — GDD is authored by Mariusz, `PROJECT.md` is our
   distillation).
5. **The Rarity ladder ordering is [UNVERIFIED].** FS tier *names* (Common/Rare/Unique/Legendary/
   Crystalline/Super-Elite/Epic) are individually sourced, but no single source states the linear
   order or "Epic is rarest," and it's internally inconsistent. Do NOT anchor any future feature on a
   specific FS rarity order. Our own 6-tier ladder (Common→Mythic) is a clean reflavor regardless.

---

## Prioritized opportunities

Effort tags: **S** = small/self-contained, **M** = medium (usually needs a `tools/balance.mjs`
gate), **L** = large / likely post-2.0. Every stats/drops/XP/price change is gated by
**`node tools/balance.mjs` → ALL ROWS PASS** per PROJECT.md.

### Tier A — Pre-1.0 balance & correctness (do these first; high value, mostly small)

- **A1 · [M] Retune Qi regen toward FS's 50–90/hr band.** `QI_REGEN_MS = 3000` → 1200 Qi/hr today,
  ~13–24× FS's sourced rate; the code comment already calls it placeholder pending 1.0 tuning. This
  is the single biggest quantitative gap **and** it's the root cause of A-adjacent finding below:
  at 1200/hr, even the priciest technique/pill buff is <3 min of regen, so the "buff before a big
  fight vs. save Qi for kills" tension (GDD §6.4) doesn't bite. **One lever fixes two findings.**
  Owner: `game.js` (single constant). Gate: balance-harness session-length/Qi rows. *Because it
  shifts the core "sessions not marathons" pillar, this is the load-bearing playtest item.*
- **A2 · [S] Add a `bound` field to items + reject bound items in `listItem()`.** Capstone named
  rewards (Heaven-Severing Blade, Stormcrown Mythic) are currently sellable on the Pavilion,
  undermining their epic weight. Additive field, no VERSION bump. GDD §6.8 called for this; never
  built. Owner: `items.js` + `market.js`.
- **A3 · [S] Spirit-stone stat respec, gated by cultivation level.** GDD §6.3 proposed it; no
  respec of any kind exists in the codebase. In a solo game with no market to buy out of a bad early
  allocation, a one-way stat door is a real QoL gap. Needs a `respecStats` in `progression.js`
  (**single-owner file — lead sign-off before touch**) + a stone cost scaling with points invested.
  Gate: balance-harness (ensure the sink doesn't distort the economy).

### Tier B — FS-flavored feature additions (genuine gaps worth building)

- **B1 · [S] 40/60-Qi "push-through" attack tier.** Real FS capability we don't offer — a tough
  fight that draws at 20 turns has no recourse today. Parameterize `MAX_TURNS` as a `resolveCombat`
  argument (keeps `combat.js` pure), thread a cap choice through `game.js:canAttack/attack` + a UI
  control. Gate: balance-harness.
- **B2 · [M] Investable "Find Item"-style drop lever.** FS's Find Item skill buys a better drop rate
  via sustained investment; our card/drop chances are static. Add a bonus type (Meridian node /
  technique / pill) that nudges card- or drop-chance up — slots into an *existing* passive-source
  pipeline, additive. **Coordinate with whoever owns the bonus-type enum.**
- **B3 · [M] A distinct, genuinely FS-flavored "Hell Forge" upgrade** *alongside* (not replacing)
  sockets/reforge: permanent, capped-count, scaling-with-item-level flat stat adds, stone-gated.
  Owner: `items.js` (+ crafting UI). **Sequence with A2 — both touch `items.js`; land in one PR or
  serialize to avoid two teammates in one file.** Gate: balance-harness.
- **B4 · [M] Gear-normalized "Arena" sparring variant.** FS separates gear-race PvP (open world)
  from build-expression PvP (Arena, gear capped to a bracket). Compute a bracket-capped stat sheet
  *inside* `duel.js` and pass it to the still-pure resolver; discard after. Provider-safe. If it ever
  becomes real 2.0 PvP, the bracket logic moves behind a provider interface.

### Tier C — Polish & flavor (nice-to-have, low priority)

- **C1 · [S]** Surface "Combat Unresolved" language/UX (vs. bare "draw") — copy-only, `combatfx`/`toast`.
- **C2 · [M]** Mailbox expiry window (generous 48–72h, wall-clock/offline-safe) to reintroduce FS's
  "check back in" stakes without punishing a week away.
- **C3 · [S]** Level-range filter on `getListings(filters)` in the Pavilion.
- **C4 · [S]** Split Rivals into "Favored"/"Marked" flavor sub-lists — makes GDD §6.5's "allies and
  enemies" wording literally true; a `kind` field on the existing rival entry, `profile.js`-only.
- **C5 · [S]** Per-zone Beast Codex completion reward (GDD §7.1 flagged this a "post-1.0 candidate").
- **C6 · [S]** "Longevity"-flavored achievements (consecutive days, etc.) as our single-player analog
  to FS's leaderboard-longevity medals.
- **C7 · [S]** Small capped combat-stat Sect specialty (a new `effectiveStats` flat source —
  **coordinate on `progression.js`**) and/or **[M]** Sect capacity scaling with ascension/achievements.

### Tier D — 2.0 forward-compat notes (no code now; protect these shapes)

- Buff data `{techniqueId, effect, expiresAt}` should gain `casterId`/`targetId` when a real second
  player exists, so buff-trading (a core FS social/economy system, cut for 1.0) needs no schema rework.
- Keep `recentlyActive()`'s output shape (persona + level + activity) stable — a future PvP-scouting
  UI will want exactly those fields.
- GvG/relics and Global-Quest leaderboards stay **unbuilt** until `NetworkGuildProvider` exists —
  faking a competitive population single-player is the wrong shape of problem.

---

## Constraint watch (carry into any build milestone)

- **`progression.js` and `save.js` are single-owner files.** A3 (respec) and C7 (Sect combat buff)
  both touch `progression.js` → lead sign-off + one owner at a time.
- **`items.js` is touched by A2 (`bound`) and B3 (Hell Forge).** Sequence or single-PR them.
- **New world content (B-tier bosses/zones) needs a named zone or boss slot** before greenlight —
  neither research doc named one. Per PROJECT.md: a zone = one `js/zones/<id>.js` + a `ZONE_MODULES`
  entry; bosses live in `boss.js`'s `BOSSES` registry, never a zone spawn table.
- **Card/collection work should build on the existing `DUPLICATE_STONE_PAYOUT` longevity lever**,
  not reinvent one.

---

## Recommended next milestone

**"1.0 Balance & Fidelity pass"** — Tier A in full (A1 Qi retune is the anchor), plus B1
(push-through tiers) and A2 (`bound`) as low-risk fidelity wins. Exit criterion:

> `tools/balance.mjs` ALL ROWS PASS at the retuned Qi economy; capstone named items un-sellable;
> push-through attack tiers playable; verified in real Chromium with zero console errors — and a
> playtest confirms the "buff-or-save Qi" decision now bites (the GDD §6.4 tension the current regen
> rate erases).

This is a small, well-bounded team milestone (Hard-Problem dev on A1/B1 balance, Gameplay-Systems
dev on A2/A3, QA gating on `balance.mjs`) that closes the one real gap before any 2.0 network work.
Tiers B–C are a backlog to pull from afterward per playtest feedback.
