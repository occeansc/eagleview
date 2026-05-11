'use client'

import { useState, useMemo } from 'react'
import { Sector, Benchmark, Period, PERIODS, getPeriodValue } from '@/lib/types'

interface Props {
  sectors: Sector[]
  benchmarks: Benchmark[]
}

const PERIOD_SHORT: Record<Period, string> = {
  '1W': '1W', '1M': '1M', '3M': '3M', 'YTD': 'YTD',
}

function heatColour(val: number | null, absMax: number): string {
  if (val === null) return 'bg-slate-100 text-slate-300'
  const intensity = Math.min(Math.abs(val) / absMax, 1)

  if (val >= 0) {
    if (intensity > 0.75) return 'bg-emerald-600 text-white'
    if (intensity > 0.50) return 'bg-emerald-500 text-white'
    if (intensity > 0.25) return 'bg-emerald-300 text-emerald-900'
    return 'bg-emerald-100 text-emerald-700'
  } else {
    if (intensity > 0.75) return 'bg-rose-600 text-white'
    if (intensity > 0.50) return 'bg-rose-500 text-white'
    if (intensity > 0.25) return 'bg-rose-300 text-rose-900'
    return 'bg-rose-100 text-rose-700'
  }
}

export default function HeatmapClient({ sectors, benchmarks }: Props) {
  const [sortBy, setSortBy]   = useState<Period>('YTD')
  const [hovered, setHovered] = useState<string | null>(null) // "sectorId-period"

  // Sort sectors by selected period
  const sorted = useMemo(() => {
    return [...sectors].sort((a, b) => {
      const av = getPeriodValue(a, sortBy) ?? -Infinity
      const bv = getPeriodValue(b, sortBy) ?? -Infinity
      return bv - av
    })
  }, [sectors, sortBy])

  // Global abs-max for normalising colour intensity per period
  const absMaxPerPeriod = useMemo(() => {
    const result: Record<Period, number> = { '1W': 0, '1M': 0, '3M': 0, 'YTD': 0 }
    for (const p of PERIODS) {
      const vals = [...sectors, ...benchmarks]
        .map(s => Math.abs(getPeriodValue(s as Sector, p) ?? 0))
      result[p] = Math.max(...vals, 1)
    }
    return result
  }, [sectors, benchmarks])

  const spx = benchmarks.find(b => b.ticker === '^GSPC')

  // Stats row: how many sectors positive per period
  const breadthByPeriod = useMemo(() =>
    Object.fromEntries(PERIODS.map(p => [
      p,
      sectors.filter(s => (getPeriodValue(s, p) ?? 0) >= 0).length,
    ])), [sectors])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* ── Header ────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Rotation Heatmap</h2>
        <p className="text-sm text-slate-400">
          All {sectors.length} sectors × 4 periods — colour intensity = return magnitude.
          Tap a column header to re-sort.
        </p>
      </div>

      {/* ── Breadth summary bar ──────────────────── */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {PERIODS.map(p => {
          const pos = breadthByPeriod[p]
          const neg = sectors.length - pos
          return (
            <button
              key={p}
              onClick={() => setSortBy(p)}
              className={`rounded-xl p-3 border text-left transition-all ${
                sortBy === p
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className={`text-xs font-bold mb-1 ${sortBy === p ? 'text-slate-300' : 'text-slate-400'}`}>
                {PERIOD_SHORT[p]}
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-semibold ${sortBy === p ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {pos}↑
                </span>
                <span className={`text-sm font-semibold ${sortBy === p ? 'text-rose-400' : 'text-rose-500'}`}>
                  {neg}↓
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Heatmap grid ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_repeat(4,80px)] border-b border-slate-100">
          <div className="px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            Sector
          </div>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setSortBy(p)}
              className={`py-3 text-[11px] font-bold text-center transition-colors ${
                sortBy === p
                  ? 'text-slate-900 bg-slate-50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {p}
              {sortBy === p && <span className="ml-1 text-[9px]">▼</span>}
            </button>
          ))}
        </div>

        {/* Benchmark rows */}
        {[...benchmarks].map(bm => (
          <div
            key={bm.ticker}
            className="grid grid-cols-[1fr_repeat(4,80px)] border-b border-slate-50 bg-slate-50/50"
          >
            <div className="px-4 py-2.5 flex items-center gap-2">
              <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono font-semibold">
                IDX
              </span>
              <span className="text-xs font-medium text-slate-500 truncate">{bm.name}</span>
            </div>
            {PERIODS.map(p => {
              const val = getPeriodValue(bm as unknown as Sector, p)
              const key = `bm-${bm.ticker}-${p}`
              return (
                <div
                  key={p}
                  className={`heat-cell py-2.5 text-center cursor-default ${heatColour(val, absMaxPerPeriod[p])}`}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="font-mono text-xs font-semibold">
                    {val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(1)}%` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        ))}

        {/* Divider between benchmarks and sectors */}
        <div className="border-b-2 border-slate-200" />

        {/* Sector rows */}
        {sorted.map((sector, i) => {
          const ytdVal = getPeriodValue(sector, 'YTD')
          const beats = spx
            ? PERIODS.filter(p => {
                const sv = getPeriodValue(sector, p)
                const bv = getPeriodValue(spx as unknown as Sector, p)
                return sv !== null && bv !== null && sv > bv
              }).length
            : 0

          return (
            <div
              key={sector.id}
              className={`grid grid-cols-[1fr_repeat(4,80px)] border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${
                i % 2 === 0 ? '' : 'bg-white/50'
              }`}
            >
              {/* Sector name + rank */}
              <div className="px-4 py-2.5 flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-slate-300 w-5 shrink-0 text-right">{i + 1}</span>
                <span className="text-xs font-semibold text-slate-700 truncate flex-1">{sector.name}</span>
                {/* Beats SPX badge */}
                {beats === 4 && <span className="shrink-0 text-[10px] text-amber-500 font-bold">✦</span>}
                {beats === 3 && <span className="shrink-0 text-[10px] text-slate-400 font-bold">◆</span>}
                {sector.streak !== null && sector.streak >= 3 && (
                  <span className="shrink-0 text-[10px] text-orange-400">🔥</span>
                )}
              </div>

              {/* Period cells */}
              {PERIODS.map(p => {
                const val = getPeriodValue(sector, p)
                const key = `${sector.id}-${p}`
                const isSort = p === sortBy
                return (
                  <div
                    key={p}
                    className={`heat-cell py-2.5 text-center ${heatColour(val, absMaxPerPeriod[p])} ${
                      isSort ? 'ring-1 ring-inset ring-slate-300' : ''
                    }`}
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered(null)}
                    title={`${sector.name} · ${p}: ${val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '—'}`}
                  >
                    <span className="font-mono text-xs font-semibold">
                      {val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Legend ───────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="font-semibold text-slate-500">Colour scale:</span>
        {[
          { cls: 'bg-emerald-600', label: 'Strong +' },
          { cls: 'bg-emerald-300', label: 'Mild +' },
          { cls: 'bg-rose-300',    label: 'Mild −' },
          { cls: 'bg-rose-600',    label: 'Strong −' },
          { cls: 'bg-slate-100',   label: 'No data' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded ${cls}`} />
            <span>{label}</span>
          </div>
        ))}
        <span className="ml-4">✦ = beats S&P on all 4 periods &nbsp;|&nbsp; 🔥 = 3+ positive syncs</span>
      </div>
    </div>
  )
}
