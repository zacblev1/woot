/**
 * Shared types for game modules
 */

/**
 * Special output item for games with formatted content (e.g., Wordle colors)
 */
export interface GameResultItem {
  wordle?: string  // Special format for wordle colored output
  text?: string    // Regular text output
}

/**
 * Result returned by game logic handleInput functions.
 * Used to communicate game output back to the terminal.
 */
export interface GameResult {
  /** Output lines to display in terminal */
  output: string | string[] | (string | GameResultItem)[]
  /** Type of output for styling (defaults to 'output') */
  outputType?: 'output' | 'error' | 'success' | 'wordle'
  /** Updated game data to persist */
  updatedData?: Record<string, unknown>
  /** Whether the game should end */
  endGame?: boolean
}
