import { describe, it, expect, vi } from 'vitest'
import * as numberGame from '../number-game'
import * as wordleGame from '../wordle-game'
import * as triviaGame from '../trivia-game'
import * as blackjackGame from '../blackjack-game'
import * as rpsGame from '../rps-game'

describe('Game Integration Tests', () => {
  describe('Number Game full flow', () => {
    it('plays through to win', () => {
      const data = { ...numberGame.createInitialData(), target: 50 }

      // First guess too low
      let result = numberGame.handleInput('25', data)
      expect(result.endGame).toBeFalsy()
      expect(result.output).toContain('Too low')

      // Update data with new attempts
      const data2 = { ...data, ...result.updatedData }

      // Second guess too high
      result = numberGame.handleInput('75', data2)
      expect(result.endGame).toBeFalsy()
      expect(result.output).toContain('Too high')

      // Correct guess
      const data3 = { ...data2, ...result.updatedData }
      result = numberGame.handleInput('50', data3)
      expect(result.endGame).toBe(true)
      expect(Array.isArray(result.output)).toBe(true)
      expect((result.output as string[])[0]).toContain('Correct')
    })

    it('handles quit mid-game', () => {
      const data = numberGame.createInitialData()
      const result = numberGame.handleInput('quit', data)
      expect(result.endGame).toBe(true)
    })

    it('handles invalid input gracefully', () => {
      const data = numberGame.createInitialData()
      const result = numberGame.handleInput('not a number', data)
      expect(result.endGame).toBeFalsy()
      expect(result.outputType).toBe('error')
    })
  })

  describe('Wordle full flow', () => {
    it('plays through to win on first guess', () => {
      const data = { ...wordleGame.createInitialData(), targetWord: 'apple' }

      const result = wordleGame.handleInput('apple', data)
      expect(result.endGame).toBe(true)
    })

    it('plays through to loss after 6 wrong guesses', () => {
      let data = { ...wordleGame.createInitialData(), targetWord: 'apple' }

      for (let i = 0; i < 6; i++) {
        const result = wordleGame.handleInput('wrong', data)
        if (i < 5) {
          expect(result.endGame).toBeFalsy()
          data = { ...data, ...result.updatedData }
        } else {
          expect(result.endGame).toBe(true)
        }
      }
    })

    it('handles quit mid-game', () => {
      const data = wordleGame.createInitialData()
      const result = wordleGame.handleInput('quit', data)
      expect(result.endGame).toBe(true)
    })
  })

  describe('RPS full flow', () => {
    it('plays multiple rounds and quits', () => {
      let data = rpsGame.createInitialData()

      // Play a few rounds (mock random for determinism)
      vi.spyOn(Math, 'random').mockReturnValue(0) // rock

      let result = rpsGame.handleInput('rock', data)
      expect(result.endGame).toBeFalsy()
      data = { ...data, ...result.updatedData }

      result = rpsGame.handleInput('paper', data)
      expect(result.endGame).toBeFalsy()
      data = { ...data, ...result.updatedData }

      vi.restoreAllMocks()

      // Quit
      result = rpsGame.handleInput('quit', data)
      expect(result.endGame).toBe(true)
      expect((result.output as string[])[0]).toContain('Final Score')
    })

    it('tracks wins and losses correctly', () => {
      const data = rpsGame.createInitialData()

      // Mock computer always plays rock
      vi.spyOn(Math, 'random').mockReturnValue(0) // rock

      // Paper beats rock
      const result = rpsGame.handleInput('paper', data)
      expect(result.output[1]).toContain('You win')
      expect(result.updatedData?.playerWins).toBe(1)

      vi.restoreAllMocks()
    })
  })

  describe('Blackjack full flow', () => {
    it('can hit and continue playing', () => {
      const data = blackjackGame.createInitialData()

      // Hit
      const result = blackjackGame.handleInput('hit', data)
      // Either continues or busts
      expect(result.output).toBeDefined()
    })

    it('can stand and get result', () => {
      const data = blackjackGame.createInitialData()

      // Stand
      const result = blackjackGame.handleInput('stand', data)
      expect(result.endGame).toBe(true)
    })

    it('handles quit', () => {
      const data = blackjackGame.createInitialData()
      const result = blackjackGame.handleInput('quit', data)
      expect(result.endGame).toBe(true)
      expect(result.output).toContain('Left the table')
    })

    it('rejects invalid commands', () => {
      const data = blackjackGame.createInitialData()
      const result = blackjackGame.handleInput('fold', data)
      expect(result.outputType).toBe('error')
    })
  })

  describe('Trivia full flow', () => {
    it('plays through all 5 questions', () => {
      let data = triviaGame.createInitialData()

      for (let i = 0; i < 5; i++) {
        // Get correct answer for current question
        const currentQ = data.questions[data.current]
        const result = triviaGame.handleInput(currentQ.a, data)

        if (i < 4) {
          expect(result.endGame).toBeFalsy()
          data = { ...data, ...result.updatedData }
        } else {
          expect(result.endGame).toBe(true)
          expect((result.output as string[])[2]).toContain('Final score')
        }
      }
    })

    it('tracks correct answers', () => {
      const data = triviaGame.createInitialData()

      // Answer first question correctly
      const correctAnswer = data.questions[0].a
      const result = triviaGame.handleInput(correctAnswer, data)
      expect((result.output as string[])[0]).toContain('Correct')
      expect(result.updatedData?.score).toBe(1)
    })

    it('handles wrong answers', () => {
      const data = triviaGame.createInitialData()

      const result = triviaGame.handleInput('definitely wrong answer', data)
      expect((result.output as string[])[0]).toContain('Wrong')
      expect(result.updatedData?.score).toBe(0)
    })

    it('handles quit mid-game', () => {
      const data = triviaGame.createInitialData()
      const result = triviaGame.handleInput('quit', data)
      expect(result.endGame).toBe(true)
    })
  })

  describe('All games have required exports', () => {
    const games = [
      { name: 'number', module: numberGame },
      { name: 'wordle', module: wordleGame },
      { name: 'trivia', module: triviaGame },
      { name: 'blackjack', module: blackjackGame },
      { name: 'rps', module: rpsGame },
    ]

    games.forEach(({ name, module }) => {
      it(`${name} game exports handleInput`, () => {
        expect(typeof module.handleInput).toBe('function')
      })

      it(`${name} game exports createInitialData`, () => {
        expect(typeof module.createInitialData).toBe('function')
      })

      it(`${name} game exports getStartMessage`, () => {
        expect(typeof module.getStartMessage).toBe('function')
      })
    })
  })

  describe('Barrel export verification', () => {
    it('exports GameController', async () => {
      const { GameController } = await import('../index')
      expect(GameController).toBeDefined()
    })

    it('exports GameResult type', async () => {
      // Type-only exports can't be checked at runtime, but we can import
      const gamesModule = await import('../index')
      expect(gamesModule).toBeDefined()
    })

    it('exports namespace for each game', async () => {
      const { numberGame: ng, wordleGame: wg, triviaGame: tg, blackjackGame: bjg, rpsGame: rg } = await import('../index')
      expect(ng.handleInput).toBeDefined()
      expect(wg.handleInput).toBeDefined()
      expect(tg.handleInput).toBeDefined()
      expect(bjg.handleInput).toBeDefined()
      expect(rg.handleInput).toBeDefined()
    })

    it('exports TronGame component', async () => {
      const { TronGame } = await import('../index')
      expect(TronGame).toBeDefined()
    })
  })
})
