import type { CommandDefinition, ExecuteContext } from '../types'
import type { TerminalLine } from '@/lib/types/terminal'
import { success, error } from '../types'

/**
 * Rich listing for a collection directory: a success-styled title line plus an
 * indented detail line per entry, mirroring the shipped terminal behavior.
 */
function listCollectionDirectory(
  result: string[],
  context: ExecuteContext,
  detail: (content: Record<string, unknown>) => { title?: string; sub?: string }
): TerminalLine[] {
  const lines: TerminalLine[] = [{ type: 'output', content: '' }]
  result.forEach((filename) => {
    const node = context.vfs.resolve(filename)
    if (node && node.type === 'file' && node.content) {
      const { title, sub } = detail(node.content as Record<string, unknown>)
      lines.push({ type: 'success', content: title || filename })
      if (sub) lines.push({ type: 'output', content: sub })
    } else {
      lines.push({ type: 'output', content: filename })
    }
  })
  lines.push({ type: 'output', content: '' })
  return lines
}

export const lsCommand: CommandDefinition = {
  name: 'ls',
  description: 'List directory contents',
  usage: 'ls [path]',
  execute: (args, context) => {
    const path = args[0]
    const result = context.vfs.ls(path)

    if (result.length === 0) return success('')

    // Check for error messages from ls (e.g., "ls: path: No such file or directory")
    if (result.length === 1 && result[0].startsWith('ls:')) {
      return success(result[0])
    }

    // Detailed listings when inside a collection directory (no path argument)
    const pwd = context.vfs.pwd()

    if (!path && pwd === '/home/zachary/books') {
      return success(listCollectionDirectory(result, context, (c) => ({
        title: c.title as string | undefined,
        sub: c.author ? '    by ' + c.author : undefined,
      })))
    }

    if (!path && pwd === '/home/zachary/vinyl') {
      return success(listCollectionDirectory(result, context, (c) => ({
        title: c.title as string | undefined,
        sub: c.artist ? '    by ' + c.artist : undefined,
      })))
    }

    if (!path && pwd === '/home/zachary/hardware') {
      return success(listCollectionDirectory(result, context, (c) => ({
        title: c.name as string | undefined,
        sub: c.type ? '    ' + c.type + (c.status ? ' • ' + c.status : '') : undefined,
      })))
    }

    if (!path && pwd === '/home/zachary/notes') {
      return success(listCollectionDirectory(result, context, (c) => ({
        title: c.title as string | undefined,
        sub: c.date ? '    ' + c.date + (c.author ? ' by ' + c.author : '') : undefined,
      })))
    }

    return success(['', ...result, ''])
  }
}

export const cdCommand: CommandDefinition = {
  name: 'cd',
  description: 'Change directory',
  usage: 'cd [path]',
  execute: (args, context) => {
    const path = args[0] || '~'
    const err = context.vfs.cd(path)
    if (err) return error(err)

    // Update display path
    let newPath = context.vfs.pwd()
    if (newPath.startsWith('/home/zachary')) {
      newPath = '~' + newPath.slice('/home/zachary'.length)
    }
    context.setCurrentDirectory(newPath)
    return success('')
  }
}

export const pwdCommand: CommandDefinition = {
  name: 'pwd',
  description: 'Print working directory',
  usage: 'pwd',
  execute: (args, context) => {
    return success(context.vfs.pwd())
  }
}

export const catCommand: CommandDefinition = {
  name: 'cat',
  description: 'Display file contents',
  usage: 'cat <file>',
  execute: (args, context) => {
    const path = args[0]
    if (!path) return error('Usage: cat <file>')

    const node = context.vfs.resolve(path)
    if (!node) return error(`cat: ${path}: No such file or directory`)
    if (node.type !== 'file') return error(`cat: ${path}: Is a directory`)

    if (typeof node.content === 'string') return success(node.content)
    return success(JSON.stringify(node.content, null, 2))
  }
}

export const viewCommand: CommandDefinition = {
  name: 'view',
  description: 'Display formatted file contents',
  usage: 'view <file>',
  execute: (args, context) => {
    const path = args[0]
    if (!path) return error('Usage: view <file>')

    const node = context.vfs.resolve(path)
    if (!node) return error(`view: ${path}: No such file`)
    if (node.type !== 'file') return error(`view: ${path}: Is a directory`)

    const pwd = context.vfs.pwd()

    // Format based on collection type
    if (pwd.includes('/books')) {
      const book = node.content as { title: string; author: string | string[]; genre: string; format: string; pages?: number; cover?: string }
      const lines: TerminalLine[] = [{ type: 'output', content: '' }]
      if (book.cover) {
        lines.push({ type: 'image', content: book.title, src: book.cover })
      }
      lines.push({ type: 'output', content: `  Title:   ${book.title}` })
      lines.push({ type: 'output', content: `  Author:  ${Array.isArray(book.author) ? book.author.map(a => a.trim()).join(', ') : book.author}` })
      lines.push({ type: 'output', content: `  Genre:   ${book.genre}` })
      lines.push({ type: 'output', content: `  Format:  ${book.format}` })
      if (book.pages) lines.push({ type: 'output', content: `  Pages:   ${book.pages}` })
      lines.push({ type: 'output', content: '' })
      return success(lines)
    }

    if (pwd.includes('/vinyl')) {
      const record = node.content as { title: string; artist: string; genre: string; format: string; label: string; cover?: string }
      const lines: TerminalLine[] = [{ type: 'output', content: '' }]
      if (record.cover) {
        lines.push({ type: 'image', content: record.title, src: record.cover })
      }
      lines.push({ type: 'output', content: `  Title:   ${record.title}` })
      lines.push({ type: 'output', content: `  Artist:  ${record.artist}` })
      lines.push({ type: 'output', content: `  Genre:   ${record.genre}` })
      lines.push({ type: 'output', content: `  Format:  ${record.format}` })
      lines.push({ type: 'output', content: `  Label:   ${record.label}` })
      lines.push({ type: 'output', content: '' })
      return success(lines)
    }

    if (pwd.includes('/hardware')) {
      const device = node.content as { name: string; type: string; processor: string; memory: string; storage: string; status: string; graphics?: string; operating_system?: string }
      const lines = [
        '',
        `  Name:       ${device.name}`,
        `  Type:       ${device.type}`,
        `  Status:     ${device.status}`,
        `  Processor:  ${device.processor}`,
        `  Memory:     ${device.memory}`,
        `  Storage:    ${device.storage}`,
      ]
      if (device.graphics) lines.push(`  Graphics:   ${device.graphics}`)
      if (device.operating_system) lines.push(`  OS:         ${device.operating_system}`)
      lines.push('')
      return success(lines)
    }

    if (pwd.includes('/notes')) {
      const note = node.content as { title: string; date: string; author: string; content: string[] }
      return success([
        '',
        '='.repeat(60),
        note.title,
        '='.repeat(60),
        `Date: ${note.date} | Author: ${note.author}`,
        '',
        ...note.content,
        '',
        '='.repeat(60),
        '',
      ])
    }

    // Fallback to raw content
    if (typeof node.content === 'string') return success(node.content)
    return success(JSON.stringify(node.content, null, 2))
  }
}
