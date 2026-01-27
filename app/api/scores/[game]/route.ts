import { NextRequest, NextResponse } from 'next/server'
import { db, highScores } from '@/lib/db'
import { desc, eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  // Return empty scores if database is not configured
  if (!db) {
    return NextResponse.json({ scores: [] })
  }

  const { game } = await params
  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)

  // Validate game type
  if (!['tron', 'pacman'].includes(game)) {
    return NextResponse.json(
      { error: 'Invalid game type. Must be "tron" or "pacman"' },
      { status: 400 }
    )
  }

  try {
    const scores = await db
      .select()
      .from(highScores)
      .where(eq(highScores.gameType, game))
      .orderBy(desc(highScores.score))
      .limit(limit)

    return NextResponse.json({ scores })
  } catch (error) {
    console.error('Error fetching scores:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scores' },
      { status: 500 }
    )
  }
}
