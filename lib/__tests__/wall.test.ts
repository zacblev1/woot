import { describe, it, expect } from 'vitest'
import { wallPostSchema, containsUrl, containsProfanity, hashIp } from '../wall'

describe('wallPostSchema', () => {
  it('accepts a plain message and trims it', () => {
    const parsed = wallPostSchema.safeParse({ message: '  hello wall  ' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.message).toBe('hello wall')
  })
  it('rejects empty/whitespace messages', () => {
    expect(wallPostSchema.safeParse({ message: '   ' }).success).toBe(false)
  })
  it('rejects messages over 140 chars', () => {
    expect(wallPostSchema.safeParse({ message: 'x'.repeat(141) }).success).toBe(false)
  })
  it('accepts an optional valid name', () => {
    expect(wallPostSchema.safeParse({ message: 'hi', name: 'Zach_1 B-2' }).success).toBe(true)
  })
  it('rejects names with invalid characters or bad lengths', () => {
    expect(wallPostSchema.safeParse({ message: 'hi', name: '<script>' }).success).toBe(false)
    expect(wallPostSchema.safeParse({ message: 'hi', name: 'x'.repeat(17) }).success).toBe(false)
    expect(wallPostSchema.safeParse({ message: 'hi', name: '' }).success).toBe(false)
  })
})

describe('containsUrl', () => {
  it.each(['see https://x.com', 'http://evil', 'visit www.spam.com'])('flags %s', (s) => {
    expect(containsUrl(s)).toBe(true)
  })
  it('passes plain text', () => {
    expect(containsUrl('no links here, just vibes')).toBe(false)
  })
})

describe('containsProfanity', () => {
  it('flags blocklisted words even with separators', () => {
    expect(containsProfanity('what the f-u-c-k')).toBe(true)
    expect(containsProfanity('SH IT')).toBe(true)
  })
  it('passes clean text', () => {
    expect(containsProfanity('what a lovely terminal')).toBe(false)
  })
})

describe('hashIp', () => {
  it('is deterministic and salt-sensitive', () => {
    expect(hashIp('1.2.3.4', 's')).toBe(hashIp('1.2.3.4', 's'))
    expect(hashIp('1.2.3.4', 's')).not.toBe(hashIp('1.2.3.4', 't'))
    expect(hashIp('1.2.3.4', 's')).toMatch(/^[0-9a-f]{64}$/)
  })
})
