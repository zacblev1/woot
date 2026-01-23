# Feature Landscape: React Terminal Architecture

**Domain:** React terminal emulator decomposition
**Researched:** 2026-01-22
**Confidence:** HIGH

## Table Stakes (Must Have)

| Pattern | Why Expected | Current State |
|---------|--------------|---------------|
| Single Responsibility Components | Each does one thing | MISSING - all in terminal.tsx |
| Custom Hooks for Logic | Separates logic from rendering | MISSING - logic inline |
| Command Registry Pattern | Commands as data | PARTIAL - object exists but inline |
| Typed Props/State | TypeScript interfaces | PARTIAL - some exist |
| Event Handler Separation | Keyboard in dedicated hooks | MISSING - inline |

### Target Decomposition

```
components/terminal/
  Terminal.tsx           # Orchestrator (~100 lines)
  TerminalInput.tsx      # Prompt + input field
  TerminalOutput.tsx     # History rendering
  TerminalLine.tsx       # Single line rendering

hooks/
  useCommandHistory.ts   # Arrow key navigation
  useTabCompletion.ts    # Completion logic
  useTerminalState.ts    # Output history
  useKeyboardShortcuts.ts
  useTheme.ts
  useFont.ts
```

## Differentiators (Enable Excellence)

| Pattern | Value | Complexity |
|---------|-------|------------|
| Game State Machine | Impossible states become impossible | High |
| Testable Command Context | Unit test commands without UI | Low |
| Plugin Architecture | Add commands without core changes | Medium |

### Game State Machine

Replace ad-hoc string comparisons with formal state machine:
```typescript
type GameEvent =
  | { type: 'START'; game: GameType }
  | { type: 'INPUT'; value: string }
  | { type: 'QUIT' }

function gameReducer(state: GameState, event: GameEvent): GameState
```

### Testable Command Context

Commands receive injectable dependencies:
```typescript
export function ls(ctx: CommandContext, args: string[]): CommandResult {
  return ctx.vfs.ls(args[0])
}

// Test without mounting component
test('ls lists files', () => {
  const mockVfs = createMockVfs({ files: ['a', 'b'] })
  expect(ls({ vfs: mockVfs }, [])).toEqual(['a', 'b'])
})
```

## Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Do Instead |
|--------------|---------|------------|
| Over-decomposition | 50 tiny components worse than 1 large | Group by feature |
| Prop Drilling | 5+ levels of pass-through | Use Context |
| Breaking Input Focus | Cursor jumps on re-render | Stable component identity |
| Recreating Large Objects | Commands recreated each render | Module-level or useMemo |

## Build Priority

1. **P0:** Hook extraction, type boundaries
2. **P1:** Component separation, command registry, game extraction
3. **P2:** Testable context, game state machine
4. **P3:** Plugin architecture

---
*Features research: 2026-01-22*
