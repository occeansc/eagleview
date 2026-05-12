'use client'

import { useState, useMemo } from 'react'
import { SectorHolding, Sector, Period, PERIODS, PERIOD_LABELS, getPeriodValue } from '@/lib/types'
import { SearchIcon, TrendingUpIcon, TrendingDownIcon } from '@/components/Icons'

interface Props {
  holdings: (SectorHolding & { sectors: { name: string } })[]
  sectors: Pick<Sector, 'id' | 'name'>[]
}

export default function ScreenerClient({ holdings, sectors }: Props) {
  const [period, setPeriod]       = useState<Period>('YTD')
  const [query, setQuery]         = useState('')
  const [sectorFilter, setSector] = useState<number | 'all'>('all')
  const [direction, setDirection] = useState<'all' | 'positive' | 'negative'>('all')
  const [limit, setLimit]         = useState(50)

  const filtered = useMemo(() => {
    // Dedupe by ticker — keep highest return for selected period
    const byTicker: Record<string, typeof holdings[0]> = {}
    for (const h of holdings) {
      const val      = getPeriodValue(h, period) ?? -Infinity
      const existing = byTicker[h.ticker]
      if (!existing || (getPeriodValue(existing, period) ?? -Infinity) < val) {
        byTicker[h.ticker] = h
      }
    }
    let rows = Object.values(byTicker)

    // Filters
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      rows = rows.filter(h =>
        h.ticker.toLowerCase().includes(q) ||
        h.company_name.toLowerCase().includes(q)
      )
    }
    if (sectorFilter !== 'all') {
      // When filtering by sector, use all entries (no dedupe)
      rows = holdings.filter(h => h.sector_id === sectorFilter)
    }
    if (direction === 'positive') rows = rows.filter(h => (getPeriodValue(h, period) ?? 0) >= 0)
    if (direction === 'negative') rows = rows.filter(h => (getPeriodValue(h, period) ?? 1) < 0)

    rows.sort((a, b) => {
      const av = getPeriodValue(a, period) ?? -Infinity
      const bv = getPeriodValue(b, period) ?? -Infinity
      return bv - av
    })
    return rows
  }, [holdings, period, query, sectorFilter, direction])

  const shown         = filtered.slice(0, limit)
  const positiveCount = filtered.filter(h => (getPeriodValue(h, period) ?? 0) >= 0).length
  const negativeCount = filtered.length - positiveCount

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6">

      {/* ── Header ──────────────────────────── */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Stock Screener</h2>
        <p className="text-sm text-slate-400">
          {filtered.length.toLocaleString()} stocks · {' '}
          <span className="text-emerald-600 font-medium">{positiveCount} positive</span>
          {' '}<span className="text-rose-500 font-medium">{negativeCount} negative</span>
          {' '}· {PERIOD_LABELS[period]}
        </p>
      </div>

      {/* ── Filters ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 space-y-3">

        {/* Search */}
        <div className="relative">
          <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticker or company…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 bg-slate-50"
          />
        </div>

        {/* Period + direction row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Period toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === p
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Direction */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['all', 'positive', 'negative'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  direction === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {d === 'positive' && <TrendingUpIcon size={11} />}
                {d === 'negative' && <TrendingDownIcon size={11} />}
                {d === 'all' ? 'All' : d === 'positive' ? 'Positive' : 'Negative'}
              </button>
            ))}
          </div>
        </div>

        {/* Sector filter */}
        <select
          value={sectorFilter}
          onChange={e => setSector(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="all">All sectors</option>
          {sectors.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* ── Table ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: '420px' }}>

            {/* Desktop header */}
            <div className="hidden sm:grid sm:grid-cols-[40px_80px_1fr_80px_80px_80px_80px] text-[10px] font-bold tracking-widest text-slate-400 uppercase px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <span>#</span>
              <span>Ticker</span>
              <span>Company</span>
              <span className="text-right">1W</span>
              <span className="text-right">1M</span>
              <span className="text-right">3M</span>
              <span className={`text-right ${period === 'YTD' ? 'text-slate-700 font-black' : ''}`}>YTD</span>
            </div>

            {/* Mobile header */}
            <div className="sm:hidden grid grid-cols-[32px_60px_1fr_72px_72px] text-[10px] font-bold tracking-widest text-slate-400 uppercase px-3 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <span>#</span>
              <span>Ticker</span>
              <span>Company · Sector</span>
              <span className="text-right text-slate-600">{period}</span>
              <span className="text-right text-slate-400">1W</span>
            </div>

            {shown.length === 0 ? (
              <div className="text-center py-16">
                <SearchIcon size={28} className="mx-auto mb-3 text-slate-200" />
                <p className="font-medium text-slate-500 text-sm">No stocks match</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {shown.map((h, i) => {
                  const sectorName = h.sectors?.name ?? ''
                  const val        = getPeriodValue(h, period)
                  const isPos      = val !== null && val >= 0

                  const TickerChip = () => (
                    <span className={`font-mono text-xs font-bold px-1.5 py-1 rounded text-center inline-block ${
                      isPos ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {h.ticker}
                    </span>
                  )

                  const ReturnCell = ({ p }: { p: Period }) => {
                    const v      = getPeriodValue(h, p)
                    const pos    = v !== null && v >= 0
                    const active = p === period
                    return (
                      <span className={`font-mono text-xs text-right tabular-nums ${
                        active ? (pos ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold')
                               : (pos ? 'text-emerald-400' : 'text-rose-300')
                      }`}>
                        {v !== null ? `${pos ? '+' : ''}${v.toFixed(1)}%` : '—'}
                      </span>
                    )
                  }

                  return (
                    <div key={`${h.ticker}-${h.sector_id}`}>
                      {/* Desktop row */}
                      <div className="hidden sm:grid sm:grid-cols-[40px_80px_1fr_80px_80px_80px_80px] items-center px-4 py-2.5 hover:bg-slate-50 transition-colors">
                        <span className="text-xs text-slate-300 tabular-nums">{i + 1}</span>
                        <TickerChip />
                        <div className="min-w-0 px-2">
                          <p className="text-sm font-medium text-slate-800 truncate">{h.company_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{sectorName}</p>
                        </div>
                        <ReturnCell p="1W" />
                        <ReturnCell p="1M" />
                        <ReturnCell p="3M" />
                        <ReturnCell p="YTD" />
                      </div>

                      {/* Mobile row */}
                      <div className="sm:hidden grid grid-cols-[32px_60px_1fr_72px_72px] items-center px-3 py-2.5 hover:bg-slate-50 transition-colors">
                        <span className="text-xs text-slate-300 tabular-nums">{i + 1}</span>
                        <TickerChip />
                        <div className="min-w-0 px-2">
                          <p className="text-xs font-semibold text-slate-800 truncate">{h.company_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{sectorName}</p>
                        </div>
                        {/* Active period — bold and prominent on mobile */}
                        <span className={`font-mono text-sm font-bold text-right tabular-nums ${
                          isPos ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {val !== null ? `${isPos ? '+' : ''}${val.toFixed(1)}%` : '—'}
                        </span>
                        {/* Secondary: 1W return */}
                        <ReturnCell p="1W" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Show more */}
      {filtered.length > limit && (
        <div className="text-center mt-5">
          <button
            onClick={() => setLimit(l => l + 100)}
            className="px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Show more ({filtered.length - limit} remaining)
          </button>
        </div>
      )}

      <p className="text-center text-[10px] text-slate-300 mt-5">
        Eagleview v3.1 · Equal-weighted baskets · Yahoo Finance
      </p>
    </div>
  )
}
