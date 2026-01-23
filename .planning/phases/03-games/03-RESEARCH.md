# Phase 3: Games - Research

**Researched:** 2026-01-22
**Domain:** React game module extraction, pure function patterns, state machine integration
**Confidence:** HIGH

## Summary

This phase extracts 6 inline games (number, wordle, trivia, blackjack, rps, tron) from terminal.tsx into isolated modules. The existing infrastructure from Phase 2 provides `useGameState` hook with discriminated union types and `startGame`/`endGame`/`updateData` methods. The research confirms that the best approach is:

1. **Pure function game logic** - Each game's core logic as pure functions returning results (not mutating state)
2. **Thin React wrappers** - Components that connect pure logic to useGameState hook via callbacks
3. **GameController routing** - Central component that routes terminal input to the active game
4. **Set-based collision for Tron** - Replace O(n) array `.some()` with O(1) Set `.has()` lookups

**Primary recommendation:** Extract each game as a module with pure `handleInput(input, gameData) => GameResult` function plus thin component wrapper. Use callback pattern for results so games never directly mutate terminal state.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | Component framework | Already in project |
| TypeScript | 5.x | Type safety | Already in project, discriminated unions already defined |
| Vitest | 3.x | Testing | Already configured in project |
| @testing-library/react | 16.x | Component testing | Already configured |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/user-event | 14.x | Simulating user input | Integration tests for keyboard handling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure functions | XState/useStateMachine | Overkill - games are simple state machines already modeled with discriminated unions |
| Manual testing | Storybook | Future consideration, not needed for text-based games |

**Installation:**
No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
components/games/
├── index.ts                    # Barrel export
├── GameController.tsx          # Routes input to active game
├── types.ts                    # Game-specific result types
├── number-game/
│   ├── index.ts               # Export component and types
│   ├── NumberGame.tsx         # React wrapper component
│   └── logic.ts               # Pure game logic functions
├── wordle-game/
│   ├── index.ts
│   ├── WordleGame.tsx
│   ├── logic.ts
│   └── words.ts               # Word list data
├── trivia-game/
│   ├── index.ts
│   ├── TriviaGame.tsx
│   ├── logic.ts
│   └── questions.ts           # Question data
├── blackjack-game/
│   ├── index.ts
│   ├── BlackjackGame.tsx
│   └── logic.ts
├── rps-game/
│   ├── index.ts
│   ├── RPSGame.tsx
│   └── logic.ts
└── tron-game/
    ├── index.ts
    └── TronGame.tsx           # Already exists, needs collision optimization
```

### Pattern 1: Pure Function Game Logic
**What:** Separate game logic from React state management
**When to use:** All text-based games (number, wordle, trivia, blackjack, rps)
**Example:**
```typescript
// Source: React official docs on pure functions + project requirements

// lib/types/games.ts (already exists)
export interface NumberGameData {
  target: number
  attempts: number
  maxAttempts: number
  guesses: number[]
}

// components/games/number-game/logic.ts
export interface NumberGameResult {
  message: string | string[]
  isComplete: boolean
  data?: Partial<NumberGameData>  // Updates to game state
}

export function handleNumberInput(
  input: string,
  data: NumberGameData
): NumberGameResult {
  if (input.toLowerCase() === 'quit') {
    return {
      message: 'Game ended.',
      isComplete: true
    }
  }

  const num = parseInt(input, 10)
  if (isNaN(num)) {
    return {
      message: 'Please enter a valid number.',
      isComplete: false
    }
  }

  const newAttempts = data.attempts + 1

  if (num === data.target) {
    return {
      message: [
        `Correct! You got it in ${newAttempts} attempts.`,
        `The number was ${data.target}.`,
        ''
      ],
      isComplete: true
    }
  }

  const hint = num < data.target ? 'Too low.' : 'Too high.'
  return {
    message: `${hint} (Attempt ${newAttempts})`,
    isComplete: false,
    data: {
      attempts: newAttempts,
      guesses: [...data.guesses, num]
    }
  }
}

export function createInitialData(): NumberGameData {
  return {
    target: Math.floor(Math.random() * 100) + 1,
    attempts: 0,
    maxAttempts: 10,
    guesses: []
  }
}

export function getStartMessage(): string[] {
  return [
    '',
    'NUMBER GUESSING GAME',
    "I'm thinking of a number between 1 and 100.",
    "Type 'quit' to exit.",
    ''
  ]
}
```

### Pattern 2: GameController Routing
**What:** Central component that routes input to active game component
**When to use:** Terminal needs one entry point for game input handling
**Example:**
```typescript
// Source: React patterns for controlled components

