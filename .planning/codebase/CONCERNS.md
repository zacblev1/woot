# Codebase Concerns

**Analysis Date:** 2026-01-22

## Tech Debt

**Monolithic Terminal Component:**
- Issue: `components/terminal.tsx` contains 1983 lines in a single component with all command logic, game handlers, and state management bundled together
- Files: `components/terminal.tsx`
- Impact: Difficult to test individual features, hard to locate bugs, performance issues from large render trees, maintainability nightmare
- Fix approach: Split into subcomponents (CommandParser, GameController, HistoryDisplay, InputHandler) and extract game logic into separate modules

**Type Safety Gaps with `any`:**
- Issue: Multiple uses of `any` type: `data?: any` in GameState, `content?: any` in FileSystemNode, functions returning `any`
- Files: `components/terminal.tsx` (line 121), `lib/vfs.ts` (lines 8, 204, 205, 227)
- Impact: Loss of type safety in critical areas, potential runtime errors from incorrect type assumptions, no IDE autocomplete
- Fix approach: Define explicit TypeScript interfaces for GameState.data discriminated union, create proper types for FileSystemNode content

**Hardcoded Data Initialization:**
- Issue: Collection data (books.json, vinyl.json, hardware.json) totaling ~180KB imported directly into component and initialized at render time
- Files: `components/terminal.tsx` (lines 4-6), `lib/vfs.ts`
- Impact: Large initial bundle, all data loaded even if user never browses collections, slow component mount
- Fix approach: Lazy-load collection data via dynamic imports or move to separate API endpoints

**Unused Radix UI Dependencies:**
- Issue: package.json imports 22 Radix UI components that are not used anywhere in the codebase (accordion, alert-dialog, context-menu, dialog, etc.)
- Files: `package.json` (lines 14-38)
- Impact: Bloated dependencies, unused bundle size, maintenance burden
- Fix approach: Audit and remove unused @radix-ui imports, keep only those actually rendered (none appear to be used currently)

## Known Bugs

**Game State Not Fully Cleaned Up on Unmount:**
- Symptoms: If Tron game exits abruptly, gameState can remain partially set causing UI glitches
- Files: `components/terminal.tsx` (lines 1803-1806), `components/games/tron-game.tsx` (lines 1-50)
- Trigger: Rapid quit from Tron via Escape key or external navigation
- Workaround: Manually clear game state by entering `clear` command

**FileSystem Persistence Race Condition:**
- Symptoms: Multiple rapid file operations (mkdir, touch, rm) may not all persist to localStorage
- Files: `components/terminal.tsx` (lines 1625, 1633, 1642), `lib/vfs.ts` (lines 222-271)
- Trigger: Execute multiple file commands in quick succession without waiting for storage
- Workaround: Add delay between file operations or refresh page

## Security Considerations

**localStorage Persistence Without Validation:**
- Risk: VFS state is deserialized from localStorage with minimal validation; malformed JSON could crash restoration
- Files: `components/terminal.tsx` (lines 744-748), `lib/vfs.ts` (lines 222-271)
- Current mitigation: Try-catch block logs error but silently reinitializes filesystem
- Recommendations:
  - Add schema validation before deserializing (use Zod schema already in package.json)
  - Sanitize and validate FileSystemNode structures during restore
  - Version the storage format to handle future migrations

**No Content Security Policy for External Links:**
- Risk: Links opened from terminal (about, contact, projects) use `target="_blank"` with only `rel="noopener noreferrer"`
- Files: `components/terminal.tsx` (lines 1828-1836)
- Current mitigation: `rel="noopener noreferrer"` prevents basic window reference attacks
- Recommendations: Consider adding referrer policy in config, validate URLs before rendering as links

**Unrestricted Input Highlighting Regex:**
- Risk: Path regex in `highlightInput` (line 75) and `highlightLine` could cause ReDoS on pathologically malformed input
- Files: `components/terminal.tsx` (lines 75, 1881-1899)
- Current mitigation: Input limited by HTML input element and command parsing
- Recommendations: Use stricter regex patterns or add input length limits for path components

## Performance Bottlenecks

