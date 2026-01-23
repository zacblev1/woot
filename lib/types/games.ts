// Game type discriminator
export type GameType = 'number' | 'wordle' | 'trivia' | 'blackjack' | 'rps' | 'tron'

// Individual game data types
export interface NumberGameData {
  target: number
  attempts: number
  maxAttempts: number
  guesses: number[]
}

export interface WordleGameData {
  targetWord: string
  attempts: number
  maxAttempts: number
  guesses: string[]
  currentGuess: string
}

export interface TriviaQuestion {
  question: string
  options: string[]
  correctIndex: number
}

export interface TriviaGameData {
  questions: TriviaQuestion[]
  currentQuestionIndex: number
  score: number
  answered: boolean
}

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  value: string // 'A', '2'-'10', 'J', 'Q', 'K'
  numericValue: number
}

export interface BlackjackGameData {
  playerHand: Card[]
  dealerHand: Card[]
  deck: Card[]
  playerScore: number
  dealerScore: number
  gamePhase: 'betting' | 'playing' | 'dealer' | 'finished'
  result?: 'win' | 'lose' | 'push' | 'blackjack'
}

export interface RPSGameData {
  playerChoice: 'rock' | 'paper' | 'scissors' | null
  computerChoice: 'rock' | 'paper' | 'scissors' | null
  rounds: number
  playerWins: number
  computerWins: number
}

export interface TronGameData {
  // Tron uses its own component state, minimal data here
  difficulty: 'easy' | 'medium' | 'hard'
}

// Discriminated union for GameState
export type GameState =
  | { active: false; type: null; data: null }
  | { active: true; type: 'number'; data: NumberGameData }
  | { active: true; type: 'wordle'; data: WordleGameData }
  | { active: true; type: 'trivia'; data: TriviaGameData }
  | { active: true; type: 'blackjack'; data: BlackjackGameData }
  | { active: true; type: 'rps'; data: RPSGameData }
  | { active: true; type: 'tron'; data: TronGameData }

// Type guard helpers
export function isActiveGame(state: GameState): state is GameState & { active: true } {
  return state.active
}

export function isNumberGame(state: GameState): state is { active: true; type: 'number'; data: NumberGameData } {
  return state.active && state.type === 'number'
}

export function isWordleGame(state: GameState): state is { active: true; type: 'wordle'; data: WordleGameData } {
  return state.active && state.type === 'wordle'
}

// Initial state factory
export function createInactiveGameState(): GameState {
  return { active: false, type: null, data: null }
}
