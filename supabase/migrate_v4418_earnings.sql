-- v4.4.18: Earnings calendar feature
-- New table storing upcoming earnings dates for every ticker in the
-- Eagleview universe. Ticker-keyed (not sector-keyed) so cross-listed
-- tickers (e.g. TSLA in both EV and Robotics) store their earnings date
-- exactly once rather than duplicated per sector.

CREATE TABLE IF NOT EXISTS ticker_earnings (
  ticker         TEXT PRIMARY KEY,
  company_name   TEXT NOT NULL,
  sector_name    TEXT,              -- display convenience, first sector this ticker appears in
  earnings_date  DATE,              -- NULL if Yahoo has no upcoming estimate
  earnings_time  TEXT,              -- 'bmo' | 'amc' | 'unspecified'
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticker_earnings_date ON ticker_earnings (earnings_date);

-- RLS: the Python sync writes via the service-role key, which bypasses RLS
-- entirely — but the frontend reads via the public anon key, which is
-- subject to RLS. A fresh table has zero policies by default, meaning the
-- sync can succeed perfectly while the frontend still gets zero rows back.
-- This grants the same public read access this app's other tables rely on.
ALTER TABLE ticker_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON ticker_earnings;
CREATE POLICY "Public read access" ON ticker_earnings
  FOR SELECT
  TO anon, authenticated
  USING (true);
