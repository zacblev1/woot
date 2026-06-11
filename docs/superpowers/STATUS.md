# Terminal Enhancements — Status & Pick-Up Guide

_Last updated: 2026-06-11_

## Where things stand

The approved design is **`specs/2026-06-09-terminal-enhancements-design.md`**
(four sub-projects, A→D). Build order, conventions, and per-feature detail
all live there.

| Sub-project | Status | Plan | Commits |
|---|---|---|---|
| **A — Terminal depth** (pipes, history/!!, ghost suggest, easter eggs) | ✅ **Done** | `plans/2026-06-09-terminal-depth.md` | `bd5244e..ceb32d0` (13 commits) |
| **B — First-visit & mobile** (tour, mobile key bar, stats) | ✅ **Done** | `plans/2026-06-11-first-visit-mobile.md` | `854e39a..cafd0af` (6 commits) |
| **C — Games & competition** (async executor, daily Wordle, highscores, typespeed, Snake) | ✅ **Done** | `plans/2026-06-11-games-competition.md` | `090b3fe..` (9 commits) |
| **D — Wall guestbook** (Turso, /api/wall, wall command) | ✅ **Done** | `plans/2026-06-11-wall-guestbook.md` | `1ae4d26..` (6 commits) |

Deliberately deferred (see spec "Deferred / rejected"): the `ai` command,
live presence, wall approval queue.

## How to pick back up

**The A→D slate is complete.** Next up, per the user: a follow-up pass on the
"Follow-up queue" below (small bugs noticed en route, deliberately not fixed
mid-slate). The same working agreement applies: failing test first, full gate
before every commit, finish with a review pass.

### Deploy checklist for the slate (when pushing/shipping)

- Baseline `drizzle/0000` on the existing Turso DB (it CREATEs `high_scores`,
  which already exists in prod) **before** `drizzle-kit migrate`; then `0001`
  (wall_messages) applies cleanly.
- Set `WALL_ADMIN_TOKEN` (enables `wall purge`/DELETE) and optionally
  `WALL_IP_SALT` (IP-hash salt; defaults to empty string) in production.

### Harness notes (for Claude sessions)

- Foreground subagents can run commands here; **background** ones get
  permission-denied (so don't resume completed agents for fix rounds —
  dispatch fresh foreground ones).
- Test mocks for `ExecuteContext` live in `lib/commands/__tests__/*`; adding
  required context fields means sweeping every mock (a scripted pass — see
  Plan A Task 1 Step 2 for the pattern).

## Follow-up queue (bugs noticed en route — fix after the A→D slate)

- **Stale-state race in `&&` chains (suspected, untested):** deep links
  (`/?cmd=cd books && search dune`) and the command palette both run chained
  parts synchronously through one render's `handleCommand` closure, so part 2
  sees a stale `currentDirectory`. This is the exact race the tour hit (fixed
  there with `TOUR_REDUCED_STEP_MS = 50`); these two paths still have it.
  VFS-backed commands (`pwd`, `ls`) are immune (the VFS object mutates
  synchronously) — only `currentDirectory`-dependent ones (`search`, `genre`,
  `format`, `type`) misbehave. Repro: load `/?cmd=cd%20books%20%26%26%20search%20dune`.
- **Key bar ↑/↓/Tab during tour fight the typewriter (cosmetic):** they edit
  the input mid-animation instead of aborting like Esc/Ctrl+C do. Either make
  every key-bar button abort the tour, or no-op the editing ones while touring.
- **Canvas games have no touch controls:** snake (new in C) shares the
  tron/pacman limitation — arrow/WASD only, unplayable on phones. A swipe
  handler (or reusing the mobile key bar's arrows during canvas games) would
  cover all three.
- **Typespeed initials prompt eats 'q':** a lone `q` (or any 1-3 alnum) is
  treated as initials and posted; only `quit`/`skip` exit. Consider reserving
  `q` or confirming before posting.
- **Data typos surfaced by `stats`:** `data/books.json` has genre
  `"Philosohpy"` (charted as its own bar); `data/hardware.json` Mac Mini M4
  lists `"21GB"` memory (M4 Pro ships 24GB — likely a typo).

## Repo state reminders

- **Nothing is pushed** — all work since `d536c24` is local on `main`.
- Tests: 939 passing · lint 0/0 · typecheck clean · build green (as of
  sub-project D / slate completion).
- `useHighScores` accepts any `GameTypeName` from `lib/scores.ts`
  (GAME_TYPES: tron, pacman, basketball, typespeed, snake).
- Site URL for metadata/RSS comes from `NEXT_PUBLIC_SITE_URL` (set in prod).
