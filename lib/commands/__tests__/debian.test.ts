import { describe, it, expect, vi } from 'vitest'
import { debianCommand } from '../commands/debian'
import { helpCommand } from '../commands/system'
import { manPages } from '../man-pages'
import { createDefaultRegistry } from '../index'
import type { ExecuteContext } from '../types'

function contextWithGame(start = vi.fn()) {
  return { game: { start, end: vi.fn(), isActive: () => false } } as unknown as ExecuteContext
}

describe('debianCommand', () => {
  it('opens the Debian VM overlay through the game host and prints nothing itself', async () => {
    const start = vi.fn()
    const result = await debianCommand.execute([], contextWithGame(start))
    expect(start).toHaveBeenCalledWith('debian')
    expect(result).toEqual({ success: true, output: [] })
  })

  it('rejects arguments with a usage error instead of launching', async () => {
    const start = vi.fn()
    const result = await debianCommand.execute(['--help'], contextWithGame(start))
    expect(result.success).toBe(false)
    expect(start).not.toHaveBeenCalled()
  })

  it('is registered in the default registry', () => {
    expect(createDefaultRegistry().get('debian')).toBe(debianCommand)
  })

  it('is listed in help and has a man page', async () => {
    const help = await helpCommand.execute([], contextWithGame())
    expect(help.success && (help.output as string[]).some((l) => /\bdebian\b/.test(l))).toBe(true)
    expect(manPages.debian?.join('\n')).toMatch(/real Debian/)
  })
})
