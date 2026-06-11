import type { CommandDefinition, GameType } from '../types'
import { success, error } from '../types'

const VALID_GAMES: GameType[] = ['number', 'wordle', 'trivia', 'blackjack', 'rps', 'tron', 'pacman', 'basketball', 'typespeed', 'snake']

export const gameCommand: CommandDefinition = {
  name: 'game',
  description: 'Play terminal games',
  usage: 'game <type>',
  execute: (args, context) => {
    const gameType = args[0]?.toLowerCase() as GameType | undefined

    if (!gameType) {
      return success([
        '',
        '  game number      Guess the number',
        '  game wordle      Guess the 5-letter word',
        '  game trivia      Answer trivia questions',
        '  game blackjack   Play 21 against dealer',
        '  game rps         Rock Paper Scissors',
        '  game tron        Light Cycle Arcade Game',
        '  game pacman      Classic Maze Chase',
        '  game basketball  Arcade Hoops',
        '  game typespeed   How fast can you type?',
        '  game snake       Eat, grow, repeat',
        '',
      ])
    }

    if (!VALID_GAMES.includes(gameType)) {
      return error(`Unknown game: ${gameType}`)
    }

    if (gameType === 'wordle' && args[1] && args[1] !== 'practice') {
      return error(`game: unknown wordle mode '${args[1]}' (try: game wordle practice)`)
    }

    // Start the game via context; text games return their intro text
    const startOutput = context.game.start(gameType, args.slice(1))

    // Canvas games return empty (UI takes over), others return empty success - GameController handles the start message
    if (gameType === 'tron' || gameType === 'pacman' || gameType === 'basketball' || gameType === 'snake') {
      return success([])
    }

    // Text games: surface the intro text returned by the host
    return success(startOutput ?? '')
  }
}

export { VALID_GAMES }
