import { describe, it, expect } from 'vitest'
import { grepCommand, headCommand, tailCommand, wcCommand, sortCommand } from '../commands/filters'
import type { ExecuteContext, ThemeName, FontName } from '../types'

function ctx(stdin?: string[]): ExecuteContext {
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
    stdin,
  }
}

const LINES = ['alpha', 'Bravo', 'charlie', '', 'bravo two']

describe('grep', () => {
  it('errors without stdin', () => {
    expect(grepCommand.execute(['x'], ctx())).toEqual({ success: false, error: 'grep: missing input — use in a pipeline (e.g. ls | grep books)' })
  })
  it('errors without a pattern', () => {
    expect(grepCommand.execute([], ctx(LINES))).toEqual({ success: false, error: 'Usage: grep <pattern>' })
  })
  it('matches case-insensitively', () => {
    expect(grepCommand.execute(['bravo'], ctx(LINES))).toEqual({ success: true, output: ['Bravo', 'bravo two'] })
  })
  it('-v inverts the match', () => {
    expect(grepCommand.execute(['-v', 'bravo'], ctx(LINES))).toEqual({ success: true, output: ['alpha', 'charlie', ''] })
  })
  it('returns empty output on no matches (pipeline-safe, like real grep)', () => {
    expect(grepCommand.execute(['zz'], ctx(LINES))).toEqual({ success: true, output: [] })
  })
  it('grep handles empty stdin', () => {
    expect(grepCommand.execute(['x'], ctx([]))).toEqual({ success: true, output: [] })
  })
  it('is marked as a filter', () => {
    expect(grepCommand.filter).toBe(true)
  })
})

describe('head/tail', () => {
  it('head defaults to 10', () => {
    const many = Array.from({ length: 15 }, (_, i) => `l${i}`)
    expect(headCommand.execute([], ctx(many))).toEqual({ success: true, output: many.slice(0, 10) })
  })
  it('head takes a count', () => {
    expect(headCommand.execute(['2'], ctx(LINES))).toEqual({ success: true, output: ['alpha', 'Bravo'] })
  })
  it('tail takes a count from the end', () => {
    expect(tailCommand.execute(['2'], ctx(LINES))).toEqual({ success: true, output: ['', 'bravo two'] })
  })
  it('head rejects a non-numeric count', () => {
    expect(headCommand.execute(['x'], ctx(LINES))).toEqual({ success: false, error: 'head: invalid count: x' })
  })
  it('head rejects a trailing-garbage count', () => {
    expect(headCommand.execute(['5x'], ctx(LINES))).toEqual({ success: false, error: 'head: invalid count: 5x' })
  })
  it('head is marked as a filter', () => {
    expect(headCommand.filter).toBe(true)
  })
  it('tail is marked as a filter', () => {
    expect(tailCommand.filter).toBe(true)
  })
})

describe('wc', () => {
  it('counts non-empty lines', () => {
    expect(wcCommand.execute([], ctx(LINES))).toEqual({ success: true, output: '4' })
  })
  it('is marked as a filter', () => {
    expect(wcCommand.filter).toBe(true)
  })
})

describe('sort', () => {
  it('sorts lexicographically, case-insensitive', () => {
    expect(sortCommand.execute([], ctx(['b', 'A', 'c']))).toEqual({ success: true, output: ['A', 'b', 'c'] })
  })
  it('-r reverses', () => {
    expect(sortCommand.execute(['-r'], ctx(['b', 'A', 'c']))).toEqual({ success: true, output: ['c', 'b', 'A'] })
  })
  it('is marked as a filter', () => {
    expect(sortCommand.filter).toBe(true)
  })
})
