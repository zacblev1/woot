import { useState, useEffect, useCallback } from 'react'

export interface HighScore {
  id: number
  gameType: string
  initials: string
  score: number
  level: number
  createdAt: string
}

interface UseHighScoresReturn {
  scores: HighScore[]
  isLoading: boolean
  error: string | null
  submitScore: (initials: string, score: number, level: number) => Promise<HighScore | null>
  refetch: () => Promise<void>
  isHighScore: (score: number) => boolean
}

export function useHighScores(gameType: 'tron' | 'pacman' | 'basketball'): UseHighScoresReturn {
  const [scores, setScores] = useState<HighScore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScores = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/scores/${gameType}?limit=10`)
      if (!response.ok) {
        throw new Error('Failed to fetch scores')
      }
      const data = await response.json()
      setScores(data.scores || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scores')
      setScores([])
    } finally {
      setIsLoading(false)
    }
  }, [gameType])

  useEffect(() => {
    fetchScores()
  }, [fetchScores])

  const submitScore = useCallback(
    async (initials: string, score: number, level: number): Promise<HighScore | null> => {
      try {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType,
            initials: initials.toUpperCase().slice(0, 3),
            score,
            level,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to submit score')
        }

        const data = await response.json()
        // Refetch to get updated leaderboard
        await fetchScores()
        return data.score
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit score')
        return null
      }
    },
    [gameType, fetchScores]
  )

  // Check if a score qualifies for top 10
  const isHighScore = useCallback(
    (score: number): boolean => {
      if (scores.length < 10) return true
      const lowestScore = scores[scores.length - 1]?.score ?? 0
      return score > lowestScore
    },
    [scores]
  )

  return {
    scores,
    isLoading,
    error,
    submitScore,
    refetch: fetchScores,
    isHighScore,
  }
}
