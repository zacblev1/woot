import { describe, it, expect, vi } from 'vitest'
import { executeCommand } from '../executor'
import { CommandRegistry } from '../registry'
import type { CommandDefinition, ExecuteContext } from '../types'
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
      add: () => {},
      clear: () => {},
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

/**
 * Create a mock command for testing.
 */
function createMockCommand(name: string): CommandDefinition {
  return {
    name,
    description: `Test ${name} command`,
    usage: `${name} [args]`,
    execute: vi.fn((args: string[]) => ({
      success: true as const,
      output: `executed ${name} with args: ${args.join(', ')}`,
    })),
  }
}

describe('executeCommand', () => {
  describe('empty input handling', () => {
    it('returns success with empty output for empty string', () => {
      const registry = new CommandRegistry()
      const context = createMockContext()

      const result = executeCommand('', context, registry)

      expect(result).toEqual({ success: true, output: '' })
    })

    it('returns success with empty output for whitespace-only input', () => {
      const registry = new CommandRegistry()
      const context = createMockContext()

      const result = executeCommand('   ', context, registry)

      expect(result).toEqual({ success: true, output: '' })
    })

    it('returns success with empty output for tabs and newlines', () => {
      const registry = new CommandRegistry()
      const context = createMockContext()

      const result = executeCommand('\t\n  \t', context, registry)

      expect(result).toEqual({ success: true, output: '' })
    })
  })

  describe('unknown command handling', () => {
    it('returns error for unknown command', () => {
      const registry = new CommandRegistry()
      const context = createMockContext()

      const result = executeCommand('unknown', context, registry)

      expect(result).toEqual({
        success: false,
        error: 'command not found: unknown',
      })
    })

    it('includes command name in error message', () => {
      const registry = new CommandRegistry()
      const context = createMockContext()

      const result = executeCommand('foobar', context, registry)

      expect(result).toEqual({
        success: false,
        error: 'command not found: foobar',
      })
    })
  })

  describe('command execution', () => {
    it('executes known command', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('ls')
      registry.register(cmd)
      const context = createMockContext()

      const result = executeCommand('ls', context, registry)

      expect(result.success).toBe(true)
      expect(cmd.execute).toHaveBeenCalled()
    })

    it('passes parsed args to command', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('ls')
      registry.register(cmd)
      const context = createMockContext()

      executeCommand('ls -la /home', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith(['-la', '/home'], context)
    })

    it('handles command with no args', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('pwd')
      registry.register(cmd)
      const context = createMockContext()

      executeCommand('pwd', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith([], context)
    })

    it('passes correct context to command', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('test')
      registry.register(cmd)
      const context = createMockContext({ currentDirectory: '~/books' })

      executeCommand('test arg1', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith(['arg1'], context)
      const passedContext = (cmd.execute as ReturnType<typeof vi.fn>).mock.calls[0][1]
      expect(passedContext.currentDirectory).toBe('~/books')
    })
  })

  describe('case-insensitive lookup', () => {
    it('finds command regardless of case', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('ls')
      registry.register(cmd)
      const context = createMockContext()

      executeCommand('LS', context, registry)
      expect(cmd.execute).toHaveBeenCalled()

      executeCommand('Ls', context, registry)
      expect(cmd.execute).toHaveBeenCalledTimes(2)

      executeCommand('lS', context, registry)
      expect(cmd.execute).toHaveBeenCalledTimes(3)
    })
  })

  describe('argument parsing', () => {
    it('splits args by whitespace', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('echo')
      registry.register(cmd)
      const context = createMockContext()

      executeCommand('echo hello world', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith(['hello', 'world'], context)
    })

    it('handles multiple spaces between args', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('echo')
      registry.register(cmd)
      const context = createMockContext()

      executeCommand('echo   hello    world', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith(['hello', 'world'], context)
    })

    it('trims leading and trailing whitespace', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('ls')
      registry.register(cmd)
      const context = createMockContext()

      executeCommand('   ls   /home   ', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith(['/home'], context)
    })
  })

  describe('command return value', () => {
    it('returns the result from command execute', () => {
      const registry = new CommandRegistry()
      const expectedResult = { success: true as const, output: 'custom output' }
      const cmd: CommandDefinition = {
        name: 'test',
        description: 'Test',
        usage: 'test',
        execute: () => expectedResult,
      }
      registry.register(cmd)
      const context = createMockContext()

      const result = executeCommand('test', context, registry)

      expect(result).toEqual(expectedResult)
    })

    it('returns error result from command', () => {
      const registry = new CommandRegistry()
      const errorResult = { success: false as const, error: 'something went wrong' }
      const cmd: CommandDefinition = {
        name: 'fail',
        description: 'Fail',
        usage: 'fail',
        execute: () => errorResult,
      }
      registry.register(cmd)
      const context = createMockContext()

      const result = executeCommand('fail', context, registry)

      expect(result).toEqual(errorResult)
    })
  })
})
