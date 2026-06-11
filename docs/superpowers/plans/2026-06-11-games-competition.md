# Games & Competition (Sub-project C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Repo note:** background subagents get permission-denied in this repo; use inline execution (superpowers:executing-plans) or foreground subagents only.

**Goal:** Async command execution (C0), a daily Wordle with streaks and shareable emoji grids (C1), a `highscores` leaderboard command (C2), a `typespeed` text game with Turso submission (C3), and a Snake canvas game (C4).

**Architecture:** C0 widens `CommandDefinition.execute` to allow promises and makes the executor + terminal dispatch await. Daily-Wordle selection/streak/emoji logic is a pure module under `components/games/wordle-game/daily.ts`, consumed by the terminal's inline wordle state machine (the live path — `GameController` is not used by `terminal.tsx`). `highscores` is the first async registry command (fetches `/api/scores`). `typespeed` adds a pure logic module plus a new inline text-game state machine with a fetch-POST initials phase. Snake follows the tron canvas pattern (`logic.ts` pure + component + `useHighScores('snake')`), lazy-loaded. Spec: `docs/superpowers/specs/2026-06-09-terminal-enhancements-design.md` §C.

**Tech Stack:** Existing registry (`lib/commands/`), zod (`lib/scores.ts`), Vitest + RTL (happy-dom; global fetch stubbed in `vitest.setup.ts`), no new dependencies.

**Conventions for every task:** run tests with `npx vitest run <file>`; final task runs the full gate (`npm run lint && npm run typecheck && npx vitest run && npm run build`).

