import { useState, useCallback } from 'react'

/**
 * Return type for the useTerminalHistory hook
 */
export interface UseTerminalHistoryReturn {
  /** Array of past commands */
  history: string[]
  /** Current position in history (-1 means not navigating) */
  historyIndex: number
  /** Add a command to history, resets navigation index */
  add: (command: string) => void
  /** Clear all history */
  clear: () => void
  /** Navigate backward through history (older commands), returns command or null */
  navigateUp: () => string | null
  /** Navigate forward through history (newer commands), returns command or null */
  navigateDown: () => string | null
  /** Reset navigation index to -1 without clearing history */
  resetNavigation: () => void
}

/**
 * useTerminalHistory manages command history with navigation support.
 *
 * Navigation behavior:
 * - historyIndex of -1 means "not navigating" (at the present)
 * - navigateUp starts at the most recent command (length - 1) then decrements
 * - navigateDown increments until past the end, then resets to -1
 * - Adding a new command resets navigation
 *
 * @example
 * ```tsx
 * const { history, add, navigateUp, navigateDown } = useTerminalHistory()
 *
 * // Add commands
 * add('ls')
 * add('cd books')
 *
 * // Navigate with arrow keys
 * const prev = navigateUp()  // returns 'cd books'
 * const older = navigateUp() // returns 'ls'
 * const newer = navigateDown() // returns 'cd books'
 * ```
 */
export function useTerminalHistory(): UseTerminalHistoryReturn {
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)

  /**
   * Add a command to history.
   * Skips empty strings. Resets navigation index.
   */
  const add = useCallback((command: string): void => {
    if (command.trim() === '') return
    setHistory(prev => [...prev, command])
    setHistoryIndex(-1)
  }, [])

  /**
   * Clear all history and reset navigation.
   */
  const clear = useCallback((): void => {
    setHistory([])
    setHistoryIndex(-1)
  }, [])

  /**
   * Navigate backward through history (older commands).
   * Returns the command at the new position, or null if history is empty.
   */
  const navigateUp = useCallback((): string | null => {
    if (history.length === 0) return null

    const newIndex = historyIndex === -1
      ? history.length - 1
      : Math.max(0, historyIndex - 1)

    setHistoryIndex(newIndex)
    return history[newIndex]
  }, [history, historyIndex])

  /**
   * Navigate forward through history (newer commands).
   * Returns the command at the new position, or null if not navigating
   * or if moved past the end of history.
   */
  const navigateDown = useCallback((): string | null => {
    if (historyIndex === -1) return null

    const newIndex = historyIndex + 1
    if (newIndex >= history.length) {
      setHistoryIndex(-1)
      return null
    }

    setHistoryIndex(newIndex)
    return history[newIndex]
  }, [history, historyIndex])

  /**
   * Reset navigation index to -1 without clearing history.
   * Useful when user starts typing a new command mid-navigation.
   */
  const resetNavigation = useCallback((): void => {
    setHistoryIndex(-1)
  }, [])

  return {
    history,
    historyIndex,
    add,
    clear,
    navigateUp,
    navigateDown,
    resetNavigation,
  }
}
