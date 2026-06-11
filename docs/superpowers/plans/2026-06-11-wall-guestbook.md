# Wall Guestbook (Sub-project D) Implementation Plan

> ✅ **COMPLETED 2026-06-11** — all 6 tasks shipped (commits `1ae4d26..`).
> Review-pass note: /api/wall stays dynamic (ƒ) despite the argless GET
> because the file also exports POST/DELETE — verified in the build output.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Repo note:** background subagents get permission-denied; use inline execution.

**Goal:** A BBS-style guestbook: `wall_messages` Turso table (committed migration), `/api/wall` (GET/POST/DELETE), a shared rate limiter, and an async `wall` terminal command with a hidden `wall purge`.

**Architecture:** The per-IP limiter generalizes out of `lib/scores.ts` into `lib/rate-limit.ts` (scores keeps its public API). Validation/abuse rules live in `lib/wall.ts` (zod schema, URL/profanity checks, IP hashing). The route mirrors `/api/scores` conventions (validation & rate limit before the db-null check; degrade gracefully). The `wall` command is an async registry command via C0. Spec: `docs/superpowers/specs/2026-06-09-terminal-enhancements-design.md` §D.

**Env:** `WALL_ADMIN_TOKEN` (DELETE auth), `WALL_IP_SALT` (optional; IP hashing salt, defaults to empty string).

**Decisions locked here:** ipHash = `sha256(salt + ip)` via `node:crypto` (route is Node runtime). GET with no db returns `{ messages: [] }` (mirrors scores GET) rather than 503 — the spec's 503 applies to POST. Posts render the author as `guest` when name is NULL. The tour's closing narration gains the deferred `wall` line.

---

### Task 1: Shared rate limiter (`lib/rate-limit.ts`)

**Files:**
- Create: `lib/rate-limit.ts`
- Modify: `lib/scores.ts` (delegate to it; keep exports)
- Test: Create `lib/__tests__/rate-limit.test.ts`

- [ ] **Step 1: Write failing tests**:

```ts
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
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run lib/__tests__/rate-limit.test.ts` — FAIL (module not found).

- [ ] **Step 3: Implement** — `lib/rate-limit.ts`:

```ts
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
```

`lib/scores.ts` — replace the rate-limiting block (constants, `submissionLog`, `isScoreRateLimited`, `_resetScoreRateLimiter` bodies) with delegation; `requestIp` stays:

```ts
import { createRateLimiter } from '@/lib/rate-limit'

const scoreLimiter = createRateLimiter({ windowMs: 60_000, max: 10 })

export function isScoreRateLimited(ip: string, now = Date.now()): boolean {
  return scoreLimiter.isLimited(ip, now)
}

/** Test-only: clear rate limiter state between tests. */
export function _resetScoreRateLimiter(): void {
  scoreLimiter.reset()
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run lib app/api` — all pass (scores route tests exercise the delegated limiter).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "refactor: shared sliding-window rate limiter in lib/rate-limit.ts"`

---

### Task 2: Wall validation module (`lib/wall.ts`)

**Files:**
- Create: `lib/wall.ts`
- Test: Create: `lib/__tests__/wall.test.ts`

- [ ] **Step 1: Write failing tests**:

```ts
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
```

- [ ] **Step 2: Run to verify failure** — FAIL (module not found).

- [ ] **Step 3: Implement** — `lib/wall.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run lib` — all pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(wall): validation module (schema, url/profanity checks, ip hashing)"`

---

### Task 3: `wall_messages` table + committed migration

**Files:**
- Modify: `lib/db/schema.ts`, `lib/db/index.ts`
- Generate: `drizzle/0001_*.sql` (via drizzle-kit)

- [ ] **Step 1: Extend the schema** — append to `lib/db/schema.ts`:

```ts
export const wallMessages = sqliteTable(
  'wall_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name', { length: 16 }), // nullable: anonymous posts render as "guest"
    message: text('message', { length: 140 }).notNull(),
    // SHA-256 of salt+IP — abuse tracing only, never exposed via the API
    ipHash: text('ip_hash', { length: 64 }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    // The board reads newest-first
    index('idx_wall_messages_created').on(desc(t.createdAt)),
  ]
)

export type WallMessage = typeof wallMessages.$inferSelect
export type NewWallMessage = typeof wallMessages.$inferInsert
```

`lib/db/index.ts` — add:

```ts
export { highScores, wallMessages } from './schema'
export type { HighScore, NewHighScore, WallMessage, NewWallMessage } from './schema'
```

(replacing the existing two export lines).

- [ ] **Step 2: Generate the migration** — `npx drizzle-kit generate` — expect a new `drizzle/0001_*.sql` creating `wall_messages` + index. Inspect it; commit it as-is.

- [ ] **Step 3: Typecheck** — `npm run typecheck` — clean.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(db): wall_messages table with committed migration"`

(Deploy reminder already in STATUS.md: baseline `drizzle/0000` before ever running `drizzle-kit migrate` against the existing production DB; `0001` is then safe to apply.)

---

### Task 4: `/api/wall` route

**Files:**
- Create: `app/api/wall/route.ts`
- Test: Create: `app/api/wall/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests** (db is null in tests — no `TURSO_DATABASE_URL`; validation/rate-limit/auth run before the db check, mirroring scores):

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GET, POST, DELETE } from '../route'
import { wallLimiter } from '@/lib/wall'
import { NextRequest } from 'next/server'

function postRequest(body: unknown, ip = '203.0.113.7') {
  return new NextRequest('http://localhost/api/wall', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

function deleteRequest(id: string | null, token?: string) {
  const url = id === null ? 'http://localhost/api/wall' : `http://localhost/api/wall?id=${id}`
  return new NextRequest(url, {
    method: 'DELETE',
    headers: token ? { 'x-admin-token': token } : {},
  })
}

beforeEach(() => {
  wallLimiter.reset()
  process.env.WALL_ADMIN_TOKEN = 'secret-token'
})
afterEach(() => {
  delete process.env.WALL_ADMIN_TOKEN
})

describe('GET /api/wall', () => {
  it('returns empty messages without a database, with cache headers', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('s-maxage=15')
    expect(await res.json()).toEqual({ messages: [] })
  })
})

describe('POST /api/wall validation', () => {
  it('rejects invalid JSON with 400', async () => {
    const req = new NextRequest('http://localhost/api/wall', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    })
    expect((await POST(req)).status).toBe(400)
  })
  it('rejects an empty message with 400', async () => {
    expect((await POST(postRequest({ message: '   ' }))).status).toBe(400)
  })
  it('rejects messages over 140 chars with 400', async () => {
    expect((await POST(postRequest({ message: 'x'.repeat(141) }))).status).toBe(400)
  })
  it('rejects a bad name with 400', async () => {
    expect((await POST(postRequest({ message: 'hi', name: '<b>' }))).status).toBe(400)
  })
  it('rejects URLs with 400', async () => {
    expect((await POST(postRequest({ message: 'buy at www.spam.com' }))).status).toBe(400)
  })
  it('rejects profanity with 400', async () => {
    expect((await POST(postRequest({ message: 'well shit' }))).status).toBe(400)
  })
  it('rate-limits the 4th post in an hour with 429', async () => {
    for (let i = 0; i < 3; i++) {
      // valid posts pass validation+limiter, then hit the missing db (503)
      expect((await POST(postRequest({ message: `post ${i}` }))).status).toBe(503)
    }
    expect((await POST(postRequest({ message: 'post 3' }))).status).toBe(429)
  })
  it('returns 503 without a database for a valid post', async () => {
    expect((await POST(postRequest({ message: 'hello' }))).status).toBe(503)
  })
})

