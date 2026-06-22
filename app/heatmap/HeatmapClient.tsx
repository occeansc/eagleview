'use client'

import { useState, useMemo } from 'react'
import type { Sector, Benchmark, Period } from '@/lib/types'
import { getPeriodValue, getBreadth, computeScorecard } from '@/lib/types'
import HoldingsModal from '@/components/HoldingsModal'

// Heatmap shows all 5 periods including 1D.
// computeScorecard always evaluates on 1W/1M/3M/YTD — no change there.
const HEATMAP_PERIODS: Period[] = ['1D', '1W', '1M', '3M', 'YTD']

interface Props {
  sectors:    Sector[]
  benchmarks: Benchmark[]
}

/* ── Heat palette ───────────────────────────────────────── */
type Pal = { bg: string; accent: string; label: string; muted: string }

function pal(pct: number | null): Pal {
  if (pct === null)  return { bg: '#1e293b', accent: '#94a3b8', label: '#e2e8f0', muted: '#475569' }
  if (pct >= 15)     return { bg: '#052e16', accent: '#4ade80', label: '#f0fdf4', muted: '#86efac' }
  if (pct >=  8)     return { bg: '#14532d', accent: '#86efac', label: '#dcfce7', muted: '#4ade80' }
  if (pct >=  3)     return { bg: '#166534', accent: '#bbf7d0', label: '#ffffff', muted: '#86efac' }
  if (pct >=  0.5)   return { bg: '#15803d', accent: '#ffffff', label: '#f0fdf4', muted: '#d1fae5' }
  if (pct >  -0.5)   return { bg: '#334155', accent: '#cbd5e1', label: '#f1f5f9', muted: '#64748b' }
  if (pct >= -3)     return { bg: '#dc2626', accent: '#ffffff', label: '#fef2f2', muted: '#fecaca' }
  if (pct >= -8)     return { bg: '#b91c1c', accent: '#fecaca', label: '#fff1f2', muted: '#fca5a5' }
  if (pct >= -15)    return { bg: '#991b1b', accent: '#fca5a5', label: '#ffe4e6', muted: '#f87171' }
  return               { bg: '#450a0a', accent: '#f87171',  label: '#fecaca', muted: '#ef4444' }
}

/* ── Tile tiers ─────────────────────────────────────────── */
//  6-col desktop layout (lg):
//    rank 1-2  → col-span-3 row-span-2  (two large squares fill row 1-2)
//    rank 3-5  → col-span-2 row-span-2  (three tiles fill row 3-4)
//    rank 6-11 → col-span-1 row-span-2  (six tall tiles fill row 5-6)
//    rank 12+  → col-span-1 row-span-1  (standard tiles, rows 7-8)
const TILE_CLS: Record<string, string> = {
  xl: 'col-span-2 row-span-2 lg:col-span-3 lg:row-span-2',
  lg: 'col-span-1 row-span-1 md:col-span-2 md:row-span-2',
  md: 'col-span-1 md:row-span-2',
  sm: 'col-span-1',
}

function tierOf(rank: number): 'xl' | 'lg' | 'md' | 'sm' {
  if (rank <=  2) return 'xl'
  if (rank <=  5) return 'lg'
  if (rank <= 11) return 'md'
  return 'sm'
}

/* ── Helpers ────────────────────────────────────────────── */
function periodRank(s: Sector, p: Period): number {
  if (p === '1D') return s.day_rank
  if (p === '1W') return s.week_rank
  if (p === '1M') return s.month_rank
  if (p === '3M') return s.quarter_rank
  return s.ytd_rank
}

function fmt(v: number | null): string {
  if (v === null) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}

