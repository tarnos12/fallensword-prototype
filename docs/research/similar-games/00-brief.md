# Research Sprint 2 — Similar Games (genre neighbors) vs. Fallen Immortal

**Purpose:** Study games *similar to* Fallen Immortal — beyond FallenSword itself — and extract
transferable design ideas, pacing models, and retention mechanics that could inform our next
direction. This is **Phase 1 of 3**: (1) this similar-games study → (2) a later team compares this
against our FallenSword study → (3) a later team writes a change proposal. Keep this phase
**descriptive + relevance-tagged**, NOT prescriptive — do not propose changes to our project yet
(that's Phase 3). Surface ideas and label their relevance; the proposal comes later.

This is the **shared context doc**. You (a teammate) woke with no conversation history — read this
fully, then read the files it points to.

## Who we are / project state (read these first)
- **`PROJECT.md`** (repo root) — shipped reality. **Fallen Immortal** = offline-first, xianxia-flavored,
  FallenSword-inspired stat-math dungeon-crawler. Pure HTML/JS/CSS ES modules, no build step.
  **Stages 0–3 complete; demo/1.0-ready.** READ IT.
- **`GDD.md`** — design authority (staged roadmap; predates Stage 3, so PROJECT.md wins on conflicts).
- **`CLAUDE.md`** — team methodology (auto-loaded). The 3 rules bind you: (1) edit ONLY your own file,
  (2) message teammates directly, (3) work in parallel.
- **The FallenSword study (Sprint 1) — READ THESE, don't re-derive:** `docs/research/10-core-mechanics.md`,
  `docs/research/20-meta-systems.md`, `docs/research/30-critique.md`, `docs/research/40-next-steps.md`.
  They establish what we already know about our FallenSword lineage and our shipped systems. Frame your
  findings *relative to* what's there — flag where a similar game does something FallenSword (and we)
  do NOT.

## Our design pillars & hard constraints (a transferable idea must respect these)
- **Numbers you can read** — transparent stat-math combat, not hidden-RNG theater.
- **Sessions, not marathons** — a resource (Qi) gates play; wall-clock/offline regen.
- **Offline-complete, online-ready** — nothing needs a server in 1.0; every multiplayer-shaped system
  lives behind a **provider interface** (NPC now, network later).
- `combat.js` is a pure deterministic function; one `effectiveStats` aggregation pipeline; additive
  save schema; self-contained feature modules. (Full detail in `PROJECT.md`.)
- Xianxia skin: Qi (stamina), cultivation realms/stages (levels), spirit stones (gold), techniques
  (skills), Sect (guild), Treasure Pavilion (auction house), calamity bosses (legendary creatures),
  Ascension/NG+ (prestige), Spirit Cards + Beast Codex (collection/retention).

---

## Scope — three researchers, three clusters (your cluster is in your spawn prompt)

Each researcher covers ~4–7 representative games in their cluster. Anchor games are **suggestions to
start from, not a fixed list** — verify each game exists and is what you think, add better exemplars
you discover, drop ones that turn out irrelevant. For EACH game, cover:
1. **What it is** (platform, era, still-live?, single-player vs MMO, one source URL).
2. **The mechanics that matter to us** — combat/progression math, session-gating resource, offline/
   idle model, economy, prestige/NG+, collection/retention, social/fake-MP, monetization shape.
3. **What it does that FallenSword (and we) don't** — the transferable delta.
4. **Relevance-to-us tag** per idea: **[HIGH]** (fits our pillars + a plausible fit for our stack),
   **[MED]**, **[LOW/SKIP]** (violates a pillar/constraint, or needs real multiplayer/a server).

### Cluster A — Direct browser stat-math MMORPG neighbors (Researcher-Neighbors)
FallenSword's actual cousins. Anchors to verify: **Eldevin** (Hunted Cow's own MMORPG), **Torn**,
**Sryth**, **Kingdom of Loathing**, **Gladiatus**, **Improbable Island**, **Duels.com**, **Outwar**,
**AdventureQuest/BattleOn**. Lens: how they handle the *same* problems we do — hit-chance math,
energy/stamina gating, gear/loot tiers, PvP, player economy, quest chains.

### Cluster B — Idle / incremental RPGs (Researcher-Idle)
Our offline-first / wall-clock / prestige cousins — likely the richest source of transferable ideas
for our Qi-regen, Ascension, and retention design. Anchors: **Melvor Idle** (strongest comparator —
offline idle RPG, single-player, huge retention), **NGU Idle**, **Legends of IdleOn**,
**Idle Champions**, **Realm Grinder**, **Trimps**, **Kittens Game**, **Antimatter Dimensions**,
**Idle Slayer**. Lens: offline/wall-clock progression, prestige-loop depth (vs our Ascension), grind
longevity + number-goes-up pacing, session-gating vs. always-idle, how they keep a solo grind alive
for hundreds of hours.

### Cluster C — Xianxia / cultivation games (Researcher-Xianxia)
Our flavor + pacing cousins — our entire reflavor is xianxia, so how these deliver realms,
breakthroughs, sects, and spirit-stone/pill economies is directly relevant. Anchors: **Immortal
Taoists** (idle cultivation), **Amazing Cultivation Simulator** (sect-management sim — relevant to our
Sect), **Tale of Immortal**, **Idle cultivation mobile games** generally, **Cultivation Quest**, and
any notable text/web cultivation RPGs. Lens: realm/breakthrough pacing (bottlenecks, tribulations),
sect/faction systems, spirit-stone/pill/alchemy economies, how xianxia flavor is delivered through
mechanics (not just skin), and the "fast early → deliberately slows" curve GDD §9.1 wants.

---

## FACT-QUALITY RULES (hallucination risk is HIGH — many niche/foreign/defunct games)
- **Cite a source URL** for every non-obvious claim (official site, wiki, store page, dev post,
  reputable coverage). If you can't source it, tag it **[UNVERIFIED]** — do not assert it. The Critic
  WILL challenge unsourced claims, especially oddly-specific numbers, dates, and non-English-game
  mechanics.
- Distinguish "this game does X" (sourced fact) from "we could adapt X" (your relevance judgment).
- Don't over-claim relevance: an idea that needs a live server or breaks a pillar is **[LOW/SKIP]**,
  say so plainly.

## Output & ownership (RULE 1 — you edit ONLY your own file)
- Researcher-Neighbors → `docs/research/similar-games/10-direct-neighbors.md`
- Researcher-Idle → `docs/research/similar-games/20-idle-incremental.md`
- Researcher-Xianxia → `docs/research/similar-games/30-xianxia-cultivation.md`
- Critic → `docs/research/similar-games/40-critique.md`
- Lead (Opus) → `docs/research/similar-games/50-synthesis.md` (do NOT touch this one)

Each research doc: a short **cluster overview**, then per-game sections (the 4 points above), then a
**"Transferable ideas" table** at the end (idea · which game(s) · relevance tag · which of our
pillars/modules it touches · one-line why).

## Cross-talk protocol (RULE 2 — mesh, not hub)
- Games span clusters (e.g. an idle game with cultivation flavor, or a browser MMO that's also
  grindy-idle). If you and another researcher both want a game, `SendMessage` them directly to agree
  who owns it — don't double-cover.
- Critic: build your OWN independent baseline on the highest-profile anchors first, THEN review each
  doc as it lands and challenge by name (demand sources, flag over-claimed relevance, flag pillar/
  constraint violations dressed up as [HIGH]). Notify the lead of load-bearing disputes.
- Message the lead (this session) when your deliverable is done.
