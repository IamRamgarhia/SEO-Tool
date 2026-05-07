CREATE TABLE `guest_post_drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`site_id` text NOT NULL,
	`site_name` text NOT NULL,
	`site_domain` text NOT NULL,
	`topic` text NOT NULL,
	`target_keyword` text NOT NULL,
	`supporting_keywords` text,
	`author_name` text,
	`author_bio` text,
	`markdown` text NOT NULL,
	`qa_issues` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`live_url` text,
	`published_at` integer,
	`pitched_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `guest_post_drafts_client_idx` ON `guest_post_drafts` (`client_id`, `created_at`);