**Tron Game AI: Recursive Minimax Every Frame:**
- Problem: `minimax()` function runs with depth=5 on every game update (every ~50ms at default speed), creating 4^5=1024 function calls per frame
- Files: `components/games/tron-game.tsx` (lines 157-261, 309-335)
- Cause: No memoization, no alpha-beta pruning early exit optimization, recalculates same game states repeatedly
- Improvement path:
  - Implement move ordering heuristics to improve pruning efficiency
  - Cache evaluated positions with transposition table
  - Reduce depth dynamically based on frame time budget (time-bounded search)
  - Consider iterative deepening with time limit instead of fixed depth

**Large Trail Array Linear Search on Collision:**
- Problem: Collision detection uses `Array.some()` to check if head overlaps with trail: `playerTrail.current.some(p => p.x === playerPos.current.x && p.y === playerPos.current.y)`
- Files: `components/games/tron-game.tsx` (lines 393-398)
- Cause: O(n) lookup per entity per frame; trails can grow to 6000+ points per game
- Improvement path:
  - Use Set<string> for trails instead of Point arrays: `trails = new Set(["x,y", "x,y", ...])`
  - Change collision to O(1): `trails.has("${x},${y}")`
  - Keep array only for rendering if needed

**Terminal History Not Virtualized:**
- Problem: All history lines rendered in DOM, even those scrolled off-screen; long sessions accumulate thousands of lines
- Files: `components/terminal.tsx` (lines 1810-1857)
- Cause: Simple `.map()` over history array without windowing
- Improvement path:
  - Implement react-window or similar virtualization library
  - Render only visible history window + small buffer
  - For sessions > 1000 lines, trim oldest history or implement pagination

**Bundle Contains 180KB of Collection Data at Startup:**
- Problem: books.json (137KB), vinyl.json (40KB), hardware.json (2.3KB) imported directly into bundle
- Files: `components/terminal.tsx` (lines 4-6)
- Cause: Static imports force data to load even on first paint
- Improvement path:
  - Dynamic import on first access: `const data = await import('@/data/books.json')`
  - Move to public/ and fetch with lazy loading
  - Implement paginated data loading or search backend

## Fragile Areas

**Game State Machine with String Discriminator:**
- Files: `components/terminal.tsx` (lines 118-123, 1595-1620, 1674-1706)
- Why fragile: Game type is a union of strings without TypeScript discriminated union; handlers spread across file with string comparisons
- Safe modification:
  - Extract game constants to enum or const object
  - Create type-safe handler map: `const handlers: Record<GameType, Handler>`
  - Test each game handler independently with mocked state
- Test coverage: No dedicated tests exist; game logic tangled with rendering

**FileSystem.resolve() Path Handling Edge Cases:**
- Files: `lib/vfs.ts` (lines 69-93, 118-152, 155-185)
- Why fragile: Multiple parsing paths (absolute `/`, relative `~`, current dir), special cases for `.` and `..`
- Safe modification:
  - Add comprehensive path normalization function before resolve
  - Test with edge cases: `//`, `~/~`, `../../../..`, mixed separators
  - Document expected behavior for each path type
- Test coverage: No unit tests for VFS; mkdir/touch/rm logic duplicated

**Tron AI Decision Logic Mutation:**
- Files: `components/games/tron-game.tsx` (lines 267-271, 318-319)
- Why fragile: Obstacles Set mutated during minimax traversal; subtle bug if move evaluation order changes
- Safe modification:
  - Clone obstacles before minimax call: `new Set(obstacles)`
  - Ensure no aliasing of state refs during recursion
  - Add invariant checks: assert obstacles hasn't changed between calls
- Test coverage: No unit tests for minimax logic; only integration tested through gameplay

**Wordle Implementation Hardcoded Word List:**
- Files: `components/terminal.tsx` (lines 940-1050, scattered hardcoded word array)
- Why fragile: Word list in component state; no dictionary file management
- Safe modification: Extract word list to separate data file or constant
- Test coverage: No tests for word validation or game logic

## Scaling Limits

**Local Storage 5MB Limit:**
- Current capacity: VFS can store ~2-5MB of tree structure + files depending on browser
- Limit: localStorage capped at 5-10MB per domain; large collections approach limit
- Scaling path:
  - Migrate to IndexedDB for larger storage (100s of MB)
  - Implement data compression for VFS serialization
  - Add storage quota monitoring and warnings

