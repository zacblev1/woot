# Terminal Visual Overhaul — Design Spec

## Overview

Ten visual and UX improvements to the retro terminal portfolio site, transforming it from a functional terminal emulator into an atmospheric, immersive experience. All changes preserve the existing terminal metaphor and command system while adding layers of polish, interactivity, and delight.

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CRT intensity | Subtle & Refined | Effects enhance without dominating; no flicker |
| Boot sequence | Cinematic glitch-in | Modern, less literal than BIOS simulation |
| ASCII banner | Block letters, "ZACHARY" | Bold, iconic terminal aesthetic |
| Welcome alignment | Centered banner, left-aligned commands | Hero moment on arrival, terminal authenticity once typing |
| Sound implementation | Audio sprite files (CC0) | Real retro sounds, must be sourced free |
| Command palette scope | Commands + collections + notes | Everything searchable |

## Z-Index Stacking Order

All overlays use this hierarchy:

| Layer | Z-Index | Component |
|-------|---------|-----------|
| CRT effects (scan lines + vignette) | `z-10` | `crt-effects.tsx` |
| Screensaver | `z-30` | `screensaver.tsx` |
| Command palette backdrop + modal | `z-40` | `command-palette.tsx` |
| Arcade games (tron, pacman, basketball) | `z-50` | Existing game overlays |
| Boot sequence overlay | `z-50` | `boot-sequence.tsx` |

Screensaver is below command palette so that if a user presses Ctrl+K while the screensaver is fading out, the palette renders above it without z-index conflicts.

---

## Feature 1: CRT Effects Layer

**New file:** `components/crt-effects.tsx`

A purely visual overlay component that wraps or sits atop the terminal content. All CSS, zero JavaScript logic.

### Effects

- **Scan lines:** Repeating linear gradient overlay. 2px transparent / 2px semi-transparent black (opacity ~0.06). Applied via `::after` pseudo-element with `pointer-events: none`.
- **Phosphor glow:** `text-shadow` on primary-colored text elements. Value: `0 0 4px rgba(primary, 0.3)`. Applied via CSS class `.crt-glow` added to relevant text.
- **Vignette:** Radial gradient from transparent center (60%) to semi-transparent black edges (opacity 0.35). Applied as an absolutely-positioned overlay.
- **No flicker.** No screen curvature.

### Integration

- Component renders two absolutely-positioned `div` elements (scan lines + vignette) with `pointer-events: none` and `z-10`.
- Phosphor glow is a CSS class applied in `globals.css`, used by `TerminalLine` and `InputLine` on primary-colored text.
- CRT effects must be theme-aware — glow color matches the current theme's primary.

### Theme Awareness

The phosphor glow `text-shadow` color must use the CSS variable `var(--primary)` so it automatically adapts when themes change. The scan line and vignette overlays are theme-independent (they use black transparency).

CSS class in `globals.css`:
```css
.crt-glow {
  text-shadow: 0 0 4px color-mix(in srgb, var(--primary) 30%, transparent);
}
```

---

## Feature 2: Terminal Window Chrome

**New file:** `components/terminal-chrome.tsx`

Wraps the `<Terminal />` component with a title bar (top) and status bar (bottom).

### Title Bar

- **Height:** ~28px
- **Background:** `var(--card)` with `border-bottom: 1px solid var(--border)`
- **Left side:** Three decorative traffic-light dots (red `#f56565`, yellow `#ecc94b`, green `#48bb78`), each 10px circles. Purely decorative, no click handlers.
- **Left side (after dots):** Text showing `zachary@home: [currentDirectory]` in `var(--muted-foreground)`
- **Right side:** Active theme name in `var(--muted-foreground)`

### Status Bar

- **Height:** ~22px
- **Background:** `var(--card)` with `border-top: 1px solid var(--border)`
- **Left side:** Current directory with `▸` prefix in primary color, command count (dynamic, derived from `VALID_COMMANDS.length`)
- **Right side:** Sound toggle indicator (speaker emoji + "on"/"off"), "Ctrl+K search" hint

### Data Flow

Use React context (`TerminalContext`) since multiple components need terminal state (chrome, command palette, screensaver). See Shared State section.

### Composition in page.tsx

