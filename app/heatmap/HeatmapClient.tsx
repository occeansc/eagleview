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
    if (intensity > 0.75) return 'bg-emerald-700 text-white'
    if (intensity > 0.50) return 'bg-emerald-500 text-white'
    if (intensity > 0.25) return 'bg-emerald-300 text-emerald-900'
    return 'bg-emerald-100 text-emerald-700'
  } else {
    if (intensity > 0.75) return 'bg-rose-600 text-white'
    if (intensity > 0.50) return 'bg-rose-400 text-white'
    if (intensity > 0.25) return 'bg-rose-200 text-rose-900'
    return 'bg-rose-100 text-rose-700'
  }
}

function pctStr(val: number | null) {
  if (val === null) return '—'
  return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`
}

export default function HeatmapClient({ sectors, benchmarks }: Props) {
  const [sortBy, setSortBy] = useState<Period>('YTD')

  const sorted = useMemo(() => {
    return [...sectors].sort((a, b) => {
      const av = getPeriodValue(a, sortBy) ?? -Infinity
      const bv = getPeriodValue(b, sortBy) ?? -Infinity
      return bv - av
    })
  }, [sectors, sortBy])

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

  const breadthByPeriod = useMemo(() =>
    Object.fromEntries(PERIODS.map(p => [
      p, sectors.filter(s => (getPeriodValue(s, p) ?? 0) >= 0).length,
    ])), [sectors])

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">

      {/* ── Header ──────────────────────────────── */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Rotation Heatmap</h2>
        <p className="text-xs text-slate-400">
          {sectors.length} sectors × 4 periods — intensity = magnitude · tap period to re-sort
        </p>
      </div>

      {/* ── Period breadth summary ────────────────── */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {PERIODS.map(p => {
          const pos = breadthByPeriod[p]
          const neg = sectors.length - pos
          const active = sortBy === p
          return (
            <button
              key={p}
              onClick={() => setSortBy(p)}
              className={`rounded-xl p-3 border text-left transition-all ${
                active ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className={`text-[10px] font-bold mb-1 ${active ? 'text-slate-400' : 'text-slate-400'}`}>
                {PERIOD_SHORT[p]}
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-semibold ${active ? 'text-emerald-400' : 'text-emerald-600'}`}>{pos}↑</span>
                <span className={`text-sm font-semibold ${active ? 'text-rose-400' : 'text-rose-500'}`}>{neg}↓</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Heatmap table — horizontal scroll on mobile ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: '520px' }}>

            {/* Column headers */}
            <div className="grid grid-cols-[180px_repeat(4,1fr)] border-b border-slate-100 bg-slate-50">
              <div className="px-3 py-2.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Sector
              </div>
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setSortBy(p)}
                  className={`py-2.5 text-[11px] font-bold text-center transition-colors ${
                    sortBy === p ? 'text-slate-900 bg-white' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {p}{sortBy === p && ' ▾'}
                </button>
              ))}
            </div>

            {/* Benchmark rows */}
            {benchmarks.map(bm => (
              <div key={bm.ticker} className="grid grid-cols-[180px_repeat(4,1fr)] border-b border-slate-50 bg-slate-50/60">
                <div className="px-3 py-2 flex items-center gap-2">
                  <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono font-semibold shrink-0">
                    IDX
                  </span>
                  <span className="text-xs font-medium text-slate-500 truncate">{bm.name}</span>
                </div>
                {PERIODS.map(p => {
                  const val = getPeriodValue(bm, p)
                  return (
                    <div key={p} className={`heat-cell py-2 text-center ${heatColour(val, absMaxPerPeriod[p])}`}>
                      <span className="font-mono text-xs font-semibold">{pctStr(val)}</span>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Separator */}
            <div className="border-b-2 border-slate-300" />

            {/* Sector rows */}
            {sorted.map((sector, i) => {
              const beats = spx
                ? PERIODS.filter(p => {
                    const sv = getPeriodValue(sector, p)
                    const bv = getPeriodValue(spx, p)
                    return sv !== null && bv !== null && sv > bv
                  }).length
                : 0

              return (
                <div
                  key={sector.id}
                  className="grid grid-cols-[180px_repeat(4,1fr)] border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Sector name — always visible */}
                  <div className="px-3 py-2 flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-slate-300 w-4 text-right shrink-0">{i + 1}</span>
                    <span className="text-xs font-semibold text-slate-700 truncate flex-1">{sector.name}</span>
                    {beats === 4 && <span className="shrink-0 text-[9px] text-amber-500 font-bold">✦</span>}
                    {beats === 3 && <span className="shrink-0 text-[9px] text-slate-400 font-bold">◆</span>}
                    {(sector.streak ?? 0) >= 5 && (
                      <span className="shrink-0 text-[9px] text-orange-400 font-bold">⚡</span>
                    )}
                  </div>

                  {/* Period cells */}
                  {PERIODS.map(p => {
                    const val    = getPeriodValue(sector, p)
                    const active = p === sortBy
                    return (
                      <div
                        key={p}
                        className={`heat-cell py-2 text-center ${heatColour(val, absMaxPerPeriod[p])} ${
                          active ? 'ring-1 ring-inset ring-slate-400/30' : ''
                        }`}
                        title={`${sector.name} · ${p}: ${pctStr(val)}`}
                      >
                        <span className="font-mono text-xs font-semibold">{pctStr(val)}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Legend ───────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
        <span className="font-semibold text-slate-500">Scale:</span>
        {[
          { cls: 'bg-emerald-700', label: 'Strong +' },
          { cls: 'bg-emerald-200', label: 'Mild +'   },
          { cls: 'bg-rose-200',    label: 'Mild −'   },
          { cls: 'bg-rose-600',    label: 'Strong −'  },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3.5 h-3.5 rounded ${cls}`} />
            <span>{label}</span>
          </div>
        ))}
        <span className="w-full sm:w-auto text-slate-300 text-[10px]">
          ✦ beats S&P 500 all 4 periods · ◆ beats on 3 · ⚡ 5+ positive syncs
        </span>
      </div>
    </div>
  )
}
