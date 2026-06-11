import { NextRequest, NextResponse } from 'next/server'
import { db, wallMessages } from '@/lib/db'
import { desc, eq } from 'drizzle-orm'
import { requestIp } from '@/lib/scores'
import { wallPostSchema, containsUrl, containsProfanity, hashIp, wallLimiter } from '@/lib/wall'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
}

export async function GET() {
  if (!db) {
    return NextResponse.json({ messages: [] }, { headers: CACHE_HEADERS })
  }
  try {
    // Explicit column list: ipHash must never leave the server
    const messages = await db
      .select({
        id: wallMessages.id,
        name: wallMessages.name,
        message: wallMessages.message,
        createdAt: wallMessages.createdAt,
      })
      .from(wallMessages)
      .orderBy(desc(wallMessages.createdAt))
      .limit(50)
    return NextResponse.json({ messages }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('Error fetching wall:', error)
    return NextResponse.json({ error: 'Failed to fetch the wall' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = wallPostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid wall post', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    )
  }

  const { message, name } = parsed.data
  if (containsUrl(message) || (name && containsUrl(name))) {
    return NextResponse.json({ error: 'Links are not allowed on the wall' }, { status: 400 })
  }
  if (containsProfanity(message) || (name && containsProfanity(name))) {
    return NextResponse.json({ error: 'Keep it friendly' }, { status: 400 })
  }

  const ip = requestIp(request)
  if (wallLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Slow down — 3 posts per hour' }, { status: 429 })
  }

  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const [posted] = await db
      .insert(wallMessages)
      .values({ message, name: name ?? null, ipHash: hashIp(ip) })
      .returning({
        id: wallMessages.id,
        name: wallMessages.name,
        message: wallMessages.message,
        createdAt: wallMessages.createdAt,
      })
    return NextResponse.json({ message: posted }, { status: 201 })
  } catch (error) {
    console.error('Error posting to wall:', error)
    return NextResponse.json({ error: 'Failed to post' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const adminToken = process.env.WALL_ADMIN_TOKEN
  const provided = request.headers.get('x-admin-token')
  if (!adminToken || !provided || provided !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const idParam = request.nextUrl.searchParams.get('id')
  const id = idParam === null ? NaN : Number(idParam)
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const deleted = await db.delete(wallMessages).where(eq(wallMessages.id, id)).returning({ id: wallMessages.id })
    if (deleted.length === 0) {
      return NextResponse.json({ error: 'No such message' }, { status: 404 })
    }
    return NextResponse.json({ deleted: deleted[0].id })
  } catch (error) {
    console.error('Error deleting wall message:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
