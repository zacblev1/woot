import { describe, it, expect, vi } from 'vitest'
import { executeCommand } from '../executor'
import { CommandRegistry, createRegistry } from '../registry'
import type { CommandDefinition, ExecuteContext } from '../types'
import type { ThemeName, FontName } from '@/lib/types/terminal'
import { grepCommand, wcCommand } from '../commands/filters'
import { success as ok } from '../types'

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
    it('returns success with empty output for empty string', async () => {
      const registry = new CommandRegistry()
      const context = createMockContext()

      const result = await executeCommand('', context, registry)

      expect(result).toEqual({ success: true, output: '' })
    })

    it('returns success with empty output for whitespace-only input', async () => {
      const registry = new CommandRegistry()
      const context = createMockContext()

      const result = await executeCommand('   ', context, registry)

      expect(result).toEqual({ success: true, output: '' })
    })

    it('returns success with empty output for tabs and newlines', async () => {
      const registry = new CommandRegistry()
      const context = createMockContext()

      const result = await executeCommand('\t\n  \t', context, registry)

      expect(result).toEqual({ success: true, output: '' })
    })
  })

  describe('unknown command handling', () => {
    it('returns error for unknown command', async () => {
      const registry = new CommandRegistry()
      const context = createMockContext()

      const result = await executeCommand('unknown', context, registry)

      expect(result).toEqual({
        success: false,
        error: 'command not found: unknown',
      })
    })

    it('includes command name in error message', async () => {
      const registry = new CommandRegistry()
      const context = createMockContext()

      const result = await executeCommand('foobar', context, registry)

      expect(result).toEqual({
        success: false,
        error: 'command not found: foobar',
      })
    })
  })

  describe('command execution', () => {
    it('executes known command', async () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('ls')
      registry.register(cmd)
      const context = createMockContext()

      const result = await executeCommand('ls', context, registry)

      expect(result.success).toBe(true)
      expect(cmd.execute).toHaveBeenCalled()
    })

    it('passes parsed args to command', async () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('ls')
      registry.register(cmd)
      const context = createMockContext()

      await executeCommand('ls -la /home', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith(['-la', '/home'], context)
    })

    it('handles command with no args', async () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('pwd')
      registry.register(cmd)
      const context = createMockContext()

      await executeCommand('pwd', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith([], context)
    })

    it('passes correct context to command', async () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('test')
      registry.register(cmd)
      const context = createMockContext({ currentDirectory: '~/books' })

      await executeCommand('test arg1', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith(['arg1'], context)
      const passedContext = (cmd.execute as ReturnType<typeof vi.fn>).mock.calls[0][1]
      expect(passedContext.currentDirectory).toBe('~/books')
    })
  })

  describe('case-insensitive lookup', () => {
    it('finds command regardless of case', async () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('ls')
      registry.register(cmd)
      const context = createMockContext()

      await executeCommand('LS', context, registry)
      expect(cmd.execute).toHaveBeenCalled()

      await executeCommand('Ls', context, registry)
      expect(cmd.execute).toHaveBeenCalledTimes(2)

      await executeCommand('lS', context, registry)
      expect(cmd.execute).toHaveBeenCalledTimes(3)
    })
  })

  describe('argument parsing', () => {
    it('splits args by whitespace', async () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('echo')
      registry.register(cmd)
      const context = createMockContext()

      await executeCommand('echo hello world', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith(['hello', 'world'], context)
    })

    it('handles multiple spaces between args', async () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('echo')
      registry.register(cmd)
      const context = createMockContext()

      await executeCommand('echo   hello    world', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith(['hello', 'world'], context)
    })

    it('trims leading and trailing whitespace', async () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('ls')
      registry.register(cmd)
      const context = createMockContext()

      await executeCommand('   ls   /home   ', context, registry)

      expect(cmd.execute).toHaveBeenCalledWith(['/home'], context)
    })
  })

  describe('command return value', () => {
    it('returns the result from command execute', async () => {
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

      const result = await executeCommand('test', context, registry)

      expect(result).toEqual(expectedResult)
    })

    it('returns error result from command', async () => {
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

      const result = await executeCommand('fail', context, registry)

      expect(result).toEqual(errorResult)
    })
  })
})

describe('pipelines', () => {
  function pipeRegistry() {
    const registry = createRegistry()
    registry.register({ name: 'emit', description: '', usage: '', execute: () => ok(['one', 'two', 'three']) })
    registry.register({
      name: 'rich', description: '', usage: '',
      execute: () => ok([{ type: 'success', content: 'Dune' }, { type: 'output', content: '    by Frank Herbert' }]),
    })
    registry.register(grepCommand)
    registry.register(wcCommand)
    return registry
  }

  it('pipes output lines into a filter', async () => {
    const result = await executeCommand('emit | grep t', createMockContext(), pipeRegistry())
    expect(result).toEqual({ success: true, output: ['two', 'three'] })
  })

  it('chains multiple stages', async () => {
    const result = await executeCommand('emit | grep t | wc', createMockContext(), pipeRegistry())
    expect(result).toEqual({ success: true, output: '2' })
  })

  it('a no-match grep stage yields zero through wc', async () => {
    const result = await executeCommand('emit | grep zzz | wc', createMockContext(), pipeRegistry())
    expect(result).toEqual({ success: true, output: '0' })
  })

  it('flattens TerminalLine output to content strings', async () => {
    const result = await executeCommand('rich | grep frank', createMockContext(), pipeRegistry())
    expect(result).toEqual({ success: true, output: ['    by Frank Herbert'] })
  })

  it('rejects non-filter commands after a pipe', async () => {
    const result = await executeCommand('emit | emit', createMockContext(), pipeRegistry())
    expect(result).toEqual({ success: false, error: 'emit: not a filter command' })
  })

  it('reports unknown commands after a pipe', async () => {
    const result = await executeCommand('emit | nope', createMockContext(), pipeRegistry())
    expect(result).toEqual({ success: false, error: 'command not found: nope' })
  })

  it('propagates a first-stage error without running filters', async () => {
    const registry = pipeRegistry()
    registry.register({ name: 'boom', description: '', usage: '', execute: () => ({ success: false, error: 'boom failed' }) })
    expect(await executeCommand('boom | wc', createMockContext(), registry)).toEqual({ success: false, error: 'boom failed' })
  })

  it('rejects empty pipe segments', async () => {
    expect(await executeCommand('emit | | wc', createMockContext(), pipeRegistry())).toEqual({ success: false, error: 'syntax error near unexpected token `|`' })
  })
})

describe('async commands', () => {
  it('awaits a promise-returning command', async () => {
    const registry = createRegistry()
    registry.register({
      name: 'slow',
      description: '',
      usage: '',
      execute: async () => {
        await new Promise((r) => setTimeout(r, 5))
        return { success: true as const, output: 'eventually' }
      },
    })
    const result = await executeCommand('slow', createMockContext(), registry)
    expect(result).toEqual({ success: true, output: 'eventually' })
  })

  it('pipes async output through filters', async () => {
    const registry = createRegistry()
    registry.register({
      name: 'slowlist',
      description: '',
      usage: '',
      execute: async () => ({ success: true as const, output: ['alpha', 'beta'] }),
    })
    registry.register(grepCommand)
    const result = await executeCommand('slowlist | grep beta', createMockContext(), registry)
    expect(result).toEqual({ success: true, output: ['beta'] })
  })
})
