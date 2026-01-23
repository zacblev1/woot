# Phase 5: UI Components - Research

**Researched:** 2026-01-22
**Domain:** React component extraction, memoization patterns, keyboard event handling, terminal display components
**Confidence:** HIGH

## Summary

This research investigates how to extract display components (HistoryDisplay, InputLine, TerminalLine) from the monolithic terminal.tsx with proper memoization for performance. The primary challenge is preventing unnecessary re-renders when the input state changes frequently during typing while maintaining proper keyboard event handling and mobile compatibility.

The established pattern from Phases 2-4 provides a solid foundation: hooks manage state, the TerminalContext provides composition, and commands are executed via the registry. Phase 5 extracts the JSX rendering into composable, memoized components that consume this infrastructure.

React 19 includes a Compiler that provides automatic memoization, but since this project doesn't have React Compiler configured, manual memoization with `React.memo` and `useMemo` is appropriate. The key insight is that HistoryDisplay should be memoized to not re-render when input changes, while InputLine must remain responsive to every keystroke.

**Primary recommendation:** Extract three components with clear boundaries: TerminalLine (pure display, memoized), HistoryDisplay (list wrapper, memoized based on history array reference), and InputLine (handles all keyboard events, not memoized since input changes frequently). Use `React.memo` sparingly - only where profiling shows benefit.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.1 | Component rendering, hooks | Already in project |
| TypeScript | 5.x | Type safety | Already configured |
| Vitest | 4.x | Component testing | Already configured |
| @testing-library/react | 16.3.2 | Component testing | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/user-event | 14.6.1 | Keyboard event simulation | Testing InputLine |
| React DevTools Profiler | - | Performance verification | Validating memoization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React.memo | React Compiler | Compiler not configured in project, requires babel plugin |
| forwardRef + useImperativeHandle | Direct ref | useImperativeHandle allows controlled API exposure (existing pattern from GameController) |
| useMemo for line rendering | Virtualized list (react-window) | Over-engineering for typical history size (~100-500 lines) |

**Installation:**
```bash
# No new packages needed - all already installed
```

## Architecture Patterns

### Recommended Project Structure
```
components/
├── terminal/
│   ├── HistoryDisplay.tsx     # Memoized history list container
│   ├── InputLine.tsx          # Input field with keyboard handling
│   ├── TerminalLine.tsx       # Single line with syntax highlighting
│   ├── SyntaxHighlighter.tsx  # Input highlighting logic (extracted)
│   ├── types.ts               # Component-specific types
│   ├── index.ts               # Barrel export
│   └── __tests__/
│       ├── HistoryDisplay.test.tsx
│       ├── InputLine.test.tsx
│       └── TerminalLine.test.tsx
├── games/                      # Existing from Phase 3
└── terminal.tsx               # Slim orchestrator (~200 lines)
```

### Pattern 1: TerminalLine - Pure Display Component

**What:** Renders a single terminal line with appropriate styling and syntax highlighting.
**When to use:** For each line in the history display.

**Example:**
```typescript
// Source: Derived from terminal.tsx lines 1811-1857
import { memo, type ReactNode } from 'react'
import type { TerminalLine as TerminalLineType } from '@/lib/types/terminal'

interface TerminalLineProps {
  line: TerminalLineType
  highlightInput: (text: string) => ReactNode
  highlightLine: (text: string) => ReactNode
}

/**
 * TerminalLine renders a single line with appropriate styling.
 * Memoized because the same line content rarely changes.
 */
export const TerminalLine = memo(function TerminalLine({
  line,
  highlightInput,
  highlightLine,
}: TerminalLineProps) {
  const baseClass = 'whitespace-pre-wrap break-words break-all'
  const colorClass = getColorClass(line.type)

  return (
    <div className={`${baseClass} ${colorClass}`}>
      {renderLineContent(line, highlightInput, highlightLine)}
    </div>
  )
})

function getColorClass(type: TerminalLineType['type']): string {
  switch (type) {
    case 'input': return 'text-primary'
    case 'error': return 'text-destructive'
    case 'success': return 'text-accent'
    default: return 'text-foreground'
  }
}
```

### Pattern 2: HistoryDisplay - Memoized List Container

**What:** Renders the scrollable history area with all terminal lines.
**When to use:** As the main output area in the terminal.

