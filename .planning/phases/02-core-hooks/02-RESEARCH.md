# Phase 2: Core Hooks - Research

**Researched:** 2026-01-22
**Domain:** React Custom Hooks, State Machines, Context Composition, Testing
**Confidence:** HIGH

## Summary

This phase extracts terminal state management from the monolithic Terminal component into reusable, testable hooks. The research covers four core hooks (`useTerminalHistory`, `useGameState`, `useTheme`, `useFont`) and a `TerminalProvider` context that composes them.

The established patterns for React hook design favor:
1. **Discriminated unions** for state machines (already implemented in Phase 1 types)
2. **useReducer** for complex state with interdependent transitions
3. **useState** with localStorage sync for simple preference state
4. **Context composition** via a single provider that uses hooks internally

**Primary recommendation:** Extract hooks using the existing VFSProvider pattern as a template. Use `useState` for history and preferences hooks (simple state), reserve `useReducer` only if game state transitions require it. Test all hooks with `renderHook` from `@testing-library/react`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | Hooks foundation | Already in project |
| @testing-library/react | 16+ | Hook testing via renderHook | Official RTL approach for React 18+ |
| Vitest | 2.x | Test runner | Already configured in Phase 1 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/jest-dom | 6.x | DOM assertions | Already installed |
| happy-dom | configured | Test environment | Already in vitest.config.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useState for game state | useReducer | Only needed if action dispatch pattern cleaner; current discriminated union works with useState |
| Custom localStorage hook | useSyncExternalStore | overkill for simple SSR-safe pattern; useEffect mount pattern sufficient |
| XState for game state | Native React state | XState adds dependency; simple state machine fits in ~50 lines |

**Installation:**
```bash
# No new dependencies needed - all already installed
npm install  # Existing dependencies sufficient
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── hooks/
│   ├── index.ts              # Re-exports all hooks
│   ├── useTerminalHistory.ts # Command history management
│   ├── useGameState.ts       # Game state machine
│   ├── useTheme.ts           # Theme with localStorage
│   ├── useFont.ts            # Font with localStorage
│   └── __tests__/
│       ├── useTerminalHistory.test.ts
│       ├── useGameState.test.ts
│       ├── useTheme.test.ts
│       └── useFont.test.ts
├── context/
│   ├── TerminalContext.tsx   # Composes all terminal hooks
│   └── __tests__/
│       └── TerminalContext.test.tsx
```

### Pattern 1: useTerminalHistory Hook

**What:** Manages command history array with navigation (up/down arrows), add, and clear operations.
**When to use:** Any component needing access to terminal command history.

**API Design:**
```typescript
// Source: Derived from existing terminal.tsx lines 669-670, 1708-1709, 1769-1786
interface UseTerminalHistoryReturn {
  // State
  history: string[]           // List of past commands
  historyIndex: number        // Current position (-1 = not navigating)

  // Actions
  add: (command: string) => void      // Add command, reset index
  clear: () => void                   // Clear all history
  navigateUp: () => string | null     // Go back in history, return command or null
  navigateDown: () => string | null   // Go forward in history, return command or null
  resetNavigation: () => void         // Reset index to -1
}

function useTerminalHistory(): UseTerminalHistoryReturn {
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const add = useCallback((command: string) => {
    setHistory(prev => [...prev, command])
    setHistoryIndex(-1)
  }, [])

  const navigateUp = useCallback(() => {
    if (history.length === 0) return null
    const newIndex = historyIndex === -1
      ? history.length - 1
      : Math.max(0, historyIndex - 1)
    setHistoryIndex(newIndex)
    return history[newIndex]
  }, [history, historyIndex])

  const navigateDown = useCallback(() => {
    if (historyIndex === -1) return null
    const newIndex = historyIndex + 1
    if (newIndex >= history.length) {
      setHistoryIndex(-1)
      return null
    }
    setHistoryIndex(newIndex)
    return history[newIndex]
  }, [history, historyIndex])

  // ... clear, resetNavigation
}
```

### Pattern 2: useGameState Hook - State Machine

**What:** Manages game lifecycle using discriminated union from Phase 1 types.
**When to use:** Starting, playing, and ending games.

**API Design:**
```typescript
// Source: Uses GameState from lib/types/games.ts
interface UseGameStateReturn {
  // State
  gameState: GameState
  isPlaying: boolean          // Convenience: gameState.active
  currentGame: GameType | null // Convenience: gameState.type

  // Actions
  startGame: <T extends GameType>(type: T, initialData: GameDataForType<T>) => void
  endGame: () => void
  updateData: (updater: (current: GameData) => GameData) => void
}

// State transitions:
// { active: false, type: null, data: null } -- startGame --> { active: true, type: T, data: D }
// { active: true, type: T, data: D } -- endGame --> { active: false, type: null, data: null }
// { active: true, type: T, data: D } -- updateData --> { active: true, type: T, data: D' }
```