The existing `page.tsx` wrapper div has sizing classes (`h-full w-screen`, `max-w-4xl`, `h-[80vh]`, `bg-card`, `border border-border`, `shadow-2xl`). These **move to `TerminalChrome`** — the chrome component owns the outer container styling. `page.tsx` becomes:

```tsx
<div className="h-full w-screen flex items-center justify-center bg-background p-2 md:p-8">
  <BootSequence>
    <TerminalChrome>
      <Terminal />
      <CRTEffects />
    </TerminalChrome>
  </BootSequence>
</div>
```

`TerminalChrome` applies `w-full max-w-4xl h-full md:h-[80vh] bg-card border border-border shadow-2xl` as its outer wrapper, plus the title bar and status bar inside. This avoids double-border issues.

---

## Feature 3: ASCII Art Welcome Banner

**Modified file:** `components/terminal.tsx` — update `initialHistory`

### Banner Content

```
 ███████╗ █████╗  ██████╗██╗  ██╗ █████╗ ██████╗ ██╗   ██╗
 ╚══███╔╝██╔══██╗██╔════╝██║  ██║██╔══██╗██╔══██╗╚██╗ ██╔╝
   ███╔╝ ███████║██║     ███████║███████║██████╔╝ ╚████╔╝
  ███╔╝  ██╔══██║██║     ██╔══██║██╔══██║██╔══██╗  ╚██╔╝
 ███████╗██║  ██║╚██████╗██║  ██║██║  ██║██║  ██║   ██║
 ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝
```

### Rendering

- Banner lines use a new type `banner` (renders in primary/accent color, same styling as `success` but does not trigger the success sound effect)
- Tagline: `"developer  ·  collector  ·  gamer"` in muted color
- Help text: `"Type 'help' for available commands or Ctrl+K to search."`
- Banner + tagline + help text are **centered** in the terminal viewport
- All subsequent command output is **left-aligned** as normal
- Implementation: Add an optional `centered?: boolean` property to the `TerminalLine` interface. `TerminalLine` component checks this and applies `text-align: center` wrapper. The ASCII art block itself stays `text-align: left` inside an `inline-block` container so the monospace characters align correctly while the block as a whole is centered.
- The `clear` command resets to this same centered welcome state. Change `clear` to be handled as a special case in the dispatch logic: when the command is `clear`, call `setHistory(initialHistory)` directly and skip the normal return-value-to-output flow. This avoids the current issue where `clear` returns `""` which appends an extra blank line.

### Command Handler Return Type Update

The current command handler type is roughly `(args: string[]) => string | string[] | { text: string; href: string }[] | ...`. Update to also accept:
- `null` — command handled its own output (like `clear`), dispatch should not append anything
- `TerminalLine[]` — pre-built terminal lines (like `view` with images), dispatch should append directly

Detection: if result is `null`, skip. If result is an array and first element has a `type` property (i.e., is a `TerminalLine` object not a plain string), spread the full objects into history (using `{ ...item }` to preserve all properties including `src`, `centered`, `href`).

### Updated TerminalLine Interface

```typescript
type TerminalLineType = 'input' | 'output' | 'error' | 'success' | 'link' | 'wordle' | 'image' | 'banner'

interface TerminalLine {
  type: TerminalLineType
  content: string
  href?: string       // for 'link' type
  src?: string         // for 'image' type — the image URL
  centered?: boolean   // if true, line is rendered centered
}
```

- `image` type uses `src` for the image URL. `content` serves as alt text.
- `banner` type renders identically to `success` (primary/accent color) but does NOT trigger sound effects. Used for the ASCII welcome banner so that `clear` and initial render don't fire success chimes.
- Both `src` and `centered` are optional and only relevant for their respective use cases.
- All types live in `lib/types/terminal.ts` as the canonical location. `ThemeName` and `FontName` are defined in `lib/terminal-config.ts` and re-exported from `lib/types/terminal.ts` for convenience.

---

## Feature 4: Status Bar

Covered in Feature 2 (Terminal Chrome). The status bar is the bottom section of the chrome component.

---

## Feature 5: Enhanced Neofetch

**Modified file:** `components/terminal.tsx` — rewrite `neofetch` command handler

### Layout

Two-column output using monospace alignment. All values are **dynamic** — the example below shows sample output:

```
  ┌──────────┐
  │  ██████  │   zachary@home
  │  █    █  │   ──────────────
  │  █    █  │   OS: CYBER_PORTFOLIO v1.0
  │  ██████  │   Shell: zach-sh
  │  ██  ██  │   Theme: [currentTheme name]
  │          │   Font: [currentFont name]
  └──────────┘   Collections: [N] books, [N] vinyl, [N] hardware
                 Games: [count] available
                 Uptime: [calculated]
```

- Left column: Small ASCII art icon (stylized monitor/terminal, ~8 lines tall) rendered in primary color
- Right column: System stats, with labels in primary and values in foreground
- **Uptime:** Calculated from a `mountTime` ref set via `useRef(Date.now())` in the terminal component. Display as `Xm Ys`.
- **Collection counts:** Derived dynamically from imported JSON data: `booksData.length`, `vinylData.length`, `hardwareData.length`
- **Game count:** Derived from a constant array of game names (not hardcoded number). Define `const GAME_NAMES = ['number', 'wordle', 'trivia', 'blackjack', 'rps', 'tron', 'pacman', 'basketball'] as const` and use `GAME_NAMES.length`. Exclude `suggest` as it's not a game. Note: `GAME_NAMES` is for display purposes only — the `GameState.type` union in `terminal.tsx` remains unchanged (it still includes `suggest`). These are intentionally separate: one is UI-facing, the other is internal state.
- **Theme/Font:** Use `themes[currentTheme].name` and `fonts[currentFont].name` (dynamic, reflects current selection)

---

## Feature 6: Block Cursor + Idle Screensaver

### Block Cursor

**Modified file:** `components/terminal/InputLine.tsx`, `app/globals.css`

- Replace the browser's thin caret with a solid blinking block character
- Implementation: The transparent-text-with-overlay technique is already in place. Add a blinking block `<span>` element after the syntax-highlighted overlay text. The span renders a solid colored block positioned at the end of the rendered tokens. Use `display: inline-block; width: 1ch; height: 1.2em; background: var(--primary)` so it sizes correctly with any monospace font.
- Important: The overlay uses `text-base md:text-sm` (matching the input). The block cursor span must be a sibling within the same overlay container so it inherits the same font-size and `1ch` resolves correctly.
- Blink animation: CSS `@keyframes cursor-blink` — opacity 1 → 0 with `step-end` timing, 1s cycle.
- Color: `var(--primary)`
- Hide the browser's native caret by keeping `caret-color: transparent` on the input.

### Idle Screensaver

**New file:** `components/screensaver.tsx`

- **Trigger:** 90 seconds of no keyboard/mouse input within the terminal
- **Scope:** The screensaver canvas covers the terminal content area (inside the chrome, between title bar and status bar). It does NOT cover the full viewport — it's an overlay within the `TerminalChrome` container, positioned `absolute` relative to the chrome wrapper.
- **Effect:** Matrix rain — columns of falling characters in primary color with varying opacity, rendered on a `<canvas>` element that fades in (opacity transition) over the terminal content
- **Dismiss:** Any keypress, click, or mouse movement instantly fades it out and refocuses the input
- **Characters:** Mix of Latin letters, numbers, and katakana-style characters
- **Performance:** Single `requestAnimationFrame` loop, cancelled on dismiss. Canvas is only mounted when screensaver is active.
- **Z-index:** `z-30` (above CRT effects, below command palette and games)
- **Disabled during games:** The idle timer must be paused when `gameState.active` is true. Arcade games have their own input handling and the screensaver should not activate (or consume resources) during gameplay.
- **Integration:** Idle timer lives in a custom hook `useIdleTimer.ts`. Terminal component uses it and conditionally renders `<Screensaver>` as an overlay with `onDismiss` callback. The hook accepts an `enabled` boolean parameter — pass `!gameState.active`.

---

## Feature 7: Boot Sequence

**New file:** `components/boot-sequence.tsx`

Note: A previous `boot-sequence.tsx` existed and was removed in commit `7cef17f`. This is a completely new implementation with different behavior (glitch-in vs. the prior typewriter BIOS style).

### Behavior

- **Duration:** ~3 seconds
- **Gate:** Checks `sessionStorage.getItem('boot-v2-complete')`. Uses `boot-v2-complete` key (not `boot-complete`) to avoid conflicts with the prior boot sequence's sessionStorage key that may persist in returning visitors' browsers.
- **Skip:** Clicking anywhere or pressing any key immediately completes the animation and shows the terminal.
- **On complete:** Sets `sessionStorage.setItem('boot-v2-complete', 'true')`

