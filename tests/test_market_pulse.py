"""Offline regression tests: synthetic histories and mocked provider/database only.

Run: python3 -m unittest discover -s tests -p 'test_*.py' -v
Requires pandas + requests (the updater dependencies); no Yahoo/DB access.
"""
import importlib.util
from pathlib import Path
import socket
import sqlite3
import sys
from types import ModuleType
import unittest
from unittest.mock import Mock, patch

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
# Mock yfinance even when installed: importing must not create a cache or call Yahoo.
yf = ModuleType('yfinance')
yf.set_tz_cache_location = Mock()
spec = importlib.util.spec_from_file_location('pulse_updater', ROOT / 'scripts/update_sectors.py')
updater = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {'yfinance': yf}), patch.object(socket.socket, 'connect', side_effect=AssertionError('network forbidden')):
    spec.loader.exec_module(updater)

SYMBOLS = ['^GSPC', '^IXIC', '^DJI', 'EFA', 'DX-Y.NYB', 'BTC-USD']


class MarketPulseTests(unittest.TestCase):
    def setUp(self):
        self.network = patch.object(socket.socket, 'connect', side_effect=AssertionError('network forbidden'))
        self.network.start()
        self.addCleanup(self.network.stop)
        # Six years, daily, monotonic synthetic data (not real market quotes).
        self.series = pd.Series(range(1000, 3192), index=pd.date_range('2020-01-01', periods=2192))

    def test_exact_six_symbols_preserve_existing_four(self):
        self.assertEqual([b['ticker'] for b in updater.BENCHMARKS], SYMBOLS)
        self.assertEqual([b['name'] for b in updater.BENCHMARKS][-2:], ['DXY', 'BTC'])

    def test_existing_session_returns_unchanged(self):
        result = updater.calc_returns(self.series)
        for field, count in [('day_pct', 1), ('week_pct', 5), ('month_pct', 21),
                             ('quarter_pct', 63), ('half_year_pct', 126),
                             ('year_pct', 252), ('five_year_pct', 1260)]:
            past = self.series.iloc[-count - 1]
            self.assertEqual(result[field], round((self.series.iloc[-1] / past - 1) * 100, 2))

    def test_btc_periods_use_elapsed_calendar_not_equity_row_counts(self):
        result = updater.calc_returns(self.series, calendar_days=True)
        for field, offset in [('day_pct', pd.DateOffset(days=1)), ('week_pct', pd.DateOffset(weeks=1)),
                              ('month_pct', pd.DateOffset(months=1)), ('quarter_pct', pd.DateOffset(months=3)),
                              ('half_year_pct', pd.DateOffset(months=6)), ('year_pct', pd.DateOffset(years=1)),
                              ('five_year_pct', pd.DateOffset(years=5))]:
            past = self.series.loc[self.series.index[-1] - offset]
            self.assertEqual(result[field], round((self.series.iloc[-1] / past - 1) * 100, 2))
        self.assertNotEqual(result['month_pct'], updater.calc_returns(self.series)['month_pct'])

    def test_btc_insufficient_history_stays_null(self):
        result = updater.calc_returns(self.series.iloc[-10:], calendar_days=True)
        self.assertIsNotNone(result['week_pct'])
        self.assertIsNone(result['month_pct'])
        self.assertIsNone(result['five_year_pct'])
        self.assertEqual(updater.calc_returns(pd.Series(dtype=float), calendar_days=True), {})

    def test_missing_new_benchmark_is_fatal(self):
        for symbol in SYMBOLS[-2:]:
            with self.subTest(symbol=symbol):
                ok, reasons = updater.evaluate_integrity_gate([symbol], [], updater.BENCHMARKS)
                self.assertFalse(ok)
                self.assertIn('benchmark', reasons[0])

    def run_mock_sync(self, missing=None, quotes=None, series=None):
        db = Mock()
        db.get.return_value = []
        closes = pd.DataFrame({symbol: self.series if series is None else series for symbol in SYMBOLS})
        if missing:
            closes[missing] = float('nan')
        with patch.dict('os.environ', {'SUPABASE_URL': 'https://db.invalid', 'SUPABASE_SERVICE_KEY': 'test-only',
                                        'GITHUB_EVENT_NAME': 'workflow_dispatch', 'EAGLEVIEW_TRIGGER': 'manual'}), \
             patch.object(updater, 'DB', return_value=db), \
             patch.object(updater, 'SECTOR_STOCKS', []), \
             patch.object(updater, 'download_close_history', return_value=closes) as download, \
             patch.object(updater, 'recover_missing_close_history', return_value=closes), \
             patch.object(updater, 'fetch_regular_market_prices', return_value=quotes or {}):
            if missing:
                with self.assertRaises(SystemExit):
                    updater.main()
            else:
                updater.main()
            self.assertEqual(set(download.call_args.args[0]), set(SYMBOLS))
        return db

    def test_full_pipeline_upserts_six_benchmarks_with_correct_returns(self):
        db = self.run_mock_sync()
        self.assertEqual(db.upsert.call_count, 6)
        for call, symbol in zip(db.upsert.call_args_list, SYMBOLS):
            table, payload, conflict = call.args
            self.assertEqual((table, payload['ticker'], conflict), ('benchmarks', symbol, 'ticker'))
            self.assertEqual(payload['month_pct'], updater.calc_returns(self.series, calendar_days=symbol == 'BTC-USD')['month_pct'])
            self.assertIn('updated_at', payload)
            self.assertEqual(payload['price'], float(self.series.iloc[-1]))
            self.assertEqual(len([key for key in payload if key.endswith('_pct')]), 8)

    def test_pipeline_persists_exact_daily_anchor_without_display_rounding(self):
        series = self.series.astype(float) + 0.123456789
        db = self.run_mock_sync(series=series)
        for call in db.upsert.call_args_list:
            payload = call.args[1]
            self.assertEqual(payload['price'], float(series.iloc[-1]))
            self.assertNotEqual(payload['price'], round(payload['price'], 4))

    def test_pipeline_live_quote_is_same_anchor_as_returns_for_every_benchmark(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        fixed = datetime(2025, 12, 31, 12, tzinfo=ZoneInfo('America/New_York'))
        class Clock:
            @staticmethod
            def now(tz=None):
                return fixed
        quotes = {symbol: 3250.123456 + i for i, symbol in enumerate(SYMBOLS)}
        with patch.object(updater, 'datetime', Clock):
            db = self.run_mock_sync(quotes=quotes)
            for call in db.upsert.call_args_list:
                payload = call.args[1]
                symbol = payload['ticker']
                self.assertEqual(payload['price'], quotes[symbol])
                expected = updater.calc_returns(self.series, quotes[symbol], calendar_days=symbol == 'BTC-USD')
                for key, value in expected.items():
                    self.assertEqual(payload[key], value)
                # Today's in-progress daily candle is not the 1D denominator.
                self.assertEqual(payload['day_pct'], round((quotes[symbol] / self.series.iloc[-2] - 1) * 100, 2))

    def test_invalid_live_quotes_fall_back_to_close_in_pipeline(self):
        quotes = dict(zip(SYMBOLS, [None, 0, -1, float('nan'), float('inf'), -float('inf')]))
        db = self.run_mock_sync(quotes=quotes)
        for call in db.upsert.call_args_list:
            payload = call.args[1]
            self.assertEqual(payload['price'], float(self.series.iloc[-1]))
            expected = updater.calc_returns(self.series, calendar_days=payload['ticker'] == 'BTC-USD')
            self.assertEqual(payload['day_pct'], expected['day_pct'])

    def test_missing_or_invalid_daily_anchor_never_becomes_a_price(self):
        for value in [0, -1, float('inf'), -float('inf')]:
            series = self.series.astype(float).copy()
            series.iloc[-1] = value
            self.assertIsNone(updater.return_anchor(series))
            self.assertEqual(updater.calc_returns(series), {})
        self.assertIsNone(updater.return_anchor(pd.Series(dtype=float)))
        self.assertIsNone(updater.return_anchor(pd.Series([float('nan')])))
        self.assertIsNone(updater.return_anchor(None))
        series = pd.concat([self.series, pd.Series([float('nan')], index=[pd.Timestamp('2026-01-01')])])
        self.assertEqual(updater.return_anchor(series), float(self.series.iloc[-1]))

    def test_price_migration_is_nullable_additive_and_idempotent(self):
        sql = (ROOT / 'supabase/migrate_v464_benchmark_price.sql').read_text()
        statements = '\n'.join(line for line in sql.splitlines() if not line.startswith('--')).upper()
        self.assertIn('ALTER TABLE PUBLIC.BENCHMARKS', statements)
        self.assertIn('ADD COLUMN IF NOT EXISTS PRICE DOUBLE PRECISION', statements)
        for forbidden in ['NOT NULL', 'DEFAULT', 'UPDATE ', 'DELETE ', 'DROP ', 'INSERT ']:
            self.assertNotIn(forbidden, statements)

    def test_missing_new_benchmark_blocks_all_writes(self):
        for symbol in SYMBOLS[-2:]:
            with self.subTest(symbol=symbol):
                db = self.run_mock_sync(missing=symbol)
                db.upsert.assert_not_called()
                db.patch.assert_not_called()
                db.upsert_bulk.assert_not_called()
                db.insert_ignore.assert_not_called()

    def test_btc_month_end_leap_year_and_missing_observation(self):
        series = pd.Series(100.0, index=pd.date_range('2024-01-01', '2024-03-31'))
        series.loc['2024-02-29'] = 80.0
        series.loc['2024-03-31'] = 120.0
        result = updater.calc_returns(series, calendar_days=True)
        self.assertEqual(result['month_pct'], 50.0)  # March 31 minus a month = leap day
        series = series.drop(pd.Timestamp('2024-02-29'))
        self.assertEqual(updater.calc_returns(series, calendar_days=True)['month_pct'], 20.0)

    def test_btc_intraday_anchor_and_ytd(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        fixed = datetime(2026, 6, 15, 12, tzinfo=ZoneInfo('America/New_York'))
        class Clock:
            @staticmethod
            def now(tz=None):
                return fixed
        series = pd.Series(100.0, index=pd.date_range('2026-01-01', '2026-06-15'))
        series.loc['2026-06-15'] = 999.0  # incomplete daily candle must not be the denominator
        with patch.object(updater, 'datetime', Clock):
            result = updater.calc_returns(series, 110.0, calendar_days=True)
        self.assertEqual(result['day_pct'], 10.0)
        self.assertEqual(result['month_pct'], 10.0)
        self.assertEqual(result['ytd_pct'], 10.0)
        self.assertIsNone(result['year_pct'])

    def test_migration_rerun_preserves_existing_data(self):
        # This seed SQL is also SQLite-compatible; exercise twice in memory.
        # Not a substitute for executing PostgreSQL RLS/schema migrations.
        sql = (ROOT / 'supabase/migrate_v464_market_pulse.sql').read_text()
        with sqlite3.connect(':memory:') as db:
            db.execute("ATTACH DATABASE ':memory:' AS public")
            db.execute('CREATE TABLE public.benchmarks (name TEXT, ticker TEXT UNIQUE, month_pct REAL)')
            db.executemany('INSERT INTO public.benchmarks VALUES (?, ?, ?)',
                           [(b['name'], b['ticker'], 1.23) for b in updater.BENCHMARKS[:4]])
            db.commit()
            db.executescript(sql)
            db.executescript(sql)
            rows = dict(db.execute('SELECT ticker, month_pct FROM public.benchmarks'))
            self.assertEqual(set(rows), set(SYMBOLS))
            for symbol in SYMBOLS[:4]:
                self.assertEqual(rows[symbol], 1.23)
            for symbol in SYMBOLS[-2:]:
                self.assertIsNone(rows[symbol])

    def test_migration_additive_idempotent_and_matches_updater(self):
        sql = (ROOT / 'supabase/migrate_v464_market_pulse.sql').read_text()
        for b in updater.BENCHMARKS[-2:]:
            self.assertIn(f"('{b['name']}', '{b['ticker']}')", sql)
        self.assertIn('ON CONFLICT (ticker) DO NOTHING', sql)
        statements = '\n'.join(line for line in sql.splitlines() if not line.startswith('--')).upper()
        for forbidden in ['DELETE ', 'DROP ', 'UPDATE ', 'ALTER ', '_PCT']:
            self.assertNotIn(forbidden, statements)


if __name__ == '__main__':
    unittest.main()
