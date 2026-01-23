import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createInitialData, getStartMessage, handleInput, WORDLE_WORDS } from '../index'
import type { WordleGameData } from '@/lib/types/games'
import type { GameResult, GameResultItem } from '../../types'

// Helper to safely get output as array
function getOutputArray(result: GameResult): (string | GameResultItem)[] {
  if (typeof result.output === 'string') {
    return [result.output]
  }
  return result.output
}

// Helper to find wordle output item
function findWordleOutput(result: GameResult): GameResultItem | undefined {
  const arr = getOutputArray(result)
  return arr.find((item): item is GameResultItem =>
    typeof item === 'object' && item !== null && 'wordle' in item
  )
}

// Helper to check if output contains a string
function outputContainsString(result: GameResult, searchString: string): boolean {
  const arr = getOutputArray(result)
  return arr.some(item =>
    typeof item === 'string' && item.includes(searchString)
  )
}

describe('wordle-game', () => {
  describe('WORDLE_WORDS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(WORDLE_WORDS)).toBe(true)
      expect(WORDLE_WORDS.length).toBeGreaterThan(0)
    })

    it('contains only 5-letter words', () => {
      for (const word of WORDLE_WORDS) {
        expect(word.length).toBe(5)
      }
    })

    it('contains only lowercase words', () => {
      for (const word of WORDLE_WORDS) {
        expect(word).toBe(word.toLowerCase())
      }
    })

    it('contains only alphabetic characters', () => {
      for (const word of WORDLE_WORDS) {
        expect(/^[a-z]+$/.test(word)).toBe(true)
      }
    })
  })

  describe('createInitialData', () => {
    let randomSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      randomSpy = vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      randomSpy.mockRestore()
    })

    it('returns a valid WordleGameData structure', () => {
      const data = createInitialData()
      expect(data).toHaveProperty('targetWord')
      expect(data).toHaveProperty('attempts')
      expect(data).toHaveProperty('maxAttempts')
      expect(data).toHaveProperty('guesses')
      expect(data).toHaveProperty('currentGuess')
    })

    it('sets targetWord from WORDLE_WORDS', () => {
      const data = createInitialData()
      expect(WORDLE_WORDS).toContain(data.targetWord)
    })

    it('initializes attempts to 0', () => {
      const data = createInitialData()
      expect(data.attempts).toBe(0)
    })

    it('sets maxAttempts to 6', () => {
      const data = createInitialData()
      expect(data.maxAttempts).toBe(6)
    })

    it('initializes guesses as empty array', () => {
      const data = createInitialData()
      expect(data.guesses).toEqual([])
    })

    it('initializes currentGuess as empty string', () => {
      const data = createInitialData()
      expect(data.currentGuess).toBe('')
    })

    it('picks different words based on Math.random', () => {
      // First call returns 0, picking first word
      randomSpy.mockReturnValueOnce(0)
      const data1 = createInitialData()
      expect(data1.targetWord).toBe(WORDLE_WORDS[0])

      // Second call returns 0.999..., picking last word
      randomSpy.mockReturnValueOnce(0.999)
      const data2 = createInitialData()
      expect(data2.targetWord).toBe(WORDLE_WORDS[WORDLE_WORDS.length - 1])
    })
  })

  describe('getStartMessage', () => {
    it('returns an array of strings', () => {
      const msg = getStartMessage()
      expect(Array.isArray(msg)).toBe(true)
      msg.forEach(line => {
        expect(typeof line).toBe('string')
      })
    })

    it('contains WORDLE title', () => {
      const msg = getStartMessage()
      expect(msg.some(line => line.includes('WORDLE'))).toBe(true)
    })

    it('contains color legend for GREEN', () => {
      const msg = getStartMessage()
      expect(msg.some(line => line.includes('GREEN'))).toBe(true)
    })

    it('contains color legend for YELLOW', () => {
      const msg = getStartMessage()
      expect(msg.some(line => line.includes('YELLOW'))).toBe(true)
    })

    it('contains color legend for GRAY', () => {
      const msg = getStartMessage()
      expect(msg.some(line => line.includes('GRAY'))).toBe(true)
    })

    it('contains quit instruction', () => {
      const msg = getStartMessage()
      expect(msg.some(line => line.includes('quit'))).toBe(true)
    })
  })

  describe('handleInput - validation', () => {
    const baseData: WordleGameData = {
      targetWord: 'apple',
      attempts: 0,
      maxAttempts: 6,
      guesses: [],
      currentGuess: ''
    }

    it('handles "quit" command - reveals word and ends game', () => {
      const result = handleInput('quit', baseData)
      expect(result.endGame).toBe(true)
      expect(result.output).toContainEqual(expect.stringContaining('APPLE'))
    })

    it('handles "QUIT" command case-insensitively', () => {
      const result = handleInput('QUIT', baseData)
      expect(result.endGame).toBe(true)
    })

    it('handles "quit" with whitespace', () => {
      const result = handleInput('  quit  ', baseData)
      expect(result.endGame).toBe(true)
    })

    it('rejects guess shorter than 5 letters', () => {
      const result = handleInput('four', baseData)
      expect(result.endGame).toBe(false)
      expect(result.outputType).toBe('error')
      expect(result.output).toContainEqual('Enter a 5-letter word.')
    })

    it('rejects guess longer than 5 letters', () => {
      const result = handleInput('toolong', baseData)
      expect(result.endGame).toBe(false)
      expect(result.outputType).toBe('error')
    })

    it('rejects guess with numbers', () => {
      const result = handleInput('abc12', baseData)
      expect(result.endGame).toBe(false)
      expect(result.outputType).toBe('error')
    })

    it('rejects guess with special characters', () => {
      const result = handleInput('abc!@', baseData)
      expect(result.endGame).toBe(false)
      expect(result.outputType).toBe('error')
    })

    it('accepts valid 5-letter word', () => {
      const result = handleInput('crane', baseData)
      expect(result.endGame).toBe(false)
      expect(result.outputType).not.toBe('error')
    })

    it('is case-insensitive for valid guesses', () => {
      const result1 = handleInput('CRANE', baseData)
      const result2 = handleInput('crane', baseData)
      const result3 = handleInput('CrAnE', baseData)

      // All should produce valid output (not error)
      expect(result1.outputType).not.toBe('error')
      expect(result2.outputType).not.toBe('error')
      expect(result3.outputType).not.toBe('error')
    })
  })

  describe('handleInput - feedback algorithm', () => {
    it('marks exact matches with X', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 0,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      const result = handleInput('apple', data)
      // Should be "X:A,X:P,X:P,X:L,X:E"
      const wordleOutput = findWordleOutput(result)
      expect(wordleOutput).toBeDefined()
      expect(wordleOutput?.wordle).toBe('X:A,X:P,X:P,X:L,X:E')
    })

    it('marks no matches with spaces', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 0,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      const result = handleInput('zzzzz', data)
      // Should be " :Z, :Z, :Z, :Z, :Z"
      const wordleOutput = findWordleOutput(result)
      expect(wordleOutput).toBeDefined()
      expect(wordleOutput?.wordle).toBe(' :Z, :Z, :Z, :Z, :Z')
    })

    it('marks wrong position with ?', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 0,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      // 'elppa' has all letters in wrong positions
      const result = handleInput('elppa', data)
      const wordleOutput = findWordleOutput(result)
      expect(wordleOutput).toBeDefined()
      // e is at position 0, should be in 4 -> ?
      // l is at position 1, should be in 3 -> ?
      // p is at position 2 vs p at 2 -> exact match -> X
      // p is at position 3, p at 1 available -> ?
      // a is at position 4, a at 0 available -> ?
      expect(wordleOutput?.wordle).toBe('?:E,?:L,X:P,?:P,?:A')
    })

    it('handles duplicate letters correctly - only marks one if target has one', () => {
      const data: WordleGameData = {
        targetWord: 'crane',
        attempts: 0,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      // 'eerie' has 3 e's, target 'crane' has only 1 e at position 4
      const result = handleInput('eerie', data)
      const wordleOutput = findWordleOutput(result)
      expect(wordleOutput).toBeDefined()
      // crane: c,r,a,n,e
      // eerie: e,e,r,i,e
      // First pass: pos 4 is exact (e vs e) -> X, used[4]=true
      // Second pass:
      //   pos 0 (e) - e at 4 but used[4]=true -> space
      //   pos 1 (e) - e at 4 but used[4]=true -> space
      //   pos 2 (r) - r at 1, used[1]=false -> ?, used[1]=true
      //   pos 3 (i) - not in target -> space
      expect(wordleOutput?.wordle).toBe(' :E, :E,?:R, :I,X:E')
    })

    it('handles duplicate letters in target - marks multiple correctly', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 0,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      // 'peppy' has 2 p's, target 'apple' has 2 p's at positions 1 and 2
      const result = handleInput('peppy', data)
      const wordleOutput = findWordleOutput(result)
      expect(wordleOutput).toBeDefined()
      // apple: a,p,p,l,e
      // peppy: p,e,p,p,y
      // First pass exact: pos 2 (p vs p) -> X, used[2]=true
      // Second pass:
      //   pos 0 (p) - target has p at 1, used[1]=false -> ?, used[1]=true
      //   pos 1 (e) - target has e at 4, used[4]=false -> ?, used[4]=true
      //   pos 3 (p) - target has p at 1 (used), p at 2 (used) -> space
      //   pos 4 (y) - not in target -> space
      expect(wordleOutput?.wordle).toBe('?:P,?:E,X:P, :P, :Y')
    })

    it('handles mixed case input correctly', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 0,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      const result = handleInput('ApPlE', data)
      const wordleOutput = findWordleOutput(result)
      expect(wordleOutput).toBeDefined()
      // Should still match perfectly, output in uppercase
      expect(wordleOutput?.wordle).toBe('X:A,X:P,X:P,X:L,X:E')
    })
  })

  describe('handleInput - game flow', () => {
    it('ends game with success on correct guess', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 0,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      const result = handleInput('apple', data)
      expect(result.endGame).toBe(true)
      expect(outputContainsString(result, 'got it')).toBe(true)
    })

    it('shows attempt count on win', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 2,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      const result = handleInput('apple', data)
      // Attempt 3 (0-indexed was 2, now 3)
      expect(outputContainsString(result, '3/6')).toBe(true)
    })

    it('ends game with failure after max attempts', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 5, // Next will be attempt 6 (max)
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      const result = handleInput('wrong', data)
      expect(result.endGame).toBe(true)
      expect(outputContainsString(result, 'Game over')).toBe(true)
    })

    it('reveals word on game over', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 5,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      const result = handleInput('wrong', data)
      expect(outputContainsString(result, 'APPLE')).toBe(true)
    })

    it('shows guesses remaining on valid guess', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 0,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      const result = handleInput('crane', data)
      expect(outputContainsString(result, '5 guesses left')).toBe(true)
    })

    it('updates attempts in updatedData', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 2,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      const result = handleInput('crane', data)
      expect(result.updatedData?.attempts).toBe(3)
    })

    it('accumulates guesses in updatedData', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 1,
        maxAttempts: 6,
        guesses: ['X:T,?:E, :S, :T, :S'],
        currentGuess: ''
      }
      const result = handleInput('crane', data)
      expect(result.updatedData?.guesses).toHaveLength(2)
    })

    it('does not include updatedData on validation error', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 0,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      const result = handleInput('bad', data)
      expect(result.updatedData).toBeUndefined()
    })

    it('does not include updatedData on quit', () => {
      const data: WordleGameData = {
        targetWord: 'apple',
        attempts: 0,
        maxAttempts: 6,
        guesses: [],
        currentGuess: ''
      }
      const result = handleInput('quit', data)
      expect(result.updatedData).toBeUndefined()
    })
  })
})
