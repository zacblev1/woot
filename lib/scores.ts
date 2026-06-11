import { z } from 'zod'

export const GAME_TYPES = ['tron', 'pacman', 'basketball', 'typespeed'] as const
export type GameTypeName = (typeof GAME_TYPES)[number]

export function isValidGameType(value: string): value is GameTypeName {
  return (GAME_TYPES as readonly string[]).includes(value)
}

/**
 * Score submission payload. Initials are uppercased before validation so
 * "zab" and "ZAB" are equivalent; everything else is rejected outright.
 */
export const scoreSubmissionSchema = z.object({
  gameType: z.enum(GAME_TYPES),
  initials: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{1,3}$/, 'Initials must be 1-3 alphanumeric characters')),
  score: z.number().int().finite().min(0).max(1_000_000_000),
  level: z.number().int().min(1).max(1000).default(1),
})

export type ScoreSubmission = z.infer<typeof scoreSubmissionSchema>

// --- Rate limiting -----------------------------------------------------------
// Simple in-memory sliding window per IP. State is per server instance, which
// is acceptable for this portfolio (Fluid Compute reuses instances); a shared
// store (e.g. Upstash) would be needed for strict global limits.

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 10

const submissionLog = new Map<string, number[]>()

export function isScoreRateLimited(ip: string, now = Date.now()): boolean {
  const cutoff = now - WINDOW_MS
  const recent = (submissionLog.get(ip) ?? []).filter((t) => t > cutoff)
  if (recent.length >= MAX_PER_WINDOW) {
    submissionLog.set(ip, recent)
    return true
  }
  recent.push(now)
  submissionLog.set(ip, recent)
  return false
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown'
}

/** Test-only: clear rate limiter state between tests. */
export function _resetScoreRateLimiter(): void {
  submissionLog.clear()
}
