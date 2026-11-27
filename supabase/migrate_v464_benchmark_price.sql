-- EagleView v4.6.4 follow-up: latest return-anchor price/index level.
-- Apply before running the updated sector sync. No backfill or default quote.
BEGIN;
ALTER TABLE public.benchmarks
  ADD COLUMN IF NOT EXISTS price double precision;
COMMIT;

-- After a successful sync, verify all six symbols and their sync timestamps:
-- SELECT ticker, price, month_pct, updated_at FROM public.benchmarks
-- WHERE ticker IN ('^GSPC', '^IXIC', '^DJI', 'EFA', 'DX-Y.NYB', 'BTC-USD');
