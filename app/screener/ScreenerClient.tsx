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
    let rows = [...holdings]

    // Remove dupes: if same ticker appears in multiple sectors, keep highest return
    const byTicker: Record<string, typeof rows[0]> = {}
    for (const h of rows) {
      const val = getPeriodValue(h, period) ?? -Infinity
      const existing = byTicker[h.ticker]
      if (!existing || (getPeriodValue(existing, period) ?? -Infinity) < val) {
        byTicker[h.ticker] = h
      }
    }
    rows = Object.values(byTicker)

    // Filters
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      rows = rows.filter(h =>
        h.ticker.toLowerCase().includes(q) ||
        h.company_name.toLowerCase().includes(q)
      )
    }
    if (sectorFilter !== 'all') {
      rows = rows.filter(h => h.sector_id === sectorFilter)
    }
    if (direction === 'positive') rows = rows.filter(h => (getPeriodValue(h, period) ?? 0) >= 0)
    if (direction === 'negative') rows = rows.filter(h => (getPeriodValue(h, period) ?? 1) < 0)

    // Sort by selected period
    rows.sort((a, b) => {
      const av = getPeriodValue(a, period) ?? -Infinity
      const bv = getPeriodValue(b, period) ?? -Infinity
      return bv - av
    })

    return rows
  }, [holdings, period, query, sectorFilter, direction])

  const shown = filtered.slice(0, limit)
  const positiveCount = filtered.filter(h => (getPeriodValue(h, period) ?? 0) >= 0).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* ── Header ──────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Stock Screener</h2>
        <p className="text-sm text-slate-400">
          {filtered.length.toLocaleString()} stocks across {sectors.length} sectors ·{' '}
          <span className="text-emerald-600 font-medium">{positiveCount} positive</span>
          {' '}<span className="text-rose-500 font-medium">{filtered.length - positiveCount} negative</span>
          {' '}for {PERIOD_LABELS[period]}
        </p>
      </div>

      {/* ── Filters ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 space-y-3">

        {/* Search + period */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticker or company…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
            />
          </div>

          {/* Period */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Sector filter + direction */}
        <div className="flex flex-wrap gap-2">
          <select
            value={sectorFilter}
            onChange={e => setSector(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 max-w-[200px]"
          >
            <option value="all">All sectors</option>
            {sectors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(['all', 'positive', 'negative'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  direction === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {d === 'positive' && <TrendingUpIcon size={11} />}
                {d === 'negative' && <TrendingDownIcon size={11} />}
                {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

        {/* Column headers */}
        <div className="grid grid-cols-[40px_90px_1fr_80px_80px_80px_80px] text-[10px] font-bold tracking-widest text-slate-400 uppercase px-4 py-3 border-b border-slate-100 bg-slate-50/80">
          <span>#</span>
          <span>Ticker</span>
          <span>Company</span>
          <span className="text-right">1W</span>
          <span className="text-right">1M</span>
          <span className="text-right">3M</span>
          <span className={`text-right ${period === 'YTD' ? 'text-slate-700' : ''}`}>YTD</span>
        </div>

        {shown.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <SearchIcon size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-500">No stocks match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {shown.map((h, i) => {
              const val    = getPeriodValue(h, period)
              const isPos  = val !== null && val >= 0
              const sector = h.sectors?.name ?? ''

              const Cell = ({ p }: { p: Period }) => {
                const v   = getPeriodValue(h, p)
                const pos = v !== null && v >= 0
                const active = p === period
                return (
                  <span className={`font-mono text-xs text-right ${
                    active ? (pos ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold')
                           : (pos ? 'text-emerald-500' : 'text-rose-400')
                  } ${active ? 'font-bold' : ''}`}>
                    {v !== null ? `${pos ? '+' : ''}${v.toFixed(1)}%` : '—'}
                  </span>
                )
              }

              return (
                <div
                  key={`${h.ticker}-${h.sector_id}`}
                  className="grid grid-cols-[40px_90px_1fr_80px_80px_80px_80px] items-center px-4 py-2.5 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs text-slate-300">{i + 1}</span>

                  <span className={`font-mono text-xs font-bold px-1.5 py-1 rounded text-center ${
                    isPos ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {h.ticker}
                  </span>

                  <div className="min-w-0 px-2">
                    <p className="text-sm font-medium text-slate-800 truncate">{h.company_name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{sector}</p>
                  </div>

                  <Cell p="1W" />
                  <Cell p="1M" />
                  <Cell p="3M" />
                  <Cell p="YTD" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Load more ───────────────────────── */}
      {filtered.length > limit && (
        <div className="text-center mt-5">
          <button
            onClick={() => setLimit(l => l + 50)}
            className="px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Show more ({filtered.length - limit} remaining)
          </button>
        </div>
      )}

      <p className="text-center text-xs text-slate-300 mt-4">
        Returns from equal-weighted Eagleview baskets · Eagleview v3.1
      </p>
    </div>
  )
}
