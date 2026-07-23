#!/usr/bin/env python3
"""Validate EagleView sector-universe ticker eligibility.

Hard gate for release/data-quality work:
- every active ticker in SECTOR_STOCKS must resolve through the Yahoo chart route;
- resolved instruments must be USD equities unless explicitly approved;
- stale/delisted symbols such as acquired/private companies should fail here before
  they reach the live sync.

This script intentionally uses the same public Yahoo chart family as the updater's
fallback path rather than relying on yfinance's bulk download behaviour.
"""

from __future__ import annotations

import argparse
import ast
import json
import sys
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
UPDATE_SECTORS = ROOT / "scripts" / "update_sectors.py"

# EagleView normally wants live US common stocks / US-listed ADRs. Keep explicit
# exceptions small and documented. Additions here should be rare and deliberate.
APPROVED_EXCEPTIONS: dict[str, str] = {
    # SpaceX proxy retained by product decision even though it is not a normal
    # listed US common share in Yahoo. Validator reports it as approved instead
    # of silently treating it as a standard equity.
    "SPCX": "approved SpaceX/private-market proxy exception",
}

EXPECTED_CURRENCY = "USD"
EXPECTED_INSTRUMENTS = {"EQUITY"}
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
HEADERS = {"User-Agent": "Mozilla/5.0 EagleView universe validator"}


def load_sector_stocks() -> list[tuple[str, list[tuple[str, str]]]]:
    """Load SECTOR_STOCKS without importing update_sectors.py dependencies."""
    tree = ast.parse(UPDATE_SECTORS.read_text())
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "SECTOR_STOCKS":
                    return ast.literal_eval(node.value)
    raise RuntimeError(f"SECTOR_STOCKS not found in {UPDATE_SECTORS}")


def collect_universe() -> tuple[dict[str, str], dict[str, list[str]]]:
    names: dict[str, str] = {}
    sectors: dict[str, list[str]] = defaultdict(list)
    for sector, holdings in load_sector_stocks():
        for ticker, company in holdings:
            symbol = ticker.upper().strip()
            names.setdefault(symbol, company)
            sectors[symbol].append(sector)
    return names, sectors


def fetch_chart(symbol: str, *, range_: str = "1mo", interval: str = "1d") -> dict[str, Any]:
    params = urlencode({"range": range_, "interval": interval, "includePrePost": "false"})
    url = f"{YAHOO_CHART_URL.format(symbol=symbol)}?{params}"
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def validate_symbol(symbol: str, company: str, sectors: list[str], *, min_rows: int) -> dict[str, Any]:
    row: dict[str, Any] = {
        "symbol": symbol,
        "company": company,
        "sectors": sectors,
        "status": "PASS",
        "issues": [],
    }

    try:
        data = fetch_chart(symbol)
    except HTTPError as exc:
        row["status"] = "FAIL"
        row["issues"].append(f"Yahoo chart HTTP {exc.code}")
        return row
    except (URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        row["status"] = "FAIL"
        row["issues"].append(f"Yahoo chart error: {type(exc).__name__}: {exc}")
        return row

    result = (data.get("chart", {}).get("result") or [None])[0]
    if not result:
        row["status"] = "FAIL"
        row["issues"].append("Yahoo chart returned no result")
        return row

    meta = result.get("meta") or {}
    quote = ((result.get("indicators") or {}).get("quote") or [{}])[0]
    closes = [value for value in (quote.get("close") or []) if value is not None]

    row.update({
        "instrumentType": meta.get("instrumentType"),
        "exchange": meta.get("exchangeName") or meta.get("fullExchangeName") or meta.get("exchange"),
        "currency": meta.get("currency"),
        "rows": len(closes),
        "resolvedName": meta.get("shortName") or meta.get("longName") or meta.get("symbol"),
    })

    if symbol in APPROVED_EXCEPTIONS:
        row["status"] = "APPROVED_EXCEPTION"
        row["issues"].append(APPROVED_EXCEPTIONS[symbol])
        return row

    if meta.get("instrumentType") not in EXPECTED_INSTRUMENTS:
        row["status"] = "FAIL"
        row["issues"].append(f"instrumentType={meta.get('instrumentType')!r}")
    if meta.get("currency") != EXPECTED_CURRENCY:
        row["status"] = "FAIL"
        row["issues"].append(f"currency={meta.get('currency')!r}")
    if len(closes) < min_rows:
        # Limited history can be acceptable for new IPOs/ticker changes, but it
        # must be visible to the curator.
        if row["status"] == "PASS":
            row["status"] = "WARN"
        row["issues"].append(f"limited chart history: {len(closes)} rows < {min_rows}")

    return row


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate EagleView sector ticker universe")
    parser.add_argument("--min-rows", type=int, default=5, help="minimum 1mo daily close rows before warning")
    parser.add_argument("--workers", type=int, default=16, help="parallel Yahoo requests")
    parser.add_argument("--json", action="store_true", help="print machine-readable JSON")
    args = parser.parse_args()

    names, sectors = collect_universe()
    symbols = sorted(names)
    start = time.time()

    results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(validate_symbol, symbol, names[symbol], sectors[symbol], min_rows=args.min_rows): symbol
            for symbol in symbols
        }
        for future in as_completed(futures):
            results.append(future.result())

    results.sort(key=lambda r: (r["status"], r["symbol"]))
    failures = [r for r in results if r["status"] == "FAIL"]
    warnings = [r for r in results if r["status"] == "WARN"]
    exceptions = [r for r in results if r["status"] == "APPROVED_EXCEPTION"]

    if args.json:
        print(json.dumps({
            "total": len(results),
            "failures": failures,
            "warnings": warnings,
            "approved_exceptions": exceptions,
            "elapsed_sec": round(time.time() - start, 2),
        }, indent=2))
    else:
        print(f"Universe symbols checked: {len(results)}")
        print(f"Failures: {len(failures)} | Warnings: {len(warnings)} | Approved exceptions: {len(exceptions)}")
        if failures:
            print("\nFAILURES")
            for r in failures:
                print(f"  {r['symbol']:6s} {r['company']} — {'; '.join(r['issues'])} — sectors: {', '.join(r['sectors'])}")
        if warnings:
            print("\nWARNINGS")
            for r in warnings:
                print(f"  {r['symbol']:6s} {r['company']} — {'; '.join(r['issues'])} — sectors: {', '.join(r['sectors'])}")
        if exceptions:
            print("\nAPPROVED EXCEPTIONS")
            for r in exceptions:
                print(f"  {r['symbol']:6s} {r['company']} — {'; '.join(r['issues'])} — sectors: {', '.join(r['sectors'])}")
        print(f"\nElapsed: {time.time() - start:.1f}s")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
