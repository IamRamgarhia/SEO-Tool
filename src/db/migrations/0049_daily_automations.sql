-- Per-client daily automation: schedules + the queue of generated items.
--
-- daily_schedules: declares what to auto-generate for a client and how often.
--   kind = "blog_draft" | "gbp_post" | "social_post" | "internal_checklist"
--   cadence_days = 1 for daily, 7 for weekly, 30 for monthly
--   time_utc = HHMM the agent should generate for (e.g. 0900 for 9am UTC)
--   auto_publish = when true, approved publishers run without manual review.
--                  WordPress respects this by setting wp_status=publish;
--                  GBP posts via API; social falls back to copy-to-clipboard.
--   config_json = kind-specific options (topic seed, tone, post type, etc.)
--
-- publish_queue: every generated item lands here. The user reviews via
-- /clients/[id]/queue, approves it, and the daily-agent's publish step
-- picks it up. Schedules with auto_publish=true skip the review state.

CREATE TABLE IF NOT EXISTS daily_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('blog_draft','gbp_post','social_post','internal_checklist')),
  cadence_days INTEGER NOT NULL DEFAULT 1,
  time_utc INTEGER NOT NULL DEFAULT 900,
  auto_publish INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  config_json TEXT,
  last_run_at INTEGER,
  next_run_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS daily_schedules_client_idx ON daily_schedules (client_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS daily_schedules_due_idx ON daily_schedules (enabled, next_run_at);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS publish_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER REFERENCES daily_schedules(id) ON DELETE SET NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('blog_draft','gbp_post','social_post','internal_checklist')),
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','approved','published','skipped','failed')),
  title TEXT,
  body TEXT,
  payload_json TEXT,
  scheduled_for INTEGER NOT NULL,
  generated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  published_at INTEGER,
  published_ref TEXT,
  error_msg TEXT,
  review_note TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS publish_queue_client_status_idx ON publish_queue (client_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS publish_queue_due_idx ON publish_queue (status, scheduled_for);
