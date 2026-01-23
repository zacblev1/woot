---
phase: 05-ui-components
plan: 01
subsystem: terminal-display
tags: [react, syntax-highlighting, memoization, terminal]

dependency-graph:
  requires:
    - "lib/types/terminal.ts (TerminalLine, TerminalLineType)"
  provides:
    - "TerminalLine component"
    - "SyntaxHighlighter functions"
    - "Token types for input highlighting"
  affects:
    - "05-02: HistoryDisplay"
    - "05-03: InputLine"
    - "05-04: Terminal orchestrator"

tech-stack:
  added: []
  patterns:
    - "React.memo for performance optimization"
    - "Pure functions for tokenization and highlighting"
    - "Const array exports for command/keyword lists"

key-files:
  created:
    - "components/terminal/types.ts"
    - "components/terminal/SyntaxHighlighter.tsx"
    - "components/terminal/TerminalLine.tsx"
    - "components/terminal/index.ts"
    - "components/terminal/__tests__/TerminalLine.test.tsx"
  modified: []

decisions:
  - id: "05-01-01"
    decision: "Extract VALID_COMMANDS and HEADER_KEYWORDS as const arrays"
    rationale: "Enables reuse across SyntaxHighlighter and future components"

metrics:
  duration: "4 min"
  completed: "2026-01-23"
  tests:
    written: 47
    passed: 47
    coverage: "Full coverage of tokenization and line rendering"
---

# Phase 5 Plan 01: TerminalLine & SyntaxHighlighter Summary

**One-liner:** Memoized TerminalLine component with pure tokenization/highlighting functions extracted from terminal.tsx.

## What Was Built

### 1. Terminal Component Types (`components/terminal/types.ts`)
- `TokenType` union: 'command' | 'invalid' | 'path' | 'string' | 'flag' | 'number' | 'argument' | 'space' | 'text'
- `Token` interface with type and value
- `TerminalLineProps` interface for component props
- `VALID_COMMANDS` const array (27 commands)
- `HEADER_KEYWORDS` const array (16 keywords for man pages/help)

### 2. SyntaxHighlighter (`components/terminal/SyntaxHighlighter.tsx`)
Four pure functions extracted from terminal.tsx:
- `tokenizeInput(input, validCommands)` - Tokenizes command line input with type detection
- `renderTokens(tokens)` - Maps tokens to colored React spans
- `highlightInput(text)` - Highlights "~/path $ command args" format
- `highlightLine(text)` - Highlights output lines (headers, labels, paths, arguments)

### 3. TerminalLine Component (`components/terminal/TerminalLine.tsx`)
- Memoized with `React.memo` for performance
- Handles all 6 line types: input, output, error, success, link, wordle
- Delegates to `highlightInput` for input lines
- Delegates to `highlightLine` for output lines
- Special rendering for wordle feedback (colored letters)
- Link rendering with proper target/rel attributes

### 4. Barrel Export (`components/terminal/index.ts`)
```typescript
export { TerminalLine } from './TerminalLine'
export { tokenizeInput, renderTokens, highlightInput, highlightLine } from './SyntaxHighlighter'
export type { Token, TokenType, TerminalLineProps } from './types'
export { VALID_COMMANDS, HEADER_KEYWORDS } from './types'
```

## Test Coverage

47 tests covering:
- `tokenizeInput`: 14 tests (empty, valid/invalid commands, paths, flags, numbers, strings, complex inputs)
- `renderTokens`: 8 tests (all token type styling)
- `highlightInput`: 5 tests (prompts, valid/invalid commands, arguments)
- `highlightLine`: 10 tests (headers, labels, paths, arguments, edge cases)
- `TerminalLine component`: 8 tests (all 6 line types, base styling)
- `constants`: 2 tests (export verification)

## Commits

| Hash | Message |
|------|---------|
| 16729a7 | feat(05-01): add terminal types and SyntaxHighlighter |
| 281ddf3 | feat(05-01): add memoized TerminalLine component |
| d8973f6 | test(05-01): add TerminalLine tests and barrel export |

## Key Patterns Established

1. **Pure Function Extraction**: Highlighting logic as pure functions enables testing without React rendering
2. **Memoization Strategy**: Only memoize TerminalLine (content rarely changes), not InputLine (changes every keystroke)
3. **Const Array Exports**: VALID_COMMANDS/HEADER_KEYWORDS exported for reuse

## Deviations from Plan

None - plan executed exactly as written.

## Integration Notes

TerminalLine is ready for use in HistoryDisplay (05-02):
```tsx
import { TerminalLine } from '@/components/terminal'

{history.map((line, i) => (
  <TerminalLine key={i} line={line} />
))}
```

## Next Phase Readiness

- HistoryDisplay (05-02) can now use TerminalLine for rendering
- SyntaxHighlighter functions available for InputLine highlighting (05-03)
- No blockers for continuing Phase 5
