import type { CommandDefinition } from '../types'
import { success, error } from '../types'

function requireStdin(name: string, stdin: string[] | undefined, example: string) {
  if (!stdin) return error(`${name}: missing input — use in a pipeline (e.g. ${example})`)
  return null
}

export const grepCommand: CommandDefinition = {
  name: 'grep',
  description: 'Filter piped lines by substring',
  usage: 'grep <pattern> [-v]',
  filter: true,
  execute: (args, context) => {
    const missing = requireStdin('grep', context.stdin, 'ls | grep books')
    if (missing) return missing
    const invert = args.includes('-v')
    const pattern = args.filter((a) => a !== '-v').join(' ').toLowerCase()
    if (!pattern) return error('Usage: grep <pattern>')
    const matched = context.stdin!.filter((l) => l.toLowerCase().includes(pattern) !== invert)
    if (matched.length === 0) return success('grep: no matches')
    return success(matched)
  },
}

function sliceCommand(name: 'head' | 'tail'): CommandDefinition {
  return {
    name,
    description: `Show the ${name === 'head' ? 'first' : 'last'} n piped lines`,
    usage: `${name} [n]`,
    filter: true,
    execute: (args, context) => {
      const missing = requireStdin(name, context.stdin, `notes | ${name} 5`)
      if (missing) return missing
      const n = args[0] === undefined ? 10 : parseInt(args[0], 10)
      if (Number.isNaN(n) || n < 0) return error(`${name}: invalid count: ${args[0]}`)
      const lines = context.stdin!
      return success(name === 'head' ? lines.slice(0, n) : lines.slice(Math.max(0, lines.length - n)))
    },
  }
}

export const headCommand = sliceCommand('head')
export const tailCommand = sliceCommand('tail')

export const wcCommand: CommandDefinition = {
  name: 'wc',
  description: 'Count non-empty piped lines',
  usage: 'wc',
  filter: true,
  execute: (args, context) => {
    const missing = requireStdin('wc', context.stdin, 'ls | wc')
    if (missing) return missing
    return success(String(context.stdin!.filter((l) => l.trim() !== '').length))
  },
}

export const sortCommand: CommandDefinition = {
  name: 'sort',
  description: 'Sort piped lines',
  usage: 'sort [-r]',
  filter: true,
  execute: (args, context) => {
    const missing = requireStdin('sort', context.stdin, 'ls | sort')
    if (missing) return missing
    const sorted = [...context.stdin!].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    return success(args.includes('-r') ? sorted.reverse() : sorted)
  },
}
