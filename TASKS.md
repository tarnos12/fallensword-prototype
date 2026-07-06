# Fallen Immortal — Parallel Task Board

**This file lives only on the `coordination` branch. It is never merged into `master`.**
It is the shared ledger that lets multiple Claude Code sessions work in parallel
without colliding. `master` stays code-only; this branch is the meeting point.

New session? Do this **before writing any code**:
1. `git fetch origin coordination && git checkout -B coordination origin/coordination`
2. Read the **Task Board** below **and the Task Notes** for anything you'd touch.
   Pick a row marked `AVAILABLE`.
3. Claim it (see **Claim protocol**). If your claim push is rejected, someone
   beat you — re-fetch, and either pick another task or redo the claim.
4. Build on a fresh feature branch off `master`. Open a PR into `master`.
5. Keep your row's status current: `CLAIMED` → `IN REVIEW` → `DONE`, **and jot
   any decisions/gotchas/handoff context in that task's Notes** (see below).

The board's columns are the machine-readable status (who owns what, right now).
The **Task Notes** section is the human layer — freeform comments sessions leave
each other: why a choice was made, what's half-done, a shared-file edit to watch
for, a dependency, anything the next session needs. Treat it like the comment
thread on the task.

---

## Status legend

| Status | Meaning |
|---|---|
| `AVAILABLE` | Unclaimed. Fair game. |
| `CLAIMED` | A session owns it and is working. Do **not** start it. |
| `IN REVIEW` | Work done, PR open, awaiting merge. |
| `DONE` | Merged into `master`. |
| `BLOCKED` | Not startable yet — see the reason in Notes. |

---

## Task Board

Task IDs are stable handles, not priority — go by the **Status** column. IDs 1–4 are claimable; 5–6 are `BLOCKED` until feature work lands.

| # | Task | Owned files (yours to edit freely) | Shared files (edit minimally, expect to rebase) | Status | Owner (session) | Branch | PR | Claimed (UTC) |
|---|---|---|---|---|---|---|---|---|
| S | Sect / Warband stub (`GuildProvider`) | `js/guild.js` | `js/game.js`, `js/ui.js`, `js/actors.js`, `index.html`, `css/style.css`, `js/main.js` | `DONE` | (initial) | `claude/read-repo-global-claude-md-rtc4og` | #3 | — |
| 1 | Legendary boss — hand-authored Ancient Terror, first Epic/named drops, boss Spirit Card | `js/boss.js` *(new)* | `js/actors.js`, `js/cards.js`, `js/items.js`, `js/game.js`, `js/ui.js`, `index.html`, `css/style.css` | `CLAIMED` | choose-task-fxtfot | `claude/choose-task-fxtfot` | — | 2026-07-06 |
| 2 | Onboarding / tutorial pass — first-run guided intro | `js/tutorial.js` *(new)* | `css/style.css` (tutorial section), `js/main.js` (init) | `IN REVIEW` | session_01Sty | `claude/onboarding-tutorial` | #5 | 2026-07-06 |
| 3 | Profile & Rivals feed (GDD §6.5) — profile panel with active buffs, a "Rivals" list and a "Recently Active" feed, populated from the shared `personas.js` roster | `js/profile.js` *(new)* | `index.html` (button + modal), `css/style.css` (profile section), `js/main.js` (init), `js/ui.js` (optional) | `CLAIMED` | pick-your-task-aj14ny | `claude/pick-your-task-aj14ny` | — | 2026-07-06 |
| 4 | Save export / import (GDD §4.4) — export the save as a copy-paste string / file and import it back (back up without an account) | `js/save.js` (additive `exportSave`/`importSave`) | `index.html` (backup buttons), `css/style.css`, `js/main.js` (wiring) | `IN REVIEW` | pick-your-task-wakee5 | `claude/pick-your-task-wakee5` | #6 | 2026-07-06 |
| 5 | Visual / UI polish pass | `css/style.css` | `index.html`, `js/ui.js` | `BLOCKED` | — | — | — | Do **last & solo** — pure cross-cutting CSS/UI, collides with every other task. Start only when 1–4 are merged. |
| 6 | Strip testing conveniences (pre-demo) | `js/debug.js` *(delete)* | `js/game.js`, `js/items.js`, `js/cards.js`, `js/main.js`, `index.html`, `css/style.css` | `BLOCKED` | — | — | — | Demo-prep only. Do **absolutely last**, after all features merge. See CLAUDE.md "TESTING-ONLY". |

