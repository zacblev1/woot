# Terminal Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 10 visual/UX improvements to the retro terminal portfolio — CRT effects, terminal chrome, ASCII banner, boot sequence, command palette, enhanced neofetch, block cursor, screensaver, sound effects, and richer collection views.

**Architecture:** Foundation-first approach. Extract shared config, update types, build the context system, then layer visual features on top. Each task produces a working, committable state. The terminal stays functional throughout.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4, TypeScript, Vitest + React Testing Library, happy-dom

**Spec:** `docs/superpowers/specs/2026-03-19-terminal-visual-overhaul-design.md`

---

### Task 1: Extract shared terminal config

**Files:**
- Create: `lib/terminal-config.ts`
- Modify: `components/terminal.tsx:32-131` (remove local `themes`, `fonts` objects)
- Modify: `lib/types/terminal.ts` (add `image`, `banner` types, `src`, `centered` props)
- Modify: `components/terminal/types.ts:26-56` (add `sound`)
- Test: `lib/__tests__/terminal-config.test.ts`

- [ ] **Step 1: Create `lib/terminal-config.ts`**

Extract `themes`, `fonts`, `ThemeName`, `FontName` from `components/terminal.tsx` (lines 32-131). Add `GAME_NAMES` and `COMMAND_DESCRIPTIONS`.

```typescript
// lib/terminal-config.ts
export const themes = {
  lumon: {
    name: "Lumon",
    background: "#0a1628",
    foreground: "#e8f4f8",
    card: "#0d1e36",
    primary: "#4fd1c5",
    muted: "#94a3b8",
    accent: "#4fd1c5",
    destructive: "#f56565",
    border: "#2d4a6f",
  },
  tokyonight: {
    name: "Tokyo Night",
    background: "#1a1b26",
    foreground: "#c0caf5",
    card: "#1a1b26",
    primary: "#7aa2f7",
    muted: "#565f89",
    accent: "#9ece6a",
    destructive: "#f7768e",
    border: "#3b4261",
  },
  dracula: {
    name: "Dracula",
    background: "#282a36",
    foreground: "#f8f8f2",
    card: "#282a36",
    primary: "#bd93f9",
    muted: "#6272a4",
    accent: "#50fa7b",
    destructive: "#ff5555",
    border: "#44475a",
  },
  gruvbox: {
    name: "Gruvbox",
    background: "#282828",
    foreground: "#ebdbb2",
    card: "#282828",
    primary: "#fabd2f",
    muted: "#928374",
    accent: "#b8bb26",
    destructive: "#fb4934",
    border: "#3c3836",
  },
  nord: {
    name: "Nord",
    background: "#2e3440",
    foreground: "#eceff4",
    card: "#2e3440",
    primary: "#88c0d0",
    muted: "#4c566a",
    accent: "#a3be8c",
    destructive: "#bf616a",
    border: "#3b4252",
  },
  monokai: {
    name: "Monokai",
    background: "#272822",
    foreground: "#f8f8f2",
    card: "#272822",
    primary: "#66d9ef",
    muted: "#75715e",
    accent: "#a6e22e",
    destructive: "#f92672",
    border: "#3e3d32",
  },
} as const

export type ThemeName = keyof typeof themes

export const fonts = {
  jetbrains: { name: "JetBrains Mono", value: '"JetBrains Mono", monospace' },
  fira: { name: "Fira Code", value: '"Fira Code", monospace' },
  source: { name: "Source Code Pro", value: '"Source Code Pro", monospace' },
  ibm: { name: "IBM Plex Mono", value: '"IBM Plex Mono", monospace' },
  hack: { name: "Hack", value: '"Hack", monospace' },
  mono: { name: "System Mono", value: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace' },
} as const

export type FontName = keyof typeof fonts

export const GAME_NAMES = ['number', 'wordle', 'trivia', 'blackjack', 'rps', 'tron', 'pacman', 'basketball'] as const

export const COMMAND_DESCRIPTIONS: Record<string, string> = {
  ls: 'List directory contents',
  cd: 'Change directory',
  pwd: 'Print working directory',
  cat: 'Display file contents',
  view: 'Formatted view of a file',
  man: 'Display manual pages',
  help: 'Show available commands',
  search: 'Search collections',
  genre: 'Filter by genre',
  format: 'Filter by format',
  type: 'Filter by type',
  game: 'Play a game',
  suggest: 'Submit a game suggestion',
  notes: 'View blog posts and updates',
  theme: 'Switch terminal theme',
  font: 'Switch terminal font',
  sound: 'Toggle sound effects',
  neofetch: 'Display system info',
  mkdir: 'Create a directory',
  touch: 'Create a file',
  rm: 'Remove a file or directory',
  about: 'About Zachary',
  contact: 'Contact information',
  projects: 'View projects on GitHub',
  clear: 'Clear terminal',
  whoami: 'Print current user',
  date: 'Print current date and time',
  echo: 'Echo text',
  exit: 'Exit terminal',
  sudo: 'Run as superuser',
}
```

- [ ] **Step 2: Update `lib/types/terminal.ts`**

Add `image` and `banner` to `TerminalLineType`. Add optional `src` and `centered` to `TerminalLine`. Re-export `ThemeName`/`FontName` from the config.

```typescript
// At top of lib/types/terminal.ts, replace ThemeName/FontName/ThemeColors/FontConfig definitions:
export { type ThemeName, type FontName } from '@/lib/terminal-config'
// (remove the ThemeColors interface, ThemeName type, FontConfig interface, FontName type that are currently there)

// Update TerminalLineType:
export type TerminalLineType = 'input' | 'output' | 'error' | 'success' | 'link' | 'wordle' | 'image' | 'banner'

// Update TerminalLine:
export interface TerminalLine {
  type: TerminalLineType
  content: string
  href?: string
  src?: string
  centered?: boolean
}
```

Note: the existing `ThemeColors` and `FontConfig` interfaces, plus `ThemeName` and `FontName` types in `lib/types/terminal.ts` (lines 28-48) should be removed. They're now derived from the `themes`/`fonts` objects in `lib/terminal-config.ts`.

- [ ] **Step 3: Add `sound` to `VALID_COMMANDS`**

In `components/terminal/types.ts`, add `'sound'` to the `VALID_COMMANDS` array (after `'font'`).

- [ ] **Step 4: Update `components/terminal.tsx` imports**

Replace the local `themes`, `fonts`, `ThemeName`, `FontName` definitions (lines 32-131) with:
```typescript
import { themes, fonts, type ThemeName, type FontName } from '@/lib/terminal-config'
```

Keep the local `type ThemeName = keyof typeof themes` and `type FontName = keyof typeof fonts` removed — they come from the import now.

- [ ] **Step 5: Write test for terminal-config**

