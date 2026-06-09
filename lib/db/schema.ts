import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { desc } from 'drizzle-orm'

export const highScores = sqliteTable(
  'high_scores',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    gameType: text('game_type').notNull(), // 'tron' | 'pacman' | 'basketball'
    initials: text('initials', { length: 3 }).notNull(), // Classic 3-char arcade initials
    score: integer('score').notNull(),
    level: integer('level').notNull().default(1),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    // Leaderboard queries filter by game and sort by score descending
    index('idx_high_scores_game_score').on(t.gameType, desc(t.score)),
  ]
)

export type HighScore = typeof highScores.$inferSelect
export type NewHighScore = typeof highScores.$inferInsert