### Visual Sequence

1. **0-0.5s:** Screen is black
2. **0.5-2s:** Rapid visual glitches — the terminal content is rendered but obscured by:
   - `clip-path` slicing revealing random horizontal bands
   - `transform: skew()` + `translateX()` jittering
   - Color channel separation (text-shadow with offset red/blue copies)
   - Brief flashes of garbled text or static noise
3. **2-3s:** Glitch intensity decreases, terminal "stabilizes" — skew reduces to 0, clip-path opens fully, color separation resolves
4. **3s:** Animation complete, overlay removed, terminal is fully interactive

### Implementation

- The terminal is rendered at full opacity underneath
- `boot-sequence.tsx` is an overlay `div` with `position: absolute; inset: 0; z-index: z-50` that applies CSS transforms and clip-paths
- The overlay is a solid black screen that "breaks apart" with animated clip-path reveals — simpler and more performant than duplicating content
- All animation is CSS `@keyframes` — no JS animation loops
- Component unmounts itself after animation completes (via `onAnimationEnd` or `setTimeout`)
- Component accepts `children` and renders them, with the overlay on top
- **CRT effects during boot:** CRT scan lines and vignette ARE visible during the boot sequence — they show through the glitch animation gaps, which adds to the atmosphere. This is intentional.

---

## Feature 8: Sound Effects

**New file:** `lib/hooks/useSound.ts`
**New directory:** `public/sounds/`

### Sound Files (CC0/free sources to find)

| Sound | Trigger | File |
|-------|---------|------|
| Keyclick | Each character typed | `keyclick.mp3` |
| Error beep | Invalid command / error output | `error.mp3` |
| Success chime | Game win / success output | `success.mp3` |
| Command submit | Enter key pressed | `submit.mp3` |

### `useSound` Hook

```typescript
interface UseSoundReturn {
  enabled: boolean
  toggle: () => void
  play: (sound: 'keyclick' | 'error' | 'success' | 'submit') => void
}
```

- **State:** `enabled` boolean, persisted to `localStorage` key `sound-enabled`
- **Default:** OFF (sound disabled by default)
- **Loading:** Audio files loaded lazily on first `sound on` command. Uses `Audio` objects pooled for rapid playback (keyclick needs to fire rapidly).
- **Volume:** Keyclick very quiet (0.1), others moderate (0.3-0.4)

### Command Integration

- Add `sound` to `VALID_COMMANDS` in `components/terminal/types.ts`
- Add `sound` command handler: `sound on` / `sound off` toggles, `sound` without args shows current state
- Add `sound` to the `help` command output under the "STYLE" category (alongside `theme` and `font`)
- Add `man sound` manual page entry:

```
man sound:
  NAME
      sound - toggle sound effects
  SYNOPSIS
      sound [on|off]
  DESCRIPTION
      Enable or disable retro sound effects. When enabled, plays
      keyclick sounds on typing, beeps on errors, and chimes on
      success. Sound preference is saved to localStorage.
      Without arguments, displays current sound state.
  EXAMPLES
      sound on        Enable sound effects
      sound off       Disable sound effects
      sound           Show current state
```

### Sound Trigger Points

- Keyclick fires on `onChange` in InputLine (when enabled)
- Error fires when terminal adds a line with type `error`
- Success fires when terminal adds a line with type `success` (NOT `banner` — banner type is silent)
- Submit fires on Enter key in InputLine (when enabled)
- Status bar shows current sound state

### Sourcing Sound Files

Must find CC0/public domain retro sound effects. Candidates:
- freesound.org (filter by CC0 license)
- opengameart.org
- kenney.nl/assets (all CC0)

Keep files small — each should be under 10KB. Short, punchy sounds only.

---

## Feature 9: Richer Collection Rendering

**Modified files:** `components/terminal.tsx`, `components/terminal/TerminalLine.tsx`

### Behavior

When `view` is used on a book or vinyl record that has a `cover` URL in the JSON data:

- Render a small cover image (max ~80px wide) above the text metadata
- Use an `<img>` tag with the cover URL
- Style: small border in `var(--border)`, no border-radius
- Fallback: If image fails to load (`onError`), hide the image element and show metadata only (current behavior)
- Only show images for `view` command, not `cat` or `ls`

### Implementation

