'use client'

import { useState, useMemo } from 'react'
import type { Sector, Benchmark, Period } from '@/lib/types'
import { getPeriodValue, getBreadth, computeScorecard } from '@/lib/types'
import HoldingsModal from '@/components/HoldingsModal'
import { useTheme } from '@/components/ThemeProvider'

// Heatmap shows all 8 periods (1D through 5Y).
// computeScorecard always evaluates on 1M/3M/6M/YTD — unaffected by period selection here.
const HEATMAP_PERIODS: Period[] = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y']

interface Props {
  sectors:    Sector[]
  benchmarks: Benchmark[]
}

/* ── Heat palette — calibrated for white canvas (light) or dark surface ── */
type Pal = { bg: string; accent: string; label: string; muted: string; tag: string }

function pal(pct: number | null, isDark: boolean): Pal {
  if (!isDark) {
    if (pct === null)          return { bg: '#f1f5f9', accent: '#64748b', label: '#94a3b8', muted: '#cbd5e1', tag: 'rgba(0,0,0,0.06)' }
    if (pct > -0.5 && pct < 0.5) return { bg: '#f1f5f9', accent: '#334155', label: '#64748b', muted: '#94a3b8', tag: 'rgba(0,0,0,0.06)' }
    if (pct >= 15) return { bg: '#14532d', accent: '#ffffff', label: '#86efac', muted: '#4ade80',  tag: 'rgba(0,0,0,0.30)' }
    if (pct >=  8) return { bg: '#15803d', accent: '#ffffff', label: '#bbf7d0', muted: '#86efac',  tag: 'rgba(0,0,0,0.25)' }
    if (pct >=  3) return { bg: '#22c55e', accent: '#ffffff', label: '#ecfdf5', muted: '#bbf7d0',  tag: 'rgba(0,0,0,0.20)' }
    if (pct >= 0.5)return { bg: '#bbf7d0', accent: '#064e3b', label: '#14532d', muted: '#166534',  tag: 'rgba(255,255,255,0.45)' }
    if (pct <= -15)return { bg: '#881337', accent: '#ffffff', label: '#fecdd3', muted: '#fb7185',  tag: 'rgba(0,0,0,0.30)' }
    if (pct <=  -8)return { bg: '#be123c', accent: '#ffffff', label: '#ffe4e6', muted: '#fda4af',  tag: 'rgba(0,0,0,0.25)' }
    if (pct <=  -3)return { bg: '#f43f5e', accent: '#ffffff', label: '#fff1f2', muted: '#fecdd3',  tag: 'rgba(0,0,0,0.20)' }
    return              { bg: '#fecdd3', accent: '#4c0519', label: '#881337', muted: '#e11d48',  tag: 'rgba(255,255,255,0.45)' }
  }
  // Dark mode — strong tiers (already deeply saturated with white text)
  // are unchanged, they read fine on any background. Weak/neutral tiers
  // switch from light pastel fills to dark tinted fills with bright text.
  if (pct === null)          return { bg: '#171c27', accent: '#64748b', label: '#475569', muted: '#334155', tag: 'rgba(255,255,255,0.06)' }
  if (pct > -0.5 && pct < 0.5) return { bg: '#1c2230', accent: '#94a3b8', label: '#64748b', muted: '#475569', tag: 'rgba(255,255,255,0.06)' }
  if (pct >= 15) return { bg: '#14532d', accent: '#ffffff', label: '#86efac', muted: '#4ade80',  tag: 'rgba(0,0,0,0.30)' }
  if (pct >=  8) return { bg: '#15803d', accent: '#ffffff', label: '#bbf7d0', muted: '#86efac',  tag: 'rgba(0,0,0,0.25)' }
  if (pct >=  3) return { bg: '#22c55e', accent: '#ffffff', label: '#ecfdf5', muted: '#bbf7d0',  tag: 'rgba(0,0,0,0.20)' }
  if (pct >= 0.5)return { bg: '#14291d', accent: '#4ade80', label: '#86efac', muted: '#22c55e',  tag: 'rgba(255,255,255,0.08)' }
  if (pct <= -15)return { bg: '#881337', accent: '#ffffff', label: '#fecdd3', muted: '#fb7185',  tag: 'rgba(0,0,0,0.30)' }
  if (pct <=  -8)return { bg: '#be123c', accent: '#ffffff', label: '#ffe4e6', muted: '#fda4af',  tag: 'rgba(0,0,0,0.25)' }
  if (pct <=  -3)return { bg: '#f43f5e', accent: '#ffffff', label: '#fff1f2', muted: '#fecdd3',  tag: 'rgba(0,0,0,0.20)' }
  return              { bg: '#2d1417', accent: '#fb7185', label: '#fecdd3', muted: '#f43f5e',  tag: 'rgba(255,255,255,0.08)' }
}

