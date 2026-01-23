# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `terminal.tsx`, `tron-game.tsx`)
- Utility/library files: camelCase (e.g., `vfs.ts`)
- Data files: lowercase with `.json` extension (e.g., `books.json`, `vinyl.json`)

**Functions:**
- Standard functions: camelCase (e.g., `highlightInput`, `startNumberGame`, `handleKeyDown`)
- React components: PascalCase (e.g., `Terminal`, `TronGame`, `RootLayout`)
- Event handlers: camelCase with `handle` prefix (e.g., `handleKeyDown`, `handleFocus`)
- Helper functions: camelCase (e.g., `countReachable`, `getCompletions`, `applyTheme`)
- Getters: camelCase with `get` prefix (e.g., `getCompletions`)

**Variables:**
- State variables: camelCase (e.g., `gameState`, `commandHistory`, `currentTheme`)
- Constants: UPPER_SNAKE_CASE (e.g., `CELL_SIZE`, `INITIAL_SPEED`, `SPEED_INCREMENT`)
- Refs: camelCase with `Ref` suffix (e.g., `playerPos`, `gameLoopRef`, `canvasRef`)
- Collections: plural camelCase (e.g., `wordleWords`, `validCommands`, `themes`)

**Types:**
- Interfaces: PascalCase (e.g., `TerminalLine`, `GameState`, `FileSystemNode`, `TronGameProps`)
- Type aliases: PascalCase (e.g., `Direction`, `Point`, `ThemeName`, `FontName`)
- Generic types: PascalCase (e.g., `Readonly`, `React.ReactNode`)

## Code Style

**Formatting:**
- No explicit formatter configured (no `.prettierrc`)
- Indentation: 2 spaces (observed throughout codebase)
- Line length: Variable, observed up to 120+ characters
- String quotes: Double quotes for JSX/HTML attributes, can vary in code

**Linting:**
- ESLint configured with `npm run lint` command
- No `.eslintrc` or `eslint.config.mjs` file in root (relies on Next.js defaults)
- TypeScript strict mode enabled: `"strict": true` in `tsconfig.json`

## Import Organization

**Order:**
1. `"use client"` directive (for client components)
2. React imports: `import type React from "react"` or destructured from `react`
3. External library imports from `node_modules` (e.g., `next/dynamic`, `lucide-react`)
4. Data imports from JSON files (e.g., `@/data/books.json`)
5. Internal imports using path aliases (`@/lib`, `@/components`)
6. Other internal imports (relative or absolute)

Example from `terminal.tsx`:
```typescript
"use client"

import type React from "react"
import booksData from "@/data/books.json"
import vinylData from "@/data/vinyl.json"
import hardwareData from "@/data/hardware.json"
import { VirtualFileSystem } from "@/lib/vfs"
import dynamic from "next/dynamic"

const TronGame = dynamic(() => import("@/components/games/tron-game").then(mod => mod.TronGame), {
  loading: () => <div className="p-4 text-green-500 font-mono">Loading Tron...</div>
})

import { useState, useRef, useEffect, type ReactNode } from "react"
```

**Path Aliases:**
- `@/` maps to project root (configured in `tsconfig.json`)
- `@/components` - UI components
- `@/data` - JSON data files
- `@/lib` - Utilities and libraries (e.g., `vfs.ts`)

## Error Handling

**Patterns:**
- Return-based error handling: Functions return error strings or `null` for success
  - Example in `lib/vfs.ts`: `cd(path: string): string | null` returns error message or null
  - Example: `mkdir`, `touch`, `rm` all follow same pattern
- Error strings include context: `"cd: ${path}: No such file or directory"` (mimics Unix conventions)
- Conditional rendering for errors in components (e.g., checking for falsy values, null checks)
- Game state uses discriminated unions to track success/failure states

**Validation:**
- TypeScript's strict mode handles null/undefined checks
- Runtime checks before operations (e.g., checking if node exists before accessing properties)
- Guard clauses for early returns in error cases

**Example from vfs.ts:**
```typescript
cd(path: string): string | null {
    const node = this.resolve(path)
    if (!node) return `cd: ${path}: No such file or directory`
    if (node.type !== "directory") return `cd: ${path}: Not a directory`

    this.current = node
    return null
}
```

