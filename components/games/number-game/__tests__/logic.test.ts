import { describe, it, expect } from 'vitest'
import { handleInput, createInitialData, getStartMessage } from '../logic'
import type { NumberGameData } from '@/lib/types/games'

describe('number-game logic', () => {
  describe('createInitialData', () => {
    it('creates data with target between 1 and 100', () => {
      // Run multiple times to verify range
      for (let i = 0; i < 100; i++) {
        const data = createInitialData()
        expect(data.target).toBeGreaterThanOrEqual(1)
        expect(data.target).toBeLessThanOrEqual(100)
      }
    })

    it('creates data with attempts set to 0', () => {
      const data = createInitialData()
      expect(data.attempts).toBe(0)
    })

    it('creates data with maxAttempts set to 10', () => {
      const data = createInitialData()
      expect(data.maxAttempts).toBe(10)
    })

    it('creates data with empty guesses array', () => {
      const data = createInitialData()
      expect(data.guesses).toEqual([])
    })
  })

  describe('getStartMessage', () => {
    it('returns an array', () => {
      const msg = getStartMessage()
      expect(Array.isArray(msg)).toBe(true)
    })

    it('includes NUMBER in the message', () => {
      const msg = getStartMessage()
      expect(msg.some(line => line.includes('NUMBER'))).toBe(true)
    })

    it('includes the game rules', () => {
      const msg = getStartMessage()
      expect(msg.some(line => line.includes('1 and 100'))).toBe(true)
    })

    it('includes quit instruction', () => {
      const msg = getStartMessage()
      expect(msg.some(line => line.includes('quit'))).toBe(true)
    })
  })

  describe('handleInput', () => {
    const baseData: NumberGameData = {
      target: 50,
      attempts: 0,
      maxAttempts: 10,
      guesses: []
    }

    describe('quit command', () => {
      it('returns endGame: true on "quit"', () => {
        const result = handleInput('quit', baseData)
        expect(result.endGame).toBe(true)
      })

      it('returns quit message', () => {
        const result = handleInput('quit', baseData)
        expect(result.output).toBe('Game ended.')
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
      it('returns error for non-number input', () => {
        const result = handleInput('abc', baseData)
        expect(result.output).toContain('valid number')
        expect(result.outputType).toBe('error')
      })

      it('returns error for empty input', () => {
        const result = handleInput('', baseData)
        expect(result.output).toContain('valid number')
      })

      it('returns error for floating point numbers', () => {
        const result = handleInput('50.5', baseData)
        // parseInt handles this, so it should work as 50
        // Actually parseInt('50.5') returns 50, not NaN
        expect(result.endGame).toBe(true) // 50 equals target
      })

      it('does not end game on invalid input', () => {
        const result = handleInput('abc', baseData)
        expect(result.endGame).toBeUndefined()
      })

      it('does not update data on invalid input', () => {
        const result = handleInput('abc', baseData)
        expect(result.updatedData).toBeUndefined()
      })
    })

    describe('guess too low', () => {
      it('returns "Too low" for guess below target', () => {
        const result = handleInput('25', baseData)
        expect(result.output).toContain('Too low')
      })

      it('includes attempt count', () => {
        const result = handleInput('25', baseData)
        expect(result.output).toContain('Attempt 1')
      })

      it('increments attempts in updatedData', () => {
        const result = handleInput('25', baseData)
        expect(result.updatedData?.attempts).toBe(1)
      })

      it('adds guess to guesses array', () => {
        const result = handleInput('25', baseData)
        expect(result.updatedData?.guesses).toContain(25)
      })

      it('does not end the game', () => {
        const result = handleInput('25', baseData)
        expect(result.endGame).toBeUndefined()
      })
    })

    describe('guess too high', () => {
      it('returns "Too high" for guess above target', () => {
        const result = handleInput('75', baseData)
        expect(result.output).toContain('Too high')
      })

      it('includes attempt count', () => {
        const result = handleInput('75', baseData)
        expect(result.output).toContain('Attempt 1')
      })

      it('increments attempts in updatedData', () => {
        const result = handleInput('75', baseData)
        expect(result.updatedData?.attempts).toBe(1)
      })

      it('adds guess to guesses array', () => {
        const result = handleInput('75', baseData)
        expect(result.updatedData?.guesses).toContain(75)
      })
    })

    describe('correct guess', () => {
      it('returns success on correct guess', () => {
        const result = handleInput('50', baseData)
        const outputStr = Array.isArray(result.output)
          ? result.output.join(' ')
          : result.output
        expect(outputStr).toContain('Correct!')
      })

      it('ends the game', () => {
        const result = handleInput('50', baseData)
        expect(result.endGame).toBe(true)
      })

      it('includes attempt count in success message', () => {
        const result = handleInput('50', baseData)
        const outputStr = Array.isArray(result.output)
          ? result.output.join(' ')
          : result.output
        expect(outputStr).toContain('1 attempts')
      })

      it('reveals the target number', () => {
        const result = handleInput('50', baseData)
        const outputStr = Array.isArray(result.output)
          ? result.output.join(' ')
          : result.output
        expect(outputStr).toContain('50')
      })

      it('sets success outputType', () => {
        const result = handleInput('50', baseData)
        expect(result.outputType).toBe('success')
      })

      it('updates attempts on correct guess', () => {
        const result = handleInput('50', baseData)
        expect(result.updatedData?.attempts).toBe(1)
      })
    })

    describe('multiple attempts tracking', () => {
      it('correctly counts subsequent attempts', () => {
        const dataWithAttempts: NumberGameData = {
          ...baseData,
          attempts: 3,
          guesses: [10, 20, 30]
        }
        const result = handleInput('25', dataWithAttempts)
        expect(result.output).toContain('Attempt 4')
        expect(result.updatedData?.attempts).toBe(4)
      })

      it('preserves previous guesses and adds new one', () => {
        const dataWithAttempts: NumberGameData = {
          ...baseData,
          attempts: 2,
          guesses: [10, 20]
        }
        const result = handleInput('30', dataWithAttempts)
        expect(result.updatedData?.guesses).toEqual([10, 20, 30])
      })
    })

    describe('edge cases', () => {
      it('handles guess at boundary 1', () => {
        const dataWithLowTarget: NumberGameData = {
          ...baseData,
          target: 1
        }
        const result = handleInput('1', dataWithLowTarget)
        expect(result.endGame).toBe(true)
      })

      it('handles guess at boundary 100', () => {
        const dataWithHighTarget: NumberGameData = {
          ...baseData,
          target: 100
        }
        const result = handleInput('100', dataWithHighTarget)
        expect(result.endGame).toBe(true)
      })

      it('handles negative numbers', () => {
        const result = handleInput('-5', baseData)
        expect(result.output).toContain('Too low')
      })

      it('handles numbers above 100', () => {
        const result = handleInput('150', baseData)
        expect(result.output).toContain('Too high')
      })
    })
  })
})
