-- Add device column to keyword_rankings to support mobile vs desktop
-- separate rank tracking. Backfills existing rows as "desktop" since
-- that's how older browser-mode checks captured rankings.
ALTER TABLE keyword_rankings ADD COLUMN device TEXT NOT NULL DEFAULT 'desktop';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS keyword_rankings_device_idx
  ON keyword_rankings(keyword_id, device, checked_at);
