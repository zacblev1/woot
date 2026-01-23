import type { CommandDefinition } from '../types'
import { success, error } from '../types'

export const mkdirCommand: CommandDefinition = {
  name: 'mkdir',
  description: 'Create directory',
  usage: 'mkdir <directory>',
  execute: (args, context) => {
    const path = args[0]
    if (!path) return error('Usage: mkdir <directory>')

    const err = context.vfs.mkdir(path)
    if (err) return error(err)

    return success('')
  }
}

export const touchCommand: CommandDefinition = {
  name: 'touch',
  description: 'Create empty file',
  usage: 'touch <filename>',
  execute: (args, context) => {
    const path = args[0]
    if (!path) return error('Usage: touch <filename>')

    const err = context.vfs.touch(path)
    if (err) return error(err)

    return success('')
  }
}

export const rmCommand: CommandDefinition = {
  name: 'rm',
  description: 'Remove file or directory',
  usage: 'rm <path>',
  execute: (args, context) => {
    const path = args[0]
    if (!path) return error('Usage: rm <path>')

    const err = context.vfs.rm(path)
    if (err) return error(err)

    return success('')
  }
}
