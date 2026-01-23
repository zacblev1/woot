import type { ExecuteContext } from './types'
import type { CommandResult } from '@/lib/types/terminal'
import type { CommandRegistry } from './registry'
import { error } from './types'

/**
 * Execute a command string with the given context and registry.
 *
 * Parses the input to extract command name and arguments,
 * looks up the command in the registry, and executes it.
 *
 * @param input - The raw command string (e.g., "ls -la /home")
 * @param context - The execution context with all dependencies
 * @param registry - The command registry to look up commands
 * @returns The command result (success with output or error)
 */
export function executeCommand(
  input: string,
  context: ExecuteContext,
  registry: CommandRegistry
): CommandResult {
  const trimmed = input.trim()

  // Empty input returns empty success
  if (!trimmed) {
    return { success: true, output: '' }
  }

  // Parse command and args by splitting on whitespace
  const [commandName, ...args] = trimmed.split(/\s+/)
  const command = registry.get(commandName)

  // Unknown command
  if (!command) {
    return error(`command not found: ${commandName}`)
  }

  // Execute and return result
  return command.execute(args, context)
}
