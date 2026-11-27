-- EagleView v4.6.4 — add DXY and Bitcoin to Market Pulse.
-- Run once in Supabase SQL Editor on an existing, fully migrated EagleView DB.
-- Safe to re-run: preserve existing rows, returns, timestamps and permissions.
-- No invented prices/returns: fields remain NULL until the next successful sync.
BEGIN;
INSERT INTO public.benchmarks (name, ticker) VALUES
  ('DXY', 'DX-Y.NYB'),
  ('BTC', 'BTC-USD')
ON CONFLICT (ticker) DO NOTHING;
COMMIT;

-- Read-only verification after the next successful Update Sector Data run:
-- SELECT name, ticker, month_pct, quarter_pct, half_year_pct, ytd_pct, updated_at
-- FROM public.benchmarks
-- WHERE ticker IN ('^GSPC', '^IXIC', '^DJI', 'EFA', 'DX-Y.NYB', 'BTC-USD');
