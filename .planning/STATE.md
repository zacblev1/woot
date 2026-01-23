# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** A maintainable, testable, performant terminal codebase that preserves all existing functionality while eliminating technical debt.
**Current focus:** Phase 4 - Commands (In progress)

## Current Position

Phase: 4 of 6 (Commands)
Plan: 6 of 7 in current phase (04-04 completed)
Status: In progress
Last activity: 2026-01-23 - Completed 04-04-PLAN.md (Collection Commands)

Progress: [███████████████████] 98%

## Performance Metrics

**Velocity:**
- Total plans completed: 19
- Average duration: 2.9 min
- Total execution time: 56 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4 | 18 min | 4.5 min |
| 02-core-hooks | 4 | 9 min | 2.3 min |
| 03-games | 5 | 16 min | 3.2 min |
| 04-commands | 6 | 15 min | 2.5 min |

**Recent Trend:**
- Last 5 plans: 04-04 (4min), 04-06 (3min), 04-05 (2min), 04-03 (2min), 04-02 (2min)
- Trend: Stable (fast execution)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Research]: Full rewrite over incremental refactoring
- [Research]: Vitest over Jest for testing
- [Research]: Test as we build, characterization tests first
- [Research]: Keep localStorage over IndexedDB
- [01-02]: GameState uses active+type+data discriminated union pattern
- [01-02]: FileContent uses type+data discriminated union for book/vinyl/hardware/text/empty
- [01-02]: Type guards exported alongside interfaces for safe narrowing
- [01-03]: React Context with useState initializer for VFS instance
- [01-03]: Provide useVFSOptional alongside useVFS for flexibility
- [01-03]: Persist to localStorage only on mutations (mkdir, touch, rm)
- [01-04]: Characterization tests document actual behavior, not expected
- [01-04]: mkdir requires parent to exist (nested path creation is manual)
- [02-01]: historyIndex -1 means "not navigating" (at present)
- [02-01]: navigateUp starts at most recent (length-1) not oldest
- [02-01]: Skip empty/whitespace commands in add()
- [02-02]: useState with discriminated union over useReducer for game state
- [02-03]: applyTheme/applyFont called in both mount useEffect and setters
- [02-04]: Single composed provider over separate providers per hook
- [02-04]: useMemo for context value with all 4 hook returns as deps
- [03-04]: Keep Point[] arrays for rendering, use Set<string> only for collision lookups
- [03-04]: Use 'x,y' string format as Set keys for coordinate hashing
- [03-01]: GameResult.output supports string | string[] | (string | GameResultItem)[] for flexibility
- [03-01]: Pure function pattern: handleInput(input, data) => GameResult
- [03-01]: Mock Math.random for deterministic game outcome testing
- [03-02]: Two-pass algorithm for Wordle feedback (exact matches first, then wrong-position)
- [03-02]: Wordle feedback format: "X:A,?:B, :C" (mark:letter pairs, comma-separated)
- [03-03]: Trivia uses simple q/a format, not TriviaGameData from types
- [03-03]: Blackjack Card has display string for terminal output
- [03-03]: Ace reduction iterates while bust, matching original terminal.tsx
- [03-05]: Use forwardRef + useImperativeHandle for imperative handleInput method
- [03-05]: Namespace exports (numberGame, wordleGame) over individual function exports
- [03-05]: Cast through unknown for Trivia/Blackjack data type mismatches
- [04-01]: ExecuteContext extends CommandContext with game.isActive(), theme/font.list() and .config()
- [04-01]: Collections included in context for search/genre/format/type commands
- [04-01]: success() and error() helpers for consistent result creation
- [04-02]: ls returns array with blank line padding for non-empty directories
- [04-02]: cd with no args defaults to ~ (home directory)
- [04-02]: view formats content based on pwd path matching /books, /vinyl, /hardware
- [04-05]: contactCommand returns TerminalLine[] with type: 'link' and href for clickable links
- [04-05]: projectsCommand uses context.openUrl to open URLs in new tab
- [04-05]: theme/font commands use context methods (list, config, set) instead of direct imports
- [04-05]: neofetchCommand uses context.collections for collection counts
- [04-06]: man pages extracted as static data, not generated
- [04-06]: clear adds welcome message after clearing history
- [04-06]: exit shows keyboard shortcut rather than closing

### Phase 1 Deliverables

- Vitest + React Testing Library + jest-dom configured
- TypeScript types with discriminated unions (lib/types/)
- VFSProvider context (lib/context/)
- 110 characterization tests passing
- VFS: 91.6% coverage

### Phase 2 Deliverables (Complete)

- useTerminalHistory hook with 100% coverage (lib/hooks/)
- useGameState hook with 100% coverage (lib/hooks/)
- useTheme hook with 100% coverage (lib/hooks/)
- useFont hook with 100% coverage (lib/hooks/)
- TerminalProvider composing all hooks (lib/context/)
- Theme/font data extracted to lib/data/
- Hook testing patterns established (renderHook + act)
- 128 tests passing across hooks and contexts

### Phase 3 Deliverables (Complete)

- GameResult interface for all game modules
- Number game pure function module (handleInput, createInitialData, getStartMessage) - 38 tests
- RPS game pure function module (handleInput, createInitialData, getStartMessage) - 39 tests
- Wordle game pure function module with two-pass feedback algorithm - 41 tests
- Trivia game pure function module with questions data file - 19 tests
- Blackjack game pure function module with ace reduction - 35 tests
- Tron collision detection optimized to O(1) with Set.has() - 7 tests
- GameController component with forwardRef + useImperativeHandle - 11 tests
- Barrel exports for clean API (import { GameController, numberGame } from '@/components/games')
- Integration tests for full game flows - 35 tests
- **225 game tests passing**

### Phase 4 Deliverables (In Progress)

- ExecuteContext interface for command dependencies
- CommandDefinition interface for command structure
- CommandRegistry class with register/get/has/list/getAll
- executeCommand function for parsing and delegation
- success() and error() helper functions
- Navigation commands: ls, cd, pwd, cat, view (lib/commands/commands/navigation.ts)
- mkdirCommand, touchCommand, rmCommand filesystem commands
- Info commands: about, contact, projects, whoami, date (lib/commands/commands/info.ts)
- Style commands: theme, font, neofetch (lib/commands/commands/style.ts)
- System commands: help, man, clear, echo, exit, sudo (lib/commands/commands/system.ts)
- Man pages data for 24 commands (lib/commands/man-pages.ts)
- Collection commands: search, genre, format, type (lib/commands/commands/collection.ts)
- 184 tests passing for commands (registry: 17, executor: 15, navigation: 33, filesystem: 15, info: 16, style: 23, system: 21, collection: 44)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-23
Stopped at: Completed 04-04-PLAN.md (Collection Commands)
Resume file: None
Next: Phase 4 - Commands (04-07-PLAN.md - Command Registry Integration)
