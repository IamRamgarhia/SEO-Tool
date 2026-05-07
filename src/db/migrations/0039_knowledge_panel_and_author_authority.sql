CREATE TABLE `knowledge_panel_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`query` text NOT NULL,
	`present` integer DEFAULT 0 NOT NULL,
	`title` text,
	`subtitle` text,
	`description` text,
	`image_url` text,
	`same_as` text,
	`socials` text,
	`facts` text,
	`raw_html` text,
	`captured_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `kp_snapshots_client_idx` ON `knowledge_panel_snapshots` (`client_id`, `captured_at`);
--> statement-breakpoint
CREATE TABLE `author_authority_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`domain` text NOT NULL,
	`author_name` text NOT NULL,
	`author_url` text,
	`job_title` text,
	`bio` text,
	`post_count` integer DEFAULT 0 NOT NULL,
	`topics` text,
	`same_as` text,
	`authority_score` integer DEFAULT 0 NOT NULL,
	`first_seen` integer DEFAULT (unixepoch()) NOT NULL,
	`last_seen` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `author_authority_client_idx` ON `author_authority_records` (`client_id`, `domain`, `author_name`);
