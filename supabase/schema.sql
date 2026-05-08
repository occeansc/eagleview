-- ═══════════════════════════════════════════════
--  Sector Heat Rankings — Supabase Schema
--  Run this once in: Supabase → SQL Editor → New Query
-- ═══════════════════════════════════════════════

-- ── Tables ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS sectors (
  id           SERIAL PRIMARY KEY,
  name         TEXT        NOT NULL,
  etf_ticker   TEXT        NOT NULL UNIQUE,
  week_pct     DECIMAL(7,2),
  month_pct    DECIMAL(7,2),
  quarter_pct  DECIMAL(7,2),
  ytd_pct      DECIMAL(7,2),
  stock_count  INT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sector_holdings (
  id            SERIAL PRIMARY KEY,
  sector_id     INT         NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  holding_rank  INT         NOT NULL,
  holding_name  TEXT        NOT NULL,
  holding_ticker TEXT,
  weight_pct    DECIMAL(6,3)
);

CREATE INDEX IF NOT EXISTS idx_holdings_sector ON sector_holdings(sector_id);

-- ── Row Level Security ────────────────────────────
--  Public can read. Only service_role key can write (used by the Python script).

ALTER TABLE sectors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sectors"
  ON sectors FOR SELECT USING (true);

CREATE POLICY "Public read holdings"
  ON sector_holdings FOR SELECT USING (true);

-- ── Seed: 20 sector definitions ───────────────────
--  Prices/returns are populated by the Python script.

INSERT INTO sectors (name, etf_ticker) VALUES
  ('Semiconductors',        'SMH'),
  ('Energy & Utilities',    'XLE'),
  ('Robotics & Automation', 'BOTZ'),
  ('Industrials',           'XLI'),
  ('Nuclear & Uranium',     'URA'),
  ('Materials',             'XLB'),
  ('Quantum Computing',     'QTUM'),
  ('Real Estate',           'VNQ'),
  ('Electric Vehicles',     'DRIV'),
  ('Drones & Space',        'ARKX'),
  ('Biotech & Pharma',      'IBB'),
  ('Big Tech',              'QQQ'),
  ('Consumer',              'XLY'),
  ('Travel & Airlines',     'JETS'),
  ('Financials',            'XLF'),
  ('Healthcare',            'XLV'),
  ('Defense & Aerospace',   'ITA'),
  ('Cybersecurity',         'CIBR'),
  ('AI & Machine Learning', 'AIQ'),
  ('Software & Cloud',      'IGV')
ON CONFLICT (etf_ticker) DO NOTHING;
