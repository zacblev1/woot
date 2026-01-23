import type { CommandDefinition, GameType } from '../types'
import { success, error } from '../types'

const VALID_GAMES: GameType[] = ['number', 'wordle', 'trivia', 'blackjack', 'rps', 'tron']

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
        '',
      ])
    }

    if (!VALID_GAMES.includes(gameType)) {
      return error(`Unknown game: ${gameType}`)
    }

    // Start the game via context
    context.game.start(gameType)

    // Tron returns empty (UI takes over), others return empty success - GameController handles the start message
    if (gameType === 'tron') {
      return success([])
    }

    // For other games, return empty success - GameController handles the start message
    return success('')
  }
}

export { VALID_GAMES }
