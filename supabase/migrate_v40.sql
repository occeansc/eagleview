-- ═══════════════════════════════════════════════════════
--  Eagleview v4.0 Migration
--  Run in Supabase → SQL Editor
--  Safe to re-run (IF NOT EXISTS / DO NOTHING guards)
-- ═══════════════════════════════════════════════════════

-- 1. Prevent duplicate snapshots for same sector on same day.
--    Keeps the DB clean when 3x daily syncs run.
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_sector_day
  ON sector_snapshots (sector_id, DATE(synced_at));

-- 2. Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_holdings_sector
  ON sector_holdings (sector_id);

CREATE INDEX IF NOT EXISTS idx_sectors_ytd_rank
  ON sectors (ytd_rank);

-- 3. Ensure price column exists (from v3.1.2 migration)
ALTER TABLE sector_holdings
  ADD COLUMN IF NOT EXISTS price DECIMAL(12,4);

ALTER TABLE sector_snapshots
  ADD COLUMN IF NOT EXISTS avg_price DECIMAL(12,4);

-- 4. Verify final schema
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sector_holdings'
ORDER BY ordinal_position;
