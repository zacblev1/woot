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
    },
    game: {
      start: () => {},
      end: () => {},
      isActive: () => false,
    },
    theme: {
      current: 'lumon' as ThemeName,
      set: () => {},
      list: () => ['lumon', 'dracula'] as ThemeName[],
      config: () => ({ name: 'Lumon' }),
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
  it('has correct name and description', () => {
    expect(lsCommand.name).toBe('ls')
    expect(lsCommand.description).toBe('List directory contents')
    expect(lsCommand.usage).toBe('ls [path]')
  })

  it('returns empty string for empty directory', () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        ls: () => [],
      },
    })

    const result = lsCommand.execute([], context)

    expect(result).toEqual({ success: true, output: '' })
  })

  it('returns formatted list with blank lines for files', () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        ls: () => ['file1.txt', 'file2.txt', 'directory'],
      },
    })

    const result = lsCommand.execute([], context)

    expect(result).toEqual({
      success: true,
      output: ['', 'file1.txt', 'file2.txt', 'directory', ''],
    })
  })

  it('accepts path argument', () => {
    const lsFn = vi.fn(() => ['subfile.txt'])
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        ls: lsFn,
      },
    })

    const result = lsCommand.execute(['/some/path'], context)

    expect(lsFn).toHaveBeenCalledWith('/some/path')
    expect(result).toEqual({
      success: true,
      output: ['', 'subfile.txt', ''],
    })
  })

  it('handles directory with many entries', () => {
    const entries = ['a', 'b', 'c', 'd', 'e']
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        ls: () => entries,
      },
    })

    const result = lsCommand.execute([], context)

    expect(result).toEqual({
      success: true,
      output: ['', 'a', 'b', 'c', 'd', 'e', ''],
    })
  })

  it('returns ls error message directly', () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        ls: () => ['ls: /nonexistent: No such file or directory'],
      },
    })

    const result = lsCommand.execute(['/nonexistent'], context)

    expect(result).toEqual({
      success: true,
      output: 'ls: /nonexistent: No such file or directory',
    })
  })

  describe('collection directory display names', () => {
    it('shows book titles instead of slugs in ~/books', () => {
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

      const result = lsCommand.execute([], context)

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

    it('shows vinyl titles instead of slugs in ~/vinyl', () => {
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

      const result = lsCommand.execute([], context)

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

    it('shows hardware names instead of slugs in ~/hardware', () => {
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

      const result = lsCommand.execute([], context)

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

    it('falls back to filename when content has no title/name', () => {
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

      const result = lsCommand.execute([], context)

      expect(result.success).toBe(true)
      expect(getOutput(result)).toEqual([
        { type: 'output', content: '' },
        { type: 'success', content: 'unknown-file' },
        { type: 'output', content: '' },
      ])
    })

    it('falls back to filename when resolve returns null', () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary/books',
          ls: () => ['orphan-file'],
          resolve: () => null,
        },
      })

      const result = lsCommand.execute([], context)

      expect(result.success).toBe(true)
      expect(getOutput(result)).toEqual([
        { type: 'output', content: '' },
        { type: 'output', content: 'orphan-file' },
        { type: 'output', content: '' },
      ])
    })

    it('does not show display names for non-collection directories', () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          pwd: () => '/home/zachary',
          ls: () => ['books', 'vinyl', 'hardware'],
          resolve: () => ({ type: 'directory', name: 'dir', children: {} }),
        },
      })

      const result = lsCommand.execute([], context)

      expect(result).toEqual({
        success: true,
        output: ['', 'books', 'vinyl', 'hardware', ''],
      })
    })

    it('shows raw slugs when ls is given a path argument (detailed view is pwd-only)', () => {
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

      const result = lsCommand.execute(['books'], context)

      expect(result).toEqual({
        success: true,
        output: ['', 'dune', 'neuromancer', ''],
      })
    })
  })
})

describe('cdCommand', () => {
  it('has correct name and description', () => {
    expect(cdCommand.name).toBe('cd')
    expect(cdCommand.description).toBe('Change directory')
    expect(cdCommand.usage).toBe('cd [path]')
  })

  it('changes to home with no args', () => {
    const cdFn = vi.fn(() => null)
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: cdFn,
      },
    })

    const result = cdCommand.execute([], context)

    expect(cdFn).toHaveBeenCalledWith('~')
    expect(result).toEqual({ success: true, output: '' })
  })

  it('changes to specified path', () => {
    const cdFn = vi.fn(() => null)
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: cdFn,
        pwd: () => '/home/zachary/books',
      },
    })

    const result = cdCommand.execute(['/home/zachary/books'], context)

    expect(cdFn).toHaveBeenCalledWith('/home/zachary/books')
    expect(result).toEqual({ success: true, output: '' })
  })

  it('returns error for invalid path', () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: () => 'cd: /nonexistent: No such file or directory',
      },
    })

    const result = cdCommand.execute(['/nonexistent'], context)

    expect(result).toEqual({
      success: false,
      error: 'cd: /nonexistent: No such file or directory',
    })
  })

  it('updates currentDirectory display format with ~ prefix', () => {
    const setCurrentDirectory = vi.fn()
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: () => null,
        pwd: () => '/home/zachary/books',
      },
      setCurrentDirectory,
    })

    cdCommand.execute(['books'], context)

    expect(setCurrentDirectory).toHaveBeenCalledWith('~/books')
  })

  it('updates currentDirectory for home directory as ~', () => {
    const setCurrentDirectory = vi.fn()
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: () => null,
        pwd: () => '/home/zachary',
      },
      setCurrentDirectory,
    })

    cdCommand.execute([], context)

    expect(setCurrentDirectory).toHaveBeenCalledWith('~')
  })

  it('preserves full path for directories outside home', () => {
    const setCurrentDirectory = vi.fn()
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        cd: () => null,
        pwd: () => '/var/log',
      },
      setCurrentDirectory,
    })

    cdCommand.execute(['/var/log'], context)

    expect(setCurrentDirectory).toHaveBeenCalledWith('/var/log')
  })
})

