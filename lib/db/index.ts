import { createClient, type Client } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

// Create client only if environment variables are set
function createDbClient(): { client: Client; db: LibSQLDatabase<typeof schema> } | null {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    console.warn('TURSO_DATABASE_URL not set - database features disabled')
    return null
  }

  const client = createClient({
    url,
    authToken,
  })

  return {
    client,
    db: drizzle(client, { schema }),
  }
}

const dbInstance = createDbClient()

export const db = dbInstance?.db ?? null
export const client = dbInstance?.client ?? null

export { highScores } from './schema'
export type { HighScore, NewHighScore } from './schema'
