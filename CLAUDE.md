# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ongoing Work

Multi-part terminal-enhancement effort in progress — see
`docs/superpowers/STATUS.md` for what's done and how to pick up the next
sub-project (spec: `docs/superpowers/specs/2026-06-09-terminal-enhancements-design.md`).

## Build and Development Commands

```bash
npm run dev             # Start development server (Next.js)
npm run build           # Production build (type-checks and lints; do not bypass)
npm run start           # Start production server
npm run lint            # ESLint (flat config, eslint-config-next; 0 errors required)
npm run typecheck       # tsc --noEmit
npm run test            # Run all tests (Vitest)
npm run test:coverage   # Run tests with coverage report

# Database migrations (Drizzle ORM + Turso)
npx drizzle-kit generate   # Generate migrations from schema (works without env vars)
npx drizzle-kit migrate    # Run migrations
npx drizzle-kit studio     # Open Drizzle Studio (database GUI)
```

## Architecture

A single-page personal portfolio: one route (`app/page.tsx`) rendering an
interactive retro terminal. There are no separate collection pages — books,
vinyl, hardware, and notes are browsed *inside* the terminal via a virtual
file system.

### Key Technologies
- **Framework**: Next.js 15 (App Router), React 19
- **Styling**: Tailwind CSS v4 (`app/globals.css` defines the theme via CSS variables)
- **Database**: Turso (libSQL) with Drizzle ORM — optional; app degrades gracefully without it
- **Testing**: Vitest + React Testing Library + happy-dom (global `fetch` is stubbed in `vitest.setup.ts`; tests must never hit the network)
- **Fonts**: JetBrains Mono, Fira Code, Source Code Pro, IBM Plex Mono — self-hosted via `next/font`, exposed as CSS variables (see `app/layout.tsx` and `lib/terminal-config.ts`)

### Command System (the important part)

Terminal commands live in **`lib/commands/`** — a registry of pure command
functions. `components/terminal.tsx` is the host: it owns React state, builds
an `ExecuteContext` per invocation, and dispatches through `executeCommand`.

- `lib/commands/commands/*.ts` — command implementations (navigation, filesystem, collection, info, style, system, game)
- `lib/commands/types.ts` — `ExecuteContext` (vfs, history, game, theme, font, sound, uptime, collections) and `CommandDefinition`
- `lib/commands/executor.ts` — parse + dispatch; returns `CommandResult` (`success.output` is `string | string[] | TerminalLine | TerminalLine[]`)
- `lib/commands/man-pages.ts` — canonical man pages
- **Adding a command**: implement it in the right `commands/*.ts` file, register it in `lib/commands/index.ts` (`createDefaultRegistry`), add a man page, write unit tests against a mock `ExecuteContext` (see `lib/commands/__tests__/`)

Still owned by `components/terminal.tsx` by design: the text-game state
machine (number/wordle/trivia/blackjack/rps input handling), the async
`suggest` flow, keyboard shortcuts, history navigation, and the output→history
mapping (`appendCommandOutput` / `classifyLine`).

`components/__tests__/terminal-characterization.test.tsx` pins user-visible
terminal behavior — if it fails, you changed shipped behavior.

### Other Core Pieces

- **VFS** (`lib/vfs.ts`): virtual filesystem populated from `data/*.json`; user mutations (mkdir/touch/rm) persist to localStorage
- **Boot sequence** (`components/boot-sequence.tsx`): first-visit overlay (sessionStorage); skipped under `prefers-reduced-motion`
- **Games** (`components/games/`): text games are pure logic modules (`logic.ts` + tests) routed through `GameController`; canvas games (tron, pacman, basketball) are self-contained components lazy-loaded via `next/dynamic`
- **High scores**: `/app/api/scores` (GET list, POST submit) — zod-validated (`lib/scores.ts`: gameType enum, score bounds, initials), per-IP rate-limited, cached GETs; returns empty data when Turso env vars are absent
- **SEO**: metadata + OG image in `app/layout.tsx` / `app/opengraph-image.tsx`; site URL resolution in `lib/site.ts` (`NEXT_PUBLIC_SITE_URL` overrides)

### Database

- Schema: `lib/db/schema.ts` (`high_scores` with composite index on `(game_type, score desc)`); migrations committed under `drizzle/`
- Env vars: `TURSO_DATABASE_URL` (required for DB features), `TURSO_AUTH_TOKEN` (optional)

### Conventions

- TDD is the norm here: failing test first, then the fix (see git history)
- `next.config.mjs` must NOT set `ignoreBuildErrors`/`ignoreDuringBuilds` — the build is the safety net
- Path alias `@/` maps to the repo root (tsconfig + vitest config)
