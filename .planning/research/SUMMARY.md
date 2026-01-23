# Research Summary: Terminal Portfolio Refactor

**Research Date:** 2026-01-22

## Stack Recommendations

**Testing:** Vitest + @testing-library/react + happy-dom
- Vitest over Jest: ESM-native, 2-10x faster, zero-config TypeScript

**State Management:** Custom hooks (no external library)
- Terminal state is UI-local, no API calls
- Extract: useTerminalHistory, useGameState, useVFS, useTheme

**Canvas Optimization:**
- Convert Array collision detection to Set (O(n) → O(1))
- Consider Web Worker for AI if profiling shows need

**TypeScript:** Discriminated unions for GameState and FileContent to eliminate `any`

## Architecture Pattern

```
Terminal (orchestrator)
├── TerminalProvider (context)
│   ├── useTerminalHistory()
│   └── useGameState()
├── HistoryDisplay → TerminalLine
├── InputLine → CommandInput, Prompt
├── CommandExecutor → CommandRegistry
├── GameController → game modules
└── VFSProvider → useVFS()
```

**Key insight:** The complexity is in commands and games, not the shell. Extract game modules and command registry first.

## Build Order

1. **Foundation:** Types, VFS Provider (zero dependencies)
2. **Core Hooks:** useTerminalHistory, useGameState, useTheme (provide state)
3. **Games:** Individual modules + GameController (isolated complexity)
4. **Commands:** CommandRegistry + CommandExecutor (orchestration)
5. **UI:** HistoryDisplay, InputLine, SyntaxHighlighter (leaves)

## Critical Pitfalls to Avoid

1. **State Colocation** - Map dependencies BEFORE extracting, introduce Context first
2. **Feature Parity Drift** - Write characterization tests BEFORE refactoring
3. **Game Side Effects** - Return results, don't mutate parent state
4. **localStorage Compatibility** - Version storage format, test legacy
5. **Render Cycles** - Memoize components, colocate state

## Table Stakes vs Differentiators

**Table Stakes (Must Have):**
- Single responsibility components
- Custom hooks for logic
- Command registry pattern
- Typed component boundaries

**Differentiators (Enable Excellence):**
- Formal game state machine
- Testable command context
- Plugin architecture for commands

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Vitest over Jest | ESM-native, faster, better React 19 support |
| Custom hooks over Zustand | State is UI-local, no benefit from library |
| Set for collision | O(1) vs O(n), critical for Tron performance |
| Context over prop drilling | Terminal concerns are interconnected |

## Next Steps

1. Define requirements from this research
2. Create roadmap with phases matching build order
3. Start with Foundation phase (types + VFS context)

---
*Research complete: 2026-01-22*
