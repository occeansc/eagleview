'use client'

import { useState, useMemo } from 'react'
import {
  Sector, Benchmark, Period, SectorSnapshot,
  getPeriodValue, PERIOD_LABELS, computeScorecard,
} from '@/lib/types'
import { useWatchlist } from '@/lib/watchlist'
import { EagleIcon } from './Icons'
import SectorCard from './SectorCard'
import PeriodToggle from './PeriodToggle'
import BenchmarkBar from './BenchmarkBar'
import HoldingsModal from './HoldingsModal'

interface Props {
  sectors: Sector[]
  benchmarks: Benchmark[]
  snapshots: Record<number, SectorSnapshot[]>
}

export default function SectorGrid({ sectors, benchmarks, snapshots }: Props) {
  const [period, setPeriod]     = useState<Period>('YTD')
  const [selected, setSelected] = useState<Sector | null>(null)
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

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6">

      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <EagleIcon size={22} className="text-slate-800 shrink-0" />
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Eagleview</h1>
          </div>
          <p className="text-xs text-slate-400 pl-8">
            {sorted.length} sectors · {PERIOD_LABELS[period]}
            {positiveCount > 0 && (
              <> · <span className="text-emerald-600 font-semibold">{positiveCount}↑</span>
                {' '}<span className="text-rose-600 font-semibold">{negativeCount}↓</span>
              </>
            )}
            {lastUpdated && <> · {lastUpdated}</>}
          </p>
        </div>
        <PeriodToggle selected={period} onChange={setPeriod} />
      </div>

      {/* ── Market Pulse ────────────────────────── */}
      <BenchmarkBar benchmarks={benchmarks} period={period} />

      {/* ── Pinned watchlist strip ───────────────── */}
      {pinned.length > 0 && (
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
                isHot={false}
                delay={0}
                isPinned={true}
                scorecard={computeScorecard(sector, spx)}
                snapshots={snapshots[sector.id] ?? []}
                onClick={() => setSelected(sector)}
                onTogglePin={e => { e.stopPropagation(); toggle(sector.id) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Sector rankings divider ──────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase whitespace-nowrap">
          Sector Rankings
        </span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* ── Grid ────────────────────────────────── */}
      {sectors.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <EagleIcon size={48} className="mx-auto mb-4 text-slate-200" />
          <p className="font-semibold text-slate-600 text-lg">No data yet</p>
          <p className="text-sm mt-2 max-w-xs mx-auto text-slate-400">
            Trigger the GitHub Action to run the first data sync.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sorted.map((sector, i) => (
            <SectorCard
              key={sector.id}
              sector={sector}
              rank={i + 1}
              period={period}
              isHot={i < 2}
              delay={i * 30}
              isPinned={isPinned(sector.id)}
              scorecard={computeScorecard(sector, spx)}
              snapshots={snapshots[sector.id] ?? []}
              onClick={() => setSelected(sector)}
              onTogglePin={e => { e.stopPropagation(); toggle(sector.id) }}
            />
          ))}
        </div>
      )}

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
