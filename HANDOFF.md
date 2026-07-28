# HANDOFF.md — Session Handoff (read after CLAUDE.md → PROJECT.md)

Last updated: 2026-07-12, end of the long orchestration session (session
`01StytquqHVUcgK8Y2iAMYUa`, Claude Code on the web). `master` @ the PR #50 merge.
**Start here to resume:** read `CLAUDE.md` (how to operate), `PROJECT.md` (what
the project is + current status), then this file (what just happened, what's
parked, what's next). Keep this file current: update it in the same commit as
any change that makes it stale.

---

## Where things stand

- **The game is demo/1.0-ready.** Stages 0–3 complete, TESTING scaffolding
  stripped (real Qi 120 / pack 12), balance harness green (`node
  tools/balance.mjs` → ALL ROWS PASS), zero console errors in Chromium at
  desktop + mobile widths. Full detail in `PROJECT.md` → Current status.
- **Every task this session landed as a merged PR** (#13, #39–#50): full-view
  tab UX, map side-panel layout, instant tooltips everywhere, per-source stat
  breakdown, salvage system, third zone (Stormcrown Peak), CF endgame quest
  saga + first named Mythic, third boss (Jiuxiao — first Mythic drop source),
  the strip, the agent-teams kit adoption, and the docs cleanup.
- **Playable build (author's test link):** the published Artifact
  <https://claude.ai/code/artifact/de389f71-5bf3-4417-84fa-9152efaebb13> — a
  self-contained single-file bundle of `master`. **Redeploy it after any
  player-visible merge**: `npx esbuild js/main.js --bundle --format=iife
  --minify` for the JS; inline all `<link>` stylesheets from `index.html` (plus
  `css/sectmissions.css` + `css/ascension.css`, which are runtime-injected —
  add inert `<link data-sectmissions><link data-ascension>` markers so the
  modules skip re-injecting); keep the game's `<title>`/favicon/theme-bootstrap;
  add a localStorage try/catch shim; republish to the SAME artifact URL.

## Parked threads (need author input or one manual step)

1. **GitHub Pages** — parked by the author. State: `.github/workflows/pages.yml`
   mirrors `master` → `gh-pages` branch on every push (that part works), but the
   Pages SITE was never enabled: `actions/configure-pages` with
   `enablement: true` fails ("Resource not accessible by integration" — needs
   admin scope no workflow token has), and pushing a `gh-pages` branch did NOT
   auto-enable it. Finishing it is one manual click: repo **Settings → Pages →
   Deploy from a branch → `gh-pages` / root**. Note: cloud sessions cannot
   verify `*.github.io` (egress blocked) — verify Pages from a local machine.
2. **`coordination` branch (remote)** — carries the RETIRED Central-Dispatch
   task board (`TASKS.md`, `TASK_2/3/4.md`) from the old multi-session model.
   Deletion was offered and is awaiting the author's OK. Do not follow anything
   on that branch; the current methodology is `CLAUDE.md` (agent teams).
3. **GDD staleness** — `GDD.md` (renamed from `GDD_Staged_Roadmap.md` in PR #50)
   predates late Stage-3 work; `PROJECT.md` reflects shipped reality. A GDD
   sync pass was offered, not requested.

## Standing author directives (instituted this session — keep honoring)

- **PR per task**: open a PR when the task is done; merge it once tested and
  working. Nothing merges untested; the lead opens and merges its own PRs.
- **Model routing**: the top-tier main loop never does work a cheaper model can
  (Haiku mechanical, Sonnet well-specified slices, Opus complex builds + ALL
  adversarial verify/QA). Batch tiny edits — per-agent overhead is ~50k tokens.
- **After every completed work item, report model/token usage** to the author
  (which model did what, subagent token counts, routing lessons).
- Cloud sessions: **never hand the author a localhost link** — verify
  in-container, redeploy the Artifact instead.

## Hard-won lessons (do not relearn these the expensive way)

- **Never hand-roll stat scaling.** The engine is `base + perLevel·(lv−1)`
  (`actors.js`) and boss stat blocks are literal. Two builds shipped fictional
  balance numbers by modeling scaling by hand; both were caught by adversarial
  verification. All tuning goes through `spawnCreature`/`resolveCombat`/
  `effectiveStats`, gear-roll-sampled (outcomes are near-deterministic per
  statline — sample GEAR, not just fights). `tools/balance.mjs` is the gate.
- **Adversarial verification pays for itself.** It caught the wrong-formula
  zone tuning, a hardcoded boss-drop codex string, and a builder falsely
  claiming it had checked for hardcoded assumptions. Keep verify separate from
  build, keep it Opus.
- **Kill stale dev servers before Chromium checks** — a lingering `npx serve`
  once served a pre-change module graph and made a correct feature look broken.
  Use a fresh port per check; kill it after.
- **First-run tutorial blocks map keys** in smoke tests — suppress with
  localStorage `fallen-immortal-tutorial-seen=1` before load. Boss codex
  entries are discovery-gated (fresh saves show "☠ ???"), so don't assert boss
  text on a fresh save.

## Suggested next work (in rough order)

1. **Playtest burn-down** — the author is playing the Artifact build; triage
   whatever feedback arrives. No new systems gated on this.
2. **Enable Pages** (one manual click, above) if the author wants a public URL.
3. **2.0 direction (needs author sign-off on backend choices):**
   `NetworkMarketProvider` etc. implementing today's provider interfaces
   unchanged (`market.js`/`guild.js` are the references; see `PROJECT.md`).