**Decisions locked here (spec ambiguities resolved):**
- `highscores` with no args iterates `GAME_TYPES` dynamically (the spec's "all four leaderboards" predates typespeed; by C4 it shows five).
- The emoji grid is shown for **daily** games only; practice keeps current output.
- A daily **loss** records completion but does not touch the streak record — the consecutive-day check naturally breaks it on the next win.
- Score submitted for typespeed = `Math.round(finalScore * 100)` where `finalScore = avgWpm × avgAccuracy`.
- Snake score = `foodEaten * 10`; level = `1 + floor(foodEaten / 5)` (mirrors the speed-up cadence).

---

### Task 1 (C0): Async executor

**Files:**
- Modify: `lib/commands/types.ts` (execute return type)
- Modify: `lib/commands/executor.ts` (async)
- Modify: `components/terminal.tsx` (`handleCommand` awaits dispatch)
- Test: `lib/commands/__tests__/executor.test.ts` (await sweep + async-command test)

- [ ] **Step 1: Write the failing test** — append to `executor.test.ts`:

```ts
describe('async commands', () => {
  it('awaits a promise-returning command', async () => {
    const registry = createRegistry()
    registry.register({
      name: 'slow',
      description: '',
      usage: '',
      execute: async () => {
        await new Promise((r) => setTimeout(r, 5))
        return { success: true as const, output: 'eventually' }
      },
    })
    const result = await executeCommand('slow', createMockContext(), registry)
    expect(result).toEqual({ success: true, output: 'eventually' })
  })

  it('pipes async output through filters', async () => {
    const registry = createRegistry()
    registry.register({
      name: 'slowlist',
      description: '',
      usage: '',
      execute: async () => ({ success: true as const, output: ['alpha', 'beta'] }),
    })
    registry.register(grepCommand)
    const result = await executeCommand('slowlist | grep beta', createMockContext(), registry)
    expect(result).toEqual({ success: true, output: ['beta'] })
  })
})
```

(`grepCommand` is already imported in this file for the pipeline tests; `createRegistry`/`createMockContext` are its existing helpers.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run lib/commands/__tests__/executor.test.ts` — Expected: FAIL (result is a Promise / output is a thenable, not `'eventually'`).

- [ ] **Step 3: Implement**

`lib/commands/types.ts` — `CommandDefinition.execute` return type becomes:

```ts
  execute: (
    args: string[],
    context: ExecuteContext
  ) => import('@/lib/types/terminal').CommandResult | Promise<import('@/lib/types/terminal').CommandResult>
```

`lib/commands/executor.ts` — make both functions async (signatures only change; bodies keep their logic with `await`):

```ts
export async function executeCommand(
  input: string,
  context: ExecuteContext,
  registry: CommandRegistry
): Promise<CommandResult> {
  const trimmed = input.trim()
  if (!trimmed) {
    return { success: true, output: '' }
  }

  const segments = trimmed.split('|').map((s) => s.trim())
  if (segments.some((s) => s === '')) {
    return error('syntax error near unexpected token `|`')
  }

  let result = await executeSingle(segments[0], context, registry)

  for (const segment of segments.slice(1)) {
    if (!result.success) return result
    const [name, ...args] = segment.split(/\s+/)
    const command = registry.get(name)
    if (!command) return error(`command not found: ${name}`)
    if (!command.filter) return error(`${name}: not a filter command`)
    result = await command.execute(args, { ...context, stdin: flattenOutput(result.output) })
  }

  return result
}

async function executeSingle(
  segment: string,
  context: ExecuteContext,
  registry: CommandRegistry
): Promise<CommandResult> {
  const [commandName, ...args] = segment.split(/\s+/)
  const command = registry.get(commandName)
  if (!command) {
    return error(`command not found: ${commandName}`)
  }
  return command.execute(args, context)
}
```

`components/terminal.tsx` — `handleCommand` becomes async and the final dispatch block clears input *before* awaiting (input must not stay frozen during a slow fetch):

```ts
  const handleCommand = async (cmd: string, opts?: { fromTour?: boolean }) => {
```

and the tail of the function becomes:

```ts
    setCommandHistory((prev) => [...prev, expandedCmd])
    setHistoryIndex(-1)
    setInput("")

    const [command] = expandedCmd.split(" ")
    const cmd_lower = command.toLowerCase()

    // `suggest` runs an async interactive flow owned by the terminal
    if (cmd_lower === "suggest") {
      appendCommandOutput(startSuggestCommand())
    } else if (cmd_lower === "tour") {
      void startTour()
    } else {
      const result = await executeCommand(expandedCmd, buildExecuteContext(), commandRegistry)
      if (result.success) {
        appendCommandOutput(result.output)
      } else {
        setHistory((prev) => [...prev, { type: classifyLine(result.error), content: result.error }])
      }
    }
  }
```

(The trailing `setInput("")` is removed — every earlier branch already clears input itself.)

The `handleCommandRef` type widens to `(cmd: string, opts?: { fromTour?: boolean }) => void | Promise<void>` (or leave as-is — an async function is assignable to a `void`-returning signature; only change it if typecheck complains).

- [ ] **Step 4: Sweep ALL command tests to await `.execute()`** — widening the return type to `CommandResult | Promise<CommandResult>` makes every direct `result.success` / `getOutput(xCommand.execute(...))` in the test files a type error (`success` doesn't exist on the Promise side). The fix is mechanical: `await` every `.execute(`/`executeCommand(` call in `lib/commands/__tests__/*.test.ts`, make the enclosing `it` callbacks and any helper functions that call `.execute` internally `async` (and `await` *their* call sites). Run the scripted first pass, then let typecheck find the stragglers:

```bash
python3 - << 'EOF'
import glob, re
for path in glob.glob('lib/commands/__tests__/*.test.ts'):
    src = open(path).read()
    new = re.sub(r"(?<!await )(\b\w+Command\.execute\(|executeCommand\()", r"await \1", src)
    new = re.sub(r"\bit\((('[^']*')|(\"[^\"]*\")), \(\) => \{", r"it(\1, async () => {", new)
    if new != src:
        open(path, 'w').write(new); print('updated', path)
EOF
npm run typecheck
```

Then fix what typecheck reports by hand — the known shapes:
- a helper like `function output(context) { const result = await statsCommand.execute(...)` → make the helper `async`, return `Promise<string[]>`, and `await` its call sites (the enclosing `it` is already async after the script).
- `await` inserted inside a non-async arrow (e.g. a `.map` callback) → restructure that one test.
- double `await await` if the regex ran twice → collapse.

Repeat `npm run typecheck` until clean, then `npx vitest run lib/commands` — Expected: all pass.

- [ ] **Step 5: Run the wider suites** — `npx vitest run lib/commands components` — Expected: all pass (terminal characterization already polls with `waitFor`, so async dispatch is invisible to it).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(terminal): async command execution (C0)"`

---

### Task 2 (C1): Daily-Wordle pure module

**Files:**
- Create: `components/games/wordle-game/daily.ts`
- Test: Create `components/games/wordle-game/__tests__/daily.test.ts`

- [ ] **Step 1: Write failing tests**:

```ts
import { describe, it, expect } from 'vitest'
import {
  localDateString,
  seededIndex,
  dailyWord,
  emojiGrid,
  updateStreak,
  type StreakRecord,
} from '../daily'
import { WORDLE_WORDS } from '../words'

describe('localDateString', () => {
  it('formats a date as YYYY-MM-DD in local time', () => {
    expect(localDateString(new Date(2026, 5, 11, 23, 59))).toBe('2026-06-11')
    expect(localDateString(new Date(2026, 0, 2, 0, 0))).toBe('2026-01-02')
  })
})

describe('seededIndex / dailyWord', () => {
  it('is deterministic for the same date string', () => {
    expect(seededIndex('2026-06-11', 50)).toBe(seededIndex('2026-06-11', 50))
    expect(dailyWord('2026-06-11')).toBe(dailyWord('2026-06-11'))
  })
  it('stays in range', () => {
    for (const d of ['2026-06-11', '2026-06-12', '1999-12-31', '2030-01-01']) {
      const i = seededIndex(d, 50)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(50)
    }
  })
  it('varies across dates (not constant)', () => {
    const words = new Set(
      ['2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15'].map(dailyWord)
    )
    expect(words.size).toBeGreaterThan(1)
  })
  it('returns a word from the shared list', () => {
    expect(WORDLE_WORDS).toContain(dailyWord('2026-06-11'))
  })
})

describe('emojiGrid', () => {
  it('maps mark rows to emoji', () => {
    // terminal mark format: "mark:letter" pairs, X=green ?=yellow space=gray
    expect(emojiGrid(['X:C,?:R, :A, :N,X:E'])).toEqual(['🟩🟨⬛⬛🟩'])
  })
  it('handles multiple rows', () => {
    expect(emojiGrid([' :A, :B, :C, :D, :E', 'X:C,X:R,X:A,X:N,X:E'])).toEqual([
      '⬛⬛⬛⬛⬛',
      '🟩🟩🟩🟩🟩',
    ])
  })
})

describe('updateStreak', () => {
  const none: StreakRecord = { lastWinDate: null, streak: 0 }
  it('first win starts at 1', () => {
    expect(updateStreak(none, '2026-06-11')).toEqual({ lastWinDate: '2026-06-11', streak: 1 })
  })
  it('consecutive-day win increments', () => {
    expect(updateStreak({ lastWinDate: '2026-06-10', streak: 3 }, '2026-06-11')).toEqual({
      lastWinDate: '2026-06-11',
      streak: 4,
    })
  })
  it('a gap resets to 1', () => {
    expect(updateStreak({ lastWinDate: '2026-06-08', streak: 9 }, '2026-06-11')).toEqual({
      lastWinDate: '2026-06-11',
      streak: 1,
    })
  })
  it('same-day repeat is a no-op', () => {
    expect(updateStreak({ lastWinDate: '2026-06-11', streak: 4 }, '2026-06-11')).toEqual({
      lastWinDate: '2026-06-11',
      streak: 4,
    })
  })
  it('handles month boundaries', () => {
    expect(updateStreak({ lastWinDate: '2026-05-31', streak: 1 }, '2026-06-01')).toEqual({
      lastWinDate: '2026-06-01',
      streak: 2,
    })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run components/games/wordle-game/__tests__/daily.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `components/games/wordle-game/daily.ts`:

```ts
import { WORDLE_WORDS } from './words'

/** YYYY-MM-DD in the user's local timezone (everyone gets a midnight rollover). */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** FNV-1a hash of the date string, reduced to an index. Deterministic everywhere. */
export function seededIndex(seed: string, length: number): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return Math.abs(hash) % length
}

export function dailyWord(dateStr: string): string {
  return WORDLE_WORDS[seededIndex(dateStr, WORDLE_WORDS.length)]
}

/**
 * Convert the terminal's wordle mark rows ("X:C,?:R, :A,…") into the
 * shareable emoji grid. X = green, ? = yellow, anything else = gray.
 */
export function emojiGrid(markRows: string[]): string[] {
  return markRows.map((row) =>
    row
      .split(',')
      .map((pair) => (pair[0] === 'X' ? '🟩' : pair[0] === '?' ? '🟨' : '⬛'))
      .join('')
  )
}

export interface StreakRecord {
  lastWinDate: string | null
  streak: number
}

function isNextDay(prev: string, next: string): boolean {
  const [py, pm, pd] = prev.split('-').map(Number)
  const [ny, nm, nd] = next.split('-').map(Number)
  return Date.UTC(ny, nm - 1, nd) - Date.UTC(py, pm - 1, pd) === 86_400_000
}

/** Apply a win on `dateStr`. Consecutive day increments; same day no-ops; gap resets. */
export function updateStreak(prev: StreakRecord, dateStr: string): StreakRecord {
  if (prev.lastWinDate === dateStr) return prev
  if (prev.lastWinDate && isNextDay(prev.lastWinDate, dateStr)) {
    return { lastWinDate: dateStr, streak: prev.streak + 1 }
  }
  return { lastWinDate: dateStr, streak: 1 }
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run components/games/wordle-game` — Expected: all pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(games): daily-wordle pure module (seeded word, emoji grid, streak)"`

---

### Task 3 (C1): Wire daily Wordle into the terminal

**Files:**
- Modify: `lib/types/games.ts` — no change needed (wordle exists); skip
- Modify: `lib/commands/types.ts` (`game.start` gains optional args)
- Modify: `lib/commands/commands/game.ts` (pass args; validate wordle mode)
- Modify: `components/terminal.tsx` (daily/practice start, completion record, streak, emoji output)
- Test: Create `components/__tests__/terminal-wordle-daily.test.tsx`

- [ ] **Step 1: Write failing tests** (harness: same `WrappedTerminal`/`mockLocalStorage`/`mockMatchMedia` helpers as `terminal-tour.test.tsx` — copy them in; the localStorage mock's backing store persists across renders within a test):

```tsx
describe('daily wordle', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    mockLocalStorage.clear()
    mockMatchMedia({})
    window.history.replaceState({}, '', '/')
  })

  async function winToday(user: ReturnType<typeof userEvent.setup>) {
    const { dailyWord, localDateString } = await import('@/components/games/wordle-game/daily')
    const word = dailyWord(localDateString())
    const input = screen.getByRole('textbox')
    await user.type(input, 'game wordle{Enter}')
    await user.type(input, `${word}{Enter}`)
    return word
  }

  it('game wordle plays the daily word and reports streak + emoji grid on a win', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await winToday(user)
    await waitFor(() => {
      expect(screen.getByText(/You got it in 1\/6/)).toBeInTheDocument()
      expect(screen.getByText('🟩🟩🟩🟩🟩')).toBeInTheDocument()
      expect(screen.getByText(/Streak: 1 day/)).toBeInTheDocument()
    })
  })

  it('replaying the same day shows the result instead of a fresh game', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await winToday(user)
    await waitFor(() => expect(screen.getByText(/Streak: 1 day/)).toBeInTheDocument())
    await user.type(screen.getByRole('textbox'), 'game wordle{Enter}')
    await waitFor(() => {
      expect(screen.getByText(/Already solved today's wordle/)).toBeInTheDocument()
      // no fresh game started: prompt is not the game prompt
      expect(screen.queryAllByText(/Guess the 5-letter word/).length).toBe(1)
    })
  })

  it('game wordle practice starts a random round and ignores the daily record', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await winToday(user)
    await waitFor(() => expect(screen.getByText(/Streak: 1 day/)).toBeInTheDocument())
    await user.type(screen.getByRole('textbox'), 'game wordle practice{Enter}')
    await waitFor(() => {
      expect(screen.getAllByText(/Guess the 5-letter word/).length).toBe(2)
    })
    // exit cleanly
    await user.type(screen.getByRole('textbox'), 'quit{Enter}')
  })

  it('rejects an unknown wordle mode', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'game wordle hardcore{Enter}')
    await waitFor(() => {
      expect(screen.getByText("game: unknown wordle mode 'hardcore' (try: game wordle practice)")).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run components/__tests__/terminal-wordle-daily.test.tsx` — Expected: FAIL (no emoji grid/streak; unknown-mode message missing).

- [ ] **Step 3: Implement**

`lib/commands/types.ts` — `game.start` signature gains optional args (existing mocks stay valid; implementations may ignore extra params):

```ts
    start: (type: GameType, args?: string[]) => import('@/lib/types/terminal').CommandOutput | void
```

`lib/commands/commands/game.ts` — validate the wordle mode and forward args:

```ts
    if (gameType === 'wordle' && args[1] && args[1] !== 'practice') {
      return error(`game: unknown wordle mode '${args[1]}' (try: game wordle practice)`)
    }

    const startOutput = context.game.start(gameType, args.slice(1))
```

`components/terminal.tsx`:

(a) Imports:

```ts
import { dailyWord, localDateString, emojiGrid, updateStreak, type StreakRecord } from "@/components/games/wordle-game/daily"
```

(b) localStorage helpers + keys (inside the component, near the other helpers):

```ts
  const WORDLE_STREAK_KEY = "wordle-streak"
  const WORDLE_DAILY_KEY = "wordle-daily"

  const readJSON = <T,>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  }
```

(c) `startWordleGame` becomes mode-aware (replace the existing function):

```ts
  interface DailyRecord {
    date: string
    rows: string[]
    won: boolean
    attempts: number
  }

  const startWordleGame = (gameArgs?: string[]) => {
    const practice = gameArgs?.[0] === "practice"
    const today = localDateString()

    if (!practice) {
      const record = readJSON<DailyRecord>(WORDLE_DAILY_KEY)
      if (record?.date === today) {
        const streak = readJSON<StreakRecord>(WORDLE_STREAK_KEY) ?? { lastWinDate: null, streak: 0 }
        return [
          "",
          record.won
            ? `Already solved today's wordle (${record.attempts}/6).`
            : "Already played today's wordle.",
          ...emojiGrid(record.rows),
          `Streak: ${streak.streak} day${streak.streak === 1 ? "" : "s"}`,
          "",
          "Come back tomorrow, or try 'game wordle practice'.",
          "",
        ]
      }
    }

    const word = practice
      ? wordleWords[Math.floor(Math.random() * wordleWords.length)]
      : dailyWord(today)
    setGameState({
      active: true,
      type: "wordle",
      data: { word, attempts: 0, maxAttempts: 6, guesses: [], mode: practice ? "practice" : "daily", dateStr: today },
    })
    return [
      "",
      practice ? "WORDLE (practice)" : `WORDLE — daily ${today}`,
      "Guess the 5-letter word in 6 tries.",
      "",
      "  GREEN  = correct position",
      "  YELLOW = wrong position",
      "  GRAY   = not in word",
      "",
      "Type 'quit' to exit.",
      "",
    ]
  }
```

(d) In `handleWordleGame`, the data cast gains the new fields:

```ts
    const data = gameState.data as { word: string; attempts: number; maxAttempts: number; guesses: string[]; mode?: string; dateStr?: string }
```

and a helper above the win/lose returns:

```ts
    const finishDaily = (won: boolean, rows: string[]): string[] => {
      if (data.mode !== "daily") return []
      const dateStr = data.dateStr ?? localDateString()
      localStorage.setItem(WORDLE_DAILY_KEY, JSON.stringify({ date: dateStr, rows, won, attempts }))
      let streak = readJSON<StreakRecord>(WORDLE_STREAK_KEY) ?? { lastWinDate: null, streak: 0 }
      if (won) {
        streak = updateStreak(streak, dateStr)
        localStorage.setItem(WORDLE_STREAK_KEY, JSON.stringify(streak))
      }
      return [
        `Wordle ${dateStr} ${won ? `${attempts}/6` : "X/6"}`,
        ...emojiGrid(rows),
        `Streak: ${streak.streak} day${streak.streak === 1 ? "" : "s"}`,
      ]
    }
```

The win return becomes:

```ts
    if (normalizedGuess === word) {
      setGameState({ active: false, type: null })
      return [
        wordleResult,
        "",
        `You got it in ${attempts}/${data.maxAttempts}!`,
        ...finishDaily(true, guesses),
        "",
      ]
    }
```

The lose return becomes:

```ts
    if (attempts >= data.maxAttempts) {
      setGameState({ active: false, type: null })
      return [
        wordleResult,
        "",
        `Game over. The word was: ${word.toUpperCase()}`,
        ...finishDaily(false, guesses),
        "",
      ]
    }
```

(`guesses` already contains the just-pushed mark row.)

(e) `buildExecuteContext` game.start forwards args:

```ts
      start: (type, gameArgs) => {
        if (type === "number") return startNumberGame()
        if (type === "wordle") return startWordleGame(gameArgs)
        ...
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run components lib/commands` — Expected: all pass (the characterization test plays wordle via quit — unchanged behavior).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): daily wordle with streaks and shareable emoji grid (C1)"`

---

### Task 4 (C2): `highscores` command

**Files:**
- Create: `lib/commands/commands/highscores.ts`
- Modify: `lib/commands/commands/index.ts`, `lib/commands/index.ts` (register)
- Test: Create `lib/commands/__tests__/highscores.test.ts`

- [ ] **Step 1: Write failing tests**:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { highscoresCommand } from '../commands/highscores'
import type { ExecuteContext, ThemeName, FontName } from '../types'

function ctx(): ExecuteContext {
  return {
    vfs: { pwd: () => '/', cd: () => null, ls: () => [], resolve: () => null, mkdir: () => null, touch: () => null, rm: () => null },
    history: { add: () => {}, clear: () => {}, commands: () => [] },
    game: { start: () => '', end: () => {}, isActive: () => false },
    theme: { current: 'midnight' as ThemeName, set: () => {}, list: () => [], config: () => ({ name: 'Midnight' }) },
    font: { current: 'jetbrains' as FontName, set: () => {}, list: () => [], config: () => ({ name: 'JetBrains Mono' }) },
    sound: { enabled: false, toggle: () => {} },
    uptime: () => 0,
    currentDirectory: '~',
    setCurrentDirectory: () => {},
    openUrl: () => {},
    collections: { books: [], vinyl: [], hardware: [], notes: [] },
  }
}

function score(over: Partial<{ initials: string; score: number; level: number; createdAt: string }> = {}) {
  return { id: 1, gameType: 'tron', initials: 'ZAB', score: 4200, level: 3, createdAt: '2026-06-11T10:00:00.000Z', ...over }
}

afterEach(() => vi.unstubAllGlobals())

describe('highscores <game>', () => {
  it('rejects an unknown game', async () => {
    expect(await highscoresCommand.execute(['chess'], ctx())).toEqual({
      success: false,
      error: 'highscores: unknown game: chess',
    })
  })

  it('renders a top-10 table for one game', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      expect(url).toBe('/api/scores/tron?limit=10')
      return new Response(JSON.stringify({ scores: [score(), score({ initials: 'ME', score: 100, level: 1 })] }), { status: 200 })
    }))
    const result = await highscoresCommand.execute(['tron'], ctx())
    expect(result.success).toBe(true)
    const out = (result as { output: string[] }).output
    expect(out.join('\n')).toContain('TRON')
    expect(out.join('\n')).toMatch(/1\.\s+ZAB\s+4,200\s+L3\s+2026-06-11/)
    expect(out.join('\n')).toMatch(/2\.\s+ME\s+100/)
  })

  it('reports an empty board', async () => {
    const result = await highscoresCommand.execute(['tron'], ctx())
    expect(result.success).toBe(true)
    expect((result as { output: string[] }).output.join('\n')).toContain('No scores yet')
  })

  it('degrades gracefully when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await highscoresCommand.execute(['tron'], ctx())).toEqual({
      success: false,
      error: 'highscores: could not reach the scoreboard',
    })
  })
})