**Canvas Rendering Not Optimized for Large Grid:**
- Current capacity: 100x60 cell grid (6000 cells) re-renders every frame
- Limit: At higher resolutions (2000x1500 canvas), performance degrades >60ms per frame
- Scaling path:
  - Implement dirty rectangle rendering (only redraw changed regions)
  - Use OffscreenCanvas for background rendering
  - Cache static background layers, only redraw trails

**Tron Game Minimax Depth Explosion:**
- Current capacity: Depth 5 runs in <20ms on modern devices
- Limit: Depth 6 approaches 100ms+ on mobile; depth 7 becomes unplayable
- Scaling path: Implement iterative deepening or MCTS (Monte Carlo Tree Search) for variable-time search
- Monitor: Add performance metrics to gameLoop to detect slowdowns

## Dependencies at Risk

**Next.js 15.5.7 with React 19 Canary:**
- Risk: Using cutting-edge React 19 with new features; potential for breaking changes in point releases
- Impact: Compilation errors or runtime crashes on `npm update`
- Migration plan:
  - Pin exact versions in package-lock.json
  - Test before updating minor versions
  - Consider stabilizing to React 19.0 LTS when available

**22 Unused Radix UI Components:**
- Risk: Dependencies bloat, security updates needed for unused packages
- Impact: Bundle size, maintenance overhead, potential supply chain vulnerabilities
- Migration plan: Remove all unused @radix-ui packages from package.json and imports

**No Testing Framework:**
- Risk: Cannot catch regressions in critical paths (VFS, game logic, command handlers)
- Impact: Bugs slip to production; refactoring becomes risky
- Migration plan:
  - Add Jest + React Testing Library
  - Write tests for: VFS operations, game state transitions, command parsing
  - Aim for 60%+ coverage of critical paths

## Missing Critical Features

**No Error Boundaries:**
- Problem: Game crashes or logic errors cause full page blank without recovery
- Blocks: Graceful error handling, user can't understand what went wrong
- Implementation: Add React Error Boundary wrapper around Terminal and TronGame

**No Persistent Storage of User's Collections:**
- Problem: User-created directories (mkdir) are lost on refresh
- Blocks: Can't maintain custom organization of collections
- Implementation: Extend VFS serialization to persist user-created structure, not just loaded data

**No Theme/Font Persistence Across New Sessions:**
- Problem: localStorage loads theme/font, but no validation that saved values are valid
- Blocks: Could crash if corrupted localStorage entry
- Implementation: Add safeguard in theme/font setters to validate against known themes/fonts

**No Input Validation/Sanitization:**
- Problem: Command input passed directly to handlers without validation
- Blocks: Could cause issues with special characters, very long inputs
- Implementation: Add input sanitization layer before command execution

## Test Coverage Gaps

**VirtualFileSystem Untested:**
- What's not tested: mkdir with nested paths, rm on current directory, resolve with symlink-like patterns, edge cases in path normalization
- Files: `lib/vfs.ts`
- Risk: Bugs in filesystem operations could corrupt state and break terminal navigation
- Priority: High

**Game Logic Untested:**
- What's not tested: Number game edge cases (guess validation), Wordle word matching, Trivia question handling, RPS logic, Tron collision detection, AI minimax correctness
- Files: `components/terminal.tsx` (game handlers), `components/games/tron-game.tsx` (all logic)
- Risk: Game bugs discovered only by playing; harder to debug with state spread across component
- Priority: High

**Command Parsing Untested:**
- What's not tested: Tab completion with special characters, command history edge cases, path completion, multi-word arguments
- Files: `components/terminal.tsx` (lines 1674-1796)
- Risk: User discovers broken completions or command parsing issues in production
- Priority: Medium

**Syntax Highlighting Untested:**
- What's not tested: Regex patterns for inline highlighting, edge cases in label detection, malformed input handling
- Files: `components/terminal.tsx` (lines 45-110, 18-43)
- Risk: ReDoS vulnerability or rendering glitches on edge case input
- Priority: Medium

---

*Concerns audit: 2026-01-22*
