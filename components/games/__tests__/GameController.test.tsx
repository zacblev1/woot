import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { createRef } from 'react'
import { GameController } from '../GameController'
import type { GameControllerHandle } from '../GameController'
import type { GameState } from '@/lib/types/games'

describe('GameController', () => {
  const mockOnResult = vi.fn()
  const mockOnGameEnd = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when game is inactive', () => {
    it('returns null and does not call callbacks', () => {
      const ref = createRef<GameControllerHandle>()
      const gameState: GameState = { active: false, type: null, data: null }

      render(
        <GameController
          ref={ref}
          gameState={gameState}
          onResult={mockOnResult}
          onGameEnd={mockOnGameEnd}
        />
      )

      const result = ref.current?.handleInput('test')
      expect(result).toBeNull()
      expect(mockOnResult).not.toHaveBeenCalled()
      expect(mockOnGameEnd).not.toHaveBeenCalled()
    })
  })

  describe('number game routing', () => {
    it('routes input to number game handler', () => {
      const ref = createRef<GameControllerHandle>()
      const gameState: GameState = {
        active: true,
        type: 'number',
        data: { target: 50, attempts: 0, maxAttempts: 10, guesses: [] }
      }

      render(
        <GameController
          ref={ref}
          gameState={gameState}
          onResult={mockOnResult}
          onGameEnd={mockOnGameEnd}
        />
      )

      ref.current?.handleInput('25')

      expect(mockOnResult).toHaveBeenCalled()
      const result = mockOnResult.mock.calls[0][0]
      expect(result.output).toContain('Too low')
    })

    it('calls onGameEnd when game ends', () => {
      const ref = createRef<GameControllerHandle>()
      const gameState: GameState = {
        active: true,
        type: 'number',
        data: { target: 50, attempts: 0, maxAttempts: 10, guesses: [] }
      }

      render(
        <GameController
          ref={ref}
          gameState={gameState}
          onResult={mockOnResult}
          onGameEnd={mockOnGameEnd}
        />
      )

      ref.current?.handleInput('50') // Correct guess

      expect(mockOnGameEnd).toHaveBeenCalled()
    })

    it('returns the result from handleInput', () => {
      const ref = createRef<GameControllerHandle>()
      const gameState: GameState = {
        active: true,
        type: 'number',
        data: { target: 50, attempts: 0, maxAttempts: 10, guesses: [] }
      }

      render(
        <GameController
          ref={ref}
          gameState={gameState}
          onResult={mockOnResult}
          onGameEnd={mockOnGameEnd}
        />
      )

      const result = ref.current?.handleInput('75')

      expect(result).toBeDefined()
      expect(result?.output).toContain('Too high')
      expect(result?.updatedData).toBeDefined()
    })
  })

  describe('wordle game routing', () => {
    it('routes input to wordle game handler', () => {
      const ref = createRef<GameControllerHandle>()
      const gameState: GameState = {
        active: true,
        type: 'wordle',
        data: {
          targetWord: 'apple',
          attempts: 0,
          maxAttempts: 6,
          guesses: [],
          currentGuess: ''
        }
      }

      render(
        <GameController
          ref={ref}
          gameState={gameState}
          onResult={mockOnResult}
          onGameEnd={mockOnGameEnd}
        />
      )

      ref.current?.handleInput('crane')

      expect(mockOnResult).toHaveBeenCalled()
    })
  })

  describe('rps game routing', () => {
    it('routes input to RPS game handler', () => {
      const ref = createRef<GameControllerHandle>()
      const gameState: GameState = {
        active: true,
        type: 'rps',
        data: {
          playerChoice: null,
          computerChoice: null,
          rounds: 0,
          playerWins: 0,
          computerWins: 0
        }
      }

      render(
        <GameController
          ref={ref}
          gameState={gameState}
          onResult={mockOnResult}
          onGameEnd={mockOnGameEnd}
        />
      )

      ref.current?.handleInput('rock')

      expect(mockOnResult).toHaveBeenCalled()
      const result = mockOnResult.mock.calls[0][0]
      expect(result.output[0]).toContain('rock')
    })
  })

  describe('trivia game routing', () => {
    it('routes input to trivia game handler', () => {
      const ref = createRef<GameControllerHandle>()
      // Use the actual trivia data format expected by the handler
      const gameState = {
        active: true as const,
        type: 'trivia' as const,
        data: {
          questions: [
            { q: 'What is 2+2?', a: '4' },
            { q: 'What is 3+3?', a: '6' },
            { q: 'What is 4+4?', a: '8' },
            { q: 'What is 5+5?', a: '10' },
            { q: 'What is 6+6?', a: '12' },
          ],
          currentQuestionIndex: 0,
          score: 0,
          answered: false,
          // TriviaData uses 'current' not 'currentQuestionIndex'
          current: 0,
        }
      }

      render(
        <GameController
          ref={ref}
          gameState={gameState as unknown as GameState}
          onResult={mockOnResult}
          onGameEnd={mockOnGameEnd}
        />
      )

      ref.current?.handleInput('4')

      expect(mockOnResult).toHaveBeenCalled()
    })
  })

  describe('blackjack game routing', () => {
    it('routes input to blackjack game handler', () => {
      const ref = createRef<GameControllerHandle>()
      // Use the actual blackjack data format expected by the handler
      const gameState = {
        active: true as const,
        type: 'blackjack' as const,
        data: {
          deck: [{ suit: '♠', value: '5', display: '5♠' }],
          playerHand: [
            { suit: '♠', value: '10', display: '10♠' },
            { suit: '♥', value: '5', display: '5♥' }
          ],
          dealerHand: [
            { suit: '♦', value: '7', display: '7♦' },
            { suit: '♣', value: '8', display: '8♣' }
          ],
          phase: 'player',
          // BlackjackGameData fields for type compatibility
          playerScore: 15,
          dealerScore: 15,
          gamePhase: 'playing' as const,
        }
      }

      render(
        <GameController
          ref={ref}
          gameState={gameState as unknown as GameState}
          onResult={mockOnResult}
          onGameEnd={mockOnGameEnd}
        />
      )

      ref.current?.handleInput('hit')

      expect(mockOnResult).toHaveBeenCalled()
      const result = mockOnResult.mock.calls[0][0]
      expect(result.output[0]).toContain('draw')
    })
  })

  describe('tron game routing', () => {
    it('returns null for tron (handles own input)', () => {
      const ref = createRef<GameControllerHandle>()
      const gameState: GameState = {
        active: true,
        type: 'tron',
        data: { difficulty: 'medium' }
      }

      render(
        <GameController
          ref={ref}
          gameState={gameState}
          onResult={mockOnResult}
          onGameEnd={mockOnGameEnd}
        />
      )

      const result = ref.current?.handleInput('test')

      expect(result).toBeNull()
      expect(mockOnResult).not.toHaveBeenCalled()
    })

    it('renders TronGame component for tron type', () => {
      const gameState: GameState = {
        active: true,
        type: 'tron',
        data: { difficulty: 'medium' }
      }

      const { container } = render(
        <GameController
          gameState={gameState}
          onResult={mockOnResult}
          onGameEnd={mockOnGameEnd}
        />
      )

      // Tron renders its own UI with a canvas
      expect(container.querySelector('canvas')).toBeTruthy()
    })
  })

  describe('quit command', () => {
    it('ends number game on quit', () => {
      const ref = createRef<GameControllerHandle>()
      const gameState: GameState = {
        active: true,
        type: 'number',
        data: { target: 50, attempts: 0, maxAttempts: 10, guesses: [] }
      }

      render(
        <GameController
          ref={ref}
          gameState={gameState}
          onResult={mockOnResult}
          onGameEnd={mockOnGameEnd}
        />
      )

      ref.current?.handleInput('quit')

      expect(mockOnGameEnd).toHaveBeenCalled()
      const result = mockOnResult.mock.calls[0][0]
      expect(result.endGame).toBe(true)
    })
  })
})