describe('highscores (all games)', () => {
  it('shows a top-3 section per game type', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      new Response(JSON.stringify({ scores: url.includes('tron') ? [score()] : [] }), { status: 200 })
    ))
    const result = await highscoresCommand.execute([], ctx())
    expect(result.success).toBe(true)
    const text = (result as { output: string[] }).output.join('\n')
    expect(text).toContain('TRON')
    expect(text).toContain('PACMAN')
    expect(text).toContain('BASKETBALL')
    expect(text).toContain('ZAB')
  })
})
```

(Note: the default `vitest.setup.ts` fetch stub returns `{ scores: [] }`, which the empty-board test relies on.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run lib/commands/__tests__/highscores.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `lib/commands/commands/highscores.ts`:

```ts
import type { CommandDefinition } from '../types'
import { success, error } from '../types'
import { GAME_TYPES, isValidGameType } from '@/lib/scores'

interface ApiScore {
  initials: string
  score: number
  level: number
  createdAt: string
}

function formatRows(scores: ApiScore[]): string[] {
  return scores.map((s, i) => {
    const date = s.createdAt?.slice(0, 10) ?? ''
    return `  ${String(i + 1).padStart(2, ' ')}.  ${s.initials.padEnd(3, ' ')}  ${s.score.toLocaleString('en-US').padStart(11, ' ')}  L${s.level}  ${date}`
  })
}

