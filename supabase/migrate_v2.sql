-- ═══════════════════════════════════════════════════════
--  Eagleview v2 Migration — Custom Stock Baskets
--  Run in Supabase → SQL Editor (after existing schema)
-- ═══════════════════════════════════════════════════════

-- 1. Remove ETF column from sectors
ALTER TABLE sectors ALTER COLUMN etf_ticker DROP NOT NULL;
ALTER TABLE sectors DROP CONSTRAINT IF EXISTS sectors_etf_ticker_key;
ALTER TABLE sectors DROP COLUMN IF EXISTS etf_ticker;

-- 2. Add name uniqueness
ALTER TABLE sectors DROP CONSTRAINT IF EXISTS sectors_name_key;
ALTER TABLE sectors ADD CONSTRAINT sectors_name_key UNIQUE (name);

-- 3. Rebuild sector_holdings with per-stock return columns
DROP TABLE IF EXISTS sector_holdings CASCADE;
CREATE TABLE sector_holdings (
    id           SERIAL PRIMARY KEY,
    sector_id    INT  NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    ticker       TEXT NOT NULL,
    company_name TEXT NOT NULL,
    week_pct     DECIMAL(7,2),
    month_pct    DECIMAL(7,2),
    quarter_pct  DECIMAL(7,2),
    ytd_pct      DECIMAL(7,2),
    UNIQUE(sector_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_holdings_sector ON sector_holdings(sector_id);
ALTER TABLE sector_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read holdings" ON sector_holdings FOR SELECT USING (true);

-- 4. Re-seed with 20 thematic sectors
DELETE FROM sectors;
INSERT INTO sectors (name) VALUES
    ('Semiconductors'),
    ('Software & Cloud'),
    ('Cybersecurity'),
    ('AI & Machine Learning'),
    ('Fintech & Insurtech'),
    ('Digital Assets & Crypto'),
    ('Biotech & Genomics'),
    ('Pharma & MedTech'),
    ('Electric Vehicles & Battery'),
    ('Space & Satellites'),
    ('Defense & Aerospace'),
    ('Robotics & Automation'),
    ('Photonics & Optical'),
    ('Nuclear & Uranium'),
    ('Clean Energy & Solar'),
    ('Consumer & E-commerce'),
    ('Traditional Finance'),
    ('Real Estate & REITs'),
    ('Travel & Hospitality'),
    ('Quantum Computing');
