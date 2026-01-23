# Phase 4: Commands - Research

**Researched:** 2026-01-22
**Domain:** Command registry architecture, dependency injection, testable terminal commands
**Confidence:** HIGH

## Summary

This research investigates how to create a registry-based command system that is unit testable without UI. The primary challenge is extracting 20+ commands from terminal.tsx into a data structure where each command can receive injectable context (VFS, history, games, theme, font) rather than accessing globals or closures.

The established pattern from Phase 3 (games) provides an excellent template: pure functions that receive data and return results. Commands will follow the same pattern: `execute(args, context) => CommandResult`. This enables testing commands by providing mock context objects without rendering any React components.

Tab completion is a secondary concern that requires matching partial input against command names and filesystem paths. The existing codebase already has a `getCompletions` function that can be extracted and enhanced.

**Primary recommendation:** Use a Map-based CommandRegistry with typed CommandDefinition objects, each containing a pure `execute` function that receives CommandContext and returns CommandResult.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type safety for registry | Already in project |
| Vitest | 2.x | Unit testing commands | Already configured |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | No external libraries needed | Pure TypeScript implementation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Map registry | Object literal | Map has better iteration, Object is simpler |
| Pure functions | Class-based commands | Classes add complexity, functions match game pattern |
| Context injection | DI container (tsyringe) | Over-engineering for this use case |

**Installation:**
```bash
# No new packages needed - uses existing TypeScript and Vitest
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── commands/
│   ├── registry.ts        # CommandRegistry class/Map
│   ├── executor.ts        # CommandExecutor function
│   ├── types.ts           # CommandDefinition, CommandContext, CommandResult
│   ├── completion.ts      # Tab completion logic
│   ├── commands/          # Individual command implementations
│   │   ├── navigation.ts  # ls, cd, pwd, cat, view
│   │   ├── filesystem.ts  # mkdir, touch, rm
│   │   ├── collection.ts  # search, genre, format, type
│   │   ├── info.ts        # about, contact, projects, whoami, date
│   │   ├── game.ts        # game command (delegates to GameController)
│   │   ├── style.ts       # theme, font, neofetch
│   │   ├── system.ts      # help, man, clear, echo, exit, sudo
│   │   └── index.ts       # Barrel export
│   ├── __tests__/
│   │   ├── navigation.test.ts
│   │   ├── filesystem.test.ts
│   │   └── ...
│   └── index.ts           # Public API
```

### Pattern 1: Pure Function Commands with Context Injection
**What:** Commands are pure functions that receive context as a parameter and return a result.
**When to use:** For all terminal commands - enables testing without UI.

**Example:**
```typescript
// Source: Project pattern from Phase 3 games
import type { CommandResult, CommandContext } from './types'

// Command definition
export interface CommandDefinition {
  name: string
  description: string
  usage: string
  execute: (args: string[], context: CommandContext) => CommandResult
}

// Example command implementation
export const lsCommand: CommandDefinition = {
  name: 'ls',
  description: 'List directory contents',
  usage: 'ls [path]',
  execute: (args, context) => {
    const path = args[0]
    const files = context.vfs.ls(path)

    if (files.length === 0) {
      return { success: true, output: '' }
    }

    return {
      success: true,
      output: ['', ...files, '']
    }
  }
}
```

### Pattern 2: CommandRegistry as Map
**What:** Central registry that maps command names to their definitions.
**When to use:** For command lookup, iteration, and discovery.

**Example:**
```typescript
// Source: Standard TypeScript Map pattern
export class CommandRegistry {
  private commands = new Map<string, CommandDefinition>()

  register(command: CommandDefinition): void {
    this.commands.set(command.name.toLowerCase(), command)
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name.toLowerCase())
  }

  has(name: string): boolean {
    return this.commands.has(name.toLowerCase())
  }

  list(): string[] {
    return Array.from(this.commands.keys()).sort()
  }

  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values())
  }
}

// Create and populate registry
export const registry = new CommandRegistry()
registry.register(lsCommand)
registry.register(cdCommand)
// ... etc
```

### Pattern 3: CommandExecutor Function
**What:** Function that orchestrates command execution with context.
**When to use:** Called by terminal component when user enters a command.

