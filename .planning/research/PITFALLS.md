# React Refactoring Pitfalls

**Domain:** React monolith decomposition
**Researched:** 2026-01-22
**Confidence:** HIGH

## Critical Pitfalls

### 1. Breaking State Colocation During Extraction

**What goes wrong:** Extracting components without mapping state dependencies leads to prop drilling or broken synchronization.

**Why:** The monolith hides implicit dependencies. `handleCommand` reads/writes `history`, `gameState`, `commandHistory`, `vfs`.

**Prevention:**
- Map state dependencies BEFORE extracting
- Introduce Context FIRST
- Extract leaf components first (TerminalLine, SyntaxHighlighter)

**Phase:** Foundation - establish state architecture first

---

### 2. Feature Parity Drift Without Verification

**What goes wrong:** Refactored code "works" but `cd ../..` no longer resolves correctly. Regressions accumulate silently.

**Prevention:**
- Write characterization tests BEFORE refactoring
- Create feature parity checklist
- Test manually after each extraction

**Phase:** Testing Foundation - characterization tests first

---

### 3. Extracting Games Without Isolating Side Effects

**What goes wrong:** Games mutate parent state directly. Tests fail intermittently. Race conditions appear.

**Why:** `handleWordleGame` directly calls `setGameState` and `setHistory`. Timing changes during extraction.

**Prevention:**
- Return game results, don't mutate parent state
- Use useReducer for game state
- Add cleanup in useEffect returns

**Phase:** Game Extraction - proper state machine first

---

### 4. Losing localStorage Compatibility

**What goes wrong:** Refactored VFS serialization breaks existing users' saved state.

**Prevention:**
- Version your storage format
- Write migration functions
- Test deserialization of OLD formats

**Phase:** VFS Refactor - add versioning first

---

### 5. Premature Component Abstraction

**What goes wrong:** Beautiful abstractions that become unused or worked around.

**Prevention:**
- Rule of three: don't abstract until seen 3 times
- Extract, don't abstract
- Delay patterns until proven

**Phase:** All phases - resist over-engineering

---

## Moderate Pitfalls

### 6. Render Cycle Issues

**What:** Every keystroke re-renders 1000+ history lines.

**Prevention:** Memoize components, colocate state with users.

### 7. Test Setup Explosion

**What:** Every test needs VFS, localStorage, providers.

**Prevention:** Create test utilities early. Factories for state.

### 8. Parallel Refactor and Feature Work

**What:** Merge conflicts in terminal.tsx, subtle bugs.

**Prevention:** Feature freeze during refactor. Short phases.

### 9. Forgetting Mobile Behavior

**What:** Touch input, keyboard appearance broken.

**Prevention:** Test mobile after each extraction.

### 10. Breaking Keyboard Shortcuts

**What:** Tab, Ctrl+C, arrows stop working.

**Prevention:** List all handlers before extraction. Test explicitly.

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|----------------|------------|
| Foundation | State Colocation (#1) | Map dependencies, Context first |
| Testing | Setup Explosion (#7) | Build utilities before tests |
| Games | Side Effects (#3) | Return results, don't mutate |
| VFS | localStorage (#4) | Version storage, test legacy |
| Commands | Feature Parity (#2) | Characterization tests first |
| UI | Render Cycles (#6) | Memoize, test mobile |

## Pre-Refactor Checklist

- [ ] State dependencies mapped
- [ ] Characterization tests written
- [ ] localStorage migration strategy defined
- [ ] Mobile test cases identified
- [ ] Keyboard handlers documented
- [ ] File organization decided

---
*Pitfalls research: 2026-01-22*
