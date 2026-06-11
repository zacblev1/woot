# First-Visit & Mobile (Sub-project B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Repo note:** background subagents get permission-denied in this repo; use inline execution (superpowers:executing-plans) or foreground subagents only.

**Goal:** `stats` bar charts over the collections, a mobile key bar for touch devices, and a `tour` guided demo that types and runs real commands.

**Architecture:** `stats` is a pure registry command in `lib/commands/commands/collection.ts` reading `context.collections`. The key bar is a presentational component (`components/terminal/MobileKeyBar.tsx`) shown via `useSyncExternalStore` on `matchMedia('(pointer: coarse)')`, wired to the same handlers the physical keys use. The tour is a terminal-host concern in `components/terminal.tsx` (like the easter-egg scripts): data-driven steps, typewriter via `setInput`, execution via `handleCommandRef`, abort on any keydown. Spec: `docs/superpowers/specs/2026-06-09-terminal-enhancements-design.md` §B.

**Tech Stack:** Existing registry (`lib/commands/`), Vitest + RTL (happy-dom), no new dependencies.

**Conventions for every task:** run tests with `npx vitest run <file>`; the final task runs the full gate (`npm run lint && npm run typecheck && npx vitest run && npm run build`).

**Spec deviation (deliberate):** the spec's closing tour narration points at `wall`, which ships in sub-project D. The closing narration here points at `theme`, `game tron`, and Ctrl+K instead; add a `wall` line when D ships.

---

### Task 1: `stats` command

**Files:**
- Modify: `lib/commands/commands/collection.ts` (append `statsCommand`)
- Modify: `lib/commands/commands/index.ts`, `lib/commands/index.ts` (register)
- Test: `lib/commands/__tests__/collection.test.ts` (append)

- [ ] **Step 1: Write failing tests** — append to `lib/commands/__tests__/collection.test.ts` (reuse its existing mock-context helper; the tests below build their own collections, so use whatever helper exists and override `collections`):

```ts
import { statsCommand } from '../commands/collection'

describe('statsCommand', () => {
  function book(genre: string, format = 'Paperback') {
    return { title: 't', author: 'a', genre, format }
  }
  function record(genre: string, format = 'LP') {
    return { title: 't', artist: 'a', genre, format, label: 'l' }
  }
  function device(status: string) {
    return { name: 'n', type: 'Laptop', processor: 'p', memory: 'm', storage: 's', status }
  }
  function statsCtx(collections: Partial<ExecuteContext['collections']>): ExecuteContext {
    const context = createMockContext()
    context.collections = { books: [], vinyl: [], hardware: [], notes: [], ...collections }
    return context
  }
  function output(context: ExecuteContext): string[] {
    const result = statsCommand.execute([], context)
    expect(result.success).toBe(true)
    return (result as { success: true; output: string[] }).output
  }

  it('scales bars to a 24-column max and appends counts', () => {
    const books = [...Array(4).fill(book('Fiction')), ...Array(2).fill(book('Sci-Fi')), book('Essays')]
    const out = output(statsCtx({ books }))
    expect(out).toContain('BOOK GENRES')
    expect(out).toContain(`  Fiction  ${'█'.repeat(24)} 4`)
    expect(out).toContain(`  Sci-Fi   ${'█'.repeat(12)} 2`)
    expect(out).toContain(`  Essays   ${'█'.repeat(6)} 1`)
  })

  it('orders by count desc, then alphabetically', () => {
    const books = [book('Zeta'), book('Alpha'), book('Mid'), book('Mid')]
    const out = output(statsCtx({ books }))
    const rows = out.filter((l) => l.startsWith('  ') && l.includes('█'))
    // Two sections (genres + formats); genre rows come first
    expect(rows[0]).toContain('Mid')
    expect(rows[1]).toContain('Alpha')
    expect(rows[2]).toContain('Zeta')
  })

  it('shows at most 8 rows per section', () => {
    const books = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map((g) => book(g, 'Paperback'))
    const out = output(statsCtx({ books }))
    const genreStart = out.indexOf('BOOK GENRES')
    const formatStart = out.indexOf('BOOK FORMATS')
    const genreRows = out.slice(genreStart, formatStart).filter((l) => l.includes('█'))
    expect(genreRows).toHaveLength(8)
    expect(genreRows.some((l) => l.includes(' i '))).toBe(false)
  })

  it('renders all five sections when data exists', () => {
    const context = statsCtx({
      books: [book('Fiction')],
      vinyl: [record('Rock')],
      hardware: [device('Active')],
    })
    const out = output(context)
    for (const header of ['BOOK GENRES', 'VINYL GENRES', 'BOOK FORMATS', 'VINYL FORMATS', 'HARDWARE STATUS']) {
      expect(out).toContain(header)
    }
  })

  it('omits sections with no data and survives empty collections', () => {
    expect(output(statsCtx({}))).toEqual([''])
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run lib/commands/__tests__/collection.test.ts` — Expected: FAIL (`statsCommand` is not exported).

