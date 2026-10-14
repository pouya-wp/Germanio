CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`script` text NOT NULL,
	`audio_file` text,
	`duration` real,
	`timings` text,
	`level` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`listened_at` text
);
