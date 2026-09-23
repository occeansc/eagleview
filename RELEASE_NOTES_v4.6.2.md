# EagleView v4.6.2

## Change

Fixes Safari/WebKit sector-card content shrink-wrap on iPad and Safari desktop layouts.

`SectorCard` is an interactive `<button>` with a column flex layout. WebKit does not reliably stretch its flex children when the container relies on the default `align-items: normal`, so the card’s upper and footer canvases could shrink to content width. That left the badge and sparkline mid-card and collapsed `N assets` beside `VIEW →`.

The card root now explicitly declares `items-stretch`, restoring the intended full-width distribution for every existing card row.

## Scope boundary

- No sector data, scoring, ranking, signals, grid breakpoints, card typography, colors, spacing, or card content changed.
- No data-sync or GitHub Actions behavior changed.
- The sole functional UI change is the explicit WebKit-safe stretch declaration in `components/SectorCard.tsx`.
- All other changed files are v4.6.2 release/version labels only.

## Verification

- The WebKit behavior was reproduced against the live v4.6.1 card DOM by forcing the affected alignment: the upper canvas shrank to 68.9% of card width, the footer to 50.6%, and the `assets` → `VIEW` gap fell to 0px.
- Explicit stretch restored the normal full-width geometry: both canvases at 99.1% of card width and a 112px `assets` → `VIEW` gap in the probe.
- `git diff --check` passed.
- Python syntax checks pass for `scripts/update_sectors.py` and `scripts/update_earnings.py`.
- `next build` is run as the release gate; any external Supabase-environment limitation is reported separately.

## Baseline and allowed changes

Baseline: GitHub `main` commit `08677ccea0062422d6f7b58fc2cc8dc0b4ece922` (v4.6.1).

- Functional source: `components/SectorCard.tsx`
- Release/version metadata only: `package.json`, `package-lock.json`, `components/Nav.tsx`, `components/TickerModal.tsx`, `components/HoldingsModal.tsx`, `app/watchlist/page.tsx`, `app/screener/ScreenerClient.tsx`, `app/earnings/EarningsClient.tsx`, `scripts/update_sectors.py`, `scripts/update_earnings.py`
