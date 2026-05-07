CREATE TABLE `ai_calls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feature` text NOT NULL,
	`provider` text NOT NULL,
	`model` text,
	`prompt_tokens` integer NOT NULL DEFAULT 0,
	`completion_tokens` integer NOT NULL DEFAULT 0,
	`total_tokens` integer NOT NULL DEFAULT 0,
	`cost_micros` integer NOT NULL DEFAULT 0,
	`latency_ms` integer,
	`client_id` integer,
	`status` text NOT NULL DEFAULT 'ok',
	`error_msg` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `ai_calls_created_at_idx` ON `ai_calls` (`created_at`);
--> statement-breakpoint
CREATE INDEX `ai_calls_feature_idx` ON `ai_calls` (`feature`);
