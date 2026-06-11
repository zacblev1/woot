import { z } from 'zod'
import { createRateLimiter } from '@/lib/rate-limit'

export const GAME_TYPES = ['tron', 'pacman', 'basketball', 'typespeed', 'snake'] as const
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

const scoreLimiter = createRateLimiter({ windowMs: 60_000, max: 10 })

export function isScoreRateLimited(ip: string, now = Date.now()): boolean {
  return scoreLimiter.isLimited(ip, now)
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown'
}

/** Test-only: clear rate limiter state between tests. */
export function _resetScoreRateLimiter(): void {
  scoreLimiter.reset()
}
