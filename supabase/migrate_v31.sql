-- ═══════════════════════════════════════════════════════
--  Eagleview v3.1 Migration
--  Run in Supabase → SQL Editor AFTER migrate_v30.sql
--  Safe to re-run
-- ═══════════════════════════════════════════════════════

-- 1. Add Industrials & Materials sector
INSERT INTO sectors (name)
VALUES ('Industrials & Materials')
ON CONFLICT (name) DO NOTHING;

-- 2. Rename Power sector if you ran v3.0 migration
UPDATE sectors
SET name = 'Power & Data Centers'
WHERE name = 'Power & Data Center Infrastructure';

-- 3. Rename EV sector if not already done
UPDATE sectors
SET name = 'EV, Battery & Autonomy'
WHERE name = 'Electric Vehicles & Battery';

-- 4. Verify sector_snapshots table exists (created in migrate_v30.sql)
-- If you skipped migrate_v30.sql, run this:
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sector_snapshots' AND policyname = 'Public read snapshots'
  ) THEN
    CREATE POLICY "Public read snapshots"
      ON sector_snapshots FOR SELECT USING (true);
  END IF;
END $$;

-- 5. Add v3.0 columns to sectors if missing (safe)
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
