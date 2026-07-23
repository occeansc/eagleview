#!/usr/bin/env python3
"""
Eagleview v4.4.37 — Earnings Calendar Updater
==============================================
Fetches upcoming earnings dates for every ticker in the Eagleview universe
and writes them to the ticker_earnings table. Runs on its own DAILY schedule
(not the 30-min price sync) since earnings dates rarely change day-to-day,
and per-ticker calendar lookups (yfinance .calendar, one request per ticker —
unlike the bulk yf.download() the price sync uses) are far slower than a
batched price download would be across ~480 tickers.

Ticker list is imported directly from update_sectors.py — single source of
truth, so this can never drift out of sync with the actual sector universe.

Env vars:
  SUPABASE_URL          project URL — NO trailing /rest/v1
  SUPABASE_SERVICE_KEY  legacy eyJ... service_role key
"""

import os, sys, logging, time
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
import requests
import yfinance as yf

from update_sectors import SECTOR_STOCKS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# Small delay between per-ticker requests — .calendar hits Yahoo's actual
# (unofficial) API individually per symbol, unlike the batched yf.download()
# the price sync uses. Being polite here avoids tripping any rate limiting
# across ~480 sequential requests.
REQUEST_DELAY_SECONDS = 0.35


# ── Supabase HTTP client — same pattern as update_sectors.py's DB class ──────
class DB:
    def __init__(self, url: str, key: str):
        self.base = url.rstrip("/") + "/rest/v1"
        self.key  = key
        self.uh   = {
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        }

    def upsert_bulk(self, table: str, rows: list, on_conflict: str) -> None:
        if not rows:
            return
        r = requests.post(
            f"{self.base}/{table}?on_conflict={on_conflict}",
            headers=self.uh, json=rows, timeout=60,
        )
        r.raise_for_status()

    def delete_past_earnings(self, cutoff: date) -> None:
        """Remove stale earnings rows older than the US-market calendar day.

        The /earnings page is labelled upcoming; rows from last week/month must
        not survive just because the next provider fetch has not produced a new
        future date for that ticker yet.
        """
        r = requests.delete(
            f"{self.base}/ticker_earnings?earnings_date=lt.{cutoff.isoformat()}",
            headers=self.uh,
            timeout=60,
        )
        r.raise_for_status()


def build_ticker_universe() -> list[dict]:
    """Flatten SECTOR_STOCKS into a unique (ticker, company_name, sector_name)
    list. Cross-listed tickers (e.g. TSLA in both EV and Robotics) keep only
    their FIRST sector for display purposes — earnings_date itself is stored
    once per ticker regardless, so there's no duplication risk either way."""
    seen: dict[str, dict] = {}
    for sector_name, stocks in SECTOR_STOCKS:
        for ticker, company_name in stocks:
            if ticker not in seen:
                seen[ticker] = {
                    "ticker": ticker,
                    "company_name": company_name,
                    "sector_name": sector_name,
                }
    return list(seen.values())


ET = ZoneInfo("America/New_York")


def fetch_earnings_date(ticker: str):
    """Returns (date, time_label) for the next upcoming earnings date, or
    (None, None) if unavailable. time_label is 'bmo' (before market open),
    'amc' (after market close), or 'unspecified'.

    Primary source: Ticker.info's earningsTimestampStart/earningsTimestamp —
    these are precise UNIX timestamps (not bare dates), so the actual
    hour-of-day can be compared against the 9:30am–4:00pm ET regular
    session to derive BMO/AMC directly, the same technique used whenever
    a data provider doesn't hand over an explicit before/after label.

    Falls back to the lighter Ticker.calendar (bare date, no time-of-day)
    if .info lacks usable timestamp fields for a given ticker.

    Known limitation: yfinance's earnings-date data has documented accuracy
    gaps (see ranaroussi/yfinance#2559) — treat this as Yahoo's best current
    estimate, not a guaranteed-confirmed date. The UI should frame it that
    way rather than implying certainty.
    """
    # ── Primary: Ticker.info timestamps (enables real BMO/AMC) ───────────
    try:
        info = yf.Ticker(ticker).info
        ts = info.get("earningsTimestampStart") or info.get("earningsTimestamp")
        if ts:
            dt_et = datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(ET)
            if dt_et.date() >= datetime.now(ET).date():
                market_open  = dt_et.replace(hour=9,  minute=30, second=0, microsecond=0)
                market_close = dt_et.replace(hour=16, minute=0,  second=0, microsecond=0)
                if dt_et < market_open:
                    return dt_et.date(), "bmo"
                elif dt_et >= market_close:
                    return dt_et.date(), "amc"
                else:
                    return dt_et.date(), "unspecified"
    except Exception as e:
        log.warning(f"    ⚠ {ticker}: info fetch failed — {e}")

    # ── Fallback: Ticker.calendar (date only, no time-of-day) ────────────
    try:
        cal = yf.Ticker(ticker).calendar
    except Exception as e:
        log.warning(f"    ⚠ {ticker}: calendar fetch failed — {e}")
        return None, None

    if not cal:
        return None, None

    raw = cal.get("Earnings Date")
    if not raw:
        return None, None

    candidates = raw if isinstance(raw, (list, tuple)) else [raw]
    today_et = datetime.now(ET).date()
    future = [d for d in candidates if isinstance(d, date) and d >= today_et]
    if not future:
        return None, None

    return min(future), "unspecified"


def main():
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        log.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        sys.exit(1)

    db = DB(url, key)
    today_et = datetime.now(ET).date()
    log.info("══ Eagleview v4.4.37 Earnings Sync ══")
    log.info(f"  Cleaning stale earnings before {today_et.isoformat()} ET")
    db.delete_past_earnings(today_et)

    universe = build_ticker_universe()
    log.info(f"  {len(universe)} unique tickers")

    rows = []
    fetched, skipped = 0, 0
    for i, entry in enumerate(universe, 1):
        ticker = entry["ticker"]
        edate, etime = fetch_earnings_date(ticker)
        if edate is None:
            skipped += 1
        else:
            fetched += 1
            rows.append({
                "ticker":        ticker,
                "company_name":  entry["company_name"],
                "sector_name":   entry["sector_name"],
                "earnings_date": edate.isoformat(),
                "earnings_time": etime,
                "updated_at":    datetime.utcnow().isoformat(),
            })

        if i % 50 == 0:
            log.info(f"  ...{i}/{len(universe)} processed ({fetched} found, {skipped} skipped)")

        time.sleep(REQUEST_DELAY_SECONDS)

    log.info(f"  Done fetching: {fetched} with upcoming dates, {skipped} without")

    db.upsert_bulk("ticker_earnings", rows, on_conflict="ticker")
    log.info(f"══ Done: {len(rows)} earnings rows upserted ══")


if __name__ == "__main__":
    main()
