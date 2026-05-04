CREATE TABLE `short_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer,
	`slug` text NOT NULL,
	`destination` text NOT NULL,
	`label` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_term` text,
	`utm_content` text,
	`click_count` integer DEFAULT 0 NOT NULL,
	`last_click_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `short_links_slug_unique` ON `short_links` (`slug`);
--> statement-breakpoint
CREATE TABLE `short_link_clicks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`short_link_id` integer NOT NULL,
	`user_agent` text,
	`referer` text,
	`country_hint` text,
	`clicked_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`short_link_id`) REFERENCES `short_links`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `short_link_clicks_link_idx` ON `short_link_clicks` (`short_link_id`);
--> statement-breakpoint
CREATE TABLE `brand_mentions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`url` text NOT NULL,
	`author` text,
	`title` text,
	`excerpt` text,
	`sentiment` integer DEFAULT 0 NOT NULL,
	`links_to_client` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`captured_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `brand_mentions_client_idx` ON `brand_mentions` (`client_id`, `captured_at`);
--> statement-breakpoint
CREATE INDEX `brand_mentions_dedupe_idx` ON `brand_mentions` (`client_id`, `source`, `external_id`);
--> statement-breakpoint
CREATE TABLE `local_grid_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`query` text NOT NULL,
	`center_lat` integer NOT NULL,
	`center_lng` integer NOT NULL,
	`grid_size` integer DEFAULT 5 NOT NULL,
	`spacing_m` integer DEFAULT 1500 NOT NULL,
	`cells` text,
	`avg_position` integer,
	`in_pack_pct` integer,
	`ran_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
