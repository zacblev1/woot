import { describe, it, expect, vi } from 'vitest'
import { themeCommand, fontCommand, neofetchCommand } from '../commands/style'
import type { ExecuteContext, ThemeName, FontName } from '../types'

// Helper to create a mock context
function createMockContext(): ExecuteContext {
  return {
    vfs: {
      pwd: () => '/',
      cd: vi.fn(() => null),
      ls: () => [],
      resolve: () => null,
      mkdir: vi.fn(() => null),
      touch: vi.fn(() => null),
      rm: vi.fn(() => null),
    },
    history: {
      add: vi.fn(),
      clear: vi.fn(),
    },
    game: {
      start: vi.fn(),
      end: vi.fn(),
      isActive: () => false,
    },
    theme: {
      current: 'lumon' as ThemeName,
      set: vi.fn(),
      list: () => ['lumon', 'dracula', 'gruvbox'] as ThemeName[],
      config: (name: ThemeName) => ({
        name: name === 'lumon' ? 'Lumon' : name.charAt(0).toUpperCase() + name.slice(1),
      }),
    },
    font: {
      current: 'jetbrains' as FontName,
      set: vi.fn(),
      list: () => ['jetbrains', 'fira', 'mono'] as FontName[],
      config: (name: FontName) => ({
        name: name === 'jetbrains' ? 'JetBrains Mono' : name,
      }),
    },
    currentDirectory: '~',
    setCurrentDirectory: vi.fn(),
    openUrl: vi.fn(),
    collections: {
      books: [{} as ExecuteContext['collections']['books'][0], {} as ExecuteContext['collections']['books'][0], {} as ExecuteContext['collections']['books'][0]],
      vinyl: [{} as ExecuteContext['collections']['vinyl'][0], {} as ExecuteContext['collections']['vinyl'][0]],
      hardware: [{} as ExecuteContext['collections']['hardware'][0]],
    },
  }
}

describe('themeCommand', () => {
  it('lists themes when no argument provided', () => {
    const context = createMockContext()
    const result = themeCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Available themes'))).toBe(true)
    }
  })

  it('shows asterisk next to current theme', () => {
    const context = createMockContext()
    const result = themeCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      const lumonLine = output.find(line => line.includes('lumon') && line.includes('Lumon'))
      expect(lumonLine).toContain('*')
    }
  })

  it('shows no asterisk next to non-current themes', () => {
    const context = createMockContext()
    const result = themeCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      const draculaLine = output.find(line => line.includes('dracula') && line.includes('Dracula'))
      // Should not start with asterisk
      expect(draculaLine?.trim().startsWith('*')).toBe(false)
    }
  })

  it('sets theme when valid name provided', () => {
    const context = createMockContext()
    const result = themeCommand.execute(['dracula'], context)

    expect(result.success).toBe(true)
    expect(context.theme.set).toHaveBeenCalledWith('dracula')
    if (result.success) {
      expect(result.output).toContain('Theme set to')
    }
  })

  it('returns error for unknown theme', () => {
    const context = createMockContext()
    const result = themeCommand.execute(['invalidtheme'], context)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Unknown theme')
      expect(result.error).toContain('invalidtheme')
    }
  })

  it('calls context.theme.set with theme name', () => {
    const context = createMockContext()
    themeCommand.execute(['gruvbox'], context)

    expect(context.theme.set).toHaveBeenCalledWith('gruvbox')
  })

  it('handles case-insensitive theme names', () => {
    const context = createMockContext()
    const result = themeCommand.execute(['DRACULA'], context)

    expect(result.success).toBe(true)
    expect(context.theme.set).toHaveBeenCalledWith('dracula')
  })

  it('has correct name and description', () => {
    expect(themeCommand.name).toBe('theme')
    expect(themeCommand.description).toBe('Change terminal color theme')
  })
})

describe('fontCommand', () => {
  it('lists fonts when no argument provided', () => {
    const context = createMockContext()
    const result = fontCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Available fonts'))).toBe(true)
    }
  })

  it('shows asterisk next to current font', () => {
    const context = createMockContext()
    const result = fontCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      const jetbrainsLine = output.find(line => line.includes('jetbrains'))
      expect(jetbrainsLine).toContain('*')
    }
  })

  it('shows no asterisk next to non-current fonts', () => {
    const context = createMockContext()
    const result = fontCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      const firaLine = output.find(line => line.includes('fira'))
      expect(firaLine?.trim().startsWith('*')).toBe(false)
    }
  })

  it('sets font when valid name provided', () => {
    const context = createMockContext()
    const result = fontCommand.execute(['fira'], context)

    expect(result.success).toBe(true)
    expect(context.font.set).toHaveBeenCalledWith('fira')
    if (result.success) {
      expect(result.output).toContain('Font set to')
    }
  })

  it('returns error for unknown font', () => {
    const context = createMockContext()
    const result = fontCommand.execute(['invalidfont'], context)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Unknown font')
      expect(result.error).toContain('invalidfont')
    }
  })

  it('calls context.font.set with font name', () => {
    const context = createMockContext()
    fontCommand.execute(['mono'], context)

    expect(context.font.set).toHaveBeenCalledWith('mono')
  })

  it('handles case-insensitive font names', () => {
    const context = createMockContext()
    const result = fontCommand.execute(['FIRA'], context)

    expect(result.success).toBe(true)
    expect(context.font.set).toHaveBeenCalledWith('fira')
  })

  it('has correct name and description', () => {
    expect(fontCommand.name).toBe('font')
    expect(fontCommand.description).toBe('Change terminal font')
  })
})

describe('neofetchCommand', () => {
  it('returns system info array', () => {
    const context = createMockContext()
    const result = neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(Array.isArray(result.output)).toBe(true)
    }
  })

  it('contains current theme name', () => {
    const context = createMockContext()
    const result = neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Theme:') && line.includes('Lumon'))).toBe(true)
    }
  })

  it('contains current font name', () => {
    const context = createMockContext()
    const result = neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Font:') && line.includes('JetBrains Mono'))).toBe(true)
    }
  })

  it('contains collection counts', () => {
    const context = createMockContext()
    const result = neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Books: 3'))).toBe(true)
      expect(output.some(line => line.includes('Vinyl: 2'))).toBe(true)
      expect(output.some(line => line.includes('Hardware: 1'))).toBe(true)
    }
  })

  it('contains zachary@home header', () => {
    const context = createMockContext()
    const result = neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('zachary@home'))).toBe(true)
    }
  })

  it('contains shell and terminal info', () => {
    const context = createMockContext()
    const result = neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Shell: web/1.0'))).toBe(true)
      expect(output.some(line => line.includes('Terminal: browser'))).toBe(true)
    }
  })

  it('has correct name and description', () => {
    expect(neofetchCommand.name).toBe('neofetch')
    expect(neofetchCommand.description).toBe('Display system information')
  })
})