**Example:**
```typescript
// Source: Executor pattern
export function executeCommand(
  input: string,
  context: CommandContext,
  registry: CommandRegistry
): CommandResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { success: true, output: '' }
  }

  const [commandName, ...args] = trimmed.split(/\s+/)
  const command = registry.get(commandName)

  if (!command) {
    return {
      success: false,
      error: `command not found: ${commandName}`
    }
  }

  return command.execute(args, context)
}
```

### Pattern 4: CommandContext Interface
**What:** Typed interface providing all dependencies commands need.
**When to use:** Passed to every command execution - enables mocking for tests.

**Example:**
```typescript
// Source: Existing lib/types/terminal.ts (already defined)
export interface CommandContext {
  vfs: {
    pwd: () => string
    cd: (path: string) => string | null
    ls: (path?: string) => string[]
    resolve: (path: string) => VFSNode | null
    mkdir: (path: string) => string | null
    touch: (path: string) => string | null
    rm: (path: string) => string | null
  }
  history: {
    add: (line: TerminalLine) => void
    clear: () => void
  }
  game: {
    start: (type: GameType) => void
    end: () => void
  }
  theme: {
    current: ThemeName
    set: (name: ThemeName) => void
    list: () => string[]
  }
  font: {
    current: FontName
    set: (name: FontName) => void
    list: () => string[]
  }
  // Additional context items
  currentDirectory: string  // Display path like "~" or "~/books"
  openUrl: (url: string) => void  // For projects command
}
```

### Pattern 5: Tab Completion with Prefix Matching
**What:** Function that returns completions based on partial input.
**When to use:** When user presses Tab key.

**Example:**
```typescript
// Source: Standard autocomplete pattern
export function getCompletions(
  input: string,
  registry: CommandRegistry,
  context: CommandContext
): string[] {
  const parts = input.split(/\s+/)

  // Completing command name
  if (parts.length === 1) {
    const partial = parts[0].toLowerCase()
    return registry.list().filter(cmd => cmd.startsWith(partial))
  }

  // Completing argument
  const commandName = parts[0].toLowerCase()
  const command = registry.get(commandName)
  const partial = parts[parts.length - 1]

  // Path completion for fs commands
  if (['cd', 'cat', 'view', 'ls', 'rm'].includes(commandName)) {
    const files = context.vfs.ls()
    return files.filter(f => f.toLowerCase().startsWith(partial.toLowerCase()))
  }

  // Theme completion
  if (commandName === 'theme') {
    return context.theme.list().filter(t => t.startsWith(partial.toLowerCase()))
  }

  // Font completion
  if (commandName === 'font') {
    return context.font.list().filter(f => f.startsWith(partial.toLowerCase()))
  }

  // Game completion
  if (commandName === 'game') {
    const games = ['number', 'wordle', 'trivia', 'blackjack', 'rps', 'tron']
    return games.filter(g => g.startsWith(partial.toLowerCase()))
  }

  return []
}
```

### Anti-Patterns to Avoid
- **Accessing closures/globals:** Commands should ONLY use the context parameter, never import state directly
- **Side effects in execute:** Commands should return results, let caller handle side effects
- **Mixing UI concerns:** Commands produce data, UI components render it
- **Complex class hierarchies:** Pure functions are simpler and match the established game pattern
- **Over-engineering with DI containers:** Manual injection is sufficient for this use case

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Command parsing | Custom parser | Simple split + first token | Edge cases in quotes, escapes |
| Path resolution | Custom path logic | Existing VFS.resolve() | Already handles ~, .., / |
| Result types | Ad-hoc returns | CommandResult interface | Type safety, consistency |

**Key insight:** The existing codebase already has working implementations for VFS operations, theme/font setting, and game state management. Commands should delegate to these systems rather than reimplementing logic.

## Common Pitfalls

### Pitfall 1: Tight Coupling to React State
**What goes wrong:** Commands directly call setState or access hooks, making them untestable.
**Why it happens:** Copying code from terminal.tsx that relies on closures.
**How to avoid:** Commands receive context interface, never import React hooks.
**Warning signs:** Commands importing from `@/lib/hooks` or using `useState`.

