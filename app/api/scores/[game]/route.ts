import { NextRequest, NextResponse } from 'next/server'
import { db, highScores } from '@/lib/db'
import { desc, eq } from 'drizzle-orm'
import { isValidGameType, GAME_TYPES } from '@/lib/scores'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  const { game } = await params
  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)

  if (!isValidGameType(game)) {
    return NextResponse.json(
      { error: `Invalid game type. Must be one of: ${GAME_TYPES.join(', ')}` },
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
      .where(eq(highScores.gameType, game))
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
