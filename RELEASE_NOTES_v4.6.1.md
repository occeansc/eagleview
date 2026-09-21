# EagleView v4.6.1

## Change

Scheduled sector-data runs now execute fully on any NYSE trading day regardless of the time GitHub Actions actually starts them. A delayed intentional schedule is no longer discarded because it began before the open, after the close, or after its original slot.

## Retained protection

- Weekends and NYSE holidays remain blocked for scheduled sector syncs.
- Manual dispatch continues to run at any time.
- Regular-session pricing behavior is unchanged: regular-market prices are used only while the cash session is open; off-hours runs use the latest completed regular-session close rather than pre-market or after-hours prices.
- The existing 4:17 PM ET settled-close schedule remains in place for timely daily and Friday weekly close capture.

## Removed

- Scheduled session-window rejection
- Scheduled close-slot/DST validation
- The unused `EAGLEVIEW_SCHEDULED_SLOT` workflow environment variable

## Verification

- Python syntax check passed for both market-data scripts.
- Calendar gate check: Friday after-hours is permitted; Sunday remains blocked.
- Workflow YAML parsed successfully with all four intentional scheduled entries retained.
- All release-facing `v4.6.0` labels were updated to `v4.6.1`.
- `next build` compiled successfully, then could not complete static prerendering because this isolated build environment has no Supabase URL/key. This is an environment limitation, not a source compile/type failure; Vercel must supply its configured Supabase environment variables.

## Source baseline and allowed changes

Baseline: GitHub `main` commit `23028ed8201d1a636dde8117bd84b46141d193ec` (v4.6.0).

Changed source files:

- `.github/workflows/update-sectors.yml`
- `scripts/update_sectors.py`
- Version labels only: `package.json`, `package-lock.json`, `app/earnings/EarningsClient.tsx`, `app/screener/ScreenerClient.tsx`, `app/watchlist/page.tsx`, `components/HoldingsModal.tsx`, `components/Nav.tsx`, `components/TickerModal.tsx`, `scripts/update_earnings.py`
