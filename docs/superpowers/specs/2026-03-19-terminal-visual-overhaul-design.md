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

- Component renders two absolutely-positioned `div` elements (scan lines + vignette) with `pointer-events: none` and `z-index` above terminal content but below modals/games.
- Phosphor glow is a CSS class applied in `globals.css`, used by `TerminalLine` and `InputLine` on primary-colored text.
- CRT effects must be theme-aware — glow color matches the current theme's primary.

### Theme Awareness

The phosphor glow `text-shadow` color must use the CSS variable `var(--primary)` so it automatically adapts when themes change. The scan line and vignette overlays are theme-independent (they use black transparency).

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
- **Left side:** Current directory with `▸` prefix in primary color, command count ("29 commands")
- **Right side:** Sound toggle indicator (speaker emoji + "on"/"off"), "Ctrl+K search" hint

### Data Flow

- `terminal-chrome.tsx` needs: `currentDirectory`, `currentTheme`, `soundEnabled` from the terminal.
- These values should be lifted to shared state or passed via props. Options:
  - **Props drilling:** Terminal exposes these via a callback/ref
  - **React context:** Create a `TerminalContext` that both chrome and terminal consume
  - **Recommendation:** Use React context (`TerminalContext`) since multiple components need this state (chrome, command palette, screensaver)

### Composition in page.tsx

```
<BootSequence>
  <TerminalChrome>
    <Terminal />
    <CRTEffects />
  </TerminalChrome>
</BootSequence>
```

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

- Banner lines use type `success` (renders in primary/accent color)
- Tagline: `"developer  ·  collector  ·  gamer"` in muted color
- Help text: `"Type 'help' for available commands or Ctrl+K to search."`
- Banner + tagline + help text are **centered** in the terminal viewport
- All subsequent command output is **left-aligned** as normal
- Implementation: Add a `centered` boolean to the `TerminalLine` type. `TerminalLine` component checks this and applies `text-align: center` wrapper. The ASCII art block itself stays `text-align: left` inside an `inline-block` container so the monospace characters align correctly while the block as a whole is centered.
- The `clear` command resets to this same centered welcome state.

---

## Feature 4: Status Bar

Covered in Feature 2 (Terminal Chrome). The status bar is the bottom section of the chrome component.

---

## Feature 5: Enhanced Neofetch

**Modified file:** `components/terminal.tsx` — rewrite `neofetch` command handler

### Layout

Two-column output using monospace alignment:

```
  ┌──────────┐
  │  ██████  │   zachary@home
  │  █    █  │   ──────────────
  │  █    █  │   OS: CYBER_PORTFOLIO v1.0
  │  ██████  │   Shell: zach-sh
  │  ██  ██  │   Theme: lumon
  │          │   Font: JetBrains Mono
  └──────────┘   Collections: 42 books, 28 vinyl, 5 hardware
                 Games: 8 available
                 Uptime: 2m 31s
```

- Left column: Small ASCII art icon (stylized monitor/terminal, ~8 lines tall) rendered in primary color
- Right column: System stats, with labels in primary and values in foreground
- Uptime calculated from `performance.now()` or a timestamp stored on component mount
- Collection counts derived from the imported JSON data lengths
- Theme and font reflect current selections

---

## Feature 6: Block Cursor + Idle Screensaver

### Block Cursor

**Modified file:** `components/terminal/InputLine.tsx`, `app/globals.css`

- Replace the browser's thin caret with a solid blinking block character
- Implementation: The transparent-text-with-overlay technique is already in place. Add a `::after` pseudo-element on the overlay div that renders a solid block (`█`) at the cursor position, or append a `<span>` element styled as a block cursor after the highlighted text.
- Simpler approach: Add a blinking block `<span>` after the syntax-highlighted overlay that tracks the cursor position (character count × character width).
- Blink animation: CSS `@keyframes` — opacity 1 → 0 with `step-end` timing, 1s cycle.
- Color: `var(--primary)`

### Idle Screensaver

**New file:** `components/screensaver.tsx`

- **Trigger:** 90 seconds of no keyboard/mouse input within the terminal
- **Effect:** Matrix rain — columns of falling characters in primary color with varying opacity, rendered on a `<canvas>` element that fades in (opacity transition) over the terminal content
- **Dismiss:** Any keypress, click, or mouse movement instantly fades it out and refocuses the input
- **Characters:** Mix of Latin letters, numbers, and katakana-style characters
- **Performance:** Single `requestAnimationFrame` loop, cancelled on dismiss. Canvas is only mounted when screensaver is active.
- **Integration:** Idle timer lives in the terminal component. When triggered, renders `<Screensaver>` as an overlay. Passes `onDismiss` callback.

