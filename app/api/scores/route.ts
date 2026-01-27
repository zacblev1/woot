import { NextRequest, NextResponse } from 'next/server'
import { db, highScores } from '@/lib/db'
import { desc, eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  // Return empty scores if database is not configured
  if (!db) {
    return NextResponse.json({ scores: [] })
  }

  const searchParams = request.nextUrl.searchParams
  const game = searchParams.get('game')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)

  try {
    const scores = await db
      .select()
      .from(highScores)
      .where(game ? eq(highScores.gameType, game) : undefined)
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

export async function POST(request: NextRequest) {
  // Return error if database is not configured
  if (!db) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { gameType, initials, score, level = 1 } = body

    // Validate required fields
    if (!gameType || !initials || typeof score !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: gameType, initials, score' },
        { status: 400 }
      )
    }

    // Validate game type
    if (!['tron', 'pacman'].includes(gameType)) {
      return NextResponse.json(
        { error: 'Invalid game type. Must be "tron" or "pacman"' },
        { status: 400 }
      )
    }

    // Validate initials (3 chars, alphanumeric)
    const sanitizedInitials = initials.toUpperCase().slice(0, 3)
    if (!/^[A-Z0-9]{1,3}$/.test(sanitizedInitials)) {
      return NextResponse.json(
        { error: 'Initials must be 1-3 alphanumeric characters' },
        { status: 400 }
      )
    }

    const [newScore] = await db
      .insert(highScores)
      .values({
        gameType,
        initials: sanitizedInitials,
        score,
        level,
      })
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
