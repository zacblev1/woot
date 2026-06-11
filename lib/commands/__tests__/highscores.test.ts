import { describe, it, expect, vi, afterEach } from 'vitest'
import { highscoresCommand } from '../commands/highscores'
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

function score(over: Partial<{ initials: string; score: number; level: number; createdAt: string }> = {}) {
  return { id: 1, gameType: 'tron', initials: 'ZAB', score: 4200, level: 3, createdAt: '2026-06-11T10:00:00.000Z', ...over }
}

afterEach(() => vi.unstubAllGlobals())

describe('highscores <game>', () => {
  it('rejects an unknown game', async () => {
    expect(await highscoresCommand.execute(['chess'], ctx())).toEqual({
      success: false,
      error: 'highscores: unknown game: chess',
    })
  })

  it('renders a top-10 table for one game', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      expect(url).toBe('/api/scores/tron?limit=10')
      return new Response(JSON.stringify({ scores: [score(), score({ initials: 'ME', score: 100, level: 1 })] }), { status: 200 })
    }))
    const result = await highscoresCommand.execute(['tron'], ctx())
    expect(result.success).toBe(true)
    const out = (result as { output: string[] }).output
    expect(out.join('\n')).toContain('TRON')
    expect(out.join('\n')).toMatch(/1\.\s+ZAB\s+4,200\s+L3\s+2026-06-11/)
    expect(out.join('\n')).toMatch(/2\.\s+ME\s+100/)
  })

  it('reports an empty board', async () => {
    // explicit stub: unstubAllGlobals in afterEach also removes the setup-file stub
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ scores: [] }), { status: 200 })))
    const result = await highscoresCommand.execute(['tron'], ctx())
    expect(result.success).toBe(true)
    expect((result as { output: string[] }).output.join('\n')).toContain('No scores yet')
  })

  it('degrades gracefully when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await highscoresCommand.execute(['tron'], ctx())).toEqual({
      success: false,
      error: 'highscores: could not reach the scoreboard',
    })
  })
})

describe('highscores (all games)', () => {
  it('shows a top-3 section per game type', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      new Response(JSON.stringify({ scores: url.includes('tron') ? [score()] : [] }), { status: 200 })
    ))
    const result = await highscoresCommand.execute([], ctx())
    expect(result.success).toBe(true)
    const text = (result as { output: string[] }).output.join('\n')
    expect(text).toContain('TRON')
    expect(text).toContain('PACMAN')
    expect(text).toContain('BASKETBALL')
    expect(text).toContain('ZAB')
  })
})
