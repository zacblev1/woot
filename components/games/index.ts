/**
 * Games barrel export
 *
 * Central entry point for all game modules in the terminal.
 *
 * Usage:
 * ```typescript
 * import { GameController, numberGame, wordleGame, TronGame } from '@/components/games'
 *
 * // Create initial game data
 * const data = numberGame.createInitialData()
 * const message = numberGame.getStartMessage()
 *
 * // Handle game input
 * const result = numberGame.handleInput('50', data)
 * ```
 */

// Types
export type { GameResult, GameResultItem } from './types'

// Controller
export { GameController } from './GameController'
export type { GameControllerHandle, GameControllerProps } from './GameController'

// Individual games (namespace exports for clarity)
export * as numberGame from './number-game'
export * as wordleGame from './wordle-game'
export * as triviaGame from './trivia-game'
export * as blackjackGame from './blackjack-game'
export * as rpsGame from './rps-game'

// Tron is a standalone component (not a pure function module)
export { TronGame } from './tron-game'