- [ ] **Step 3: Implement** — append to `lib/commands/commands/collection.ts`:

```ts
const BAR_MAX = 24
const TOP_N = 8

function countBy(values: string[]): Array<[string, number]> {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function barChart(title: string, entries: Array<[string, number]>): string[] {
  const shown = entries.slice(0, TOP_N)
  if (shown.length === 0) return []
  const max = shown[0][1]
  const labelWidth = Math.max(...shown.map(([label]) => label.length))
  return [
    title,
    ...shown.map(([label, count]) => {
      const bar = '█'.repeat(Math.max(1, Math.round((count / max) * BAR_MAX)))
      return `  ${label.padEnd(labelWidth)}  ${bar} ${count}`
    }),
    '',
  ]
}

export const statsCommand: CommandDefinition = {
  name: 'stats',
  description: 'Collection statistics as bar charts',
  usage: 'stats',
  execute: (args, context) => {
    const { books, vinyl, hardware } = context.collections
    return success([
      '',
      ...barChart('BOOK GENRES', countBy(books.map((b) => b.genre))),
      ...barChart('VINYL GENRES', countBy(vinyl.map((v) => v.genre))),
      ...barChart('BOOK FORMATS', countBy(books.map((b) => b.format))),
      ...barChart('VINYL FORMATS', countBy(vinyl.map((v) => v.format))),
      ...barChart('HARDWARE STATUS', countBy(hardware.map((h) => h.status))),
    ])
  },
}
```

Register: in `lib/commands/commands/index.ts` add `statsCommand` to the `./collection` export block; in `lib/commands/index.ts` `createDefaultRegistry()` add `registry.register(commands.statsCommand)` in the Collection block.

- [ ] **Step 4: Run to verify pass** — `npx vitest run lib/commands` — Expected: all pass (if a registry/completion test asserts a fixed command count, update it to include `stats`).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): stats command with ASCII bar charts"`

---

### Task 2: `MobileKeyBar` component

**Files:**
- Create: `components/terminal/MobileKeyBar.tsx`
- Modify: `components/terminal/index.ts` (export)
- Test: Create `components/terminal/__tests__/MobileKeyBar.test.tsx`

- [ ] **Step 1: Write failing tests** — `components/terminal/__tests__/MobileKeyBar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileKeyBar } from '../MobileKeyBar'

function mockPointer(coarse: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(pointer: coarse)' ? coarse : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function makeHandlers() {
  return {
    onTab: vi.fn(),
    onHistoryUp: vi.fn(),
    onHistoryDown: vi.fn(),
    onInterrupt: vi.fn(),
    onEscape: vi.fn(),
    onCommandPalette: vi.fn(),
  }
}

const KEYS = ['Tab completion', 'History up', 'History down', 'Interrupt', 'Escape', 'Command palette']

describe('MobileKeyBar', () => {
  it('renders nothing on fine-pointer devices', () => {
    mockPointer(false)
    render(<MobileKeyBar {...makeHandlers()} />)
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('renders all six labelled keys on coarse-pointer devices', () => {
    mockPointer(true)
    render(<MobileKeyBar {...makeHandlers()} />)
    expect(screen.getByRole('toolbar', { name: 'Terminal keys' })).toBeInTheDocument()
    for (const name of KEYS) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('fires the matching handler for each key', () => {
    mockPointer(true)
    const handlers = makeHandlers()
    render(<MobileKeyBar {...handlers} />)
    const expectations: Array<[string, ReturnType<typeof vi.fn>]> = [
      ['Tab completion', handlers.onTab],
      ['History up', handlers.onHistoryUp],
      ['History down', handlers.onHistoryDown],
      ['Interrupt', handlers.onInterrupt],
      ['Escape', handlers.onEscape],
      ['Command palette', handlers.onCommandPalette],
    ]
    for (const [name, handler] of expectations) {
      fireEvent.click(screen.getByRole('button', { name }))
      expect(handler).toHaveBeenCalledTimes(1)
    }
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run components/terminal/__tests__/MobileKeyBar.test.tsx` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `components/terminal/MobileKeyBar.tsx`:

