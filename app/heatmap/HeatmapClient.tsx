'use client'

import { useState, useMemo } from 'react'
import type { Sector, Benchmark, Period } from '@/lib/types'
import { getPeriodValue, getBreadth, computeScorecard } from '@/lib/types'
import HoldingsModal from '@/components/HoldingsModal'

const HEATMAP_PERIODS: Period[] = ['1D', '1W', '1M', '3M', 'YTD']

interface Props {
  sectors:    Sector[]
  benchmarks: Benchmark[]
}

/* ── UI Heat Palette matched exactly for Pure White Spaces ────────── */
type Pal = { bg: string; accent: string; label: string; muted: string, tag: string }

function pal(pct: number | null): Pal {
  // Returns highly readable blocks that sit beautifully alongside normal UI frames natively.
  
  // Grey Neutral (Near 0 or No Data)
  if (pct === null)  return { bg: '#f1f5f9', accent: '#64748b', label: '#94a3b8', muted: '#cbd5e1', tag: 'rgba(0,0,0,0.06)' } 
  if (pct > -0.5 && pct < 0.5) return { bg: '#f1f5f9', accent: '#334155', label: '#64748b', muted: '#94a3b8', tag: 'rgba(0,0,0,0.06)' }
  
  // Robust Pure Greens
  if (pct >= 15) return { bg: '#14532d', accent: '#ffffff', label: '#86efac', muted: '#4ade80', tag: 'rgba(0,0,0,0.3)' } 
  if (pct >=  8) return { bg: '#15803d', accent: '#ffffff', label: '#bbf7d0', muted: '#86efac', tag: 'rgba(0,0,0,0.25)' }
  if (pct >=  3) return { bg: '#22c55e', accent: '#ffffff', label: '#ecfdf5', muted: '#bbf7d0', tag: 'rgba(0,0,0,0.2)' }
  if (pct >= 0.5) return { bg: '#bbf7d0', accent: '#064e3b', label: '#14532d', muted: '#166534', tag: 'rgba(255,255,255,0.45)' } 

  // Emphatic Reds
  if (pct <= -15) return { bg: '#881337', accent: '#ffffff', label: '#fecdd3', muted: '#fb7185', tag: 'rgba(0,0,0,0.3)' }
  if (pct <=  -8) return { bg: '#be123c', accent: '#ffffff', label: '#ffe4e6', muted: '#fda4af', tag: 'rgba(0,0,0,0.25)' }
  if (pct <=  -3) return { bg: '#f43f5e', accent: '#ffffff', label: '#fff1f2', muted: '#fecdd3', tag: 'rgba(0,0,0,0.2)' } 
  return { bg: '#fecdd3', accent: '#4c0519', label: '#881337', muted: '#e11d48', tag: 'rgba(255,255,255,0.45)' } 
}

/* ── Tile Tiers (Masonry Spanning Size Matrix) ────────────── */
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

/* ── Ranks ────────── */
function periodRank(s: Sector, p: Period): number {
  if (p === '1D') return s.day_rank ?? 9999
  if (p === '1W') return s.week_rank ?? 9999
  if (p === '1M') return s.month_rank ?? 9999
  if (p === '3M') return s.quarter_rank ?? 9999
  return s.ytd_rank ?? 9999
}

function fmt(v: number | null): string {
  if (v === null) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}

