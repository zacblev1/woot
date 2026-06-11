import type { CommandDefinition } from '../types'
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
      '  Pipes          grep, head, tail, wc, sort (e.g. ls | grep dune)',
      '  Collections    search, genre, format, type, stats',
      '  Files          mkdir, touch, rm',
      '  Games          game <type>, highscores, suggest',
      '  Blog           notes',
      '  Style          theme, font, sound, neofetch',
      '  Info           about, contact, projects, whoami, date',
      '  Other          clear, echo, exit, history, cowsay, tour',
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
    // The host resets history to its initial welcome state; appending nothing
    context.history.clear()
    return success([])
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

export const soundCommand: CommandDefinition = {
  name: 'sound',
  description: 'Toggle sound effects',
  usage: 'sound [on|off]',
  execute: (args, context) => {
    const sub = args[0]?.toLowerCase()
    if (sub === 'on') {
      if (!context.sound.enabled) context.sound.toggle()
      return success('Sound effects enabled')
    }
    if (sub === 'off') {
      if (context.sound.enabled) context.sound.toggle()
      return success('Sound effects disabled')
    }
    return success(`Sound effects: ${context.sound.enabled ? 'on' : 'off'}`)
  },
}

export const historyCommand: CommandDefinition = {
  name: 'history',
  description: 'Show command history',
  usage: 'history',
  execute: (args, context) => {
    const commands = context.history.commands()
    if (commands.length === 0) return success('history: no commands yet')
    return success(['', ...commands.map((c, i) => `${String(i + 1).padStart(5, ' ')}  ${c}`), ''])
  },
}
