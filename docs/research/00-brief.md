# Research Sprint — FallenSword vs. Fallen Immortal (our game)

**Purpose:** Learn how the FallenSword browser MMORPG actually works, compare it against
(a) our design authority `GDD.md` and (b) our **shipped game state** (the real `js/` code),
and surface a prioritized set of gaps/opportunities so the lead can plan next steps.

This is the **shared context doc** for the research team. You (a teammate) woke with no
conversation history — read this fully, then read the files it points to.

---

## Who we are / project state (read these first)

- **`PROJECT.md`** — the team-facing distillation of shipped reality. READ IT FULLY. Key facts:
  **Fallen Immortal** = offline-first, xianxia-flavored, FallenSword-inspired stat-math
  dungeon-crawler. Pure HTML/JS/CSS ES modules, no build step. **Stages 0–3 are complete;
  demo/1.0-ready, balance-harness-green.**
- **`GDD.md`** — the design authority (the staged roadmap). Note: it **predates most of Stage 3**;
  where GDD and PROJECT.md disagree, PROJECT.md is shipped truth and GDD's *intent* still holds
  but its literal detail may be stale (e.g. GDD "stamina" shipped as "Qi", "gold" as "spirit stones").
- **`CLAUDE.md`** — team methodology (auto-loaded). **The 3 rules bind you:** (1) edit ONLY your own
  file, (2) message teammates directly for dependencies, (3) work in parallel.

## Xianxia reflavor map (so FallenSword terms line up with ours)
| FallenSword | Ours (Fallen Immortal) | Code |
|---|---|---|
| Stamina | Qi | `game.js`, wall-clock regen |
| Level / XP | Cultivation realms & stages (QC→FE→CF, MAX_STAGE 27) | `progression.js` |
| Gold | Spirit Stones | economy modules |
| Gear / artifacts | Artifacts/treasures (degrade+repair) | `items.js` |
| Skills / buffs | Techniques | `techniques.js` |
| Guild | Sect (hireable NPC disciples) | `guild.js` |
| Auction House | Treasure Pavilion (fake-MP market) | `market.js` + `personas.js` |
| Legendary creatures / Titans | Ancient Terrors / calamity bosses | `boss.js` |

## What's shipped in our `js/` (compare claims against the REAL code, not just PROJECT.md)
- Engine: `combat.js` (pure `resolveCombat(attacker,defender,seed)`), `actors.js`, `progression.js`
  (`effectiveStats` pipeline), `items.js`, `rng.js`, `js/zones/*` + `boss.js`.
- Systems: `quests.js`, `techniques.js`, `cards.js`, `market.js`, `guild.js`, `boss.js`,
  `bounties.js`, `trials.js`, `meridians.js`, `alchemy.js`, `sectmissions.js`, `sockets.js`,
  `sets.js`, `ascension.js`, `salvage.js`, `crafting.js`, `loadouts.js`, `rivals.js`, `duel.js`.
- Presentation: `ui.js`, `tabs.js`, `combatfx.js`, `toast.js`, `replay.js`, `theme.js`,
  `tooltips.js`, `input.js`, `itemcompare.js`, `audio.js`, `titles.js`, `stats.js`, `events.js`,
  `profile.js`, `achievements.js`, `settings.js`, `tutorial.js`, `bestiary`? (check).
- Core: `save.js`, `game.js`, `main.js`.

## Hard constraints any recommendation must respect (from PROJECT.md)
- `combat.js` stays a **pure deterministic function** — no game state/UI/rewards/wall-clock in it.
- One `effectiveStats(player, now)` aggregation pipeline; never mutate stats in place.
- Multiplayer-shaped systems live **behind provider interfaces** (NPC now, network later).
- `save.js` is versioned; new fields additive; single-owner file.
- Design pillars: numbers-you-can-read combat, sessions-not-marathons (Qi gate),
  offline-complete/online-ready.

---

## FACT-QUALITY RULES (critical — FallenSword is a niche 2000s-era game; hallucination risk is HIGH)
- **Cite a source URL** for every non-obvious FallenSword mechanical claim (wiki, forums, guides,
  archived pages). If you cannot find a source, mark the claim **[UNVERIFIED]** — do NOT state it
  as fact. The critic WILL challenge unsourced claims.
- Prefer primary/archived sources (FallenSword wiki, official forums, Wayback) over blog hearsay.
- Distinguish "how FallenSword did it" from "what we should do" — keep facts and recommendations
  in separate sections.

## Output & ownership (RULE 1 — you edit ONLY your own file)
- Researcher-Core → writes `docs/research/10-core-mechanics.md`
- Researcher-Meta → writes `docs/research/20-meta-systems.md`
- Critic → writes `docs/research/30-critique.md`
- Lead (Opus) → synthesizes `docs/research/40-next-steps.md` (do not touch this one)

Each research doc uses this structure:
1. **FallenSword mechanics** (sourced, with URLs; `[UNVERIFIED]` tags where needed)
2. **Our current state** (what the real `js/` code + GDD actually do — cite file/function)
3. **Gap analysis** (matches, divergences, what we're missing, what we do better/differently)
4. **Opportunities** (ranked; each tagged with rough effort S/M/L and which constraint it touches)

## Cross-talk protocol (RULE 2 — mesh, not hub)
- Researchers: if your areas overlap (e.g. buffs↔combat, market↔gear), `SendMessage` the other
  researcher directly to align — don't route through the lead.
- Critic: build your OWN independent FallenSword fact baseline first, THEN read the researchers'
  docs and challenge them by name via `SendMessage` (dispute a claim, demand a source, flag a
  recommendation that breaks a hard constraint). Notify the lead of load-bearing disputes.
- Message the lead (this session) when your deliverable is done.
