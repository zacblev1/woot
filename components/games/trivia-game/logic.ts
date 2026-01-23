import type { GameResult } from '../types'
import { TRIVIA_QUESTIONS, type TriviaQuestionData } from './questions'

/**
 * Trivia game data structure
 * Uses simple q/a format matching terminal.tsx implementation
 */
export interface TriviaData {
  questions: TriviaQuestionData[]
  current: number
  score: number
}

/**
 * Create initial data for a new trivia game.
 * Shuffles questions and picks 5 random ones.
 */
export function createInitialData(): TriviaData {
  const shuffled = [...TRIVIA_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5)
  return {
    questions: shuffled,
    current: 0,
    score: 0
  }
}

/**
 * Get the start message displayed when the game begins.
 */
export function getStartMessage(data: TriviaData): string[] {
  return [
    '',
    'TRIVIA',
    "Answer 5 questions. Type 'quit' to exit.",
    '',
    `Q1: ${data.questions[0].q}`,
  ]
}

/**
 * Handle user input for the trivia game.
 * Pure function - takes input and current data, returns result.
 */
export function handleInput(input: string, data: TriviaData): GameResult {
  const trimmed = input.toLowerCase().trim()

  // Handle quit command
  if (trimmed === 'quit') {
    return {
      output: 'Trivia ended.',
      endGame: true
    }
  }

  const { questions, current, score } = data
  const correct = trimmed === questions[current].a.toLowerCase()
  const newScore = correct ? score + 1 : score
  const next = current + 1

  // Check if this was the last question
  if (next >= questions.length) {
    return {
      output: [
        correct ? 'Correct!' : `Wrong. Answer: ${questions[current].a}`,
        '',
        `Final score: ${newScore}/${questions.length}`,
        '',
      ],
      updatedData: {
        current: next,
        score: newScore
      },
      endGame: true
    }
  }

  // Return result and next question
  return {
    output: [
      correct ? 'Correct!' : `Wrong. Answer: ${questions[current].a}`,
      '',
      `Q${next + 1}: ${questions[next].q}`,
    ],
    updatedData: {
      current: next,
      score: newScore
    }
  }
}
