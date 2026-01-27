import { describe, it, expect, vi } from 'vitest'
import { gameCommand, VALID_GAMES } from '../commands/game'
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
        name: name.charAt(0).toUpperCase() + name.slice(1),
      }),
    },
    font: {
      current: 'jetbrains' as FontName,
      set: vi.fn(),
      list: () => ['jetbrains', 'fira', 'mono'] as FontName[],
      config: (name: FontName) => ({
        name: name,
      }),
    },
    currentDirectory: '~',
    setCurrentDirectory: vi.fn(),
    openUrl: vi.fn(),
    collections: {
      books: [],
      vinyl: [],
      hardware: [],
    },
  }
}

describe('gameCommand', () => {
  it('has correct name and description', () => {
    expect(gameCommand.name).toBe('game')
    expect(gameCommand.description).toBe('Play terminal games')
    expect(gameCommand.usage).toBe('game <type>')
  })

  it('lists available games without argument', () => {
    const context = createMockContext()
    const result = gameCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('game number'))).toBe(true)
      expect(output.some(line => line.includes('game wordle'))).toBe(true)
      expect(output.some(line => line.includes('game trivia'))).toBe(true)
      expect(output.some(line => line.includes('game blackjack'))).toBe(true)
      expect(output.some(line => line.includes('game rps'))).toBe(true)
      expect(output.some(line => line.includes('game tron'))).toBe(true)
      expect(output.some(line => line.includes('game pacman'))).toBe(true)
    }
  })

  it('shows game descriptions in list', () => {
    const context = createMockContext()
    const result = gameCommand.execute([], context)

    expect(result.success).toBe(true)
    if (result.success) {
      const output = result.output as string[]
      expect(output.some(line => line.includes('Guess the number'))).toBe(true)
      expect(output.some(line => line.includes('Guess the 5-letter word'))).toBe(true)
      expect(output.some(line => line.includes('Rock Paper Scissors'))).toBe(true)
    }
  })

  it('starts number game via context.game.start()', () => {
    const context = createMockContext()
    gameCommand.execute(['number'], context)

    expect(context.game.start).toHaveBeenCalledWith('number')
  })

  it('starts wordle game via context.game.start()', () => {
    const context = createMockContext()
    gameCommand.execute(['wordle'], context)

    expect(context.game.start).toHaveBeenCalledWith('wordle')
  })

  it('starts trivia game via context.game.start()', () => {
    const context = createMockContext()
    gameCommand.execute(['trivia'], context)

    expect(context.game.start).toHaveBeenCalledWith('trivia')
  })

  it('starts blackjack game via context.game.start()', () => {
    const context = createMockContext()
    gameCommand.execute(['blackjack'], context)

    expect(context.game.start).toHaveBeenCalledWith('blackjack')
  })

  it('starts rps game via context.game.start()', () => {
    const context = createMockContext()
    gameCommand.execute(['rps'], context)

    expect(context.game.start).toHaveBeenCalledWith('rps')
  })

  it('starts tron game via context.game.start()', () => {
    const context = createMockContext()
    gameCommand.execute(['tron'], context)

    expect(context.game.start).toHaveBeenCalledWith('tron')
  })

  it('starts pacman game via context.game.start()', () => {
    const context = createMockContext()
    gameCommand.execute(['pacman'], context)

    expect(context.game.start).toHaveBeenCalledWith('pacman')
  })

  it('returns error for unknown game type', () => {
    const context = createMockContext()
    const result = gameCommand.execute(['invalid'], context)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Unknown game')
      expect(result.error).toContain('invalid')
    }
  })

  it('returns empty array for tron (UI takes over)', () => {
    const context = createMockContext()
    const result = gameCommand.execute(['tron'], context)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toEqual([])
    }
  })

  it('returns empty array for pacman (UI takes over)', () => {
    const context = createMockContext()
    const result = gameCommand.execute(['pacman'], context)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toEqual([])
    }
  })

  it('returns empty string for non-tron games (GameController handles start message)', () => {
    const context = createMockContext()
    const result = gameCommand.execute(['number'], context)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe('')
    }
  })

  it('handles case-insensitive game names', () => {
    const context = createMockContext()
    gameCommand.execute(['NUMBER'], context)

    expect(context.game.start).toHaveBeenCalledWith('number')
  })

  it('handles mixed case game names', () => {
    const context = createMockContext()
    gameCommand.execute(['Wordle'], context)

    expect(context.game.start).toHaveBeenCalledWith('wordle')
  })

  it('exports VALID_GAMES array', () => {
    expect(VALID_GAMES).toEqual(['number', 'wordle', 'trivia', 'blackjack', 'rps', 'tron', 'pacman'])
  })
})
