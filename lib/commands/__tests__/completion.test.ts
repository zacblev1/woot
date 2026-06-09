import { describe, it, expect, vi } from 'vitest'
import { getCompletions } from '../completion'
import { CommandRegistry } from '../registry'
import type { ExecuteContext, ThemeName, FontName } from '../types'

// Helper to create a mock context
function createMockContext(): ExecuteContext {
  return {
    vfs: {
      pwd: () => '/',
      cd: vi.fn(() => null),
      ls: () => ['books', 'vinyl', 'hardware', 'notes.txt'],
      resolve: () => null,
      mkdir: vi.fn(() => null),
      touch: vi.fn(() => null),
      rm: vi.fn(() => null),
    },
    history: {
      add: vi.fn(),
      clear: vi.fn(),
    },
    game: {
      start: vi.fn(),
      end: vi.fn(),
      isActive: () => false,
    },
    theme: {
      current: 'midnight' as ThemeName,
      set: vi.fn(),
      list: () => ['midnight', 'dracula', 'gruvbox'] as ThemeName[],
      config: (name: ThemeName) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
      }),
    },
    font: {
      current: 'jetbrains' as FontName,
      set: vi.fn(),
      list: () => ['jetbrains', 'fira', 'mono'] as FontName[],
      config: (name: FontName) => ({
        name: name,
      }),
    },
    currentDirectory: '~',
    setCurrentDirectory: vi.fn(),
    openUrl: vi.fn(),
    sound: { enabled: false, toggle: () => {} },
    uptime: () => 0,
    collections: {
      books: [],
      vinyl: [],
      hardware: [],
      notes: [],
    },
  }
}

// Helper to create a mock registry with common commands
function createMockRegistry(): CommandRegistry {
  const registry = new CommandRegistry()
  const mockCommands = [
    'about', 'cat', 'cd', 'clear', 'contact', 'date', 'echo', 'exit',
    'font', 'format', 'game', 'genre', 'help', 'ls', 'man', 'mkdir',
    'neofetch', 'projects', 'pwd', 'rm', 'search', 'sudo', 'theme',
    'touch', 'type', 'view', 'whoami'
  ]
  for (const cmd of mockCommands) {
    registry.register({
      name: cmd,
      description: `${cmd} command`,
      usage: cmd,
      execute: () => ({ success: true, output: '' })
    })
  }
  return registry
}

describe('getCompletions - command name completion', () => {
  it('returns all commands for empty input', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('', registry, context)

    expect(completions).toEqual(registry.list())
    expect(completions.length).toBe(27)
  })

  it('returns filtered commands for partial input "c"', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('c', registry, context)

    expect(completions).toContain('cat')
    expect(completions).toContain('cd')
    expect(completions).toContain('clear')
    expect(completions).toContain('contact')
    expect(completions).not.toContain('about')
  })

  it('returns filtered commands for partial input "th"', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('th', registry, context)

    expect(completions).toEqual(['theme'])
  })

  it('returns exact match for full command name', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('help', registry, context)

    expect(completions).toEqual(['help'])
  })

  it('returns empty array for unknown partial', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('xyz', registry, context)

    expect(completions).toEqual([])
  })
})

describe('getCompletions - path completion', () => {
  it('returns all files when no partial for cd', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('cd ', registry, context)

    expect(completions).toEqual(['books', 'vinyl', 'hardware', 'notes.txt'])
  })

  it('returns filtered files for partial path on cd', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('cd b', registry, context)

    expect(completions).toEqual(['books'])
  })

  it('returns all files for cat command', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('cat ', registry, context)

    expect(completions).toEqual(['books', 'vinyl', 'hardware', 'notes.txt'])
  })

  it('returns filtered files for cat command', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('cat n', registry, context)

    expect(completions).toEqual(['notes.txt'])
  })

  it('returns all files for view command', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('view ', registry, context)

    expect(completions).toEqual(['books', 'vinyl', 'hardware', 'notes.txt'])
  })

  it('returns all files for ls command', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('ls ', registry, context)

    expect(completions).toEqual(['books', 'vinyl', 'hardware', 'notes.txt'])
  })

  it('returns all files for rm command', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('rm ', registry, context)

    expect(completions).toEqual(['books', 'vinyl', 'hardware', 'notes.txt'])
  })

  it('returns filtered files with partial for rm', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('rm h', registry, context)

    expect(completions).toEqual(['hardware'])
  })
})

describe('getCompletions - theme completion', () => {
  it('returns all themes for "theme "', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('theme ', registry, context)

    expect(completions).toEqual(['midnight', 'dracula', 'gruvbox'])
  })

  it('returns filtered themes for partial "theme d"', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('theme d', registry, context)

    expect(completions).toEqual(['dracula'])
  })

  it('returns filtered themes for partial "theme g"', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('theme g', registry, context)

    expect(completions).toEqual(['gruvbox'])
  })
})

describe('getCompletions - font completion', () => {
  it('returns all fonts for "font "', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('font ', registry, context)

    expect(completions).toEqual(['jetbrains', 'fira', 'mono'])
  })

  it('returns filtered fonts for partial "font j"', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('font j', registry, context)

    expect(completions).toEqual(['jetbrains'])
  })

  it('returns filtered fonts for partial "font f"', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('font f', registry, context)

    expect(completions).toEqual(['fira'])
  })
})

describe('getCompletions - game completion', () => {
  it('returns all games for "game "', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('game ', registry, context)

    expect(completions).toEqual(['number', 'wordle', 'trivia', 'blackjack', 'rps', 'tron', 'pacman', 'basketball'])
  })

  it('returns filtered games for partial "game w"', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('game w', registry, context)

    expect(completions).toEqual(['wordle'])
  })

  it('returns filtered games for partial "game t"', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('game t', registry, context)

    expect(completions).toEqual(['trivia', 'tron'])
  })

  it('returns filtered games for partial "game b"', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('game b', registry, context)

    expect(completions).toEqual(['blackjack', 'basketball'])
  })
})

describe('getCompletions - man completion', () => {
  it('returns all commands for "man "', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('man ', registry, context)

    expect(completions).toEqual(registry.list())
  })

  it('returns filtered commands for partial "man c"', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('man c', registry, context)

    expect(completions).toContain('cat')
    expect(completions).toContain('cd')
    expect(completions).toContain('clear')
    expect(completions).not.toContain('about')
  })

  it('returns filtered commands for partial "man th"', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('man th', registry, context)

    expect(completions).toEqual(['theme'])
  })
})

describe('getCompletions - no completion', () => {
  it('returns empty array for unknown command arguments', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('echo ', registry, context)

    expect(completions).toEqual([])
  })

  it('returns empty array for about command arguments', () => {
    const registry = createMockRegistry()
    const context = createMockContext()

    const completions = getCompletions('about ', registry, context)

    expect(completions).toEqual([])
  })
})
