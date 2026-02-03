import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const highScores = sqliteTable('high_scores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameType: text('game_type').notNull(), // 'tron' | 'pacman' | 'basketball' | 'mario'
  initials: text('initials', { length: 3 }).notNull(), // Classic 3-char arcade initials
  score: integer('score').notNull(),
  level: integer('level').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export type HighScore = typeof highScores.$inferSelect
export type NewHighScore = typeof highScores.$inferInsert