// components/games/GameController.tsx
interface GameControllerProps {
  gameState: GameState
  onResult: (result: GameResult) => void
  onGameEnd: () => void
}

export function GameController({
  gameState,
  onResult,
  onGameEnd
}: GameControllerProps) {
  if (!gameState.active) return null

  switch (gameState.type) {
    case 'number':
      return (
        <NumberGame
          data={gameState.data}
          onResult={onResult}
          onEnd={onGameEnd}
        />
      )
    case 'wordle':
      return (
        <WordleGame
          data={gameState.data}
          onResult={onResult}
          onEnd={onGameEnd}
        />
      )
    // ... other games
    case 'tron':
      return <TronGame onExit={onGameEnd} />
    default:
      return null
  }
}
```

### Pattern 3: Callback Result Pattern
**What:** Games return results via callback instead of mutating state
**When to use:** All games - ensures games don't directly modify terminal history
**Example:**
```typescript
// Source: React official docs on lifting state up

// components/games/types.ts
export interface GameResult {
  output: string | string[]        // Lines to add to terminal
  outputType?: 'output' | 'error' | 'success' | 'wordle'
  updateData?: Partial<unknown>    // State updates for the game
  endGame?: boolean                // Should game end?
}

// components/games/number-game/NumberGame.tsx
interface NumberGameProps {
  data: NumberGameData
  onResult: (result: GameResult) => void
  onEnd: () => void
}

export function NumberGame({ data, onResult, onEnd }: NumberGameProps) {
  const handleInput = useCallback((input: string) => {
    const result = handleNumberInput(input, data)

    onResult({
      output: result.message,
      updateData: result.data,
      endGame: result.isComplete
    })

    if (result.isComplete) {
      onEnd()
    }
  }, [data, onResult, onEnd])

  // Return null - this is a "headless" component for text games
  // Terminal renders input/output, not the game component
  return null
}
```

### Pattern 4: Set-Based Collision Detection for Tron
**What:** Use Set for O(1) collision lookups instead of O(n) array iteration
**When to use:** Tron game trail collision detection
**Example:**
```typescript
// Source: MDN/JavaScript Set documentation + game perf patterns

// Current (O(n) - BAD):
if (playerTrail.current.some(p =>
  p.x === playerPos.current.x && p.y === playerPos.current.y
)) playerCrash = true

// Optimized (O(1) - GOOD):
// Store trails as Set of "x,y" strings
const playerTrailSet = useRef<Set<string>>(new Set())
const cpuTrailSet = useRef<Set<string>>(new Set())

// Add to set when moving
const key = `${pos.x},${pos.y}`
playerTrailSet.current.add(key)

// Check collision in O(1)
const playerKey = `${playerPos.current.x},${playerPos.current.y}`
if (playerTrailSet.current.has(playerKey)) playerCrash = true
if (cpuTrailSet.current.has(playerKey)) playerCrash = true
```

### Anti-Patterns to Avoid
- **Direct state mutation in games:** Games should NEVER call setHistory or setGameState directly. Use callbacks.
- **Logic mixed with rendering:** Keep game logic in separate `logic.ts` files, not in components.
- **Implicit state in closures:** Use discriminated union data types to make state explicit and type-safe.
- **Array.some() for repeated lookups:** Use Set for any collision/membership checking done every frame.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Game state types | New type definitions | lib/types/games.ts | Already defined with discriminated unions |
| Game state hook | New state management | useGameState from lib/hooks | Already implemented with proper typing |
| Event simulation in tests | Manual event dispatch | @testing-library/user-event | Handles browser inconsistencies |
| Word list management | Inline arrays | Separate data files | Easier to test and modify |

**Key insight:** Phase 2 already built the state management infrastructure. This phase is about extraction and separation of concerns, not rebuilding state management.

## Common Pitfalls

### Pitfall 1: Coupling Game Logic to React State
**What goes wrong:** Game functions directly call useState setters, making them untestable
**Why it happens:** Easier to write initially, refactoring feels unnecessary
**How to avoid:** Game logic functions must be pure - take data in, return result out. Zero side effects.
**Warning signs:** Functions that import React hooks, functions that don't return values

### Pitfall 2: Inconsistent Result Types
**What goes wrong:** Each game returns differently shaped results, making GameController complex
**Why it happens:** Games evolved independently, no shared contract
**How to avoid:** Define GameResult interface upfront, all games conform to it
**Warning signs:** Switch statements in GameController with different handling per game

### Pitfall 3: Testing Game Logic Through Components
**What goes wrong:** Tests mount full component, become slow and brittle
**Why it happens:** Seems easier than testing pure functions
**How to avoid:** Test logic.ts files directly with simple function calls. Component tests verify integration only.
**Warning signs:** Tests that render components just to test game logic

### Pitfall 4: Forgetting Tron is Different
**What goes wrong:** Try to make Tron fit the text-game pattern
**Why it happens:** Pattern consistency feels good
**How to avoid:** Tron is a canvas game, not text-based. It handles its own rendering. Only optimize collision detection.
**Warning signs:** Trying to add handleInput pattern to Tron

### Pitfall 5: O(n) Collision in Hot Path
**What goes wrong:** Tron becomes sluggish as trails grow
**Why it happens:** Array.some() is O(n) and runs every frame
**How to avoid:** Use Set with string keys for O(1) membership testing
**Warning signs:** Performance degradation late in Tron games

## Code Examples

Verified patterns from existing codebase and research:

### Complete Game Module Example (Number Game)
```typescript
// components/games/number-game/logic.ts
import type { NumberGameData } from '@/lib/types/games'

