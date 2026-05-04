CREATE TABLE `local_grid_schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`query` text NOT NULL,
	`center_lat` integer NOT NULL,
	`center_lng` integer NOT NULL,
	`grid_size` integer DEFAULT 5 NOT NULL,
	`spacing_m` integer DEFAULT 1500 NOT NULL,
	`cadence` text DEFAULT 'weekly' NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`last_ran_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
