import { describe, it, expect, vi } from 'vitest'
import {
  aboutCommand,
  contactCommand,
  projectsCommand,
  whoamiCommand,
  dateCommand,
} from '../commands/info'
import type { ExecuteContext, ThemeName, FontName, TerminalLine } from '../types'

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

describe('aboutCommand', () => {
  it('returns array with author info', () => {
    const context = createMockContext()
    const result = aboutCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(Array.isArray(result.output)).toBe(true)
    }
  })

  it('contains "Zachary"', () => {
    const context = createMockContext()
    const result = aboutCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Zachary'))).toBe(true)
    }
  })

  it('contains "Creative Technologist"', () => {
    const context = createMockContext()
    const result = aboutCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Creative Technologist'))).toBe(true)
    }
  })

  it('has correct name and description', () => {
    expect(aboutCommand.name).toBe('about')
    expect(aboutCommand.description).toBe('About the author')
  })
})

describe('contactCommand', () => {
  it('returns TerminalLine array with links', () => {
    const context = createMockContext()
    const result = contactCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as TerminalLine[]
      expect(Array.isArray(output)).toBe(true)
      expect(output.some(line => line.type === 'link')).toBe(true)
    }
  })

  it('contains email link with href', () => {
    const context = createMockContext()
    const result = contactCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as TerminalLine[]
      const emailLink = output.find(line => line.content.includes('Email'))
      expect(emailLink).toBeDefined()
      expect(emailLink?.type).toBe('link')
      expect(emailLink?.href).toBe('mailto:zachary@thefrenchjockey.com')
    }
  })

  it('contains GitHub link with href', () => {
    const context = createMockContext()
    const result = contactCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as TerminalLine[]
      const githubLink = output.find(line => line.content.includes('GitHub'))
      expect(githubLink).toBeDefined()
      expect(githubLink?.type).toBe('link')
      expect(githubLink?.href).toBe('https://github.com/zacblev1')
    }
  })

  it('has correct name and description', () => {
    expect(contactCommand.name).toBe('contact')
    expect(contactCommand.description).toBe('Contact information')
  })
})

describe('projectsCommand', () => {
  it('calls context.openUrl with GitHub URL', () => {
    const context = createMockContext()
    projectsCommand.execute([], context)

    expect(context.openUrl).toHaveBeenCalledWith('https://github.com/zacblev1')
  })

  it('returns "Opening GitHub..." message', () => {
    const context = createMockContext()
    const result = projectsCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe('Opening GitHub...')
    }
  })

  it('has correct name and description', () => {
    expect(projectsCommand.name).toBe('projects')
    expect(projectsCommand.description).toBe('View projects')
  })
})

describe('whoamiCommand', () => {
  it('returns "zachary"', () => {
    const context = createMockContext()
    const result = whoamiCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe('zachary')
    }
  })

  it('has correct name and description', () => {
    expect(whoamiCommand.name).toBe('whoami')
    expect(whoamiCommand.description).toBe('Display current user')
  })
})

describe('dateCommand', () => {
  it('returns a string', () => {
    const context = createMockContext()
    const result = dateCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(typeof result.output).toBe('string')
    }
  })

  it('contains current year', () => {
    const context = createMockContext()
    const result = dateCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const currentYear = new Date().getFullYear().toString()
      expect(result.output).toContain(currentYear)
    }
  })

  it('has correct name and description', () => {
    expect(dateCommand.name).toBe('date')
    expect(dateCommand.description).toBe('Display current date and time')
  })
})
