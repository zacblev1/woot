import type { RPSGameData } from '@/lib/types/games'
import type { GameResult } from '../types'

export type RPSChoice = 'rock' | 'paper' | 'scissors'

/**
 * Create initial data for a new Rock Paper Scissors game.
 */
export function createInitialData(): RPSGameData {
  return {
    playerChoice: null,
    computerChoice: null,
    rounds: 0,
    playerWins: 0,
    computerWins: 0
  }
}

/**
 * Get the start message displayed when the game begins.
 */
export function getStartMessage(): string[] {
  return [
    '',
    'ROCK PAPER SCISSORS',
    'Enter: rock, paper, or scissors',
    "Type 'quit' to exit.",
    ''
  ]
}

/**
 * Determine the winner of a single round.
 * Returns: 'player' | 'computer' | 'tie'
 */
function determineWinner(player: RPSChoice, computer: RPSChoice): 'player' | 'computer' | 'tie' {
  if (player === computer) {
    return 'tie'
  }

  // Rock beats scissors, scissors beats paper, paper beats rock
  if (
    (player === 'rock' && computer === 'scissors') ||
    (player === 'scissors' && computer === 'paper') ||
    (player === 'paper' && computer === 'rock')
  ) {
    return 'player'
  }

  return 'computer'
}

/**
 * Generate a random computer choice.
 */
function getComputerChoice(): RPSChoice {
  const choices: RPSChoice[] = ['rock', 'paper', 'scissors']
  return choices[Math.floor(Math.random() * 3)]
}

/**
 * Handle user input for the RPS game.
 * Pure function - takes input and current data, returns result.
 */
export function handleInput(input: string, data: RPSGameData): GameResult {
  const normalized = input.toLowerCase().trim()

  // Handle quit command
  if (normalized === 'quit') {
    return {
      output: [`Final Score: You ${data.playerWins} - ${data.computerWins} Computer`, ''],
      endGame: true
    }
  }

  // Validate input
  if (!['rock', 'paper', 'scissors'].includes(normalized)) {
    return {
      output: 'Invalid. Choose: rock, paper, or scissors',
      outputType: 'error'
    }
  }

  const playerChoice = normalized as RPSChoice
  const computerChoice = getComputerChoice()
  const winner = determineWinner(playerChoice, computerChoice)

  // Calculate new scores
  let newPlayerWins = data.playerWins
  let newComputerWins = data.computerWins
  let resultText: string

  if (winner === 'tie') {
    resultText = 'Tie.'
  } else if (winner === 'player') {
    newPlayerWins++
    resultText = 'You win.'
  } else {
    newComputerWins++
    resultText = 'Computer wins.'
  }

  return {
    output: [
      `You: ${playerChoice} | Computer: ${computerChoice}`,
      `${resultText} (${newPlayerWins}-${newComputerWins})`
    ],
    updatedData: {
      playerChoice,
      computerChoice,
      rounds: data.rounds + 1,
      playerWins: newPlayerWins,
      computerWins: newComputerWins
    }
  }
}

// Export helper for testing (allows mocking random choice)
export { getComputerChoice as _getComputerChoice }
