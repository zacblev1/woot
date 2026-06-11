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
| **C — Games & competition** (async executor, daily Wordle, highscores, typespeed, Snake) | ⬜ Not started | _none yet_ | — |
| **D — Wall guestbook** (Turso, /api/wall, wall command) | ⬜ Not started | _none yet_ | — |

Deliberately deferred (see spec "Deferred / rejected"): the `ai` command,
live presence, wall approval queue.

## How to pick back up

1. Read the spec section for the next sub-project (C is next: sections C0–C4;
   do C0, the async executor, first — it unblocks `highscores` and `wall`).
2. Write an implementation plan for it (superpowers:writing-plans) modeled on
   `plans/2026-06-09-terminal-depth.md` — bite-sized TDD tasks with full code,
   saved to `plans/`.
3. Execute task-by-task (subagent-driven or inline), with the full gate before
   every commit: `npm run lint` (0 errors / 0 warnings), `npm run typecheck`,
   `npx vitest run`, `npm run build`.
4. Finish each sub-project with a whole-range review pass (the Plan A final
   review caught a real input-lock race — worth repeating).

### Sequencing notes for B–D

- **C0 (async executor)** is the enabler for `highscores` (C2) and `wall` (D):
  widen `CommandDefinition.execute` to allow `Promise<CommandResult>`, make
  `executeCommand` + `handleCommand` await. Do it first within C.
- Adding `typespeed`/`snake` to `GAME_TYPES` in `lib/scores.ts` automatically
  extends the scores API zod validation and GET validators.
- The wall needs a new Drizzle table + committed migration; remember the
  production caveat: the existing `drizzle/0000` migration CREATEs
  `high_scores`, so baseline it before ever running `drizzle-kit migrate`
  against a database that already has that table.

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
- **Data typos surfaced by `stats`:** `data/books.json` has genre
  `"Philosohpy"` (charted as its own bar); `data/hardware.json` Mac Mini M4
  lists `"21GB"` memory (M4 Pro ships 24GB — likely a typo).

## Repo state reminders

- **Nothing is pushed** — all work since `d536c24` is local on `main`.
- Tests: 853 passing · lint 0/0 · typecheck clean · build green (as of
  sub-project B completion).
- Tour note: the closing tour narration omits `wall` (ships in D) — add a
  `wall` line to `TOUR_STEPS` in `components/terminal.tsx` when D lands.
- Site URL for metadata/RSS comes from `NEXT_PUBLIC_SITE_URL` (set in prod).
- `WALL_ADMIN_TOKEN` env var will be needed when sub-project D ships.
