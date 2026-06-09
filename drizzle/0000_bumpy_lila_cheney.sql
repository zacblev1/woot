CREATE TABLE `high_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_type` text NOT NULL,
	`initials` text(3) NOT NULL,
	`score` integer NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_high_scores_game_score` ON `high_scores` (`game_type`,"score" desc);