async function fetchScores(game: string, limit: number): Promise<ApiScore[]> {
  const response = await fetch(`/api/scores/${game}?limit=${limit}`)
  if (!response.ok) throw new Error(`scores fetch failed: ${response.status}`)
  const data = (await response.json()) as { scores?: ApiScore[] }
  return data.scores ?? []
}

export const highscoresCommand: CommandDefinition = {
  name: 'highscores',
  description: 'Arcade leaderboards',
  usage: 'highscores [game]',
  execute: async (args) => {
    const game = args[0]?.toLowerCase()

    if (game && !isValidGameType(game)) {
      return error(`highscores: unknown game: ${game}`)
    }

    try {
      if (game) {
        const scores = await fetchScores(game, 10)
        if (scores.length === 0) {
          return success(['', `${game.toUpperCase()} — No scores yet. Be the first!`, ''])
        }
        return success(['', `★ ${game.toUpperCase()} — TOP ${scores.length} ★`, '', ...formatRows(scores), ''])
      }

      const boards = await Promise.all(GAME_TYPES.map((g) => fetchScores(g, 3)))
      const lines: string[] = ['', '★ HIGH SCORES ★', '']
      GAME_TYPES.forEach((g, i) => {
        lines.push(`  ${g.toUpperCase()}`)
        const rows = formatRows(boards[i])
        lines.push(...(rows.length > 0 ? rows.map((r) => `  ${r}`) : ['      no scores yet']))
        lines.push('')
      })
      lines.push("Type 'highscores <game>' for a full board.")
      lines.push('')
      return success(lines)
    } catch {
      return error('highscores: could not reach the scoreboard')
    }
  },
}
```

Register: barrel export in `lib/commands/commands/index.ts` (new "Highscores" block or append to Game block) and `registry.register(commands.highscoresCommand)` in `createDefaultRegistry()` next to `gameCommand`.

- [ ] **Step 4: Run to verify pass** — `npx vitest run lib/commands` — Expected: all pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): highscores leaderboard command (C2)"`

---

### Task 5 (C3): typespeed logic module + GAME_TYPES extension

**Files:**
- Modify: `lib/scores.ts` (`GAME_TYPES` += 'typespeed'), `app/api/scores/route.ts` + `app/api/scores/[game]/route.ts` (derive error message)
- Create: `components/games/typespeed-game/logic.ts`, `components/games/typespeed-game/index.ts`
- Test: Create `components/games/typespeed-game/__tests__/logic.test.ts`

- [ ] **Step 1: Write failing tests**:

```ts
import { describe, it, expect } from 'vitest'
import { SENTENCES, pickSentences, wpm, accuracy, finalScore, submittedScore } from '../logic'

describe('pickSentences', () => {
  it('returns the requested number of distinct sentences from the pool', () => {
    const picked = pickSentences(42, 3)
    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
    picked.forEach((s) => expect(SENTENCES).toContain(s))
  })
  it('is deterministic per seed and varies across seeds', () => {
    expect(pickSentences(7, 3)).toEqual(pickSentences(7, 3))
    const variants = new Set([1, 2, 3, 4, 5].map((s) => pickSentences(s, 3).join('|')))
    expect(variants.size).toBeGreaterThan(1)
  })
})

describe('wpm', () => {
  it('computes chars/5 per minute', () => {
    // 50 chars in 30s → 10 "words" in 0.5min → 20 WPM
    expect(wpm(50, 30_000)).toBe(20)
  })
  it('guards zero/negative elapsed', () => {
    expect(wpm(50, 0)).toBe(0)
    expect(wpm(50, -5)).toBe(0)
  })
})

describe('accuracy', () => {
  it('is 1 for a perfect transcription', () => {
    expect(accuracy('hello world', 'hello world')).toBe(1)
  })
  it('counts per-character matches over the longer length', () => {
    expect(accuracy('abcd', 'abxd')).toBe(0.75)
    expect(accuracy('abcd', 'ab')).toBe(0.5)
    expect(accuracy('ab', 'abcd')).toBe(0.5)
  })
  it('is 0 for empty input against a sentence', () => {
    expect(accuracy('abcd', '')).toBe(0)
  })
})

describe('finalScore / submittedScore', () => {
  it('averages wpm and multiplies by average accuracy', () => {
    const rounds = [
      { wpm: 60, accuracy: 1 },
      { wpm: 40, accuracy: 0.5 },
    ]
    // avg wpm 50 × avg acc 0.75 = 37.5
    expect(finalScore(rounds)).toBe(37.5)
    expect(submittedScore(rounds)).toBe(3750)
  })
  it('is 0 with no rounds', () => {
    expect(finalScore([])).toBe(0)
    expect(submittedScore([])).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run components/games/typespeed-game` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `components/games/typespeed-game/logic.ts`:

```ts
export const SENTENCES = [
  'The quick brown fox jumps over the lazy dog.',
  'Pack my box with five dozen liquor jugs.',
  'How vexingly quick daft zebras jump!',
  'Sphinx of black quartz, judge my vow.',
  'The five boxing wizards jump quickly.',
  'Crazy Fredrick bought many very exquisite opal jewels.',
  'We promptly judged antique ivory buckles for the next prize.',
  'A wizard’s job is to vex chumps quickly in fog.',
  'Jaded zombies acted quaintly but kept driving their oxen forward.',
  'The job requires extra pluck and zeal from every young wage earner.',
  'Just keep examining every low bid quoted for zinc etchings.',
  'Amazingly few discotheques provide jukeboxes.',
] as const

export interface RoundResult {
  wpm: number
  accuracy: number
}

/** Deterministic LCG so a seed always yields the same distinct picks. */
export function pickSentences(seed: number, count = 3): string[] {
  let state = (seed >>> 0) || 1
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state
  }
  const pool = [...SENTENCES]
  const picked: string[] = []
  while (picked.length < Math.min(count, pool.length)) {
    const i = next() % pool.length
    picked.push(pool.splice(i, 1)[0])
  }
  return picked
}

/** Words-per-minute with the conventional 5-chars-per-word. */
export function wpm(typedLength: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  return (typedLength / 5) / (elapsedMs / 60_000)
}

/** Per-character comparison over the longer of the two strings (0..1). */
export function accuracy(target: string, typed: string): number {
  const length = Math.max(target.length, typed.length)
  if (length === 0) return 1
  let matches = 0
  for (let i = 0; i < Math.min(target.length, typed.length); i++) {
    if (target[i] === typed[i]) matches++
  }
  return matches / length
}

export function finalScore(rounds: RoundResult[]): number {
  if (rounds.length === 0) return 0
  const avgWpm = rounds.reduce((s, r) => s + r.wpm, 0) / rounds.length
  const avgAcc = rounds.reduce((s, r) => s + r.accuracy, 0) / rounds.length
  return avgWpm * avgAcc
}

/** Integer score persisted to the API (WPM×accuracy×100). */
export function submittedScore(rounds: RoundResult[]): number {
  return Math.round(finalScore(rounds) * 100)
}
```

