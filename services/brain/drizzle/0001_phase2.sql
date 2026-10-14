CREATE TABLE `drill_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`concept_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `drill_sets_concept` ON `drill_sets` (`concept_id`);--> statement-breakpoint
CREATE TABLE `journal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prompt` text,
	`text` text NOT NULL,
	`correction` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `texts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`kind` text NOT NULL,
	`level` text,
	`source_url` text,
	`parent_id` integer,
	`glossary` text DEFAULT '[]' NOT NULL,
	`coverage` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`read_at` text
);
--> statement-breakpoint
CREATE INDEX `texts_created` ON `texts` (`created_at`);