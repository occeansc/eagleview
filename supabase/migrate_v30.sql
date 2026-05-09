-- ═══════════════════════════════════════════════════════
--  Eagleview v3.0 Migration — Rank, Breadth, Streak, Momentum
--  Run in Supabase → SQL Editor
--  Safe to re-run (IF NOT EXISTS / IF EXISTS guards)
-- ═══════════════════════════════════════════════════════

-- 1. New columns on sectors table
ALTER TABLE sectors
  ADD COLUMN IF NOT EXISTS ytd_rank         INT,
  ADD COLUMN IF NOT EXISTS week_rank        INT,
  ADD COLUMN IF NOT EXISTS month_rank       INT,
  ADD COLUMN IF NOT EXISTS quarter_rank     INT,
  ADD COLUMN IF NOT EXISTS ytd_rank_change     INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS week_rank_change    INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS month_rank_change   INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quarter_rank_change INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak           INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS breadth_1w       INT,
  ADD COLUMN IF NOT EXISTS breadth_1m       INT,
  ADD COLUMN IF NOT EXISTS breadth_3m       INT,
  ADD COLUMN IF NOT EXISTS breadth_ytd      INT,
  ADD COLUMN IF NOT EXISTS prev_week_pct    DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS prev_month_pct   DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS prev_quarter_pct DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS prev_ytd_pct     DECIMAL(7,2);

-- 2. Snapshots table — historical record of each sync
CREATE TABLE IF NOT EXISTS sector_snapshots (
  id              SERIAL PRIMARY KEY,
  sector_id       INT NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  week_pct        DECIMAL(7,2),
  month_pct       DECIMAL(7,2),
  quarter_pct     DECIMAL(7,2),
  ytd_pct         DECIMAL(7,2),
  ytd_rank        INT,
  week_rank       INT,
  month_rank      INT,
  quarter_rank    INT,
  streak          INT
);

CREATE INDEX IF NOT EXISTS idx_snapshots_sector_time
  ON sector_snapshots(sector_id, synced_at DESC);

ALTER TABLE sector_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read snapshots"
  ON sector_snapshots FOR SELECT USING (true);

-- Add EFA (International Developed Markets) to benchmarks
INSERT INTO benchmarks (name, ticker)
VALUES ('Intl Developed', 'EFA')
ON CONFLICT (ticker) DO NOTHING;
