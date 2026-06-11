import { describe, it, expect } from 'vitest'
import {
  searchCommand,
  genreCommand,
  formatCommand,
  typeCommand,
  statsCommand,
} from '../commands/collection'
import type { ExecuteContext } from '../types'
import type { ThemeName, FontName } from '@/lib/types/terminal'
import type { CommandResult, CommandOutput } from '@/lib/types/terminal'

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
 * Helper to check if any line in an array output contains a substring.
 */
function outputContains(output: CommandOutput, substring: string): boolean {
  if (typeof output === 'string') {
    return output.includes(substring)
  }
  if (Array.isArray(output)) {
    return output.some(line => {
      if (typeof line === 'string') {
        return line.includes(substring)
      }
      return false
    })
  }
  return false
}

/**
 * Mock collection data for testing.
 */
const mockCollections = {
  books: [
    { title: 'Dune', author: 'Frank Herbert', genre: 'Science Fiction', format: 'Hardcover', pages: 412 },
    { title: 'Foundation', author: 'Isaac Asimov', genre: 'Science Fiction', format: 'Paperback' },
    { title: 'The Hobbit', author: 'J.R.R. Tolkien', genre: 'Fantasy', format: 'Hardcover' },
    { title: 'Good Omens', author: ['Neil Gaiman', 'Terry Pratchett'], genre: 'Fantasy', format: 'Paperback' },
  ],
  vinyl: [
    { title: 'Random Access Memories', artist: 'Daft Punk', genre: 'Electronic', format: 'LP', label: 'Columbia' },
    { title: 'Discovery', artist: 'Daft Punk', genre: 'Electronic', format: 'LP', label: 'Virgin' },
    { title: 'Thriller', artist: 'Michael Jackson', genre: 'Pop', format: 'LP', label: 'Epic' },
    { title: 'Kind of Blue', artist: 'Miles Davis', genre: 'Jazz', format: '7"', label: 'Columbia' },
  ],
  hardware: [
    { name: 'MacBook Pro', type: 'Laptop', processor: 'M1', memory: '16GB', storage: '512GB', status: 'Active' },
    { name: 'iPhone 15', type: 'Phone', processor: 'A17', memory: '6GB', storage: '256GB', status: 'Active' },
    { name: 'iPad Pro', type: 'Tablet', processor: 'M2', memory: '8GB', storage: '256GB', status: 'Active' },
    { name: 'Dell XPS', type: 'Laptop', processor: 'i7', memory: '32GB', storage: '1TB', status: 'Retired' },
  ],
  notes: [],
}