`components/games/typespeed-game/index.ts`:

```ts
export { SENTENCES, pickSentences, wpm, accuracy, finalScore, submittedScore } from './logic'
export type { RoundResult } from './logic'
```

`lib/scores.ts`:

```ts
export const GAME_TYPES = ['tron', 'pacman', 'basketball', 'typespeed'] as const
```

Both route files (`app/api/scores/route.ts`, `app/api/scores/[game]/route.ts`) — replace the hardcoded invalid-game message with a derived one (import `GAME_TYPES` alongside `isValidGameType`):

```ts
      { error: `Invalid game type. Must be one of: ${GAME_TYPES.join(', ')}` },
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run components/games/typespeed-game app/api lib` — Expected: all pass (route tests assert status codes, not the message text).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(games): typespeed logic module; typespeed joins GAME_TYPES (C3)"`

---

### Task 6 (C3): typespeed terminal wiring

**Files:**
- Modify: `lib/types/games.ts` (GameType += 'typespeed')
- Modify: `lib/commands/commands/game.ts` + `lib/commands/completion.ts` (VALID_GAMES + listing)
- Modify: `components/terminal.tsx` (state machine + start/handle + initials POST)
- Test: Create `components/__tests__/terminal-typespeed.test.tsx`

- [ ] **Step 1: Write failing tests** (same harness helpers as the tour test):

```tsx
describe('typespeed', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    mockLocalStorage.clear()
    mockMatchMedia({})
    window.history.replaceState({}, '', '/')
  })

  async function playThreeRounds(user: ReturnType<typeof userEvent.setup>) {
    const input = screen.getByRole('textbox')
    await user.type(input, 'game typespeed{Enter}')
    await waitFor(() => expect(screen.getByText(/TYPESPEED/)).toBeInTheDocument())
    for (let round = 0; round < 3; round++) {
      // typing anything ends the round; accuracy just suffers
      await user.type(input, 'x{Enter}')
    }
  }

  it('plays three rounds and offers initials entry', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await playThreeRounds(user)
    await waitFor(() => {
      expect(screen.getByText(/FINAL SCORE/)).toBeInTheDocument()
      expect(screen.getByText(/Enter 1-3 initials/)).toBeInTheDocument()
    })
  })

  it('skip declines the leaderboard and ends the game', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await playThreeRounds(user)
    await waitFor(() => expect(screen.getByText(/Enter 1-3 initials/)).toBeInTheDocument())
    await user.type(screen.getByRole('textbox'), 'skip{Enter}')
    await waitFor(() => expect(screen.getByText(/Maybe next time/)).toBeInTheDocument())
    // game is over: commands work again
    await user.type(screen.getByRole('textbox'), 'pwd{Enter}')
    await waitFor(() => expect(screen.getByText('/home/zachary')).toBeInTheDocument())
  })

  it('posts initials to the scores API', async () => {
    const posted: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') posted.push(JSON.parse(String(init.body)))
      return new Response(JSON.stringify({ scores: [], score: { id: 1 } }), { status: 201 })
    }))
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await playThreeRounds(user)
    await waitFor(() => expect(screen.getByText(/Enter 1-3 initials/)).toBeInTheDocument())
    await user.type(screen.getByRole('textbox'), 'zab{Enter}')
    await waitFor(() => expect(screen.getByText(/Score posted/)).toBeInTheDocument())
    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({ gameType: 'typespeed', initials: 'ZAB', level: 1 })
    vi.unstubAllGlobals()
  })

  it('quit exits mid-game', async () => {
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'game typespeed{Enter}')
    await waitFor(() => expect(screen.getByText(/TYPESPEED/)).toBeInTheDocument())
    await user.type(input, 'quit{Enter}')
    await waitFor(() => expect(screen.getByText(/Typespeed ended/)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run components/__tests__/terminal-typespeed.test.tsx` — Expected: FAIL (`Unknown game: typespeed`).

- [ ] **Step 3: Implement**

`lib/types/games.ts`:

```ts
export type GameType = 'number' | 'wordle' | 'trivia' | 'blackjack' | 'rps' | 'tron' | 'pacman' | 'basketball' | 'typespeed'
```

`lib/commands/commands/game.ts` — `VALID_GAMES` gains `'typespeed'`; the no-arg listing gains:

```ts
        '  game typespeed   How fast can you type?',
```

`lib/commands/completion.ts` — `VALID_GAMES` array gains `'typespeed'`.

`components/terminal.tsx`:

(a) `GameState.type` union gains `"typespeed"`.

(b) Import the logic:

```ts
import { pickSentences, wpm, accuracy, submittedScore, type RoundResult } from "@/components/games/typespeed-game"
```

(c) Start + handler (next to the other text games):

```ts
  const startTypespeedGame = () => {
    const sentences = pickSentences(Date.now())
    setGameState({
      active: true,
      type: "typespeed",
      data: { sentences, round: 0, results: [] as RoundResult[], startedAt: Date.now(), phase: "typing" },
    })
    return [
      "",
      "TYPESPEED",
      "Type each sentence exactly, then press Enter. 3 rounds.",
      "Type 'quit' to exit.",
      "",
      `[1/3] ${sentences[0]}`,
      "",
    ]
  }

  const handleTypespeedGame = (typed: string): string | string[] => {
    const data = gameState.data as {
      sentences: string[]
      round: number
      results: RoundResult[]
      startedAt: number
      phase: "typing" | "initials"
    }

    if (typed.toLowerCase().trim() === "quit") {
      setGameState({ active: false, type: null })
      return "Typespeed ended."
    }

    if (data.phase === "initials") {
      const entry = typed.trim()
      if (entry.toLowerCase() === "skip") {
        setGameState({ active: false, type: null })
        return ["Maybe next time.", ""]
      }
      if (!/^[a-zA-Z0-9]{1,3}$/.test(entry)) {
        return "Initials must be 1-3 letters/digits (or 'skip')."
      }
      const score = submittedScore(data.results)
      setGameState({ active: false, type: null })
      fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "typespeed", initials: entry.toUpperCase(), score, level: 1 }),
      })
        .then((response) => {
          setHistory((prev) => [
            ...prev,
            response.ok
              ? { type: "success", content: `Score posted. See it with 'highscores typespeed'.` }
              : { type: "error", content: "Could not post the score (scoreboard offline?)." },
          ])
        })
        .catch(() => {
          setHistory((prev) => [...prev, { type: "error", content: "Could not post the score (network error)." }])
        })
      return ""
    }

    const target = data.sentences[data.round]
    const elapsed = Date.now() - data.startedAt
    const roundWpm = wpm(typed.length, elapsed)
    const roundAcc = accuracy(target, typed)
    const results = [...data.results, { wpm: roundWpm, accuracy: roundAcc }]
    const lines = [
      `  WPM ${roundWpm.toFixed(1)}  ·  accuracy ${(roundAcc * 100).toFixed(0)}%`,
      "",
    ]

    const nextRound = data.round + 1
    if (nextRound < data.sentences.length) {
      setGameState({ ...gameState, data: { ...data, round: nextRound, results, startedAt: Date.now() } })
      return [...lines, `[${nextRound + 1}/3] ${data.sentences[nextRound]}`, ""]
    }

    const score = submittedScore(results)
    setGameState({ ...gameState, data: { ...data, results, phase: "initials" } })
    return [
      ...lines,
      `FINAL SCORE: ${score.toLocaleString("en-US")}  (avg WPM × accuracy × 100)`,
      "",
      "Enter 1-3 initials to post it to the leaderboard, or 'skip':",
      "",
    ]
  }
```

