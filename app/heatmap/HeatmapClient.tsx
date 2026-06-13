'use client'

import { useState, useMemo } from 'react'
import { Sector, Benchmark, Period, PERIODS, getPeriodValue } from '@/lib/types'

interface Props {
  sectors:    Sector[]
  benchmarks: Benchmark[]
}

function heatColour(val: number | null, absMax: number): string {
  if (val === null) return 'bg-slate-50 text-slate-300'
  const t = Math.min(Math.abs(val) / absMax, 1)
  if (val >= 0) {
    if (t > 0.75) return 'bg-emerald-700 text-white'
    if (t > 0.50) return 'bg-emerald-500 text-white'
    if (t > 0.25) return 'bg-emerald-200 text-emerald-900'
    return 'bg-emerald-100/80 text-emerald-700'
  } else {
    if (t > 0.75) return 'bg-rose-600 text-white'
    if (t > 0.50) return 'bg-rose-400 text-white'
    if (t > 0.25) return 'bg-rose-200 text-rose-900'
    return 'bg-rose-100/80 text-rose-700'
  }
}

function fmt(v: number | null) {
  if (v === null) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}

export default function HeatmapClient({ sectors, benchmarks }: Props) {
  const [sortBy, setSortBy] = useState<Period>('YTD')

  const sorted = useMemo(() =>
    [...sectors].sort((a, b) =>
      (getPeriodValue(b, sortBy) ?? -Infinity) - (getPeriodValue(a, sortBy) ?? -Infinity)
    ), [sectors, sortBy])

  const absMax = useMemo(() => {
    const r: Record<Period, number> = { '1W': 0, '1M': 0, '3M': 0, 'YTD': 0 }
    for (const p of PERIODS) {
      const vals = [...sectors, ...benchmarks].map(s => Math.abs(getPeriodValue(s, p) ?? 0))
      r[p] = Math.max(...vals, 1)
    }
    return r
  }, [sectors, benchmarks])

  const spx = benchmarks.find(b => b.ticker === '^GSPC')

  const breadthByPeriod = useMemo(() =>
    Object.fromEntries(PERIODS.map(p => [
      p, sectors.filter(s => (getPeriodValue(s, p) ?? 0) >= 0).length,
    ])), [sectors])

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[22px] font-black tracking-tight text-slate-900 mb-1">
          Rotation Heatmap
        </h2>
        <p className="text-[12px] text-slate-400">
          {sectors.length} sectors × 4 periods — colour intensity = return magnitude
          · tap period header to re-sort
        </p>
      </div>

      {/* Period breadth summary */}
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        {PERIODS.map(p => {
          const pos    = breadthByPeriod[p]
          const neg    = sectors.length - pos
          const active = sortBy === p
          return (
            <button
              key={p}
              onClick={() => setSortBy(p)}
              className={`rounded-[18px] p-3 border text-left transition-all duration-200 ${
                active
                  ? 'bg-slate-900 border-slate-900 shadow-[0_4px_16px_rgba(15,23,42,0.2)]'
                  : 'bg-white border-slate-200/70 hover:border-slate-300 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
              }`}
            >
              <p className={`text-[9px] font-black tracking-[0.18em] uppercase mb-1.5 ${
                active ? 'text-slate-400' : 'text-slate-400'
              }`}>{p}</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-[15px] font-bold ${active ? 'text-emerald-400' : 'text-emerald-600'}`}>{pos}↑</span>
                <span className={`text-[15px] font-bold ${active ? 'text-rose-400' : 'text-rose-500'}`}>{neg}↓</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Heatmap table */}
      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: '520px' }}>

            {/* Column headers */}
            <div className="grid grid-cols-[200px_repeat(4,1fr)] bg-slate-50/80 border-b border-slate-100">
              <div className="px-4 py-3 text-[9px] font-black tracking-[0.18em] text-slate-400 uppercase">
                Sector
              </div>
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setSortBy(p)}
                  className={`py-3 text-[11px] font-black text-center transition-colors ${
                    sortBy === p
                      ? 'text-slate-900 bg-white shadow-[inset_0_-2px_0_rgba(15,23,42,0.9)]'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {p}{sortBy === p && ' ▾'}
                </button>
              ))}
            </div>

            {/* Benchmark rows */}
            {benchmarks.map(bm => (
              <div key={bm.ticker} className="grid grid-cols-[200px_repeat(4,1fr)] border-b border-slate-50 bg-slate-50/40">
                <div className="px-4 py-2.5 flex items-center gap-2">
                  <span className="text-[8px] bg-slate-200/70 text-slate-500 px-1.5 py-0.5 rounded-[5px] font-black tracking-widest uppercase shrink-0">
                    IDX
                  </span>
                  <span className="text-[12px] font-semibold text-slate-500 truncate">{bm.name}</span>
                </div>
                {PERIODS.map(p => {
                  const val = getPeriodValue(bm, p)
                  return (
                    <div key={p} className={`heat-cell py-2.5 text-center ${heatColour(val, absMax[p])}`}>
                      <span className="font-mono text-[12px] font-bold tabular-nums">{fmt(val)}</span>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Heavy separator */}
            <div className="h-0.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />

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
                  className="grid grid-cols-[200px_repeat(4,1fr)] border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="px-4 py-2.5 flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-slate-300 w-4 text-right shrink-0 font-mono tabular-nums">{i + 1}</span>
                    <span className="text-[12px] font-semibold text-slate-700 truncate flex-1">{sector.name}</span>
                    {beats === 4 && <span className="shrink-0 text-[10px] text-amber-500 font-black">✦</span>}
                    {beats === 3 && <span className="shrink-0 text-[10px] text-slate-400 font-bold">◆</span>}
                    {(sector.streak ?? 0) >= 5 && (
                      <span className="shrink-0 text-[10px] text-orange-400 font-bold">⚡</span>
                    )}
                  </div>
                  {PERIODS.map(p => {
                    const val    = getPeriodValue(sector, p)
                    const active = p === sortBy
                    return (
                      <div
                        key={p}
                        className={`heat-cell py-2.5 text-center ${heatColour(val, absMax[p])} ${
                          active ? 'ring-1 ring-inset ring-black/10' : ''
                        }`}
                        title={`${sector.name} · ${p}: ${fmt(val)}`}
                      >
                        <span className="font-mono text-[12px] font-bold tabular-nums">{fmt(val)}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-400 px-1">
        <span className="font-bold text-slate-500">Scale:</span>
        {[
          { cls: 'bg-emerald-700', label: 'Strong +' },
          { cls: 'bg-emerald-200', label: 'Mild +'   },
          { cls: 'bg-rose-200',    label: 'Mild −'   },
          { cls: 'bg-rose-600',    label: 'Strong −'  },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3.5 h-3.5 rounded-[5px] ${cls}`} />
            <span>{label}</span>
          </div>
        ))}
        <span className="text-slate-300 text-[10px] w-full sm:w-auto mt-1 sm:mt-0">
          ✦ beats S&P all 4 periods · ⚡ 5+ positive syncs
        </span>
      </div>
    </div>
  )
}
