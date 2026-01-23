---
phase: 02-core-hooks
plan: 03
subsystem: hooks
tags: [react-hooks, localStorage, theme, font, SSR-safe]
dependency-graph:
  requires: [01-foundation]
  provides: [useTheme, useFont, theme-data, font-data]
  affects: [02-04-terminal-context, 03-commands]
tech-stack:
  added: []
  patterns: [SSR-safe-localStorage, useState-useEffect-mount-pattern]
key-files:
  created:
    - lib/data/themes.ts
    - lib/data/fonts.ts
    - lib/data/index.ts
    - lib/hooks/useTheme.ts
    - lib/hooks/useFont.ts
    - lib/hooks/index.ts
    - lib/hooks/__tests__/useTheme.test.ts
    - lib/hooks/__tests__/useFont.test.ts
  modified: []
decisions:
  - id: "02-03-01"
    decision: "applyTheme/applyFont in both mount useEffect and setters"
    rationale: "Ensures CSS is always in sync - mount handles initial load, setter handles changes"
metrics:
  duration: "2 min"
  completed: "2026-01-22"
---

# Phase 2 Plan 3: useTheme and useFont Hooks Summary

**One-liner:** SSR-safe useTheme and useFont hooks with localStorage persistence and CSS custom property application.

## What Was Built

### Data Layer (lib/data/)

Created theme and font definition files extracted from terminal.tsx:

**lib/data/themes.ts:**
- `THEMES` constant with all 6 theme definitions (lumon, tokyonight, dracula, gruvbox, nord, monokai)
- `DEFAULT_THEME` = 'lumon'
- `isValidTheme()` type guard for validation
- `applyTheme()` applies all 8 CSS custom properties to document.documentElement

**lib/data/fonts.ts:**
- `FONTS` constant with all 6 font definitions (jetbrains, fira, source, ibm, hack, mono)
- `DEFAULT_FONT` = 'jetbrains'
- `isValidFont()` type guard for validation
- `applyFont()` applies --font-mono CSS custom property

### Hooks (lib/hooks/)

**lib/hooks/useTheme.ts:**
```typescript
interface UseThemeReturn {
  theme: ThemeName
  themeConfig: ThemeColors
  setTheme: (name: ThemeName) => void
  availableThemes: ThemeName[]
}
```

**lib/hooks/useFont.ts:**
```typescript
interface UseFontReturn {
  font: FontName
  fontConfig: FontConfig
  setFont: (name: FontName) => void
  availableFonts: FontName[]
}
```

Both hooks follow the SSR-safe localStorage pattern:
1. Initialize useState with default value (SSR-safe)
2. useEffect on mount reads from localStorage and applies (client-only)
3. setters update state, persist to localStorage, and apply CSS

### Test Coverage

- **useTheme.test.ts:** 18 tests covering initial state, setTheme, localStorage loading, all theme validations
- **useFont.test.ts:** 18 tests covering initial state, setFont, localStorage loading, all font validations
- **Coverage:** 100% on hooks, 96.15% overall

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

| Check | Status |
|-------|--------|
| Type check (our files) | Pass |
| useTheme tests | 18/18 pass |
| useFont tests | 18/18 pass |
| Coverage > 80% | 96.15% |

## Next Phase Readiness

Ready for 02-04 (TerminalProvider context) which will compose useTheme and useFont with useTerminalHistory and useGameState.

**Blockers:** None
**Concerns:** None