(d) Route input to it in `handleCommand`'s game block (`else if (gameState.type === "typespeed") { result = handleTypespeedGame(expandedCmd) }`) and start it in `buildExecuteContext` (`if (type === "typespeed") return startTypespeedGame()`).

(e) VFS games dir: in the `games` array used to populate `/home/zachary/games`, add `"typespeed"` (and `"pacman"`, `"basketball"` which were missing — they're real games too).

**Note on history expansion:** typed sentences beginning with `!` would trip `!!`/`!n` expansion, but expansion only matches `/^!(!|\d+)$/` — full-sentence input never matches. No change needed.

- [ ] **Step 4: Run to verify pass** — `npx vitest run components lib` — Expected: all pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): typespeed text game with leaderboard submission (C3)"`

---

### Task 7 (C4): Snake logic module

**Files:**
- Create: `components/games/snake-game/logic.ts`
- Test: Create `components/games/snake-game/__tests__/logic.test.ts`

- [ ] **Step 1: Write failing tests**:

```ts
import { describe, it, expect } from 'vitest'
import {
  createState,
  enqueueDirection,
  step,
  tickMs,
  score,
  type SnakeState,
} from '../logic'

// rng that always returns the same cell (deterministic food placement)
const rngAt = (x: number, y: number, w = 20) => () => (y * w + x) / (w * 20)

function state(overrides: Partial<SnakeState> = {}): SnakeState {
  return { ...createState(20, 20, rngAt(15, 10)), ...overrides }
}

describe('createState', () => {
  it('starts a 3-cell snake heading right, food not on the snake', () => {
    const s = createState(20, 20, rngAt(15, 10))
    expect(s.snake).toHaveLength(3)
    expect(s.dir).toBe('RIGHT')
    expect(s.alive).toBe(true)
    expect(s.foodEaten).toBe(0)
    expect(s.snake.some((c) => c.x === s.food.x && c.y === s.food.y)).toBe(false)
  })
})

describe('enqueueDirection', () => {
  it('queues a turn', () => {
    const s = enqueueDirection(state(), 'UP')
    expect(s.queue).toEqual(['UP'])
  })
  it('ignores a reversal of the effective direction', () => {
    expect(enqueueDirection(state(), 'LEFT').queue).toEqual([])
    // queued UP makes LEFT legal afterwards
    const s = enqueueDirection(enqueueDirection(state(), 'UP'), 'LEFT')
    expect(s.queue).toEqual(['UP', 'LEFT'])
    // ...but reversing the queued UP with DOWN is ignored
    const s2 = enqueueDirection(enqueueDirection(state(), 'UP'), 'DOWN')
    expect(s2.queue).toEqual(['UP'])
  })
})

describe('step', () => {
  it('moves the head one cell and drops the tail', () => {
    const before = state()
    const after = step(before, rngAt(15, 10))
    expect(after.snake[0]).toEqual({ x: before.snake[0].x + 1, y: before.snake[0].y })
    expect(after.snake).toHaveLength(before.snake.length)
  })
  it('eating food grows the snake and respawns food elsewhere', () => {
    const before = state()
    // place food directly ahead of the head
    before.food = { x: before.snake[0].x + 1, y: before.snake[0].y }
    const after = step(before, rngAt(2, 2))
    expect(after.foodEaten).toBe(1)
    expect(after.snake).toHaveLength(before.snake.length + 1)
    expect(after.food).toEqual({ x: 2, y: 2 })
  })
  it('dies on the wall', () => {
    let s = state()
    for (let i = 0; i < 30 && s.alive; i++) s = step(s, rngAt(2, 2))
    expect(s.alive).toBe(false)
  })
  it('dies on itself', () => {
    // a 5-long snake turning in a tight square bites its own body
    let s = state()
    s.food = { x: s.snake[0].x + 1, y: s.snake[0].y }
    s = step(s, rngAt(18, 18)) // eat → length 4
    s.food = { x: s.snake[0].x + 1, y: s.snake[0].y }
    s = step(s, rngAt(18, 18)) // eat → length 5
    s = step(enqueueDirection(s, 'UP'), rngAt(18, 18))
    s = step(enqueueDirection(s, 'LEFT'), rngAt(18, 18))
    s = step(enqueueDirection(s, 'DOWN'), rngAt(18, 18))
    expect(s.alive).toBe(false)
  })
  it('consumes one queued direction per tick', () => {
    let s = enqueueDirection(enqueueDirection(state(), 'UP'), 'LEFT')
    s = step(s, rngAt(2, 2))
    expect(s.dir).toBe('UP')
    expect(s.queue).toEqual(['LEFT'])
  })
})

describe('tickMs / score', () => {
  it('speeds up every 5 food with a floor', () => {
    expect(tickMs(0)).toBe(140)
    expect(tickMs(4)).toBe(140)
    expect(tickMs(5)).toBe(130)
    expect(tickMs(10)).toBe(120)
    expect(tickMs(1000)).toBe(60)
  })
  it('scores 10 per food', () => {
    expect(score(7)).toBe(70)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run components/games/snake-game` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `components/games/snake-game/logic.ts`:

```ts
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export interface Point {
  x: number
  y: number
}

export interface SnakeState {
  snake: Point[] // head first
  dir: Direction
  queue: Direction[]
  food: Point
  grid: { w: number; h: number }
  foodEaten: number
  alive: boolean
}

const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
}

const DELTA: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

/** rng: () => [0,1). Injected for deterministic tests. */
function placeFood(snake: Point[], w: number, h: number, rng: () => number): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`))
  // walk from a random start until a free cell (grid is never full in practice)
  let i = Math.floor(rng() * w * h)
  for (let tries = 0; tries < w * h; tries++) {
    const cell = { x: i % w, y: Math.floor(i / w) }
    if (!occupied.has(`${cell.x},${cell.y}`)) return cell
    i = (i + 1) % (w * h)
  }
  return { x: 0, y: 0 }
}

export function createState(w: number, h: number, rng: () => number = Math.random): SnakeState {
  const cy = Math.floor(h / 2)
  const cx = Math.floor(w / 4)
  const snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ]
  return {
    snake,
    dir: 'RIGHT',
    queue: [],
    food: placeFood(snake, w, h, rng),
    grid: { w, h },
    foodEaten: 0,
    alive: true,
  }
}

/** Queue a turn; reversals of the effective (last queued or current) direction are ignored. */
export function enqueueDirection(state: SnakeState, dir: Direction): SnakeState {
  const effective = state.queue[state.queue.length - 1] ?? state.dir
  if (dir === effective || dir === OPPOSITE[effective]) return state
  return { ...state, queue: [...state.queue, dir] }
}

export function step(state: SnakeState, rng: () => number = Math.random): SnakeState {
  if (!state.alive) return state

  const [nextDir, ...restQueue] = state.queue.length > 0 ? state.queue : [state.dir]
  const head = state.snake[0]
  const delta = DELTA[nextDir]
  const newHead = { x: head.x + delta.x, y: head.y + delta.y }

  // wall collision
  if (newHead.x < 0 || newHead.x >= state.grid.w || newHead.y < 0 || newHead.y >= state.grid.h) {
    return { ...state, dir: nextDir, queue: restQueue, alive: false }
  }

  const ate = newHead.x === state.food.x && newHead.y === state.food.y
  // the tail cell vacates this tick unless we grow into it
  const body = ate ? state.snake : state.snake.slice(0, -1)

  // self collision (against the post-move body)
  if (body.some((c) => c.x === newHead.x && c.y === newHead.y)) {
    return { ...state, dir: nextDir, queue: restQueue, alive: false }
  }

  const snake = [newHead, ...body]
  return {
    ...state,
    snake,
    dir: nextDir,
    queue: restQueue,
    foodEaten: state.foodEaten + (ate ? 1 : 0),
    food: ate ? placeFood(snake, state.grid.w, state.grid.h, rng) : state.food,
  }
}

