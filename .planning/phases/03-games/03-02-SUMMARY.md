---
phase: 03
plan: 02
subsystem: games
tags: [wordle, pure-functions, testing, feedback-algorithm]
dependency-graph:
  requires: [03-01]
  provides: [wordle-game-module]
  affects: [03-05]
tech-stack:
  added: []
  patterns: [pure-function-game-logic, two-pass-matching-algorithm]
key-files:
  created:
    - components/games/wordle-game/words.ts
    - components/games/wordle-game/logic.ts
    - components/games/wordle-game/index.ts
    - components/games/wordle-game/__tests__/logic.test.ts
  modified: []
decisions:
  - id: wordle-two-pass
    choice: "Two-pass algorithm for feedback: first mark exact, then wrong-position"
    rationale: "Handles duplicate letters correctly - exact matches consume letters before wrong-position"
  - id: wordle-output-format
    choice: "Feedback format: 'X:A,?:B, :C' (mark:letter pairs)"
    rationale: "Matches existing terminal.tsx format for colored rendering"
metrics:
  duration: 4 min
  completed: 2026-01-23
---

# Phase 3 Plan 2: Wordle Game Extraction Summary

**One-liner:** Pure function Wordle module with two-pass feedback algorithm handling duplicate letters correctly

## What Was Done

### Task 1: Extract Wordle word list and create game logic

Created the wordle-game module with three files:

1. **words.ts** - 50-word list extracted from terminal.tsx
   - All 5-letter lowercase words
   - Exported as `const` array for type safety
   - Type `WordleWord` for individual word type

2. **logic.ts** - Pure function game logic
   - `createInitialData()` - picks random word, initializes state
   - `getStartMessage()` - returns intro text matching terminal.tsx
   - `handleInput(input, data)` - processes guesses and returns GameResult
   - `processGuess()` - internal function implementing feedback algorithm

3. **index.ts** - Barrel export for clean imports

**Feedback Algorithm Implementation:**

The algorithm uses a two-pass approach to handle duplicate letters correctly:

```typescript
// First pass: mark exact matches (X), track used positions
for (let i = 0; i < 5; i++) {
  if (guessArr[i] === wordArr[i]) {
    marks[i] = 'X'
    used[i] = true
  }
}

// Second pass: mark wrong-position (?) for remaining letters
for (let i = 0; i < 5; i++) {
  if (marks[i] !== 'X') {
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessArr[i] === wordArr[j]) {
        marks[i] = '?'
        used[j] = true
        break
      }
    }
  }
}
```

This ensures that if a guess has duplicate letters but the target has fewer, only the appropriate number get marked.

### Task 2: Create comprehensive Wordle tests

Created 41 tests covering:

1. **Word list validation** (4 tests)
   - Non-empty array
   - All words exactly 5 letters
   - All words lowercase
   - All words alphabetic only

2. **createInitialData** (7 tests)
   - Valid structure with all required fields
   - Target word from WORDLE_WORDS
   - Correct initial values (attempts=0, maxAttempts=6)
   - Random word selection with Math.random mock

3. **getStartMessage** (6 tests)
   - Returns array with WORDLE title
   - Contains GREEN/YELLOW/GRAY color legend
   - Contains quit instruction

4. **Input validation** (10 tests)
   - Quit command (case-insensitive, with whitespace)
   - Length validation (too short, too long)
   - Character validation (numbers, special chars rejected)
   - Case-insensitive guess processing

5. **Feedback algorithm** (6 tests)
   - Exact matches marked with X
   - No matches marked with space
   - Wrong position marked with ?
   - Duplicate letter handling (target has one, guess has many)
   - Duplicate letter handling (target has many)
   - Mixed case input normalization

6. **Game flow** (8 tests)
   - Win condition and success message
   - Loss condition and game over message
   - Attempt counting
   - Guesses remaining display
   - State updates in updatedData

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 290d1e6 | feat | Extract wordle game as pure function module |
| f9b8a4a | test | Add comprehensive wordle game tests (41 tests) |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Two-pass algorithm for feedback**
   - First pass marks exact matches and marks those positions as "used"
   - Second pass marks wrong-position matches for remaining letters
   - This correctly handles duplicate letters in both guess and target

2. **Output format preserved**
   - Format: `"X:A,?:B, :C,X:D, :E"` (mark:letter pairs, comma-separated)
   - Letters output in uppercase for display
   - Matches existing terminal.tsx format exactly

3. **Type-safe helper functions in tests**
   - Created `getOutputArray()`, `findWordleOutput()`, `outputContainsString()` helpers
   - Handles union type `string | string[] | (string | GameResultItem)[]` safely
   - Avoids TypeScript errors from calling array methods on potential string

## Verification

- `npm test -- --run components/games/wordle-game`: 41 tests pass
- `npm test -- --run components/games`: 179 total game tests pass
- `npx tsc --noEmit`: No new errors (pre-existing tron-game.tsx error unrelated)

## Files Created

```
components/games/wordle-game/
  words.ts        - 50-word constant array
  logic.ts        - createInitialData, getStartMessage, handleInput
  index.ts        - barrel export
  __tests__/
    logic.test.ts - 41 comprehensive tests
```

## Next Phase Readiness

Ready for:
- 03-03 (Complex Games) or 03-05 (GameController) if those haven't been done
- Integration with terminal.tsx to use new module

No blockers identified.
