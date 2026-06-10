import type { CommandDefinition } from '../types'
import { success, error } from '../types'

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line)
      line = word
    } else {
      line = line ? line + ' ' + word : word
    }
    while (line.length > width) {
      lines.push(line.slice(0, width))
      line = line.slice(width)
    }
  }
  if (line) lines.push(line)
  return lines
}

export const cowsayCommand: CommandDefinition = {
  name: 'cowsay',
  description: 'A cow says things',
  usage: 'cowsay <text>',
  execute: (args) => {
    const text = args.join(' ').trim()
    if (!text) return error('Usage: cowsay <text>')
    const lines = wrap(text, 40)
    const width = Math.max(...lines.map((l) => l.length))
    const bubble =
      lines.length === 1
        ? [` < ${lines[0]} >`]
        : lines.map((l, i) => {
            const pad = l.padEnd(width)
            if (i === 0) return ` / ${pad} \\`
            if (i === lines.length - 1) return ` \\ ${pad} /`
            return ` | ${pad} |`
          })
    return success([
      '',
      ` ${'_'.repeat(width + 2)}`,
      ...bubble,
      ` ${'-'.repeat(width + 2)}`,
      '        \\   ^__^',
      '         \\  (oo)\\_______',
      '            (__)\\       )\\/\\',
      '                ||----w |',
      '                ||     ||',
      '',
    ])
  },
}