```typescript
// lib/__tests__/terminal-config.test.ts
import { describe, it, expect } from 'vitest'
import { themes, fonts, GAME_NAMES, COMMAND_DESCRIPTIONS } from '@/lib/terminal-config'
import { VALID_COMMANDS } from '@/components/terminal/types'

describe('terminal-config', () => {
  it('exports all 6 themes', () => {
    expect(Object.keys(themes)).toHaveLength(6)
    expect(themes.lumon.name).toBe('Lumon')
  })

  it('exports all 6 fonts', () => {
    expect(Object.keys(fonts)).toHaveLength(6)
    expect(fonts.jetbrains.name).toBe('JetBrains Mono')
  })

  it('GAME_NAMES has 8 games and excludes suggest', () => {
    expect(GAME_NAMES).toHaveLength(8)
    expect(GAME_NAMES).not.toContain('suggest')
  })

  it('COMMAND_DESCRIPTIONS covers all VALID_COMMANDS', () => {
    for (const cmd of VALID_COMMANDS) {
      expect(COMMAND_DESCRIPTIONS[cmd]).toBeDefined()
    }
  })
})
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run lib/__tests__/terminal-config.test.ts`
Expected: PASS

- [ ] **Step 7: Run full test suite to check nothing broke**

Run: `npx vitest run`
Expected: All existing tests pass

- [ ] **Step 8: Commit**

```bash
git add lib/terminal-config.ts lib/types/terminal.ts components/terminal/types.ts components/terminal.tsx lib/__tests__/terminal-config.test.ts
git commit -m "refactor: extract shared terminal config and update types for visual overhaul"
```

---

### Task 2: Terminal context and provider

**Files:**
- Create: `lib/terminal-context.tsx`
- Test: `lib/__tests__/terminal-context.test.tsx`

- [ ] **Step 1: Write test for TerminalContext**

```typescript
// lib/__tests__/terminal-context.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { TerminalContextProvider, useTerminalContext } from '@/lib/terminal-context'

function TestConsumer() {
  const ctx = useTerminalContext()
  return (
    <div>
      <span data-testid="dir">{ctx.currentDirectory}</span>
      <span data-testid="theme">{ctx.currentTheme}</span>
      <span data-testid="font">{ctx.currentFont}</span>
      <span data-testid="sound">{ctx.soundEnabled ? 'on' : 'off'}</span>
    </div>
  )
}

describe('TerminalContext', () => {
  it('provides default values', () => {
    render(
      <TerminalContextProvider>
        <TestConsumer />
      </TerminalContextProvider>
    )
    expect(screen.getByTestId('dir').textContent).toBe('~')
    expect(screen.getByTestId('theme').textContent).toBe('lumon')
    expect(screen.getByTestId('font').textContent).toBe('jetbrains')
    expect(screen.getByTestId('sound').textContent).toBe('off')
  })

  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow()
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/terminal-context.test.tsx`
Expected: FAIL (module not found)

- [ ] **Step 3: Create `lib/terminal-context.tsx`**

```typescript
// lib/terminal-context.tsx
"use client"

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import type { ThemeName, FontName } from '@/lib/terminal-config'

interface TerminalContextValue {
  currentDirectory: string
  setCurrentDirectory: (dir: string) => void
  currentTheme: ThemeName
  setCurrentTheme: (theme: ThemeName) => void
  currentFont: FontName
  setCurrentFont: (font: FontName) => void
  soundEnabled: boolean
  toggleSound: () => void
  executeCommand: (command: string) => void
  registerCommandHandler: (handler: (cmd: string) => void) => void
}

const TerminalContext = createContext<TerminalContextValue | null>(null)

export function TerminalContextProvider({ children }: { children: ReactNode }) {
  const [currentDirectory, setCurrentDirectory] = useState('~')
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('lumon')
  const [currentFont, setCurrentFont] = useState<FontName>('jetbrains')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const commandHandlerRef = useRef<((cmd: string) => void) | null>(null)

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('sound-enabled', String(next))
      }
      return next
    })
  }, [])

  const registerCommandHandler = useCallback((handler: (cmd: string) => void) => {
    commandHandlerRef.current = handler
  }, [])

  // Note: The spec calls for bash-style && error-halting, but handleCommand is
  // void-returning so we can't detect errors. Accepted deviation: all parts run
  // unconditionally. In practice, `cd ~/books && view file` won't fail because
  // the palette only generates valid paths. If error-halting is needed later,
  // refactor handleCommand to return success/failure.
  const executeCommand = useCallback((command: string) => {
    if (!commandHandlerRef.current) return
    const parts = command.split(' && ')
    for (const part of parts) {
      commandHandlerRef.current(part.trim())
    }
  }, [])

  return (
    <TerminalContext.Provider value={{
      currentDirectory,
      setCurrentDirectory,
      currentTheme,
      setCurrentTheme,
      currentFont,
      setCurrentFont,
      soundEnabled,
      toggleSound,
      executeCommand,
      registerCommandHandler,
    }}>
      {children}
    </TerminalContext.Provider>
  )
}

export function useTerminalContext() {
  const ctx = useContext(TerminalContext)
  if (!ctx) throw new Error('useTerminalContext must be used within TerminalContextProvider')
  return ctx
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/terminal-context.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/terminal-context.tsx lib/__tests__/terminal-context.test.tsx
git commit -m "feat: add TerminalContext provider for shared terminal state"
```

---

### Task 3: CRT effects component + CSS

**Files:**
- Create: `components/crt-effects.tsx`
- Modify: `app/globals.css`
- Test: `components/__tests__/crt-effects.test.tsx`

- [ ] **Step 1: Write test**

```typescript
// components/__tests__/crt-effects.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CRTEffects } from '@/components/crt-effects'

describe('CRTEffects', () => {
  it('renders scan lines and vignette overlays', () => {
    const { container } = render(<CRTEffects />)
    const overlays = container.querySelectorAll('[data-crt]')
    expect(overlays).toHaveLength(2)
  })

  it('overlays have pointer-events-none', () => {
    const { container } = render(<CRTEffects />)
    const overlays = container.querySelectorAll('[data-crt]')
    overlays.forEach(el => {
      expect(el.className).toContain('pointer-events-none')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/crt-effects.test.tsx`
Expected: FAIL

- [ ] **Step 3: Create `components/crt-effects.tsx`**

```typescript
// components/crt-effects.tsx
export function CRTEffects() {
  return (
    <>
      {/* Scan lines */}
      <div
        data-crt="scanlines"
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
          mixBlendMode: 'multiply',
        }}
      />
      {/* Vignette */}
      <div
        data-crt="vignette"
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.35) 100%)',
        }}
      />
    </>
  )
}
```

- [ ] **Step 4: Add `.crt-glow` class to `app/globals.css`**

Add after the `::selection` rule block (after line 114):

```css
.crt-glow {
  text-shadow: 0 0 4px color-mix(in srgb, var(--primary) 30%, transparent);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run components/__tests__/crt-effects.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/crt-effects.tsx components/__tests__/crt-effects.test.tsx app/globals.css
git commit -m "feat: add CRT effects overlay and phosphor glow CSS"
```

---

### Task 4: Terminal chrome (title bar + status bar)

**Files:**
- Create: `components/terminal-chrome.tsx`
- Modify: `app/page.tsx`
- Test: `components/__tests__/terminal-chrome.test.tsx`

- [ ] **Step 1: Write test**