> **Parallelism note:** Tasks **1–4** can run concurrently — each owns a distinct new module and touches different parts of the shared files. Tasks **5** (polish) and **6** (strip) are serialized to the end; running them alongside feature work guarantees painful conflicts. The likeliest overlap among 1–4 is `index.html`/`css`/`main.js` (each adds a button + modal + init) — keep those edits small and at separated anchor points, and expect the 2nd+ PR to rebase.

---

## Task Notes & cross-session comments

Append-only, newest first, per task. This is where sessions talk to each other.
Leave a note when you claim, when you hit a decision the next session should know,
when you leave work half-done, or when you touch a shared file in a way others
should rebase around. Format: `- [YYYY-MM-DD · session <id>] <comment>`.

### Task S — Sect / Warband stub
- [2026-07-06] DONE — merged to master via PR #3. `js/guild.js` + `⛩ Sect`
  modal. Shared-file touches now on master: `game.js` (maxQi/tickStones/attack
  hooks + hire/dismiss wrappers), `ui.js` (Sect modal render), `actors.js`
  (`player.guild`), `index.html` (button+overlay), `css` (sect styles),
  `main.js` (initSect). Branch off the latest master and these are already in.

### Task 1 — Legendary boss
- [2026-07-06 · session choose-task-fxtfot] Claimed. Building the Ancient Terror
  calamity boss in new module `js/boss.js`. Shared-file touches planned:
  `actors.js` (boss actor factory), `cards.js` (boss Spirit Card entry),
  `items.js` (Epic/named drop hooks), `game.js` (boss spawn/encounter + reward
  hook), `ui.js` (boss encounter render), `index.html` + `css` (boss styling).
  Working on branch `claude/choose-task-fxtfot`. Rebase around these anchors.

### Task 2 — Onboarding / tutorial
- [2026-07-06 · session session_01Sty] IN REVIEW — PR #5. Final footprint even
  smaller than planned: `js/tutorial.js` builds ALL its own DOM (the ❔ Help
  button + overlay), so it touches **NO `index.html` and NO `ui.js`**. Only
  shared edits: `css/style.css` (a `/* Onboarding / tutorial */` section
  appended at the very end) and `js/main.js` (one import + one `initTutorial()`
  line right after `renderAll()`). "Seen" state is its own localStorage key, not
  the save schema. Boss/Profile/Save sessions: nothing of mine to rebase around
  except a trailing CSS block + two main.js lines.

### Task 3 — Profile & Rivals feed
- [2026-07-06 · session pick-your-task-aj14ny] Claimed. Building the Profile &
  Rivals feed in new module `js/profile.js` — a read-only modal (👤 button) with:
  the player's summary + active buffs (technique buffs, Spirit Card bonuses, sect
  buffs — read off the same pipelines), a "Rivals" list and a "Recently Active"
  feed both drawn from the shared `personas.js` roster (deterministic, no second
  pool). Shared touches kept minimal: `index.html` (one button + overlay), `css`
  (profile section), `js/main.js` (initProfile). NOT touching `js/ui.js` to avoid
  colliding with the boss session (task 1). Branch `claude/pick-your-task-aj14ny`.
- [initial] Reuse the `personas.js` roster (same cast as market + sect) so the
  world feels consistent — do NOT invent a second persona pool. New `js/profile.js`
  owns it. Surface the player's active buffs (technique buffs + sect/card
  bonuses), a "Rivals" list, and a "Recently Active" feed drawn from personas.
  Read-only over existing data + a modal, so it's low-conflict. GDD §6.5.

### Task 4 — Save export / import
- [2026-07-06 · session pick-your-task-wakee5] IN REVIEW — PR #6. Done:
  additive `exportSave`/`importSave` in `save.js` (DOM-free; `FIMMORTAL-SAVE-v1:`
  + UTF-8-safe base64 envelope; import validates version 1/2 + `player`, rejects
  garbage/future/malformed, does NOT reload). Shared-file touches now on the
  branch: `index.html` (💾 Backup/Restore button next to reset + `#backup-overlay`
  modal), `css` (backup modal styles appended at EOF), `main.js` (`initBackup()`
  wiring + `exportSave`/`importSave` import). All at separated anchor points
  (button block near reset, overlay before `<script>`, CSS appended) — should
  auto-merge cleanly alongside tasks 2/3. Tested headless (15/15) + real Chromium
  (Playwright, 0 JS errors).
