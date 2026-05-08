-- ═══════════════════════════════════════════════
--  Eagleview — Benchmarks Migration
--  Run this in Supabase → SQL Editor AFTER schema.sql
--  Safe to re-run (uses IF NOT EXISTS / ON CONFLICT)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS benchmarks (
  id           SERIAL PRIMARY KEY,
  name         TEXT        NOT NULL,
  ticker       TEXT        NOT NULL UNIQUE,
  week_pct     DECIMAL(7,2),
  month_pct    DECIMAL(7,2),
  quarter_pct  DECIMAL(7,2),
  ytd_pct      DECIMAL(7,2),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read benchmarks"
  ON benchmarks FOR SELECT USING (true);

-- Seed the three benchmarks (actual index symbols, not ETFs)
INSERT INTO benchmarks (name, ticker) VALUES
  ('S&P 500', '^GSPC'),
  ('Nasdaq',  '^IXIC'),
  ('Dow',     '^DJI')
ON CONFLICT (ticker) DO NOTHING;
