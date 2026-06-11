import { describe, it, expect, vi } from 'vitest'
import { lsCommand, cdCommand, pwdCommand, catCommand, viewCommand } from '../commands/navigation'
import type { ExecuteContext } from '../types'
import type { CommandResult, CommandOutput } from '@/lib/types/terminal'
import type { ThemeName, FontName } from '@/lib/types/terminal'

/**
 * Narrow a CommandResult to its success branch, failing loudly otherwise.
 */
function getOutput(result: CommandResult): CommandOutput {
  if (!result.success) {
    throw new Error(`Expected success result, got error: ${result.error}`)
  }
  return result.output
}

/**
 * Extract content strings from a TerminalLine[] command output.
 */
function lineContents(result: CommandResult): string[] {
  const output = getOutput(result)
  return (output as Array<{ content: string }>).map((l) => l.content)
}


/**
 * Create a mock ExecuteContext for testing.
 * All methods are no-ops or return sensible defaults.
 */
function createMockContext(overrides: Partial<ExecuteContext> = {}): ExecuteContext {
  return {
    vfs: {
      pwd: () => '/home/zachary',
      cd: () => null,
      ls: () => ['books', 'vinyl', 'hardware'],
      resolve: () => null,
      mkdir: () => null,
      touch: () => null,
      rm: () => null,
    },
    history: {
      add: () => {},
      clear: () => {},
      commands: () => [],
    },
    game: {
      start: () => {},
      end: () => {},
      isActive: () => false,
    },
    theme: {
      current: 'midnight' as ThemeName,
      set: () => {},
      list: () => ['midnight', 'dracula'] as ThemeName[],
      config: () => ({ name: 'Midnight' }),
    },
    font: {
      current: 'jetbrains' as FontName,
      set: () => {},
      list: () => ['jetbrains', 'fira'] as FontName[],
      config: () => ({ name: 'JetBrains Mono' }),
    },
    currentDirectory: '~',
    setCurrentDirectory: () => {},
    openUrl: () => {},
    sound: { enabled: false, toggle: () => {} },
    uptime: () => 0,
    collections: {
      books: [],
      vinyl: [],
      hardware: [],
      notes: [],
    },
    ...overrides,
  }
}

