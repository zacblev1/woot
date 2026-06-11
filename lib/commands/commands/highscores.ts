import type { CommandDefinition } from '../types'
import { success, error } from '../types'
import { GAME_TYPES, isValidGameType } from '@/lib/scores'

interface ApiScore {
  initials: string
  score: number
  level: number
  createdAt: string
}

function formatRows(scores: ApiScore[]): string[] {
  return scores.map((s, i) => {
    const date = s.createdAt?.slice(0, 10) ?? ''
    return `  ${String(i + 1).padStart(2, ' ')}.  ${s.initials.padEnd(3, ' ')}  ${s.score.toLocaleString('en-US').padStart(11, ' ')}  L${s.level}  ${date}`
  })
}

async function fetchScores(game: string, limit: number): Promise<ApiScore[]> {
  const response = await fetch(`/api/scores/${game}?limit=${limit}`)
  if (!response.ok) throw new Error(`scores fetch failed: ${response.status}`)
  const data = (await response.json()) as { scores?: ApiScore[] }
  return data.scores ?? []
}

export const highscoresCommand: CommandDefinition = {
  name: 'highscores',
  description: 'Arcade leaderboards',
  usage: 'highscores [game]',
  execute: async (args) => {
    const game = args[0]?.toLowerCase()

    if (game && !isValidGameType(game)) {
      return error(`highscores: unknown game: ${game}`)
    }

    try {
      if (game) {
        const scores = await fetchScores(game, 10)
        if (scores.length === 0) {
          return success(['', `${game.toUpperCase()} — No scores yet. Be the first!`, ''])
        }
        return success(['', `★ ${game.toUpperCase()} — TOP ${scores.length} ★`, '', ...formatRows(scores), ''])
      }

      const boards = await Promise.all(GAME_TYPES.map((g) => fetchScores(g, 3)))
      const lines: string[] = ['', '★ HIGH SCORES ★', '']
      GAME_TYPES.forEach((g, i) => {
        lines.push(`  ${g.toUpperCase()}`)
        const rows = formatRows(boards[i])
        lines.push(...(rows.length > 0 ? rows.map((r) => `  ${r}`) : ['      no scores yet']))
        lines.push('')
      })
      lines.push("Type 'highscores <game>' for a full board.")
      lines.push('')
      return success(lines)
    } catch {
      return error('highscores: could not reach the scoreboard')
    }
  },
}
