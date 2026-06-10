import { describe, it, expect } from 'vitest'
import { cowsayCommand } from '../commands/fun'
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

describe('cowsay', () => {
  it('errors without text', () => {
    expect(cowsayCommand.execute([], ctx())).toEqual({ success: false, error: 'Usage: cowsay <text>' })
  })
  it('wraps text in a bubble with the cow', () => {
    const result = cowsayCommand.execute(['moo'], ctx())
    expect(result.success).toBe(true)
    const out = (result as { success: true; output: string[] }).output
    expect(out).toContain(' < moo >')
    expect(out.join('\n')).toContain('(oo)')
  })
  it('wraps long text at 40 columns into multiple bubble lines', () => {
    const text = 'a'.repeat(50) + ' ' + 'b'.repeat(20)
    const result = cowsayCommand.execute(text.split(' '), ctx())
    expect(result.success).toBe(true)
    const out = (result as { success: true; output: string[] }).output
    expect(out.filter((l: string) => l.startsWith(' | ') || l.startsWith(' / ') || l.startsWith(' \\ ')).length).toBeGreaterThanOrEqual(2)
  })
})
