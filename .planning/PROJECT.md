# Terminal Portfolio Refactor

## What This Is

A full architectural rewrite of a personal portfolio website built as a retro terminal emulator. The site features a virtual filesystem for browsing collections (books, vinyl, hardware), embedded mini-games (Tron, Wordle, number guessing, trivia, blackjack, RPS), and theme/font customization. This refactor addresses all identified technical debt, bugs, and performance concerns while maintaining feature parity.

## Core Value

A maintainable, testable, performant terminal codebase that preserves all existing functionality while eliminating technical debt.

## Requirements

### Validated

<!-- Existing capabilities that must be preserved -->

- ✓ Terminal UI with command input and history display — existing
- ✓ Virtual filesystem navigation (cd, ls, pwd, mkdir, touch, rm) — existing
- ✓ Collection browsing with search, genre, format filters — existing
- ✓ Mini-games: Tron, Wordle, number guessing, trivia, blackjack, RPS — existing
- ✓ Theme customization with multiple color schemes — existing
- ✓ Font customization with monospace options — existing
- ✓ Command history navigation (up/down arrows) — existing
- ✓ Tab completion for commands and paths — existing
- ✓ Syntax highlighting for input and output — existing
- ✓ localStorage persistence for VFS, theme, font — existing
- ✓ Responsive layout for mobile and desktop — existing

### Active

<!-- What we're building in this refactor -->

- [ ] Split terminal.tsx into modular components (CommandParser, GameController, HistoryDisplay, InputHandler)
- [ ] Extract all game logic into separate modules with proper typing
- [ ] Eliminate all `any` types with proper TypeScript interfaces
- [ ] Add Vitest + React Testing Library with tests for critical paths
- [ ] Remove unused Radix UI dependencies (22 packages)
- [ ] Optimize Tron collision detection (Array → Set for O(1) lookup)
- [ ] Improve Tron AI with move ordering and transposition table
- [ ] Lazy-load collection data (defer 180KB until accessed)
- [ ] Virtualize terminal history for long sessions
- [ ] Add React Error Boundaries around Terminal and games
- [ ] Add localStorage validation with Zod schemas
- [ ] Add input sanitization layer before command execution
- [ ] Fix game state cleanup on unmount
- [ ] Fix VFS persistence race condition
- [ ] Extract Wordle word list to data file
- [ ] Validate theme/font values on load

### Out of Scope

- Server-side functionality — client-only portfolio, no backend needed
- New features beyond current functionality — focus is quality, not expansion
- Mobile app — web terminal is the product
- Database integration — localStorage sufficient for portfolio
- User authentication — public portfolio, no login needed

## Context

**Current State:**
- `components/terminal.tsx` is 1983 lines with all logic bundled together
- 22 Radix UI packages installed but unused
- No test coverage
- Type safety gaps with `any` in critical interfaces
- Performance issues in Tron game (O(n) collision, unoptimized AI)
- 180KB of collection data loaded at startup

**Codebase Analysis:**
- See `.planning/codebase/` for detailed analysis
- Key files: ARCHITECTURE.md, CONCERNS.md, STACK.md

**Tech Stack (preserved):**
- Next.js 15 with App Router
- React 19
- TypeScript 5
- Tailwind CSS v4
- Geist fonts

## Constraints

- **Feature Parity**: All existing terminal commands and games must work identically after refactor
- **No Breaking Changes**: URLs, themes, saved VFS state must migrate cleanly
- **Bundle Size**: Should decrease (remove unused deps, lazy-load data)
- **Test Coverage**: Critical paths (VFS, games, commands) must have tests before considered complete

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full rewrite over incremental | Clean architecture worth temporary parallel code | — Pending |
| Vitest over Jest | Faster, better ESM support, works well with Vite/Next | — Pending |
| Test as we build | Ensures each component works before moving on | — Pending |
| Keep localStorage over IndexedDB | Sufficient for portfolio scale, simpler API | — Pending |

---
*Last updated: 2026-01-22 after initialization*
