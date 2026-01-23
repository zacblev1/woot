# Technology Stack Recommendations

**Project:** Terminal Portfolio Refactor
**Research Date:** 2026-01-22
**Confidence:** HIGH

## Testing Framework

| Technology | Purpose | Confidence |
|------------|---------|------------|
| Vitest | Test runner, assertions | HIGH |
| @testing-library/react | Component testing | HIGH |
| @testing-library/user-event | Interaction simulation | HIGH |
| happy-dom | Fast DOM environment | MEDIUM |

**Why Vitest over Jest:**
- ESM-native (matches Next.js 15)
- 2-10x faster with Vite's transformation
- Zero-config TypeScript
- Better React 19 support

## State Management

**Recommendation: Custom Hooks (No External Library)**

The terminal has ~15 pieces of state that are UI-local with no API calls. Zustand/Jotai/Redux add complexity without benefit.

**Target hooks:**
```typescript
useTerminalHistory()  // history state + append methods
useGameState()        // game state machine
useVFS()              // filesystem operations
useTheme()            // theme + persistence
useFont()             // font + persistence
```

## Canvas Optimization

**Collision Detection (Critical):**
```typescript
// CURRENT: O(n) - slow
playerTrail.current.some(p => p.x === x && p.y === y)

// RECOMMENDED: O(1) - fast
const trailSet = useRef<Set<string>>(new Set())
trailSet.current.has(`${x},${y}`)
```

**AI Computation:** Consider Web Worker if profiling shows minimax blocking main thread.

## TypeScript Improvements

**Discriminated Unions for GameState:**
```typescript
type GameState =
  | { active: false; type: null }
  | { active: true; type: 'number'; data: NumberGameData }
  | { active: true; type: 'wordle'; data: WordleGameData }
  // ... etc
```

**Discriminated Unions for FileContent:**
```typescript
type FileContent =
  | { type: 'book'; data: Book }
  | { type: 'vinyl'; data: VinylRecord }
  | { type: 'hardware'; data: HardwareDevice }
```

## Installation

```bash
npm install -D vitest @vitest/coverage-v8 happy-dom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

## What NOT to Use

| Anti-Pattern | Reason |
|--------------|--------|
| Jest | Slower, ESM issues |
| Enzyme | Deprecated, no React 19 |
| Zustand/Jotai | Overkill for this scope |
| Pixi.js/Phaser | Massive overhead for simple grid |

---
*Stack research: 2026-01-22*
