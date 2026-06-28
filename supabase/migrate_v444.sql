-- v4.4.4: Add 1Y timeframe across all tables

-- sectors
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS year_pct          NUMERIC;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS year_rank         INTEGER;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS year_rank_change  INTEGER;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS breadth_1y        NUMERIC;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS prev_year_pct     NUMERIC;

-- benchmarks
ALTER TABLE benchmarks ADD COLUMN IF NOT EXISTS year_pct NUMERIC;

-- sector_holdings
ALTER TABLE sector_holdings ADD COLUMN IF NOT EXISTS year_pct NUMERIC;