export interface NumberGameResult {
  message: string | string[]
  isComplete: boolean
  updatedData?: NumberGameData
}

export function createInitialData(): NumberGameData {
  return {
    target: Math.floor(Math.random() * 100) + 1,
    attempts: 0,
    maxAttempts: 10,
    guesses: []
  }
}

export function handleInput(
  input: string,
  data: NumberGameData
): NumberGameResult {
  const trimmed = input.trim().toLowerCase()

  if (trimmed === 'quit') {
    return { message: 'Game ended.', isComplete: true }
  }

  const num = parseInt(trimmed, 10)
  if (isNaN(num)) {
    return { message: 'Please enter a valid number.', isComplete: false }
  }

  const newData: NumberGameData = {
    ...data,
    attempts: data.attempts + 1,
    guesses: [...data.guesses, num]
  }

  if (num === data.target) {
    return {
      message: [
        `Correct! You got it in ${newData.attempts} attempts.`,
        `The number was ${data.target}.`,
        ''
      ],
      isComplete: true,
      updatedData: newData
    }
  }

  const hint = num < data.target ? 'Too low.' : 'Too high.'
  return {
    message: `${hint} (Attempt ${newData.attempts})`,
    isComplete: false,
    updatedData: newData
  }
}

export function getStartMessage(): string[] {
  return [
    '',
    'NUMBER GUESSING GAME',
    "I'm thinking of a number between 1 and 100.",
    "Type 'quit' to exit.",
    ''
  ]
}
```

### Unit Test Pattern for Game Logic
```typescript
// components/games/number-game/__tests__/logic.test.ts
import { describe, it, expect } from 'vitest'
import { handleInput, createInitialData, getStartMessage } from '../logic'

describe('number-game logic', () => {
  describe('createInitialData', () => {
    it('creates data with target between 1 and 100', () => {
      const data = createInitialData()
      expect(data.target).toBeGreaterThanOrEqual(1)
      expect(data.target).toBeLessThanOrEqual(100)
      expect(data.attempts).toBe(0)
      expect(data.guesses).toEqual([])
    })
  })

  describe('handleInput', () => {
    const baseData = { target: 50, attempts: 0, maxAttempts: 10, guesses: [] }

    it('returns quit message on "quit"', () => {
      const result = handleInput('quit', baseData)
      expect(result.isComplete).toBe(true)
      expect(result.message).toBe('Game ended.')
    })

    it('returns error for non-number input', () => {
      const result = handleInput('abc', baseData)
      expect(result.isComplete).toBe(false)
      expect(result.message).toContain('valid number')
    })

    it('returns "Too low" for guess below target', () => {
      const result = handleInput('25', baseData)
      expect(result.isComplete).toBe(false)
      expect(result.message).toContain('Too low')
      expect(result.updatedData?.attempts).toBe(1)
    })

    it('returns "Too high" for guess above target', () => {
      const result = handleInput('75', baseData)
      expect(result.isComplete).toBe(false)
      expect(result.message).toContain('Too high')
    })

    it('returns success on correct guess', () => {
      const result = handleInput('50', baseData)
      expect(result.isComplete).toBe(true)
      expect(result.message).toContain('Correct!')
    })
  })

  describe('getStartMessage', () => {
    it('returns array of intro strings', () => {
      const msg = getStartMessage()
      expect(Array.isArray(msg)).toBe(true)
      expect(msg.some(line => line.includes('NUMBER'))).toBe(true)
    })
  })
})
```

### Tron Set-Based Collision Test
```typescript
// components/games/tron-game/__tests__/collision.test.ts
import { describe, it, expect } from 'vitest'

