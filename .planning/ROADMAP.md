# Roadmap: Terminal Portfolio Refactor

## Overview

This roadmap transforms a 2000-line monolithic terminal component into a modular, testable architecture while preserving all existing functionality. The approach is full rewrite with characterization tests capturing current behavior before any extraction begins. Each phase delivers independently verifiable capabilities, building from foundation (types, testing) through core logic (hooks, games, commands) to final cleanup.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Types, VFS context, Vitest setup, characterization tests
- [ ] **Phase 2: Core Hooks** - Extract state management into reusable hooks
- [ ] **Phase 3: Games** - Extract 6 game modules with proper state isolation
- [ ] **Phase 4: Commands** - CommandRegistry and CommandExecutor architecture
- [ ] **Phase 5: UI Components** - Display components with memoization
- [ ] **Phase 6: Cleanup** - Remove dead code, verify final architecture

## Phase Details

### Phase 1: Foundation
**Goal**: Establish the type system, testing infrastructure, and VFS context that all other work builds on
**Depends on**: Nothing (first phase)
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-20
**Success Criteria** (what must be TRUE):
  1. Running `npm test` executes Vitest successfully
  2. TypeScript types exist for GameState, VFSNode, CommandResult with zero `any` types
  3. VFSProvider context allows components to access VFS without prop drilling
  4. Characterization tests capture current behavior for: VFS navigation, all 6 games starting, theme/font persistence
  5. All 11 validated requirements (VAL-01 through VAL-11) pass manual verification
**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md — Vitest setup and configuration (REQ-03)
- [x] 01-02-PLAN.md — TypeScript types with discriminated unions (REQ-01)
- [x] 01-03-PLAN.md — VFSProvider context (REQ-02)
- [x] 01-04-PLAN.md — Characterization tests (REQ-20)

### Phase 2: Core Hooks
**Goal**: Extract terminal state management into encapsulated, reusable hooks
**Depends on**: Phase 1
**Requirements**: REQ-04, REQ-05, REQ-06, REQ-07, REQ-08, REQ-21
**Success Criteria** (what must be TRUE):
  1. useTerminalHistory hook manages command history with add/clear/navigate operations
  2. useGameState hook provides state machine for game lifecycle (idle/playing/gameover)
  3. useTheme and useFont hooks handle localStorage persistence with validation
  4. TerminalProvider context makes all hooks available to child components
  5. Unit tests cover all hook state transitions with 80%+ coverage
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Games
**Goal**: Extract all 6 games into isolated modules with pure state management
**Depends on**: Phase 2
**Requirements**: REQ-09, REQ-10, REQ-11, REQ-12, REQ-23
**Success Criteria** (what must be TRUE):
  1. Each game (number, wordle, trivia, blackjack, rps, tron) exists in its own file under components/games/
  2. GameController routes input to active game and receives results without direct state mutation
  3. Games return results via callback, do not mutate parent state directly
  4. Tron collision detection uses Set for O(1) lookup (verified by test)
  5. Integration tests verify full game flows: start game, make moves, end game
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Commands
**Goal**: Create a registry-based command system that is unit testable without UI
**Depends on**: Phase 3
**Requirements**: REQ-13, REQ-14, REQ-15, REQ-22
**Success Criteria** (what must be TRUE):
  1. CommandRegistry contains all commands as a typed data structure
  2. CommandExecutor receives context (vfs, history, games) via injection, not globals
  3. Commands are unit testable by providing mock context
  4. All 20+ terminal commands pass unit tests with expected output
  5. Tab completion works for both commands and paths
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: UI Components
**Goal**: Extract display components with proper memoization for performance
**Depends on**: Phase 4
**Requirements**: REQ-16, REQ-17, REQ-18, REQ-19
**Success Criteria** (what must be TRUE):
  1. HistoryDisplay component renders history lines independently of input state
  2. InputLine component handles all keyboard events (Enter, Tab, arrows, Ctrl+C, Ctrl+L)
  3. TerminalLine component renders single lines with syntax highlighting
  4. React DevTools shows no unnecessary re-renders during typing (memoization working)
  5. Mobile keyboard and touch input continue to work
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Cleanup
**Goal**: Remove unused dependencies and verify final architecture meets all requirements
**Depends on**: Phase 5
**Requirements**: REQ-24, REQ-25, REQ-26
**Success Criteria** (what must be TRUE):
  1. Terminal.tsx is under 200 lines and acts only as orchestrator
  2. All 22 unused Radix UI packages removed from package.json
  3. localStorage format is versioned with migration support for existing users
  4. `npm run build` succeeds with no TypeScript errors
  5. All 11 validated requirements (VAL-01 through VAL-11) pass final verification
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | ✓ Complete | 2026-01-22 |
| 2. Core Hooks | 0/? | Not started | - |
| 3. Games | 0/? | Not started | - |
| 4. Commands | 0/? | Not started | - |
| 5. UI Components | 0/? | Not started | - |
| 6. Cleanup | 0/? | Not started | - |
