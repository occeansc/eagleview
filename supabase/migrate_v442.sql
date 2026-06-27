-- v4.4.3: Add 6M timeframe across all tables

-- sectors: 6M return, rank, rank_change, breadth, prev value
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS half_year_pct        NUMERIC;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS half_year_rank       INTEGER;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS half_year_rank_change INTEGER;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS breadth_6m           NUMERIC;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS prev_half_year_pct   NUMERIC;

-- benchmarks: 6M return
ALTER TABLE benchmarks ADD COLUMN IF NOT EXISTS half_year_pct NUMERIC;

-- sector_holdings: already added in migrate_v440 — safe to re-run
ALTER TABLE sector_holdings ADD COLUMN IF NOT EXISTS half_year_pct NUMERIC;