describe('pwdCommand', () => {
  it('has correct name and description', () => {
    expect(pwdCommand.name).toBe('pwd')
    expect(pwdCommand.description).toBe('Print working directory')
    expect(pwdCommand.usage).toBe('pwd')
  })

  it('returns current working directory', () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        pwd: () => '/home/zachary/books',
      },
    })

    const result = pwdCommand.execute([], context)

    expect(result).toEqual({
      success: true,
      output: '/home/zachary/books',
    })
  })

  it('ignores any arguments', () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        pwd: () => '/home/zachary',
      },
    })

    const result = pwdCommand.execute(['ignored', 'args'], context)

    expect(result).toEqual({
      success: true,
      output: '/home/zachary',
    })
  })
})

describe('catCommand', () => {
  it('has correct name and description', () => {
    expect(catCommand.name).toBe('cat')
    expect(catCommand.description).toBe('Display file contents')
    expect(catCommand.usage).toBe('cat <file>')
  })

  it('returns error without path argument', () => {
    const context = createMockContext()

    const result = catCommand.execute([], context)

    expect(result).toEqual({
      success: false,
      error: 'Usage: cat <file>',
    })
  })

  it('returns error for non-existent file', () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        resolve: () => null,
      },
    })

    const result = catCommand.execute(['missing.txt'], context)

    expect(result).toEqual({
      success: false,
      error: 'cat: missing.txt: No such file or directory',
    })
  })

  it('returns error for directory', () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        resolve: () => ({ type: 'directory', name: 'books', children: {} }),
      },
    })

    const result = catCommand.execute(['books'], context)

    expect(result).toEqual({
      success: false,
      error: 'cat: books: Is a directory',
    })
  })

  it('returns string content directly', () => {
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

    const result = catCommand.execute(['readme.txt'], context)

    expect(result).toEqual({
      success: true,
      output: 'Hello, world!',
    })
  })

  it('returns JSON-stringified object content', () => {
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

    const result = catCommand.execute(['book.json'], context)

    expect(result).toEqual({
      success: true,
      output: JSON.stringify(objectContent, null, 2),
    })
  })
})

describe('viewCommand', () => {
  it('has correct name and description', () => {
    expect(viewCommand.name).toBe('view')
    expect(viewCommand.description).toBe('Display formatted file contents')
    expect(viewCommand.usage).toBe('view <file>')
  })

  it('returns error without path argument', () => {
    const context = createMockContext()

    const result = viewCommand.execute([], context)

    expect(result).toEqual({
      success: false,
      error: 'Usage: view <file>',
    })
  })

  it('returns error for non-existent file', () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        resolve: () => null,
      },
    })

    const result = viewCommand.execute(['missing.txt'], context)

    expect(result).toEqual({
      success: false,
      error: 'view: missing.txt: No such file',
    })
  })

  it('returns error for directory', () => {
    const context = createMockContext({
      vfs: {
        ...createMockContext().vfs,
        resolve: () => ({ type: 'directory', name: 'books', children: {} }),
      },
    })

    const result = viewCommand.execute(['books'], context)

    expect(result).toEqual({
      success: false,
      error: 'view: books: Is a directory',
    })
  })

  describe('book formatting', () => {
    it('formats book content with title, author, genre, format', () => {
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

      const result = viewCommand.execute(['book.json'], context)

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

    it('formats book with multiple authors', () => {
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

      const result = viewCommand.execute(['book.json'], context)

      expect(result.success).toBe(true)
      expect(lineContents(result)).toContain('  Author:  David Thomas, Andrew Hunt')
    })

    it('includes pages when available', () => {
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

      const result = viewCommand.execute(['book.json'], context)

      expect(result.success).toBe(true)
      expect(lineContents(result)).toContain('  Pages:   350')
    })
  })

  describe('vinyl formatting', () => {
    it('formats vinyl content with title, artist, genre, format, label', () => {
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

      const result = viewCommand.execute(['record.json'], context)

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
    it('formats hardware content with all fields', () => {
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

      const result = viewCommand.execute(['device.json'], context)

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

    it('omits optional fields when not present', () => {
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

      const result = viewCommand.execute(['device.json'], context)

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
    it('falls back to raw string content for unknown types', () => {
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

      const result = viewCommand.execute(['readme.txt'], context)

      expect(result).toEqual({
        success: true,
        output: 'Plain text content',
      })
    })

    it('falls back to JSON-stringified content for unknown object types', () => {
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

      const result = viewCommand.execute(['data.json'], context)

      expect(result).toEqual({
        success: true,
        output: JSON.stringify(content, null, 2),
      })
    })
  })
})