describe('Tron collision detection with Set', () => {
  it('detects collision in O(1) with Set.has()', () => {
    const trailSet = new Set<string>()

    // Simulate trail building
    for (let i = 0; i < 1000; i++) {
      trailSet.add(`${i},50`)
    }

    // O(1) lookup
    expect(trailSet.has('500,50')).toBe(true)
    expect(trailSet.has('500,51')).toBe(false)
  })

  it('uses string keys for coordinate lookup', () => {
    const pos = { x: 10, y: 20 }
    const key = `${pos.x},${pos.y}`

    const trail = new Set(['10,20', '11,20', '12,20'])
    expect(trail.has(key)).toBe(true)
  })
})
```

### Integration Test Pattern
```typescript
// components/games/__tests__/GameController.integration.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameController } from '../GameController'

describe('GameController integration', () => {
  it('routes number game input and receives results', async () => {
    const onResult = vi.fn()
    const onGameEnd = vi.fn()

    const gameState = {
      active: true,
      type: 'number' as const,
      data: { target: 50, attempts: 0, maxAttempts: 10, guesses: [] }
    }

    // Note: For text games, we test the callback pattern
    // The component is "headless" - terminal handles UI
    const { rerender } = render(
      <GameController
        gameState={gameState}
        onResult={onResult}
        onGameEnd={onGameEnd}
      />
    )

    // Simulate terminal passing input to game
    // This would be done via a ref or imperative handle
    // Testing the integration with terminal is done at terminal level
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| XState for simple state | Discriminated unions + hooks | React 18+ | Simpler, fewer dependencies |
| Array.includes() for membership | Set.has() | Always (ES6) | O(1) vs O(n) performance |
| Inline game logic | Extracted pure functions | Best practice | Testable, maintainable |
| Mixed component/logic | Separated concerns | React 18+ patterns | Easier testing |

**Deprecated/outdated:**
- useReducer for simple game state: useState + discriminated unions is cleaner (per Phase 2 decision)
- Class-based game components: Function components with hooks are standard

## Open Questions

Things that couldn't be fully resolved:

1. **Wordle word validation**
   - What we know: Current implementation accepts any 5-letter string
   - What's unclear: Should we validate against a dictionary?
   - Recommendation: Keep current behavior for simplicity, note as future enhancement

2. **Trivia question source**
   - What we know: Questions are hardcoded in terminal.tsx
   - What's unclear: Should questions be in a data file vs inline?
   - Recommendation: Extract to data file like other collection data

3. **Tron AI integration with Set optimization**
   - What we know: AI uses minimax with flood-fill heuristic
   - What's unclear: Does AI already use Set internally? Should it share the trail Sets?
   - Recommendation: AI already creates its own Set (`obstacles`). Main game loop needs Set conversion.

## Sources

### Primary (HIGH confidence)
- Existing codebase: terminal.tsx (lines 897-1267) - current game implementations
- Existing codebase: lib/types/games.ts - discriminated union types
- Existing codebase: lib/hooks/useGameState.ts - state management hook
- [React official docs - Keeping Components Pure](https://react.dev/learn/keeping-components-pure)
- [MDN - 2D Collision Detection](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection)

### Secondary (MEDIUM confidence)
- [State Machines in React](https://mastery.games/post/state-machines-in-react/) - Pattern confirmation
- [Vitest Component Testing Guide](https://vitest.dev/guide/browser/component-testing) - Testing patterns
- [React Testing with Vitest](https://mayashavin.com/articles/test-react-components-with-vitest) - Test setup

### Tertiary (LOW confidence)
- [JavaScript Gauntlet Collision Detection](https://jakesgordon.com/writing/javascript-gauntlet-collision-detection/) - Notes that small arrays can be faster than Set (but our trails grow to 1000+ points)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project infrastructure
- Architecture: HIGH - Patterns verified against React official docs and existing codebase
- Pitfalls: HIGH - Derived from code analysis of current terminal.tsx
- Tron optimization: HIGH - Set O(1) is well-documented JavaScript behavior

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable domain, no external dependencies changing)