```typescript
// components/__tests__/terminal-chrome.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TerminalChrome } from '@/components/terminal-chrome'
import { TerminalContextProvider } from '@/lib/terminal-context'

describe('TerminalChrome', () => {
  it('renders title bar with hostname', () => {
    render(
      <TerminalContextProvider>
        <TerminalChrome><div>content</div></TerminalChrome>
      </TerminalContextProvider>
    )
    expect(screen.getByText(/zachary@home/)).toBeInTheDocument()
  })

  it('renders status bar with Ctrl+K hint', () => {
    render(
      <TerminalContextProvider>
        <TerminalChrome><div>content</div></TerminalChrome>
      </TerminalContextProvider>
    )
    expect(screen.getByText(/Ctrl\+K/)).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <TerminalContextProvider>
        <TerminalChrome><div>test child</div></TerminalChrome>
      </TerminalContextProvider>
    )
    expect(screen.getByText('test child')).toBeInTheDocument()
  })

  it('renders three traffic light dots', () => {
    const { container } = render(
      <TerminalContextProvider>
        <TerminalChrome><div>content</div></TerminalChrome>
      </TerminalContextProvider>
    )
    const dots = container.querySelectorAll('[data-dot]')
    expect(dots).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/terminal-chrome.test.tsx`
Expected: FAIL

- [ ] **Step 3: Create `components/terminal-chrome.tsx`**

```typescript
// components/terminal-chrome.tsx
"use client"

import type { ReactNode } from 'react'
import { useTerminalContext } from '@/lib/terminal-context'
import { themes } from '@/lib/terminal-config'
import { VALID_COMMANDS } from '@/components/terminal/types'

export function TerminalChrome({ children }: { children: ReactNode }) {
  const { currentDirectory, currentTheme, soundEnabled } = useTerminalContext()

  return (
    <div className="w-full max-w-4xl h-full md:h-[80vh] bg-card border border-border shadow-2xl flex flex-col relative">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div data-dot="close" className="w-2.5 h-2.5 rounded-full" style={{ background: '#f56565' }} />
            <div data-dot="minimize" className="w-2.5 h-2.5 rounded-full" style={{ background: '#ecc94b' }} />
            <div data-dot="maximize" className="w-2.5 h-2.5 rounded-full" style={{ background: '#48bb78' }} />
          </div>
          <span className="text-muted-foreground text-xs ml-2 font-mono">
            zachary@home: {currentDirectory}
          </span>
        </div>
        <span className="text-muted-foreground text-[10px] font-mono">
          {themes[currentTheme].name}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {children}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-card border-t border-border text-[10px] font-mono text-muted-foreground shrink-0">
        <div className="flex gap-4">
          <span><span className="text-primary">▸</span> {currentDirectory}</span>
          <span>{VALID_COMMANDS.length} commands</span>
        </div>
        <div className="flex gap-4">
          <span>{soundEnabled ? '🔊 sound on' : '🔇 sound off'}</span>
          <span>Ctrl+K search</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update `app/page.tsx`**

Replace the current content with:

```tsx
"use client"

import { Terminal } from "@/components/terminal"
import { TerminalChrome } from "@/components/terminal-chrome"
import { CRTEffects } from "@/components/crt-effects"
import { TerminalContextProvider } from "@/lib/terminal-context"

export default function Home() {
  return (
    <div className="h-full w-screen flex items-center justify-center bg-background p-2 md:p-8">
      <TerminalContextProvider>
        <TerminalChrome>
          <Terminal />
          <CRTEffects />
        </TerminalChrome>
      </TerminalContextProvider>
    </div>
  )
}
```

- [ ] **Step 5: Remove old container styling from Terminal**

In `components/terminal.tsx`, the root `div` (line 1918) currently has `bg-background`. The chrome now handles the outer container. Keep the terminal's own background for the content area but remove any duplicate border/shadow styling. The terminal div's classes should stay as-is (`h-full w-full bg-background p-4 md:p-6 font-mono text-sm md:text-base cursor-text flex flex-col relative`).

- [ ] **Step 6: Wire Terminal to push state into context**

In `components/terminal.tsx`, add at the top of the `Terminal` function body (after state declarations):

```typescript
import { useTerminalContext } from '@/lib/terminal-context'

// Inside Terminal():
const terminalCtx = useTerminalContext()

// Sync state to context — setters are stable (from useState) so safe as deps
useEffect(() => {
  terminalCtx.setCurrentDirectory(currentDirectory)
}, [currentDirectory, terminalCtx.setCurrentDirectory])

useEffect(() => {
  terminalCtx.setCurrentTheme(currentTheme)
}, [currentTheme, terminalCtx.setCurrentTheme])

useEffect(() => {
  terminalCtx.setCurrentFont(currentFont)
}, [currentFont, terminalCtx.setCurrentFont])

// Register handleCommand for executeCommand
useEffect(() => {
  terminalCtx.registerCommandHandler(handleCommand)
})
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run components/__tests__/terminal-chrome.test.tsx`
Expected: PASS

- [ ] **Step 8: Run full test suite**

Run: `npx vitest run`
Expected: All pass (some existing tests may need wrapping in `TerminalContextProvider` if they render `<Terminal />`)

- [ ] **Step 9: Commit**

```bash
git add components/terminal-chrome.tsx components/__tests__/terminal-chrome.test.tsx app/page.tsx components/terminal.tsx
git commit -m "feat: add terminal chrome with title bar and status bar"
```

---

### Task 5: ASCII art welcome banner + centered lines + TerminalLine updates

**Files:**
- Modify: `components/terminal.tsx:616-622` (update `initialHistory`)
- Modify: `components/terminal/TerminalLine.tsx` (add `banner`, `image`, `centered` support)
- Modify: `components/terminal.tsx:1825-1851` (update dispatch for `null`, `TerminalLine[]`)
- Test: Update `components/terminal/__tests__/TerminalLine.test.tsx`

- [ ] **Step 1: Write tests for new line types**

Add to `components/terminal/__tests__/TerminalLine.test.tsx`:

```typescript
it('renders banner type with accent class (same as success)', () => {
  render(<TerminalLine line={{ type: 'banner', content: 'Banner text' }} />)
  const container = screen.getByText('Banner text').closest('div')
  expect(container).toHaveClass('text-accent')
})

it('renders image type with img element', () => {
  render(<TerminalLine line={{ type: 'image', content: 'Alt text', src: 'https://example.com/cover.jpg' }} />)
  const img = screen.getByAltText('Alt text')
  expect(img).toBeInTheDocument()
  expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg')
})

it('renders centered line with text-center wrapper', () => {
  const { container } = render(<TerminalLine line={{ type: 'output', content: 'Centered', centered: true }} />)
  const wrapper = container.firstChild as HTMLElement
  expect(wrapper.className).toContain('text-center')
})