### Pitfall 2: Inconsistent Return Types
**What goes wrong:** Some commands return strings, others arrays, others objects.
**Why it happens:** Direct port of existing inline command implementations.
**How to avoid:** All commands return `CommandResult` with explicit success/error.
**Warning signs:** Commands with `return "text"` instead of `return { success: true, output: "text" }`.

### Pitfall 3: Testing Against Implementation Details
**What goes wrong:** Tests mock too deeply, break when refactoring.
**Why it happens:** Testing internal structure instead of inputs/outputs.
**How to avoid:** Test command input/output, mock only the context interface.
**Warning signs:** Tests mocking internal helper functions.

### Pitfall 4: Forgetting Error Cases
**What goes wrong:** Commands crash on invalid input instead of returning errors.
**Why it happens:** Happy path testing only.
**How to avoid:** Test missing args, invalid paths, bad inputs for every command.
**Warning signs:** Commands without error handling, tests only covering valid inputs.

### Pitfall 5: Context Interface Drift
**What goes wrong:** CommandContext interface doesn't match actual hook returns.
**Why it happens:** Interface defined without checking actual implementations.
**How to avoid:** Build context adapter that explicitly maps hook returns to interface.
**Warning signs:** TypeScript errors when creating context from hooks.

## Code Examples

Verified patterns from the existing codebase and established conventions:

### Testing a Command
```typescript
// Source: Project pattern from hooks tests
import { describe, it, expect } from 'vitest'
import { lsCommand } from '../commands/navigation'
import type { CommandContext } from '../types'

describe('ls command', () => {
  // Create mock context for testing
  const createMockContext = (overrides: Partial<CommandContext> = {}): CommandContext => ({
    vfs: {
      pwd: () => '/home/zachary',
      cd: () => null,
      ls: () => ['books', 'vinyl', 'hardware'],
      resolve: () => null,
      mkdir: () => null,
      touch: () => null,
      rm: () => null,
    },
    history: {
      add: () => {},
      clear: () => {},
    },
    game: {
      start: () => {},
      end: () => {},
    },
    theme: {
      current: 'lumon',
      set: () => {},
      list: () => ['lumon', 'dracula'],
    },
    font: {
      current: 'jetbrains',
      set: () => {},
      list: () => ['jetbrains', 'fira'],
    },
    currentDirectory: '~',
    openUrl: () => {},
    ...overrides,
  })

  it('lists files in current directory', () => {
    const context = createMockContext()
    const result = lsCommand.execute([], context)

    expect(result.success).toBe(true)
    expect(result.output).toContain('books')
    expect(result.output).toContain('vinyl')
  })

  it('handles empty directory', () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        ls: () => [],
      },
    })
    const result = lsCommand.execute([], context)

    expect(result.success).toBe(true)
    expect(result.output).toBe('')
  })
})
```

### Man Pages as Data
```typescript
// Source: Existing terminal.tsx manPages structure
export const manPages: Record<string, string[]> = {
  ls: [
    '',
    'NAME',
    '    ls - list directory contents',
    '',
    'SYNOPSIS',
    '    ls [path]',
    '',
    'DESCRIPTION',
    '    List files and directories in the current or specified',
    '    directory. Use with cd to navigate the file system.',
    '',
    'EXAMPLES',
    '    ls            List current directory',
    '    ls books      List contents of books directory',
    '',
    'SEE ALSO',
    '    cd, pwd, cat',
    '',
  ],
  // ... etc
}

// Man command uses this data
export const manCommand: CommandDefinition = {
  name: 'man',
  description: 'Display manual pages',
  usage: 'man [command]',
  execute: (args, context) => {
    const cmd = args[0]?.toLowerCase()

    if (!cmd) {
      const available = Object.keys(manPages).sort()
      return {
        success: true,
        output: ['', 'Available manual pages:', '', '  ' + available.join(', '), '', 'Usage: man <command>', '']
      }
    }

    if (manPages[cmd]) {
      return { success: true, output: manPages[cmd] }
    }

    return { success: false, error: `No manual entry for ${cmd}` }
  }
}
```

