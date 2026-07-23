'use client'

import { useState, useMemo } from 'react'
import {
  Sector, Benchmark, Period, SectorSnapshot,
  getPeriodValue, getRankChange, PERIOD_LABELS, computeScorecard,
} from '@/lib/types'
import { EagleIcon, FlameIcon, TrendingUpIcon, TrendingDownIcon } from './Icons'
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

type FilterMode = 'all' | 'hot' | 'rising' | 'falling'

const PERIODS_LOCAL: Period[] = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y']
const RISING_THRESHOLD  =  5
const FALLING_THRESHOLD = -5

export default function SectorGrid({ sectors, benchmarks, snapshots }: Props) {
  const [period, setPeriod]         = useState<Period>('1D')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selected, setSelected]     = useState<Sector | null>(null)

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

  // ── Filtered display set ──────────────────────────────────────
  const displayed = useMemo(() => {
    if (filterMode === 'hot')     return sorted.slice(0, 2)
    if (filterMode === 'rising')  return sorted.filter(s => (getRankChange(s, period) ?? 0) >= RISING_THRESHOLD)
    if (filterMode === 'falling') return sorted.filter(s => (getRankChange(s, period) ?? 0) <= FALLING_THRESHOLD)
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
  const anyFalling = displayed.some(s => {
    const isHot    = sorted.indexOf(s) < 2
    const isRising = !isHot && (getRankChange(s, period) ?? 0) >= RISING_THRESHOLD
    const rc       = getRankChange(s, period)
    return !isHot && !isRising && rc !== null && rc <= FALLING_THRESHOLD
  })
  const anyGold   = displayed.some(s => computeScorecard(s, spx) === 'gold')
  const anySilver = displayed.some(s => computeScorecard(s, spx) === 'silver')
  const anyBronze = displayed.some(s => computeScorecard(s, spx) === 'bronze')

  const sectionTitle =
    filterMode === 'hot'     ? 'Hot Sectors' :
    filterMode === 'rising'  ? 'Rising Sectors' :
    filterMode === 'falling' ? 'Falling Sectors' :
    'Sector Rankings'

  const toggleFilter = (mode: FilterMode) => {
    setFilterMode(prev => (prev === mode ? 'all' : mode))
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 xl:px-8 py-6">

      {/* ── Header ─────────────────────────────── */}
      <div className="dashboard-header-row flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <EagleIcon size={22} className="text-slate-800 dark:text-slate-200 shrink-0" />
            <h1 className="landscape-title text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Eagleview</h1>
          </div>
          <div className="tagline-block flex flex-wrap items-center gap-2 pl-8 sm:pl-0">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {sorted.length} sectors · {PERIOD_LABELS[period]}
              {positiveCount > 0 && (
                <>
                  {' · '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{positiveCount}↑</span>
                  {' '}
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">{negativeCount}↓</span>
                </>
              )}
              {lastUpdated && <> · {lastUpdated}</>}
            </p>
            <MarketRegime sectors={sectors} />
          </div>
        </div>

        {/* ── Period bar: scroll container (pills) + filter group (buttons) ── */}
        <div className="period-bar shrink-0">

          {/* Period pills — inside the scrollable container */}
          <div className="period-control">
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
            </div>
          </div>

          {/* Filter buttons — sibling to scroll container, NOT inside it.
              This is the architectural fix: active-state box-shadows are never
              clipped by the scroll container's overflow. */}
          <div className="period-filter-group">
            <div className="w-px h-5 self-center ml-0.5 mr-1 bg-slate-300/50 dark:bg-white/15" />

            <button
              onClick={() => toggleFilter('hot')}
              className={`period-pill period-pill-icon flex items-center gap-1 ${filterMode === 'hot' ? 'period-pill-active' : ''}`}
              aria-pressed={filterMode === 'hot'}
              title="Show top 2 hot sectors"
            >
              <FlameIcon size={11} className={filterMode === 'hot' ? 'text-orange-500' : ''} />
              <span className="hidden sm:inline">Hot</span>
            </button>

            <button
              onClick={() => toggleFilter('rising')}
              className={`period-pill period-pill-icon flex items-center gap-1 ${filterMode === 'rising' ? 'period-pill-active' : ''}`}
              aria-pressed={filterMode === 'rising'}
              title="Show sectors rising 5+ ranks"
            >
              <TrendingUpIcon size={11} className={filterMode === 'rising' ? 'text-sky-500' : ''} />
              <span className="hidden sm:inline">Rising</span>
            </button>

            <button
              onClick={() => toggleFilter('falling')}
              className={`period-pill period-pill-icon flex items-center gap-1 ${filterMode === 'falling' ? 'period-pill-active' : ''}`}
              aria-pressed={filterMode === 'falling'}
              title="Show sectors falling 5+ ranks"
            >
              <TrendingDownIcon size={11} className={filterMode === 'falling' ? 'text-rose-500 dark:text-rose-400' : ''} />
              <span className="hidden sm:inline">Falling</span>
            </button>
          </div>

        </div>
      </div>

      {/* ── Market Pulse ────────────────────────── */}
      <BenchmarkBar benchmarks={benchmarks} period={period} />

      {/* ── Rankings divider ─────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-bold tracking-wide text-slate-400 dark:text-slate-500 uppercase whitespace-nowrap flex items-center gap-1.5">
          {filterMode === 'hot'     && <FlameIcon size={11} className="text-orange-500" />}
          {filterMode === 'rising'  && <TrendingUpIcon size={11} className="text-sky-500" />}
          {filterMode === 'falling' && <TrendingDownIcon size={11} className="text-rose-500 dark:text-rose-400" />}
          {sectionTitle}
          {filterMode !== 'all' && (
            <span className="text-slate-300 dark:text-slate-600 font-normal">· {displayed.length}</span>
          )}
        </span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-white/20" />
        {filterMode !== 'all' && (
          <button
            onClick={() => setFilterMode('all')}
            className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 uppercase tracking-wide transition-colors whitespace-nowrap"
          >
            Clear ✕
          </button>
        )}
      </div>

      {/* ── Grid ────────────────────────────────── */}
      {sectors.length === 0 ? (
        <div className="text-center py-20">
          <EagleIcon size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-700" />
          <p className="font-semibold text-slate-600 dark:text-slate-400 text-lg">No data yet</p>
          <p className="text-sm mt-2 text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
            Trigger the GitHub Action to run the first data sync.
          </p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          {filterMode === 'falling'
            ? <TrendingDownIcon size={36} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
            : <TrendingUpIcon   size={36} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
          }
          <p className="font-semibold text-slate-600 dark:text-slate-400 text-base">
            {filterMode === 'falling'
              ? `No sectors dropped ${Math.abs(FALLING_THRESHOLD)}+ ranks this sync`
              : `No sectors rose ${RISING_THRESHOLD}+ ranks this sync`
            }
          </p>
          <p className="text-sm mt-1.5 text-slate-400 dark:text-slate-500">
            Check back after the next sync, or view all sectors.
          </p>
          <button
            onClick={() => setFilterMode('all')}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors"
          >
            Show all sectors
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
                scorecard={computeScorecard(sector, spx)}
                snapshots={snapshots[sector.id] ?? []}
                onClick={() => setSelected(sector)}
              />
            )
          })}
        </div>
      )}

      <BadgeLegend showHot={anyHot} showRising={anyRising} showFalling={anyFalling} showGold={anyGold} showSilver={anySilver} showBronze={anyBronze} />

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
