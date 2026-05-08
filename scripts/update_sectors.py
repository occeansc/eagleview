#!/usr/bin/env python3
"""
Eagleview — Data Updater (requests-based, no supabase-py)
"""

import os, sys, logging, json
from datetime import datetime
import requests
import pandas as pd
import yfinance as yf

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-7s  %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

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

BENCHMARKS = [
    {"name": "S&P 500", "ticker": "^GSPC"},
    {"name": "Nasdaq",  "ticker": "^IXIC"},
    {"name": "Dow",     "ticker": "^DJI"},
]

def pct_return(hist, days):
    if hist is None or len(hist) < days + 1:
        return None
    now  = float(hist["Close"].iloc[-1])
    past = float(hist["Close"].iloc[-(days + 1)])
    return round((now - past) / past * 100, 2)

def ytd_return(hist):
    if hist is None or hist.empty:
        return None
    year = datetime.now().year
    ytd  = hist[hist.index.year == year]
    if ytd.empty:
        return None
    return round((float(hist["Close"].iloc[-1]) - float(ytd["Close"].iloc[0])) / float(ytd["Close"].iloc[0]) * 100, 2)

class SupabaseClient:
    def __init__(self, url, key):
        self.base = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def upsert(self, table, data, on_conflict):
        r = requests.post(
            f"{self.base}/{table}?on_conflict={on_conflict}",
            headers={**self.headers, "Prefer": "resolution=merge-duplicates,return=representation"},
            json=data,
        )
        r.raise_for_status()
        return r.json()

    def delete(self, table, column, value):
        r = requests.delete(
            f"{self.base}/{table}?{column}=eq.{value}",
            headers=self.headers,
        )
        r.raise_for_status()

    def insert(self, table, data):
        r = requests.post(
            f"{self.base}/{table}",
            headers=self.headers,
            json=data,
        )
        r.raise_for_status()

def fetch_holdings(tk, symbol):
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
                return holdings
    except Exception as e:
        log.debug(f"  [{symbol}] funds_data: {e}")
    try:
        info = tk.info
        for rank, h in enumerate(info.get("holdings", [])[:10], 1):
            holdings.append({
                "holding_rank":   rank,
                "holding_ticker": h.get("symbol", ""),
                "holding_name":   h.get("holdingName", ""),
                "weight_pct":     round(float(h.get("holdingPercent", 0)) * 100, 3),
            })
    except Exception as e:
        log.warning(f"  [{symbol}] holdings fallback: {e}")
    return holdings

def process_sector(sector, db):
    symbol, name = sector["etf_ticker"], sector["name"]
    log.info(f"Sector: {name} ({symbol})")
    try:
        tk   = yf.Ticker(symbol)
        hist = tk.history(period="1y")
        if hist.empty:
            log.error(f"  [{symbol}] Empty history"); return False

        stock_count = None
        try:
            info = tk.info
            stock_count = info.get("totalHoldings") or info.get("numberOfHoldings")
        except: pass

        rows = db.upsert("sectors", {
            "name": name, "etf_ticker": symbol,
            "week_pct": pct_return(hist, 5), "month_pct": pct_return(hist, 21),
            "quarter_pct": pct_return(hist, 63), "ytd_pct": ytd_return(hist),
            "stock_count": stock_count,
            "updated_at": datetime.utcnow().isoformat(),
        }, on_conflict="etf_ticker")

        sector_id = rows[0]["id"]
        holdings  = fetch_holdings(tk, symbol)
        if holdings:
            db.delete("sector_holdings", "sector_id", sector_id)
            for h in holdings:
                h["sector_id"] = sector_id
            db.insert("sector_holdings", holdings)
            log.info(f"  ✓ {len(holdings)} holdings")
        return True
    except Exception as e:
        log.error(f"  [{symbol}] ✗ {e}"); return False

def process_benchmark(bm, db):
    ticker, name = bm["ticker"], bm["name"]
    log.info(f"Benchmark: {name} ({ticker})")
    try:
        hist = yf.Ticker(ticker).history(period="1y")
        if hist.empty:
            log.error(f"  [{ticker}] Empty history"); return False
        db.upsert("benchmarks", {
            "name": name, "ticker": ticker,
            "week_pct": pct_return(hist, 5), "month_pct": pct_return(hist, 21),
            "quarter_pct": pct_return(hist, 63), "ytd_pct": ytd_return(hist),
            "updated_at": datetime.utcnow().isoformat(),
        }, on_conflict="ticker")
        log.info(f"  ✓ Saved"); return True
    except Exception as e:
        log.error(f"  [{ticker}] ✗ {e}"); return False

def main():
    log.info("══ Eagleview Data Sync ══")
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        log.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set"); sys.exit(1)

    db = SupabaseClient(url, key)

    log.info("── Benchmarks ──")
    bm_ok = sum(process_benchmark(b, db) for b in BENCHMARKS)

    log.info("── Sectors ──")
    ok = sum(process_sector(s, db) for s in SECTORS)

    log.info(f"Benchmarks: {bm_ok}/{len(BENCHMARKS)}  Sectors: {ok}/{len(SECTORS)}")
    if bm_ok + ok < len(BENCHMARKS) + len(SECTORS):
        sys.exit(1)

if __name__ == "__main__":
    main()
