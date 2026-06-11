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
      commands: () => [],
    },
    game: {
      start: vi.fn(),
      end: vi.fn(),
      isActive: () => false,
    },
    theme: {
      current: 'midnight' as ThemeName,
      set: vi.fn(),
      list: () => ['midnight', 'dracula', 'gruvbox'] as ThemeName[],
      config: (name: ThemeName) => ({
        name: name === 'midnight' ? 'Midnight' : name.charAt(0).toUpperCase() + name.slice(1),
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
    sound: { enabled: false, toggle: () => {} },
    uptime: () => 0,
    collections: {
      books: [{} as ExecuteContext['collections']['books'][0], {} as ExecuteContext['collections']['books'][0], {} as ExecuteContext['collections']['books'][0]],
      vinyl: [{} as ExecuteContext['collections']['vinyl'][0], {} as ExecuteContext['collections']['vinyl'][0]],
      hardware: [{} as ExecuteContext['collections']['hardware'][0]],
      notes: [],
    },
  }
}

describe('themeCommand', () => {
  it('lists themes when no argument provided', async () => {
    const context = createMockContext()
    const result = await themeCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Available themes'))).toBe(true)
    }
  })

  it('shows asterisk next to current theme', async () => {
    const context = createMockContext()
    const result = await themeCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      const midnightLine = output.find(line => line.includes('midnight') && line.includes('Midnight'))
      expect(midnightLine).toContain('*')
    }
  })

  it('shows no asterisk next to non-current themes', async () => {
    const context = createMockContext()
    const result = await themeCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      const draculaLine = output.find(line => line.includes('dracula') && line.includes('Dracula'))
      // Should not start with asterisk
      expect(draculaLine?.trim().startsWith('*')).toBe(false)
    }
  })

  it('sets theme when valid name provided', async () => {
    const context = createMockContext()
    const result = await themeCommand.execute(['dracula'], context)

    expect(result.success).toBe(true)
    expect(context.theme.set).toHaveBeenCalledWith('dracula')
    if (result.success) {
      expect(result.output).toContain('Theme set to')
    }
  })

  it('returns error for unknown theme', async () => {
    const context = createMockContext()
    const result = await themeCommand.execute(['invalidtheme'], context)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Unknown theme')
      expect(result.error).toContain('invalidtheme')
    }
  })

  it('calls context.theme.set with theme name', async () => {
    const context = createMockContext()
    await themeCommand.execute(['gruvbox'], context)

    expect(context.theme.set).toHaveBeenCalledWith('gruvbox')
  })

  it('handles case-insensitive theme names', async () => {
    const context = createMockContext()
    const result = await themeCommand.execute(['DRACULA'], context)

    expect(result.success).toBe(true)
    expect(context.theme.set).toHaveBeenCalledWith('dracula')
  })

  it('has correct name and description', async () => {
    expect(themeCommand.name).toBe('theme')
    expect(themeCommand.description).toBe('Change terminal color theme')
  })
})

describe('fontCommand', () => {
  it('lists fonts when no argument provided', async () => {
    const context = createMockContext()
    const result = await fontCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Available fonts'))).toBe(true)
    }
  })

  it('shows asterisk next to current font', async () => {
    const context = createMockContext()
    const result = await fontCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      const jetbrainsLine = output.find(line => line.includes('jetbrains'))
      expect(jetbrainsLine).toContain('*')
    }
  })

  it('shows no asterisk next to non-current fonts', async () => {
    const context = createMockContext()
    const result = await fontCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      const firaLine = output.find(line => line.includes('fira'))
      expect(firaLine?.trim().startsWith('*')).toBe(false)
    }
  })

  it('sets font when valid name provided', async () => {
    const context = createMockContext()
    const result = await fontCommand.execute(['fira'], context)

    expect(result.success).toBe(true)
    expect(context.font.set).toHaveBeenCalledWith('fira')
    if (result.success) {
      expect(result.output).toContain('Font set to')
    }
  })

  it('returns error for unknown font', async () => {
    const context = createMockContext()
    const result = await fontCommand.execute(['invalidfont'], context)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Unknown font')
      expect(result.error).toContain('invalidfont')
    }
  })

  it('calls context.font.set with font name', async () => {
    const context = createMockContext()
    await fontCommand.execute(['mono'], context)

    expect(context.font.set).toHaveBeenCalledWith('mono')
  })

  it('handles case-insensitive font names', async () => {
    const context = createMockContext()
    const result = await fontCommand.execute(['FIRA'], context)

    expect(result.success).toBe(true)
    expect(context.font.set).toHaveBeenCalledWith('fira')
  })

  it('has correct name and description', async () => {
    expect(fontCommand.name).toBe('font')
    expect(fontCommand.description).toBe('Change terminal font')
  })
})

describe('neofetchCommand', () => {
  it('returns system info array', async () => {
    const context = createMockContext()
    const result = await neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(Array.isArray(result.output)).toBe(true)
    }
  })

  it('contains current theme name', async () => {
    const context = createMockContext()
    const result = await neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Theme:') && line.includes('Midnight'))).toBe(true)
    }
  })

  it('contains current font name', async () => {
    const context = createMockContext()
    const result = await neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Font:') && line.includes('JetBrains Mono'))).toBe(true)
    }
  })

  it('contains collection counts', async () => {
    const context = createMockContext()
    const result = await neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Collections: 3 books, 2 vinyl, 1 hardware'))).toBe(true)
    }
  })

  it('contains zachary@home header', async () => {
    const context = createMockContext()
    const result = await neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('zachary@home'))).toBe(true)
    }
  })

  it('contains shell and terminal info', async () => {
    const context = createMockContext()
    const result = await neofetchCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Shell: zach-sh'))).toBe(true)
      expect(output.some(line => line.includes('OS: CYBER_PORTFOLIO v1.0'))).toBe(true)
      expect(output.some(line => line.includes('Uptime:'))).toBe(true)
    }
  })

  it('has correct name and description', async () => {
    expect(neofetchCommand.name).toBe('neofetch')
    expect(neofetchCommand.description).toBe('Display system information')
  })
})
