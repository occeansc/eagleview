-- ═══════════════════════════════════════════════════════
--  Eagleview v4.0 Migration (With Deduplication Fix)
--  Run in Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Automatic Housecleaning: Delete historical duplicates
--    This looks at any day with multiple entries and keeps only the LATEST sync row.
DELETE FROM sector_snapshots
WHERE ctid IN (
  SELECT ctid
  FROM (
    SELECT ctid,
           ROW_NUMBER() OVER (
             PARTITION BY sector_id, ((synced_at AT TIME ZONE 'UTC')::date)
             ORDER BY synced_at DESC
           ) as rn
    FROM sector_snapshots
  ) t
  WHERE t.rn > 1
);

-- 2. Now create the unique index safely!
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_sector_day
  ON sector_snapshots (sector_id, ((synced_at AT TIME ZONE 'UTC')::date));

-- 3. Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_holdings_sector
  ON sector_holdings (sector_id);

CREATE INDEX IF NOT EXISTS idx_sectors_ytd_rank
  ON sectors (ytd_rank);

-- 4. Ensure price column exists (from v3.1.2 migration)
ALTER TABLE sector_holdings
  ADD COLUMN IF NOT EXISTS price DECIMAL(12,4);

ALTER TABLE sector_snapshots
  ADD COLUMN IF NOT EXISTS avg_price DECIMAL(12,4);

-- 5. Verify final schema
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sector_holdings'
ORDER BY ordinal_position;