# Terminal Enhancements — Design

**Date:** 2026-06-09
**Status:** Approved
**Scope:** Four sub-projects, built in order: (A) terminal depth, (B) first-visit & mobile, (C) games & competition, (D) wall guestbook. The `ai` command was considered and explicitly deferred (running cost).

## Context

The site is a single-page terminal portfolio. Commands live in a registry
(`lib/commands/`) of pure functions receiving an `ExecuteContext`;
`components/terminal.tsx` hosts React state and dispatches via
`executeCommand`. Scores use Turso + Drizzle with zod validation and an
in-memory per-IP rate limiter (`lib/scores.ts`). Canvas games follow a
pattern: pure `logic.ts` + lazy-loaded component + `useHighScores`.
All work below is TDD: failing test first, then implementation; every
sub-project lands with lint (0 errors/warnings), typecheck, full test suite,
and production build green.

---

## A — Terminal depth

### A1. Pipes

**Behavior.** `cmd1 | filter1 | filter2 …`. The first segment may be any
registry command; subsequent segments must be filter commands. Rich output
(`TerminalLine[]`) is flattened to its `content` strings before entering the
pipe; the pipeline's final output renders as plain `output` lines. Any stage
error aborts the pipeline and renders that error. A filter used as a normal
command without piped input returns a usage error. Pipe splitting does not
need quote-awareness (no current command takes quoted `|`).

**New filter commands** (registered with a `filter: true` marker on
`CommandDefinition`; their `execute` receives input lines via a new optional
`stdin?: string[]` in `ExecuteContext`):

| Command | Behavior |
|---|---|
| `grep <pattern> [-v]` | case-insensitive substring match; `-v` inverts |
| `head [n]` | first n lines (default 10) |
| `tail [n]` | last n lines (default 10) |
| `wc` | line count of non-empty lines |
| `sort [-r]` | lexicographic sort, `-r` reverses |

**Implementation.** `lib/commands/executor.ts` gains pipeline handling:
split on `|`, execute first segment, flatten output to `string[]`, feed each
filter via `context.stdin`. Tests: per-filter unit tests + pipeline
integration tests (`ls | grep`, multi-stage, error propagation, filter
without stdin).

### A2. History

- `history` (registry command): numbered list of recent commands. Requires
  `ExecuteContext.history.commands: () => string[]` (terminal already holds
  `commandHistory` state).
- `!!` / `!n` expansion happens in `handleCommand` before dispatch; the
  expanded command is echoed as the input line (bash behavior). Unknown `!n`
  → `event not found` error.
- Ghost autosuggestion: `InputLine` renders the most recent history entry
  that starts with the current input as dimmed text after the cursor;
  ArrowRight at end-of-input accepts it. Terminal computes the suggestion and
  passes it as a prop.

### A3. Easter eggs

- `rm -rf /`: intercepted before the real `rm`; plays a scripted meltdown
  (staged lines with delays, fake kernel panic) then "reboots": clears
  history to the banner. VFS state untouched. Reduced-motion: prints the
  panic instantly without staged delays.
- `vim` / `vi` / `nano`: enters a trapped mode (terminal-side, like game
  mode); all input answers with vim-style errors until `:q` / `:q!` exits.
- `sl`: ASCII locomotive revealed line-by-line (single frame); rendered
  instantly under reduced motion.
- `cowsay <text>`: speech-bubble cow, wraps text at ~40 cols.
- Konami code (`↑↑↓↓←→←→ba` on the keydown listener): unlocks hidden
  `phosphor` theme (green-on-black CRT). Until unlocked it is absent from
  `theme` listing/completion; unlock persists in localStorage and prints a
  one-line announcement.

---

## B — First-visit & mobile

### B1. `tour`

Scripted walkthrough defined as data: steps of `{ narrate?: string[],
type?: string }`. The terminal types each command with a typewriter effect
(~40ms/char), executes it for real, pauses between steps. Any keypress or
Ctrl+C skips/aborts. Reduced motion: no typewriter, steps execute with
minimal delay. Banner gains: `Type 'tour' for a guided demo.`
Script (initial): help → cd books → ls → view <a book> → cd ~/vinyl →
search <artist> → stats → game (list) → closing narration pointing at
`wall`, `theme`, Ctrl+K.

### B2. Mobile key bar

Component rendered between history and input when `(pointer: coarse)`
matches (via `useSyncExternalStore` on `matchMedia`). Keys: `Tab`, `↑`, `↓`,
`Ctrl+C`, `Esc`, `⌘K`. Each button invokes the same handler paths as the
physical keys (props from Terminal; no synthetic KeyboardEvents). Buttons are
`aria-label`ed; bar is hidden on fine-pointer devices.

### B3. `stats`

Registry command. ASCII horizontal bar charts (`█` bars scaled to a 24-col
max, counts appended) over `context.collections`: top 8 book genres, top 8
vinyl genres, book formats, vinyl formats, hardware status. Pure string
output; unit tests assert bar scaling and ordering.