### Registering All Commands
```typescript
// Source: Standard registry initialization pattern
import { CommandRegistry } from './registry'
import * as navigation from './commands/navigation'
import * as filesystem from './commands/filesystem'
import * as collection from './commands/collection'
import * as info from './commands/info'
import * as game from './commands/game'
import * as style from './commands/style'
import * as system from './commands/system'

export function createRegistry(): CommandRegistry {
  const registry = new CommandRegistry()

  // Navigation commands
  registry.register(navigation.lsCommand)
  registry.register(navigation.cdCommand)
  registry.register(navigation.pwdCommand)
  registry.register(navigation.catCommand)
  registry.register(navigation.viewCommand)

  // Filesystem commands
  registry.register(filesystem.mkdirCommand)
  registry.register(filesystem.touchCommand)
  registry.register(filesystem.rmCommand)

  // Collection commands
  registry.register(collection.searchCommand)
  registry.register(collection.genreCommand)
  registry.register(collection.formatCommand)
  registry.register(collection.typeCommand)

  // Info commands
  registry.register(info.aboutCommand)
  registry.register(info.contactCommand)
  registry.register(info.projectsCommand)
  registry.register(info.whoamiCommand)
  registry.register(info.dateCommand)

  // Game command
  registry.register(game.gameCommand)

  // Style commands
  registry.register(style.themeCommand)
  registry.register(style.fontCommand)
  registry.register(style.neofetchCommand)

  // System commands
  registry.register(system.helpCommand)
  registry.register(system.manCommand)
  registry.register(system.clearCommand)
  registry.register(system.echoCommand)
  registry.register(system.exitCommand)
  registry.register(system.sudoCommand)

  return registry
}

// Export singleton instance
export const defaultRegistry = createRegistry()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline command functions | Pure function modules | Phase 4 | Testable without UI |
| Closure-based state | Context injection | Phase 4 | Mockable dependencies |
| Ad-hoc returns | CommandResult type | Phase 4 | Type safety, consistency |

**Deprecated/outdated:**
- Class-based command pattern with inheritance: Overly complex, pure functions are simpler
- DI container injection: Overkill for this use case, manual injection sufficient

## Open Questions

Things that couldn't be fully resolved:

1. **Collection command context dependency**
   - What we know: search, genre, format, type commands need to know current directory to filter correctly
   - What's unclear: Should they read from VFS.pwd() or receive currentDirectory in context?
   - Recommendation: Include `currentDirectory` (display format like "~/books") in context for consistency with terminal display

2. **Clear command state reset**
   - What we know: Clear command needs to reset history display
   - What's unclear: Should it call history.clear() or return special signal?
   - Recommendation: Return a special `{ clear: true }` flag in result, let caller handle display reset

3. **Game command delegation**
   - What we know: game command starts games via context.game.start()
   - What's unclear: Should game command return game start messages or let GameController handle?
   - Recommendation: Return empty output, let GameController take over after game.start() is called

## Sources

### Primary (HIGH confidence)
- Existing codebase: `lib/types/terminal.ts` - CommandContext and CommandResult already defined
- Existing codebase: `components/games/number-game/logic.ts` - Pure function pattern
- Existing codebase: `lib/hooks/useTerminalHistory.ts` - Hook interface for context
- Existing codebase: `components/terminal.tsx` - Current command implementations (lines 1269-1672)

### Secondary (MEDIUM confidence)
- [Command Pattern](https://www.patterns.dev/vanilla/command-pattern/) - General command pattern guidance
- [React Clean Architecture](https://medium.com/@joaopaulocmarra/react-clean-architecture-a-guide-for-scalable-testable-apps-7639dbafd98a) - Testable architecture principles
- [TSyringe DI](https://github.com/microsoft/tsyringe) - Reference for DI patterns (not used, but informed design)
- [Tabtab](https://github.com/mklabs/tabtab) - Tab completion patterns

### Tertiary (LOW confidence)
- Web search results on terminal command patterns - General ecosystem awareness

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project tools, no new dependencies
- Architecture: HIGH - Pattern directly mirrors established Phase 3 game pattern
- Pitfalls: MEDIUM - Based on experience with similar refactors
- Testing: HIGH - Follows established hook testing patterns

**Research date:** 2026-01-22
**Valid until:** 60 days (stable patterns, internal codebase)
