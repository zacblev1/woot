import type { ExecuteContext } from './types'
import type { CommandResult, CommandOutput } from '@/lib/types/terminal'
import type { CommandRegistry } from './registry'
import { error } from './types'

/** Flatten any CommandOutput into plain text lines for piping. */
function flattenOutput(output: CommandOutput): string[] {
  if (typeof output === 'string') return [output]
  if (Array.isArray(output)) {
    return output.map((item) => (typeof item === 'string' ? item : item.content))
  }
  return [output.content]
}

/**
 * Execute a command string with the given context and registry.
 *
 * Parses the input to extract command name and arguments,
 * looks up the command in the registry, and executes it.
 * Supports pipelines (`cmd | grep foo | wc`) where every stage
 * after the first must be a filter command consuming stdin.
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

  // Split into pipeline segments; empty segments are a syntax error
  const segments = trimmed.split('|').map((s) => s.trim())
  if (segments.some((s) => s === '')) {
    return error('syntax error near unexpected token `|`')
  }

  // First stage runs as a normal command
  let result = executeSingle(segments[0], context, registry)

  // Remaining stages must be filter commands fed via stdin
  for (const segment of segments.slice(1)) {
    if (!result.success) return result
    const [name, ...args] = segment.split(/\s+/)
    const command = registry.get(name)
    if (!command) return error(`command not found: ${name}`)
    if (!command.filter) return error(`${name}: not a filter command`)
    result = command.execute(args, { ...context, stdin: flattenOutput(result.output) })
  }

  return result
}

/**
 * Execute a single (non-piped) command segment.
 */
function executeSingle(
  segment: string,
  context: ExecuteContext,
  registry: CommandRegistry
): CommandResult {
  // Parse command and args by splitting on whitespace
  const [commandName, ...args] = segment.split(/\s+/)
  const command = registry.get(commandName)

  // Unknown command
  if (!command) {
    return error(`command not found: ${commandName}`)
  }

  // Execute and return result
  return command.execute(args, context)
}