The `view` command currently returns `string[]`. To support images, change the approach:

- The `view` command handler checks if the item has a `cover` property
- If yes, it constructs a `TerminalLine[]` array directly (instead of `string[]`) with an `{ type: 'image', content: itemTitle, src: coverUrl }` line followed by the regular text lines as `{ type: 'output', content: text }` entries
- The command dispatch logic (around line 1773) must be updated to handle command handlers that return `TerminalLine[]` in addition to `string | string[]`. Check: if the return value is an array and the first element is an object (not a string), treat it as `TerminalLine[]` and append directly instead of wrapping each string in `{ type: 'output' }`.
- `TerminalLine` component renders `<img>` for the `image` type, using `line.src` as the source and `line.content` as alt text.

### Note on `view` path context

The current `view` implementation checks `pwd.includes("/books")` to decide formatting. This means `view ~/books/dune` from `~` would not format correctly (existing bug). The command palette works around this by using `cd ~/books && view [filename]`. For this spec, we accept this workaround. Fixing `view` to derive context from the resolved node's path rather than `pwd` is a separate improvement outside this spec's scope.

---

## Feature 10: Command Palette

**New file:** `components/command-palette.tsx`

### Trigger

- `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)
- Intercepted in `InputLine.tsx` keyboard handler. Must call `e.preventDefault()` to prevent browser default behavior (some browsers use Ctrl+K for the address bar).
- Bubbles up via callback to terminal which toggles palette visibility.

### UI

- **Overlay:** Semi-transparent black backdrop (`rgba(0,0,0,0.5)`) covering the full terminal chrome area
- **Z-index:** `z-40`
- **Modal:** Centered horizontally, positioned near top (~20% from top). Width ~90% of terminal, max ~500px.
- **Background:** `var(--card)` with `border: 1px solid var(--border)`
- **Search input:** Full-width text input at top, auto-focused, styled to match terminal aesthetic
- **Results list:** Below input, max height ~300px with overflow scroll. Each result shows:
  - Icon/prefix indicating type: `>` for commands, `📖` for books, `💿` for vinyl, `🖥` for hardware, `📝` for notes
  - Title/name
  - Subtitle (command description, or author/artist)
  - Matched characters highlighted in primary color

### Search Behavior

- **Fuzzy matching:** Case-insensitive substring match on title/name and description/author
- **Ranking:** Commands first, then collections sorted by match quality
- **Max results:** Show top 10 matches
- **Empty state:** Show all commands when input is empty (most useful default)

### Selection & Execution

- **Arrow keys:** Navigate up/down through results
- **Enter:** Execute the selected item (see Execution Strategy below)
- **Escape:** Close palette, refocus terminal input
- **Click:** Same as Enter on the clicked item

### Execution Strategy

Each palette result carries a pre-computed command string that gets passed to `executeCommand` from the `TerminalContext`:

| Item Type | Command Executed |
|-----------|-----------------|
| Command | The command name itself (e.g., `help`, `about`) |
| Book | `cd ~/books && view [filename]` where filename is derived from the book's title (matching how VFS stores it) |
| Vinyl | `cd ~/vinyl && view [filename]` |
| Hardware | `cd ~/hardware && view [filename]` |
| Note | `notes [1-based-index]` where index is `notesData.indexOf(note) + 1` |

The `executeCommand` function in `TerminalContext` handles multi-command strings by splitting on `&&` and executing sequentially. This ensures the working directory is correct before `view` runs.

### Data Sources

- Commands: Import from `VALID_COMMANDS` + a description map (new constant `COMMAND_DESCRIPTIONS: Record<string, string>`)
- Books: Import from `books.json` — searchable by title, author
- Vinyl: Import from `vinyl.json` — searchable by title, artist
- Hardware: Import from `hardware.json` — searchable by name, type
- Notes: Import from `notes.json` — searchable by title. Index derived from array position.

---

## Shared State: TerminalContext

**New file:** `lib/terminal-context.tsx`

Several features need shared access to terminal state. Create a React context.

### Extracting Shared Types

The `themes` and `fonts` objects are currently defined locally in `components/terminal.tsx` and are not exported. They must be extracted to a shared module so that `TerminalContext`, chrome, and palette can access them:

- **New file:** `lib/terminal-config.ts` — exports `themes`, `fonts`, `ThemeName`, `FontName`, `GAME_NAMES`, `COMMAND_DESCRIPTIONS`
- Update `components/terminal.tsx` to import from `lib/terminal-config.ts` instead of defining locally
- Update `lib/types/terminal.ts` to import `ThemeName`/`FontName` from `lib/terminal-config.ts` (or re-export)

### Context Interface

```typescript
interface TerminalContextValue {
  currentDirectory: string
  currentTheme: ThemeName
  currentFont: FontName
  soundEnabled: boolean
  toggleSound: () => void
  executeCommand: (command: string) => void
}
```

### Provider Placement

The provider must wrap both `TerminalChrome` and `Terminal` so chrome can consume context values that Terminal provides. The architecture:

1. `page.tsx` renders `<TerminalContextProvider>` wrapping everything
2. `Terminal` component calls `useTerminalContext()` to **push** its state into context via a `useEffect` that updates context whenever `currentDirectory`, `currentTheme`, `currentFont`, or `soundEnabled` change
3. `TerminalChrome` calls `useTerminalContext()` to **read** state for display
4. `CommandPalette` calls `useTerminalContext()` to get `executeCommand`

Implementation: `TerminalContextProvider` holds the shared state. Terminal component receives setter callbacks (or uses the context's update methods) to sync its internal state to the context. This avoids the chicken-and-egg problem of Terminal providing context while also being inside it.

```tsx
// page.tsx
<div className="h-full w-screen flex items-center justify-center bg-background p-2 md:p-8">
  <TerminalContextProvider>
    <BootSequence>
      <TerminalChrome>
        <Terminal />
        <CRTEffects />
      </TerminalChrome>
    </BootSequence>
  </TerminalContextProvider>
