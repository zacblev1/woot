"use client"

import { useCallback, useImperativeHandle, forwardRef } from 'react'
import type { GameState } from '@/lib/types/games'
import type { GameResult } from './types'
import { handleInput as handleNumberInput } from './number-game'
import { handleInput as handleWordleInput } from './wordle-game'
import { handleInput as handleTriviaInput } from './trivia-game'
import { handleInput as handleBlackjackInput } from './blackjack-game'
import { handleInput as handleRPSInput } from './rps-game'
import { TronGame } from './tron-game'
import { PacmanGame } from './pacman-game'
import { BasketballGame } from './basketball-game'

export interface GameControllerHandle {
  handleInput: (input: string) => GameResult | null
}

export interface GameControllerProps {
  gameState: GameState
  onResult: (result: GameResult) => void
  onGameEnd: () => void
}

/**
 * GameController routes terminal input to the active game and returns results via callbacks.
 *
 * - Text-based games (number, wordle, trivia, blackjack, rps) are "headless" - they only process
 *   input and return results. The terminal handles rendering their output.
 * - Tron is a canvas game that renders its own UI and handles keyboard input directly.
 *
 * Usage:
 * ```tsx
 * const gameRef = useRef<GameControllerHandle>(null)
 *
 * // In terminal input handler:
 * if (gameState.active && gameRef.current) {
 *   gameRef.current.handleInput(input)
 * }
 *
 * // Render:
 * <GameController
 *   ref={gameRef}
 *   gameState={gameState}
 *   onResult={(result) => {
 *     addToHistory(result.output)
 *     if (result.updatedData) updateGameData(result.updatedData)
 *   }}
 *   onGameEnd={endGame}
 * />
 * ```
 */
export const GameController = forwardRef<GameControllerHandle, GameControllerProps>(
  function GameController({ gameState, onResult, onGameEnd }, ref) {
    const processInput = useCallback((input: string): GameResult | null => {
      if (!gameState.active) return null

      let result: GameResult

      switch (gameState.type) {
        case 'number':
          result = handleNumberInput(input, gameState.data)
          break
        case 'wordle':
          result = handleWordleInput(input, gameState.data)
          break
        case 'trivia':
          // Trivia uses its own TriviaData type internally
          // Cast through unknown since the shapes differ (current vs currentQuestionIndex, etc.)
          result = handleTriviaInput(input, gameState.data as unknown as Parameters<typeof handleTriviaInput>[1])
          break
        case 'blackjack':
          // Blackjack uses its own BlackjackData type internally
          // Cast through unknown since the shapes differ (phase vs gamePhase, etc.)
          result = handleBlackjackInput(input, gameState.data as unknown as Parameters<typeof handleBlackjackInput>[1])
          break
        case 'rps':
          result = handleRPSInput(input, gameState.data)
          break
        case 'tron':
          // Tron handles its own input via keyboard events
          return null
        case 'pacman':
          // Pacman handles its own input via keyboard events
          return null
        case 'basketball':
          // Basketball handles its own input via mouse/touch events
          return null
        default:
          return null
      }

      onResult(result)

      if (result.endGame) {
        onGameEnd()
      }

      return result
    }, [gameState, onResult, onGameEnd])

    useImperativeHandle(ref, () => ({
      handleInput: processInput
    }), [processInput])

    // Canvas-based games render their own visual component
    if (gameState.active && gameState.type === 'tron') {
      return <TronGame onExit={onGameEnd} />
    }

    if (gameState.active && gameState.type === 'pacman') {
      return <PacmanGame onExit={onGameEnd} />
    }

    if (gameState.active && gameState.type === 'basketball') {
      return <BasketballGame onExit={onGameEnd} />
    }

    // Text-based games are "headless" - terminal handles rendering
    return null
  }
)