describe('DELETE /api/wall', () => {
  it('rejects a missing/wrong token with 401', async () => {
    expect((await DELETE(deleteRequest('1'))).status).toBe(401)
    expect((await DELETE(deleteRequest('1', 'wrong'))).status).toBe(401)
  })
  it('rejects when WALL_ADMIN_TOKEN is unset with 401', async () => {
    delete process.env.WALL_ADMIN_TOKEN
    expect((await DELETE(deleteRequest('1', ''))).status).toBe(401)
  })
  it('rejects a missing or non-numeric id with 400', async () => {
    expect((await DELETE(deleteRequest(null, 'secret-token'))).status).toBe(400)
    expect((await DELETE(deleteRequest('abc', 'secret-token'))).status).toBe(400)
  })
  it('returns 503 without a database', async () => {
    expect((await DELETE(deleteRequest('1', 'secret-token'))).status).toBe(503)
  })
})
```

- [ ] **Step 2: Run to verify failure** — FAIL (module not found).

- [ ] **Step 3: Implement** — `app/api/wall/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { db, wallMessages } from '@/lib/db'
import { desc, eq } from 'drizzle-orm'
import { requestIp } from '@/lib/scores'
import { wallPostSchema, containsUrl, containsProfanity, hashIp, wallLimiter } from '@/lib/wall'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
}

export async function GET() {
  if (!db) {
    return NextResponse.json({ messages: [] }, { headers: CACHE_HEADERS })
  }
  try {
    // Explicit column list: ipHash must never leave the server
    const messages = await db
      .select({
        id: wallMessages.id,
        name: wallMessages.name,
        message: wallMessages.message,
        createdAt: wallMessages.createdAt,
      })
      .from(wallMessages)
      .orderBy(desc(wallMessages.createdAt))
      .limit(50)
    return NextResponse.json({ messages }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('Error fetching wall:', error)
    return NextResponse.json({ error: 'Failed to fetch the wall' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = wallPostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid wall post', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    )
  }

  const { message, name } = parsed.data
  if (containsUrl(message) || (name && containsUrl(name))) {
    return NextResponse.json({ error: 'Links are not allowed on the wall' }, { status: 400 })
  }
  if (containsProfanity(message) || (name && containsProfanity(name))) {
    return NextResponse.json({ error: 'Keep it friendly' }, { status: 400 })
  }

  const ip = requestIp(request)
  if (wallLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Slow down — 3 posts per hour' }, { status: 429 })
  }

  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const [posted] = await db
      .insert(wallMessages)
      .values({ message, name: name ?? null, ipHash: hashIp(ip) })
      .returning({
        id: wallMessages.id,
        name: wallMessages.name,
        message: wallMessages.message,
        createdAt: wallMessages.createdAt,
      })
    return NextResponse.json({ message: posted }, { status: 201 })
  } catch (error) {
    console.error('Error posting to wall:', error)
    return NextResponse.json({ error: 'Failed to post' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const adminToken = process.env.WALL_ADMIN_TOKEN
  const provided = request.headers.get('x-admin-token')
  if (!adminToken || !provided || provided !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const idParam = request.nextUrl.searchParams.get('id')
  const id = idParam === null ? NaN : Number(idParam)
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const deleted = await db.delete(wallMessages).where(eq(wallMessages.id, id)).returning({ id: wallMessages.id })
    if (deleted.length === 0) {
      return NextResponse.json({ error: 'No such message' }, { status: 404 })
    }
    return NextResponse.json({ deleted: deleted[0].id })
  } catch (error) {
    console.error('Error deleting wall message:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run app/api lib` — all pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(api): /api/wall guestbook route (GET/POST/DELETE)"`

---

### Task 5: `wall` command

**Files:**
- Create: `lib/commands/commands/wall.ts`
- Modify: `lib/commands/commands/index.ts`, `lib/commands/index.ts` (register)
- Test: Create: `lib/commands/__tests__/wall.test.ts`

- [ ] **Step 1: Write failing tests** (ctx helper copied from `highscores.test.ts`):

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { wallCommand } from '../commands/wall'
// ...same ctx() helper as highscores.test.ts...

afterEach(() => vi.unstubAllGlobals())

describe('wall (board)', () => {
  it('renders messages newest-first, BBS style, guest fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({
        messages: [
          { id: 7, name: 'zach', message: 'first post', createdAt: '2026-06-11T08:00:00.000Z' },
          { id: 3, name: null, message: 'hello from nowhere', createdAt: '2026-06-10T12:00:00.000Z' },
        ],
      }), { status: 200 })
    ))
    const result = await wallCommand.execute([], ctx())
    expect(result.success).toBe(true)
    const text = (result as { output: string[] }).output.join('\n')
    expect(text).toContain('THE WALL')
    expect(text).toMatch(/#7\s+\[2026-06-11\]\s+<zach>\s+first post/)
    expect(text).toMatch(/#3\s+\[2026-06-10\]\s+<guest>\s+hello from nowhere/)
  })

  it('invites the first post when empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ messages: [] }), { status: 200 })))
    const result = await wallCommand.execute([], ctx())
    expect((result as { output: string[] }).output.join('\n')).toContain('Nothing here yet')
  })

  it('degrades when the wall is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await wallCommand.execute([], ctx())).toEqual({
      success: false,
      error: 'wall: the wall is unreachable right now',
    })
  })
})