it('does not center non-centered lines', () => {
  const { container } = render(<TerminalLine line={{ type: 'output', content: 'Normal' }} />)
  const wrapper = container.firstChild as HTMLElement
  expect(wrapper.className).not.toContain('text-center')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/terminal/__tests__/TerminalLine.test.tsx`
Expected: FAIL (unknown types)

- [ ] **Step 3: Update `TerminalLine.tsx`**

In `components/terminal/TerminalLine.tsx`:

Add `banner` to `getColorClass`:
```typescript
case 'banner':
  return 'text-accent'
```

Add `image` rendering to `renderLineContent`:
```typescript
case 'image':
  if (line.src) {
    return (
      <img
        src={line.src}
        alt={line.content}
        className="max-w-[80px] border border-border"
        onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
      />
    )
  }
  return null
```

Update the `TerminalLine` component to handle `centered`:
```typescript
export const TerminalLine = memo(function TerminalLine({ line }: TerminalLineProps) {
  const baseClass = 'whitespace-pre-wrap break-words break-all'
  const colorClass = getColorClass(line.type)
  const centeredClass = line.centered ? ' text-center' : ''

  return (
    <div className={`${baseClass}${colorClass ? ` ${colorClass}` : ''}${centeredClass}`}>
      {line.centered ? (
        <span className="inline-block text-left">{renderLineContent(line)}</span>
      ) : (
        renderLineContent(line)
      )}
    </div>
  )
})
```

- [ ] **Step 4: Update `initialHistory` in `terminal.tsx`**

Replace lines 616-622:

```typescript
const initialHistory: TerminalLine[] = [
  { type: "banner", content: " ███████╗ █████╗  ██████╗██╗  ██╗ █████╗ ██████╗ ██╗   ██╗", centered: true },
  { type: "banner", content: " ╚══███╔╝██╔══██╗██╔════╝██║  ██║██╔══██╗██╔══██╗╚██╗ ██╔╝", centered: true },
  { type: "banner", content: "   ███╔╝ ███████║██║     ███████║███████║██████╔╝ ╚████╔╝", centered: true },
  { type: "banner", content: "  ███╔╝  ██╔══██║██║     ██╔══██║██╔══██║██╔══██╗  ╚██╔╝", centered: true },
  { type: "banner", content: " ███████╗██║  ██║╚██████╗██║  ██║██║  ██║██║  ██║   ██║", centered: true },
  { type: "banner", content: " ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝", centered: true },
  { type: "output", content: "developer  ·  collector  ·  gamer", centered: true },
  { type: "output", content: "" },
  { type: "output", content: "Type 'help' for available commands or Ctrl+K to search.", centered: true },
  { type: "output", content: "" },
]
```

- [ ] **Step 5: Update command dispatch to handle `null` and `TerminalLine[]`**

In `components/terminal.tsx`, find the dispatch block (around line 1825-1851). Update:

```typescript
if (commands[cmd_lower]) {
  const result = commands[cmd_lower](args)
  if (result === null || result === undefined) {
    // Command handled its own output (e.g., clear)
  } else if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && 'type' in result[0]) {
    // TerminalLine[] — append directly, spreading to preserve all properties (src, centered, href)
    setHistory(prev => [...prev, ...(result as TerminalLine[]).map(item => ({ ...item }))])
  } else {
    const items = Array.isArray(result) ? result : [result]
    items.forEach((item) => {
      if (typeof item === "object" && "href" in item) {
        setHistory((prev) => [
          ...prev,
          { type: "link", content: (item as { text: string; href: string }).text, href: (item as { text: string; href: string }).href },
        ])
      } else if (typeof item === "object" && "type" in item && "content" in item) {
        // Single TerminalLine object — spread to preserve all properties
        setHistory((prev) => [...prev, { ...(item as TerminalLine) }])
      } else {
        const line = typeof item === "string" ? item : String(item)
        setHistory((prev) => [
          ...prev,
          {
            type: line.startsWith("Permission") || line.includes("No such") || line.includes("not in") ? "error" : "output",
            content: line,
          },
        ])
      }
    })
  }
}
```

Update the `commands` record type annotation (line 1243) to include `null` and `TerminalLine[]` in the return type:

```typescript
const commands: Record<string, (args: string[]) => (string | { text: string; href: string })[] | string | { text: string; href: string } | TerminalLine[] | null> = {
```

Also update the `clear` command to return `null`:
```typescript
clear: () => {
  setHistory(initialHistory)
  return null
},
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run components/terminal/__tests__/TerminalLine.test.tsx`
Expected: PASS

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 8: Commit**

```bash
git add components/terminal.tsx components/terminal/TerminalLine.tsx components/terminal/__tests__/TerminalLine.test.tsx
git commit -m "feat: add ASCII art welcome banner with centered lines and banner/image types"
```

---

### Task 6: Block cursor

**Files:**
- Modify: `components/terminal/InputLine.tsx:120-145`
- Modify: `app/globals.css`

- [ ] **Step 1: Add cursor blink keyframes to `globals.css`**

Add after the `.crt-glow` rule:

```css
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

- [ ] **Step 2: Update InputLine to render block cursor**

In `components/terminal/InputLine.tsx`, update the overlay div (line 124-127) to include a cursor span after the tokens:

```tsx
{/* Highlighted overlay */}
<div className="absolute inset-0 pointer-events-none whitespace-pre text-base md:text-sm">
  {renderTokens(tokens)}
  <span
    className="inline-block bg-primary"
    style={{
      width: '1ch',
      height: '1.2em',
      verticalAlign: 'text-bottom',
      animation: 'cursor-blink 1s step-end infinite',
    }}
  />
</div>
```

**Known limitation:** The block cursor always renders at the end of input text. If the user clicks mid-text or uses arrow keys, the visual cursor won't match the actual caret position. This is an accepted tradeoff — real terminal emulators always have the cursor at the end of the line during input. A full solution would require tracking `selectionStart` from the input element, which adds complexity.

Ensure the input has `caret-color: transparent` (it already has `text-transparent` — add `caret-transparent` to the className):

```tsx
className="w-full bg-transparent outline-none text-transparent caret-transparent text-base md:text-sm relative z-10"
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add components/terminal/InputLine.tsx app/globals.css
git commit -m "feat: add blinking block cursor to terminal input"
```

---

### Task 7: Enhanced neofetch

**Files:**
- Modify: `components/terminal.tsx:1708-1721` (rewrite `neofetch` command)

- [ ] **Step 1: Update neofetch command**

Replace the `neofetch` command handler (lines 1708-1721) with:

```typescript
neofetch: () => {
  const uptimeMs = Date.now() - mountTime.current
  const uptimeMin = Math.floor(uptimeMs / 60000)
  const uptimeSec = Math.floor((uptimeMs % 60000) / 1000)
  const uptime = uptimeMin > 0 ? `${uptimeMin}m ${uptimeSec}s` : `${uptimeSec}s`

  const art = [
    '  ┌──────────┐',
    '  │  ██████  │',
    '  │  █    █  │',
    '  │  █    █  │',
    '  │  ██████  │',
    '  │  ██  ██  │',
    '  │          │',
    '  └──────────┘',
  ]
  const info = [
    '   zachary@home',
    '   ──────────────',
    `   OS: CYBER_PORTFOLIO v1.0`,
    `   Shell: zach-sh`,
    `   Theme: ${themes[currentTheme].name}`,
    `   Font: ${fonts[currentFont].name}`,
    `   Collections: ${booksData.length} books, ${vinylData.length} vinyl, ${hardwareData.length} hardware`,
    `   Games: ${GAME_NAMES.length} available`,
  ]
  const lines = ['']
  for (let i = 0; i < Math.max(art.length, info.length); i++) {
    lines.push((art[i] || '                ') + (info[i] || ''))
  }
  lines.push(`                 Uptime: ${uptime}`)
  lines.push('')
  return lines
},
```

- [ ] **Step 2: Add `mountTime` ref to Terminal component**

Near the top of the `Terminal` function (after state declarations), add:

```typescript
const mountTime = useRef(Date.now())
```

Also add the `GAME_NAMES` import:

```typescript
import { themes, fonts, type ThemeName, type FontName, GAME_NAMES } from '@/lib/terminal-config'
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add components/terminal.tsx
git commit -m "feat: enhance neofetch with ASCII art and dynamic system stats"
```

---

### Task 8: Sound effects

**Files:**
- Create: `lib/hooks/useSound.ts`
- Create: `public/sounds/` (placeholder files — real CC0 files to be sourced)
- Modify: `components/terminal.tsx` (add `sound` command + man page)
- Test: `lib/hooks/__tests__/useSound.test.ts`

- [ ] **Step 1: Write test for useSound hook**

```typescript
// lib/hooks/__tests__/useSound.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSound } from '@/lib/hooks/useSound'

// Mock Audio
class MockAudio {
  src = ''
  volume = 1
  play = vi.fn().mockResolvedValue(undefined)
  cloneNode = vi.fn().mockReturnThis()
}

beforeEach(() => {
  vi.stubGlobal('Audio', MockAudio)
  localStorage.clear()
})

describe('useSound', () => {
  it('defaults to disabled', () => {
    const { result } = renderHook(() => useSound())
    expect(result.current.enabled).toBe(false)
  })

  it('toggles sound on/off', () => {
    const { result } = renderHook(() => useSound())
    act(() => result.current.toggle())
    expect(result.current.enabled).toBe(true)
    act(() => result.current.toggle())
    expect(result.current.enabled).toBe(false)
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useSound())
    act(() => result.current.toggle())
    expect(localStorage.getItem('sound-enabled')).toBe('true')
  })

  it('play does nothing when disabled', () => {
    const { result } = renderHook(() => useSound())
    result.current.play('keyclick')
    // No error thrown
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/hooks/__tests__/useSound.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `lib/hooks/useSound.ts`**

```typescript
// lib/hooks/useSound.ts
"use client"

import { useState, useCallback, useRef } from 'react'

type SoundName = 'keyclick' | 'error' | 'success' | 'submit'

const SOUND_FILES: Record<SoundName, string> = {
  keyclick: '/sounds/keyclick.mp3',
  error: '/sounds/error.mp3',
  success: '/sounds/success.mp3',
  submit: '/sounds/submit.mp3',
}

const VOLUMES: Record<SoundName, number> = {
  keyclick: 0.1,
  error: 0.3,
  success: 0.3,
  submit: 0.2,
}

export function useSound() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sound-enabled') === 'true'
  })
  const audioPool = useRef<Map<SoundName, HTMLAudioElement>>(new Map())

  const getAudio = useCallback((name: SoundName): HTMLAudioElement => {
    if (!audioPool.current.has(name)) {
      const audio = new Audio(SOUND_FILES[name])
      audio.volume = VOLUMES[name]
      audioPool.current.set(name, audio)
    }
    return audioPool.current.get(name)!
  }, [])

  const play = useCallback((name: SoundName) => {
    if (!enabled) return
    try {
      const audio = getAudio(name)
      const clone = audio.cloneNode() as HTMLAudioElement
      clone.volume = VOLUMES[name]
      clone.play().catch(() => {})
    } catch {
      // Silently fail if audio is not available
    }
  }, [enabled, getAudio])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('sound-enabled', String(next))
      }
      return next
    })
  }, [])

  return { enabled, toggle, play }
}
```

- [ ] **Step 4: Create placeholder sound files**

Create empty placeholder files (to be replaced with real CC0 audio):

```bash
mkdir -p public/sounds
touch public/sounds/keyclick.mp3
touch public/sounds/error.mp3
touch public/sounds/success.mp3
touch public/sounds/submit.mp3
```

Note: These need to be replaced with real CC0 sound files sourced from freesound.org, opengameart.org, or kenney.nl. Each file should be under 10KB.

- [ ] **Step 5: Add `sound` command + man page to `terminal.tsx`**

Add to `manPages` object:
```typescript
sound: [
  "",
  "NAME",
  "    sound - toggle sound effects",
  "",
  "SYNOPSIS",
  "    sound [on|off]",
  "",
  "DESCRIPTION",
  "    Enable or disable retro sound effects. When enabled, plays",
  "    keyclick sounds on typing, beeps on errors, and chimes on",
  "    success. Sound preference is saved to localStorage.",
  "    Without arguments, displays current sound state.",
  "",
  "EXAMPLES",
  "    sound on        Enable sound effects",
  "    sound off       Disable sound effects",
  "    sound           Show current state",
  "",
],
```

Add `sound` command handler (after `font` command):
```typescript
sound: (args) => {
  const sub = args[0]?.toLowerCase()
  if (sub === 'on') {
    if (!soundState.enabled) soundState.toggle()
    return 'Sound effects enabled'
  }
  if (sub === 'off') {
    if (soundState.enabled) soundState.toggle()
    return 'Sound effects disabled'
  }
  return `Sound effects: ${soundState.enabled ? 'on' : 'off'}`
},
```

Update `help` command — change the Style line:
```typescript
"  Style          theme, font, sound, neofetch",
```

Add `useSound` to Terminal and sync to context:
```typescript
import { useSound } from '@/lib/hooks/useSound'
// Inside Terminal():
const soundState = useSound()

