-- ═══════════════════════════════════════════════════════
--  Eagleview v3.1.2 Migration — Add price to holdings
--  Run in Supabase → SQL Editor
--  Safe to re-run
-- ═══════════════════════════════════════════════════════

-- Add latest price column to sector_holdings
ALTER TABLE sector_holdings
  ADD COLUMN IF NOT EXISTS price DECIMAL(12,4);

-- Add price to sector_snapshots for historical price tracking
ALTER TABLE sector_snapshots
  ADD COLUMN IF NOT EXISTS avg_price DECIMAL(12,4);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sector_holdings'
ORDER BY ordinal_position;