---

## C — Games & competition

### C0. Async executor (enabler)

`CommandDefinition.execute` return type widens to
`CommandResult | Promise<CommandResult>`; `executeCommand` becomes async and
awaits; `handleCommand` awaits dispatch. All existing sync commands
unchanged. Needed by `highscores` (C2) and `wall` (D).

### C1. Daily Wordle

- Word = `WORDS[seededIndex(localDateString)]` via a small deterministic
  hash; same word for everyone on a given local date.
- `game wordle` = daily; `game wordle practice` = current random behavior.
- Streak in localStorage: `{ lastWinDate, streak }`; win on consecutive day
  increments, gap resets. Daily completion also recorded so replaying the
  same day shows results instead of a fresh game.
- Win/lose output includes the shareable emoji grid (🟩🟨⬛ rows) and streak.

### C2. `highscores [game]`

Async registry command: fetches `/api/scores/<game>?limit=10` (default:
shows all four leaderboards' top 3). Renders arcade-style table (rank,
initials, score, level/date). Graceful on fetch failure / empty DB.

### C3. `typespeed`

Text game via the existing GameController pattern (pure logic + tests):
three sentences (fixed pool, seeded pick), timer starts when a sentence is
displayed, ends on Enter; per-round WPM (chars/5 per minute) and accuracy
(Levenshtein-free: per-char compare); final score = average WPM × accuracy.
Submits to Turso (`typespeed` added to `GAME_TYPES`; score = final WPM×100
integer). High-score initials entry reuses the text-game flow.

### C4. Snake

Canvas game following the tron/basketball pattern:
`components/games/snake-game/{logic.ts,SnakeGame.tsx,index.ts}` +
`__tests__/logic.test.ts`. Pure logic: grid, direction queue (no reversing),
growth, wall/self collision, speed-up every 5 food. Arrow/WASD keys, Escape
exits, high scores via `useHighScores('snake')` (`snake` added to
`GAME_TYPES`). Lazy-loaded via `next/dynamic`. Registered in `game` command
list/completions/man page.

**Note:** extending `GAME_TYPES` automatically extends the scores API zod
enum and both GET validators (single source in `lib/scores.ts`).

---

## D — `wall` guestbook

### Data

New Drizzle table `wall_messages`: `id` (autoincrement), `name`
(text, nullable, ≤16 chars), `message` (text ≤140), `ipHash` (text — SHA-256
of IP + server salt, for abuse tracing only), `createdAt`. Committed
migration. Index on `createdAt desc`.

### API — `/api/wall`

- `GET`: latest 50, `{ messages: [{ id, name, message, createdAt }] }`
  (no ipHash exposure), `Cache-Control: s-maxage=15, stale-while-revalidate=60`.
- `POST`: zod — `message` 1–140 chars after trim; optional `name` 1–16 chars
  `[A-Za-z0-9 _-]`. Rejected if: contains a URL (`https?://|www\.`), fails a
  small profanity blocklist (substring match on a normalized form), or the
  per-IP limiter trips (3 posts/hour, generalized from `lib/scores.ts`
  limiter into a shared `lib/rate-limit.ts`). 503 without DB.
- `DELETE /api/wall?id=<id>` with header `x-admin-token` matching
  `WALL_ADMIN_TOKEN` env var; 401 otherwise; 404 unknown id.

### Command

- `wall` — renders the board BBS-style: header, then
  `#id  [date]  <name?>  message` lines, newest first.
- `wall <message…>` — posts with no name (stored NULL; rendered as
  "guest"). A named-post command form is omitted — YAGNI; the API's `name`
  field exists for potential future use.
- `wall purge <id> <token>` — calls DELETE; hidden from help/man listing.
- Async commands via C0. Degrades with a friendly message when DB absent.

---

## Cross-cutting

- **Testing:** every new pure module unit-tested; pipeline/history/eggs get
  characterization-level tests through the Terminal harness; API routes get
  route-handler tests (no network, db-null paths).
- **Help/man/completion:** every new visible command added to `help`, man
  pages, COMMAND_DESCRIPTIONS, VALID_COMMANDS, and completion. Hidden:
  `wall purge`, `phosphor` (pre-unlock), easter eggs (discoverable, not
  listed — except `cowsay`, which is fully listed (help/man/completions):
  it is harmless and fun enough to advertise.
- **Reduced motion:** sl/meltdown/tour all degrade to instant/static.
- **Sequencing:** A → B → C → D, one commit series per sub-project, full
  gate (lint 0/0, typecheck, tests, build) before each commit.

## Deferred / rejected

- `ai` command (running costs) — revisit later; no stub shipped.
- Live presence (infra-heavy, low value).
- Wall approval queue (auto-publish + filter + purge chosen instead).