// Sync sound state to context so status bar reflects it
useEffect(() => {
  if (soundState.enabled !== terminalCtx.soundEnabled) {
    if (soundState.enabled) {
      if (!terminalCtx.soundEnabled) terminalCtx.toggleSound()
    } else {
      if (terminalCtx.soundEnabled) terminalCtx.toggleSound()
    }
  }
}, [soundState.enabled, terminalCtx.soundEnabled, terminalCtx.toggleSound])
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run lib/hooks/__tests__/useSound.test.ts`
Expected: PASS

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/useSound.ts lib/hooks/__tests__/useSound.test.ts public/sounds/ components/terminal.tsx
git commit -m "feat: add sound effects system with useSound hook and sound command"
```

---

### Task 9: Richer collection view with cover images

**Files:**
- Modify: `components/terminal.tsx:1428-1499` (update `view` command)

- [ ] **Step 1: Update `view` command to return `TerminalLine[]` with images**

In the `view` command handler, update the books and vinyl branches to include cover images. Example for books:

```typescript
view: (args) => {
  const path = args[0]
  if (!path) return "Usage: view <file>"

  const node = vfs.resolve(path)
  if (!node) return `view: ${path}: No such file`
  if (node.type !== "file") return `view: ${path}: Is a directory`

  const pwd = vfs.getPwd()

  if (pwd.includes("/books")) {
    const book = node.content as { title: string; author: string; genre: string; format: string; pages?: number; cover?: string }
    const lines: TerminalLine[] = [{ type: "output", content: "" }]
    if (book.cover) {
      lines.push({ type: "image", content: book.title, src: book.cover })
    }
    lines.push({ type: "output", content: `  Title:   ${book.title}` })
    lines.push({ type: "output", content: `  Author:  ${book.author}` })
    lines.push({ type: "output", content: `  Genre:   ${book.genre}` })
    lines.push({ type: "output", content: `  Format:  ${book.format}` })
    if (book.pages) lines.push({ type: "output", content: `  Pages:   ${book.pages}` })
    lines.push({ type: "output", content: "" })
    return lines
  }

  if (pwd.includes("/vinyl")) {
    const record = node.content as { title: string; artist: string; genre: string; format: string; label: string; cover?: string }
    const lines: TerminalLine[] = [{ type: "output", content: "" }]
    if (record.cover) {
      lines.push({ type: "image", content: record.title, src: record.cover })
    }
    lines.push({ type: "output", content: `  Title:   ${record.title}` })
    lines.push({ type: "output", content: `  Artist:  ${record.artist}` })
    lines.push({ type: "output", content: `  Genre:   ${record.genre}` })
    lines.push({ type: "output", content: `  Format:  ${record.format}` })
    lines.push({ type: "output", content: `  Label:   ${record.label}` })
    lines.push({ type: "output", content: "" })
    return lines
  }

  // hardware and notes branches stay as string[] (no cover images)
  // ... keep existing code for hardware, notes, and fallback ...
},
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add components/terminal.tsx
git commit -m "feat: render cover images in view command for books and vinyl"
```