</div>
```

### `executeCommand` Behavior

`executeCommand` supports `&&`-chained commands for the command palette's `cd ~/books && view filename` pattern:

- Split input on ` && ` (with spaces to avoid false matches in arguments)
- Execute each command synchronously and sequentially via the existing `handleCommand` function
- **Error handling:** Like bash `&&`, stop execution on the first command that produces an error line. If `cd ~/books` fails, don't run `view filename`
- The function is defined in `TerminalContextProvider` and delegates to a ref pointing to `handleCommand` inside `Terminal`

### COMMAND_DESCRIPTIONS

Define in `lib/terminal-config.ts`. Used by the command palette for subtitle text:

```typescript
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

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `components/crt-effects.tsx` | Scan line + vignette overlay |
| `components/boot-sequence.tsx` | Cinematic glitch-in animation |
| `components/terminal-chrome.tsx` | Title bar + status bar wrapper |
| `components/command-palette.tsx` | Ctrl+K fuzzy search overlay |
| `components/screensaver.tsx` | Matrix rain idle effect |
| `lib/terminal-context.tsx` | Shared terminal state context |
| `lib/terminal-config.ts` | Extracted themes, fonts, game names, command descriptions |
| `lib/hooks/useSound.ts` | Sound effects hook |
| `lib/hooks/useIdleTimer.ts` | Idle detection for screensaver |
| `public/sounds/*.mp3` | CC0 retro sound effect files |

### Modified Files
| File | Changes |
|------|---------|
| `app/page.tsx` | Compose boot → chrome → terminal → CRT stack; remove container styling (moved to chrome) |
| `app/globals.css` | CRT glow class, block cursor styles, glitch keyframes |
| `components/terminal.tsx` | ASCII banner welcome (centered), enhanced neofetch, richer view (returns TerminalLine[]), sound command, idle timer, Ctrl+K handler, context provider, import themes/fonts from shared module |
| `components/terminal/InputLine.tsx` | Block cursor rendering, Ctrl+K intercept (with `e.preventDefault()`), keyclick trigger |
| `components/terminal/TerminalLine.tsx` | Centered line support, image line type rendering, CRT glow class on primary text |
| `components/terminal/types.ts` | Add `sound` to `VALID_COMMANDS` |
| `lib/types/terminal.ts` | Add `image` and `banner` to `TerminalLineType` union, add optional `src` and `centered` properties to `TerminalLine` interface, re-export `ThemeName`/`FontName` from `terminal-config.ts` |

### Unchanged
- All game components
- VFS (`lib/vfs.ts`)
- Database / API routes
- Data files (`data/*.json`)
- Test files (new tests should be added for new components)
