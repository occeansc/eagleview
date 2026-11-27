# EagleView v4.6.4 — DXY and BTC Market Pulse

## Changes

- Preserve S&P 500 (`^GSPC`), Nasdaq (`^IXIC`), Dow (`^DJI`) and Intl Dev (`EFA`); add **DXY** (`DX-Y.NYB`, the actual US Dollar Index) and **BTC** (`BTC-USD`, Bitcoin spot quoted in USD). Neither is an ETF proxy.
- The existing updater now downloads, validates and upserts all six benchmark records through its existing pipeline. Existing consumers read the same benchmark table, so the holdings modal's benchmark comparisons also include the two additions. S&P-based scorecards and sector/regime calculations are unchanged.
- Preserve tile styling, signs, percentage formatting, period toggles and missing-value dashes. Layout: two columns on mobile, three from the `sm` breakpoint, six from `lg`.
- BTC daily candles include weekends. Its 1W/1M/3M/6M/1Y/5Y windows therefore use elapsed calendar week/month/year offsets, not equity counts of 5/21/63/126/252/1260 daily rows. Use the last available observation on or before the target date; insufficient history stays null. Existing equity/DXY session-count calculations and first-observed-current-year-close YTD convention are preserved.
- Add a short Market Pulse disclosure: synced with sector data, not live; BTC trades 24/7. Scheduling remains unchanged: externally triggered NYSE-calendar sector updates, with manual dispatch available. No new weekend/holiday polling is introduced.
- Bump package/lockfile and existing v4.6.3 UI/earnings labels to v4.6.4, following previous patch releases. The sector updater's pre-existing v4.6.5 internal banner and historical change annotations are retained rather than downgraded.

## Upgrade an existing installation (owner-operated)

1. Deploy the source using your normal GitHub/Vercel process. Keep existing secrets unchanged; none are added by this release.
2. In Supabase **SQL Editor**, run `supabase/migrate_v464_market_pulse.sql` against the existing, fully migrated database. It inserts only the two symbol/name rows, uses `ON CONFLICT (ticker) DO NOTHING`, and leaves existing returns, timestamps and RLS policies untouched. Do not rerun old bootstrap scripts as an upgrade. Fresh installations still need the existing schema and earlier period-column migrations before this additive migration.
3. In GitHub **Actions → Update Sector Data → Run workflow**, leave `trigger` at `manual` and run the updated source. Alternatively wait for the next normal sector update. No manual prices/returns are required.
4. Verify the six symbols using the read-only SELECT provided at the end of the migration. Confirm DXY/BTC receive fresh `updated_at` and available period values after a successful run. Before first sync their returns are null and the UI shows dashes; without the migration or a sync, the existing four-row view still renders.
5. Check Market Pulse in light/dark themes at mobile, tablet and desktop widths. Toggle 1M, 3M, 6M and YTD. The values are percentage returns, not index levels or BTC dollar prices.

**Integrity behavior:** both new symbols are required benchmarks, like the existing four. If either still has unusable history after recovery, the existing integrity gate aborts before data writes. This intentionally preserves old data rather than publishing invented or incomplete benchmark returns.

## Verification performed locally

- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_*.py' -v`: **11 passed**. Synthetic histories, blocked network and mocked provider/database; exercises the actual updater orchestration, six benchmark upserts, missing-benchmark no-write gate, unchanged session math, BTC calendar windows/leap-day/intraday/YTD/null behavior. The seed SQL was executed twice in an in-memory SQLite-compatible fixture to verify idempotency and preservation; it was **not** run against PostgreSQL/Supabase.
- `npm test`: **4 passed**, rendering the actual TSX component with React. Covers six labels, responsive class contract, all eight period mappings, sign/zero/null formatting, and pre-migration/empty datasets.
- `npx tsc --noEmit --incremental false`: **passed**.
- `npm run build`: compiled successfully and completed lint/type validation, then failed static prerender for `/`, `/heatmap`, `/screener`, `/earnings` with **`supabaseUrl is required.`** This checkout has no configured Supabase URL; production build completion and a deployed live-data check remain owner-side verification. No dummy credentials or fabricated API responses were substituted to claim a full build.
- Read-only Yahoo chart requests returned HTTP 200 for both exact symbols: `DX-Y.NYB` identified as US Dollar Index / INDEX / USD; `BTC-USD` as Bitcoin USD / CRYPTOCURRENCY / USD. This confirms provider identity, not deployed sync success or all six-year download paths.
- `git diff --check`: passed.

No remote push, deployment, workflow dispatch, database write or secret change was performed. The source ZIP handoff is packaged separately; do not include `.git`, `node_modules`, `.next`, caches or local environment files.

## Local test requirements

Run `npm ci` for the UI tests and TypeScript. Python tests need `pandas` and `requests`; `yfinance` is mocked in these offline regressions. The real updater retains its existing workflow-installed dependencies (`yfinance`, `pandas`, `requests`, `pandas_market_calendars`). Existing dependency deprecation/security warnings (including Next.js 14.2.3) were observed during install; dependency upgrades are outside this two-benchmark change.