/**
 * Create a mock ExecuteContext for testing.
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
    collections: mockCollections,
    ...overrides,
  }
}

describe('searchCommand', () => {
  describe('error handling', () => {
    it('returns error without search term', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await searchCommand.execute([], context)
      expect(result).toEqual({ success: false, error: 'Usage: search <term>' })
    })

    it('returns error when not in a collection directory', async () => {
      const context = createMockContext({ currentDirectory: '~' })
      const result = await searchCommand.execute(['test'], context)
      expect(result).toEqual({ success: false, error: 'search: not in a collection directory' })
    })
  })

  describe('books search', () => {
    it('searches books by title', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await searchCommand.execute(['dune'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), '1 results')).toBe(true)
      expect(outputContains(getOutput(result), 'Dune')).toBe(true)
    })

    it('searches books by author', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await searchCommand.execute(['asimov'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), '1 results')).toBe(true)
      expect(outputContains(getOutput(result), 'Foundation')).toBe(true)
    })

    it('handles array author in books', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await searchCommand.execute(['gaiman'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), 'Good Omens')).toBe(true)
    })

    it('searches case-insensitively', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await searchCommand.execute(['DUNE'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), 'Dune')).toBe(true)
    })

    it('returns "No results" message when no matches', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await searchCommand.execute(['xyz123'], context)
      expect(result.success).toBe(true)
      expect(getOutput(result)).toBe('No results for "xyz123"')
    })

    it('includes index in results', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await searchCommand.execute(['dune'], context)
      expect(result.success).toBe(true)
      const outputLines = getOutput(result) as string[]
      const duneLine = outputLines.find(line => line.includes('Dune'))
      expect(duneLine).toContain('  1  ')
    })
  })

  describe('vinyl search', () => {
    it('searches vinyl by title', async () => {
      const context = createMockContext({ currentDirectory: '~/vinyl' })
      const result = await searchCommand.execute(['random'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), 'Random Access Memories')).toBe(true)
    })

    it('searches vinyl by artist', async () => {
      const context = createMockContext({ currentDirectory: '~/vinyl' })
      const result = await searchCommand.execute(['daft'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), '2 results')).toBe(true)
    })

    it('returns "No results" message for vinyl when no matches', async () => {
      const context = createMockContext({ currentDirectory: '~/vinyl' })
      const result = await searchCommand.execute(['unknown123'], context)
      expect(result.success).toBe(true)
      expect(getOutput(result)).toBe('No results for "unknown123"')
    })
  })

  describe('hardware search', () => {
    it('searches hardware by name', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await searchCommand.execute(['macbook'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), 'MacBook Pro')).toBe(true)
    })

    it('searches hardware by type', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await searchCommand.execute(['laptop'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), '2 results')).toBe(true)
    })

    it('formats hardware results with type in parentheses', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await searchCommand.execute(['iphone'], context)
      expect(result.success).toBe(true)
      const outputLines = getOutput(result) as string[]
      const iphoneLine = outputLines.find(line => line.includes('iPhone'))
      expect(iphoneLine).toContain('(Phone)')
    })

    it('returns "No results" message for hardware when no matches', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await searchCommand.execute(['xyz987'], context)
      expect(result.success).toBe(true)
      expect(getOutput(result)).toBe('No results for "xyz987"')
    })
  })
})

describe('genreCommand', () => {
  describe('error handling', () => {
    it('returns error when not in ~/books or ~/vinyl', async () => {
      const context = createMockContext({ currentDirectory: '~' })
      const result = await genreCommand.execute([], context)
      expect(result).toEqual({ success: false, error: 'genre: only available in ~/books or ~/vinyl' })
    })

    it('returns error when in ~/hardware', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await genreCommand.execute([], context)
      expect(result).toEqual({ success: false, error: 'genre: only available in ~/books or ~/vinyl' })
    })
  })

  describe('vinyl genre', () => {
    it('lists all genres without argument', async () => {
      const context = createMockContext({ currentDirectory: '~/vinyl' })
      const result = await genreCommand.execute([], context)
      expect(result.success).toBe(true)
      const outputLines = getOutput(result) as string[]
      expect(outputLines).toContain('  Electronic')
      expect(outputLines).toContain('  Jazz')
      expect(outputLines).toContain('  Pop')
    })

    it('lists genres sorted alphabetically', async () => {
      const context = createMockContext({ currentDirectory: '~/vinyl' })
      const result = await genreCommand.execute([], context)
      expect(result.success).toBe(true)
      const outputLines = getOutput(result) as string[]
      const genres = outputLines.filter(line => line.trim() && !line.includes('results'))
      // Sorted: Electronic, Jazz, Pop
      expect(genres[0]).toContain('Electronic')
      expect(genres[1]).toContain('Jazz')
      expect(genres[2]).toContain('Pop')
    })

    it('filters by genre name', async () => {
      const context = createMockContext({ currentDirectory: '~/vinyl' })
      const result = await genreCommand.execute(['electronic'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), '2 results')).toBe(true)
      expect(outputContains(getOutput(result), 'Random Access Memories')).toBe(true)
      expect(outputContains(getOutput(result), 'Discovery')).toBe(true)
    })

    it('returns "No records in genre" when no matches', async () => {
      const context = createMockContext({ currentDirectory: '~/vinyl' })
      const result = await genreCommand.execute(['country'], context)
      expect(result.success).toBe(true)
      expect(getOutput(result)).toBe('No records in genre "country"')
    })
  })

  describe('books genre', () => {
    it('lists all genres without argument', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await genreCommand.execute([], context)
      expect(result.success).toBe(true)
      const outputLines = getOutput(result) as string[]
      expect(outputLines).toContain('  Fantasy')
      expect(outputLines).toContain('  Science Fiction')
    })

    it('filters by genre name', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await genreCommand.execute(['fantasy'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), '2 results')).toBe(true)
    })

    it('handles partial genre match', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await genreCommand.execute(['science'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), 'Dune')).toBe(true)
      expect(outputContains(getOutput(result), 'Foundation')).toBe(true)
    })

    it('returns "No books in genre" when no matches', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await genreCommand.execute(['horror'], context)
      expect(result.success).toBe(true)
      expect(getOutput(result)).toBe('No books in genre "horror"')
    })

    it('formats results with author', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await genreCommand.execute(['fantasy'], context)
      expect(result.success).toBe(true)
      const outputLines = getOutput(result) as string[]
      const hobbitLine = outputLines.find(line => line.includes('Hobbit'))
      expect(hobbitLine).toContain('Tolkien')
    })
  })
})

describe('formatCommand', () => {
  describe('error handling', () => {
    it('returns error when not in ~/books or ~/vinyl', async () => {
      const context = createMockContext({ currentDirectory: '~' })
      const result = await formatCommand.execute([], context)
      expect(result).toEqual({ success: false, error: 'format: only available in ~/books or ~/vinyl' })
    })

    it('returns error when in ~/hardware', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await formatCommand.execute([], context)
      expect(result).toEqual({ success: false, error: 'format: only available in ~/books or ~/vinyl' })
    })
  })

  describe('vinyl format', () => {
    it('lists all formats without argument', async () => {
      const context = createMockContext({ currentDirectory: '~/vinyl' })
      const result = await formatCommand.execute([], context)
      expect(result.success).toBe(true)
      const outputLines = getOutput(result) as string[]
      expect(outputLines).toContain('  7"')
      expect(outputLines).toContain('  LP')
    })

    it('filters by format type', async () => {
      const context = createMockContext({ currentDirectory: '~/vinyl' })
      const result = await formatCommand.execute(['lp'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), '3 results')).toBe(true)
    })

    it('returns "No records in format" when no matches', async () => {
      const context = createMockContext({ currentDirectory: '~/vinyl' })
      const result = await formatCommand.execute(['cassette'], context)
      expect(result.success).toBe(true)
      expect(getOutput(result)).toBe('No records in format "cassette"')
    })
  })

  describe('books format', () => {
    it('lists all formats without argument', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await formatCommand.execute([], context)
      expect(result.success).toBe(true)
      const outputLines = getOutput(result) as string[]
      expect(outputLines).toContain('  Hardcover')
      expect(outputLines).toContain('  Paperback')
    })

    it('filters by format type', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await formatCommand.execute(['hardcover'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), '2 results')).toBe(true)
    })

    it('returns "No books in format" when no matches', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await formatCommand.execute(['audiobook'], context)
      expect(result.success).toBe(true)
      expect(getOutput(result)).toBe('No books in format "audiobook"')
    })

    it('handles case-insensitive matching', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await formatCommand.execute(['PAPERBACK'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), '2 results')).toBe(true)
    })
  })
})

describe('typeCommand', () => {
  describe('error handling', () => {
    it('returns error when not in ~/hardware', async () => {
      const context = createMockContext({ currentDirectory: '~' })
      const result = await typeCommand.execute([], context)
      expect(result).toEqual({ success: false, error: 'type: only available in ~/hardware' })
    })

    it('returns error when in ~/books', async () => {
      const context = createMockContext({ currentDirectory: '~/books' })
      const result = await typeCommand.execute([], context)
      expect(result).toEqual({ success: false, error: 'type: only available in ~/hardware' })
    })

    it('returns error when in ~/vinyl', async () => {
      const context = createMockContext({ currentDirectory: '~/vinyl' })
      const result = await typeCommand.execute([], context)
      expect(result).toEqual({ success: false, error: 'type: only available in ~/hardware' })
    })
  })

  describe('hardware type operations', () => {
    it('lists all types without argument', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await typeCommand.execute([], context)
      expect(result.success).toBe(true)
      const outputLines = getOutput(result) as string[]
      expect(outputLines).toContain('  Laptop')
      expect(outputLines).toContain('  Phone')
      expect(outputLines).toContain('  Tablet')
    })

    it('lists types sorted alphabetically', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await typeCommand.execute([], context)
      expect(result.success).toBe(true)
      const outputLines = getOutput(result) as string[]
      const types = outputLines.filter(line => line.trim() && !line.includes('results'))
      // Sorted: Laptop, Phone, Tablet
      expect(types[0]).toContain('Laptop')
      expect(types[1]).toContain('Phone')
      expect(types[2]).toContain('Tablet')
    })

    it('filters by type name', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await typeCommand.execute(['laptop'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), '2 results')).toBe(true)
      expect(outputContains(getOutput(result), 'MacBook Pro')).toBe(true)
      expect(outputContains(getOutput(result), 'Dell XPS')).toBe(true)
    })

    it('returns "No devices of type" when no matches', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await typeCommand.execute(['watch'], context)
      expect(result.success).toBe(true)
      expect(getOutput(result)).toBe('No devices of type "watch"')
    })

    it('handles case-insensitive matching', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await typeCommand.execute(['PHONE'], context)
      expect(result.success).toBe(true)
      expect(outputContains(getOutput(result), 'iPhone 15')).toBe(true)
    })

    it('includes index in results', async () => {
      const context = createMockContext({ currentDirectory: '~/hardware' })
      const result = await typeCommand.execute(['tablet'], context)
      expect(result.success).toBe(true)
      const outputLines = getOutput(result) as string[]
      const ipadLine = outputLines.find(line => line.includes('iPad'))
      expect(ipadLine).toContain('  3  ') // iPad is 3rd in the array
    })
  })
})

describe('statsCommand', () => {
  function book(genre: string, format = 'Paperback') {
    return { title: 't', author: 'a', genre, format }
  }
  function record(genre: string, format = 'LP') {
    return { title: 't', artist: 'a', genre, format, label: 'l' }
  }
  function device(status: string) {
    return { name: 'n', type: 'Laptop', processor: 'p', memory: 'm', storage: 's', status }
  }
  function statsCtx(collections: Partial<ExecuteContext['collections']>): ExecuteContext {
    const context = createMockContext()
    context.collections = { books: [], vinyl: [], hardware: [], notes: [], ...collections }
    return context
  }
  async function output(context: ExecuteContext): Promise<string[]> {
    const result = await statsCommand.execute([], context)
    expect(result.success).toBe(true)
    return (result as { success: true; output: string[] }).output
  }

  it('scales bars to a 24-column max and appends counts', async () => {
    const books = [...Array(4).fill(book('Fiction')), ...Array(2).fill(book('Sci-Fi')), book('Essays')]
    const out = await output(statsCtx({ books }))
    expect(out).toContain('BOOK GENRES')
    expect(out).toContain(`  Fiction  ${'█'.repeat(24)} 4`)
    expect(out).toContain(`  Sci-Fi   ${'█'.repeat(12)} 2`)
    expect(out).toContain(`  Essays   ${'█'.repeat(6)} 1`)
  })

  it('orders by count desc, then alphabetically', async () => {
    const books = [book('Zeta'), book('Alpha'), book('Mid'), book('Mid')]
    const out = await output(statsCtx({ books }))
    const rows = out.filter((l) => l.startsWith('  ') && l.includes('█'))
    // Two sections (genres + formats); genre rows come first
    expect(rows[0]).toContain('Mid')
    expect(rows[1]).toContain('Alpha')
    expect(rows[2]).toContain('Zeta')
  })

  it('shows at most 8 rows per section', async () => {
    const books = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map((g) => book(g, 'Paperback'))
    const out = await output(statsCtx({ books }))
    const genreStart = out.indexOf('BOOK GENRES')
    const formatStart = out.indexOf('BOOK FORMATS')
    const genreRows = out.slice(genreStart, formatStart).filter((l) => l.includes('█'))
    expect(genreRows).toHaveLength(8)
    expect(genreRows.some((l) => l.includes(' i '))).toBe(false)
  })

  it('renders all five sections when data exists', async () => {
    const context = statsCtx({
      books: [book('Fiction')],
      vinyl: [record('Rock')],
      hardware: [device('Active')],
    })
    const out = await output(context)
    for (const header of ['BOOK GENRES', 'VINYL GENRES', 'BOOK FORMATS', 'VINYL FORMATS', 'HARDWARE STATUS']) {
      expect(out).toContain(header)
    }
  })

  it('omits sections with no data and survives empty collections', async () => {
    expect(await output(statsCtx({}))).toEqual([''])
  })
})