**State Machine Implementation:**
```typescript
// Using useState (simpler, works with discriminated union)
function useGameState(): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState>(createInactiveGameState())

  const startGame = useCallback(<T extends GameType>(
    type: T,
    initialData: GameDataForType<T>
  ) => {
    setGameState({ active: true, type, data: initialData })
  }, [])

  const endGame = useCallback(() => {
    setGameState(createInactiveGameState())
  }, [])

  const updateData = useCallback((updater: (current: any) => any) => {
    setGameState(prev => {
      if (!prev.active) return prev
      return { ...prev, data: updater(prev.data) }
    })
  }, [])

  return {
    gameState,
    isPlaying: gameState.active,
    currentGame: gameState.active ? gameState.type : null,
    startGame,
    endGame,
    updateData,
  }
}
```

### Pattern 3: useTheme/useFont Hooks - localStorage Persistence

**What:** Theme/font preference with SSR-safe localStorage sync.
**When to use:** Any component that reads or sets terminal appearance.

**API Design:**
```typescript
// Source: Derived from terminal.tsx lines 774-802
interface UseThemeReturn {
  theme: ThemeName
  themeConfig: ThemeColors
  setTheme: (name: ThemeName) => void
  availableThemes: ThemeName[]
}

interface UseFontReturn {
  font: FontName
  fontConfig: FontConfig
  setFont: (name: FontName) => void
  availableFonts: FontName[]
}
```

**SSR-Safe localStorage Pattern:**
```typescript
// Source: https://www.nico.fyi/blog/ssr-friendly-local-storage-react-custom-hook
const STORAGE_KEY = 'terminal-theme'
const DEFAULT_THEME: ThemeName = 'lumon'

function useTheme(): UseThemeReturn {
  // Initialize with default (SSR-safe)
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME)

  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && isValidTheme(saved)) {
      setThemeState(saved as ThemeName)
      applyTheme(saved as ThemeName)
    }
  }, [])

  // Setter: update state + localStorage + apply CSS
  const setTheme = useCallback((name: ThemeName) => {
    if (!isValidTheme(name)) return
    setThemeState(name)
    localStorage.setItem(STORAGE_KEY, name)
    applyTheme(name)
  }, [])

  return {
    theme,
    themeConfig: THEMES[theme],
    setTheme,
    availableThemes: Object.keys(THEMES) as ThemeName[],
  }
}

// Validation helper (protects against corrupted localStorage)
function isValidTheme(name: string): name is ThemeName {
  return name in THEMES
}
```

### Pattern 4: TerminalProvider Composition

**What:** Single provider that composes all terminal hooks, exposing them via context.
**When to use:** Wrap terminal component tree once at the top.

**Composition Pattern:**
```typescript
// Source: https://kentcdodds.com/blog/how-to-use-react-context-effectively
interface TerminalContextValue {
  // History
  history: UseTerminalHistoryReturn
  // Game
  game: UseGameStateReturn
  // Appearance
  theme: UseThemeReturn
  font: UseFontReturn
}

const TerminalContext = createContext<TerminalContextValue | undefined>(undefined)

export function TerminalProvider({ children }: { children: ReactNode }) {
  // Use hooks internally - single source of truth
  const history = useTerminalHistory()
  const game = useGameState()
  const theme = useTheme()
  const font = useFont()

  // Memoize to prevent unnecessary re-renders
  const value = useMemo(() => ({
    history,
    game,
    theme,
    font,
  }), [history, game, theme, font])

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  )
}

export function useTerminal(): TerminalContextValue {
  const context = useContext(TerminalContext)
  if (!context) {
    throw new Error('useTerminal must be used within TerminalProvider')
  }
  return context
}
```

### Anti-Patterns to Avoid

- **Separate providers per hook:** Creates provider nesting hell, harder to coordinate state
- **Reading localStorage on every render:** Causes hydration mismatches, use useEffect
- **Mutable state outside React:** Lose reactivity, harder to test
- **Skipping validation on localStorage read:** Corrupted data crashes the app

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hook testing harness | Custom render wrapper | renderHook from @testing-library/react | Already handles act(), cleanup, rerender |
| localStorage sync | Custom useEffect logic | Established pattern (see above) | SSR edge cases, validation, initial state |
| State machine library | XState integration | useState + discriminated union | Simpler for this use case, no new deps |

**Key insight:** The Phase 1 types (GameState discriminated union) already provide type-safe state machines. No runtime library needed.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch with localStorage

**What goes wrong:** Server renders with default value, client renders with localStorage value, React warns.
**Why it happens:** localStorage isn't available during SSR.
**How to avoid:**
- Initialize useState with default value
- Read localStorage in useEffect (only runs client-side)
- Apply theme/font in same useEffect
**Warning signs:** Console warning about hydration mismatch on page load.

