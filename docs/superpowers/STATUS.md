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

### Debian VM (`debian` command) — ✅ built, not yet deployed

Real Debian 12 running in the visitor's browser via v86: no server-side
execution and no NIC. Requested via the site form by a student in a CS
class. Spec: **`specs/2026-10-07-debian-vm-design.md`**. App code is in
`components/debian-vm/` + `lib/commands/commands/debian.ts`. The image is
built by `tools/debian-vm/build.sh` into `public/vm/` (~307 MB, gitignored
and dockerignored), and `tools/debian-vm/probe.mjs` is the end-to-end browser
check (see its README).

**Deployed image location:** `~/homelab/data/woot-vm/`, bind-mounted
read-only at `/app/public/vm` (`services/woot/docker-compose.yml`) and
excluded from NAS backups because it's regenerable. To rebuild:
`tools/debian-vm/build.sh ~/homelab/data/woot-vm`, then restart the
container. Without the mount, `debian` just says the image isn't installed.
**Remaining from spec "Size work":** prune kernel modules (stored size only)
and try 128 MB guest RAM (snapshot size).

## How to pick back up

**The A→D slate and the follow-up bug pass are complete.** Remaining known
work is the deploy checklist below; after that, this effort is done unless
new ideas land in the spec.

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

## Follow-up queue

**Empty.** Post-slate additions (2026-06-11, browser-verified with Playwright +
system Chrome): the tour was being aborted by its own launching Enter
keystroke in real browsers (React flushes discrete-event effects synchronously
— the window listener now attaches a task late, `b2b6209`), and **DOOM**
shipped as a seventh game (`game doom`: raycast FPS, demons, iddqd/idkfa,
high scores; `fe475bf`). All five earlier queued bugs fixed (commits `cebf719..8c56032`):
the `&&` chain race (deep links + palette now run through `runCommandChain`
with a state-flush pause, regression-tested), key-bar buttons all abort the
tour, swipe steering for snake/tron/pacman (`lib/hooks/useSwipe.ts`),
typespeed reserves `q` as quit at the initials prompt, and the
Philosohpy/21GB data typos. Add new findings here as they come up.

## Repo state reminders

- `main` is pushed to `origin`; changes ship via PR (homelab `AGENTS.md`).
- Tests: 1012 passing · lint 0/0 · typecheck clean · build green (as of the
  Debian VM work, 2026-10-07).
- `useHighScores` accepts any `GameTypeName` from `lib/scores.ts`
  (GAME_TYPES: tron, pacman, basketball, typespeed, snake).
- Site URL for metadata/RSS comes from `NEXT_PUBLIC_SITE_URL` (set in prod).