describe('lsCommand', () => {
  it('has correct name and description', async () => {
    expect(lsCommand.name).toBe('ls')
    expect(lsCommand.description).toBe('List directory contents')
    expect(lsCommand.usage).toBe('ls [path]')
  })

  it('returns empty string for empty directory', async () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        ls: () => [],
      },
    })

    const result = await lsCommand.execute([], context)

    expect(result).toEqual({ success: true, output: '' })
  })

  it('returns formatted list with blank lines for files', async () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        ls: () => ['file1.txt', 'file2.txt', 'directory'],
      },
    })

    const result = await lsCommand.execute([], context)

    expect(result).toEqual({
      success: true,
      output: ['', 'file1.txt', 'file2.txt', 'directory', ''],
    })
  })

  it('accepts path argument', async () => {
    const lsFn = vi.fn(() => ['subfile.txt'])
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        ls: lsFn,
      },
    })

    const result = await lsCommand.execute(['/some/path'], context)

    expect(lsFn).toHaveBeenCalledWith('/some/path')
    expect(result).toEqual({
      success: true,
      output: ['', 'subfile.txt', ''],
    })
  })

  it('handles directory with many entries', async () => {
    const entries = ['a', 'b', 'c', 'd', 'e']
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        ls: () => entries,
      },
    })

    const result = await lsCommand.execute([], context)

    expect(result).toEqual({
      success: true,
      output: ['', 'a', 'b', 'c', 'd', 'e', ''],
    })
  })

  it('returns ls error message directly', async () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        ls: () => ['ls: /nonexistent: No such file or directory'],
      },
    })

    const result = await lsCommand.execute(['/nonexistent'], context)

    expect(result).toEqual({
      success: true,
      output: 'ls: /nonexistent: No such file or directory',
    })
  })

  describe('collection directory display names', () => {
    it('shows book titles instead of slugs in ~/books', async () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/books',
          ls: () => ['dune', 'the-pragmatic-programmer'],
          resolve: (path: string) => {
            if (path === 'dune') {
              return { type: 'file', name: 'dune', content: { title: 'Dune', author: 'Frank Herbert' } }
            }
            if (path === 'the-pragmatic-programmer') {
              return { type: 'file', name: 'the-pragmatic-programmer', content: { title: 'The Pragmatic Programmer', author: 'David Thomas' } }
            }
            return { type: 'directory', name: 'books', children: {} }
          },
        },
      })

      const result = await lsCommand.execute([], context)

      expect(result.success).toBe(true)
      expect(getOutput(result)).toEqual([
        { type: 'output', content: '' },
        { type: 'success', content: 'Dune' },
        { type: 'output', content: '    by Frank Herbert' },
        { type: 'success', content: 'The Pragmatic Programmer' },
        { type: 'output', content: '    by David Thomas' },
        { type: 'output', content: '' },
      ])
    })

    it('shows vinyl titles instead of slugs in ~/vinyl', async () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/vinyl',
          ls: () => ['abbey-road', 'dark-side-of-the-moon'],
          resolve: (path: string) => {
            if (path === 'abbey-road') {
              return { type: 'file', name: 'abbey-road', content: { title: 'Abbey Road', artist: 'The Beatles' } }
            }
            if (path === 'dark-side-of-the-moon') {
              return { type: 'file', name: 'dark-side-of-the-moon', content: { title: 'The Dark Side of the Moon', artist: 'Pink Floyd' } }
            }
            return { type: 'directory', name: 'vinyl', children: {} }
          },
        },
      })

      const result = await lsCommand.execute([], context)

      expect(result.success).toBe(true)
      expect(getOutput(result)).toEqual([
        { type: 'output', content: '' },
        { type: 'success', content: 'Abbey Road' },
        { type: 'output', content: '    by The Beatles' },
        { type: 'success', content: 'The Dark Side of the Moon' },
        { type: 'output', content: '    by Pink Floyd' },
        { type: 'output', content: '' },
      ])
    })

    it('shows hardware names instead of slugs in ~/hardware', async () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/hardware',
          ls: () => ['macbook-pro', 'raspberry-pi-4'],
          resolve: (path: string) => {
            if (path === 'macbook-pro') {
              return { type: 'file', name: 'macbook-pro', content: { name: 'MacBook Pro 14"', type: 'Laptop' } }
            }
            if (path === 'raspberry-pi-4') {
              return { type: 'file', name: 'raspberry-pi-4', content: { name: 'Raspberry Pi 4', type: 'SBC' } }
            }
            return { type: 'directory', name: 'hardware', children: {} }
          },
        },
      })

      const result = await lsCommand.execute([], context)

      expect(result.success).toBe(true)
      expect(getOutput(result)).toEqual([
        { type: 'output', content: '' },
        { type: 'success', content: 'MacBook Pro 14"' },
        { type: 'output', content: '    Laptop' },
        { type: 'success', content: 'Raspberry Pi 4' },
        { type: 'output', content: '    SBC' },
        { type: 'output', content: '' },
      ])
    })

    it('falls back to filename when content has no title/name', async () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/books',
          ls: () => ['unknown-file'],
          resolve: (path: string) => {
            if (path === 'unknown-file') {
              return { type: 'file', name: 'unknown-file', content: {} }
            }
            return { type: 'directory', name: 'books', children: {} }
          },
        },
      })

      const result = await lsCommand.execute([], context)

      expect(result.success).toBe(true)
      expect(getOutput(result)).toEqual([
        { type: 'output', content: '' },
        { type: 'success', content: 'unknown-file' },
        { type: 'output', content: '' },
      ])
    })

    it('falls back to filename when resolve returns null', async () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/books',
          ls: () => ['orphan-file'],
          resolve: () => null,
        },
      })

      const result = await lsCommand.execute([], context)

      expect(result.success).toBe(true)
      expect(getOutput(result)).toEqual([
        { type: 'output', content: '' },
        { type: 'output', content: 'orphan-file' },
        { type: 'output', content: '' },
      ])
    })

    it('does not show display names for non-collection directories', async () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary',
          ls: () => ['books', 'vinyl', 'hardware'],
          resolve: () => ({ type: 'directory', name: 'dir', children: {} }),
        },
      })

      const result = await lsCommand.execute([], context)

      expect(result).toEqual({
        success: true,
        output: ['', 'books', 'vinyl', 'hardware', ''],
      })
    })

    it('shows raw slugs when ls is given a path argument (detailed view is pwd-only)', async () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary',
          ls: (path?: string) => {
            if (path === 'books') {
              return ['dune', 'neuromancer']
            }
            return ['books', 'vinyl', 'hardware']
          },
          resolve: (path: string) => {
            if (path === 'books') {
              return { type: 'directory', name: 'books', children: {} }
            }
            if (path === 'dune') {
              return { type: 'file', name: 'dune', content: { title: 'Dune' } }
            }
            if (path === 'neuromancer') {
              return { type: 'file', name: 'neuromancer', content: { title: 'Neuromancer' } }
            }
            return null
          },
        },
      })

      const result = await lsCommand.execute(['books'], context)

      expect(result).toEqual({
        success: true,
        output: ['', 'dune', 'neuromancer', ''],
      })
    })
  })
})

