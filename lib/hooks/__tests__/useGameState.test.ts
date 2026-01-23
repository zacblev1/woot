import { renderHook, act } from '@testing-library/react'
import { useGameState } from '../useGameState'
import type {
  NumberGameData,
  WordleGameData,
  TronGameData,
  TriviaGameData,
  BlackjackGameData,
  RPSGameData,
} from '@/lib/types/games'

// Sample test data for each game type
const sampleNumberGame: NumberGameData = {
  target: 42,
  attempts: 0,
  maxAttempts: 10,
  guesses: [],
}

const sampleWordleGame: WordleGameData = {
  targetWord: 'REACT',
  attempts: 0,
  maxAttempts: 6,
  guesses: [],
  currentGuess: '',
}

const sampleTronGame: TronGameData = {
  difficulty: 'medium',
}

const sampleTriviaGame: TriviaGameData = {
  questions: [
    {
      question: 'What is 2+2?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
    },
  ],
  currentQuestionIndex: 0,
  score: 0,
  answered: false,
}

const sampleBlackjackGame: BlackjackGameData = {
  playerHand: [],
  dealerHand: [],
  deck: [],
  playerScore: 0,
  dealerScore: 0,
  gamePhase: 'betting',
}

const sampleRPSGame: RPSGameData = {
  playerChoice: null,
  computerChoice: null,
  rounds: 0,
  playerWins: 0,
  computerWins: 0,
}

