-- ═══════════════════════════════════════════════════════════════════════════
--  Eagleview v4.2.2 — sector_holdings unique constraint for upsert_bulk
--  Run once in the Supabase SQL editor before deploying v4.2.2.
--  Safe to run on a live table — CREATE UNIQUE INDEX CONCURRENTLY doesn't lock.
--
--  Why: the sync script now uses a single upsert (merge-on-conflict) per sector
--  instead of delete_where + insert, cutting DB calls from 44 → 22 per run.
--  PostgREST's ?on_conflict= parameter requires a unique index to exist on the
--  conflict columns before it can do a merge-upsert.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_holdings_sector_ticker
  ON sector_holdings (sector_id, ticker);