describe('cdCommand', () => {
  it('has correct name and description', async () => {
    expect(cdCommand.name).toBe('cd')
    expect(cdCommand.description).toBe('Change directory')
    expect(cdCommand.usage).toBe('cd [path]')
  })

  it('changes to home with no args', async () => {
    const cdFn = vi.fn(() => null)
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: cdFn,
      },
    })

    const result = await cdCommand.execute([], context)

    expect(cdFn).toHaveBeenCalledWith('~')
    expect(result).toEqual({ success: true, output: '' })
  })

  it('changes to specified path', async () => {
    const cdFn = vi.fn(() => null)
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: cdFn,
        pwd: () => '/home/zachary/books',
      },
    })

    const result = await cdCommand.execute(['/home/zachary/books'], context)

    expect(cdFn).toHaveBeenCalledWith('/home/zachary/books')
    expect(result).toEqual({ success: true, output: '' })
  })

  it('returns error for invalid path', async () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: () => 'cd: /nonexistent: No such file or directory',
      },
    })

    const result = await cdCommand.execute(['/nonexistent'], context)

    expect(result).toEqual({
      success: false,
      error: 'cd: /nonexistent: No such file or directory',
    })
  })

  it('updates currentDirectory display format with ~ prefix', async () => {
    const setCurrentDirectory = vi.fn()
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: () => null,
        pwd: () => '/home/zachary/books',
      },
      setCurrentDirectory,
    })

    await cdCommand.execute(['books'], context)

    expect(setCurrentDirectory).toHaveBeenCalledWith('~/books')
  })

  it('updates currentDirectory for home directory as ~', async () => {
    const setCurrentDirectory = vi.fn()
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: () => null,
        pwd: () => '/home/zachary',
      },
      setCurrentDirectory,
    })

    await cdCommand.execute([], context)

    expect(setCurrentDirectory).toHaveBeenCalledWith('~')
  })

  it('preserves full path for directories outside home', async () => {
    const setCurrentDirectory = vi.fn()
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: () => null,
        pwd: () => '/var/log',
      },
      setCurrentDirectory,
    })

    await cdCommand.execute(['/var/log'], context)

    expect(setCurrentDirectory).toHaveBeenCalledWith('/var/log')
  })
})

