-- ═══════════════════════════════════════════════════════════════════════════
--  Eagleview v4.1.8 — Add 1D (daily) timeframe
--  Run this once in the Supabase SQL editor before deploying v4.1.8.
--  All columns are nullable additions — safe to run on a live table with
--  zero downtime. Existing rows simply get day_pct/day_rank = NULL until
--  the next sync populates them.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE sectors
  ADD COLUMN IF NOT EXISTS day_pct          DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS day_rank         INTEGER,
  ADD COLUMN IF NOT EXISTS day_rank_change  INTEGER,
  ADD COLUMN IF NOT EXISTS breadth_1d       INTEGER,
  ADD COLUMN IF NOT EXISTS prev_day_pct     DECIMAL(10,4);

ALTER TABLE sector_holdings
  ADD COLUMN IF NOT EXISTS day_pct DECIMAL(10,4);

ALTER TABLE benchmarks
  ADD COLUMN IF NOT EXISTS day_pct DECIMAL(10,4);

ALTER TABLE sector_snapshots
  ADD COLUMN IF NOT EXISTS day_pct  DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS day_rank INTEGER;
