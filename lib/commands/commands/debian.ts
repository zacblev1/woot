import type { CommandDefinition } from '../types'
import { success, error } from '../types'

/**
 * Opens a real Debian VM (v86, in the visitor's browser) as a full-screen
 * overlay. The terminal host renders it; see components/debian-vm/.
 */
export const debianCommand: CommandDefinition = {
  name: 'debian',
  description: 'Boot a real Debian Linux machine in your browser',
  usage: 'debian',
  execute: (args, context) => {
    if (args.length > 0) return error('Usage: debian (see: man debian)')
    context.game.start('debian')
    return success([])
  },
}