**Example:**
```typescript
// Source: Derived from terminal.tsx lines 1810-1858
import { memo, useRef, useEffect, type RefObject } from 'react'
import type { TerminalLine as TerminalLineType } from '@/lib/types/terminal'
import { TerminalLine } from './TerminalLine'

interface HistoryDisplayProps {
  history: TerminalLineType[]
  containerRef?: RefObject<HTMLDivElement>
}

/**
 * HistoryDisplay renders the terminal output history.
 * Memoized to prevent re-renders when input state changes.
 *
 * Key insight: This component only re-renders when history array
 * reference changes (new lines added), not when input changes.
 */
export const HistoryDisplay = memo(function HistoryDisplay({
  history,
  containerRef,
}: HistoryDisplayProps) {
  const internalRef = useRef<HTMLDivElement>(null)
  const scrollRef = containerRef ?? internalRef

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history, scrollRef])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {history.map((line, i) => (
        <TerminalLine
          key={i}
          line={line}
          highlightInput={highlightInput}
          highlightLine={highlightLine}
        />
      ))}
    </div>
  )
})
```

### Pattern 3: InputLine - Interactive Input Component

**What:** Handles all user input including keyboard events (Enter, Tab, arrows, Ctrl+C/L).
**When to use:** At the bottom of the terminal for command entry.

**Example:**
```typescript
// Source: Derived from terminal.tsx lines 1746-1796, 1860-1976
import { useRef, useEffect, forwardRef, useImperativeHandle, type ChangeEvent, type KeyboardEvent } from 'react'

export interface InputLineHandle {
  focus: () => void
  clear: () => void
  setValue: (value: string) => void
}

interface InputLineProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  onTabComplete: (partial: string) => string[] | void
  onHistoryUp: () => string | null
  onHistoryDown: () => string | null
  onClear: () => void
  onInterrupt: () => void
  prompt: string
  disabled?: boolean
  validCommands: string[]
}

/**
 * InputLine handles all terminal input interactions.
 * NOT memoized because it needs to re-render on every keystroke.
 *
 * Uses forwardRef + useImperativeHandle to expose controlled API
 * (matching GameController pattern from Phase 3).
 */
export const InputLine = forwardRef<InputLineHandle, InputLineProps>(
  function InputLine(props, ref) {
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => props.onChange(''),
      setValue: (value: string) => props.onChange(value),
    }), [props.onChange])

    // Mobile keyboard handling - scroll input into view
    useEffect(() => {
      const input = inputRef.current
      if (!input) return

      const handleFocus = () => {
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }, 300)
      }

      input.addEventListener('focus', handleFocus)
      return () => input.removeEventListener('focus', handleFocus)
    }, [])

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        props.onSubmit(props.value)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        props.onTabComplete(props.value)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const command = props.onHistoryUp()
        if (command !== null) props.onChange(command)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const command = props.onHistoryDown()
        props.onChange(command ?? '')
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault()
        props.onClear()
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        // Only intercept if a game is active (let terminal handle)
        props.onInterrupt()
      }
    }

    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-primary">{props.prompt}</span>
        <div className="flex-1 relative">
          <InputHighlighter value={props.value} validCommands={props.validCommands} />
          <input
            ref={inputRef}
            type="text"
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent outline-none text-transparent caret-foreground"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            disabled={props.disabled}
          />
        </div>
      </div>
    )
  }
)
```

### Pattern 4: SyntaxHighlighter - Extracted Highlighting Logic

**What:** Pure function components for syntax highlighting input and output.
**When to use:** Passed as props to TerminalLine, used in InputLine.

**Example:**
```typescript
// Source: Derived from terminal.tsx lines 18-110, 1864-1960
import type { ReactNode } from 'react'

/**
 * Token types for input highlighting
 */
interface Token {
  type: 'command' | 'invalid' | 'path' | 'string' | 'flag' | 'number' | 'argument' | 'space' | 'text'
  value: string
}

/**
 * Tokenize input for syntax highlighting.
 * Pure function - no React dependencies.
 */
export function tokenizeInput(input: string, validCommands: string[]): Token[] {
  const tokens: Token[] = []
  let remaining = input
  let isFirstToken = true

  while (remaining.length > 0) {
    // ... tokenization logic (extracted from terminal.tsx)
  }

  return tokens
}

/**
 * Render tokens as highlighted spans.
 */
export function renderTokens(tokens: Token[]): ReactNode {
  return tokens.map((token, i) => {
    const colorClass = getTokenColor(token.type)
    return <span key={i} className={colorClass}>{token.value}</span>
  })
}

function getTokenColor(type: Token['type']): string {
  switch (type) {
    case 'command': return 'text-accent font-semibold'
    case 'invalid': return 'text-destructive'
    case 'path': return 'text-primary'
    case 'string': return 'text-yellow-400'
    case 'flag': return 'text-purple-400'
    case 'number': return 'text-orange-400'
    case 'argument': return 'text-muted-foreground'
    default: return ''
  }
}
```