/** Base 140ms/tick, 10ms faster every 5 food, floor 60ms. */
export function tickMs(foodEaten: number): number {
  return Math.max(60, 140 - 10 * Math.floor(foodEaten / 5))
}

export function score(foodEaten: number): number {
  return foodEaten * 10
}

export function level(foodEaten: number): number {
  return 1 + Math.floor(foodEaten / 5)
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run components/games/snake-game` — Expected: all pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(games): snake pure logic (grid, direction queue, collisions, speed-up)"`

---

### Task 8 (C4): SnakeGame component + terminal wiring

**Files:**
- Create: `components/games/snake-game/SnakeGame.tsx`, `components/games/snake-game/index.ts`
- Modify: `lib/scores.ts` (`GAME_TYPES` += 'snake'), `lib/hooks/useHighScores.ts` (widen param type)
- Modify: `lib/types/games.ts` (GameType += 'snake'), `lib/commands/commands/game.ts`, `lib/commands/completion.ts`
- Modify: `components/terminal.tsx` (dynamic import + render branch + GameState type + canvas start)
- Test: Create `components/games/snake-game/__tests__/SnakeGame.test.tsx`

- [ ] **Step 1: Write failing tests** — `components/games/snake-game/__tests__/SnakeGame.test.tsx` (canvas games get shallow render tests — the logic is already covered):

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SnakeGame } from '../SnakeGame'

