import type { CommandDefinition, ExecuteContext } from '../types'
import { success, error } from '../types'

/**
 * Get the display name for a file in a collection directory.
 * Returns the title/name from the file content, or falls back to the filename.
 */
function getDisplayName(filename: string, context: ExecuteContext): string {
  const node = context.vfs.resolve(filename)
  if (!node || node.type !== 'file' || !node.content) {
    return filename
  }

  const content = node.content as { title?: string; name?: string }
  // Books and vinyl have 'title', hardware has 'name'
  return content.title || content.name || filename
}

/**
 * Check if the current or target path is a collection directory.
 */
function isCollectionDirectory(path: string | undefined, context: ExecuteContext): boolean {
  // Determine the effective path to check
  let targetPath: string
  if (path) {
    // If a path argument is given, resolve it relative to pwd
    const node = context.vfs.resolve(path)
    if (!node) return false

    // Build the absolute path
    if (path.startsWith('/')) {
      targetPath = path
    } else if (path.startsWith('~')) {
      targetPath = '/home/zachary' + path.slice(1)
    } else {
      // Relative path - combine with pwd
      const pwd = context.vfs.pwd()
      targetPath = pwd === '/' ? '/' + path : pwd + '/' + path
    }
  } else {
    targetPath = context.vfs.pwd()
  }

  // Check if it's one of the collection directories
  return targetPath === '/home/zachary/books' ||
         targetPath === '/home/zachary/vinyl' ||
         targetPath === '/home/zachary/hardware'
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

    // If we're in a collection directory, show display names instead of slugs
    if (isCollectionDirectory(path, context)) {
      const displayNames = result.map(filename => getDisplayName(filename, context))
      return success(['', ...displayNames, ''])
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
      const book = node.content as { title: string; author: string | string[]; genre: string; format: string; pages?: number }
      const lines = [
        '',
        `  Title:   ${book.title}`,
        `  Author:  ${Array.isArray(book.author) ? book.author.join(', ') : book.author}`,
        `  Genre:   ${book.genre}`,
        `  Format:  ${book.format}`,
      ]
      if (book.pages) lines.push(`  Pages:   ${book.pages}`)
      lines.push('')
      return success(lines)
    }

    if (pwd.includes('/vinyl')) {
      const record = node.content as { title: string; artist: string; genre: string; format: string; label: string }
      return success([
        '',
        `  Title:   ${record.title}`,
        `  Artist:  ${record.artist}`,
        `  Genre:   ${record.genre}`,
        `  Format:  ${record.format}`,
        `  Label:   ${record.label}`,
        '',
      ])
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

    // Fallback to raw content
    if (typeof node.content === 'string') return success(node.content)
    return success(JSON.stringify(node.content, null, 2))
  }
}
