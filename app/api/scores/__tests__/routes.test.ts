import { describe, it, expect, beforeEach } from 'vitest'
import { GET, POST } from '../route'
import { GET as GET_BY_GAME } from '../[game]/route'
import { _resetScoreRateLimiter } from '@/lib/scores'
import { NextRequest } from 'next/server'

// No TURSO_DATABASE_URL in the test env, so db is null. Validation and rate
// limiting must run BEFORE the db-availability check (400/429 beat 503).

function postRequest(body: unknown, ip = '203.0.113.7') {
  return new NextRequest('http://localhost/api/scores', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = { gameType: 'tron', initials: 'ZAB', score: 1200, level: 3 }

beforeEach(() => {
  _resetScoreRateLimiter()
})

describe('POST /api/scores validation', () => {
  it('rejects an unknown gameType with 400', async () => {
    const res = await POST(postRequest({ ...VALID_BODY, gameType: 'doom' }))
    expect(res.status).toBe(400)
  })

  it('rejects negative scores with 400', async () => {
    const res = await POST(postRequest({ ...VALID_BODY, score: -5 }))
    expect(res.status).toBe(400)
  })

  it('rejects non-integer scores with 400', async () => {
    const res = await POST(postRequest({ ...VALID_BODY, score: 12.5 }))
    expect(res.status).toBe(400)
  })

  it('rejects absurdly large scores with 400', async () => {
    const res = await POST(postRequest({ ...VALID_BODY, score: 999_999_999_999 }))
    expect(res.status).toBe(400)
  })

  it('rejects Infinity score (JSON 1e999) with 400', async () => {
    const req = new NextRequest('http://localhost/api/scores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
      body: '{"gameType":"tron","initials":"ZAB","score":1e999,"level":1}',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects out-of-range level with 400', async () => {
    expect((await POST(postRequest({ ...VALID_BODY, level: 0 }))).status).toBe(400)
    expect((await POST(postRequest({ ...VALID_BODY, level: 5000 }))).status).toBe(400)
  })

  it('rejects non-alphanumeric initials with 400', async () => {
    const res = await POST(postRequest({ ...VALID_BODY, initials: '!!' }))
    expect(res.status).toBe(400)
  })

  it('returns 503 (not 400) for a fully valid body when db is unconfigured', async () => {
    const res = await POST(postRequest(VALID_BODY))
    expect(res.status).toBe(503)
  })
})

describe('POST /api/scores rate limiting', () => {
  it('returns 429 after exceeding the per-IP limit', async () => {
    const ip = '198.51.100.42'
    let lastStatus = 0
    for (let i = 0; i < 10; i++) {
      lastStatus = (await POST(postRequest(VALID_BODY, ip))).status
    }
    expect(lastStatus).toBe(503) // still allowed (db unconfigured)
    const res = await POST(postRequest(VALID_BODY, ip))
    expect(res.status).toBe(429)
  })

  it('does not throttle other IPs', async () => {
    for (let i = 0; i < 11; i++) {
      await POST(postRequest(VALID_BODY, '198.51.100.1'))
    }
    const res = await POST(postRequest(VALID_BODY, '198.51.100.2'))
    expect(res.status).toBe(503)
  })
})

describe('GET /api/scores', () => {
  it('rejects an invalid game query param with 400', async () => {
    const res = await GET(new NextRequest('http://localhost/api/scores?game=doom'))
    expect(res.status).toBe(400)
  })

  it('returns empty scores with cache headers when db is unconfigured', async () => {
    const res = await GET(new NextRequest('http://localhost/api/scores?game=tron'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ scores: [] })
    expect(res.headers.get('cache-control')).toContain('s-maxage')
  })
})

describe('GET /api/scores/[game]', () => {
  const makeParams = (game: string) => ({ params: Promise.resolve({ game }) })

  it('accepts basketball (regression: was rejected with 400)', async () => {
    const res = await GET_BY_GAME(
      new NextRequest('http://localhost/api/scores/basketball'),
      makeParams('basketball')
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ scores: [] })
  })

  it('rejects unknown games with 400', async () => {
    const res = await GET_BY_GAME(
      new NextRequest('http://localhost/api/scores/doom'),
      makeParams('doom')
    )
    expect(res.status).toBe(400)
  })

  it('sets cache headers on success', async () => {
    const res = await GET_BY_GAME(
      new NextRequest('http://localhost/api/scores/tron'),
      makeParams('tron')
    )
    expect(res.headers.get('cache-control')).toContain('s-maxage')
  })
})
