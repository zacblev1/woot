// Types
export type { CommandDefinition, ExecuteContext, CommandResult, CommandSuccess, CommandError, CommandOutput } from './types'
export { success, error } from './types'

// Registry
export { CommandRegistry, createRegistry } from './registry'

// Executor
export { executeCommand } from './executor'

// Completion
export { getCompletions } from './completion'

// Man pages
export { manPages } from './man-pages'

// All commands
import * as commands from './commands'

// Import registry class
import { CommandRegistry } from './registry'

/**
 * Create a registry pre-populated with all default commands
 */
export function createDefaultRegistry(): CommandRegistry {
  const registry = new CommandRegistry()

  // Navigation
  registry.register(commands.lsCommand)
  registry.register(commands.cdCommand)
  registry.register(commands.pwdCommand)
  registry.register(commands.catCommand)
  registry.register(commands.viewCommand)

  // Filesystem
  registry.register(commands.mkdirCommand)
  registry.register(commands.touchCommand)
  registry.register(commands.rmCommand)

  // Collection
  registry.register(commands.searchCommand)
  registry.register(commands.genreCommand)
  registry.register(commands.formatCommand)
  registry.register(commands.typeCommand)
  registry.register(commands.statsCommand)

  // Info
  registry.register(commands.aboutCommand)
  registry.register(commands.contactCommand)
  registry.register(commands.projectsCommand)
  registry.register(commands.whoamiCommand)
  registry.register(commands.dateCommand)
  registry.register(commands.notesCommand)

  // Style
  registry.register(commands.themeCommand)
  registry.register(commands.fontCommand)
  registry.register(commands.neofetchCommand)

  // System
  registry.register(commands.helpCommand)
  registry.register(commands.manCommand)
  registry.register(commands.clearCommand)
  registry.register(commands.echoCommand)
  registry.register(commands.exitCommand)
  registry.register(commands.sudoCommand)
  registry.register(commands.soundCommand)
  registry.register(commands.historyCommand)

  // Filters
  registry.register(commands.grepCommand)
  registry.register(commands.headCommand)
  registry.register(commands.tailCommand)
  registry.register(commands.wcCommand)
  registry.register(commands.sortCommand)

  // Fun
  registry.register(commands.cowsayCommand)

  // Game
  registry.register(commands.gameCommand)
  registry.register(commands.highscoresCommand)

  // Wall
  registry.register(commands.wallCommand)

  return registry
}