describe('useGameState', () => {
  describe('initial state', () => {
    it('gameState is inactive', () => {
      const { result } = renderHook(() => useGameState())

      expect(result.current.gameState).toEqual({
        active: false,
        type: null,
        data: null,
      })
    })

    it('isPlaying is false', () => {
      const { result } = renderHook(() => useGameState())

      expect(result.current.isPlaying).toBe(false)
    })

    it('currentGame is null', () => {
      const { result } = renderHook(() => useGameState())

      expect(result.current.currentGame).toBeNull()
    })
  })

  describe('startGame', () => {
    it('starts number game with correct data', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('number', sampleNumberGame)
      })

      expect(result.current.gameState).toEqual({
        active: true,
        type: 'number',
        data: sampleNumberGame,
      })
    })

    it('starts wordle game with correct data', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('wordle', sampleWordleGame)
      })

      expect(result.current.gameState).toEqual({
        active: true,
        type: 'wordle',
        data: sampleWordleGame,
      })
    })

    it('starts tron game with correct data', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('tron', sampleTronGame)
      })

      expect(result.current.gameState).toEqual({
        active: true,
        type: 'tron',
        data: sampleTronGame,
      })
    })

    it('starts trivia game with correct data', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('trivia', sampleTriviaGame)
      })

      expect(result.current.gameState).toEqual({
        active: true,
        type: 'trivia',
        data: sampleTriviaGame,
      })
    })

    it('starts blackjack game with correct data', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('blackjack', sampleBlackjackGame)
      })

      expect(result.current.gameState).toEqual({
        active: true,
        type: 'blackjack',
        data: sampleBlackjackGame,
      })
    })

    it('starts rps game with correct data', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('rps', sampleRPSGame)
      })

      expect(result.current.gameState).toEqual({
        active: true,
        type: 'rps',
        data: sampleRPSGame,
      })
    })

    it('sets isPlaying to true', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('number', sampleNumberGame)
      })

      expect(result.current.isPlaying).toBe(true)
    })

    it('sets currentGame to type', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('wordle', sampleWordleGame)
      })

      expect(result.current.currentGame).toBe('wordle')
    })
  })

  describe('endGame', () => {
    it('resets to inactive state', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('number', sampleNumberGame)
      })

      act(() => {
        result.current.endGame()
      })

      expect(result.current.gameState).toEqual({
        active: false,
        type: null,
        data: null,
      })
    })

    it('sets isPlaying to false', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('number', sampleNumberGame)
        result.current.endGame()
      })

      expect(result.current.isPlaying).toBe(false)
    })

    it('sets currentGame to null', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('wordle', sampleWordleGame)
        result.current.endGame()
      })

      expect(result.current.currentGame).toBeNull()
    })

    it('can be called when already inactive (no error)', () => {
      const { result } = renderHook(() => useGameState())

      // Should not throw
      expect(() => {
        act(() => {
          result.current.endGame()
        })
      }).not.toThrow()

      expect(result.current.gameState).toEqual({
        active: false,
        type: null,
        data: null,
      })
    })
  })

  describe('updateData', () => {
    it('updates number game data', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('number', sampleNumberGame)
      })

      act(() => {
        result.current.updateData<'number'>((current) => ({
          ...current,
          attempts: current.attempts + 1,
          guesses: [...current.guesses, 50],
        }))
      })

      expect(result.current.gameState).toEqual({
        active: true,
        type: 'number',
        data: {
          ...sampleNumberGame,
          attempts: 1,
          guesses: [50],
        },
      })
    })

    it('updates wordle game data', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('wordle', sampleWordleGame)
      })

      act(() => {
        result.current.updateData<'wordle'>((current) => ({
          ...current,
          currentGuess: 'HELLO',
        }))
      })

      expect(result.current.gameState).toEqual({
        active: true,
        type: 'wordle',
        data: {
          ...sampleWordleGame,
          currentGuess: 'HELLO',
        },
      })
    })

    it('no-op when game inactive', () => {
      const { result } = renderHook(() => useGameState())

      // Game is inactive, updateData should do nothing
      act(() => {
        result.current.updateData<'number'>((current) => ({
          ...current,
          attempts: 99,
        }))
      })

      // State should remain unchanged (inactive)
      expect(result.current.gameState).toEqual({
        active: false,
        type: null,
        data: null,
      })
    })

    it('preserves other state properties', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('trivia', sampleTriviaGame)
      })

      act(() => {
        result.current.updateData<'trivia'>((current) => ({
          ...current,
          score: current.score + 10,
        }))
      })

      // Active and type should be unchanged
      expect(result.current.gameState.active).toBe(true)
      if (result.current.gameState.active && result.current.gameState.type === 'trivia') {
        expect(result.current.gameState.type).toBe('trivia')
        expect(result.current.gameState.data.score).toBe(10)
        // Original questions should be preserved
        expect(result.current.gameState.data.questions).toEqual(
          sampleTriviaGame.questions
        )
      }
    })
  })

  describe('state transitions', () => {
    it('start -> update -> end flow', () => {
      const { result } = renderHook(() => useGameState())

      // Start game
      act(() => {
        result.current.startGame('number', sampleNumberGame)
      })
      expect(result.current.isPlaying).toBe(true)
      expect(result.current.currentGame).toBe('number')

      // Update data
      act(() => {
        result.current.updateData<'number'>((current) => ({
          ...current,
          attempts: 1,
          guesses: [25],
        }))
      })
      if (result.current.gameState.active && result.current.gameState.type === 'number') {
        expect(result.current.gameState.data.attempts).toBe(1)
      }

      // End game
      act(() => {
        result.current.endGame()
      })
      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentGame).toBeNull()
    })

    it('start -> end -> start different game', () => {
      const { result } = renderHook(() => useGameState())

      // Start number game
      act(() => {
        result.current.startGame('number', sampleNumberGame)
      })
      expect(result.current.currentGame).toBe('number')

      // End game
      act(() => {
        result.current.endGame()
      })
      expect(result.current.isPlaying).toBe(false)

      // Start different game (wordle)
      act(() => {
        result.current.startGame('wordle', sampleWordleGame)
      })
      expect(result.current.currentGame).toBe('wordle')
      expect(result.current.gameState).toEqual({
        active: true,
        type: 'wordle',
        data: sampleWordleGame,
      })
    })

    it('multiple updates in sequence', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        result.current.startGame('number', sampleNumberGame)
      })

      // Multiple sequential updates
      act(() => {
        result.current.updateData<'number'>((current) => ({
          ...current,
          attempts: 1,
          guesses: [25],
        }))
      })

      act(() => {
        result.current.updateData<'number'>((current) => ({
          ...current,
          attempts: 2,
          guesses: [...current.guesses, 50],
        }))
      })

      act(() => {
        result.current.updateData<'number'>((current) => ({
          ...current,
          attempts: 3,
          guesses: [...current.guesses, 42],
        }))
      })

      expect(result.current.gameState).toEqual({
        active: true,
        type: 'number',
        data: {
          target: 42,
          attempts: 3,
          maxAttempts: 10,
          guesses: [25, 50, 42],
        },
      })
    })

    it('can start new game without ending previous (replaces state)', () => {
      const { result } = renderHook(() => useGameState())

      // Start number game
      act(() => {
        result.current.startGame('number', sampleNumberGame)
      })
      expect(result.current.currentGame).toBe('number')

      // Start tron game directly (without endGame)
      act(() => {
        result.current.startGame('tron', sampleTronGame)
      })
      expect(result.current.currentGame).toBe('tron')
      expect(result.current.gameState).toEqual({
        active: true,
        type: 'tron',
        data: sampleTronGame,
      })
    })
  })

  describe('callback stability', () => {
    it('startGame has stable reference', () => {
      const { result, rerender } = renderHook(() => useGameState())

      const startGame1 = result.current.startGame
      rerender()
      const startGame2 = result.current.startGame

      expect(startGame1).toBe(startGame2)
    })

    it('endGame has stable reference', () => {
      const { result, rerender } = renderHook(() => useGameState())

      const endGame1 = result.current.endGame
      rerender()
      const endGame2 = result.current.endGame

      expect(endGame1).toBe(endGame2)
    })

    it('updateData has stable reference', () => {
      const { result, rerender } = renderHook(() => useGameState())

      const updateData1 = result.current.updateData
      rerender()
      const updateData2 = result.current.updateData

      expect(updateData1).toBe(updateData2)
    })
  })
})
