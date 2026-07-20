-- Eagleview v4.4.29 — one-time cleanup for stale earnings calendar rows
-- Safe to run repeatedly. The app also filters earnings_date >= current US-market
-- day, and scripts/update_earnings.py now deletes past rows during daily sync.

delete from public.ticker_earnings
where earnings_date is not null
  and earnings_date < ((now() at time zone 'America/New_York')::date);