### Pattern 5: Terminal Orchestrator (Refactored)

**What:** Slim orchestrator that composes all components and handles state coordination.
**When to use:** As the main Terminal component exported for use in pages.

**Example:**
```typescript
// Source: Refactored terminal.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { HistoryDisplay } from './terminal/HistoryDisplay'
import { InputLine, type InputLineHandle } from './terminal/InputLine'
import { GameController, type GameControllerHandle } from './games/GameController'
import { useVFS } from '@/lib/context/VFSContext'
import { useTerminal } from '@/lib/context/TerminalContext'
import { executeCommand, getCompletions, createDefaultRegistry } from '@/lib/commands'
import type { TerminalLine } from '@/lib/types/terminal'

const registry = createDefaultRegistry()
const VALID_COMMANDS = registry.list()

export function Terminal() {
  const [displayHistory, setDisplayHistory] = useState<TerminalLine[]>(INITIAL_HISTORY)
  const [input, setInput] = useState('')
  const [currentDirectory, setCurrentDirectory] = useState('~')

  const vfs = useVFS()
  const { history, game, theme, font } = useTerminal()
  const inputRef = useRef<InputLineHandle>(null)
  const gameRef = useRef<GameControllerHandle>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  const prompt = game.isPlaying ? `[${game.currentGame}]` : `${currentDirectory} $`

  const handleSubmit = (command: string) => {
    // Add input line to display
    setDisplayHistory(prev => [...prev, { type: 'input', content: `${prompt} ${command}` }])

    // If game is active, route to GameController
    if (game.isPlaying && gameRef.current) {
      gameRef.current.handleInput(command)
      setInput('')
      return
    }

    // Execute command via registry
    const context = buildContext(vfs, history, game, theme, font, currentDirectory, setCurrentDirectory)
    const result = executeCommand(command, context, registry)

    // Add result to display
    if (result.success) {
      addOutput(result.output, setDisplayHistory)
    } else {
      setDisplayHistory(prev => [...prev, { type: 'error', content: result.error }])
    }

    history.add(command)
    setInput('')
  }

  // ... other handlers

  return (
    <div
      className="h-full w-full bg-background p-4 md:p-6 font-mono text-sm md:text-base cursor-text flex flex-col relative"
      onClick={() => inputRef.current?.focus()}
    >
      {game.currentGame === 'tron' && game.isPlaying ? (
        <GameController ref={gameRef} gameState={game.gameState} onResult={handleGameResult} onGameEnd={game.endGame} />
      ) : (
        <>
          <HistoryDisplay history={displayHistory} containerRef={terminalRef} />
          <InputLine
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            onTabComplete={handleTabComplete}
            onHistoryUp={history.navigateUp}
            onHistoryDown={history.navigateDown}
            onClear={handleClear}
            onInterrupt={handleInterrupt}
            prompt={prompt}
            validCommands={VALID_COMMANDS}
          />
        </>
      )}
      <GameController
        ref={gameRef}
        gameState={game.gameState}
        onResult={handleGameResult}
        onGameEnd={game.endGame}
      />
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Memoizing everything:** React.memo has overhead; only use where profiling shows benefit
- **Passing new object/function references:** Defeats memoization; use useMemo/useCallback for props to memoized components
- **Index-only keys:** Using `key={i}` for dynamic lists can cause issues; acceptable here since history is append-only
- **Lifting input state too high:** Keep input state in InputLine or immediate parent, not in context
- **Mixing controlled/uncontrolled input:** Pick one pattern; use controlled (value + onChange) for terminal
- **Blocking keyboard events:** Always call original handlers after custom handling

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Virtualized scrolling | Custom windowing | react-window/react-virtualized | Complex edge cases (sticky, variable height) |
| Auto-scroll to bottom | Manual scroll tracking | scrollTop = scrollHeight in useEffect | Browser handles efficiently |
| Focus management | Manual tabIndex manipulation | autoFocus + ref.focus() | Native browser support |
| Mobile keyboard detection | Custom resize listeners | Input focus events + scrollIntoView | More reliable cross-platform |

**Key insight:** The terminal history is typically small enough (<1000 lines) that virtualization adds complexity without benefit. Simple overflow-y-auto with auto-scroll is sufficient.

## Common Pitfalls

### Pitfall 1: HistoryDisplay Re-renders on Input Change

**What goes wrong:** Typing causes entire history to re-render, causing lag.
**Why it happens:** History prop passed by reference from parent state that also tracks input.
**How to avoid:**
- Keep input state separate from history state
- Memoize HistoryDisplay with React.memo
- Ensure history array reference only changes when lines added
**Warning signs:** React DevTools shows HistoryDisplay re-rendering during typing.

### Pitfall 2: Stale Closures in Event Handlers

**What goes wrong:** Keyboard handlers capture old state values.
**Why it happens:** useCallback with missing dependencies or inline handlers capturing stale closures.
**How to avoid:**
- Include all dependencies in useCallback array
- Consider passing handlers as props rather than defining inline
- Test navigation behavior after adding many commands
**Warning signs:** Arrow up/down returns wrong command, tab completion uses stale data.

### Pitfall 3: Mobile Keyboard Obscures Input

**What goes wrong:** On mobile, virtual keyboard covers the input field.
**Why it happens:** Input not scrolled into view when keyboard appears.
**How to avoid:**
- Add focus listener that calls scrollIntoView
- Use setTimeout(300ms) to wait for keyboard animation
- Test on actual mobile devices, not just browser emulation
**Warning signs:** Users can't see what they're typing on mobile.

### Pitfall 4: Ctrl+C Intercepted by Browser

**What goes wrong:** Ctrl+C doesn't interrupt game because browser intercepts for copy.
**Why it happens:** Event.preventDefault() not called early enough, or wrong modifier key checked.
**How to avoid:**
- Check both ctrlKey and metaKey (for Mac Cmd+C)
- Only preventDefault when game is active and there's no text selection
- Consider using a different key combo if copy functionality is important
**Warning signs:** Games can't be interrupted with Ctrl+C.

### Pitfall 5: Memoized Component Doesn't Update

**What goes wrong:** Changes don't appear because memo is blocking re-renders.
**Why it happens:** Custom comparison function is too strict, or forgetting that memo compares by reference.
**How to avoid:**
- Start without custom comparison
- Use React DevTools to verify props are actually changing
- Don't memoize components that receive frequently-changing props
**Warning signs:** UI appears frozen or doesn't update when expected.

## Code Examples

Verified patterns from official sources and existing codebase:

### Testing Memoized Components

```typescript
// Source: @testing-library/react best practices
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { HistoryDisplay } from '../HistoryDisplay'
import { TerminalLine } from '../TerminalLine'

