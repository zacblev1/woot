import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleInput, createInitialData, getStartMessage } from '../logic'
import type { RPSGameData } from '@/lib/types/games'

describe('rps-game logic', () => {
  describe('createInitialData', () => {
    it('creates data with null playerChoice', () => {
      const data = createInitialData()
      expect(data.playerChoice).toBeNull()
    })

    it('creates data with null computerChoice', () => {
      const data = createInitialData()
      expect(data.computerChoice).toBeNull()
    })

    it('creates data with rounds set to 0', () => {
      const data = createInitialData()
      expect(data.rounds).toBe(0)
    })

    it('creates data with playerWins set to 0', () => {
      const data = createInitialData()
      expect(data.playerWins).toBe(0)
    })

    it('creates data with computerWins set to 0', () => {
      const data = createInitialData()
      expect(data.computerWins).toBe(0)
    })
  })

  describe('getStartMessage', () => {
    it('returns an array', () => {
      const msg = getStartMessage()
      expect(Array.isArray(msg)).toBe(true)
    })

    it('includes ROCK PAPER SCISSORS in the message', () => {
      const msg = getStartMessage()
      expect(msg.some(line => line.includes('ROCK PAPER SCISSORS'))).toBe(true)
    })

    it('includes instructions for valid choices', () => {
      const msg = getStartMessage()
      expect(msg.some(line => line.includes('rock') && line.includes('paper') && line.includes('scissors'))).toBe(true)
    })

    it('includes quit instruction', () => {
      const msg = getStartMessage()
      expect(msg.some(line => line.includes('quit'))).toBe(true)
    })
  })

  describe('handleInput', () => {
    const baseData: RPSGameData = {
      playerChoice: null,
      computerChoice: null,
      rounds: 0,
      playerWins: 0,
      computerWins: 0
    }

    describe('quit command', () => {
      it('returns endGame: true on "quit"', () => {
        const result = handleInput('quit', baseData)
        expect(result.endGame).toBe(true)
      })

      it('returns final score message', () => {
        const dataWithScore: RPSGameData = {
          ...baseData,
          playerWins: 3,
          computerWins: 2
        }
        const result = handleInput('quit', dataWithScore)
        const outputStr = Array.isArray(result.output)
          ? result.output.join(' ')
          : result.output
        expect(outputStr).toContain('Final Score')
        expect(outputStr).toContain('3')
        expect(outputStr).toContain('2')
      })

      it('handles uppercase QUIT', () => {
        const result = handleInput('QUIT', baseData)
        expect(result.endGame).toBe(true)
      })

      it('handles quit with whitespace', () => {
        const result = handleInput('  quit  ', baseData)
        expect(result.endGame).toBe(true)
      })
    })

    describe('invalid input', () => {
      it('returns error for invalid input', () => {
        const result = handleInput('invalid', baseData)
        expect(result.output).toContain('Invalid')
        expect(result.outputType).toBe('error')
      })

      it('returns error for empty input', () => {
        const result = handleInput('', baseData)
        expect(result.output).toContain('Invalid')
      })

      it('returns error for numeric input', () => {
        const result = handleInput('123', baseData)
        expect(result.output).toContain('Invalid')
      })

      it('does not end game on invalid input', () => {
        const result = handleInput('invalid', baseData)
        expect(result.endGame).toBeUndefined()
      })

      it('does not update data on invalid input', () => {
        const result = handleInput('invalid', baseData)
        expect(result.updatedData).toBeUndefined()
      })
    })

    describe('valid choices', () => {
      it('accepts "rock" input', () => {
        const result = handleInput('rock', baseData)
        expect(result.endGame).toBeUndefined()
        expect(result.updatedData).toBeDefined()
        expect(result.updatedData?.playerChoice).toBe('rock')
      })

      it('accepts "paper" input', () => {
        const result = handleInput('paper', baseData)
        expect(result.updatedData?.playerChoice).toBe('paper')
      })

      it('accepts "scissors" input', () => {
        const result = handleInput('scissors', baseData)
        expect(result.updatedData?.playerChoice).toBe('scissors')
      })

      it('accepts uppercase ROCK', () => {
        const result = handleInput('ROCK', baseData)
        expect(result.updatedData?.playerChoice).toBe('rock')
      })

      it('accepts mixed case Paper', () => {
        const result = handleInput('Paper', baseData)
        expect(result.updatedData?.playerChoice).toBe('paper')
      })

      it('increments rounds', () => {
        const result = handleInput('rock', baseData)
        expect(result.updatedData?.rounds).toBe(1)
      })

      it('returns computer choice in updatedData', () => {
        const result = handleInput('rock', baseData)
        expect(['rock', 'paper', 'scissors']).toContain(result.updatedData?.computerChoice)
      })
    })

    describe('win/lose/tie logic', () => {
      // To test deterministically, we mock Math.random
      beforeEach(() => {
        vi.spyOn(Math, 'random')
      })

      afterEach(() => {
        vi.restoreAllMocks()
      })

      describe('ties', () => {
        it('rock vs rock is a tie', () => {
          // Mock to return rock (index 0)
          vi.mocked(Math.random).mockReturnValue(0)
          const result = handleInput('rock', baseData)
          const outputStr = Array.isArray(result.output)
            ? result.output.join(' ')
            : result.output
          expect(outputStr).toContain('Tie')
          expect(result.updatedData?.playerWins).toBe(0)
          expect(result.updatedData?.computerWins).toBe(0)
        })

        it('paper vs paper is a tie', () => {
          // Mock to return paper (index 1)
          vi.mocked(Math.random).mockReturnValue(0.4)
          const result = handleInput('paper', baseData)
          const outputStr = Array.isArray(result.output)
            ? result.output.join(' ')
            : result.output
          expect(outputStr).toContain('Tie')
        })

        it('scissors vs scissors is a tie', () => {
          // Mock to return scissors (index 2)
          vi.mocked(Math.random).mockReturnValue(0.7)
          const result = handleInput('scissors', baseData)
          const outputStr = Array.isArray(result.output)
            ? result.output.join(' ')
            : result.output
          expect(outputStr).toContain('Tie')
        })
      })

      describe('player wins', () => {
        it('rock beats scissors', () => {
          // Mock to return scissors (index 2)
          vi.mocked(Math.random).mockReturnValue(0.7)
          const result = handleInput('rock', baseData)
          const outputStr = Array.isArray(result.output)
            ? result.output.join(' ')
            : result.output
          expect(outputStr).toContain('You win')
          expect(result.updatedData?.playerWins).toBe(1)
          expect(result.updatedData?.computerWins).toBe(0)
        })

        it('paper beats rock', () => {
          // Mock to return rock (index 0)
          vi.mocked(Math.random).mockReturnValue(0)
          const result = handleInput('paper', baseData)
          const outputStr = Array.isArray(result.output)
            ? result.output.join(' ')
            : result.output
          expect(outputStr).toContain('You win')
          expect(result.updatedData?.playerWins).toBe(1)
        })

        it('scissors beats paper', () => {
          // Mock to return paper (index 1)
          vi.mocked(Math.random).mockReturnValue(0.4)
          const result = handleInput('scissors', baseData)
          const outputStr = Array.isArray(result.output)
            ? result.output.join(' ')
            : result.output
          expect(outputStr).toContain('You win')
          expect(result.updatedData?.playerWins).toBe(1)
        })
      })

      describe('computer wins', () => {
        it('scissors beats rock (computer wins)', () => {
          // Mock to return paper (index 1)
          vi.mocked(Math.random).mockReturnValue(0.4)
          const result = handleInput('rock', baseData)
          const outputStr = Array.isArray(result.output)
            ? result.output.join(' ')
            : result.output
          expect(outputStr).toContain('Computer wins')
          expect(result.updatedData?.computerWins).toBe(1)
          expect(result.updatedData?.playerWins).toBe(0)
        })

        it('rock beats scissors (computer wins)', () => {
          // Mock to return rock (index 0)
          vi.mocked(Math.random).mockReturnValue(0)
          const result = handleInput('scissors', baseData)
          const outputStr = Array.isArray(result.output)
            ? result.output.join(' ')
            : result.output
          expect(outputStr).toContain('Computer wins')
          expect(result.updatedData?.computerWins).toBe(1)
        })

        it('paper beats rock (computer wins)', () => {
          // Mock to return scissors (index 2)
          vi.mocked(Math.random).mockReturnValue(0.7)
          const result = handleInput('paper', baseData)
          const outputStr = Array.isArray(result.output)
            ? result.output.join(' ')
            : result.output
          expect(outputStr).toContain('Computer wins')
          expect(result.updatedData?.computerWins).toBe(1)
        })
      })
    })

    describe('score accumulation', () => {
      beforeEach(() => {
        vi.spyOn(Math, 'random')
      })

      afterEach(() => {
        vi.restoreAllMocks()
      })

      it('accumulates player wins correctly', () => {
        const dataWithWins: RPSGameData = {
          ...baseData,
          rounds: 5,
          playerWins: 3,
          computerWins: 2
        }
        // Mock to return scissors (player rock beats scissors)
        vi.mocked(Math.random).mockReturnValue(0.7)
        const result = handleInput('rock', dataWithWins)
        expect(result.updatedData?.playerWins).toBe(4)
        expect(result.updatedData?.computerWins).toBe(2)
        expect(result.updatedData?.rounds).toBe(6)
      })

      it('accumulates computer wins correctly', () => {
        const dataWithWins: RPSGameData = {
          ...baseData,
          rounds: 5,
          playerWins: 2,
          computerWins: 3
        }
        // Mock to return paper (computer paper beats rock)
        vi.mocked(Math.random).mockReturnValue(0.4)
        const result = handleInput('rock', dataWithWins)
        expect(result.updatedData?.computerWins).toBe(4)
        expect(result.updatedData?.playerWins).toBe(2)
      })

      it('tie does not change scores', () => {
        const dataWithWins: RPSGameData = {
          ...baseData,
          rounds: 5,
          playerWins: 2,
          computerWins: 2
        }
        // Mock to return rock (tie with rock)
        vi.mocked(Math.random).mockReturnValue(0)
        const result = handleInput('rock', dataWithWins)
        expect(result.updatedData?.playerWins).toBe(2)
        expect(result.updatedData?.computerWins).toBe(2)
        expect(result.updatedData?.rounds).toBe(6)
      })
    })

    describe('output format', () => {
      beforeEach(() => {
        vi.spyOn(Math, 'random')
      })

      afterEach(() => {
        vi.restoreAllMocks()
      })

      it('shows both player and computer choices', () => {
        vi.mocked(Math.random).mockReturnValue(0.4) // paper
        const result = handleInput('rock', baseData)
        const outputStr = Array.isArray(result.output)
          ? result.output.join(' ')
          : result.output
        expect(outputStr).toContain('You: rock')
        expect(outputStr).toContain('Computer: paper')
      })

      it('shows current score in output', () => {
        vi.mocked(Math.random).mockReturnValue(0.7) // scissors
        const result = handleInput('rock', baseData)
        const outputStr = Array.isArray(result.output)
          ? result.output.join(' ')
          : result.output
        expect(outputStr).toContain('1-0')
      })
    })
  })
})