---

### Task 10: Boot sequence

**Files:**
- Create: `components/boot-sequence.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Test: `components/__tests__/boot-sequence.test.tsx`

- [ ] **Step 1: Write test**

```typescript
// components/__tests__/boot-sequence.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BootSequence } from '@/components/boot-sequence'

beforeEach(() => {
  sessionStorage.clear()
})

describe('BootSequence', () => {
  it('renders children', () => {
    render(<BootSequence><div>terminal content</div></BootSequence>)
    expect(screen.getByText('terminal content')).toBeInTheDocument()
  })

  it('shows overlay on first visit', () => {
    const { container } = render(<BootSequence><div>content</div></BootSequence>)
    expect(container.querySelector('[data-boot-overlay]')).toBeInTheDocument()
  })

  it('skips overlay if session has boot-v2-complete', () => {
    sessionStorage.setItem('boot-v2-complete', 'true')
    const { container } = render(<BootSequence><div>content</div></BootSequence>)
    expect(container.querySelector('[data-boot-overlay]')).not.toBeInTheDocument()
  })

  it('dismisses on click', () => {
    const { container } = render(<BootSequence><div>content</div></BootSequence>)
    const overlay = container.querySelector('[data-boot-overlay]')!
    fireEvent.click(overlay)
    expect(container.querySelector('[data-boot-overlay]')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('boot-v2-complete')).toBe('true')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/boot-sequence.test.tsx`
Expected: FAIL

- [ ] **Step 3: Add glitch keyframes to `globals.css`**

```css
@keyframes glitch-reveal {
  0% {
    clip-path: inset(0 0 100% 0);
    transform: skewX(0deg);
    opacity: 1;
  }
  10% {
    clip-path: inset(20% 0 40% 0);
    transform: skewX(-5deg) translateX(10px);
  }
  20% {
    clip-path: inset(60% 0 10% 0);
    transform: skewX(3deg) translateX(-5px);
  }
  30% {
    clip-path: inset(10% 0 50% 0);
    transform: skewX(-2deg) translateX(8px);
  }
  40% {
    clip-path: inset(40% 0 20% 0);
    transform: skewX(4deg) translateX(-3px);
  }
  50% {
    clip-path: inset(5% 0 30% 0);
    transform: skewX(-1deg) translateX(2px);
  }
  60% {
    clip-path: inset(0 0 20% 0);
    transform: skewX(1deg) translateX(-1px);
  }
  70% {
    clip-path: inset(0 0 10% 0);
    transform: skewX(0deg);
  }
  85% {
    clip-path: inset(0 0 3% 0);
    transform: none;
  }
  100% {
    clip-path: inset(0 0 0 0);
    transform: none;
    opacity: 0;
  }
}

@keyframes color-separation {
  0%, 100% { text-shadow: none; }
  10% { text-shadow: -3px 0 #f56565, 3px 0 #4fd1c5; }
  20% { text-shadow: 2px 0 #f56565, -2px 0 #4fd1c5; }
  30% { text-shadow: -1px 0 #f56565, 1px 0 #4fd1c5; }
  50% { text-shadow: none; }
}
```

- [ ] **Step 4: Create `components/boot-sequence.tsx`**

```typescript
// components/boot-sequence.tsx
"use client"

import { useState, useEffect, useCallback, type ReactNode } from 'react'

interface BootSequenceProps {
  children: ReactNode
}

export function BootSequence({ children }: BootSequenceProps) {
  const [showOverlay, setShowOverlay] = useState(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem('boot-v2-complete')
  })

  const dismiss = useCallback(() => {
    setShowOverlay(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('boot-v2-complete', 'true')
    }
  }, [])

  useEffect(() => {
    if (!showOverlay) return

    const handleKey = () => dismiss()
    window.addEventListener('keydown', handleKey)

    const timer = setTimeout(dismiss, 3000)

    return () => {
      window.removeEventListener('keydown', handleKey)
      clearTimeout(timer)
    }
  }, [showOverlay, dismiss])

  return (
    <div className="relative w-full h-full">
      {children}
      {showOverlay && (
        <div
          data-boot-overlay
          className="absolute inset-0 z-50 bg-background"
          onClick={dismiss}
          style={{
            animation: 'glitch-reveal 3s ease-out forwards',
          }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center font-mono text-primary text-lg"
            style={{
              animation: 'color-separation 0.3s infinite',
            }}
          >
            <span className="opacity-30">INITIALIZING...</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Wrap in `page.tsx`**

Update `page.tsx` to wrap with `BootSequence`:

```tsx
import { BootSequence } from "@/components/boot-sequence"

// In the JSX:
<TerminalContextProvider>
  <BootSequence>
    <TerminalChrome>
      <Terminal />
      <CRTEffects />
    </TerminalChrome>
  </BootSequence>
</TerminalContextProvider>
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run components/__tests__/boot-sequence.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/boot-sequence.tsx components/__tests__/boot-sequence.test.tsx app/globals.css app/page.tsx
git commit -m "feat: add cinematic glitch-in boot sequence"
```

---

### Task 11: Idle screensaver

**Files:**
- Create: `lib/hooks/useIdleTimer.ts`
- Create: `components/screensaver.tsx`
- Modify: `components/terminal.tsx` (add idle timer + screensaver rendering)
- Test: `lib/hooks/__tests__/useIdleTimer.test.ts`

- [ ] **Step 1: Write test for useIdleTimer**

```typescript
// lib/hooks/__tests__/useIdleTimer.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIdleTimer } from '@/lib/hooks/useIdleTimer'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useIdleTimer', () => {
  it('is not idle initially', () => {
    const { result } = renderHook(() => useIdleTimer(5000))
    expect(result.current).toBe(false)
  })

  it('becomes idle after timeout', () => {
    const { result } = renderHook(() => useIdleTimer(5000))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current).toBe(true)
  })

  it('does not become idle when disabled', () => {
    const { result } = renderHook(() => useIdleTimer(5000, false))
    act(() => { vi.advanceTimersByTime(10000) })
    expect(result.current).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/hooks/__tests__/useIdleTimer.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `lib/hooks/useIdleTimer.ts`**

```typescript
// lib/hooks/useIdleTimer.ts
"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

export function useIdleTimer(timeoutMs: number, enabled: boolean = true): boolean {
  const [idle, setIdle] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    if (!enabled) return
    setIdle(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIdle(true), timeoutMs)
  }, [timeoutMs, enabled])

  useEffect(() => {
    if (!enabled) {
      setIdle(false)
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    resetTimer()

    const events = ['keydown', 'mousedown', 'mousemove', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer, enabled])

  return idle
}
```

- [ ] **Step 4: Create `components/screensaver.tsx`**

```typescript
// components/screensaver.tsx
"use client"

import { useRef, useEffect } from 'react'

interface ScreensaverProps {
  onDismiss: () => void
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ァカサタナハマヤラワ'

export function Screensaver({ onDismiss }: ScreensaverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = Array(columns).fill(1)

    // Read --primary CSS variable. In Tailwind v4, custom properties may be stored
    // as raw values. Use a temporary element to resolve the actual computed color.
    let primaryColor = '#4fd1c5'
    try {
      const temp = document.createElement('div')
      temp.style.color = 'var(--primary)'
      document.body.appendChild(temp)
      primaryColor = getComputedStyle(temp).color || primaryColor
      document.body.removeChild(temp)
    } catch {
      // Fallback to default
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = primaryColor
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        ctx.globalAlpha = 0.3 + Math.random() * 0.7
        ctx.fillText(char, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
      ctx.globalAlpha = 1

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30 w-full h-full transition-opacity duration-500"
      onClick={onDismiss}
      onKeyDown={onDismiss}
      style={{ opacity: 1 }}
    />
  )
}
```

- [ ] **Step 5: Integrate into Terminal**

In `components/terminal.tsx`, add:

```typescript
import { useIdleTimer } from '@/lib/hooks/useIdleTimer'
import { Screensaver } from '@/components/screensaver'

// Inside Terminal():
const isIdle = useIdleTimer(90000, !gameState.active)

const handleDismissScreensaver = () => {
  // The idle timer resets on any input — just need to refocus
  inputRef.current?.focus()
}
```

In the JSX return, add the screensaver before the closing `</div>`:

```tsx
{isIdle && !gameState.active && (
  <Screensaver onDismiss={handleDismissScreensaver} />
)}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run lib/hooks/__tests__/useIdleTimer.test.ts`
Expected: PASS

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/useIdleTimer.ts lib/hooks/__tests__/useIdleTimer.test.ts components/screensaver.tsx components/terminal.tsx
git commit -m "feat: add matrix rain screensaver with idle timer"
```

---

### Task 12: Command palette

**Files:**
- Create: `components/command-palette.tsx`
- Modify: `components/terminal/InputLine.tsx` (add Ctrl+K handler)
- Modify: `components/terminal.tsx` (add palette state + rendering)
- Test: `components/__tests__/command-palette.test.tsx`

- [ ] **Step 1: Write test**

```typescript
// components/__tests__/command-palette.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandPalette } from '@/components/command-palette'

describe('CommandPalette', () => {
  it('renders search input', () => {
    render(<CommandPalette onClose={vi.fn()} onExecute={vi.fn()} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('shows all commands when input is empty', () => {
    render(<CommandPalette onClose={vi.fn()} onExecute={vi.fn()} />)
    expect(screen.getByText('help')).toBeInTheDocument()
    expect(screen.getByText('ls')).toBeInTheDocument()
  })

  it('filters results on input', () => {
    render(<CommandPalette onClose={vi.fn()} onExecute={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'hel' } })
    expect(screen.getByText('help')).toBeInTheDocument()
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(<CommandPalette onClose={onClose} onExecute={vi.fn()} />)
    fireEvent.keyDown(screen.getByPlaceholderText(/search/i), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onExecute with first command on Enter with empty query', () => {
    const onExecute = vi.fn()
    render(<CommandPalette onClose={vi.fn()} onExecute={onExecute} />)
    fireEvent.keyDown(screen.getByPlaceholderText(/search/i), { key: 'Enter' })
    // First command in VALID_COMMANDS is 'ls'
    expect(onExecute).toHaveBeenCalledWith('ls')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/command-palette.test.tsx`
Expected: FAIL

- [ ] **Step 3: Create `components/command-palette.tsx`**

```typescript
// components/command-palette.tsx
"use client"

import { useState, useRef, useEffect, useMemo } from 'react'
import { VALID_COMMANDS } from '@/components/terminal/types'
import { COMMAND_DESCRIPTIONS } from '@/lib/terminal-config'
import booksData from '@/data/books.json'
import vinylData from '@/data/vinyl.json'
import hardwareData from '@/data/hardware.json'
import notesData from '@/data/notes.json'

interface PaletteItem {
  type: 'command' | 'book' | 'vinyl' | 'hardware' | 'note'
  icon: string
  title: string
  subtitle: string
  command: string
}

interface CommandPaletteProps {
  onClose: () => void
  onExecute: (command: string) => void
}

function buildIndex(): PaletteItem[] {
  const items: PaletteItem[] = []

  // Commands
  for (const cmd of VALID_COMMANDS) {
    items.push({
      type: 'command',
      icon: '>',
      title: cmd,
      subtitle: COMMAND_DESCRIPTIONS[cmd] || '',
      command: cmd,
    })
  }

  // Books
  booksData.forEach((book: { title: string; author: string }) => {
    const filename = book.title.toLowerCase().replace(/[^a-z0-9]/g, '-')
    items.push({
      type: 'book',
      icon: '📖',
      title: book.title,
      subtitle: book.author,
      command: `cd ~/books && view ${filename}`,
    })
  })

  // Vinyl
  vinylData.forEach((record: { title: string; artist: string }) => {
    const filename = record.title.toLowerCase().replace(/[^a-z0-9]/g, '-')
    items.push({
      type: 'vinyl',
      icon: '💿',
      title: record.title,
      subtitle: record.artist,
      command: `cd ~/vinyl && view ${filename}`,
    })
  })

  // Hardware
  hardwareData.forEach((hw: { name: string; type: string }) => {
    const filename = hw.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    items.push({
      type: 'hardware',
      icon: '🖥',
      title: hw.name,
      subtitle: hw.type,
      command: `cd ~/hardware && view ${filename}`,
    })
  })

  // Notes
  notesData.forEach((note: { title: string; date: string }, idx: number) => {
    items.push({
      type: 'note',
      icon: '📝',
      title: note.title,
      subtitle: note.date,
      command: `notes ${idx + 1}`,
    })
  })

  return items
}

export function CommandPalette({ onClose, onExecute }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const allItems = useMemo(buildIndex, [])

  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show all commands when empty
      return allItems.filter(item => item.type === 'command')
    }
    const q = query.toLowerCase()
    return allItems
      .filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [query, allItems])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[selectedIndex]
      if (item) {
        onExecute(item.command)
        onClose()
      }
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center pt-[20%]" onClick={onClose}>
      <div
        className="w-[90%] max-w-[500px] bg-card border border-border font-mono"
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search commands, books, vinyl, hardware, notes..."
          className="w-full bg-background border-b border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          spellCheck={false}
          autoComplete="off"
        />
        <div className="max-h-[300px] overflow-y-auto">
          {filtered.map((item, i) => (
            <div
              key={`${item.type}-${item.title}-${i}`}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${
                i === selectedIndex ? 'bg-muted text-foreground' : 'text-muted-foreground'
              }`}
              onClick={() => {
                onExecute(item.command)
                onClose()
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="w-5 text-center shrink-0">{item.icon}</span>
              <span className="text-foreground">{item.title}</span>
              <span className="text-muted-foreground text-xs truncate">{item.subtitle}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">No results</div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add Ctrl+K to InputLine**

In `components/terminal/InputLine.tsx`, add to `handleKeyDown` (before the `Ctrl+C` handler):

```typescript
} else if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
  e.preventDefault()
  onCommandPalette?.()
```

Add `onCommandPalette?: () => void` to `InputLineProps`.

Also add a test to `components/terminal/__tests__/InputLine.test.tsx`:

```typescript
it('calls onCommandPalette on Ctrl+K', () => {
  const onCommandPalette = vi.fn()
  render(
    <InputLine
      value=""
      onChange={vi.fn()}
      onSubmit={vi.fn()}
      onTabComplete={vi.fn()}
      onHistoryUp={vi.fn()}
      onHistoryDown={vi.fn()}
      onClear={vi.fn()}
      onInterrupt={vi.fn()}
      onCommandPalette={onCommandPalette}
      prompt="~ $"
    />
  )
  const input = screen.getByRole('textbox')
  fireEvent.keyDown(input, { key: 'k', ctrlKey: true })
  expect(onCommandPalette).toHaveBeenCalled()
})
```

- [ ] **Step 5: Integrate into Terminal**

In `components/terminal.tsx`, add palette state and rendering:

```typescript
const [showPalette, setShowPalette] = useState(false)

const handleCommandPalette = () => setShowPalette(prev => !prev)

const handlePaletteExecute = (command: string) => {
  const parts = command.split(' && ')
  for (const part of parts) {
    handleCommand(part.trim())
  }
}
```

Pass `onCommandPalette={handleCommandPalette}` to `<InputLine>`.

Add palette rendering in JSX (inside the terminal div, before closing):

```tsx
{showPalette && (
  <CommandPalette
    onClose={() => { setShowPalette(false); inputRef.current?.focus() }}
    onExecute={handlePaletteExecute}
  />
)}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run components/__tests__/command-palette.test.tsx`
Expected: PASS

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add components/command-palette.tsx components/__tests__/command-palette.test.tsx components/terminal/InputLine.tsx components/terminal.tsx
git commit -m "feat: add Ctrl+K command palette with fuzzy search"
```

---

### Task 13: Apply CRT glow to primary text + final polish

**Files:**
- Modify: `components/terminal/TerminalLine.tsx` (add `crt-glow` to primary-colored lines)
- Modify: `components/terminal/InputLine.tsx` (add `crt-glow` to prompt)

- [ ] **Step 1: Add `crt-glow` class to primary-colored elements**

In `TerminalLine.tsx`, update `getColorClass`:
```typescript
case 'input':
  return 'text-primary crt-glow'
case 'success':
  return 'text-accent crt-glow'
case 'banner':
  return 'text-accent crt-glow'
```

In `InputLine.tsx`, add `crt-glow` to the prompt span:
```tsx
<span className="text-primary crt-glow">{prompt}</span>
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Visual check**

Run: `npm run dev`
Verify in browser:
- CRT scan lines and vignette visible
- Title bar shows hostname and theme
- Status bar shows directory, command count, sound state, Ctrl+K hint
- ASCII "ZACHARY" banner is centered
- Block cursor blinks in primary color
- Phosphor glow visible on prompt and command text
- `neofetch` shows ASCII art with system stats
- `sound on/off` works
- `view` shows cover images for books/vinyl
- Ctrl+K opens command palette, fuzzy search works, Enter executes
- Boot sequence plays on first visit (clear sessionStorage to test)
- Screensaver activates after 90s idle

- [ ] **Step 4: Commit**

```bash
git add components/terminal/TerminalLine.tsx components/terminal/InputLine.tsx
git commit -m "feat: apply CRT phosphor glow to primary-colored terminal text"
```

---

### Task 14: Source real CC0 sound files

**Files:**
- Replace: `public/sounds/keyclick.mp3`
- Replace: `public/sounds/error.mp3`
- Replace: `public/sounds/success.mp3`
- Replace: `public/sounds/submit.mp3`

- [ ] **Step 1: Download CC0 sound effects**

Search kenney.nl/assets, freesound.org, or opengameart.org for short retro sound effects. Each file must be:
- CC0 / public domain license
- Under 10KB
- Short and punchy (< 0.5 seconds)
- Retro/8-bit aesthetic

Suggested search terms:
- keyclick: "keyboard click 8bit", "typewriter key"
- error: "error beep retro", "wrong buzzer 8bit"
- success: "success chime 8bit", "level up retro"
- submit: "confirm blip retro", "select 8bit"

- [ ] **Step 2: Replace placeholder files**

Copy downloaded files to `public/sounds/`, keeping the exact filenames.

- [ ] **Step 3: Test sounds**

Run `npm run dev`, open browser, type `sound on`, verify:
- Keyclick plays softly on each character typed
- Error beep plays on invalid command
- Submit sound plays on Enter
- Sound persists across page reloads

- [ ] **Step 4: Commit**

```bash
git add public/sounds/
git commit -m "feat: add CC0 retro sound effect files"
```

---

### Task 15: Final integration test + build verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No new lint errors

- [ ] **Step 4: Start production server and test**

Run: `npm run start`
Open in browser. Test all 10 features end-to-end:
1. Boot sequence glitch-in on first visit
2. CRT scan lines + vignette + phosphor glow
3. Title bar + status bar chrome
4. Centered "ZACHARY" ASCII banner
5. Block cursor blinking
6. `neofetch` ASCII art + stats
7. `sound on` / `sound off`
8. `view` with cover images
9. Ctrl+K command palette
10. Screensaver after 90s idle

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final integration fixes for terminal visual overhaul"
```
