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

  // Bumping the tick re-runs the fetch effect (used by refetch/submit)
  const [fetchTick, setFetchTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/scores/${gameType}?limit=10`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch scores')
        return response.json()
      })
      .then((data) => {
        if (cancelled) return
        setScores(data.scores || [])
        setError(null)
        setIsLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to fetch scores')
        setScores([])
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [gameType, fetchTick])

  const fetchScores = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setFetchTick((t) => t + 1)
  }, [])

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
