CREATE TABLE `annotations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer,
	`keyword_id` integer,
	`page_url` text,
	`scope` text NOT NULL,
	`event_date` integer NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`kind` text DEFAULT 'custom' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`keyword_id`) REFERENCES `keywords`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `annotations_client_date_idx` ON `annotations` (`client_id`, `event_date`);
--> statement-breakpoint
CREATE INDEX `annotations_keyword_date_idx` ON `annotations` (`keyword_id`, `event_date`);
--> statement-breakpoint
CREATE INDEX `annotations_scope_idx` ON `annotations` (`scope`, `event_date`);