### Pitfall 2: Stale Closure in navigateUp/navigateDown

**What goes wrong:** historyIndex or history captured at wrong time, navigation returns wrong command.
**Why it happens:** useCallback dependencies not correctly specified.
**How to avoid:** Include `[history, historyIndex]` in dependency arrays.
**Warning signs:** Pressing up arrow returns unexpected command after adding new ones.

### Pitfall 3: Context Value Changing Every Render

**What goes wrong:** All context consumers re-render even when their slice didn't change.
**Why it happens:** Creating new object literal in provider on every render.
**How to avoid:** Wrap value in useMemo with correct dependencies.
**Warning signs:** Performance issues, unnecessary re-renders visible in React DevTools.

### Pitfall 4: Testing Hooks Without Wrapper

**What goes wrong:** Hook throws "must be used within Provider" error.
**Why it happens:** renderHook doesn't automatically wrap with providers.
**How to avoid:** Pass wrapper option to renderHook with providers.
**Warning signs:** Tests fail with context error even when hook logic is correct.

## Code Examples

Verified patterns from official sources:

### Testing Hooks with renderHook

```typescript
// Source: https://testing-library.com/docs/react-testing-library/api/
import { renderHook, act } from '@testing-library/react'
import { useTerminalHistory } from './useTerminalHistory'

describe('useTerminalHistory', () => {
  it('adds commands to history', () => {
    const { result } = renderHook(() => useTerminalHistory())

    act(() => {
      result.current.add('ls')
      result.current.add('cd books')
    })

    expect(result.current.history).toEqual(['ls', 'cd books'])
    expect(result.current.historyIndex).toBe(-1)
  })

  it('navigates up through history', () => {
    const { result } = renderHook(() => useTerminalHistory())

    act(() => {
      result.current.add('ls')
      result.current.add('pwd')
    })

    let command: string | null = null
    act(() => {
      command = result.current.navigateUp()
    })

    expect(command).toBe('pwd')
    expect(result.current.historyIndex).toBe(1)
  })
})
```

### Testing Hooks That Need Context

```typescript
// Source: renderHook wrapper option
import { renderHook, act } from '@testing-library/react'
import { TerminalProvider, useTerminal } from './TerminalContext'

describe('useTerminal', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TerminalProvider>{children}</TerminalProvider>
  )

  it('provides terminal context', () => {
    const { result } = renderHook(() => useTerminal(), { wrapper })

    expect(result.current.theme.theme).toBe('lumon')
    expect(result.current.game.isPlaying).toBe(false)
  })
})
```

### Testing localStorage Persistence

```typescript
// Source: VFSContext.test.tsx pattern
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useTheme', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('persists theme to localStorage on change', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dracula')
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'terminal-theme',
      'dracula'
    )
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @testing-library/react-hooks | renderHook in @testing-library/react | React 18 (2022) | No separate package needed |
| Boolean flags for game state | Discriminated unions | TypeScript best practice | Impossible states become unrepresentable |
| Nested context providers | Single composed provider | Kent C. Dodds pattern | Simpler tree, easier testing |

**Deprecated/outdated:**
- @testing-library/react-hooks: Merged into main package, still works but unnecessary
- act() from react-dom/test-utils: Use act from @testing-library/react instead

## Open Questions

Things that couldn't be fully resolved:

1. **History persistence to localStorage?**
   - What we know: Currently history is session-only (lost on refresh)
   - What's unclear: Should history persist across sessions?
   - Recommendation: Keep session-only for Phase 2, add persistence as enhancement later

2. **History size limit?**
   - What we know: Current implementation has no limit
   - What's unclear: What's a reasonable max? 100? 500?
   - Recommendation: Add optional maxSize parameter with sensible default (100)

3. **Theme/font CSS application timing**
   - What we know: useEffect runs after paint, may cause flash
   - What's unclear: Is flash noticeable in practice?
   - Recommendation: Test with real usage; consider useLayoutEffect if flash is visible

## Sources

### Primary (HIGH confidence)
- Testing Library API docs - renderHook, act(), wrapper pattern
- React docs - reusing logic with custom hooks
- Kent C. Dodds - React Context effectively pattern

### Secondary (MEDIUM confidence)
- Next.js hydration error docs - SSR localStorage pattern
- Ben Ilegbodu - Type-checking useReducer in TypeScript

### Tertiary (LOW confidence)
- Various Medium articles on hook patterns - cross-verified with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using already-installed libraries
- Architecture: HIGH - Pattern based on existing VFSContext.tsx
- Pitfalls: HIGH - Derived from actual terminal.tsx implementation
- Testing approach: HIGH - Matches Phase 1 test patterns

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (stable React patterns, 30 days)
