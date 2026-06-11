// Simple in-memory sliding window per key. State is per server instance,
// acceptable for this portfolio (Fluid Compute reuses instances); a shared
// store (e.g. Upstash) would be needed for strict global limits.

export interface RateLimiter {
  /** Records a hit and reports whether the key is over the limit. */
  isLimited: (key: string, now?: number) => boolean
  /** Test-only: clear all state. */
  reset: () => void
}

export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }): RateLimiter {
  const log = new Map<string, number[]>()
  return {
    isLimited(key: string, now = Date.now()): boolean {
      const cutoff = now - windowMs
      const recent = (log.get(key) ?? []).filter((t) => t > cutoff)
      if (recent.length >= max) {
        log.set(key, recent)
        return true
      }
      recent.push(now)
      log.set(key, recent)
      return false
    },
    reset() {
      log.clear()
    },
  }
}
