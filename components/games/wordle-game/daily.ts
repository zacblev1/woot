import { WORDLE_WORDS } from './words'

/** YYYY-MM-DD in the user's local timezone (everyone gets a midnight rollover). */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** FNV-1a hash of the date string, reduced to an index. Deterministic everywhere. */
export function seededIndex(seed: string, length: number): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return Math.abs(hash) % length
}

export function dailyWord(dateStr: string): string {
  return WORDLE_WORDS[seededIndex(dateStr, WORDLE_WORDS.length)]
}

/**
 * Convert the terminal's wordle mark rows ("X:C,?:R, :A,…") into the
 * shareable emoji grid. X = green, ? = yellow, anything else = gray.
 */
export function emojiGrid(markRows: string[]): string[] {
  return markRows.map((row) =>
    row
      .split(',')
      .map((pair) => (pair[0] === 'X' ? '🟩' : pair[0] === '?' ? '🟨' : '⬛'))
      .join('')
  )
}

export interface StreakRecord {
  lastWinDate: string | null
  streak: number
}

function isNextDay(prev: string, next: string): boolean {
  const [py, pm, pd] = prev.split('-').map(Number)
  const [ny, nm, nd] = next.split('-').map(Number)
  return Date.UTC(ny, nm - 1, nd) - Date.UTC(py, pm - 1, pd) === 86_400_000
}

/** Apply a win on `dateStr`. Consecutive day increments; same day no-ops; gap resets. */
export function updateStreak(prev: StreakRecord, dateStr: string): StreakRecord {
  if (prev.lastWinDate === dateStr) return prev
  if (prev.lastWinDate && isNextDay(prev.lastWinDate, dateStr)) {
    return { lastWinDate: dateStr, streak: prev.streak + 1 }
  }
  return { lastWinDate: dateStr, streak: 1 }
}
