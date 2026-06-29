'use client'

import { useState, useMemo } from 'react'
import {
  SectorHolding, Sector, Period,
  PERIOD_LABELS, getPeriodValue, formatPrice,
} from '@/lib/types'
import { SearchIcon, TrendingUpIcon, TrendingDownIcon } from '@/components/Icons'
import TickerModal from '@/components/TickerModal'

// Screener shows all 5 periods including 1D — same pattern as Dashboard.
const SCREENER_PERIODS: Period[] = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y']

interface Props {
  holdings: (SectorHolding & { sectors: { name: string } })[]
  sectors:  Pick<Sector, 'id' | 'name'>[]
}

export default function ScreenerClient({ holdings, sectors }: Props) {
  const [period,    setPeriod]    = useState<Period>('YTD')
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
        <h2 className="text-[22px] font-black tracking-tight text-slate-900 mb-1">
          Stock Screener
        </h2>
        <p className="text-[12px] text-slate-400">
          {filtered.length.toLocaleString()} stocks ·{' '}
          <span className="text-emerald-600 font-bold">{posCount} positive</span>
          {' '}
          <span className="text-rose-500 font-bold">{filtered.length - posCount} negative</span>
          {' '}· {PERIOD_LABELS[period]}
        </p>
      </div>

      {/* Filters panel */}
      <div
        className="rounded-[22px] p-4 mb-5 space-y-3"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(226,232,240,0.55)',
          boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 1px 3px rgba(0,0,0,0.035), 0 2px 8px rgba(0,0,0,0.025)',
        }}
      >
        {/* Search */}
        <div className="relative">
          <SearchIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticker or company…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-slate-50/80 border border-slate-200/60 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300 transition-all placeholder:text-slate-400"
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
                        ? 'period-pill-active !bg-emerald-50 !text-emerald-700 !border-emerald-200/80 !shadow-none'
                        : d === 'negative'
                        ? 'period-pill-active !bg-rose-50 !text-rose-700 !border-rose-200/80 !shadow-none'
                        : 'period-pill-active'
                      : ''
                  }`}
                >
                  {d === 'positive' && <TrendingUpIcon size={10} className={direction === 'positive' ? 'text-emerald-600' : ''} />}
                  {d === 'negative' && <TrendingDownIcon size={10} className={direction === 'negative' ? 'text-rose-600' : ''} />}
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
          className="w-full text-[13px] bg-slate-50/80 border border-slate-200/60 rounded-[12px] px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all"
        >
          <option value="all">All sectors</option>
          {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Results table */}
      <div
        className="rounded-[22px] overflow-hidden"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(226,232,240,0.55)',
          boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* ── Desktop table (sm+) — full overflow-x-auto with all columns ── */}
        <div className="hidden sm:block overflow-x-auto">
          <div style={{ minWidth: '560px' }}>
            <div className="grid grid-cols-[32px_70px_1fr_60px_52px_52px_52px_52px_52px_52px_52px] text-[9px] font-black tracking-[0.18em] uppercase text-slate-400 px-4 py-3 bg-slate-50/70 border-b border-slate-100">
              <span>#</span>
              <span>Ticker</span>
              <span>Company</span>
              <span className="text-right">Price</span>
              <span className={`text-right ${period === '1D'  ? 'text-slate-700' : ''}`}>1D</span>
              <span className={`text-right ${period === '1W'  ? 'text-slate-700' : ''}`}>1W</span>
              <span className={`text-right ${period === '1M'  ? 'text-slate-700' : ''}`}>1M</span>
              <span className={`text-right ${period === '3M'  ? 'text-slate-700' : ''}`}>3M</span>
              <span className={`text-right ${period === '6M'  ? 'text-slate-700' : ''}`}>6M</span>
              <span className={`text-right ${period === 'YTD' ? 'text-slate-700' : ''}`}>YTD</span>
              <span className={`text-right ${period === '1Y'  ? 'text-slate-700' : ''}`}>1Y</span>
            </div>
            {shown.length === 0 ? (
              <div className="text-center py-16">
                <SearchIcon size={28} className="mx-auto mb-3 text-slate-200" />
                <p className="text-slate-500 font-semibold text-[13px]">No stocks match</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {shown.map((h, i) => {
                  const sectorName = h.sectors?.name ?? ''
                  const val   = getPeriodValue(h, period)
                  const isPos = val !== null && val >= 0
                  const Chip = () => (
                    <span className={`font-mono text-[11px] font-black px-1.5 py-1 rounded-[8px] text-center inline-block shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
                      isPos ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
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
                        bold ? `text-[13px] font-extrabold ${pos ? 'text-emerald-600' : 'text-rose-600'}`
                             : `text-[11px] ${pos ? 'text-emerald-400' : 'text-rose-300'}`
                      }`}>
                        {v !== null ? `${pos ? '+' : ''}${v.toFixed(1)}%` : '—'}
                      </span>
                    )
                  }
                  return (
                    <div key={`${h.ticker}-${h.sector_id}`}
                      onClick={() => setSelectedTicker(h)}
                      className={`grid grid-cols-[32px_70px_1fr_60px_52px_52px_52px_52px_52px_52px_52px] items-center px-4 py-2.5 transition-colors cursor-pointer ${
                        isPos ? 'hover:bg-emerald-50/40' : 'hover:bg-rose-50/40'
                      }`}>
                      <span className="text-[11px] text-slate-300 tabular-nums font-mono">{i + 1}</span>
                      <Chip />
                      <div className="min-w-0 px-2">
                        <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{h.company_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{sectorName}</p>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 text-right tabular-nums">
                        {formatPrice(h.price ?? null)}
                      </span>
                      <Cell p="1D" />
                      <Cell p="1W" />
                      <Cell p="1M" />
                      <Cell p="3M" />
                      <Cell p="6M" />
                      <Cell p="YTD" />
                      <Cell p="1Y" />
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
            <div className="grid grid-cols-[24px_52px_1fr_60px_64px_52px] text-[9px] font-black tracking-[0.18em] uppercase text-slate-400 px-3 py-2.5 bg-slate-50/70 border-b border-slate-100">
              <span>#</span>
              <span>Ticker</span>
              <span>Company · Sector</span>
              <span className="text-right">Price</span>
              <span className="text-right text-slate-700">{period}</span>
              <span className="text-right">1W</span>
            </div>
            {shown.length === 0 ? (
              <div className="text-center py-16">
                <SearchIcon size={28} className="mx-auto mb-3 text-slate-200" />
                <p className="text-slate-500 font-semibold text-[13px]">No stocks match</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {shown.map((h, i) => {
                  const sectorName = h.sectors?.name ?? ''
                  const val   = getPeriodValue(h, period)
                  const isPos = val !== null && val >= 0
                  const valW  = getPeriodValue(h, '1W')
                  const isPosW = valW !== null && valW >= 0
                  return (
                    <div key={`${h.ticker}-${h.sector_id}-m`}
                      onClick={() => setSelectedTicker(h)}
                      className={`grid grid-cols-[24px_52px_1fr_60px_64px_52px] items-center px-3 py-2.5 transition-colors cursor-pointer ${
                        isPos ? 'hover:bg-emerald-50/40' : 'hover:bg-rose-50/40'
                      }`}>
                      <span className="text-[11px] text-slate-300 tabular-nums font-mono">{i + 1}</span>
                      <span className={`font-mono text-[10px] font-black px-1 py-1 rounded-[7px] text-center inline-block ${
                        isPos ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {h.ticker}
                      </span>
                      <div className="min-w-0 px-1.5">
                        <p className="text-[12px] font-semibold text-slate-800 truncate leading-tight">{h.company_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{sectorName}</p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 text-right tabular-nums">
                        {formatPrice(h.price ?? null)}
                      </span>
                      <span className={`font-mono text-[13px] font-extrabold text-right tabular-nums ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
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
            className="px-7 py-3 bg-slate-900 text-white text-[13px] font-bold rounded-[14px] hover:bg-slate-700 transition-all shadow-[0_4px_12px_rgba(15,23,42,0.18)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.24)] active:scale-95"
          >
            Show more ({filtered.length - limit} remaining)
          </button>
        </div>
      )}

      <p className="text-center text-[10px] text-slate-300 mt-5 tracking-widest">
        EAGLEVIEW V4.4.5 · EQUAL-WEIGHTED BASKETS
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
