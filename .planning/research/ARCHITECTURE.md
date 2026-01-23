# Architecture Patterns: Terminal Decomposition

**Domain:** React terminal emulator refactoring
**Researched:** 2026-01-22
**Confidence:** HIGH

## Recommended Architecture

```
Terminal (orchestrator)
    |
    +-- TerminalProvider (context: history, gameState)
    |       +-- useTerminalHistory()
    |       +-- useGameState()
    |
    +-- HistoryDisplay --> TerminalLine --> SyntaxHighlighter
    +-- InputLine --> CommandInput, Prompt
    +-- CommandExecutor --> CommandRegistry
    +-- GameController --> game modules
    +-- VFSProvider --> useVFS()
```

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Terminal | Orchestration, layout | All via context |
| TerminalProvider | Shared state | Wraps all components |
| HistoryDisplay | Render history | TerminalLine |
| InputLine | Input area | CommandInput, Prompt |
| CommandExecutor | Execute commands | Registry, VFS, Games |
| GameController | Route game input | Game modules |

## Data Flow: Normal Command

```
User types "ls" + Enter
    → CommandInput.onKeyDown(Enter)
    → useTerminalInput().submit()
    → CommandExecutor.execute("ls")
    → CommandRegistry["ls"]() → useVFS().ls()
    → Returns: ["books", "vinyl", "hardware"]
    → useTerminalHistory().append()
    → HistoryDisplay re-renders
```

## Data Flow: Game

```
User types "game wordle" + Enter
    → CommandExecutor.execute("game", ["wordle"])
    → useGameState().start("wordle")
    → GameController mounts WordleGame
    → Input routed to game, not CommandExecutor
    → useGameHandler().handleInput()
    → On game over: useGameState().end()
```

## Key Patterns

### 1. Context + Hooks for Shared State

```typescript
const TerminalContext = createContext<TerminalContextValue | null>(null)

export function useTerminal() {
  const ctx = useContext(TerminalContext)
  if (!ctx) throw new Error("useTerminal must be within TerminalProvider")
  return ctx
}
```

### 2. Command Registry with Type Safety

```typescript
interface CommandHandler {
  (args: string[], ctx: CommandContext): CommandResult
}

const commands: Record<string, CommandHandler> = {
  ls: (args, { vfs }) => vfs.ls(args[0]),
  cd: (args, { vfs }) => vfs.cd(args[0] || "~") || "",
}
```

### 3. Discriminated Union for Game State

```typescript
type GameState =
  | { active: false; type: null }
  | { active: true; type: "number"; data: NumberGameData }
  | { active: true; type: "wordle"; data: WordleGameData }
```

### 4. Extracted Game Modules

```typescript
// games/wordle.ts
export function createWordleState(): WordleState
export function handleWordleGuess(state, guess): { output, newState, gameOver }
export function getWordleStartMessage(): string[]
```

## Build Order

1. **Phase 1 (Foundation):** Types, VFS Provider
2. **Phase 2 (Core Hooks):** useTerminalHistory, useGameState, useTheme
3. **Phase 3 (Games):** Individual game modules + GameController
4. **Phase 4 (Commands):** CommandRegistry + CommandExecutor
5. **Phase 5 (UI):** HistoryDisplay, InputLine, SyntaxHighlighter

## Final File Structure

```
components/terminal/
    Terminal.tsx, TerminalProvider.tsx, HistoryDisplay.tsx, InputLine.tsx

components/games/
    GameController.tsx, NumberGame.tsx, WordleGame.tsx, tron-game.tsx

hooks/
    useTerminalHistory.ts, useGameState.ts, useVFS.ts, useTheme.ts

commands/
    registry.ts, executor.ts, completion.ts

types/
    terminal.ts, game.ts, vfs.ts
```

---
*Architecture research: 2026-01-22*
