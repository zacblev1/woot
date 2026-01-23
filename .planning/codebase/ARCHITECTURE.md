# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Single-page terminal emulator with embedded mini-games and collection browsing.

**Key Characteristics:**
- Single-page React client application (no server-side logic)
- Virtual file system abstraction for terminal navigation
- Command-based interaction pattern
- Game state machine for mini-game management
- Theme and font customization with localStorage persistence
- Collection data (books, vinyl, hardware) stored as JSON and exposed through VFS

## Layers

**Presentation Layer:**
- Purpose: Render terminal UI, handle user interactions, display game interfaces
- Location: `components/terminal.tsx` (main), `components/games/tron-game.tsx` (Tron game)
- Contains: React components, syntax highlighting functions, UI state management
- Depends on: VFS (for navigation), theme/font configuration, game logic
- Used by: `app/page.tsx` (entry point)

**Virtual File System Layer:**
- Purpose: Provide filesystem abstraction for terminal commands, persist state to localStorage
- Location: `lib/vfs.ts`
- Contains: FileSystemNode tree structure, directory/file operations (cd, ls, mkdir, touch, rm)
- Depends on: None (pure utility)
- Used by: Terminal component for all path resolution and navigation

**Data Layer:**
- Purpose: Store collection metadata (books, vinyl, hardware)
- Location: `data/books.json`, `data/vinyl.json`, `data/hardware.json`
- Contains: JSON arrays of collection items with metadata
- Depends on: None
- Used by: Terminal component to populate VFS and filter collections

**Game Layer:**
- Purpose: Implement mini-game logic and rendering
- Location: `components/games/tron-game.tsx` (canvas game), terminal.tsx (text-based games)
- Contains: Game state management, AI logic (minimax for Tron), game loop, win/loss detection
- Depends on: None (self-contained, receives onExit callback)
- Used by: Terminal component when user runs `game` command

## Data Flow

**Terminal Startup:**

1. `app/layout.tsx` initializes fonts via Google Fonts and Geist
2. `app/page.tsx` renders the Terminal component
3. Terminal component initializes VFS on first render
4. VFS populates directories from JSON data files (books, vinyl, hardware)
5. localStorage restored if available (persisted VFS state, theme, font)
6. Terminal renders with startup message and prompt

**Command Execution:**

1. User types command and presses Enter
2. Input parsed into command name and arguments
3. Command name looked up in `commands` object
4. Command function executed with arguments
5. Output generated (string or array of strings)
6. Output appended to terminal history with appropriate line type
7. Terminal scrolls to bottom automatically
8. Display path updated if navigation occurred

**Game Flow:**

1. User runs `game <type>` command
2. Game initialization function called (e.g., startNumberGame, startTronGame)
3. Game state set to active with game type
4. For Tron: TronGame component mounted dynamically via next/dynamic
5. For text games: Game input processed through specialized handlers (handleNumberGame, etc.)
6. User input during game directed to game handler or game component
7. Game determines win/loss condition
8. Game state reset, control returned to terminal
9. Results displayed in history

**Collection Browsing:**

1. User navigates to collection directory (cd books, cd vinyl, cd hardware)
2. VFS resolves path and updates current directory
3. User can:
   - List files with `ls`
   - View single item metadata with `view <file>`
   - Search across collection with `search <term>`
   - Filter by genre with `genre <genre-name>`
   - Filter by format with `format <format-type>`
   - Filter by type (hardware only) with `type <type-name>`

**State Management:**

- Terminal state: history (output lines), input (current typed text), command history (for up/down navigation)
- Game state: active flag, game type, game-specific data (target number, word, score, etc.)
- VFS state: current directory pointer, full tree structure
- Theme/Font: stored in localStorage, applied via CSS custom properties
- Display path: derived from VFS current directory, updated after navigation

## Key Abstractions

**VirtualFileSystem (VFS):**
- Purpose: Abstract filesystem operations for terminal emulation
- Examples: `lib/vfs.ts`
- Pattern: Class with methods for cd, ls, pwd, mkdir, touch, rm, resolve
- Maintains: Node tree with parent/child references, circular references handled in serialization
- Persists to localStorage as JSON

**TerminalLine:**
- Purpose: Represent a single line of terminal output
- Examples: Used throughout terminal.tsx history array
- Pattern: Interface with type (input, output, error, success, link, wordle) and content
- Allows: Syntax highlighting based on line type

**GameState:**
- Purpose: Track active game and its data
- Examples: Terminal component gameState useState
- Pattern: Interface with active flag, game type, and game-specific data object
- Allows: Single active game at a time, state persists during user input

**Commands Object:**
- Purpose: Map command names to handler functions
- Examples: `commands.ls`, `commands.cd`, `commands.search`
- Pattern: Record<string, (args: string[]) => (string | { text: string; href: string })[] | string | { text: string; href: string }>
- Allows: Consistent command registration and execution

**Themes and Fonts:**
- Purpose: Runtime customization of terminal appearance
- Examples: themes.lumon, fonts.jetbrains
- Pattern: Const objects with named presets, CSS custom properties applied to document root
- Allows: Instant theme/font switching without reload

## Entry Points

**HTML Entry Point:**
- Location: `app/layout.tsx`
- Triggers: Page load
- Responsibilities: Setup metadata, load Google Fonts, initialize body element

**React Entry Point:**
- Location: `app/page.tsx`
- Triggers: Page load (Next.js App Router)
- Responsibilities: Center the Terminal component, apply responsive styling

**Terminal Component:**
- Location: `components/terminal.tsx` (export function Terminal)
- Triggers: Page renders
- Responsibilities: Manage all terminal state, execute commands, render history, handle user input

**Game Components:**
- Location: `components/games/tron-game.tsx` (export function TronGame)
- Triggers: `game tron` command executed
- Responsibilities: Render canvas, manage game loop, handle keyboard input, implement AI

## Error Handling

**Strategy:** Error messages returned as string output from command handlers

**Patterns:**
- File operations (cd, ls, cat, view, etc.) check node existence and type, return error string if invalid
- Path resolution returns null if path doesn't resolve, handler converts to error message
- Command parsing checks for required arguments, returns usage message if missing
- Game interruption: Ctrl+C during game shows "Game interrupted" message and returns to prompt
- Invalid commands: Command name not in validCommands list highlighted in red

## Cross-Cutting Concerns

**Logging:** Console.error used for VFS deserialization failures only (no structured logging)

**Validation:**
- Command arguments validated before execution (existence checks, path validation)
- User input trimmed and split by whitespace
- Game input type-checked (e.g., parseInt for number game, word length for Wordle)

**Authentication:** Not applicable (client-side portfolio, no backend)

**Theme/Style Application:**
- Themes applied via CSS custom properties on document.documentElement
- Fonts applied similarly with --font-mono and --font-sans overrides
- Changes persist to localStorage automatically
- Default theme: "lumon", default font: "jetbrains"

---

*Architecture analysis: 2026-01-22*
