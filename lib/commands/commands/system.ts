import type { CommandDefinition, TerminalLine } from '../types'
import { success, error } from '../types'
import { manPages } from '../man-pages'

export const helpCommand: CommandDefinition = {
  name: 'help',
  description: 'Display command summary',
  usage: 'help',
  execute: () => {
    return success([
      '',
      'COMMANDS',
      '',
      '  man <cmd>      Full documentation for any command',
      '',
      '  Navigation     ls, cd, pwd, cat, view',
      '  Collections    search, genre, format, type',
      '  Files          mkdir, touch, rm',
      '  Games          game <type>',
      '  Style          theme, font, neofetch',
      '  Info           about, contact, projects, whoami, date',
      '  Other          clear, echo, exit',
      '',
    ])
  },
}

export const manCommand: CommandDefinition = {
  name: 'man',
  description: 'Display manual pages',
  usage: 'man [command]',
  execute: (args) => {
    const cmd = args[0]?.toLowerCase()

    if (!cmd) {
      const available = Object.keys(manPages).sort()
      return success([
        '',
        'Available manual pages:',
        '',
        '  ' + available.join(', '),
        '',
        'Usage: man <command>',
        '',
      ])
    }

    if (manPages[cmd]) {
      return success(manPages[cmd])
    }

    return error(`No manual entry for ${cmd}`)
  },
}

export const clearCommand: CommandDefinition = {
  name: 'clear',
  description: 'Clear terminal screen',
  usage: 'clear',
  execute: (args, context) => {
    // Clear history and add welcome message
    context.history.clear()
    const welcomeLines: TerminalLine[] = [
      { type: 'output', content: '' },
      { type: 'success', content: 'zachary@home' },
      { type: 'output', content: '' },
      { type: 'output', content: "Type 'help' for available commands." },
      { type: 'output', content: '' },
    ]
    welcomeLines.forEach((line) => context.history.add(line))
    return success('')
  },
}

export const echoCommand: CommandDefinition = {
  name: 'echo',
  description: 'Display text',
  usage: 'echo [text...]',
  execute: (args) => {
    return success(args.join(' ') || '')
  },
}

export const exitCommand: CommandDefinition = {
  name: 'exit',
  description: 'Exit terminal',
  usage: 'exit',
  execute: () => {
    return success('Use Cmd+W or Ctrl+W to close')
  },
}

export const sudoCommand: CommandDefinition = {
  name: 'sudo',
  description: 'Execute as superuser',
  usage: 'sudo <command>',
  execute: () => {
    return error('Permission denied')
  },
}