## Logging

**Framework:** `console` (native browser/Node.js logging)

**Patterns:**
- Minimal logging in codebase (no dedicated logging library)
- Event handlers use inline state updates rather than logs
- No debug/verbose logging observed
- Console methods likely used during development but not visible in production code

## Comments

**When to Comment:**
- Explaining non-obvious algorithmic logic (e.g., AI flood fill heuristic in Tron game)
- Clarifying edge cases (e.g., "Set root's parent to itself to handle 'cd ..' at root safely")
- Documenting command requirements or special behaviors
- Inline comments for complex regex patterns or state management

**Observed Comment Styles:**
```typescript
// Single-line comments for brief explanations
// Set root's parent to itself to handle 'cd ..' at root safely
this.root.parent = this.root

// Multi-line comments for complex sections
// Helper to create a directory path
createDir(path: string): FileSystemNode { ... }

// Comments inside functions explaining non-obvious logic
// Touching an existing file updates access time, but we don't track time yet.
// So do nothing.
```

**JSDoc/TSDoc:**
- Not observed in codebase
- Type annotations used instead for clarity
- No function-level documentation blocks

## Function Design

**Size:**
- Large monolithic components allowed: `terminal.tsx` is ~1983 lines
- Smaller utility modules: `vfs.ts` is ~272 lines
- Game logic: `tron-game.tsx` is ~595 lines
- No strict line-limit enforcement observed

**Parameters:**
- Functions accept positional parameters or destructured objects
- Optional parameters use `?` in TypeScript (e.g., `path?: string`)
- Event handlers receive standard DOM event types (e.g., `KeyboardEvent`, `React.ChangeEvent`)
- Callbacks passed as function parameters

Example:
```typescript
const startGame = useCallback((nextLevel: boolean = false) => { ... }, [])

const cd(path: string): string | null { ... }

const handleKeyDown = (e: KeyboardEvent) => { ... }
```

**Return Values:**
- Functions return data directly or wrapped in arrays for multiple outputs
- Game handlers return strings or string arrays for terminal output
- React components return `ReactNode` or JSX elements
- Utility functions return typed values or null for "not found" patterns

Example:
```typescript
// Returns string or null
cd(path: string): string | null

// Returns array of strings
const startNumberGame = (): string[] => [ ... ]

// Returns string, string array, or discriminated union
const handleCommand = (cmd: string): string | string[] | ReactNode | null => { ... }
```

## Module Design

**Exports:**
- Named exports used throughout (e.g., `export { VirtualFileSystem }`, `export function Terminal()`)
- Default exports used rarely (Next.js pages use default exports)
- Classes exported as named exports with constructor pattern

**Barrel Files:**
- `components/games/` likely has index exports (not verified in read files)
- No `index.ts` files observed in main directories
- Direct imports from individual files preferred (e.g., `@/lib/vfs` not `@/lib`)

**Example from vfs.ts:**
```typescript
export type FileSystemNodeType = "file" | "directory"

export interface FileSystemNode {
    name: string
    type: FileSystemNodeType
    parent?: FileSystemNode
    children?: { [key: string]: FileSystemNode }
    content?: any
}

export class VirtualFileSystem {
    // Implementation
}
```

## Special Patterns

**React Hooks:**
- `useState` for local state management
- `useRef` for mutable references that don't trigger re-renders (game state, canvas refs)
- `useEffect` for side effects (event listeners, scroll management, theme application)
- `useCallback` for memoized function references passed to effects

**Dynamic Imports:**
- Next.js `dynamic` used for code-splitting (Tron game loaded dynamically to avoid SSR issues)
- Loading component provided: `loading: () => <div>...</div>`

**State Machine Pattern:**
- Game state uses discriminated unions: `{ active: boolean, type: "number" | "wordle" | ... | null, data?: any }`
- Terminal line types: `"input" | "output" | "error" | "success" | "link" | "wordle"`
- Clear state transitions visible in event handlers

**Type Safety:**
- `type ReactNode` for flexible return types
- `Readonly<{ ... }>` for immutable props
- Record types for maps: `Record<string, string[]>` for command documentation

---

*Convention analysis: 2026-01-22*