/* ── Core Rendering Frame ────────────────────── */
export default function HeatmapClient({ sectors, benchmarks }: Props) {
  const [period, setPeriod] = useState<Period>('YTD')
  const [active, setActive] = useState<Sector | null>(null)

  const spx = benchmarks.find(b => b.ticker === '^GSPC')
  const sorted = useMemo(
    () => [...sectors].sort((a, b) => periodRank(a, period) - periodRank(b, period)),
    [sectors, period]
  )

  const up = sorted.filter(s => (getPeriodValue(s, period) ?? 0) >= 0).length
  const avg = sorted.reduce((sum, s) => sum + (getPeriodValue(s, period) ?? 0), 0) / sorted.length

  return (
    <div className="min-h-dvh">
      {/* ── Native UI Bright Glass Toolbar ── */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Timeline Pills */}
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase hidden sm:block">
              Timeline Map
            </span>
            <div className="flex gap-1 bg-slate-50 rounded-full p-1 border border-slate-100 shadow-inner">
              {HEATMAP_PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200 ${
                    period === p
                      ? 'bg-white text-slate-800 shadow-[0_2px_4px_rgba(0,0,0,0.06)]'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics Stats View */}
          <div className="flex items-center gap-4 text-[11px] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100/50">
            <span>
              <span className="font-extrabold text-emerald-600">{up}↑</span>
              <span className="font-extrabold text-rose-500 ml-1.5">{sorted.length - up}↓</span>
            </span>
            <div className="h-3 w-px bg-slate-200 mx-0.5" />
            <span className={`font-black ${avg >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              Average: {fmt(avg)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Scaled Treemap Masonry Elements ── */}
      <div className="p-2 sm:p-3 max-w-7xl mx-auto pt-4 sm:pt-6">
        <div
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2"
          style={{ gridAutoFlow: 'dense', gridAutoRows: '90px' }}
        >
          {sorted.map(sector => {
            const rank = periodRank(sector, period)
            const pct  = getPeriodValue(sector, period)
            const bw   = getBreadth(sector, period)
            const sc   = computeScorecard(sector, spx)
            
            const p = pal(pct)
            const t = tierOf(rank)
            
            const isXL = t === 'xl'
            const isLG = t === 'lg'

            return (
              <div
                key={sector.id}
                onClick={() => setActive(sector)}
                className={`heat-cell relative rounded-xl cursor-pointer overflow-hidden select-none border border-black/[0.04] shadow-sm ${TILE_CLS[t]}`}
                style={{ backgroundColor: p.bg }}
              >
                {/* Surface Polish / Top Sheen Line overlay for crisp component visual appeal */}
                <div
                  className="absolute inset-x-0 top-0 h-[1.5px] pointer-events-none"
                  style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)` }}
                />

                <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-between z-10">
                  <div className="flex items-start justify-between gap-1">
                    <span
                      className="text-[10px] font-bold px-1.5 py-[3px] rounded-md leading-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-sm"
                      style={{ backgroundColor: p.tag, color: p.accent }}
                    >
                      #{rank !== 9999 ? rank : '-'}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-90 drop-shadow-sm">
                      {sc === 'gold'   && <span className="text-amber-400 text-[14px] leading-none" title="Beats market consistently (4 Periods)">★</span>}
                      {sc === 'silver' && <span className="text-slate-200 text-[11px] leading-none opacity-80">★</span>}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center drop-shadow-sm mt-1 sm:mt-2">
                    <div
                      className={`font-black tracking-tight leading-none tabular-nums ${isXL ? 'text-3xl sm:text-[40px]' : isLG ? 'text-[26px] sm:text-[32px]' : 'text-xl'}`}
                      style={{ color: p.accent }}
                    >
                      {fmt(pct)}
                    </div>
                    <div
                      className={`font-bold leading-tight truncate mt-1 ${isXL ? 'text-xs sm:text-[14px]' : 'text-[10px]'}`}
                      style={{ color: p.label, letterSpacing: '-0.01em' }}
                    >
                      {sector.name}
                    </div>
                  </div>

                  {bw !== null && (
                    <div className={`${isXL ? '' : 'hidden md:block'} mt-auto pt-3`}>
                      <div className="flex justify-between items-center mb-[3px]">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: p.label }}>
                          Br
                        </span>
                        <span className="text-[9px] font-black tabular-nums" style={{ color: p.label }}>
                          {bw.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-[4px] rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                          style={{ width: `${bw}%`, backgroundColor: p.accent }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Classic UI Palette Chart Legend Matching App Space Base  ── */}
        <div className="mt-8 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>−15%+</span>
          <div className="flex rounded-[6px] shadow-sm overflow-hidden gap-px bg-slate-200/50 p-px border border-slate-200/50">
            {['#881337', '#be123c', '#f43f5e', '#fecdd3', '#f1f5f9', '#bbf7d0', '#22c55e', '#15803d', '#14532d'].map(c => (
              <div key={c} style={{ backgroundColor: c }} className="w-5 sm:w-6 h-3.5 rounded-[1px]" />
            ))}
          </div>
          <span>+15%+</span>
        </div>

        <p className="text-center text-[10px] text-slate-400 font-semibold tracking-wider mt-4 opacity-75">
          Tap any quadrant above to breakdown core asset allocations within structure
        </p>
      </div>

      {active && (
        <HoldingsModal
          sector={active}
          period={period}
          benchmarks={benchmarks}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}