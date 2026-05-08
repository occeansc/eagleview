#!/usr/bin/env python3
"""
Eagleview — Data Updater
=========================
Fetches ETF performance + top-10 holdings from Yahoo Finance,
and benchmark index returns (S&P 500, Nasdaq, Dow),
then upserts everything into Supabase.

Usage:
  python scripts/update_sectors.py

Env vars required:
  SUPABASE_URL          (project URL)
  SUPABASE_SERVICE_KEY  (service_role key — NOT anon)

Schedule: Mon / Wed / Fri at 22:00 UTC via GitHub Actions.
"""

import os
import sys
import logging
from datetime import datetime

import pandas as pd
import yfinance as yf
from supabase import create_client, Client

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Sector → ETF mapping ──────────────────────────────────────────────────────
SECTORS = [
    {"name": "Semiconductors",        "etf_ticker": "SMH"},
    {"name": "Energy & Utilities",    "etf_ticker": "XLE"},
    {"name": "Robotics & Automation", "etf_ticker": "BOTZ"},
    {"name": "Industrials",           "etf_ticker": "XLI"},
    {"name": "Nuclear & Uranium",     "etf_ticker": "URA"},
    {"name": "Materials",             "etf_ticker": "XLB"},
    {"name": "Quantum Computing",     "etf_ticker": "QTUM"},
    {"name": "Real Estate",           "etf_ticker": "VNQ"},
    {"name": "Electric Vehicles",     "etf_ticker": "DRIV"},
    {"name": "Drones & Space",        "etf_ticker": "ARKX"},
    {"name": "Biotech & Pharma",      "etf_ticker": "IBB"},
    {"name": "Big Tech",              "etf_ticker": "QQQ"},
    {"name": "Consumer",              "etf_ticker": "XLY"},
    {"name": "Travel & Airlines",     "etf_ticker": "JETS"},
    {"name": "Financials",            "etf_ticker": "XLF"},
    {"name": "Healthcare",            "etf_ticker": "XLV"},
    {"name": "Defense & Aerospace",   "etf_ticker": "ITA"},
    {"name": "Cybersecurity",         "etf_ticker": "CIBR"},
    {"name": "AI & Machine Learning", "etf_ticker": "AIQ"},
    {"name": "Software & Cloud",      "etf_ticker": "IGV"},
]

