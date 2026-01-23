import type { WordleGameData } from '@/lib/types/games'
import type { GameResult } from '../types'
import { WORDLE_WORDS } from './words'

/**
 * Create initial game data with random target word
 */
export function createInitialData(): WordleGameData {
  const word = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)]
  return {
    targetWord: word,
    attempts: 0,
    maxAttempts: 6,
    guesses: [],
    currentGuess: ''
  }
}

/**
 * Get the start message displayed when game begins
 */
export function getStartMessage(): string[] {
  return [
    '',
    'WORDLE',
    'Guess the 5-letter word in 6 tries.',
    '',
    '  GREEN  = correct position',
    '  YELLOW = wrong position',
    '  GRAY   = not in word',
    '',
    "Type 'quit' to exit.",
    ''
  ]
}

/**
 * Process a guess and return the feedback result
 *
 * Feedback format: "X:A,?:B, :C,X:D, :E"
 * - X = exact match (correct position)
 * - ? = wrong position (letter exists elsewhere)
 * - space = not in word
 *
 * Algorithm handles duplicate letters correctly:
 * - First pass marks exact matches and removes those letters from consideration
 * - Second pass marks wrong-position matches for remaining letters
 */
function processGuess(guess: string, targetWord: string): string {
  const wordArr = targetWord.split('')
  const guessArr = guess.split('')
  const used = new Array(5).fill(false)
  const marks = new Array(5).fill(' ')

  // First pass: find exact matches
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === wordArr[i]) {
      marks[i] = 'X'
      used[i] = true
    }
  }

  // Second pass: find wrong-position matches
  for (let i = 0; i < 5; i++) {
    if (marks[i] !== 'X') {
      for (let j = 0; j < 5; j++) {
        if (!used[j] && guessArr[i] === wordArr[j]) {
          marks[i] = '?'
          used[j] = true
          break
        }
      }
    }
  }

  // Build colored result: format is "X:A,?:B, :C" etc (mark:letter pairs)
  return guessArr.map((c, i) => `${marks[i]}:${c.toUpperCase()}`).join(',')
}

/**
 * Handle player input and return game result
 *
 * @param input - The player's input (guess or 'quit')
 * @param data - Current game state
 * @returns GameResult with output, updated data, and game end flag
 */
export function handleInput(input: string, data: WordleGameData): GameResult {
  const trimmed = input.trim().toLowerCase()

  // Handle quit
  if (trimmed === 'quit') {
    return {
      output: [`The word was: ${data.targetWord.toUpperCase()}`],
      endGame: true
    }
  }

  // Validate input: must be exactly 5 letters, a-z only
  if (trimmed.length !== 5 || !/^[a-z]+$/.test(trimmed)) {
    return {
      output: ['Enter a 5-letter word.'],
      outputType: 'error',
      endGame: false
    }
  }

  // Process the guess
  const resultString = processGuess(trimmed, data.targetWord)
  const newAttempts = data.attempts + 1
  const newGuesses = [...data.guesses, resultString]

  // Check for win
  if (trimmed === data.targetWord) {
    return {
      output: [
        { wordle: resultString },
        '',
        `You got it in ${newAttempts}/${data.maxAttempts}!`,
        ''
      ],
      endGame: true,
      updatedData: {
        attempts: newAttempts,
        guesses: newGuesses
      }
    }
  }

  // Check for loss (max attempts reached)
  if (newAttempts >= data.maxAttempts) {
    return {
      output: [
        { wordle: resultString },
        '',
        `Game over. The word was: ${data.targetWord.toUpperCase()}`,
        ''
      ],
      endGame: true,
      updatedData: {
        attempts: newAttempts,
        guesses: newGuesses
      }
    }
  }

  // Continue game
  const guessesLeft = data.maxAttempts - newAttempts
  return {
    output: [
      { wordle: resultString },
      `(${guessesLeft} guesses left)`
    ],
    endGame: false,
    updatedData: {
      attempts: newAttempts,
      guesses: newGuesses
    }
  }
}
