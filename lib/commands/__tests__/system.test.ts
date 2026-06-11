import { describe, it, expect, vi } from 'vitest'
import {
  helpCommand,
  manCommand,
  clearCommand,
  echoCommand,
  exitCommand,
  sudoCommand,
  historyCommand,
} from '../commands/system'
import type { ExecuteContext } from '../types'
import type { ThemeName, FontName } from '@/lib/types/terminal'

/**
 * Create a mock ExecuteContext for testing.
 * All methods are no-ops or return sensible defaults.
 */
function createMockContext(overrides: Partial<ExecuteContext> = {}): ExecuteContext {
  return {
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
      add: vi.fn(),
      clear: vi.fn(),
      commands: () => [],
    },
    game: {
      start: () => {},
      end: () => {},
      isActive: () => false,
    },
    theme: {
      current: 'midnight' as ThemeName,
      set: () => {},
      list: () => ['midnight', 'dracula'] as ThemeName[],
      config: () => ({ name: 'Midnight' }),
    },
    font: {
      current: 'jetbrains' as FontName,
      set: () => {},
      list: () => ['jetbrains', 'fira'] as FontName[],
      config: () => ({ name: 'JetBrains Mono' }),
    },
    currentDirectory: '~',
    setCurrentDirectory: () => {},
    openUrl: () => {},
    sound: { enabled: false, toggle: () => {} },
    uptime: () => 0,
    collections: {
      books: [],
      vinyl: [],
      hardware: [],
      notes: [],
    },
    ...overrides,
  }
}

describe('helpCommand', () => {
  it('returns success with command categories', async () => {
    const context = createMockContext()
    const result = await helpCommand.execute([], context)

    expect(result.success).toBe(true)
    expect(result.success && Array.isArray(result.output)).toBe(true)
  })

  it('contains "COMMANDS" header', async () => {
    const context = createMockContext()
    const result = await helpCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      expect(result.output).toContain('COMMANDS')
    }
  })

  it('contains Navigation category', async () => {
    const context = createMockContext()
    const result = await helpCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      const hasNavigation = result.output.some(
        (line) => typeof line === 'string' && line.includes('Navigation')
      )
      expect(hasNavigation).toBe(true)
    }
  })

  it('contains Collections category', async () => {
    const context = createMockContext()
    const result = await helpCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      const hasCollections = result.output.some(
        (line) => typeof line === 'string' && line.includes('Collections')
      )
      expect(hasCollections).toBe(true)
    }
  })

  it('contains man <cmd> reference', async () => {
    const context = createMockContext()
    const result = await helpCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      const hasManRef = result.output.some(
        (line) => typeof line === 'string' && line.includes('man <cmd>')
      )
      expect(hasManRef).toBe(true)
    }
  })
})

describe('manCommand', () => {
  it('lists all available manual pages without argument', async () => {
    const context = createMockContext()
    const result = await manCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      const hasAvailable = result.output.some(
        (line) => typeof line === 'string' && line.includes('Available manual pages')
      )
      expect(hasAvailable).toBe(true)
    }
  })

  it('returns manual page for valid command (ls)', async () => {
    const context = createMockContext()
    const result = await manCommand.execute(['ls'], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      const hasName = result.output.some(
        (line) => typeof line === 'string' && line.includes('ls - list directory')
      )
      expect(hasName).toBe(true)
    }
  })

  it('returns manual page for valid command (cd)', async () => {
    const context = createMockContext()
    const result = await manCommand.execute(['cd'], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      const hasName = result.output.some(
        (line) => typeof line === 'string' && line.includes('cd - change directory')
      )
      expect(hasName).toBe(true)
    }
  })

  it('returns error for unknown command', async () => {
    const context = createMockContext()
    const result = await manCommand.execute(['unknown'], context)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('No manual entry for unknown')
    }
  })

  it('is case-insensitive for command lookup', async () => {
    const context = createMockContext()

    const resultLower = await manCommand.execute(['ls'], context)
    const resultUpper = await manCommand.execute(['LS'], context)
    const resultMixed = await manCommand.execute(['Ls'], context)

    expect(resultLower.success).toBe(true)
    expect(resultUpper.success).toBe(true)
    expect(resultMixed.success).toBe(true)
  })
})

describe('clearCommand', () => {
  it('calls context.history.clear()', async () => {
    const context = createMockContext()
    await clearCommand.execute([], context)

    expect(context.history.clear).toHaveBeenCalled()
  })

  it('does not append anything itself (host resets to welcome state)', async () => {
    const context = createMockContext()
    await clearCommand.execute([], context)

    expect(context.history.add).not.toHaveBeenCalled()
  })

  it('returns empty success', async () => {
    const context = createMockContext()
    const result = await clearCommand.execute([], context)

    expect(result).toEqual({ success: true, output: [] })
  })
})

describe('echoCommand', () => {
  it('returns empty string with no args', async () => {
    const context = createMockContext()
    const result = await echoCommand.execute([], context)

    expect(result).toEqual({ success: true, output: '' })
  })

  it('returns single argument', async () => {
    const context = createMockContext()
    const result = await echoCommand.execute(['hello'], context)

    expect(result).toEqual({ success: true, output: 'hello' })
  })

  it('returns multiple arguments joined by space', async () => {
    const context = createMockContext()
    const result = await echoCommand.execute(['hello', 'world'], context)

    expect(result).toEqual({ success: true, output: 'hello world' })
  })

  it('handles many arguments', async () => {
    const context = createMockContext()
    const result = await echoCommand.execute(['one', 'two', 'three', 'four'], context)

    expect(result).toEqual({ success: true, output: 'one two three four' })
  })
})

describe('exitCommand', () => {
  it('returns close instructions', async () => {
    const context = createMockContext()
    const result = await exitCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe('Use Cmd+W or Ctrl+W to close')
    }
  })
})

describe('sudoCommand', () => {
  it('returns permission denied error', async () => {
    const context = createMockContext()
    const result = await sudoCommand.execute(['rm', '-rf', '/'], context)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Permission denied')
    }
  })

  it('returns error regardless of arguments', async () => {
    const context = createMockContext()

    const result1 = await sudoCommand.execute([], context)
    const result2 = await sudoCommand.execute(['ls'], context)
    const result3 = await sudoCommand.execute(['any', 'command', 'here'], context)

    expect(result1.success).toBe(false)
    expect(result2.success).toBe(false)
    expect(result3.success).toBe(false)
  })
})

describe('historyCommand', () => {
  it('lists numbered commands oldest-first', async () => {
    const context = createMockContext()
    context.history.commands = () => ['ls', 'cd books', 'view dune']
    expect(await historyCommand.execute([], context)).toEqual({
      success: true,
      output: ['', '    1  ls', '    2  cd books', '    3  view dune', ''],
    })
  })
  it('reports empty history', async () => {
    expect(await historyCommand.execute([], createMockContext())).toEqual({ success: true, output: 'history: no commands yet' })
  })
})
