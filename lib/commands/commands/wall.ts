import type { CommandDefinition } from '../types'
import { success, error } from '../types'

interface WallApiMessage {
  id: number
  name: string | null
  message: string
  createdAt: string | number
}

function dateOf(createdAt: string | number): string {
  const d = new Date(createdAt)
  return Number.isNaN(d.getTime()) ? '????-??-??' : d.toISOString().slice(0, 10)
}

async function apiError(response: Response): Promise<string> {
  if (response.status === 503) return 'wall: the wall is offline (no database configured)'
  try {
    const data = (await response.json()) as { error?: string }
    if (data.error) return `wall: ${data.error}`
  } catch {
    // fall through to the generic message
  }
  return `wall: request failed (${response.status})`
}

export const wallCommand: CommandDefinition = {
  name: 'wall',
  description: 'The guestbook wall',
  usage: 'wall [message]',
  execute: async (args) => {
    try {
      // hidden admin form: wall purge <id> <token>
      if (args[0] === 'purge') {
        const [, id, token] = args
        if (!id || !token) return error('Usage: wall purge <id> <token>')
        const response = await fetch(`/api/wall?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'x-admin-token': token },
        })
        if (!response.ok) return error(await apiError(response))
        return success(`wall: purged #${id}`)
      }

      if (args.length > 0) {
        const message = args.join(' ')
        const response = await fetch('/api/wall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        })
        if (!response.ok) return error(await apiError(response))
        const data = (await response.json()) as { message?: { id?: number } }
        return success([
          '',
          `Posted to the wall${data.message?.id ? ` as #${data.message.id}` : ''}. Type 'wall' to see it.`,
          '',
        ])
      }

      const response = await fetch('/api/wall')
      if (!response.ok) return error(await apiError(response))
      const data = (await response.json()) as { messages?: WallApiMessage[] }
      const messages = data.messages ?? []
      const lines = [
        '',
        '═══════════════ THE WALL ═══════════════',
        '   leave a message: wall <your message>',
        '',
      ]
      if (messages.length === 0) {
        lines.push('  Nothing here yet. Be the first to sign it.', '')
        return success(lines)
      }
      for (const m of messages) {
        lines.push(`  #${m.id}  [${dateOf(m.createdAt)}]  <${m.name ?? 'guest'}>  ${m.message}`)
      }
      lines.push('')
      return success(lines)
    } catch {
      return error('wall: the wall is unreachable right now')
    }
  },
}
