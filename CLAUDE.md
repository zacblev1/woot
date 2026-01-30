# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run dev             # Start development server (Next.js)
npm run build           # Production build
npm run start           # Start production server
npm run lint            # Run ESLint
npm run test            # Run all tests (Vitest)
npm run test:coverage   # Run tests with coverage report

# Database migrations (Drizzle ORM + Turso)
npx drizzle-kit generate   # Generate migrations from schema
npx drizzle-kit migrate    # Run migrations
npx drizzle-kit studio     # Open Drizzle Studio (database GUI)
```

## Architecture

This is a personal portfolio website built with Next.js 15 (App Router) and React 19, featuring a retro terminal/cyberpunk aesthetic.

### Key Technologies
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4 with `tw-animate-css` for animations
- **UI Components**: Radix UI primitives with custom styling
- **Database**: Turso (libSQL) with Drizzle ORM
- **Testing**: Vitest with React Testing Library and happy-dom
- **Fonts**: Geist Sans and Geist Mono

### Project Structure

- `app/` - Next.js App Router pages (page.tsx for each route)
- `components/` - Reusable React components
  - `terminal.tsx` - Interactive terminal emulator with commands and mini-games
  - `boot-sequence.tsx` - Animated boot sequence shown on first visit
- `data/` - JSON data files for collections (books.json, vinyl.json, hardware.json)
- `lib/utils.ts` - Utility functions (cn function for class merging)

### Core Features

**Terminal Component** (`components/terminal.tsx`)
- Simulates a command-line interface with custom commands
- Commands are context-aware based on current directory (~/books, ~/vinyl, ~/hardware)
- Includes arcade-style mini-games: Tron, Pac-Man, Arcade Hoops (basketball)
- Supports dynamic themes (Lumon, Tokyo Night, Dracula, Gruvbox, Nord, Monokai) via `theme` command
- Virtual File System (`lib/vfs.ts`) powers the simulated directory structure and navigation
- Command history navigation with arrow keys

**Boot Sequence** (`components/boot-sequence.tsx`)
- Displays on first visit (stored in sessionStorage)
- Typewriter-style animation mimicking BIOS/boot process

**Arcade Games**
- Games are lazy-loaded using Next.js dynamic imports for better performance
- High scores stored in Turso database and submitted via API routes
- Game types: `tron`, `pacman`, `basketball`
- Gracefully degrades when database is unavailable (returns empty scores)

**Collection Pages**
- Books, Vinyl, Hardware pages display data from JSON files in `/data`
- Each page includes the Terminal component for interactive navigation
- Pages support search and filtering

### Data Format

Collection data in `/data/*.json` follows consistent structures:
- Books: title, author, genre, format, pages
- Vinyl: title, artist, genre, format, label
- Hardware: name, type, processor, memory, storage, status, etc.

### Database Architecture

**Turso (libSQL) with Drizzle ORM**
- Configuration: `drizzle.config.ts` and `lib/db/index.ts`
- Schema: `lib/db/schema.ts` - defines `highScores` table
- Database client creation is optional - app functions without database
- Environment variables: `TURSO_DATABASE_URL` (required), `TURSO_AUTH_TOKEN` (optional)
- API routes: `/app/api/scores/route.ts` handles GET (fetch scores) and POST (submit scores)

**High Scores Schema**
- Fields: id (auto-increment), gameType (tron/pacman/basketball), initials (3 chars), score, level, createdAt
- Initials are sanitized to uppercase alphanumeric, max 3 characters

### Testing

- **Test framework**: Vitest with React Testing Library
- **Environment**: happy-dom (lightweight DOM simulation)
- **Setup file**: `vitest.setup.ts`
- **Config**: `vitest.config.ts` includes path aliases matching tsconfig
- **Test patterns**: `**/*.test.{ts,tsx}`

### Path Aliases

- `@/` maps to the project root (configured in tsconfig.json and vitest.config.ts)