# ── Benchmark indices (actual index symbols for canonical numbers) ─────────────
BENCHMARKS = [
    {"name": "S&P 500", "ticker": "^GSPC"},
    {"name": "Nasdaq",  "ticker": "^IXIC"},
    {"name": "Dow",     "ticker": "^DJI"},
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def pct_return(hist: pd.DataFrame, trading_days: int) -> float | None:
    if hist is None or len(hist) < trading_days + 1:
        return None
    now  = float(hist["Close"].iloc[-1])
    past = float(hist["Close"].iloc[-(trading_days + 1)])
    return round((now - past) / past * 100, 2)


def ytd_return(hist: pd.DataFrame) -> float | None:
    if hist is None or hist.empty:
        return None
    year = datetime.now().year
    ytd  = hist[hist.index.year == year]
    if ytd.empty:
        return None
    now   = float(hist["Close"].iloc[-1])
    start = float(ytd["Close"].iloc[0])
    return round((now - start) / start * 100, 2)


def fetch_holdings(tk: yf.Ticker, symbol: str) -> list[dict]:
    holdings = []

    try:
        top = tk.funds_data.top_holdings
        if top is not None and not top.empty:
            for rank, (ticker, row) in enumerate(top.iterrows(), 1):
                holdings.append({
                    "holding_rank":   rank,
                    "holding_ticker": str(ticker),
                    "holding_name":   str(row.get("Name", ticker)),
                    "weight_pct":     round(float(row.get("Value", 0)) * 100, 3),
                })
                if rank >= 10:
                    break
            if holdings:
                log.info(f"  [{symbol}] {len(holdings)} holdings via funds_data")
                return holdings
    except Exception as e:
        log.debug(f"  [{symbol}] funds_data unavailable: {e}")

    try:
        info = tk.info
        for rank, h in enumerate(info.get("holdings", [])[:10], 1):
            holdings.append({
                "holding_rank":   rank,
                "holding_ticker": h.get("symbol", ""),
                "holding_name":   h.get("holdingName", ""),
                "weight_pct":     round(float(h.get("holdingPercent", 0)) * 100, 3),
            })
        if holdings:
            log.info(f"  [{symbol}] {len(holdings)} holdings via info dict")
    except Exception as e:
        log.warning(f"  [{symbol}] Holdings fallback also failed: {e}")

    return holdings


def fetch_stock_count(tk: yf.Ticker) -> int | None:
    try:
        info = tk.info
        return info.get("totalHoldings") or info.get("numberOfHoldings") or None
    except Exception:
        return None


# ── Sector update ─────────────────────────────────────────────────────────────

def process_sector(sector: dict, supabase: Client) -> bool:
    symbol = sector["etf_ticker"]
    name   = sector["name"]
    log.info(f"Sector: {name} ({symbol})")

    try:
        tk   = yf.Ticker(symbol)
        hist = tk.history(period="1y")

        if hist.empty:
            log.error(f"  [{symbol}] Empty history — skipping")
            return False

        week_pct    = pct_return(hist, 5)
        month_pct   = pct_return(hist, 21)
        quarter_pct = pct_return(hist, 63)
        ytd_pct     = ytd_return(hist)
        stock_count = fetch_stock_count(tk)

        log.info(f"  1W={week_pct}% 1M={month_pct}% 3M={quarter_pct}% YTD={ytd_pct}% n={stock_count}")

        result = (
            supabase.table("sectors")
            .upsert(
                {
                    "name":        name,
                    "etf_ticker":  symbol,
                    "week_pct":    week_pct,
                    "month_pct":   month_pct,
                    "quarter_pct": quarter_pct,
                    "ytd_pct":     ytd_pct,
                    "stock_count": stock_count,
                    "updated_at":  datetime.utcnow().isoformat(),
                },
                on_conflict="etf_ticker",
            )
            .execute()
        )
        sector_id = result.data[0]["id"]

        holdings = fetch_holdings(tk, symbol)
        if holdings:
            supabase.table("sector_holdings").delete().eq("sector_id", sector_id).execute()
            for h in holdings:
                h["sector_id"] = sector_id
            supabase.table("sector_holdings").insert(holdings).execute()
            log.info(f"  ✓ {len(holdings)} holdings saved")
        else:
            log.warning(f"  No holdings found")

        return True

    except Exception as exc:
        log.error(f"  [{symbol}] ✗ Failed: {exc}")
        return False


# ── Benchmark update ─────────────────────────────────────────────────────────

def process_benchmark(bm: dict, supabase: Client) -> bool:
    ticker = bm["ticker"]
    name   = bm["name"]
    log.info(f"Benchmark: {name} ({ticker})")

    try:
        hist = yf.Ticker(ticker).history(period="1y")

        if hist.empty:
            log.error(f"  [{ticker}] Empty history — skipping")
            return False

        week_pct    = pct_return(hist, 5)
        month_pct   = pct_return(hist, 21)
        quarter_pct = pct_return(hist, 63)
        ytd_pct     = ytd_return(hist)

        log.info(f"  1W={week_pct}% 1M={month_pct}% 3M={quarter_pct}% YTD={ytd_pct}%")

        supabase.table("benchmarks").upsert(
            {
                "name":        name,
                "ticker":      ticker,
                "week_pct":    week_pct,
                "month_pct":   month_pct,
                "quarter_pct": quarter_pct,
                "ytd_pct":     ytd_pct,
                "updated_at":  datetime.utcnow().isoformat(),
            },
            on_conflict="ticker",
        ).execute()

        log.info(f"  ✓ Saved")
        return True

    except Exception as exc:
        log.error(f"  [{ticker}] ✗ Failed: {exc}")
        return False


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    log.info("══════════════════════════════════════════")
    log.info("  Eagleview — Data Sync Start")
    log.info("══════════════════════════════════════════")

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_key:
        log.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)

    supabase = create_client(supabase_url, supabase_key)

    # ── Benchmarks first (fast, no holdings) ─────────────────────────────
    log.info("── Benchmarks ────────────────────────────")
    bm_ok, bm_failed = 0, []
    for bm in BENCHMARKS:
        if process_benchmark(bm, supabase):
            bm_ok += 1
        else:
            bm_failed.append(bm["ticker"])

    # ── Sectors ──────────────────────────────────────────────────────────
    log.info("── Sectors ───────────────────────────────")
    ok, failed = 0, []
    for sector in SECTORS:
        if process_sector(sector, supabase):
            ok += 1
        else:
            failed.append(sector["etf_ticker"])

    log.info("══════════════════════════════════════════")
    log.info(f"  Benchmarks: {bm_ok}/{len(BENCHMARKS)}")
    log.info(f"  Sectors:    {ok}/{len(SECTORS)}")
    if failed or bm_failed:
        log.warning(f"  Failed: {bm_failed + failed}")
        sys.exit(1)
    log.info("══════════════════════════════════════════")


if __name__ == "__main__":
    main()
