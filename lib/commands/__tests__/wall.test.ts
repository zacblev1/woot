import { describe, it, expect, vi, afterEach } from 'vitest'
import { wallCommand } from '../commands/wall'
import type { ExecuteContext, ThemeName, FontName } from '../types'

function ctx(): ExecuteContext {
  return {
    vfs: { pwd: () => '/', cd: () => null, ls: () => [], resolve: () => null, mkdir: () => null, touch: () => null, rm: () => null },
    history: { add: () => {}, clear: () => {}, commands: () => [] },
    game: { start: () => '', end: () => {}, isActive: () => false },
    theme: { current: 'midnight' as ThemeName, set: () => {}, list: () => [], config: () => ({ name: 'Midnight' }) },
    font: { current: 'jetbrains' as FontName, set: () => {}, list: () => [], config: () => ({ name: 'JetBrains Mono' }) },
    sound: { enabled: false, toggle: () => {} },
    uptime: () => 0,
    currentDirectory: '~',
    setCurrentDirectory: () => {},
    openUrl: () => {},
    collections: { books: [], vinyl: [], hardware: [], notes: [] },
  }
}

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
