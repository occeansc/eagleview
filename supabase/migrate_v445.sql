-- v4.4.5: Add 6M and 1Y columns to sector_snapshots
-- (sectors and holdings already have these from migrate_v442 + migrate_v444)
ALTER TABLE sector_snapshots ADD COLUMN IF NOT EXISTS half_year_pct  NUMERIC;
ALTER TABLE sector_snapshots ADD COLUMN IF NOT EXISTS year_pct       NUMERIC;
ALTER TABLE sector_snapshots ADD COLUMN IF NOT EXISTS breadth_6m     NUMERIC;
ALTER TABLE sector_snapshots ADD COLUMN IF NOT EXISTS breadth_1y     NUMERIC;
ALTER TABLE sector_snapshots ADD COLUMN IF NOT EXISTS half_year_rank INTEGER;
ALTER TABLE sector_snapshots ADD COLUMN IF NOT EXISTS year_rank      INTEGER;
