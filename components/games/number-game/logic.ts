import type { NumberGameData } from '@/lib/types/games'
import type { GameResult } from '../types'

/**
 * Create initial data for a new number guessing game.
 * Generates a random target between 1 and 100.
 */
export function createInitialData(): NumberGameData {
  return {
    target: Math.floor(Math.random() * 100) + 1,
    attempts: 0,
    maxAttempts: 10,
    guesses: []
  }
}

/**
 * Get the start message displayed when the game begins.
 */
export function getStartMessage(): string[] {
  return [
    '',
    'NUMBER GUESSING GAME',
    "I'm thinking of a number between 1 and 100.",
    "Type 'quit' to exit.",
    ''
  ]
}

/**
 * Handle user input for the number guessing game.
 * Pure function - takes input and current data, returns result.
 */
export function handleInput(input: string, data: NumberGameData): GameResult {
  const trimmed = input.toLowerCase().trim()

  // Handle quit command
  if (trimmed === 'quit') {
    return {
      output: 'Game ended.',
      endGame: true
    }
  }

  // Parse the guess
  const num = parseInt(trimmed, 10)
  if (isNaN(num)) {
    return {
      output: 'Please enter a valid number.',
      outputType: 'error'
    }
  }

  // Calculate new attempt count
  const newAttempts = data.attempts + 1
  const newGuesses = [...data.guesses, num]

  // Check if correct
  if (num === data.target) {
    return {
      output: [
        `Correct! You got it in ${newAttempts} attempts.`,
        `The number was ${data.target}.`,
        ''
      ],
      outputType: 'success',
      updatedData: {
        attempts: newAttempts,
        guesses: newGuesses
      },
      endGame: true
    }
  }

  // Return hint
  const hint = num < data.target ? 'Too low.' : 'Too high.'
  return {
    output: `${hint} (Attempt ${newAttempts})`,
    updatedData: {
      attempts: newAttempts,
      guesses: newGuesses
    }
  }
}
