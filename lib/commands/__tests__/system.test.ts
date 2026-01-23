import { describe, it, expect, vi } from 'vitest'
import {
  helpCommand,
  manCommand,
  clearCommand,
  echoCommand,
  exitCommand,
  sudoCommand,
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
    },
    game: {
      start: () => {},
      end: () => {},
      isActive: () => false,
    },
    theme: {
      current: 'lumon' as ThemeName,
      set: () => {},
      list: () => ['lumon', 'dracula'] as ThemeName[],
      config: () => ({ name: 'Lumon' }),
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
    collections: {
      books: [],
      vinyl: [],
      hardware: [],
    },
    ...overrides,
  }
}

describe('helpCommand', () => {
  it('returns success with command categories', () => {
    const context = createMockContext()
    const result = helpCommand.execute([], context)

    expect(result.success).toBe(true)
    expect(result.success && Array.isArray(result.output)).toBe(true)
  })

  it('contains "COMMANDS" header', () => {
    const context = createMockContext()
    const result = helpCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      expect(result.output).toContain('COMMANDS')
    }
  })

  it('contains Navigation category', () => {
    const context = createMockContext()
    const result = helpCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      const hasNavigation = result.output.some(
        (line) => typeof line === 'string' && line.includes('Navigation')
      )
      expect(hasNavigation).toBe(true)
    }
  })

  it('contains Collections category', () => {
    const context = createMockContext()
    const result = helpCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      const hasCollections = result.output.some(
        (line) => typeof line === 'string' && line.includes('Collections')
      )
      expect(hasCollections).toBe(true)
    }
  })

  it('contains man <cmd> reference', () => {
    const context = createMockContext()
    const result = helpCommand.execute([], context)

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
  it('lists all available manual pages without argument', () => {
    const context = createMockContext()
    const result = manCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      const hasAvailable = result.output.some(
        (line) => typeof line === 'string' && line.includes('Available manual pages')
      )
      expect(hasAvailable).toBe(true)
    }
  })

  it('returns manual page for valid command (ls)', () => {
    const context = createMockContext()
    const result = manCommand.execute(['ls'], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      const hasName = result.output.some(
        (line) => typeof line === 'string' && line.includes('ls - list directory')
      )
      expect(hasName).toBe(true)
    }
  })

  it('returns manual page for valid command (cd)', () => {
    const context = createMockContext()
    const result = manCommand.execute(['cd'], context)

    expect(result.success).toBe(true)
    if (result.success && Array.isArray(result.output)) {
      const hasName = result.output.some(
        (line) => typeof line === 'string' && line.includes('cd - change directory')
      )
      expect(hasName).toBe(true)
    }
  })

  it('returns error for unknown command', () => {
    const context = createMockContext()
    const result = manCommand.execute(['unknown'], context)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('No manual entry for unknown')
    }
  })

  it('is case-insensitive for command lookup', () => {
    const context = createMockContext()

    const resultLower = manCommand.execute(['ls'], context)
    const resultUpper = manCommand.execute(['LS'], context)
    const resultMixed = manCommand.execute(['Ls'], context)

    expect(resultLower.success).toBe(true)
    expect(resultUpper.success).toBe(true)
    expect(resultMixed.success).toBe(true)
  })
})

describe('clearCommand', () => {
  it('calls context.history.clear()', () => {
    const context = createMockContext()
    clearCommand.execute([], context)

    expect(context.history.clear).toHaveBeenCalled()
  })

  it('adds welcome messages via context.history.add()', () => {
    const context = createMockContext()
    clearCommand.execute([], context)

    // Should add 5 welcome lines
    expect(context.history.add).toHaveBeenCalledTimes(5)
  })

  it('adds zachary@home success line', () => {
    const context = createMockContext()
    clearCommand.execute([], context)

    expect(context.history.add).toHaveBeenCalledWith({
      type: 'success',
      content: 'zachary@home',
    })
  })

  it('returns empty success', () => {
    const context = createMockContext()
    const result = clearCommand.execute([], context)

    expect(result).toEqual({ success: true, output: '' })
  })
})

describe('echoCommand', () => {
  it('returns empty string with no args', () => {
    const context = createMockContext()
    const result = echoCommand.execute([], context)

    expect(result).toEqual({ success: true, output: '' })
  })

  it('returns single argument', () => {
    const context = createMockContext()
    const result = echoCommand.execute(['hello'], context)

    expect(result).toEqual({ success: true, output: 'hello' })
  })

  it('returns multiple arguments joined by space', () => {
    const context = createMockContext()
    const result = echoCommand.execute(['hello', 'world'], context)

    expect(result).toEqual({ success: true, output: 'hello world' })
  })

  it('handles many arguments', () => {
    const context = createMockContext()
    const result = echoCommand.execute(['one', 'two', 'three', 'four'], context)

    expect(result).toEqual({ success: true, output: 'one two three four' })
  })
})

describe('exitCommand', () => {
  it('returns close instructions', () => {
    const context = createMockContext()
    const result = exitCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe('Use Cmd+W or Ctrl+W to close')
    }
  })
})

describe('sudoCommand', () => {
  it('returns permission denied error', () => {
    const context = createMockContext()
    const result = sudoCommand.execute(['rm', '-rf', '/'], context)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Permission denied')
    }
  })

  it('returns error regardless of arguments', () => {
    const context = createMockContext()

    const result1 = sudoCommand.execute([], context)
    const result2 = sudoCommand.execute(['ls'], context)
    const result3 = sudoCommand.execute(['any', 'command', 'here'], context)

    expect(result1.success).toBe(false)
    expect(result2.success).toBe(false)
    expect(result3.success).toBe(false)
  })
})