describe('pwdCommand', () => {
  it('has correct name and description', async () => {
    expect(pwdCommand.name).toBe('pwd')
    expect(pwdCommand.description).toBe('Print working directory')
    expect(pwdCommand.usage).toBe('pwd')
  })

  it('returns current working directory', async () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        pwd: () => '/home/zachary/books',
      },
    })

    const result = await pwdCommand.execute([], context)

    expect(result).toEqual({
      success: true,
      output: '/home/zachary/books',
    })
  })

  it('ignores any arguments', async () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        pwd: () => '/home/zachary',
      },
    })

    const result = await pwdCommand.execute(['ignored', 'args'], context)

    expect(result).toEqual({
      success: true,
      output: '/home/zachary',
    })
  })
})

describe('catCommand', () => {
  it('has correct name and description', async () => {
    expect(catCommand.name).toBe('cat')
    expect(catCommand.description).toBe('Display file contents')
    expect(catCommand.usage).toBe('cat <file>')
  })

  it('returns error without path argument', async () => {
    const context = createMockContext()

    const result = await catCommand.execute([], context)

    expect(result).toEqual({
      success: false,
      error: 'Usage: cat <file>',
    })
  })

  it('returns error for non-existent file', async () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        resolve: () => null,
      },
    })

    const result = await catCommand.execute(['missing.txt'], context)

    expect(result).toEqual({
      success: false,
      error: 'cat: missing.txt: No such file or directory',
    })
  })

  it('returns error for directory', async () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        resolve: () => ({ type: 'directory', name: 'books', children: {} }),
      },
    })

    const result = await catCommand.execute(['books'], context)

    expect(result).toEqual({
      success: false,
      error: 'cat: books: Is a directory',
    })
  })

  it('returns string content directly', async () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        resolve: () => ({
          type: 'file',
          name: 'readme.txt',
          content: 'Hello, world!',
        }),
      },
    })

    const result = await catCommand.execute(['readme.txt'], context)

    expect(result).toEqual({
      success: true,
      output: 'Hello, world!',
    })
  })

  it('returns JSON-stringified object content', async () => {
    const objectContent = { title: 'Test', author: 'Author' }
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        resolve: () => ({
          type: 'file',
          name: 'book.json',
          content: objectContent,
        }),
      },
    })

    const result = await catCommand.execute(['book.json'], context)

    expect(result).toEqual({
      success: true,
      output: JSON.stringify(objectContent, null, 2),
    })
  })
})