/* ── Component ──────────────────────────────────────────── */
export default function HeatmapClient({ sectors, benchmarks }: Props) {
  const [period, setPeriod] = useState<Period>('YTD')
  const [active, setActive] = useState<Sector | null>(null)

  const spx    = benchmarks.find(b => b.ticker === '^GSPC')
  const sorted = useMemo(
    () => [...sectors].sort((a, b) => periodRank(a, period) - periodRank(b, period)),
    [sectors, period],
  )

  const up  = sorted.filter(s => (getPeriodValue(s, period) ?? 0) >= 0).length
  const avg = sorted.reduce((sum, s) => sum + (getPeriodValue(s, period) ?? 0), 0) / sorted.length

  return (
    <div className="min-h-dvh bg-[#0c1017]">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-[#0c1017]/95 backdrop-blur-sm border-b border-white/[0.06] px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">

          {/* Period pills */}
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-black tracking-widest text-slate-600 uppercase hidden sm:block">
              Period
            </span>
            <div className="flex gap-1 bg-white/[0.06] rounded-full p-1 border border-white/[0.08]">
              {HEATMAP_PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    period === p
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-4 text-[11px]">
            <span>
              <span className="font-black text-emerald-400">{up}↑</span>
              {' '}
              <span className="font-black text-red-400">{sorted.length - up}↓</span>
            </span>
            <span className={`font-black ${avg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              Avg {fmt(avg)}
            </span>
            <span className="text-slate-600 text-[10px]">{sorted.length} sectors</span>
          </div>
        </div>
      </div>

      {/* ── Treemap grid ── */}
      <div className="p-2 sm:p-3 max-w-7xl mx-auto">
        <div
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-1.5"
          style={{ gridAutoFlow: 'dense', gridAutoRows: '90px' }}
        >
          {sorted.map(sector => {
            const rank = periodRank(sector, period)
            const pct  = getPeriodValue(sector, period)
            const bw   = getBreadth(sector, period)
            const sc   = computeScorecard(sector, spx)
            const p    = pal(pct)
            const t    = tierOf(rank)
            const isXL = t === 'xl'
            const isLG = t === 'lg'

            return (
              <div
                key={sector.id}
                onClick={() => setActive(sector)}
                className={`relative rounded-xl cursor-pointer overflow-hidden select-none
                  transition-all duration-150 hover:brightness-110 hover:scale-[1.015] hover:z-10
                  ${TILE_CLS[t]}`}
                style={{ backgroundColor: p.bg }}
              >
                {/* Top shimmer */}
                <div
                  className="absolute inset-x-0 top-0 h-px pointer-events-none"
                  style={{ background: `linear-gradient(90deg,transparent,${p.accent}44,transparent)` }}
                />

                <div className="absolute inset-0 p-2.5 flex flex-col justify-between">

                  {/* Top row: rank chip + scorecard star */}
                  <div className="flex items-start justify-between gap-1">
                    <span
                      className="text-[9px] font-black px-1.5 py-[3px] rounded-md leading-none"
                      style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: p.muted }}
                    >
                      #{rank}
                    </span>
                    {sc === 'gold'   && (
                      <span className="text-amber-400 text-[13px] leading-none drop-shadow-sm" title="Gold — beats S&P all 4 periods">★</span>
                    )}
                    {sc === 'silver' && (
                      <span className="text-slate-400 text-[10px] leading-none opacity-60" title="Silver — beats S&P 3 of 4 periods">★</span>
                    )}
                  </div>

                  {/* Return % hero + sector name */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div
                      className={`font-black leading-none tabular-nums ${
                        isXL ? 'text-3xl lg:text-4xl' :
                        isLG ? 'text-xl  md:text-2xl' :
                               'text-lg'
                      }`}
                      style={{ color: p.accent }}
                    >
                      {fmt(pct)}
                    </div>
                    <div
                      className={`font-semibold leading-tight truncate mt-0.5 ${
                        isXL ? 'text-[11px] lg:text-xs' : 'text-[9px]'
                      }`}
                      style={{ color: p.label, opacity: 0.7 }}
                    >
                      {sector.name}
                    </div>
                  </div>

                  {/* Breadth bar — xl tiles always, lg/md tiles on md+ only */}
                  {bw !== null && (
                    <div className={isXL ? '' : 'hidden md:block'}>
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className="text-[7px] font-black uppercase tracking-widest"
                          style={{ color: p.muted, opacity: 0.55 }}
                        >
                          Breadth
                        </span>
                        <span
                          className="text-[9px] font-black"
                          style={{ color: p.muted }}
                        >
                          {bw.toFixed(0)}%
                        </span>
                      </div>
                      <div
                        className="h-[3px] rounded-full"
                        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${bw}%`, backgroundColor: p.accent, opacity: 0.55 }}
                        />
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )
          })}
        </div>

        {/* ── Colour legend ── */}
        <div className="mt-5 flex items-center justify-center gap-3 text-[10px] text-slate-600">
          <span>−15%+</span>
          <div className="flex rounded-md overflow-hidden gap-px">
            {['#450a0a','#991b1b','#b91c1c','#dc2626',
              '#334155',
              '#15803d','#166534','#14532d','#052e16'].map(c => (
              <div key={c} style={{ backgroundColor: c }} className="w-6 h-3" />
            ))}
          </div>
          <span>+15%+</span>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-2">
          Tap any tile for full holdings breakdown
        </p>
      </div>

      {/* ── Holdings modal ── */}
      {active && (
        <HoldingsModal
          sector={active}
          period={period}
          benchmarks={benchmarks}
          snapshots={[]}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}
