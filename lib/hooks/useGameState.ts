import { useState, useCallback } from 'react'
import {
  GameState,
  GameType,
  NumberGameData,
  WordleGameData,
  TriviaGameData,
  BlackjackGameData,
  RPSGameData,
  TronGameData,
  PacmanGameData,
  createInactiveGameState,
} from '@/lib/types/games'

// Maps game type to its data type
export type GameDataForType<T extends GameType> =
  T extends 'number' ? NumberGameData :
  T extends 'wordle' ? WordleGameData :
  T extends 'trivia' ? TriviaGameData :
  T extends 'blackjack' ? BlackjackGameData :
  T extends 'rps' ? RPSGameData :
  T extends 'tron' ? TronGameData :
  T extends 'pacman' ? PacmanGameData :
  never

export interface UseGameStateReturn {
  gameState: GameState
  isPlaying: boolean
  currentGame: GameType | null
  startGame: <T extends GameType>(type: T, initialData: GameDataForType<T>) => void
  endGame: () => void
  updateData: <T extends GameType>(updater: (current: GameDataForType<T>) => GameDataForType<T>) => void
}

export function useGameState(): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState>(createInactiveGameState)

  const startGame = useCallback(<T extends GameType>(
    type: T,
    initialData: GameDataForType<T>
  ) => {
    // Type assertion needed because TypeScript can't infer the correlation
    // between the generic T and the discriminated union member
    setGameState({ active: true, type, data: initialData } as GameState)
  }, [])

  const endGame = useCallback(() => {
    setGameState(createInactiveGameState())
  }, [])

  const updateData = useCallback(<T extends GameType>(
    updater: (current: GameDataForType<T>) => GameDataForType<T>
  ) => {
    setGameState(prev => {
      if (!prev.active) return prev
      return { ...prev, data: updater(prev.data as GameDataForType<T>) } as GameState
    })
  }, [])

  return {
    gameState,
    isPlaying: gameState.active,
    currentGame: gameState.active ? gameState.type : null,
    startGame,
    endGame,
    updateData,
  }
}
