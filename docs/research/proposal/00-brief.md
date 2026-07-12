# Research Sprint 4 — CHANGE PROPOSAL (Phase 3 of 3)

**Purpose:** Turn the author's new design direction (below) into a concrete, build-ready **change
proposal** for Fallen Immortal. Big changes are explicitly allowed. This is the final phase:
(1) FallenSword study ✓ → (2) similar-games study ✓ → (3) comparison ✓ → **(4) THIS proposal.**

**This is the DESIGN pass of an APPROVED build.** The author has greenlit full implementation ("do
all of these tasks, don't stop until all is done") and authorized up to **10 concurrent agents**. To
keep 6 interdependent workstreams from colliding on shared files, this pass FIRST produces build-ready
specs (data model, exact files, interface contract, migration/sequencing); the **lead then freezes the
contracts and drives the implementation build-waves immediately after — no separate approval step.**
In THIS pass, do NOT edit game code (`js/`, `index.html`, `css/`) — only your assigned doc under
`docs/research/proposal/`. Your spec must be concrete enough to build directly from: name exact files,
functions, data shapes, and `save.js`/`effectiveStats` touch-points.

## ⚠️ AUTHORITY: the author's directive OVERRIDES the research where they conflict
The three prior research sprints (`docs/research/**`) are **supporting craft and evidence**, not the
authority. The author (Mariusz) has given explicit new direction that in places **reverses** research
conclusions — most importantly, the research said "no premium currency"; the author now **wants** a
premium currency + upgrade shop. When the two conflict, **the author's direction wins.** Use the
research for HOW to execute well (FallenSword FSP mechanics, the transparent-RNG guardrail, the
Idle-Slayer "costumed multiplier" trap, single-owner-file rules), not for WHETHER to do what the
author asked.

---

## THE AUTHOR'S DIRECTIVE (the design authority — do not lose any of this)

### 1. Simplify / cull — the headline problem
> "The current game has too many systems all hidden inside Halls... we might need to remove some,
> it's not fun honestly."
Fallen Immortal shipped Stages 0–3 with ~40 systems (see `PROJECT.md`), many surfaced as nav-menu
buttons / the Halls tab. The core complaint: **too many systems, not fun, hidden away.** The proposal
must recommend **KEEP / MERGE / CUT / DEFER** for every non-core system, refocusing on a tight loop.

### 2. The focused core loop (the target shape)
1. **Combat**
2. **Equipment**
3. **Auction house** — trade for **gold AND premium currency**
4. **Premium currency upgrades** — opened by clicking a **premium-currency icon**; FallenSword had a
   LOT of upgrades there (inventory slots, stamina/max-stamina, XP protection, respec, loadouts,
   etc. — this shop is a natural consolidation home for scattered progression sinks)
5. **Character leveling + stats**
6. **Skill tree** — start with a **passive skill tree** + **very few active abilities**; active
   abilities **cost stamina (Qi) to cast** and **last 10+ minutes each** (long-duration buffs, not
   the current 45s–2min ones)

### 3. Items & rarities
- Items divided into rarities (we already have common→mythic; align/extend as needed).
- **Legendary items are ALWAYS Sets.**
- **Super Elite items are ALWAYS Sets.**
- **Titan items are NOT Sets.**
- **Set bonuses:** for now, sets grant **simple flat stats (Attributes)** — keep it simple, no exotic
  effects yet.
- **Titan items** (non-set) **always give some stamina (Qi) regeneration** as a defining stat.

### 4. Monsters / world spawns
- Each area **sometimes spawns Legendary monsters** (multiple possible per area, like FallenSword).
- **Super Elite: exactly 1 per area** (rarer than Legendary).
- **Titans:** a moving multi-hit boss — **attack once → it moves to a different cell → attack again →
  repeat ~10 times → then it drops a Titan item.** (Single-player adaptation of FS Titans; the
  research confirmed FS Titans are guild-cooperative, but the author wants this solo move-and-chase
  version. `combat.js` STAYS a pure resolver — the titan's movement/hit-counter is game/world state,
  each hit still calls `resolveCombat`.)
- **Debug buttons above the map** to spawn Legendary / Super Elite / Titan monsters (need to spawn
  MULTIPLE for testing).

### 5. Drop rates
- **Legendary: 25%** (≈1 in 4 kills).
- **Super Elite: 50%** (≈1 in 2 kills).
- **Titan: 100%** (always drops, after the ~10-hit sequence).
- **Debug toggle button to force all drop rates to 100%** for testing.
- (Guardrail from research: any player-facing % should be legible per "numbers you can read" — but
  these drop rates are behind-the-scenes loot rolls, not a progression gate, so hidden is fine; the
  transparent-% guardrail specifically applies to any *breakthrough/progression* RNG, not loot.)

### 6. Combat UI
- **Combat results appear on the side of the map.**
- **Remove the combat-result sub-menu** — i.e. drop the standalone **Combat tab** (currently one of
  the five tabs `map/combat/char/quests/halls`); resolve combat inline with a side panel by the map.
- **Number keys 1–9 attack the monster in that slot** (if a monster exists in that slot on the tile).

### 7. Feel / polish
- **Add sound effects.**
- **Polish the UI — make it look less like AI** if possible (concrete design-language direction:
  typography, spacing, color, texture, iconography — move away from generic "AI-generated" tells).

---

## Who we are / current state (read before proposing)
- `PROJECT.md` (shipped Stages 0–3; the module→ownership map; hard constraints) + `GDD.md` (design
  authority for scope/flavor) + `CLAUDE.md` (team methodology; 3 rules bind you).
- **AUDIT THE REAL CODE.** 46 JS modules under `js/`. Nav-menu buttons are injected by many modules
  (`ascension.js`, `crafting.js`, `meridians.js`, `salvage.js`, `sectmissions.js`, `sockets.js`,
  `stats.js`, `titles.js`, …). Tabs are `map/combat/char/quests/halls` (`tabs.js`). The Beast Codex
  lives in `ui.js` (not a standalone file). Read the modules your area touches — don't rely on
  `PROJECT.md` summaries alone.

## Hard constraints still in force (the author's changes must respect these unless they explicitly relax one)
- `combat.js` stays a **pure deterministic function** (titans/legendaries/SE all still resolve through
  it; movement/counters are game-layer state).
- Single `effectiveStats` pipeline; never mutate stats in place.
- **Save schema:** new fields additive; **removing systems is a BREAKING change** → any CUT needs a
  `save.js` migration plan (back-fill/strip old fields, VERSION bump if shape breaks). Call this out.
- Multiplayer-shaped systems behind provider interfaces (still true; premium currency is single-player
  earnable, not a network feature).
- Self-contained feature modules; `progression.js`/`ascension.js`/`save.js` single-owner.
- **Premium-currency pillar note:** the "offline-complete, no-monetization" pillar is partly
  overridden by the author. Design premium currency as **earnable + tradeable IN-GAME** (FSP-style:
  drops/boss/achievement sources, sellable on the auction house) so the game stays offline-complete;
  treat any **real-money on-ramp as the AUTHOR'S future decision** — flag it, don't bake it in.

---

## Output & ownership (RULE 1 — you edit ONLY your own file)
- **Architect-Cull** (Opus) → `docs/research/proposal/10-cull-ia-feel.md` — the system audit
  (KEEP/MERGE/CUT/DEFER for every non-core system, with migration notes), the core-loop refocus, the
  **IA/tab restructure** (combat-on-side + remove the Combat tab; where the ~5 core surfaces live),
  and the **visual-identity direction** ("less like AI": concrete design-language principles). The
  structural backbone the other three build within.
- **Author-Economy** (Sonnet) → `docs/research/proposal/20-economy-premium.md` — **premium currency**
  (name/flavor, earn/sink sources, tradeable on the auction house alongside gold) + the **premium
  upgrade shop** (icon-opened; the FallenSword-style upgrade catalog — propose the actual upgrade list
  and which scattered systems it absorbs) + auction-house changes (dual-currency).
- **Author-Progression** (Sonnet) → `docs/research/proposal/30-progression-skills.md` — leveling +
  stats + the **passive skill tree** and the **few active abilities** (stamina cost, 10+ min
  duration). Propose how this consolidates today's `meridians.js` (passive tree) + `techniques.js`
  (active buffs) into the author's cleaner shape; how many active abilities; what the passive nodes are.
- **Author-CombatWorld** (Sonnet) → `docs/research/proposal/40-combat-world.md` — **item rarities**
  (+ the Legendary-always-Set / SE-always-Set / Titan-not-Set rules), **Legendary/Super-Elite/Titan
  spawns** (per-area rules: multiple Legendary, 1 SE, moving Titan), the **Titan move-and-chase ~10-hit
  mechanic** (world-state design; `combat.js` stays pure), **drop rates** (25/50/100% + debug 100%
  toggle), **debug spawn buttons** above the map, the **combat side-panel** presentation, and **1–9
  attack shortcuts**.
- **Critic** (Sonnet) → `docs/research/proposal/50-critique.md` — the adversary (see below).
- **Lead (Opus)** → `docs/research/proposal/60-proposal.md` (do NOT touch) — the reconciled, sequenced,
  build-ready change proposal + a first-milestone recommendation. Also owns the cross-cutting
  **audio/sound + polish** synthesis (folding each author's presentation notes together).

Each author doc: a short summary, then concrete design (data model, which files change, how it fits
the pillars/constraints, migration/sequencing), and a **"what I'm proposing to CUT vs KEEP vs ADD"**
line so the simplify-mandate stays front and center. Fold in the still-relevant research ADOPT items
where they fit the new focus (Qi regen retune; costed respec — now a natural premium-shop upgrade;
push-through Qi tiers; `bound` items; the T2 "premium currency buys chosen unlocks" test — the premium
shop IS a chosen-unlock currency, so make its upgrades real choices, not just a "buy everything" queue).

## Critic's charge
- **Does it actually SIMPLIFY?** The #1 risk: a proposal that ADDS (premium shop, titans, skill tree,
  rarities) while forgetting to CUT — netting *more* complexity, the opposite of the author's ask.
  Hold every author to a real KEEP/MERGE/CUT/DEFER ledger; flag net-additions dressed as simplification.
- **Feasibility on a Stage-3 codebase** — cuts have save-migration + cross-dependency costs (e.g.
  cutting `cards.js` or `ascension.js` touches `save.js`, `effectiveStats`, `profile.js`, `titles.js`).
  Verify each CUT names its blast radius.
- **Constraint fidelity** — `combat.js` purity (titan movement must NOT leak into it), single
  `effectiveStats` pipeline, additive-or-migrated save schema, premium currency staying offline-earnable.
- **Faithfulness to the directive** — every one of the author's specific asks (§1–§7 above) is
  addressed by some author; nothing silently dropped. Especially the exact numbers (25/50/100% drops,
  1 SE/area, ~10 titan hits, 10+min abilities) and the set rules (Legendary/SE = sets, Titan ≠ set).
- Build an independent read of the codebase's cut-blast-radius first; challenge authors by name; write
  `50-critique.md`; notify the lead of load-bearing disputes.

## Cross-talk protocol (RULE 2 — mesh, not hub)
Genuine overlaps to coordinate directly (SendMessage the owner):
- Premium shop (Economy) **absorbs** scattered systems the cull (Architect) recommends CUT/MERGE →
  align on which sinks move into the shop.
- Item rarities/sets (CombatWorld) ↔ Legendary/SE **set** content and Titan item power (Economy's
  drop economy + the existing `sets.js`).
- Active abilities' stamina cost (Progression) ↔ the Qi economy + premium stamina upgrades (Economy).
- Combat side-panel + tab removal (CombatWorld) ↔ the IA/tab restructure (Architect).
Message the lead when your deliverable is done, flagging any cross-author conflict for adjudication.
