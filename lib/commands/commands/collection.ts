import type { CommandDefinition } from '../types'
import { success, error } from '../types'

/**
 * Search within collections by title and author/artist.
 * Must be in ~/books, ~/vinyl, or ~/hardware directory.
 */
export const searchCommand: CommandDefinition = {
  name: 'search',
  description: 'Search within collections',
  usage: 'search <term>',
  execute: (args, context) => {
    const term = args.join(' ').toLowerCase()
    if (!term) return error('Usage: search <term>')

    const { currentDirectory, collections } = context

    if (currentDirectory === '~/vinyl') {
      const results = collections.vinyl.filter(
        r => r.title.toLowerCase().includes(term) || r.artist.toLowerCase().includes(term)
      )
      if (results.length === 0) return success(`No results for "${term}"`)
      const list = results.map(r => {
        const idx = collections.vinyl.indexOf(r) + 1
        return `  ${String(idx).padStart(3, ' ')}  ${r.title} \u2014 ${r.artist}`
      })
      return success(['', `${results.length} results`, '', ...list, ''])
    }

    if (currentDirectory === '~/hardware') {
      const results = collections.hardware.filter(
        d => d.name.toLowerCase().includes(term) || d.type.toLowerCase().includes(term)
      )
      if (results.length === 0) return success(`No results for "${term}"`)
      const list = results.map(d => {
        const idx = collections.hardware.indexOf(d) + 1
        return `  ${String(idx).padStart(3, ' ')}  ${d.name} (${d.type})`
      })
      return success(['', `${results.length} results`, '', ...list, ''])
    }

    if (currentDirectory === '~/books') {
      const results = collections.books.filter(b => {
        const authorStr = Array.isArray(b.author) ? b.author.join(', ') : b.author
        return b.title.toLowerCase().includes(term) || authorStr.toLowerCase().includes(term)
      })
      if (results.length === 0) return success(`No results for "${term}"`)
      const list = results.map(b => {
        const idx = collections.books.indexOf(b) + 1
        const authorStr = Array.isArray(b.author) ? b.author.join(', ') : b.author
        return `  ${String(idx).padStart(3, ' ')}  ${b.title} \u2014 ${authorStr}`
      })
      return success(['', `${results.length} results`, '', ...list, ''])
    }

    return error('search: not in a collection directory')
  }
}

/**
 * Filter by genre.
 * Without arguments, lists all genres.
 * With arguments, shows items matching that genre.
 * Works in ~/books and ~/vinyl.
 */
export const genreCommand: CommandDefinition = {
  name: 'genre',
  description: 'Filter by genre',
  usage: 'genre [name]',
  execute: (args, context) => {
    const genreName = args.join(' ').toLowerCase()
    const { currentDirectory, collections } = context

    if (currentDirectory === '~/vinyl') {
      if (!genreName) {
        const genres = [...new Set(collections.vinyl.map(r => r.genre))].sort()
        return success(['', ...genres.map(g => `  ${g}`), ''])
      }
      const results = collections.vinyl.filter(r => r.genre.toLowerCase().includes(genreName))
      if (results.length === 0) return success(`No records in genre "${genreName}"`)
      const list = results.map(r => {
        const idx = collections.vinyl.indexOf(r) + 1
        return `  ${String(idx).padStart(3, ' ')}  ${r.title} \u2014 ${r.artist}`
      })
      return success(['', `${results.length} results`, '', ...list, ''])
    }

    if (currentDirectory === '~/books') {
      if (!genreName) {
        const genres = [...new Set(collections.books.map(b => b.genre))].sort()
        return success(['', ...genres.map(g => `  ${g}`), ''])
      }
      const results = collections.books.filter(b => b.genre.toLowerCase().includes(genreName))
      if (results.length === 0) return success(`No books in genre "${genreName}"`)
      const list = results.map(b => {
        const idx = collections.books.indexOf(b) + 1
        const authorStr = Array.isArray(b.author) ? b.author.join(', ') : b.author
        return `  ${String(idx).padStart(3, ' ')}  ${b.title} \u2014 ${authorStr}`
      })
      return success(['', `${results.length} results`, '', ...list, ''])
    }

    return error('genre: only available in ~/books or ~/vinyl')
  }
}

/**
 * Filter by format.
 * Without arguments, lists all formats.
 * With arguments, shows items in that format.
 * Works in ~/books and ~/vinyl.
 */
export const formatCommand: CommandDefinition = {
  name: 'format',
  description: 'Filter by format',
  usage: 'format [type]',
  execute: (args, context) => {
    const formatType = args.join(' ').toLowerCase()
    const { currentDirectory, collections } = context

    if (currentDirectory === '~/vinyl') {
      if (!formatType) {
        const formats = [...new Set(collections.vinyl.map(r => r.format))].sort()
        return success(['', ...formats.map(f => `  ${f}`), ''])
      }
      const results = collections.vinyl.filter(r => r.format.toLowerCase().includes(formatType))
      if (results.length === 0) return success(`No records in format "${formatType}"`)
      const list = results.map(r => {
        const idx = collections.vinyl.indexOf(r) + 1
        return `  ${String(idx).padStart(3, ' ')}  ${r.title} \u2014 ${r.artist}`
      })
      return success(['', `${results.length} results`, '', ...list, ''])
    }

    if (currentDirectory === '~/books') {
      if (!formatType) {
        const formats = [...new Set(collections.books.map(b => b.format))].sort()
        return success(['', ...formats.map(f => `  ${f}`), ''])
      }
      const results = collections.books.filter(b => b.format.toLowerCase().includes(formatType))
      if (results.length === 0) return success(`No books in format "${formatType}"`)
      const list = results.map(b => {
        const idx = collections.books.indexOf(b) + 1
        const authorStr = Array.isArray(b.author) ? b.author.join(', ') : b.author
        return `  ${String(idx).padStart(3, ' ')}  ${b.title} \u2014 ${authorStr}`
      })
      return success(['', `${results.length} results`, '', ...list, ''])
    }

    return error('format: only available in ~/books or ~/vinyl')
  }
}

/**
 * Filter hardware by type.
 * Without arguments, lists all types.
 * With arguments, shows devices of that type.
 * Only works in ~/hardware.
 */
export const typeCommand: CommandDefinition = {
  name: 'type',
  description: 'Filter hardware by type',
  usage: 'type [name]',
  execute: (args, context) => {
    const { currentDirectory, collections } = context

    if (currentDirectory !== '~/hardware') {
      return error('type: only available in ~/hardware')
    }

    const typeName = args.join(' ').toLowerCase()
    if (!typeName) {
      const types = [...new Set(collections.hardware.map(d => d.type))].sort()
      return success(['', ...types.map(t => `  ${t}`), ''])
    }

    const results = collections.hardware.filter(d => d.type.toLowerCase().includes(typeName))
    if (results.length === 0) return success(`No devices of type "${typeName}"`)
    const list = results.map(d => {
      const idx = collections.hardware.indexOf(d) + 1
      return `  ${String(idx).padStart(3, ' ')}  ${d.name}`
    })
    return success(['', `${results.length} results`, '', ...list, ''])
  }
}
