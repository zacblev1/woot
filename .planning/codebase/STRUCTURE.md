# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
woot/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx            # Root HTML layout, fonts, metadata
│   ├── page.tsx              # Single page component (Terminal wrapper)
│   └── globals.css           # Tailwind imports and CSS variables
│
├── components/               # React components
│   ├── terminal.tsx          # Main terminal UI, ~1983 lines
│   ├── games/                # Game components
│   │   └── tron-game.tsx     # Canvas-based Tron light cycle game
│   └── theme-provider.tsx    # next-themes wrapper (unused in current setup)
│
├── lib/                      # Utility libraries
│   └── vfs.ts                # Virtual File System implementation
│
├── data/                     # Static JSON data
│   ├── books.json            # Book collection metadata
│   ├── vinyl.json            # Vinyl record collection metadata
│   └── hardware.json         # Hardware/computer collection metadata
│
├── public/                   # Static assets
│   ├── icon.svg              # Favicon
│   ├── placeholder-*.svg     # Placeholder images
│   └── placeholder-*.png     # Placeholder images
│
├── styles/                   # Global styles
│   └── globals.css           # Tailwind config and CSS custom properties
│
├── node_modules/             # Dependencies (not committed)
├── .next/                    # Next.js build output (not committed)
├── .planning/                # GSD planning documents
│
└── Configuration Files
    ├── package.json          # Dependencies, scripts
    ├── tsconfig.json         # TypeScript configuration
    ├── next.config.mjs       # Next.js configuration
    ├── postcss.config.mjs    # PostCSS configuration (Tailwind)
    ├── components.json       # shadcn/ui configuration
    └── CLAUDE.md             # Project guidance for Claude
