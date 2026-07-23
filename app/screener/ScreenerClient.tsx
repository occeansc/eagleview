'use client'

import { useState, useMemo } from 'react'
import {
  SectorHolding, Sector, Period,
  PERIOD_LABELS, getPeriodValue, formatPrice,
} from '@/lib/types'
import { SearchIcon, TrendingUpIcon, TrendingDownIcon } from '@/components/Icons'
import TickerModal from '@/components/TickerModal'

// Screener shows all 8 periods (1D through 5Y) — same pattern as Dashboard.
const SCREENER_PERIODS: Period[] = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y']

interface Props {
  holdings: (SectorHolding & { sectors: { name: string } })[]
  sectors:  Pick<Sector, 'id' | 'name'>[]
}

export default function ScreenerClient({ holdings, sectors }: Props) {
  const [period,    setPeriod]    = useState<Period>('1D')
  const [query,     setQuery]     = useState('')
  const [sector,    setSector]    = useState<number | 'all'>('all')
  const [direction, setDirection] = useState<'all' | 'positive' | 'negative'>('all')
  const [limit,     setLimit]     = useState(50)
  const [selectedTicker, setSelectedTicker] = useState<SectorHolding | null>(null)

  const filtered = useMemo(() => {
    /* Dedupe: one entry per ticker, keep highest return for active period */
    const byTicker: Record<string, typeof holdings[0]> = {}
    for (const h of holdings) {
      const v   = getPeriodValue(h, period) ?? -Infinity
      const cur = byTicker[h.ticker]
      if (!cur || (getPeriodValue(cur, period) ?? -Infinity) < v) byTicker[h.ticker] = h
    }
    let rows = Object.values(byTicker)

    if (sector !== 'all') {
      rows = holdings.filter(h => h.sector_id === sector)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      rows = rows.filter(h =>
        h.ticker.toLowerCase().includes(q) || h.company_name.toLowerCase().includes(q)
      )
    }
    if (direction === 'positive') rows = rows.filter(h => (getPeriodValue(h, period) ?? 0) >= 0)
    if (direction === 'negative') rows = rows.filter(h => (getPeriodValue(h, period) ?? 1) < 0)

    const desc = direction !== 'negative'
    return rows.sort((a, b) =>
      desc
        ? (getPeriodValue(b, period) ?? -Infinity) - (getPeriodValue(a, period) ?? -Infinity)
        : (getPeriodValue(a, period) ??  Infinity) - (getPeriodValue(b, period) ??  Infinity)
    )
  }, [holdings, period, query, sector, direction])

  const shown     = filtered.slice(0, limit)
  const posCount  = filtered.filter(h => (getPeriodValue(h, period) ?? 0) >= 0).length

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">
          Stock Screener
        </h2>
        <p className="text-[12px] text-slate-400 dark:text-slate-500">
          {filtered.length.toLocaleString()} stocks ·{' '}
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{posCount} positive</span>
          {' '}
          <span className="text-rose-500 dark:text-rose-400 font-bold">{filtered.length - posCount} negative</span>
          {' '}· {PERIOD_LABELS[period]}
        </p>
      </div>

      {/* Filters panel */}
      <div
        className="rounded-[22px] p-4 mb-5 space-y-3"
        style={{
          background: 'var(--bg-surface-1)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-glass)',
        }}
      >
        {/* Search */}
        <div className="relative">
          <SearchIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search ticker or company…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/20 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300 transition-all placeholder:text-slate-400 dark:text-slate-500"
          />
        </div>

        {/* Period + direction */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="period-control">
            <div className="period-control-inner">
              {SCREENER_PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`period-pill ${period === p ? 'period-pill-active' : ''}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="period-control">
            <div className="period-control-inner">
              {(['all', 'positive', 'negative'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`period-pill flex items-center gap-1 ${
                    direction === d
                      ? d === 'positive'
                        ? 'period-pill-active !bg-emerald-50 dark:!bg-emerald-500/10 !text-emerald-700 dark:text-emerald-300 dark:!text-emerald-300 !border-emerald-200/80 dark:!border-emerald-500/25 !shadow-none'
                        : d === 'negative'
                        ? 'period-pill-active !bg-rose-50 dark:!bg-rose-500/10 !text-rose-700 dark:text-rose-300 dark:!text-rose-300 !border-rose-200/80 dark:!border-rose-500/25 !shadow-none'
                        : 'period-pill-active'
                      : ''
                  }`}
                >
                  {d === 'positive' && <TrendingUpIcon size={10} className={direction === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : ''} />}
                  {d === 'negative' && <TrendingDownIcon size={10} className={direction === 'negative' ? 'text-rose-600 dark:text-rose-400' : ''} />}
                  {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sector filter */}
        <select
          value={sector}
          onChange={e => setSector(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="w-full text-[13px] bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/20 rounded-[12px] px-3 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all"
        >
          <option value="all">All sectors</option>
          {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Results table */}
      <div
        className="rounded-[22px] overflow-hidden"
        style={{
          background: 'var(--bg-surface-1)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-glass)',
        }}
      >
        {/* ── Desktop table (sm+) — full overflow-x-auto with all columns ── */}
        <div className="hidden sm:block overflow-x-auto">
          <div style={{ minWidth: '760px' }}>
            <div className="grid grid-cols-[28px_64px_minmax(180px,320px)_64px_50px_50px_50px_50px_50px_50px_50px_50px] gap-x-2 text-[9px] font-bold tracking-[0.09em] uppercase text-slate-400 dark:text-slate-500 px-4 py-3 bg-slate-50/70 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
              <span>#</span>
              <span>Ticker</span>
              <span>Company</span>
              <span className="text-right">Price</span>
              <span className={`text-right ${period === '1D'  ? 'text-slate-700 dark:text-slate-300' : ''}`}>1D</span>
              <span className={`text-right ${period === '1W'  ? 'text-slate-700 dark:text-slate-300' : ''}`}>1W</span>
              <span className={`text-right ${period === '1M'  ? 'text-slate-700 dark:text-slate-300' : ''}`}>1M</span>
              <span className={`text-right ${period === '3M'  ? 'text-slate-700 dark:text-slate-300' : ''}`}>3M</span>
              <span className={`text-right ${period === '6M'  ? 'text-slate-700 dark:text-slate-300' : ''}`}>6M</span>
              <span className={`text-right ${period === 'YTD' ? 'text-slate-700 dark:text-slate-300' : ''}`}>YTD</span>
              <span className={`text-right ${period === '1Y'  ? 'text-slate-700 dark:text-slate-300' : ''}`}>1Y</span>
              <span className={`text-right ${period === '5Y'  ? 'text-slate-700 dark:text-slate-300' : ''}`}>5Y</span>
            </div>
            {shown.length === 0 ? (
              <div className="text-center py-16">
                <SearchIcon size={28} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                <p className="text-slate-500 dark:text-slate-400 font-semibold text-[13px]">No stocks match</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-white/5">
                {shown.map((h, i) => {
                  const sectorName = h.sectors?.name ?? ''
                  const val   = getPeriodValue(h, period)
                  const isPos = val !== null && val >= 0
                  const Chip = () => (
                    <span className={`font-mono text-[11px] font-bold px-1.5 py-1 rounded-[8px] text-center inline-block shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
                      isPos ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/25' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:text-rose-300 border border-rose-100 dark:border-rose-500/25'
                    }`}>
                      {h.ticker}
                    </span>
                  )
                  const Cell = ({ p }: { p: Period }) => {
                    const v   = getPeriodValue(h, p)
                    const pos = v !== null && v >= 0
                    const bold = p === period
                    return (
                      <span className={`font-mono text-right tabular-nums ${
                        bold ? `text-[13px] font-bold ${pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`
                             : `text-[11px] ${pos ? 'text-emerald-400' : 'text-rose-300'}`
                      }`}>
                        {v !== null ? `${pos ? '+' : ''}${v.toFixed(1)}%` : '—'}
                      </span>
                    )
                  }
                  return (
                    <div key={`${h.ticker}-${h.sector_id}`}
                      onClick={() => setSelectedTicker(h)}
                      className={`grid grid-cols-[28px_64px_minmax(180px,320px)_64px_50px_50px_50px_50px_50px_50px_50px_50px] gap-x-2 items-center px-4 py-2.5 transition-colors cursor-pointer ${
                        isPos ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-500/10' : 'hover:bg-rose-50/40 dark:hover:bg-rose-500/10'
                      }`}>
                      <span className="text-[11px] text-slate-300 dark:text-slate-600 tabular-nums font-mono">{i + 1}</span>
                      <Chip />
                      <div className="min-w-0 px-2">
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{h.company_name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sectorName}</p>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 text-right tabular-nums">
                        {formatPrice(h.price ?? null)}
                      </span>
                      <Cell p="1D" />
                      <Cell p="1W" />
                      <Cell p="1M" />
                      <Cell p="3M" />
                      <Cell p="6M" />
                      <Cell p="YTD" />
                      <Cell p="1Y" />
                      <Cell p="5Y" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile table — selected period always visible; 1W scrolls ── */}
        <div className="sm:hidden overflow-x-auto">
          {/* No minWidth — columns size naturally so selected period fits without scrolling */}
          <div>
            <div className="grid grid-cols-[24px_58px_1fr_60px_64px_52px] text-[9px] font-bold tracking-[0.09em] uppercase text-slate-400 dark:text-slate-500 px-3 py-2.5 bg-slate-50/70 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
              <span>#</span>
              <span>Ticker</span>
              <span>Company · Sector</span>
              <span className="text-right">Price</span>
              <span className="text-right text-slate-700 dark:text-slate-300">{period}</span>
              <span className="text-right">1W</span>
            </div>
            {shown.length === 0 ? (
              <div className="text-center py-16">
                <SearchIcon size={28} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                <p className="text-slate-500 dark:text-slate-400 font-semibold text-[13px]">No stocks match</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-white/5">
                {shown.map((h, i) => {
                  const sectorName = h.sectors?.name ?? ''
                  const val   = getPeriodValue(h, period)
                  const isPos = val !== null && val >= 0
                  const valW  = getPeriodValue(h, '1W')
                  const isPosW = valW !== null && valW >= 0
                  return (
                    <div key={`${h.ticker}-${h.sector_id}-m`}
                      onClick={() => setSelectedTicker(h)}
                      className={`grid grid-cols-[24px_58px_1fr_60px_64px_52px] items-center px-3 py-2.5 transition-colors cursor-pointer ${
                        isPos ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-500/10' : 'hover:bg-rose-50/40 dark:hover:bg-rose-500/10'
                      }`}>
                      <span className="text-[11px] text-slate-300 dark:text-slate-600 tabular-nums font-mono">{i + 1}</span>
                      <span className={`font-mono text-[10px] font-bold px-1 py-1 rounded-[7px] text-center inline-block ${
                        isPos ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/25' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:text-rose-300 border border-rose-100 dark:border-rose-500/25'
                      }`}>
                        {h.ticker}
                      </span>
                      <div className="min-w-0 px-1.5">
                        <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{h.company_name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sectorName}</p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 text-right tabular-nums">
                        {formatPrice(h.price ?? null)}
                      </span>
                      <span className={`font-mono text-[13px] font-bold text-right tabular-nums ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {val !== null ? `${isPos ? '+' : ''}${val.toFixed(1)}%` : '—'}
                      </span>
                      <span className={`font-mono text-[11px] text-right tabular-nums ${isPosW ? 'text-emerald-400' : 'text-rose-300'}`}>
                        {valW !== null ? `${isPosW ? '+' : ''}${valW.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Load more */}
      {filtered.length > limit && (
        <div className="text-center mt-6">
          <button
            onClick={() => setLimit(l => l + 100)}
            className="px-7 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[13px] font-bold rounded-[14px] hover:bg-slate-700 dark:hover:bg-slate-300 transition-all shadow-[0_4px_12px_rgba(15,23,42,0.18)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.24)] active:scale-95"
          >
            Show more ({filtered.length - limit} remaining)
          </button>
        </div>
      )}

      <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 mt-5 tracking-wide">
        EAGLEVIEW V4.4.39 · EQUAL-WEIGHTED BASKETS
      </p>

      {selectedTicker && (
        <TickerModal
          holding={selectedTicker}
          sectorName={selectedTicker.sectors?.name ?? ''}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </div>
  )
}
