import { describe, it, expect } from 'vitest'
import { CommandRegistry, createRegistry } from '../registry'
import type { CommandDefinition } from '../types'

// Helper to create a mock command definition
function createMockCommand(name: string, description = 'Test command'): CommandDefinition {
  return {
    name,
    description,
    usage: `${name} [args]`,
    execute: () => ({ success: true, output: `executed ${name}` }),
  }
}

describe('CommandRegistry', () => {
  describe('register', () => {
    it('adds command to registry', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('test')

      registry.register(cmd)

      expect(registry.has('test')).toBe(true)
    })

    it('stores command name in lowercase', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('TEST')

      registry.register(cmd)

      expect(registry.has('test')).toBe(true)
      expect(registry.has('TEST')).toBe(true)
    })

    it('allows registering multiple commands', () => {
      const registry = new CommandRegistry()

      registry.register(createMockCommand('ls'))
      registry.register(createMockCommand('cd'))
      registry.register(createMockCommand('pwd'))

      expect(registry.has('ls')).toBe(true)
      expect(registry.has('cd')).toBe(true)
      expect(registry.has('pwd')).toBe(true)
    })

    it('overwrites existing command with same name', () => {
      const registry = new CommandRegistry()
      const cmd1 = createMockCommand('test', 'first')
      const cmd2 = createMockCommand('test', 'second')

      registry.register(cmd1)
      registry.register(cmd2)

      const retrieved = registry.get('test')
      expect(retrieved?.description).toBe('second')
    })
  })

  describe('get', () => {
    it('retrieves command by name', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('ls')

      registry.register(cmd)
      const retrieved = registry.get('ls')

      expect(retrieved).toBe(cmd)
    })

    it('retrieves command case-insensitively', () => {
      const registry = new CommandRegistry()
      const cmd = createMockCommand('ls')

      registry.register(cmd)

      expect(registry.get('LS')).toBe(cmd)
      expect(registry.get('Ls')).toBe(cmd)
      expect(registry.get('lS')).toBe(cmd)
    })

    it('returns undefined for unknown command', () => {
      const registry = new CommandRegistry()

      const retrieved = registry.get('unknown')

      expect(retrieved).toBeUndefined()
    })
  })

  describe('has', () => {
    it('returns true for registered commands', () => {
      const registry = new CommandRegistry()
      registry.register(createMockCommand('ls'))

      expect(registry.has('ls')).toBe(true)
    })

    it('returns false for unknown commands', () => {
      const registry = new CommandRegistry()

      expect(registry.has('unknown')).toBe(false)
    })

    it('checks case-insensitively', () => {
      const registry = new CommandRegistry()
      registry.register(createMockCommand('ls'))

      expect(registry.has('LS')).toBe(true)
      expect(registry.has('Ls')).toBe(true)
    })
  })

  describe('list', () => {
    it('returns empty array for empty registry', () => {
      const registry = new CommandRegistry()

      expect(registry.list()).toEqual([])
    })

    it('returns sorted command names', () => {
      const registry = new CommandRegistry()

      registry.register(createMockCommand('pwd'))
      registry.register(createMockCommand('cd'))
      registry.register(createMockCommand('ls'))

      expect(registry.list()).toEqual(['cd', 'ls', 'pwd'])
    })

    it('returns names in lowercase', () => {
      const registry = new CommandRegistry()
      registry.register(createMockCommand('LS'))
      registry.register(createMockCommand('CD'))

      expect(registry.list()).toEqual(['cd', 'ls'])
    })
  })

  describe('getAll', () => {
    it('returns empty array for empty registry', () => {
      const registry = new CommandRegistry()

      expect(registry.getAll()).toEqual([])
    })

    it('returns all command definitions', () => {
      const registry = new CommandRegistry()
      const cmd1 = createMockCommand('ls')
      const cmd2 = createMockCommand('cd')

      registry.register(cmd1)
      registry.register(cmd2)

      const all = registry.getAll()

      expect(all).toHaveLength(2)
      expect(all).toContain(cmd1)
      expect(all).toContain(cmd2)
    })
  })
})

describe('createRegistry', () => {
  it('returns a new CommandRegistry instance', () => {
    const registry = createRegistry()

    expect(registry).toBeInstanceOf(CommandRegistry)
  })

  it('returns an empty registry', () => {
    const registry = createRegistry()

    expect(registry.list()).toEqual([])
  })
})
