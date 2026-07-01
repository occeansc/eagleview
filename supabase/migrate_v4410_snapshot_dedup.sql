-- v4.4.10: Migrate sector_snapshots dedup from an expression index (Option A)
-- to a real generated column (Option B). Enables true PostgREST on_conflict=
-- targeting, replacing the app-level 409-catch workaround with proper
-- database-level ON CONFLICT DO NOTHING semantics.

-- Step 1: Drop the old expression-based unique index from Option A.
-- (utc_date() function itself is kept — the generated column reuses it.)
DROP INDEX IF EXISTS idx_snapshots_sector_day;

-- Step 2: Add a real, queryable date column. STORED means Postgres computes
-- and persists it automatically for every row (existing rows are backfilled
-- automatically too — no manual UPDATE needed).
ALTER TABLE sector_snapshots
  ADD COLUMN IF NOT EXISTS snapshot_date date
  GENERATED ALWAYS AS (utc_date(synced_at)) STORED;

-- Step 3: Rebuild the unique constraint on the real column. PostgREST can
-- now target this directly via on_conflict=sector_id,snapshot_date.
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_sector_day
  ON sector_snapshots (sector_id, snapshot_date);