describe('HistoryDisplay', () => {
  it('renders all history lines', () => {
    const history = [
      { type: 'input' as const, content: '~/books $ ls' },
      { type: 'output' as const, content: 'dune.txt' },
    ]

    render(<HistoryDisplay history={history} />)

    expect(screen.getByText(/ls/)).toBeInTheDocument()
    expect(screen.getByText(/dune/)).toBeInTheDocument()
  })

  it('does not re-render when same history reference passed', () => {
    const renderSpy = vi.fn()
    const MockLine = vi.fn(() => {
      renderSpy()
      return <div>line</div>
    })

    const history = [{ type: 'output' as const, content: 'test' }]
    const { rerender } = render(<HistoryDisplay history={history} />)

    // Same reference - should not cause child re-renders
    rerender(<HistoryDisplay history={history} />)

    // Verify memoization is working by checking render count
    // (exact assertion depends on implementation)
  })
})
```

### Testing Keyboard Events

```typescript
// Source: @testing-library/user-event docs
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputLine } from '../InputLine'

describe('InputLine keyboard handling', () => {
  it('submits on Enter', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <InputLine
        value="ls"
        onChange={() => {}}
        onSubmit={onSubmit}
        onTabComplete={() => []}
        onHistoryUp={() => null}
        onHistoryDown={() => null}
        onClear={() => {}}
        onInterrupt={() => {}}
        prompt="$ "
        validCommands={['ls']}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, '{Enter}')

    expect(onSubmit).toHaveBeenCalledWith('ls')
  })

  it('navigates history with ArrowUp', async () => {
    const user = userEvent.setup()
    const onHistoryUp = vi.fn().mockReturnValue('previous-command')
    const onChange = vi.fn()

    render(
      <InputLine
        value=""
        onChange={onChange}
        onSubmit={() => {}}
        onTabComplete={() => []}
        onHistoryUp={onHistoryUp}
        onHistoryDown={() => null}
        onClear={() => {}}
        onInterrupt={() => {}}
        prompt="$ "
        validCommands={[]}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, '{ArrowUp}')

    expect(onHistoryUp).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith('previous-command')
  })

  it('handles Tab completion', async () => {
    const user = userEvent.setup()
    const onTabComplete = vi.fn()

    render(
      <InputLine
        value="th"
        onChange={() => {}}
        onSubmit={() => {}}
        onTabComplete={onTabComplete}
        onHistoryUp={() => null}
        onHistoryDown={() => null}
        onClear={() => {}}
        onInterrupt={() => {}}
        prompt="$ "
        validCommands={['theme']}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, '{Tab}')

    expect(onTabComplete).toHaveBeenCalledWith('th')
  })
})
```

### Exposing Imperative Handle

```typescript
// Source: React docs, GameController pattern from Phase 3
import { forwardRef, useImperativeHandle, useRef } from 'react'

