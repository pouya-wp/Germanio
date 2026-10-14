CREATE TABLE `ai_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`task` text NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lexeme_id` integer,
	`kind` text NOT NULL,
	`lemma` text NOT NULL,
	`pos` text NOT NULL,
	`gender` text,
	`meaning` text NOT NULL,
	`sentence` text,
	`sentence_translation` text,
	`source` text NOT NULL,
	`source_url` text,
	`memory` text NOT NULL,
	`due` text NOT NULL,
	`suspended` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cards_due` ON `cards` (`due`);--> statement-breakpoint
CREATE UNIQUE INDEX `cards_lemma_pos_kind` ON `cards` (`lemma`,`pos`,`kind`);--> statement-breakpoint
CREATE TABLE `concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`p_known` real NOT NULL,
	`observations` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `glosses` (
	`lemma` text PRIMARY KEY NOT NULL,
	`fa` text NOT NULL,
	`en` text NOT NULL,
	`cefr` text,
	`domains` text NOT NULL,
	`example_de` text,
	`example_fa` text
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`run_after` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`error` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE INDEX `jobs_status` ON `jobs` (`status`,`run_after`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`state_before` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`scheduled_days` real NOT NULL,
	`reviewed_at` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_at` ON `reviews` (`reviewed_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `time_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`activity` text NOT NULL,
	`seconds` integer NOT NULL,
	`active` integer NOT NULL,
	`day` text NOT NULL,
	`at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `time_day` ON `time_logs` (`day`);--> statement-breakpoint
CREATE TABLE `zettels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`kind` text NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