describe('SnakeGame', () => {
  it('renders the menu with controls and exits on Escape', () => {
    const onExit = vi.fn()
    render(<SnakeGame onExit={onExit} />)
    expect(screen.getByText('SNAKE')).toBeInTheDocument()
    expect(screen.getByText(/ARROW KEYS OR WASD/)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).toHaveBeenCalled()
  })

  it('starts on Enter', () => {
    render(<SnakeGame onExit={() => {}} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    // menu overlay is gone once playing
    expect(screen.queryByText(/ARROW KEYS OR WASD/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run components/games/snake-game` — Expected: FAIL (no SnakeGame module).

- [ ] **Step 3: Implement**

`lib/scores.ts`:

```ts
export const GAME_TYPES = ['tron', 'pacman', 'basketball', 'typespeed', 'snake'] as const
```

`lib/hooks/useHighScores.ts` — widen the parameter (import the shared type):

```ts
import type { GameTypeName } from '@/lib/scores'
...
export function useHighScores(gameType: GameTypeName): UseHighScoresReturn {
```

`lib/types/games.ts` — GameType union gains `'snake'`.

`lib/commands/commands/game.ts` — `VALID_GAMES` gains `'snake'`; listing gains `'  game snake      Eat, grow, repeat'`; the canvas-game branch becomes:

```ts
    if (gameType === 'tron' || gameType === 'pacman' || gameType === 'basketball' || gameType === 'snake') {
      return success([])
    }
```

`lib/commands/completion.ts` — `VALID_GAMES` gains `'snake'`.

`components/games/snake-game/SnakeGame.tsx` (tron pattern, single-player):

```tsx
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { RefreshCw, X, Trophy, Play } from "lucide-react"
import { useHighScores } from "@/lib/hooks/useHighScores"
import { createState, enqueueDirection, step, tickMs, score as scoreFor, level as levelFor, type SnakeState, type Direction } from "./logic"

interface SnakeGameProps {
  onExit: () => void
}

const CELL_SIZE = 20
const GRID_W = 30
const GRID_H = 20

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: "UP", w: "UP", W: "UP",
  ArrowDown: "DOWN", s: "DOWN", S: "DOWN",
  ArrowLeft: "LEFT", a: "LEFT", A: "LEFT",
  ArrowRight: "RIGHT", d: "RIGHT", D: "RIGHT",
}

export function SnakeGame({ onExit }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<"menu" | "playing" | "gameover" | "initials">("menu")
  const [foodEaten, setFoodEaten] = useState(0)

  const { scores: highScores, isLoading: scoresLoading, submitScore, isHighScore } = useHighScores("snake")
  const [playerInitials, setPlayerInitials] = useState("")
  const [finalScore, setFinalScore] = useState(0)

  const stateRef = useRef<SnakeState>(createState(GRID_W, GRID_H))
  const loopRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isHighScoreRef = useRef(isHighScore)
  useEffect(() => {
    isHighScoreRef.current = isHighScore
  })

  const startGame = useCallback(() => {
    stateRef.current = createState(GRID_W, GRID_H)
    setFoodEaten(0)
    setPhase("playing")
  }, [])

  const handleInitialsSubmit = useCallback(async () => {
    if (playerInitials.length > 0) {
      await submitScore(playerInitials, finalScore, levelFor(stateRef.current.foodEaten))
      setPlayerInitials("")
      setPhase("gameover")
    }
  }, [playerInitials, finalScore, submitScore])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "initials") {
        e.preventDefault()
        if (e.key === "Backspace") {
          setPlayerInitials((prev) => prev.slice(0, -1))
        } else if (e.key === "Enter" && playerInitials.length > 0) {
          handleInitialsSubmit()
        } else if (/^[a-zA-Z0-9]$/.test(e.key) && playerInitials.length < 3) {
          setPlayerInitials((prev) => (prev + e.key).toUpperCase())
        }
        return
      }

      if (e.key === "Escape") {
        onExit()
        return
      }

      if (e.key === "Enter" || e.key === " ") {
        if (phase === "menu" || phase === "gameover") {
          e.preventDefault()
          startGame()
        }
        return
      }

      if (phase === "playing") {
        const dir = KEY_DIRS[e.key]
        if (dir) {
          e.preventDefault()
          stateRef.current = enqueueDirection(stateRef.current, dir)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [phase, playerInitials, startGame, onExit, handleInitialsSubmit])

  // Game loop: setTimeout chain so the cadence follows tickMs(foodEaten)
  useEffect(() => {
    if (phase !== "playing") return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const draw = (s: SnakeState) => {
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // food
      ctx.fillStyle = "#f43f5e"
      ctx.shadowBlur = 12
      ctx.shadowColor = "#f43f5e"
      ctx.fillRect(s.food.x * CELL_SIZE + 2, s.food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4)
      // snake
      ctx.fillStyle = "#4ade80"
      ctx.shadowColor = "#4ade80"
      s.snake.forEach((c, i) => {
        ctx.fillStyle = i === 0 ? "#fff" : "#4ade80"
        ctx.fillRect(c.x * CELL_SIZE + 1, c.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
      })
      ctx.shadowBlur = 0
      ctx.strokeStyle = "#334155"
      ctx.strokeRect(0, 0, canvas.width, canvas.height)
    }

    let cancelled = false
    const tick = () => {
      if (cancelled) return
      const next = step(stateRef.current)
      stateRef.current = next
      setFoodEaten(next.foodEaten)
      draw(next)

      if (!next.alive) {
        const points = scoreFor(next.foodEaten)
        setFinalScore(points)
        if (points > 0 && isHighScoreRef.current(points)) {
          setPhase("initials")
        } else {
          setPhase("gameover")
        }
        return
      }
      loopRef.current = setTimeout(tick, tickMs(next.foodEaten))
    }

    draw(stateRef.current)
    loopRef.current = setTimeout(tick, tickMs(stateRef.current.foodEaten))
    return () => {
      cancelled = true
      if (loopRef.current) clearTimeout(loopRef.current)
    }
  }, [phase])

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-transparent">
      <div className="absolute top-4 left-0 right-0 flex justify-between px-8 font-mono pointer-events-none z-10">
        <div className="flex flex-col items-start gap-1 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
          <span className="text-sm tracking-widest">SCORE</span>
          <span className="text-3xl font-bold">{scoreFor(foodEaten)}</span>
        </div>
        <div className="flex flex-col items-end gap-1 text-white/50">
          <span className="text-sm tracking-widest">LEVEL</span>
          <span className="text-2xl font-bold text-white">{levelFor(foodEaten)}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={GRID_W * CELL_SIZE}
        height={GRID_H * CELL_SIZE}
        className="border border-slate-700 bg-black/50 rounded-lg shadow-2xl max-w-full"
      />

      {phase === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-8 p-12 border border-green-500/30 rounded-xl bg-black/90 shadow-[0_0_50px_rgba(74,222,128,0.1)]">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-emerald-600 tracking-tighter drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]">
              SNAKE
            </h1>
            <div className="flex flex-col gap-2 text-center text-slate-400 font-mono text-sm">
              <p>USE ARROW KEYS OR WASD TO MOVE</p>
              <p>EAT. GROW. DON&apos;T BITE YOURSELF.</p>
            </div>
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-8 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/50 rounded transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5" />
              START GAME
            </button>

            {!scoresLoading && highScores.length > 0 && (
              <div className="flex flex-col items-center gap-2 pt-4 border-t border-green-500/20">
                <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold">
                  <Trophy className="w-4 h-4" />
                  HIGH SCORES
                </div>
                <div className="flex flex-col gap-1 font-mono text-xs">
                  {highScores.slice(0, 5).map((hs, i) => (
                    <div key={hs.id} className="flex gap-4 text-slate-400">
                      <span className="text-yellow-400/70 w-4">{i + 1}.</span>
                      <span className="text-green-400 w-10">{hs.initials}</span>
                      <span className="text-white w-16 text-right">{hs.score.toLocaleString()}</span>
                      <span className="text-slate-500">LVL {hs.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 text-slate-600 text-xs font-mono">
              <span>[ENTER] Start</span>
              <span>[ESC] Exit</span>
            </div>
          </div>
        </div>
      )}

      {phase === "initials" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-6 p-8 border border-yellow-500/30 rounded-xl bg-black/90 shadow-[0_0_50px_rgba(255,215,0,0.1)]">
            <div className="flex items-center gap-2 text-yellow-400 text-2xl font-bold">
              <Trophy className="w-6 h-6" />
              NEW HIGH SCORE!
            </div>
            <p className="text-4xl font-bold text-white">{finalScore.toLocaleString()}</p>
            <div className="flex flex-col items-center gap-4">
              <p className="text-slate-400 font-mono text-sm">ENTER YOUR INITIALS</p>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-14 border-2 rounded flex items-center justify-center text-3xl font-bold ${
                      i < playerInitials.length
                        ? "border-green-400 text-green-400 bg-green-400/10"
                        : i === playerInitials.length
                          ? "border-white/50 text-white animate-pulse"
                          : "border-slate-600 text-slate-600"
                    }`}
                  >
                    {playerInitials[i] || "_"}
                  </div>
                ))}
              </div>
              <button
                onClick={handleInitialsSubmit}
                disabled={playerInitials.length === 0}
                className="mt-4 px-8 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                SUBMIT
              </button>
            </div>
            <div className="flex gap-4 text-slate-600 text-xs font-mono">
              <span>TYPE INITIALS</span>
              <span>[ENTER] Submit</span>
            </div>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-6 p-8 border border-white/10 rounded-xl bg-black/90">
            <h2 className="text-4xl font-bold tracking-widest text-rose-400">GAME OVER</h2>
            <p className="text-white font-mono">
              {scoreFor(stateRef.current.foodEaten)} points · {stateRef.current.foodEaten} food
            </p>

            {!scoresLoading && highScores.length > 0 && (
              <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold">
                  <Trophy className="w-4 h-4" />
                  HIGH SCORES
                </div>
                <div className="flex flex-col gap-1 font-mono text-xs">
                  {highScores.slice(0, 5).map((hs, i) => (
                    <div key={hs.id} className="flex gap-4 text-slate-400">
                      <span className="text-yellow-400/70 w-4">{i + 1}.</span>
                      <span className="text-green-400 w-10">{hs.initials}</span>
                      <span className="text-white w-16 text-right">{hs.score.toLocaleString()}</span>
                      <span className="text-slate-500">LVL {hs.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={startGame}
                className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                RETRY
              </button>
              <button
                onClick={onExit}
                className="flex items-center gap-2 px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
                EXIT
              </button>
            </div>
            <div className="flex gap-4 text-slate-600 text-xs font-mono">
              <span>[ENTER] Retry</span>
              <span>[ESC] Exit</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

`components/games/snake-game/index.ts`:

```ts
export { SnakeGame } from './SnakeGame'
export * from './logic'
```

`components/terminal.tsx`:

```ts
const SnakeGame = dynamic(() => import("@/components/games/snake-game").then(mod => mod.SnakeGame), {
  loading: () => <div className="p-4 text-green-400 font-mono">Loading Snake...</div>
})
```

`GameState.type` union gains `"snake"`; the render chain gains (before the final `:`):

```tsx
      ) : gameState.type === "snake" && gameState.active ? (
        <div className="absolute inset-0 z-50 bg-background">
          <SnakeGame onExit={() => setGameState({ active: false, type: null })} />
        </div>
```

`buildExecuteContext` game.start: the catch-all canvas branch already does `setGameState({ active: true, type })` — `snake` flows through it once `GameType` includes it. VFS games dir array gains `"snake"` (added with typespeed in Task 6 if not already).

- [ ] **Step 4: Run to verify pass** — `npx vitest run components lib app/api` — Expected: all pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(games): snake canvas game with high scores (C4)"`

---

### Task 9: Docs sweep, STATUS update, full gate

**Files:**
- Modify: `lib/commands/commands/system.ts` (help Games line)
- Modify: `lib/commands/man-pages.ts` (highscores man page; game man page lists new games)
- Modify: `lib/terminal-config.ts` (`COMMAND_DESCRIPTIONS` += highscores)
- Modify: `components/terminal/types.ts` (`VALID_COMMANDS` += highscores)
- Modify: `docs/superpowers/STATUS.md`

- [ ] **Step 1: Update listings**

`help`: Games line becomes `  Games          game <type>, highscores, suggest`.

`man-pages.ts` — add:

```ts
  highscores: [
    "",
    "NAME",
    "    highscores - arcade leaderboards",
    "",
    "SYNOPSIS",
    "    highscores [game]",
    "",
    "DESCRIPTION",
    "    Shows the top scores for every game, or the top 10 for one.",
    "    Games: tron, pacman, basketball, typespeed, snake.",
    "",
    "EXAMPLES",
    "    highscores",
    "    highscores snake",
    "",
  ],
```

and in the existing `game` man page, list `typespeed` and `snake` alongside the other game types, plus a line documenting `game wordle practice`.

`COMMAND_DESCRIPTIONS`: `highscores: 'Arcade leaderboards'`.

`VALID_COMMANDS`: add `'highscores'`.

`docs/superpowers/STATUS.md`: mark C ✅ Done with plan path and commit range; point pickup at D; refresh test count; note `useHighScores` now takes any `GameTypeName`.

- [ ] **Step 2: Run the full gate**

```bash
npm run lint && npm run typecheck && npx vitest run && npm run build
```

Expected: lint 0/0, typecheck clean, all tests pass, build green.

- [ ] **Step 3: Manual smoke** — `npm run dev`: `game wordle` (win/lose, then `game wordle` again for the replay summary), `game wordle practice`, `highscores`, `game typespeed` (3 rounds + initials), `game snake` (play, die, Escape exit), `man highscores`.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(terminal): document highscores/typespeed/snake; STATUS update (C complete)"`
