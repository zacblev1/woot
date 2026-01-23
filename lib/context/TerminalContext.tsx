'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  useTerminalHistory,
  useGameState,
  useTheme,
  useFont,
  type UseTerminalHistoryReturn,
  type UseGameStateReturn,
  type UseThemeReturn,
  type UseFontReturn,
} from '@/lib/hooks'

// Context value interface
export interface TerminalContextValue {
  history: UseTerminalHistoryReturn
  game: UseGameStateReturn
  theme: UseThemeReturn
  font: UseFontReturn
}

// Create context with undefined default (enforces provider usage)
const TerminalContext = createContext<TerminalContextValue | undefined>(undefined)

// Provider props
interface TerminalProviderProps {
  children: ReactNode
}

/**
 * TerminalProvider composes all terminal hooks into a single context.
 * Use this at the top of your terminal component tree.
 */
export function TerminalProvider({ children }: TerminalProviderProps) {
  // Use all hooks internally
  const history = useTerminalHistory()
  const game = useGameState()
  const theme = useTheme()
  const font = useFont()

  // Memoize context value to prevent unnecessary re-renders
  // Note: Each hook's return value has stable references due to useCallback
  const value = useMemo<TerminalContextValue>(() => ({
    history,
    game,
    theme,
    font,
  }), [history, game, theme, font])

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  )
}

/**
 * useTerminal hook provides type-safe access to all terminal state.
 * Throws helpful error if used outside TerminalProvider.
 */
export function useTerminal(): TerminalContextValue {
  const context = useContext(TerminalContext)

  if (context === undefined) {
    throw new Error(
      'useTerminal must be used within a TerminalProvider. ' +
      'Wrap your component tree with <TerminalProvider>.'
    )
  }

  return context
}

/**
 * useTerminalOptional returns context or null if outside provider.
 * Use when terminal access is optional.
 */
export function useTerminalOptional(): TerminalContextValue | null {
  const context = useContext(TerminalContext)
  return context ?? null
}
