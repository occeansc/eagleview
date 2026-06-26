-- v4.4.0: Add 6-month return column to sector_holdings
ALTER TABLE sector_holdings
  ADD COLUMN IF NOT EXISTS half_year_pct NUMERIC;
