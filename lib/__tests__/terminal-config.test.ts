import { describe, it, expect } from 'vitest'
import { themes, fonts, GAME_NAMES, COMMAND_DESCRIPTIONS } from '@/lib/terminal-config'
import { VALID_COMMANDS } from '@/components/terminal/types'

describe('terminal-config', () => {
  it('exports all 7 themes (6 visible + hidden phosphor)', () => {
    expect(Object.keys(themes)).toHaveLength(7)
    expect(themes.midnight.name).toBe('Midnight')
    expect(themes.phosphor.name).toBe('Phosphor')
  })

  it('exports all 6 fonts', () => {
    expect(Object.keys(fonts)).toHaveLength(6)
    expect(fonts.jetbrains.name).toBe('JetBrains Mono')
  })

  it('GAME_NAMES has 8 games and excludes suggest', () => {
    expect(GAME_NAMES).toHaveLength(8)
    expect(GAME_NAMES).not.toContain('suggest')
  })

  it('COMMAND_DESCRIPTIONS covers all VALID_COMMANDS', () => {
    for (const cmd of VALID_COMMANDS) {
      expect(COMMAND_DESCRIPTIONS[cmd]).toBeDefined()
    }
  })
})
