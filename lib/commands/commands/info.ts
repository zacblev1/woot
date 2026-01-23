import type { CommandDefinition, TerminalLine } from '../types'
import { success } from '../types'

export const aboutCommand: CommandDefinition = {
  name: 'about',
  description: 'About the author',
  usage: 'about',
  execute: () => {
    return success([
      '',
      'Zachary',
      'Creative Technologist',
      '',
      'Building digital experiences that are thoughtful,',
      'accessible, and built to last.',
      '',
      'Interests: philosophy, programming, travel, making things',
      '',
    ])
  }
}

export const contactCommand: CommandDefinition = {
  name: 'contact',
  description: 'Contact information',
  usage: 'contact',
  execute: () => {
    // Return TerminalLine objects with href for links
    const lines: TerminalLine[] = [
      { type: 'output', content: '' },
      { type: 'link', content: 'Email    zachary@thefrenchjockey.com', href: 'mailto:zachary@thefrenchjockey.com' },
      { type: 'link', content: 'GitHub   github.com/zacblev1', href: 'https://github.com/zacblev1' },
      { type: 'output', content: '' },
    ]
    return success(lines)
  }
}

export const projectsCommand: CommandDefinition = {
  name: 'projects',
  description: 'View projects',
  usage: 'projects',
  execute: (args, context) => {
    context.openUrl('https://github.com/zacblev1')
    return success('Opening GitHub...')
  }
}

export const whoamiCommand: CommandDefinition = {
  name: 'whoami',
  description: 'Display current user',
  usage: 'whoami',
  execute: () => {
    return success('zachary')
  }
}

export const dateCommand: CommandDefinition = {
  name: 'date',
  description: 'Display current date and time',
  usage: 'date',
  execute: () => {
    return success(new Date().toLocaleString())
  }
}