```

## Directory Purposes

**app/ - Next.js Application Root:**
- Purpose: Entry point for Next.js App Router
- Contains: Single page structure, root layout, global styles
- Key files: `layout.tsx`, `page.tsx`
- Special: Minimal structure; entire app is one page with Terminal component

**components/ - React Components:**
- Purpose: Reusable and page components
- Contains: Terminal (main UI), game components, theme provider
- Key files: `terminal.tsx` (1983 lines, contains all terminal logic and commands)
- Organization: Games isolated in `games/` subdirectory

**components/games/ - Game Components:**
- Purpose: Isolated game implementations
- Contains: Only TronGame (canvas-based); text-based games in terminal.tsx
- Key files: `tron-game.tsx` (AI minimax with alpha-beta pruning + flood-fill heuristic)
- Pattern: Receive onExit callback to return control to terminal

**lib/ - Utility Libraries:**
- Purpose: Shared, non-component utilities
- Contains: Virtual File System abstraction
- Key files: `vfs.ts` (272 lines, complete filesystem implementation)
- Pattern: Pure TypeScript, no React dependencies

**data/ - Static Data:**
- Purpose: Collection metadata as single source of truth
- Contains: Books, vinyl records, hardware specifications
- Key files: Three JSON files, each array of objects
- Format:
  - Books: title, author, genre, format, pages
  - Vinyl: title, artist, genre, format, label
  - Hardware: name, type, processor, memory, storage, status, etc.
- Initialization: Loaded at Terminal mount time into VFS directories

**public/ - Static Assets:**
- Purpose: Images, icons, other static files served from root
- Contains: SVG and PNG placeholders, favicon
- Access: Via `/` URL path (Next.js automatic)

**styles/ - Global Styles:**
- Purpose: Application-wide styling
- Contains: Single globals.css importing Tailwind and tw-animate-css
- CSS Variables: 8 theme variables (background, foreground, card, etc.) with light/dark modes
- Theme Application: Variables overridden at runtime via document.documentElement.style

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root HTML structure, font loading, metadata
- `app/page.tsx`: Single page component rendering Terminal
- `components/terminal.tsx`: Terminal component, main application logic

**Configuration:**
- `tsconfig.json`: Path alias `@/*` maps to project root
- `next.config.mjs`: Next.js build configuration
- `components.json`: shadcn/ui component library settings (new-york style)

**Core Logic:**
- `components/terminal.tsx`: Commands object, game handlers, VFS integration (1983 lines)
- `lib/vfs.ts`: FileSystemNode tree, directory operations (272 lines)
- `components/games/tron-game.tsx`: Canvas rendering, AI logic, game loop

**Testing:**
- No test files in codebase
- No test configuration (Jest, Vitest, etc.)

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `Terminal.tsx`, `TronGame.tsx`)
- Utilities: camelCase (e.g., `vfs.ts`)
- Pages: lowercase (e.g., `page.tsx`, `layout.tsx`)
- Data files: lowercase (e.g., `books.json`)
- Styles: lowercase (e.g., `globals.css`)

**Directories:**
- Component directories: lowercase (e.g., `components/`, `games/`)
- Route directories: lowercase (e.g., `app/`)
- Data directory: lowercase (e.g., `data/`)

**Functions/Variables:**
- Commands: lowercase (e.g., `ls`, `pwd`, `game`)
- React hooks/state: camelCase (e.g., `setHistory`, `currentTheme`)
- Game types: lowercase (e.g., `"number"`, `"wordle"`, `"tron"`)
- Theme/Font names: lowercase (e.g., `"lumon"`, `"jetbrains"`)

## Where to Add New Code

**New Feature (e.g., new command):**
- Primary code: `components/terminal.tsx` - add handler to `commands` object
- Manual pages: `components/terminal.tsx` - add entry to `manPages` object
- Help text: `components/terminal.tsx` - update `help` command output
- Validation: `components/terminal.tsx` - add to `validCommands` array
- Example file: If command navigates to collection, add data to `data/*.json` and populate in VFS initialization

**New Mini-Game:**
- If text-based (like Wordle, Number, Trivia):
  - Add game starter function in `components/terminal.tsx` (e.g., `startWordleGame()`)
  - Add game handler function in `components/terminal.tsx` (e.g., `handleWordleGame()`)
  - Add game type case to `game` command in `commands` object
  - Update `GameState` type to include new game type
  - Add to games array in VFS initialization

- If canvas-based (like Tron):
  - Create file `components/games/your-game.tsx`
  - Export function with signature: `export function YourGame({ onExit }: { onExit: () => void })`
  - Load via next/dynamic in terminal.tsx
  - Add case to `game` command that sets `gameState.active = true, gameState.type = "yourname"`
  - In terminal render, display component when `gameState.type === "yourname"`

**New Collection (e.g., movies, music equipment):**
- Create data file: `data/movies.json` with array of objects
- Schema: Follow pattern of books.json, vinyl.json, hardware.json
- Initialize in Terminal component:
  - Create directory: `const moviesDir = fs.createDir("/home/zachary/movies")`
  - Populate from data: Loop through imported data, create file nodes with content
- Commands automatically work via VFS (view, search, genre, format, etc.)
- Add directory name to `directories` array for completion

**Utilities:**
- Shared helpers: `lib/vfs.ts` (if filesystem-related) or create new file in `lib/`
- Example: `lib/utils.ts` for non-VFS helpers
- Follow pattern: Export as named functions/classes, import via `@/lib/utils`

**Styling:**
- Global styles: `styles/globals.css`
- Theme variables: Override at runtime in terminal.tsx `applyTheme()` and `applyFont()` functions
- Tailwind classes: Apply directly in JSX (no CSS modules needed)
- Component-specific: Use inline Tailwind classes or scoped className strings

## Special Directories

**node_modules/:**
- Purpose: NPM packages (Next.js, React, Tailwind, shadcn/ui, etc.)
- Generated: Yes, via `npm install`
- Committed: No
- Key packages: next, react, tailwindcss, shadcn/ui (via path alias in components.json)

**.next/:**
- Purpose: Next.js build output and cache
- Generated: Yes, via `npm run build` or `npm run dev`
- Committed: No
- Contains: Compiled pages, server functions, static optimization

**.planning/:**
- Purpose: GSD (Goal, Structure, Documentation) planning documents
- Generated: Yes, created by GSD orchestrator
- Committed: Yes (documentation tracking)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**app/ - Special (Not Traditional Routes):**
- Purpose: Single-page app structure; no actual routes
- Contains: `page.tsx` (renders at `/`), `layout.tsx` (wraps all pages)
- No other routes: Portfolio is entirely one page with terminal interface

---

*Structure analysis: 2026-01-22*