describe('viewCommand', () => {
  it('has correct name and description', async () => {
    expect(viewCommand.name).toBe('view')
    expect(viewCommand.description).toBe('Display formatted file contents')
    expect(viewCommand.usage).toBe('view <file>')
  })

  it('returns error without path argument', async () => {
    const context = createMockContext()

    const result = await viewCommand.execute([], context)

    expect(result).toEqual({
      success: false,
      error: 'Usage: view <file>',
    })
  })

  it('returns error for non-existent file', async () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        resolve: () => null,
      },
    })

    const result = await viewCommand.execute(['missing.txt'], context)

    expect(result).toEqual({
      success: false,
      error: 'view: missing.txt: No such file',
    })
  })

  it('returns error for directory', async () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        resolve: () => ({ type: 'directory', name: 'books', children: {} }),
      },
    })

    const result = await viewCommand.execute(['books'], context)

    expect(result).toEqual({
      success: false,
      error: 'view: books: Is a directory',
    })
  })

  describe('book formatting', () => {
    it('formats book content with title, author, genre, format', async () => {
      const book = {
        title: 'The Pragmatic Programmer',
        author: 'David Thomas',
        genre: 'Programming',
        format: 'Hardcover',
      }
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/books',
          resolve: () => ({ type: 'file', name: 'book.json', content: book }),
        },
      })

      const result = await viewCommand.execute(['book.json'], context)

      expect(result.success).toBe(true)
      expect(lineContents(result)).toEqual([
        '',
        '  Title:   The Pragmatic Programmer',
        '  Author:  David Thomas',
        '  Genre:   Programming',
        '  Format:  Hardcover',
        '',
      ])
    })

    it('formats book with multiple authors', async () => {
      const book = {
        title: 'The Pragmatic Programmer',
        author: ['David Thomas', 'Andrew Hunt'],
        genre: 'Programming',
        format: 'Hardcover',
      }
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/books',
          resolve: () => ({ type: 'file', name: 'book.json', content: book }),
        },
      })

      const result = await viewCommand.execute(['book.json'], context)

      expect(result.success).toBe(true)
      expect(lineContents(result)).toContain('  Author:  David Thomas, Andrew Hunt')
    })

    it('includes pages when available', async () => {
      const book = {
        title: 'Test Book',
        author: 'Author',
        genre: 'Fiction',
        format: 'Paperback',
        pages: 350,
      }
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/books',
          resolve: () => ({ type: 'file', name: 'book.json', content: book }),
        },
      })

      const result = await viewCommand.execute(['book.json'], context)

      expect(result.success).toBe(true)
      expect(lineContents(result)).toContain('  Pages:   350')
    })
  })

  describe('vinyl formatting', () => {
    it('formats vinyl content with title, artist, genre, format, label', async () => {
      const record = {
        title: 'Abbey Road',
        artist: 'The Beatles',
        genre: 'Rock',
        format: 'LP',
        label: 'Apple Records',
      }
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/vinyl',
          resolve: () => ({ type: 'file', name: 'record.json', content: record }),
        },
      })

      const result = await viewCommand.execute(['record.json'], context)

      expect(result.success).toBe(true)
      expect(lineContents(result)).toEqual([
        '',
        '  Title:   Abbey Road',
        '  Artist:  The Beatles',
        '  Genre:   Rock',
        '  Format:  LP',
        '  Label:   Apple Records',
        '',
      ])
    })
  })

  describe('hardware formatting', () => {
    it('formats hardware content with all fields', async () => {
      const device = {
        name: 'MacBook Pro',
        type: 'Laptop',
        processor: 'M1 Pro',
        memory: '16GB',
        storage: '512GB SSD',
        status: 'Active',
        graphics: 'Integrated',
        operating_system: 'macOS Sonoma',
      }
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/hardware',
          resolve: () => ({ type: 'file', name: 'device.json', content: device }),
        },
      })

      const result = await viewCommand.execute(['device.json'], context)

      expect(result.success).toBe(true)
      expect(getOutput(result)).toEqual([
        '',
        '  Name:       MacBook Pro',
        '  Type:       Laptop',
        '  Status:     Active',
        '  Processor:  M1 Pro',
        '  Memory:     16GB',
        '  Storage:    512GB SSD',
        '  Graphics:   Integrated',
        '  OS:         macOS Sonoma',
        '',
      ])
    })

    it('omits optional fields when not present', async () => {
      const device = {
        name: 'Raspberry Pi',
        type: 'SBC',
        processor: 'ARM Cortex',
        memory: '4GB',
        storage: '32GB SD',
        status: 'Active',
      }
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/hardware',
          resolve: () => ({ type: 'file', name: 'device.json', content: device }),
        },
      })

      const result = await viewCommand.execute(['device.json'], context)

      expect(result.success).toBe(true)
      expect(getOutput(result)).toEqual([
        '',
        '  Name:       Raspberry Pi',
        '  Type:       SBC',
        '  Status:     Active',
        '  Processor:  ARM Cortex',
        '  Memory:     4GB',
        '  Storage:    32GB SD',
        '',
      ])
    })
  })

  describe('fallback formatting', () => {
    it('falls back to raw string content for unknown types', async () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/other',
          resolve: () => ({
            type: 'file',
            name: 'readme.txt',
            content: 'Plain text content',
          }),
        },
      })

      const result = await viewCommand.execute(['readme.txt'], context)

      expect(result).toEqual({
        success: true,
        output: 'Plain text content',
      })
    })

    it('falls back to JSON-stringified content for unknown object types', async () => {
      const content = { unknown: 'format', data: 123 }
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/other',
          resolve: () => ({
            type: 'file',
            name: 'data.json',
            content,
          }),
        },
      })

      const result = await viewCommand.execute(['data.json'], context)

      expect(result).toEqual({
        success: true,
        output: JSON.stringify(content, null, 2),
      })
    })
  })
})