describe('wall <message>', () => {
  it('posts the joined args and confirms', async () => {
    const bodies: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ message: { id: 9 } }), { status: 201 })
    }))
    const result = await wallCommand.execute(['hello', 'world'], ctx())
    expect(result.success).toBe(true)
    expect(bodies[0]).toEqual({ message: 'hello world' })
    expect((result as { output: string[] }).output.join('\n')).toContain('#9')
  })

  it('surfaces API rejections (rate limit, validation)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Slow down — 3 posts per hour' }), { status: 429 })
    ))
    expect(await wallCommand.execute(['spam'], ctx())).toEqual({
      success: false,
      error: 'wall: Slow down — 3 posts per hour',
    })
  })

  it('reports the offline wall on 503', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503 })
    ))
    expect(await wallCommand.execute(['hi'], ctx())).toEqual({
      success: false,
      error: 'wall: the wall is offline (no database configured)',
    })
  })
})

describe('wall purge (hidden)', () => {
  it('DELETEs with the admin token header', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify({ deleted: 4 }), { status: 200 })
    }))
    const result = await wallCommand.execute(['purge', '4', 'tok123'], ctx())
    expect(result.success).toBe(true)
    expect(calls[0].url).toBe('/api/wall?id=4')
    expect(calls[0].init?.method).toBe('DELETE')
    expect(new Headers(calls[0].init?.headers).get('x-admin-token')).toBe('tok123')
  })

  it('requires id and token', async () => {
    expect(await wallCommand.execute(['purge', '4'], ctx())).toEqual({
      success: false,
      error: 'Usage: wall purge <id> <token>',
    })
  })

  it('reports a 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })))
    expect(await wallCommand.execute(['purge', '4', 'bad'], ctx())).toEqual({
      success: false,
      error: 'wall: Unauthorized',
    })
  })
})
```

- [ ] **Step 2: Run to verify failure** — FAIL (module not found).

- [ ] **Step 3: Implement** — `lib/commands/commands/wall.ts`:

```ts
import type { CommandDefinition } from '../types'
import { success, error } from '../types'

interface WallApiMessage {
  id: number
  name: string | null
  message: string
  createdAt: string | number
}

function dateOf(createdAt: string | number): string {
  const d = typeof createdAt === 'number' ? new Date(createdAt) : new Date(createdAt)
  return Number.isNaN(d.getTime()) ? '????-??-??' : d.toISOString().slice(0, 10)
}

async function apiError(response: Response): Promise<string> {
  if (response.status === 503) return 'wall: the wall is offline (no database configured)'
  try {
    const data = (await response.json()) as { error?: string }
    if (data.error) return `wall: ${data.error}`
  } catch {
    // fall through
  }
  return `wall: request failed (${response.status})`
}

