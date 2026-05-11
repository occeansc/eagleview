'use client'

import { Sector, Period, ScorecardLevel, SectorSnapshot, getPeriodValue, getRankChange, getBreadth } from '@/lib/types'
import { FlameIcon, TrendingUpIcon, ZapIcon, BookmarkIcon, AwardIcon } from './Icons'
import Sparkline from './Sparkline'

interface Props {
  sector: Sector; rank: number; period: Period; isHot: boolean; delay: number
  isPinned: boolean; scorecard: ScorecardLevel; snapshots: SectorSnapshot[]
  onClick: () => void; onTogglePin: (e: React.MouseEvent) => void
}

export default function SectorCard({ sector, rank, period, isHot, delay, isPinned, scorecard, snapshots, onClick, onTogglePin }: Props) {
  const value      = getPeriodValue(sector, period)
  const rankChange = getRankChange(sector, period)
  const breadth    = getBreadth(sector, period)
  const positive   = value !== null && value >= 0
  const negative   = value !== null && value < 0
  const isRising   = rankChange !== null && rankChange >= 5
  const streak     = sector.streak ?? 0
  const showStreak = streak >= 5   // only show when meaningful

  const bg    = positive ? 'bg-emerald-50 border-emerald-100' : negative ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'
  const pct   = positive ? 'text-emerald-700' : negative ? 'text-rose-700' : 'text-slate-400'
  const arrow = positive ? '↗' : negative ? '↘' : '→'

  return (
    <button onClick={onClick} className={`sector-card card-appear relative rounded-2xl border p-4 text-left w-full flex flex-col ${bg}`} style={{ animationDelay: `${delay}ms` }}>

      {/* Rising badge */}
      {isRising && !isHot && (
        <span className="rising-badge absolute -top-2.5 right-8 flex items-center gap-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          <TrendingUpIcon size={9} stroke="white" />
          RISING
        </span>
      )}

      {/* HOT badge */}
      {isHot && (
        <span className="hot-badge absolute -top-2.5 right-8 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          <FlameIcon size={9} stroke="white" />
          HOT
        </span>
      )}

      {/* Pin */}
      <button onClick={onTogglePin} className={`absolute top-3 right-3 transition-colors ${isPinned ? 'text-amber-400' : 'text-slate-200 hover:text-slate-400'}`} aria-label="Pin">
        <BookmarkIcon size={14} filled={isPinned} />
      </button>

      {/* Rank row */}
      <div className="flex items-center gap-1.5 mb-2 pr-5">
        <span className="text-xs font-semibold text-slate-400 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-full">#{rank}</span>

        {rankChange !== null && rankChange !== 0 && (
          <span className={`rank-change flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${rankChange > 0 ? 'text-emerald-700 bg-emerald-100' : 'text-rose-600 bg-rose-100'}`}>
            {rankChange > 0 ? '▲' : '▼'}{Math.abs(rankChange)}
          </span>
        )}

        {/* Scorecard badge */}
        {scorecard === 'gold' && (
          <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
            <AwardIcon size={9} stroke="currentColor" /> GOLD
          </span>
        )}
        {scorecard === 'silver' && (
          <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
            <AwardIcon size={9} stroke="currentColor" /> SILVER
          </span>
        )}

        {/* Streak — only when meaningful */}
        {showStreak && !scorecard && (
          <span className="ml-auto flex items-center gap-0.5 text-[9px] font-semibold text-orange-500">
            <ZapIcon size={10} stroke="currentColor" />{streak}
          </span>
        )}
      </div>

      {/* Name */}
      <p className="font-semibold text-slate-800 text-sm leading-tight mb-2 pr-2">{sector.name}</p>

      {/* Return + sparkline */}
      <div className="flex items-end justify-between mb-3">
        <p className={`font-mono text-xl font-medium tracking-tight ${pct}`}>
          {value !== null ? `${arrow} ${value > 0 ? '+' : ''}${value.toFixed(1)}%` : <span className="text-slate-300 text-sm">No data</span>}
        </p>
        {snapshots.length >= 2 && <Sparkline snapshots={snapshots} positive={positive} width={56} height={20} />}
      </div>

      {/* Breadth */}
      {breadth !== null && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-slate-400">Breadth</span>
            <span className={`text-[10px] font-mono font-semibold ${breadth >= 60 ? 'text-emerald-600' : breadth >= 40 ? 'text-amber-600' : 'text-rose-500'}`}>{breadth}%</span>
          </div>
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className={`breadth-bar h-full rounded-full ${breadth >= 60 ? 'bg-emerald-400' : breadth >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${breadth}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs text-slate-400">{sector.stock_count ?? '—'} stocks</span>
        <span className="text-[10px] tracking-widest text-slate-300 uppercase font-semibold">View ↗</span>
      </div>
    </button>
  )
}