---

## Feature 7: Boot Sequence

**New file:** `components/boot-sequence.tsx`

### Behavior

- **Duration:** ~3 seconds
- **Gate:** Checks `sessionStorage.getItem('boot-complete')`. If present, skips directly to terminal.
- **Skip:** Clicking anywhere or pressing any key immediately completes the animation and shows the terminal.
- **On complete:** Sets `sessionStorage.setItem('boot-complete', 'true')`

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
- `boot-sequence.tsx` is an overlay `div` with `position: absolute; inset: 0` that applies CSS transforms and clip-paths to a duplicate or mirrored version of the content
- Alternatively: the overlay is a solid black screen that "breaks apart" with animated clip-path reveals, simpler and more performant
- All animation is CSS `@keyframes` — no JS animation loops
- Component unmounts itself after animation completes

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

### Integration

- `sound on` / `sound off` command added to terminal command handler
- `sound` without args shows current state
- Keyclick fires on `onChange` in InputLine (when enabled)
- Error/success fire when terminal adds lines of those types
- Status bar shows current sound state

### Sourcing Sound Files

Must find CC0/public domain retro sound effects. Candidates:
- freesound.org (filter by CC0 license)
- opengameart.org
- kenney.nl/assets (all CC0)

Keep files small — each should be under 10KB. Short, punchy sounds only.

---

## Feature 9: Richer Collection Rendering

**Modified file:** `components/terminal.tsx` — update `view` command handler, update `TerminalLine` component

### Behavior

When `view` is used on a book or vinyl record that has a `cover` URL in the JSON data:

- Render a small cover image (max ~80px wide) above the text metadata
- Use an `<img>` tag with the cover URL
- Style: small border in `var(--border)`, no border-radius
- Fallback: If image fails to load (`onError`), hide the image element and show metadata only (current behavior)
- Only show images for `view` command, not `cat` or `ls`

### Implementation

- Add a new `TerminalLine` type: `image` with an `src` property
- `TerminalLine` component renders `<img>` for this type
- `view` command handler inserts an `image` line before the text metadata lines
- Images are naturally inline in the terminal output flow

---

## Feature 10: Command Palette

**New file:** `components/command-palette.tsx`

### Trigger

- `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)
- Intercepted in `InputLine.tsx` keyboard handler, bubbles up to terminal which toggles palette visibility

### UI

- **Overlay:** Semi-transparent black backdrop (`rgba(0,0,0,0.5)`) covering the full terminal area
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

### Selection

- **Arrow keys:** Navigate up/down through results
- **Enter:** Execute the selected item:
  - Commands: Run the command as if typed (e.g., selecting "help" runs `help`)
  - Collection items: Run `view [item]` to display it (navigates to correct directory first if needed)
  - Notes: Run `notes [id]` to display the note
- **Escape:** Close palette, refocus terminal input
- **Click:** Same as Enter on the clicked item

### Data Sources

- Commands: Import from `VALID_COMMANDS` + a description map
- Books: Import from `books.json` — searchable by title, author
- Vinyl: Import from `vinyl.json` — searchable by title, artist
- Hardware: Import from `hardware.json` — searchable by name, type
- Notes: Import from `notes.json` — searchable by title

---

## Shared State: TerminalContext

**New file:** `lib/terminal-context.tsx`

Several features need shared access to terminal state. Create a React context:

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

- Provider wraps the terminal + chrome in `page.tsx`
- Terminal component provides values via the context
- Chrome (title bar, status bar) consumes from context
- Command palette consumes `executeCommand` to run selected commands

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
| `lib/hooks/useSound.ts` | Sound effects hook |
| `lib/hooks/useIdleTimer.ts` | Idle detection for screensaver |
| `public/sounds/*.mp3` | CC0 retro sound effect files |

### Modified Files
| File | Changes |
|------|---------|
| `app/page.tsx` | Compose boot → chrome → terminal → CRT stack |
| `app/globals.css` | CRT glow classes, block cursor styles, glitch keyframes, palette styles |
| `components/terminal.tsx` | ASCII banner welcome (centered), enhanced neofetch, richer view, sound command, idle timer, Ctrl+K handler, context provider |
| `components/terminal/InputLine.tsx` | Block cursor rendering, Ctrl+K intercept, keyclick trigger |
| `components/terminal/TerminalLine.tsx` | Centered line support, image line type, CRT glow class |
| `lib/types/terminal.ts` | Add `centered`, `image` line type, `src` property |

### Unchanged
- All game components
- VFS (`lib/vfs.ts`)
- Database / API routes
- Data files (`data/*.json`)
- Test files (new tests should be added for new components)
