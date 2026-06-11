import type { ExecuteContext } from './types'
import type { CommandRegistry } from './registry'

const VALID_GAMES = ['number', 'wordle', 'trivia', 'blackjack', 'rps', 'tron', 'pacman', 'basketball', 'typespeed', 'snake', 'doom']

export function getCompletions(
  input: string,
  registry: CommandRegistry,
  context: ExecuteContext
): string[] {
  const parts = input.split(/\s+/)

  // Completing command name (first word)
  if (parts.length === 1) {
    const partial = parts[0].toLowerCase()
    if (!partial) return registry.list()
    return registry.list().filter(cmd => cmd.startsWith(partial))
  }

  // Completing argument
  const commandName = parts[0].toLowerCase()
  const partial = parts[parts.length - 1].toLowerCase()

  // Path completion for filesystem commands
  if (['cd', 'cat', 'view', 'ls', 'rm'].includes(commandName)) {
    const files = context.vfs.ls()
    if (!partial) return files
    return files.filter(f => f.toLowerCase().startsWith(partial))
  }

  // Theme completion
  if (commandName === 'theme') {
    const themes = context.theme.list()
    if (!partial) return themes
    return themes.filter(t => t.toLowerCase().startsWith(partial))
  }

  // Font completion
  if (commandName === 'font') {
    const fonts = context.font.list()
    if (!partial) return fonts
    return fonts.filter(f => f.toLowerCase().startsWith(partial))
  }

  // Game completion
  if (commandName === 'game') {
    if (!partial) return VALID_GAMES
    return VALID_GAMES.filter(g => g.startsWith(partial))
  }

  // Man completion (command names)
  if (commandName === 'man') {
    const commands = registry.list()
    if (!partial) return commands
    return commands.filter(c => c.startsWith(partial))
  }

  return []
}
