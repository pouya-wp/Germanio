CREATE TABLE `unit_progress` (
	`unit_id` text PRIMARY KEY NOT NULL,
	`started_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`completed_at` text,
	`score` real,
	`attempts` integer DEFAULT 0 NOT NULL
);
