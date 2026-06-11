import { describe, it, expect } from 'vitest'
import { createRateLimiter } from '../rate-limit'

describe('createRateLimiter', () => {
  it('allows up to max hits inside the window, then limits', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 3 })
    const t = 1_000_000
    expect(limiter.isLimited('a', t)).toBe(false)
    expect(limiter.isLimited('a', t + 1)).toBe(false)
    expect(limiter.isLimited('a', t + 2)).toBe(false)
    expect(limiter.isLimited('a', t + 3)).toBe(true)
  })

  it('tracks keys independently', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 })
    const t = 1_000_000
    expect(limiter.isLimited('a', t)).toBe(false)
    expect(limiter.isLimited('b', t)).toBe(false)
    expect(limiter.isLimited('a', t + 1)).toBe(true)
  })

  it('frees the slot once the window slides past', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 })
    const t = 1_000_000
    expect(limiter.isLimited('a', t)).toBe(false)
    expect(limiter.isLimited('a', t + 999)).toBe(true)
    expect(limiter.isLimited('a', t + 1001)).toBe(false)
  })

  it('reset clears all state', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 })
    const t = 1_000_000
    limiter.isLimited('a', t)
    limiter.reset()
    expect(limiter.isLimited('a', t + 1)).toBe(false)
  })
})