export interface InputLineHandle {
  focus: () => void
  clear: () => void
  setValue: (value: string) => void
}

export const InputLine = forwardRef<InputLineHandle, InputLineProps>(
  function InputLine(props, ref) {
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => {
        props.onChange('')
        inputRef.current?.focus()
      },
      setValue: (value: string) => {
        props.onChange(value)
      },
    }), [props.onChange])

    // ... rest of component
  }
)

// Usage in parent:
const inputRef = useRef<InputLineHandle>(null)

// Focus programmatically:
inputRef.current?.focus()

// Clear input:
inputRef.current?.clear()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual memo everywhere | React Compiler (auto-memoization) | React 19 (2024) | Reduced boilerplate |
| Class components with shouldComponentUpdate | memo + hooks | React 16.8+ (2019) | Simpler API |
| forwardRef required for ref prop | ref as regular prop | React 19 (2024) | Less ceremony |
| Index keys for lists | Stable keys when possible | Best practice | Better reconciliation |

**Deprecated/outdated:**
- `UNSAFE_componentWillReceiveProps`: Use functional components with hooks
- `PureComponent`: Use `memo()` with function components
- Manual DOM manipulation: Use refs only when necessary

**React 19 changes:**
- `ref` can now be passed as a regular prop (no forwardRef needed for simple cases)
- React Compiler can auto-memoize, but requires babel configuration
- useTransition and useDeferredValue for more granular performance control

## Open Questions

Things that couldn't be fully resolved:

1. **Should history use stable keys?**
   - What we know: Currently uses index keys (`key={i}`), which is acceptable for append-only lists
   - What's unclear: Would timestamp/UUID keys improve reconciliation performance?
   - Recommendation: Keep index keys for now; history is append-only and lines are cheap to render

2. **Virtual scrolling for very long histories?**
   - What we know: Most terminal sessions have < 500 lines
   - What's unclear: At what point does virtualization become beneficial?
   - Recommendation: Skip for Phase 5; consider as Phase 6 enhancement if profiling shows need

3. **React Compiler configuration?**
   - What we know: Project uses React 19 but no Compiler config visible
   - What's unclear: Is Compiler enabled via Next.js config?
   - Recommendation: Proceed with manual memoization; works regardless of Compiler status

4. **InputLine should be memoized?**
   - What we know: Input changes on every keystroke, so props always change
   - What's unclear: Could useMemo for stable callbacks allow memoization?
   - Recommendation: Don't memoize InputLine; the cost of comparison outweighs benefit

## Sources

### Primary (HIGH confidence)
- [React memo documentation](https://react.dev/reference/react/memo) - Official API reference
- [React forwardRef documentation](https://react.dev/reference/react/forwardRef) - Ref forwarding patterns
- [React useImperativeHandle documentation](https://react.dev/reference/react/useImperativeHandle) - Imperative handles
- Existing codebase: `components/games/GameController.tsx` - forwardRef + useImperativeHandle pattern
- Existing codebase: `lib/context/TerminalContext.tsx` - Context composition pattern
- Existing codebase: `components/terminal.tsx` lines 1798-1983 - Current JSX structure

### Secondary (MEDIUM confidence)
- [React 19 Memoization](https://dev.to/joodi/react-19-memoization-is-usememo-usecallback-no-longer-necessary-3ifn) - Compiler impact on memoization
- [React Performance Optimization 2025](https://dev.to/alex_bobes/react-performance-optimization-15-best-practices-for-2025-17l9) - Current best practices
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro) - Keyboard event testing
- [Strapi React.memo Guide](https://strapi.io/blog/react-memo-optimize-functional-components-guide) - When to use memo

### Tertiary (LOW confidence)
- [react-terminal-component](https://github.com/rohanchandra/react-terminal-component) - Similar terminal architecture (not verified for React 19 compatibility)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using already-installed libraries, React 19 patterns verified
- Architecture: HIGH - Patterns mirror existing GameController and context composition
- Memoization: HIGH - React official docs + current community best practices
- Testing: HIGH - Matches established Vitest + testing-library patterns from Phases 1-4
- Pitfalls: MEDIUM - Based on common React patterns; mobile-specific issues need device testing

**Research date:** 2026-01-22
**Valid until:** 60 days (stable React patterns, internal codebase)
