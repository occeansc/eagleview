-- v4.4.7: Add 5Y timeframe across all tables
-- Includes sector_snapshots columns up front — a missed column there caused
-- 400 errors on every sync after the 6M/1Y additions (fixed in migrate_v445).

-- sectors
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS five_year_pct         NUMERIC;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS five_year_rank        INTEGER;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS five_year_rank_change INTEGER;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS breadth_5y            NUMERIC;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS prev_five_year_pct    NUMERIC;

-- benchmarks
ALTER TABLE benchmarks ADD COLUMN IF NOT EXISTS five_year_pct NUMERIC;

-- sector_holdings
ALTER TABLE sector_holdings ADD COLUMN IF NOT EXISTS five_year_pct NUMERIC;

-- sector_snapshots (the column this project forgot last time — not forgetting again)
ALTER TABLE sector_snapshots ADD COLUMN IF NOT EXISTS five_year_pct  NUMERIC;
ALTER TABLE sector_snapshots ADD COLUMN IF NOT EXISTS five_year_rank INTEGER;
ALTER TABLE sector_snapshots ADD COLUMN IF NOT EXISTS breadth_5y     NUMERIC;