/* ── Tile tiers ─────────────────────────────────────────────── */
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

/* ── Helpers ─────────────────────────────────────────────────── */
function periodRank(s: Sector, p: Period): number {
  if (p === '1D') return s.day_rank      ?? 999
  if (p === '1W') return s.week_rank     ?? 999
  if (p === '1M') return s.month_rank    ?? 999
  if (p === '3M') return s.quarter_rank  ?? 999
  if (p === '6M') return s.half_year_rank ?? 999
  if (p === '1Y') return s.year_rank     ?? 999
  if (p === '5Y') return s.five_year_rank ?? 999
  return s.ytd_rank ?? 999
}

function fmt(v: number | null): string {
  if (v === null) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}

/* ── Component ───────────────────────────────────────────────── */
export default function HeatmapClient({ sectors, benchmarks }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [period, setPeriod] = useState<Period>('1D')
  const [active, setActive] = useState<Sector | null>(null)

  const spx    = benchmarks.find(b => b.ticker === '^GSPC')
  const sorted = useMemo(
    () => [...sectors].sort((a, b) => periodRank(a, period) - periodRank(b, period)),
    [sectors, period],
  )

  const up  = sorted.filter(s => (getPeriodValue(s, period) ?? 0) >= 0).length
  const avg = sorted.reduce((sum, s) => sum + (getPeriodValue(s, period) ?? 0), 0) / sorted.length

  return (
    <div className="min-h-dvh">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/20 px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">

          {/* Period pills — scroll-safe on narrow screens */}
          <div className="period-bar shrink-0" style={{ maxWidth: '100%' }}>
            <div className="period-control">
              <div className="period-control-inner">
                {HEATMAP_PERIODS.map(p => (
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
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-3 text-[11px] bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-100/80 dark:border-white/10">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{up}↑</span>
            <span className="font-bold text-rose-500 dark:text-rose-400">{sorted.length - up}↓</span>
            <div className="h-3 w-px bg-slate-200 dark:bg-white/20" />
            <span className={`font-bold ${avg >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
              Avg {fmt(avg)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Treemap grid ── */}
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
            const p    = pal(pct, isDark)
            const t    = tierOf(rank)
            const isXL = t === 'xl'
            const isLG = t === 'lg'

            return (
              <div
                key={sector.id}
                onClick={() => setActive(sector)}
                className={`relative rounded-xl cursor-pointer overflow-hidden select-none
                  border border-black/[0.04] dark:border-white/[0.06] shadow-sm
                  transition-all duration-150 hover:brightness-105 hover:scale-[1.012] hover:z-10 hover:shadow-md
                  ${TILE_CLS[t]}`}
                style={{ backgroundColor: p.bg }}
              >
                {/* Top sheen — subtler in dark mode so it doesn't read as a
                    harsh bright line cutting across the tile's dark fill */}
                <div
                  className="absolute inset-x-0 top-0 h-[1.5px] pointer-events-none"
                  style={{ background: `linear-gradient(90deg,transparent,rgba(255,255,255,${isDark ? 0.12 : 0.4}),transparent)` }}
                />

                <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-between z-10">

                  {/* Top row: rank + badge */}
                  <div className="flex items-start justify-between gap-1">
                    <span
                      className="text-[10px] font-bold px-1.5 py-[3px] rounded-md leading-none"
                      style={{ backgroundColor: p.tag, color: p.accent }}
                    >
                      #{rank !== 999 ? rank : '–'}
                    </span>

                    {/* Badges — same pill style as Dashboard/Watchlist */}
                    {sc === 'gold' && (
                      <span
                        className="text-[7px] font-bold tracking-wide px-1.5 py-[3px] rounded-full uppercase leading-none border"
                        style={{
                          backgroundColor: 'rgba(254,243,199,0.9)',
                          borderColor:     'rgba(253,230,138,0.8)',
                          color:           '#92400e',
                        }}
                      >
                        Gold
                      </span>
                    )}
                    {sc === 'silver' && (
                      <span
                        className="text-[7px] font-bold tracking-wide px-1.5 py-[3px] rounded-full uppercase leading-none border"
                        style={{
                          backgroundColor: 'rgba(241,245,249,0.9)',
                          borderColor:     'rgba(203,213,225,0.7)',
                          color:           '#475569',
                        }}
                      >
                        Silver
                      </span>
                    )}
                    {sc === 'bronze' && (
                      <span
                        className="text-[7px] font-bold tracking-wide px-1.5 py-[3px] rounded-full uppercase leading-none border"
                        style={{
                          backgroundColor: 'rgba(255,247,237,0.9)',
                          borderColor:     'rgba(254,215,170,0.7)',
                          color:           '#c2410c',
                        }}
                      >
                        Bronze
                      </span>
                    )}
                  </div>

                  {/* Return % + sector name */}
                  <div className="flex-1 flex flex-col justify-center mt-1">
                    <div
                      className={`font-bold tracking-tight leading-none tabular-nums ${
                        isXL ? 'text-3xl sm:text-[40px]' :
                        isLG ? 'text-[22px] sm:text-[28px]' :
                               'text-xl'
                      }`}
                      style={{ color: p.accent }}
                    >
                      {fmt(pct)}
                    </div>
                    <div
                      className={`font-semibold leading-snug truncate mt-1 ${
                        isXL ? 'text-[11px] sm:text-[13px]' :
                        isLG ? 'text-[10px]' :
                               'text-[9px]'
                      }`}
                      style={{ color: p.label, opacity: 0.8 }}
                    >
                      {sector.name}
                    </div>
                  </div>

                  {/* Breadth bar */}
                  {/* Breadth bar — only on XL/LG/MD tiers (row-span-2 = 180px+).
                      SM tiles are 90px fixed — adding breadth overflows them.
                      On mobile, only XL tiles show breadth (intentional — smaller tiles
                      have no vertical room regardless of tier). */}
                  {bw !== null && t !== 'sm' && (
                    <div className={isXL ? 'mt-auto pt-2' : 'hidden md:block mt-auto pt-2'}>
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className="text-[8px] font-bold uppercase tracking-wide"
                          style={{ color: p.label, opacity: 0.6 }}
                        >
                          Breadth
                        </span>
                        <span
                          className="text-[9px] font-bold tabular-nums"
                          style={{ color: p.label, opacity: 0.8 }}
                        >
                          {bw.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-[3px] rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${bw}%`, backgroundColor: p.accent, opacity: 0.6 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Colour scale legend */}
        <div className="mt-8 flex items-center justify-center gap-3 text-[10px] font-bold tracking-wide text-slate-400 dark:text-slate-500 uppercase">
          <span>−15%</span>
          <div className="flex rounded-md overflow-hidden gap-px border border-slate-200/60 dark:border-white/20 shadow-sm">
            {(isDark
              ? ['#881337','#be123c','#f43f5e','#2d1417','#1c2230','#14291d','#22c55e','#15803d','#14532d']
              : ['#881337','#be123c','#f43f5e','#fecdd3','#f1f5f9','#bbf7d0','#22c55e','#15803d','#14532d']
            ).map(c => (
              <div key={c} style={{ backgroundColor: c }} className="w-5 sm:w-6 h-3" />
            ))}
          </div>
          <span>+15%</span>
        </div>

        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-3">
          Tap any tile to see full holdings
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
