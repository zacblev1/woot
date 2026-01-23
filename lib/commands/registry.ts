import type { CommandDefinition } from './types'

/**
 * Registry for terminal commands.
 * Uses a Map for O(1) lookup and maintains case-insensitive command names.
 */
export class CommandRegistry {
  private commands = new Map<string, CommandDefinition>()

  /**
   * Register a command in the registry.
   * Command names are stored lowercase for case-insensitive lookup.
   */
  register(command: CommandDefinition): void {
    this.commands.set(command.name.toLowerCase(), command)
  }

  /**
   * Get a command by name.
   * Returns undefined if command not found.
   */
  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name.toLowerCase())
  }

  /**
   * Check if a command exists in the registry.
   */
  has(name: string): boolean {
    return this.commands.has(name.toLowerCase())
  }

  /**
   * List all registered command names, sorted alphabetically.
   */
  list(): string[] {
    return Array.from(this.commands.keys()).sort()
  }

  /**
   * Get all registered command definitions.
   */
  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values())
  }
}

/**
 * Factory function for creating a new registry instance.
 */
export function createRegistry(): CommandRegistry {
  return new CommandRegistry()
}