export const wallCommand: CommandDefinition = {
  name: 'wall',
  description: 'The guestbook wall',
  usage: 'wall [message]',
  execute: async (args) => {
    try {
      // hidden admin form: wall purge <id> <token>
      if (args[0] === 'purge') {
        const [, id, token] = args
        if (!id || !token) return error('Usage: wall purge <id> <token>')
        const response = await fetch(`/api/wall?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'x-admin-token': token },
        })
        if (!response.ok) return error(await apiError(response))
        return success(`wall: purged #${id}`)
      }

      if (args.length > 0) {
        const message = args.join(' ')
        const response = await fetch('/api/wall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        })
        if (!response.ok) return error(await apiError(response))
        const data = (await response.json()) as { message?: { id?: number } }
        return success([
          '',
          `Posted to the wall${data.message?.id ? ` as #${data.message.id}` : ''}. Type 'wall' to see it.`,
          '',
        ])
      }

      const response = await fetch('/api/wall')
      if (!response.ok) return error(await apiError(response))
      const data = (await response.json()) as { messages?: WallApiMessage[] }
      const messages = data.messages ?? []
      const lines = [
        '',
        '═══════════════ THE WALL ═══════════════',
        '   leave a message: wall <your message>',
        '',
      ]
      if (messages.length === 0) {
        lines.push('  Nothing here yet. Be the first to sign it.', '')
        return success(lines)
      }
      for (const m of messages) {
        lines.push(`  #${m.id}  [${dateOf(m.createdAt)}]  <${m.name ?? 'guest'}>  ${m.message}`)
      }
      lines.push('')
      return success(lines)
    } catch {
      return error('wall: the wall is unreachable right now')
    }
  },
}
```

Register: barrel export (`// Wall` block in `lib/commands/commands/index.ts`) + `registry.register(commands.wallCommand)` in `createDefaultRegistry()`.

- [ ] **Step 4: Run to verify pass** — `npx vitest run lib/commands` — all pass.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(terminal): wall guestbook command (post, board, hidden purge)"`

---

### Task 6: Tour line, docs sweep, STATUS, full gate, review pass

**Files:**
- Modify: `components/terminal.tsx` (tour closing narration)
- Modify: `lib/commands/commands/system.ts` (help), `lib/commands/man-pages.ts`, `lib/terminal-config.ts`, `components/terminal/types.ts`
- Modify: `docs/superpowers/STATUS.md`

- [ ] **Step 1: Tour** — in `TOUR_STEPS` closing narration, after the `theme` line add:

```ts
      "  wall         sign the guestbook",
```

and remove the "will gain a `wall` line" comment.

- [ ] **Step 2: Listings**

`help`: add a Guestbook row under Blog: `  Guestbook      wall`.

`man-pages.ts` — add (do NOT document `purge`):

```ts
  wall: [
    "",
    "NAME",
    "    wall - the guestbook wall",
    "",
    "SYNOPSIS",
    "    wall [message]",
    "",
    "DESCRIPTION",
    "    With no arguments, shows the latest messages on the wall.",
    "    With a message, signs the wall as guest (140 chars max,",
    "    no links, 3 posts per hour).",
    "",
    "EXAMPLES",
    "    wall",
    "    wall hello from the terminal",
    "",
  ],
```

`COMMAND_DESCRIPTIONS`: `wall: 'The guestbook wall'`.
`VALID_COMMANDS`: add `'wall'`.

- [ ] **Step 3: STATUS.md** — mark D ✅ Done (plan path + commit range), slate complete; update "How to pick back up" to point at the follow-up queue; refresh the test count; note `WALL_ADMIN_TOKEN`/`WALL_IP_SALT` must be set in prod and repeat the drizzle-baseline caveat for applying `0001`.

- [ ] **Step 4: Full gate**

```bash
npm run lint && npm run typecheck && npx vitest run && npm run build
```

- [ ] **Step 5: Manual smoke** — `npm run dev`: `wall` (empty/no-db message), `wall hi there`, `man wall`, `help`, full `tour` (closing now mentions wall).

- [ ] **Step 6: Whole-range review pass** — read the full D diff with fresh eyes (this caught real bugs in A and B).

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(terminal): document wall; tour mentions it; STATUS update (D complete)"`
