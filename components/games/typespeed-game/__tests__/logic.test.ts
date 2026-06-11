import { describe, it, expect } from 'vitest'
import { SENTENCES, pickSentences, wpm, accuracy, finalScore, submittedScore } from '../logic'

describe('pickSentences', () => {
  it('returns the requested number of distinct sentences from the pool', () => {
    const picked = pickSentences(42, 3)
    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
    picked.forEach((s) => expect(SENTENCES).toContain(s))
  })
  it('is deterministic per seed and varies across seeds', () => {
    expect(pickSentences(7, 3)).toEqual(pickSentences(7, 3))
    const variants = new Set([1, 2, 3, 4, 5].map((s) => pickSentences(s, 3).join('|')))
    expect(variants.size).toBeGreaterThan(1)
  })
})

describe('wpm', () => {
  it('computes chars/5 per minute', () => {
    // 50 chars in 30s → 10 "words" in 0.5min → 20 WPM
    expect(wpm(50, 30_000)).toBe(20)
  })
  it('guards zero/negative elapsed', () => {
    expect(wpm(50, 0)).toBe(0)
    expect(wpm(50, -5)).toBe(0)
  })
})

describe('accuracy', () => {
  it('is 1 for a perfect transcription', () => {
    expect(accuracy('hello world', 'hello world')).toBe(1)
  })
  it('counts per-character matches over the longer length', () => {
    expect(accuracy('abcd', 'abxd')).toBe(0.75)
    expect(accuracy('abcd', 'ab')).toBe(0.5)
    expect(accuracy('ab', 'abcd')).toBe(0.5)
  })
  it('is 0 for empty input against a sentence', () => {
    expect(accuracy('abcd', '')).toBe(0)
  })
})

describe('finalScore / submittedScore', () => {
  it('averages wpm and multiplies by average accuracy', () => {
    const rounds = [
      { wpm: 60, accuracy: 1 },
      { wpm: 40, accuracy: 0.5 },
    ]
    // avg wpm 50 × avg acc 0.75 = 37.5
    expect(finalScore(rounds)).toBe(37.5)
    expect(submittedScore(rounds)).toBe(3750)
  })
  it('is 0 with no rounds', () => {
    expect(finalScore([])).toBe(0)
    expect(submittedScore([])).toBe(0)
  })
})
