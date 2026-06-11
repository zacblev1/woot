import { z } from 'zod'
import { createHash } from 'node:crypto'
import { createRateLimiter } from '@/lib/rate-limit'

export const wallPostSchema = z.object({
  message: z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(140)),
  name: z
    .string()
    .regex(/^[A-Za-z0-9 _-]{1,16}$/, 'Name must be 1-16 chars: letters, digits, space, _ or -')
    .optional(),
})

export type WallPost = z.infer<typeof wallPostSchema>

export function containsUrl(text: string): boolean {
  return /https?:\/\/|www\./i.test(text)
}

// Tiny blocklist checked against a normalized form (lowercased, separators
// stripped) so "f-u-c-k" still matches. Deliberately short: this is a speed
// bump for a personal site, not a moderation system.
const BLOCKLIST = ['fuck', 'shit', 'cunt', 'bitch', 'asshole', 'nigger', 'faggot']

export function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z]/g, '')
  return BLOCKLIST.some((word) => normalized.includes(word))
}

/** Abuse tracing only: messages are stored with a salted hash, never the IP. */
export function hashIp(ip: string, salt: string = process.env.WALL_IP_SALT ?? ''): string {
  return createHash('sha256').update(salt + ip).digest('hex')
}

export const wallLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 3 })