```tsx
import { useSyncExternalStore } from 'react'

const COARSE_QUERY = '(pointer: coarse)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(COARSE_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(COARSE_QUERY).matches
}

function getServerSnapshot() {
  return false
}

export interface MobileKeyBarProps {
  onTab: () => void
  onHistoryUp: () => void
  onHistoryDown: () => void
  onInterrupt: () => void
  onEscape: () => void
  onCommandPalette: () => void
}

/**
 * Touch-device shortcut bar rendered between history and the input line.
 * Buttons reuse the Terminal's existing key handlers (no synthetic
 * KeyboardEvents); pointerdown is prevented so taps never steal focus
 * from the terminal input (which would close the mobile keyboard).
 */
export function MobileKeyBar(props: MobileKeyBarProps) {
  const coarse = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (!coarse) return null

  const keys: Array<{ label: string; aria: string; onPress: () => void }> = [
    { label: 'Tab', aria: 'Tab completion', onPress: props.onTab },
    { label: '↑', aria: 'History up', onPress: props.onHistoryUp },
    { label: '↓', aria: 'History down', onPress: props.onHistoryDown },
    { label: 'Ctrl+C', aria: 'Interrupt', onPress: props.onInterrupt },
    { label: 'Esc', aria: 'Escape', onPress: props.onEscape },
    { label: '⌘K', aria: 'Command palette', onPress: props.onCommandPalette },
  ]

  return (
    <div role="toolbar" aria-label="Terminal keys" className="flex gap-2 py-2 shrink-0 overflow-x-auto">
      {keys.map(({ label, aria, onPress }) => (
        <button
          key={label}
          type="button"
          aria-label={aria}
          className="px-3 py-1 rounded border border-border text-muted-foreground text-xs whitespace-nowrap active:text-primary active:border-primary"
          onPointerDown={(e) => e.preventDefault()}
          onClick={onPress}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

In `components/terminal/index.ts` add `export { MobileKeyBar } from './MobileKeyBar'`.

- [ ] **Step 4: Run to verify pass** — `npx vitest run components/terminal` — Expected: all pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): mobile key bar component"`

---

### Task 3: Wire the key bar into the Terminal

**Files:**
- Modify: `components/terminal.tsx`
- Test: Create `components/__tests__/terminal-mobile-keybar.test.tsx`

- [ ] **Step 1: Write failing tests** — `components/__tests__/terminal-mobile-keybar.test.tsx` (harness copied from `terminal-deeplink.test.tsx`, with a coarse-pointer matchMedia):

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Terminal } from '../terminal'
import { TerminalContextProvider } from '@/lib/terminal-context'

function WrappedTerminal() {
  return (
    <TerminalContextProvider>
      <Terminal />
    </TerminalContextProvider>
  )
}

const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

