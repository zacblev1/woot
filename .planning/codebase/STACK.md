# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- TypeScript 5 - All application code, strict mode enabled
- JSX/TSX - React components with React 19

**Secondary:**
- JavaScript (ES2024) - Configuration files (.mjs)
- CSS - Tailwind CSS v4 with custom properties for theming
- JSON - Data collections (books, vinyl, hardware)

## Runtime

**Environment:**
- Node.js 25.2.1+ (required for v25+ compatibility)

**Package Manager:**
- npm - Lockfile present (package-lock.json)

## Frameworks

**Core:**
- Next.js 15.5.7 - App Router architecture, React Server Components support
- React 19.2.1 - UI rendering with concurrent features

**UI & Components:**
- shadcn/ui (new-york style) - Pre-built accessible components
- Radix UI (primitives) - Headless UI foundation, 20+ component libraries
- Tailwind CSS 4.1.9 - Utility-first styling
- tw-animate-css 1.4.0 - Animation utilities extension

**Theming & Fonts:**
- next-themes 0.4.6 - Theme persistence (localStorage-based)
- Geist Sans/Mono 1.4.1 - System font family (Vercel)
- Google Fonts - Fira Code, IBM Plex Mono, JetBrains Mono, Source Code Pro (loaded from CDN)

**Form & Validation:**
- react-hook-form 7.68.0 - Form state management
- @hookform/resolvers 5.2.2 - Validation schema resolvers
- zod 4.1.13 - TypeScript-first schema validation

**UI Components (shadcn/ui additions):**
- @radix-ui/react-accordion 1.2.12
- @radix-ui/react-alert-dialog 1.1.15
- @radix-ui/react-aspect-ratio 1.1.8
- @radix-ui/react-avatar 1.1.11
- @radix-ui/react-checkbox 1.3.3
- @radix-ui/react-collapsible 1.1.12
- @radix-ui/react-context-menu 2.2.16
- @radix-ui/react-dialog 1.1.15
- @radix-ui/react-dropdown-menu 2.1.16
- @radix-ui/react-hover-card 1.1.15
- @radix-ui/react-label 2.1.8
- @radix-ui/react-menubar 1.1.16
- @radix-ui/react-navigation-menu 1.2.14
- @radix-ui/react-popover 1.1.15
- @radix-ui/react-progress 1.1.8
- @radix-ui/react-radio-group 1.3.8
- @radix-ui/react-scroll-area 1.2.10
- @radix-ui/react-select 2.2.6
- @radix-ui/react-separator 1.1.8
- @radix-ui/react-slider 1.3.6
- @radix-ui/react-slot 1.2.4
- @radix-ui/react-switch 1.2.6
- @radix-ui/react-tabs 1.1.13
- @radix-ui/react-toast 1.2.15
- @radix-ui/react-toggle 1.1.10
- @radix-ui/react-toggle-group 1.1.11
- @radix-ui/react-tooltip 1.2.8

**Utilities & UI Enhancements:**
- cmdk 1.1.1 - Command menu/palette component
- embla-carousel-react 8.6.0 - Carousel/slider functionality
- lucide-react 0.556.0 - Icon library (20+ icons)
- recharts 3.5.1 - Chart/visualization library
- sonner 2.0.7 - Toast notifications
- vaul 1.1.0 - Drawer component
- react-day-picker 9.11.3 - Calendar component
- react-resizable-panels 3.0.6 - Resizable UI panels
- input-otp 1.4.2 - OTP/PIN input component
- date-fns 4.1.0 - Date utilities

**Styling Utilities:**
- tailwindcss-animate 1.0.7 - Animation plugin for Tailwind
- tailwind-merge 3.4.0 - Utility class merging
- class-variance-authority 0.7.1 - Component variant system (CVA)
- clsx 2.1.1 - Conditional class names
- autoprefixer 10.4.20 - CSS vendor prefixes

## Build & Development Tools

**Build:**
- TypeScript 5 - Type checking
- Next.js 15.5.7 - Build optimization, code splitting, image optimization

**Development:**
- PostCSS 8.5 - CSS transformation (@tailwindcss/postcss)
- Tailwind CSS 4.1.9 - Utility class generation with CSS v4 engine

**Dev Dependencies:**
- @types/node 22 - Node.js type definitions
- @types/react 19.2.7 - React type definitions
- @types/react-dom 19.2.3 - React DOM type definitions

## Key Dependencies

**Critical (App requires):**
- @vercel/analytics 1.6.1 - Usage tracking & analytics (imported in `app/layout.tsx`)
- next 15.5.7 - Framework & server runtime
- react 19.2.1 - Core library

**Infrastructure (Core functionality):**
- zod 4.1.13 - Data validation (used in terminal commands)
- react-hook-form 7.68.0 - Form handling

**Game/Interactive Features:**
- No external game APIs - Tron game uses canvas-based AI (minimax with alpha-beta pruning)
- No API clients for external services (no Stripe, Supabase, Firebase, etc.)

## Configuration

**Environment:**
- Client-side only - No environment variables required
- localStorage used for persistence (theme, font, VFS state)
- No .env files present or required

**Build Configuration:**

`next.config.mjs`:
```javascript
- typescript.ignoreBuildErrors: true
- images.unoptimized: true (no image optimization)
- eslint.ignoreDuringBuilds: true
```

`tsconfig.json`:
```json
- Target: ES6
- Strict mode: enabled
- Path aliases: "@/*" → root
- includeFiles: ["next-env.d.ts", "**/*.ts", "**/*.tsx"]
```

`postcss.config.mjs`:
```javascript
- @tailwindcss/postcss plugin for Tailwind v4
```

`components.json` (shadcn/ui):
```json
- style: new-york
- tsx: true
- rsc: true (React Server Components)
- Icon library: lucide
- Aliases configured for components, utils, lib, hooks
```

## Platform Requirements

**Development:**
- Node.js 25.2.1+ (confirmed from runtime detection)
- npm (package manager)
- Any modern browser with ES2024 support
- 150+ MB for node_modules (157 MB package-lock.json size)

**Production:**
- Vercel (integrated via @vercel/analytics)
- Node.js 25.2.1+ runtime
- Browser support: Modern browsers (ES2024)
- No backend API server required (static site with client-side rendering)

**Deployment:**
- Optimized for Vercel (Next.js 15 App Router)
- Can be deployed on any Node.js-capable platform (Docker, traditional servers)
- Image optimization disabled - suitable for static/CDN deployment

---

*Stack analysis: 2026-01-22*
