# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run dev      # Start development server (Next.js)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

This is a personal portfolio website built with Next.js 15 (App Router) and React 19, featuring a retro terminal/cyberpunk aesthetic.

### Key Technologies
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4 with `tw-animate-css` for animations
- **UI Components**: Radix UI primitives with custom styling
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
- Includes mini-games: number guessing, "hack the mainframe", rock-paper-scissors
- Command history navigation with arrow keys

**Boot Sequence** (`components/boot-sequence.tsx`)
- Displays on first visit (stored in sessionStorage)
- Typewriter-style animation mimicking BIOS/boot process

**Collection Pages**
- Books, Vinyl, Hardware pages display data from JSON files in `/data`
- Each page includes the Terminal component for interactive navigation
- Pages support search and filtering

### Data Format

Collection data in `/data/*.json` follows consistent structures:
- Books: title, author, genre, format, pages
- Vinyl: title, artist, genre, format, label
- Hardware: name, type, processor, memory, storage, status, etc.

### Path Aliases

- `@/` maps to the project root (configured in tsconfig.json)