function mockMatchMedia(matching: Record<string, boolean>) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matching[query] ?? false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('Terminal mobile key bar', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    mockLocalStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('is hidden on fine-pointer devices', () => {
    mockMatchMedia({})
    render(<WrappedTerminal />)
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('history-up button recalls the previous command into the input', async () => {
    mockMatchMedia({ '(pointer: coarse)': true })
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    await user.type(input, 'pwd{Enter}')
    await waitFor(() => expect(screen.getByText('/home/zachary')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'History up' }))
    expect(input).toHaveValue('pwd')
  })

  it('escape button clears the input', async () => {
    mockMatchMedia({ '(pointer: coarse)': true })
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    await user.type(input, 'partial command')
    fireEvent.click(screen.getByRole('button', { name: 'Escape' }))
    expect(input).toHaveValue('')
  })

  it('tab button completes an unambiguous command', async () => {
    mockMatchMedia({ '(pointer: coarse)': true })
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    await user.type(input, 'neof')
    fireEvent.click(screen.getByRole('button', { name: 'Tab completion' }))
    expect(input).toHaveValue('neofetch')
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run components/__tests__/terminal-mobile-keybar.test.tsx` — Expected: the three coarse-pointer tests FAIL (no toolbar rendered).

- [ ] **Step 3: Implement** — in `components/terminal.tsx`:

Add `MobileKeyBar` to the existing import from `./terminal/index`:

```ts
import { HistoryDisplay, InputLine, type InputLineHandle, VALID_COMMANDS, MobileKeyBar } from "./terminal/index"
```

In the JSX, between `<HistoryDisplay history={history} />` and `<InputLine`:

```tsx
          <MobileKeyBar
            onTab={() => handleTabComplete(input)}
            onHistoryUp={() => {
              const cmd = handleHistoryUp()
              if (cmd !== null) setInput(cmd)
            }}
            onHistoryDown={() => {
              const cmd = handleHistoryDown()
              setInput(cmd ?? "")
            }}
            onInterrupt={handleInterrupt}
            onEscape={() => {
              setShowPalette(false)
              setInput("")
            }}
            onCommandPalette={handleCommandPalette}
          />
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run components` — Expected: all pass (characterization included).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): mobile key bar wired into the terminal"`

---

### Task 4: `tour` guided demo

**Files:**
- Modify: `components/terminal.tsx` (tour data, engine, dispatch, banner line)
- Test: Create `components/__tests__/terminal-tour.test.tsx`

- [ ] **Step 1: Write failing tests** — `components/__tests__/terminal-tour.test.tsx` (same `WrappedTerminal`/`mockLocalStorage`/`mockMatchMedia` helpers as Task 3's test file — copy them in):

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Terminal } from '../terminal'
import { TerminalContextProvider } from '@/lib/terminal-context'

// ...same WrappedTerminal, mockLocalStorage, mockMatchMedia as terminal-mobile-keybar.test.tsx...

describe('tour', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
    mockLocalStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('advertises the tour in the banner', () => {
    mockMatchMedia({})
    render(<WrappedTerminal />)
    expect(screen.getByText("Type 'tour' for a guided demo.")).toBeInTheDocument()
  })

  it('runs the scripted demo end-to-end under reduced motion', async () => {
    mockMatchMedia({ '(prefers-reduced-motion: reduce)': true })
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'tour{Enter}')
    await waitFor(() => expect(screen.getByText(/WELCOME TO THE TOUR/)).toBeInTheDocument())
    await waitFor(
      () => {
        expect(screen.getByText('COMMANDS')).toBeInTheDocument() // help ran
        expect(screen.getByText(/Bukowski/)).toBeInTheDocument() // view pulp ran
        expect(screen.getByText(/Synchronicity - The Police/)).toBeInTheDocument() // search ran
        expect(screen.getByText('BOOK GENRES')).toBeInTheDocument() // stats ran
        expect(screen.getByText('The terminal is yours.')).toBeInTheDocument() // closing narration
      },
      { timeout: 5000 }
    )
  })

  it('any keypress aborts the tour', async () => {
    mockMatchMedia({}) // full motion: typewriter pacing leaves time to abort
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    await user.type(screen.getByRole('textbox'), 'tour{Enter}')
    await waitFor(() => expect(screen.getByText(/WELCOME TO THE TOUR/)).toBeInTheDocument())
    fireEvent.keyDown(window, { key: 'x' })
    await waitFor(() => expect(screen.getByText(/tour ended/)).toBeInTheDocument())
    expect(screen.queryByText('BOOK GENRES')).not.toBeInTheDocument()
  })

  it('a submitted command during the tour aborts instead of executing garbage', async () => {
    mockMatchMedia({})
    const user = userEvent.setup()
    render(<WrappedTerminal />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'tour{Enter}')
    await waitFor(() => expect(screen.getByText(/WELCOME TO THE TOUR/)).toBeInTheDocument())
    fireEvent.keyDown(input, { key: 'Enter' }) // submit whatever is half-typed
    await waitFor(() => expect(screen.getByText(/tour ended/)).toBeInTheDocument())
    expect(screen.queryByText(/command not found/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run components/__tests__/terminal-tour.test.tsx` — Expected: FAIL (banner line missing; `command not found: tour`).

- [ ] **Step 3: Implement** — in `components/terminal.tsx`:

**(a) Banner** — in `initialHistory`, after the `"Type 'help' …"` line add:

```ts
  { type: "output", content: "Type 'tour' for a guided demo.", centered: true },
  { type: "output", content: "" },
```

and remove the now-duplicated trailing `{ type: "output", content: "" }` if it leaves two blank lines (keep exactly one blank line after each hint line).

**(b) Tour script data** — module level, below `MELTDOWN_LINES`:

```ts
interface TourStep {
  narrate?: string[]
  type?: string
}

// Guided demo: narration lines, then a command typed and executed for real.
// Closing narration will gain a `wall` line when the guestbook ships.
const TOUR_STEPS: TourStep[] = [
  { narrate: ["", "*** GUIDED TOUR ***", "Sit back — I'll drive. Press any key to take over.", ""] },
  { narrate: ["Everything here is a command. help lists them:"], type: "help" },
  { narrate: ["Collections are directories. The books live in ~/books:"], type: "cd books" },
  { type: "ls" },
  { narrate: ["view pretty-prints any file:"], type: "view pulp" },
  { narrate: ["Vinyl works the same way:"], type: "cd ~/vinyl" },
  { narrate: ["search digs through the current collection:"], type: "search police" },
  { narrate: ["stats charts all of it:"], type: "stats" },
  { narrate: ["And there are games. Real ones:"], type: "game" },
  {
    narrate: [
      "",
      "That's the tour. A few things to try:",
      "  theme        change the look (rumor: a code unlocks an extra one)",
      "  game tron    light cycles",
      "  Ctrl+K       fuzzy command palette",
      "",
      "The terminal is yours.",
      "",
    ],
  },
]

const TOUR_TYPE_MS = 40
const TOUR_STEP_PAUSE_MS = 900
const TOUR_PRE_TYPE_MS = 600
const TOUR_POST_TYPE_MS = 250
```

**(c) Tour state + stop** — inside the component, right after the `playScript` definition:

```ts
  // --- tour: data-driven guided demo (B1) ---
  const [isTouring, setIsTouring] = useState(false)
  const tourActive = useRef(false)
  const tourTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => {
    const timers = tourTimers.current
    return () => timers.forEach(clearTimeout)
  }, [])

  const tourDelay = (ms: number) =>
    new Promise<void>((resolve) => tourTimers.current.push(setTimeout(resolve, ms)))

  const stopTour = (aborted: boolean) => {
    tourActive.current = false
    setIsTouring(false)
    tourTimers.current.forEach(clearTimeout)
    tourTimers.current = []
    setInput("")
    if (aborted) {
      setHistory((prev) => [...prev, { type: "success", content: "(tour ended — the terminal is yours)" }])
    }
  }
```

**(d) Abort on any keypress** — an effect next to the Konami effect:

```ts
  // Any keypress while the tour is driving hands control back to the user
  useEffect(() => {
    if (!isTouring) return
    const abort = () => stopTour(true)
    window.addEventListener("keydown", abort)
    return () => window.removeEventListener("keydown", abort)
  }, [isTouring]) // eslint-disable-line react-hooks/exhaustive-deps
```

**(e) handleCommand guard + dispatch** — change the signature and add a guard at the top:

```ts
  const handleCommand = (cmd: string, opts?: { fromTour?: boolean }) => {
    const trimmedCmd = cmd.trim()
    if (!trimmedCmd) return

    // A user-submitted command while the tour is driving = taking over
    if (tourActive.current && !opts?.fromTour) {
      stopTour(true)
      return
    }
```

and in the dispatch section, add a `tour` branch beside `suggest`:

```ts
    if (cmd_lower === "suggest") {
      appendCommandOutput(startSuggestCommand())
    } else if (cmd_lower === "tour") {
      void startTour()
    } else {
```

**(f) Tour runner** — after the `handleCommandRef` block (it uses the ref):

```ts
  const startTour = async () => {
    if (tourActive.current) return
    tourActive.current = true
    setIsTouring(true)
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    for (const step of TOUR_STEPS) {
      if (!tourActive.current) return
      for (const line of step.narrate ?? []) {
        setHistory((prev) => [...prev, { type: "success", content: line }])
      }
      if (step.type) {
        const command = step.type
        if (reduced) {
          await tourDelay(0) // yield so the previous command's state lands
          if (!tourActive.current) return
          handleCommandRef.current(command, { fromTour: true })
        } else {
          await tourDelay(TOUR_PRE_TYPE_MS)
          for (let i = 1; i <= command.length; i++) {
            if (!tourActive.current) return
            setInput(command.slice(0, i))
            await tourDelay(TOUR_TYPE_MS)
          }
          if (!tourActive.current) return
          await tourDelay(TOUR_POST_TYPE_MS)
          if (!tourActive.current) return
          handleCommandRef.current(command, { fromTour: true })
        }
      }
      if (!reduced) await tourDelay(TOUR_STEP_PAUSE_MS)
    }
    tourActive.current = false
    setIsTouring(false)
  }
```

Note: `handleCommandRef` already exists (deep links). Its `useRef(handleCommand)` type picks up the new optional `opts` parameter automatically. Commands mutate the shared `vfs` object synchronously, and `currentDirectory` re-renders flush before the next step's timer fires, so each step sees the previous step's state through the freshly-assigned ref.

- [ ] **Step 4: Run to verify pass** — `npx vitest run components` — Expected: all pass (characterization pins the help banner line exactly; the tour hint is a new separate line so it must not break — if it does, the banner edit in (a) is wrong).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): guided tour (typewriter demo of real commands)"`

---

### Task 5: Help/man/completions sweep, STATUS update, full gate

**Files:**
- Modify: `lib/commands/commands/system.ts` (help text)
- Modify: `lib/commands/man-pages.ts` (stats + tour entries)
- Modify: `lib/terminal-config.ts` (`COMMAND_DESCRIPTIONS`)
- Modify: `components/terminal/types.ts` (`VALID_COMMANDS`)
- Modify: `docs/superpowers/STATUS.md`

- [ ] **Step 1: Update listings**

`help` (system.ts): Collections line becomes `search, genre, format, type, stats`; Other line becomes `clear, echo, exit, history, cowsay, tour`.

`man-pages.ts` — add (existing format):

```ts
  stats: [
    "",
    "NAME",
    "    stats - collection statistics as bar charts",
    "",
    "SYNOPSIS",
    "    stats",
    "",
    "DESCRIPTION",
    "    ASCII bar charts over the collections: top book and vinyl",
    "    genres, formats, and hardware status.",
    "",
    "EXAMPLES",
    "    stats",
    "    stats | grep Fiction",
    "",
  ],
  tour: [
    "",
    "NAME",
    "    tour - guided demo of the terminal",
    "",
    "SYNOPSIS",
    "    tour",
    "",
    "DESCRIPTION",
    "    Types and runs a scripted sequence of real commands with a",
    "    typewriter effect. Press any key to take over at any point.",
    "",
    "EXAMPLES",
    "    tour",
    "",
  ],
```

`COMMAND_DESCRIPTIONS` (lib/terminal-config.ts): add `stats: 'Collection statistics as bar charts'` and `tour: 'Guided demo of the terminal'`.

`VALID_COMMANDS` (components/terminal/types.ts): add `'stats'` and `'tour'` (syntax highlighting, palette, host tab completion).

`docs/superpowers/STATUS.md`: mark sub-project B ✅ Done with plan path `plans/2026-06-11-first-visit-mobile.md` and the commit range; update "How to pick back up" to point at C (C0 first); refresh the test-count line.

- [ ] **Step 2: Run the full gate**

```bash
npm run lint && npm run typecheck && npx vitest run && npm run build
```

Expected: lint 0 errors/0 warnings, typecheck clean, all tests pass, build green. Fix anything that surfaces (likely candidates: a completion/registry test asserting a fixed command list; the characterization test if banner spacing changed).

- [ ] **Step 3: Manual smoke** — `npm run dev`, then in the browser: `stats`, `man stats`, `man tour`, `tour` (watch a full run; run it again and press a key mid-run to abort), and in devtools device emulation (touch) verify the key bar shows and ↑/Esc/Tab work.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(terminal): document stats/tour in help, man, completions; STATUS update"`
