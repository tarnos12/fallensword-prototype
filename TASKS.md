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

| # | Task | Owned files (yours to edit freely) | Shared files (edit minimally, expect to rebase) | Status | Owner (session) | Branch | PR | Claimed (UTC) |
|---|---|---|---|---|---|---|---|---|
| S | Sect / Warband stub (`GuildProvider`) | `js/guild.js` | `js/game.js`, `js/ui.js`, `js/actors.js`, `index.html`, `css/style.css`, `js/main.js` | `IN REVIEW` | (initial) | `claude/read-repo-global-claude-md-rtc4og` | #3 | — |
| 1 | Legendary boss — hand-authored Ancient Terror, first Epic/named drops, boss Spirit Card | `js/boss.js` *(new)* | `js/actors.js`, `js/cards.js`, `js/items.js`, `js/game.js`, `js/ui.js`, `index.html`, `css/style.css` | `AVAILABLE` | — | — | — | — |
| 2 | Onboarding / tutorial pass — first-run guided intro | `js/tutorial.js` *(new)* | `index.html` (tutorial overlay), `css/style.css` (tutorial section), `js/main.js` (init) | `AVAILABLE` | — | — | — | — |
| 3 | Visual / UI polish pass | `css/style.css` | `index.html`, `js/ui.js` | `BLOCKED` | — | — | — | Do **last & solo** — pure cross-cutting CSS/UI, collides with every other task. Start only when 1 & 2 are merged. |
| 4 | Strip testing conveniences (pre-demo) | `js/debug.js` *(delete)* | `js/game.js`, `js/items.js`, `js/cards.js`, `js/main.js`, `index.html`, `css/style.css` | `BLOCKED` | — | — | — | Demo-prep only. Do **absolutely last**, after all features merge. See CLAUDE.md "TESTING-ONLY". |

> **Parallelism note:** Tasks **1** and **2** can run concurrently — their owned files are disjoint and they touch different parts of the shared files. Task **3** (polish) and **4** (strip) are deliberately serialized to the end; running them alongside feature work guarantees painful conflicts.

---

## Task Notes & cross-session comments

Append-only, newest first, per task. This is where sessions talk to each other.
Leave a note when you claim, when you hit a decision the next session should know,
when you leave work half-done, or when you touch a shared file in a way others
should rebase around. Format: `- [YYYY-MM-DD · session <id>] <comment>`.

### Task S — Sect / Warband stub
- [initial] Built and in review as PR #3. Adds `js/guild.js` + a `⛩ Sect`
  button/modal. Shared-file touches: `game.js` (maxQi/tickStones/attack hooks +
  hire/dismiss wrappers), `ui.js` (Sect modal render), `actors.js`
  (`player.guild`), `index.html` (button+overlay), `css` (sect styles),
  `main.js` (initSect). Rebase around these if your task also edits them.

### Task 1 — Legendary boss
- _(no notes yet — add yours when you claim)_

### Task 2 — Onboarding / tutorial
- _(no notes yet — add yours when you claim)_

### Task 3 — Visual / UI polish
- [initial] Blocked on purpose. This is a `css/style.css` + `index.html` +
  `ui.js` sweep that overlaps everything; running it during feature work
  guarantees conflicts. Start only after tasks 1 & 2 are merged.

### Task 4 — Strip testing conveniences
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

- _(add entries here: `YYYY-MM-DD — session <id> — claimed/finished task <#>: <note>`)_
