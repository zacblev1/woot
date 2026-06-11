CREATE TABLE `wall_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(16),
	`message` text(140) NOT NULL,
	`ip_hash` text(64) NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_wall_messages_created` ON `wall_messages` ("created_at" desc);