import { describe, it, expect } from 'vitest'
import {
  localDateString,
  seededIndex,
  dailyWord,
  emojiGrid,
  updateStreak,
  type StreakRecord,
} from '../daily'
import { WORDLE_WORDS } from '../words'

describe('localDateString', () => {
  it('formats a date as YYYY-MM-DD in local time', () => {
    expect(localDateString(new Date(2026, 5, 11, 23, 59))).toBe('2026-06-11')
    expect(localDateString(new Date(2026, 0, 2, 0, 0))).toBe('2026-01-02')
  })
})

describe('seededIndex / dailyWord', () => {
  it('is deterministic for the same date string', () => {
    expect(seededIndex('2026-06-11', 50)).toBe(seededIndex('2026-06-11', 50))
    expect(dailyWord('2026-06-11')).toBe(dailyWord('2026-06-11'))
  })
  it('stays in range', () => {
    for (const d of ['2026-06-11', '2026-06-12', '1999-12-31', '2030-01-01']) {
      const i = seededIndex(d, 50)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(50)
    }
  })
  it('varies across dates (not constant)', () => {
    const words = new Set(
      ['2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15'].map(dailyWord)
    )
    expect(words.size).toBeGreaterThan(1)
  })
  it('returns a word from the shared list', () => {
    expect(WORDLE_WORDS).toContain(dailyWord('2026-06-11'))
  })
})

describe('emojiGrid', () => {
  it('maps mark rows to emoji', () => {
    // terminal mark format: "mark:letter" pairs, X=green ?=yellow space=gray
    expect(emojiGrid(['X:C,?:R, :A, :N,X:E'])).toEqual(['🟩🟨⬛⬛🟩'])
  })
  it('handles multiple rows', () => {
    expect(emojiGrid([' :A, :B, :C, :D, :E', 'X:C,X:R,X:A,X:N,X:E'])).toEqual([
      '⬛⬛⬛⬛⬛',
      '🟩🟩🟩🟩🟩',
    ])
  })
})

describe('updateStreak', () => {
  const none: StreakRecord = { lastWinDate: null, streak: 0 }
  it('first win starts at 1', () => {
    expect(updateStreak(none, '2026-06-11')).toEqual({ lastWinDate: '2026-06-11', streak: 1 })
  })
  it('consecutive-day win increments', () => {
    expect(updateStreak({ lastWinDate: '2026-06-10', streak: 3 }, '2026-06-11')).toEqual({
      lastWinDate: '2026-06-11',
      streak: 4,
    })
  })
  it('a gap resets to 1', () => {
    expect(updateStreak({ lastWinDate: '2026-06-08', streak: 9 }, '2026-06-11')).toEqual({
      lastWinDate: '2026-06-11',
      streak: 1,
    })
  })
  it('same-day repeat is a no-op', () => {
    expect(updateStreak({ lastWinDate: '2026-06-11', streak: 4 }, '2026-06-11')).toEqual({
      lastWinDate: '2026-06-11',
      streak: 4,
    })
  })
  it('handles month boundaries', () => {
    expect(updateStreak({ lastWinDate: '2026-05-31', streak: 1 }, '2026-06-01')).toEqual({
      lastWinDate: '2026-06-01',
      streak: 2,
    })
  })
})