- [2026-07-06 · session pick-your-task-wakee5] Claimed. Building additive
  `exportSave`/`importSave` in `js/save.js` + Export/Import backup buttons.
  Shared touches kept minimal: `index.html` (two buttons, likely near save
  controls), `css` (backup section), `js/main.js` (wiring). Branch
  `claude/pick-your-task-wakee5`. Rebase around these anchors.
- [initial] Additive to `js/save.js`: `exportSave()` returns the JSON blob as a
  base64/string (and/or a downloadable file); `importSave(str)` validates, writes
  to localStorage, and reloads. Reuse the existing `KEY`/`VERSION` + migration
  path so imported old saves still migrate. Guard against malformed input.
  GDD §4.4 / Stage 3 pulled forward — also handy for sharing test saves.

### Task 5 — Visual / UI polish
- [initial] Blocked on purpose. A `css/style.css` + `index.html` + `ui.js` sweep
  that overlaps everything; running it during feature work guarantees conflicts.
  Start only after tasks 1–4 are merged.

### Task 6 — Strip testing conveniences
- [initial] Demo-prep, do last. Full strip checklist is in `CLAUDE.md` →
  "TESTING-ONLY — strip before demo". Deletes `js/debug.js` and unwinds the
  labelled hooks in `game.js`/`items.js`/`cards.js`/`main.js`.

---

## Claim protocol (the atomic part)

Claiming is a push race against this branch. **First push wins.** The whole ritual:

```bash
# 1. Get the latest board
git fetch origin coordination
git checkout -B coordination origin/coordination

# 2. Edit ONLY this file: set your task's Status to CLAIMED and fill in
#    Owner (your session URL/short id), Branch (the feature branch you'll use),
#    and Claimed (UTC date). Then:
git add TASKS.md
git commit -m "claim: task <#> (<session-id>)"

# 3. Push. This is the lock.
git push origin coordination
#    - Success  -> the task is yours. Go build.
#    - Rejected (non-fast-forward) -> someone else pushed first:
git fetch origin coordination
git reset --hard origin/coordination     # take their board
#      Re-read the board. If YOUR task is now taken, pick another and redo.
#      If a DIFFERENT task was claimed, redo your edit for your task and re-push.
```

Then build the actual feature on a **separate** branch off `master`:

```bash
git fetch origin master
git checkout -B claude/<short-task-name> origin/master
# ... implement, commit, push, open a PR into master ...
```

When your PR is open, flip your row to `IN REVIEW` (+ PR number) and push to
`coordination` again (same race rules). When it merges, flip to `DONE`.

**Abandoning a task?** Set your row back to `AVAILABLE` (clear Owner/Branch) and
push, so it frees up for someone else.

---

## How to keep merges clean

The claim board stops two sessions doing the *same* task. These rules stop their
*branches* from fighting over the same lines:

- **New system → new module.** Put the bulk of the work in your **owned** file(s).
  This is the project's core convention and the reason parallel work is viable.
- **Shared files are edit-minimally zones.** `js/game.js` (hooks/wrappers),
  `js/main.js` (wiring), `index.html` (buttons/modals), `css/style.css`. Add at
  well-separated anchor points; git auto-merges non-adjacent hunks.
- **Rebase before you merge.** Merge PRs into `master` **one at a time**, each
  rebased on the latest `master` first. The 2nd/3rd merges may need a small,
  mechanical integration fixup in the shared files — that's the only unavoidable
  residue, and it's cheap.
- **Status prose is a conflict magnet.** Per-task status goes in *this* board
  (row edits = both-add, trivial). Save the `CLAUDE.md` "Current status" /
  "Done" bullet for **your own PR only**, describing **your** feature.
- **Don't touch another task's owned files.** If you truly need to, coordinate by
  leaving a note in that task's row first.

---

## Session log (append-only; newest first)

Optional but helpful — a one-line breadcrumb per session so the next one has context.

- 2026-07-06 — pick-your-task-wakee5 — task 4 (Save export/import) IN REVIEW, PR #6.
- 2026-07-06 — pick-your-task-wakee5 — claimed task 4 (Save export/import).
- 2026-07-06 — session_01Sty — finished task S (Sect stub, PR #3 merged); added tasks 3 (Profile/Rivals) & 4 (Save export/import). Noted task 1 already claimed by choose-task-fxtfot.
- _(add entries here: `YYYY-MM-DD — session <id> — claimed/finished task <#>: <note>`)_
