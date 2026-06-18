'use client'

import { useState, useMemo } from 'react'
import {
  Sector, Benchmark, Period, SectorSnapshot,
  getPeriodValue, getRankChange, PERIOD_LABELS, computeScorecard,
} from '@/lib/types'
import { useWatchlist } from '@/lib/watchlist'
import { EagleIcon, FlameIcon, TrendingUpIcon } from './Icons'
import SectorCard from './SectorCard'
import BenchmarkBar from './BenchmarkBar'
import HoldingsModal from './HoldingsModal'
import MarketRegime from './MarketRegime'
import BadgeLegend from './BadgeLegend'

interface Props {
  sectors:    Sector[]
  benchmarks: Benchmark[]
  snapshots:  Record<number, SectorSnapshot[]>
}

type FilterMode = 'all' | 'hot' | 'rising'

const PERIODS_LOCAL: Period[] = ['1D', '1W', '1M', '3M', 'YTD']
const RISING_THRESHOLD = 5

export default function SectorGrid({ sectors, benchmarks, snapshots }: Props) {
  const [period, setPeriod]         = useState<Period>('YTD')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selected, setSelected]     = useState<Sector | null>(null)
  const { toggle, isPinned, ready, pinnedIds } = useWatchlist()

  const spx = benchmarks.find(b => b.ticker === '^GSPC')

  const sorted = useMemo(() => {
    return [...sectors].sort((a, b) => {
      const av = getPeriodValue(a, period) ?? -Infinity
      const bv = getPeriodValue(b, period) ?? -Infinity
      return bv - av
    })
  }, [sectors, period])

  const positiveCount = sorted.filter(s => (getPeriodValue(s, period) ?? 0) >= 0).length
  const negativeCount = sorted.length - positiveCount

  const lastUpdated = sectors.length > 0
    ? new Date(
        Math.max(...sectors.map(s => new Date(s.updated_at).getTime()))
      ).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const pinned = ready && pinnedIds.length > 0
    ? sorted.filter(s => pinnedIds.includes(s.id))
    : []

  // ── Filtered display set ──────────────────────────────────────
  const displayed = useMemo(() => {
    if (filterMode === 'hot')    return sorted.slice(0, 2)
    if (filterMode === 'rising') return sorted.filter(s => (getRankChange(s, period) ?? 0) >= RISING_THRESHOLD)
    return sorted
  }, [sorted, filterMode, period])

  // ── Badge legend: only define a term if it's actually visible right now ──
  // Mirrors SectorCard's exact render conditions, including "Hot overrides
  // Rising" priority, so the glossary never describes a badge nobody can see.
  const anyHot    = displayed.some(s => sorted.indexOf(s) < 2)
  const anyRising = displayed.some(s => {
    const isHot = sorted.indexOf(s) < 2
    const rc    = getRankChange(s, period)
    return !isHot && rc !== null && rc >= RISING_THRESHOLD
  })
  const anyGold   = displayed.some(s => computeScorecard(s, spx) === 'gold')
  const anySilver = displayed.some(s => computeScorecard(s, spx) === 'silver')

  const sectionTitle =
    filterMode === 'hot'    ? 'Hot Sectors' :
    filterMode === 'rising' ? 'Rising Sectors' :
    'Sector Rankings'

  const toggleFilter = (mode: FilterMode) => {
    setFilterMode(prev => (prev === mode ? 'all' : mode))
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6">

      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <EagleIcon size={22} className="text-slate-800 shrink-0" />
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Eagleview</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-8">
            <p className="text-xs text-slate-400">
              {sorted.length} sectors · {PERIOD_LABELS[period]}
              {positiveCount > 0 && (
                <>
                  {' · '}
                  <span className="text-emerald-600 font-semibold">{positiveCount}↑</span>
                  {' '}
                  <span className="text-rose-600 font-semibold">{negativeCount}↓</span>
                </>
              )}
              {lastUpdated && <> · {lastUpdated}</>}
            </p>
            <MarketRegime sectors={sectors} />
          </div>
        </div>

        {/* ── Combined Period + Filter control ─────── */}
        <div className="period-control shrink-0">
          <div className="period-control-inner">
            {PERIODS_LOCAL.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`period-pill ${period === p ? 'period-pill-active' : ''}`}
              >
                {p}
              </button>
            ))}

            {/* Divider */}
            <div className="w-px h-5 self-center mx-1.5 bg-slate-300/50" />

            {/* HOT filter */}
            <button
              onClick={() => toggleFilter('hot')}
              className={`period-pill period-pill-icon flex items-center gap-1 ${filterMode === 'hot' ? 'period-pill-active' : ''}`}
              aria-pressed={filterMode === 'hot'}
              title="Show top 2 hot sectors"
            >
              <FlameIcon size={11} className={filterMode === 'hot' ? 'text-orange-500' : ''} />
              <span className="hidden sm:inline">Hot</span>
            </button>

            {/* RISING filter */}
            <button
              onClick={() => toggleFilter('rising')}
              className={`period-pill period-pill-icon flex items-center gap-1 ${filterMode === 'rising' ? 'period-pill-active' : ''}`}
              aria-pressed={filterMode === 'rising'}
              title="Show sectors rising 5+ ranks"
            >
              <TrendingUpIcon size={11} className={filterMode === 'rising' ? 'text-sky-500' : ''} />
              <span className="hidden sm:inline">Rising</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Market Pulse ────────────────────────── */}
      <BenchmarkBar benchmarks={benchmarks} period={period} />

      {/* ── Pinned watchlist strip ───────────────── */}
      {pinned.length > 0 && filterMode === 'all' && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-bold tracking-widest text-amber-500 uppercase whitespace-nowrap">
              Watchlist
            </span>
            <div className="flex-1 h-px bg-amber-200" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {pinned.map(sector => (
              <SectorCard
                key={`pin-${sector.id}`}
                sector={sector}
                rank={sorted.indexOf(sector) + 1}
                period={period}
                isHot={sorted.indexOf(sector) < 2}
                delay={0}
                isPinned
                scorecard={computeScorecard(sector, spx)}
                snapshots={snapshots[sector.id] ?? []}
                onClick={() => setSelected(sector)}
                onTogglePin={e => { e.stopPropagation(); toggle(sector.id) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Rankings divider ─────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase whitespace-nowrap flex items-center gap-1.5">
          {filterMode === 'hot'    && <FlameIcon size={11} className="text-orange-500" />}
          {filterMode === 'rising' && <TrendingUpIcon size={11} className="text-sky-500" />}
          {sectionTitle}
          {filterMode !== 'all' && (
            <span className="text-slate-300 font-normal">· {displayed.length}</span>
          )}
        </span>
        <div className="flex-1 h-px bg-slate-200" />
        {filterMode !== 'all' && (
          <button
            onClick={() => setFilterMode('all')}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors whitespace-nowrap"
          >
            Clear ✕
          </button>
        )}
      </div>

      {/* ── Grid ────────────────────────────────── */}
      {sectors.length === 0 ? (
        <div className="text-center py-20">
          <EagleIcon size={48} className="mx-auto mb-4 text-slate-200" />
          <p className="font-semibold text-slate-600 text-lg">No data yet</p>
          <p className="text-sm mt-2 text-slate-400 max-w-xs mx-auto">
            Trigger the GitHub Action to run the first data sync.
          </p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUpIcon size={36} className="mx-auto mb-3 text-slate-200" />
          <p className="font-semibold text-slate-600 text-base">
            No sectors rose {RISING_THRESHOLD}+ ranks this sync
          </p>
          <p className="text-sm mt-1.5 text-slate-400">
            Check back after the next sync, or view all sectors.
          </p>
          <button
            onClick={() => setFilterMode('all')}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
          >
            Show all sectors
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayed.map((sector, i) => {
            const overallRank = sorted.indexOf(sector) + 1
            return (
              <SectorCard
                key={sector.id}
                sector={sector}
                rank={overallRank}
                period={period}
                isHot={overallRank <= 2}
                delay={i * 30}
                isPinned={isPinned(sector.id)}
                scorecard={computeScorecard(sector, spx)}
                snapshots={snapshots[sector.id] ?? []}
                onClick={() => setSelected(sector)}
                onTogglePin={e => { e.stopPropagation(); toggle(sector.id) }}
              />
            )
          })}
        </div>
      )}

      <BadgeLegend showHot={anyHot} showRising={anyRising} showGold={anyGold} showSilver={anySilver} />

      {/* ── Modal ───────────────────────────────── */}
      {selected && (
        <HoldingsModal
          sector={selected}
          period={period}
          benchmarks={benchmarks}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
