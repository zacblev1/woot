import { NextRequest, NextResponse } from 'next/server'
import { db, highScores } from '@/lib/db'
import { desc, eq } from 'drizzle-orm'
import {
  scoreSubmissionSchema,
  isValidGameType,
  isScoreRateLimited,
  requestIp,
} from '@/lib/scores'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const game = searchParams.get('game')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)

  if (game !== null && !isValidGameType(game)) {
    return NextResponse.json(
      { error: 'Invalid game type. Must be "tron", "pacman", or "basketball"' },
      { status: 400 }
    )
  }

  // Return empty scores if database is not configured
  if (!db) {
    return NextResponse.json({ scores: [] }, { headers: CACHE_HEADERS })
  }

  try {
    const scores = await db
      .select()
      .from(highScores)
      .where(game ? eq(highScores.gameType, game) : undefined)
      .orderBy(desc(highScores.score))
      .limit(limit)

    return NextResponse.json({ scores }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('Error fetching scores:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scores' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = scoreSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid score submission', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    )
  }

  if (isScoreRateLimited(requestIp(request))) {
    return NextResponse.json(
      { error: 'Too many submissions, slow down' },
      { status: 429 }
    )
  }

  // Return error if database is not configured
  if (!db) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  try {
    const { gameType, initials, score, level } = parsed.data
    const [newScore] = await db
      .insert(highScores)
      .values({ gameType, initials, score, level })
      .returning()

    return NextResponse.json({ score: newScore }, { status: 201 })
  } catch (error) {
    console.error('Error submitting score:', error)
    return NextResponse.json(
      { error: 'Failed to submit score' },
      { status: 500 }
    )
  }
}
