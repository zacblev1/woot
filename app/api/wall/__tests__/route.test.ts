import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GET, POST, DELETE } from '../route'
import { wallLimiter } from '@/lib/wall'
import { NextRequest } from 'next/server'

// No TURSO_DATABASE_URL in the test env, so db is null. Validation, abuse
// checks, rate limiting, and auth must all run BEFORE the db-availability
// check (400/429/401 beat 503), mirroring the scores route.

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
    headers: token !== undefined ? { 'x-admin-token': token } : {},
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
