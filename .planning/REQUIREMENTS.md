# Requirements: Terminal Portfolio Refactor

**Generated:** 2026-01-22
**Source:** Research synthesis + PROJECT.md

## Validated Requirements (Feature Parity)

These existing features MUST continue to work after refactoring:

| ID | Requirement | Verification |
|----|-------------|--------------|
| VAL-01 | All 20+ terminal commands functional | Run each command, verify output |
| VAL-02 | VFS navigation (cd, ls, pwd, cat) | Navigate full directory tree |
| VAL-03 | Command history (up/down arrows) | Verify 50+ command recall |
| VAL-04 | Tab completion for paths/commands | Test partial input completion |
| VAL-05 | All 6 games playable (number, wordle, trivia, blackjack, rps, tron) | Complete full game sessions |
| VAL-06 | Theme switching with persistence | Change theme, reload, verify |
| VAL-07 | Font switching with persistence | Change font, reload, verify |
| VAL-08 | Syntax highlighting in cat output | View JSON files with colors |
| VAL-09 | Help system (help, man pages) | Access all documentation |
| VAL-10 | Keyboard shortcuts (Ctrl+C, Ctrl+L, Tab) | Test all shortcuts |
| VAL-11 | localStorage persistence | Refresh page, verify state |

## Active Requirements (Refactor Work)

### Foundation (Phase 1)

| ID | Requirement | Success Criteria |
|----|-------------|------------------|
| REQ-01 | Define TypeScript types with discriminated unions | Zero `any` types in new code |
| REQ-02 | Create VFSProvider context | VFS accessible without prop drilling |
| REQ-03 | Install Vitest + testing-library | `npm test` runs successfully |

### Core Hooks (Phase 2)

| ID | Requirement | Success Criteria |
|----|-------------|------------------|
| REQ-04 | Extract useTerminalHistory hook | History state encapsulated |
| REQ-05 | Extract useGameState hook | Game state machine isolated |
| REQ-06 | Extract useTheme hook | Theme logic reusable |
| REQ-07 | Extract useFont hook | Font logic reusable |
| REQ-08 | Create TerminalProvider context | Shared state via context |

### Games (Phase 3)

| ID | Requirement | Success Criteria |
|----|-------------|------------------|
| REQ-09 | Extract game modules (6 games) | Each game in separate file |
| REQ-10 | Create GameController component | Routes input to active game |
| REQ-11 | Games return results, don't mutate parent | Pure function game logic |
| REQ-12 | Optimize Tron collision with Set | O(1) collision detection |

### Commands (Phase 4)

| ID | Requirement | Success Criteria |
|----|-------------|------------------|
| REQ-13 | Create CommandRegistry module | Commands as data structure |
| REQ-14 | Create CommandExecutor component | Executes commands with context |
| REQ-15 | Commands receive injectable context | Unit testable without UI |

### UI Components (Phase 5)

| ID | Requirement | Success Criteria |
|----|-------------|------------------|
| REQ-16 | Extract HistoryDisplay component | Renders history lines |
| REQ-17 | Extract InputLine component | Handles user input |
| REQ-18 | Extract TerminalLine component | Single line rendering |
| REQ-19 | Memoize components for performance | No unnecessary re-renders |

### Testing (Throughout)

| ID | Requirement | Success Criteria |
|----|-------------|------------------|
| REQ-20 | Characterization tests before refactoring | Existing behavior captured |
| REQ-21 | Unit tests for extracted hooks | 80%+ coverage on hooks |
| REQ-22 | Unit tests for command handlers | All commands tested |
| REQ-23 | Integration tests for games | Full game flows tested |

### Cleanup (Phase 6)

| ID | Requirement | Success Criteria |
|----|-------------|------------------|
| REQ-24 | Remove unused Radix UI dependencies | Clean package.json |
| REQ-25 | Terminal.tsx under 200 lines | Orchestrator only |
| REQ-26 | Version localStorage format | Migration path for users |

## Out of Scope (v2)

- Plugin architecture for external commands
- WebSocket-based multiplayer Tron
- Server-side command execution
- Mobile-specific optimizations (beyond basic support)

## Requirement Dependencies

```
REQ-01 (types) → REQ-02, REQ-04-08
REQ-02 (VFS) → REQ-13-15
REQ-03 (testing) → REQ-20-23
REQ-04-08 (hooks) → REQ-09-11, REQ-13-15
REQ-09-11 (games) → REQ-10
REQ-13-15 (commands) → REQ-14
REQ-16-19 (UI) → REQ-25
```

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-01 | Phase 1: Foundation | Pending |
| REQ-02 | Phase 1: Foundation | Pending |
| REQ-03 | Phase 1: Foundation | Pending |
| REQ-04 | Phase 2: Core Hooks | Pending |
| REQ-05 | Phase 2: Core Hooks | Pending |
| REQ-06 | Phase 2: Core Hooks | Pending |
| REQ-07 | Phase 2: Core Hooks | Pending |
| REQ-08 | Phase 2: Core Hooks | Pending |
| REQ-09 | Phase 3: Games | Pending |
| REQ-10 | Phase 3: Games | Pending |
| REQ-11 | Phase 3: Games | Pending |
| REQ-12 | Phase 3: Games | Pending |
| REQ-13 | Phase 4: Commands | Pending |
| REQ-14 | Phase 4: Commands | Pending |
| REQ-15 | Phase 4: Commands | Pending |
| REQ-16 | Phase 5: UI Components | Pending |
| REQ-17 | Phase 5: UI Components | Pending |
| REQ-18 | Phase 5: UI Components | Pending |
| REQ-19 | Phase 5: UI Components | Pending |
| REQ-20 | Phase 1: Foundation | Pending |
| REQ-21 | Phase 2: Core Hooks | Pending |
| REQ-22 | Phase 4: Commands | Pending |
| REQ-23 | Phase 3: Games | Pending |
| REQ-24 | Phase 6: Cleanup | Pending |
| REQ-25 | Phase 6: Cleanup | Pending |
| REQ-26 | Phase 6: Cleanup | Pending |

---
*Requirements defined: 2026-01-22*
*Traceability updated: 2026-01-22*
