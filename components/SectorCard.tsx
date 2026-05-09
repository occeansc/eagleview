'use client'

import { Sector, Period, getPeriodValue, getRankChange, getBreadth } from '@/lib/types'

interface Props {
  sector: Sector
  rank: number
  period: Period
  isHot: boolean
  delay: number
  onClick: () => void
}

export default function SectorCard({ sector, rank, period, isHot, delay, onClick }: Props) {
  const value       = getPeriodValue(sector, period)
  const rankChange  = getRankChange(sector, period)
  const breadth     = getBreadth(sector, period)
  const positive    = value !== null && value >= 0
  const negative    = value !== null && value < 0
  const isRising    = rankChange !== null && rankChange >= 5
  const streak      = sector.streak ?? 0

  const bg    = positive ? 'bg-emerald-50 border-emerald-100'
              : negative ? 'bg-rose-50 border-rose-100'
              :             'bg-slate-50 border-slate-200'
  const pct   = positive ? 'text-emerald-700'
              : negative ? 'text-rose-700'
              :             'text-slate-400'
  const arrow = positive ? '↗' : negative ? '↘' : '→'

  return (
    <button
      onClick={onClick}
      className={`sector-card card-appear relative rounded-2xl border p-4 md:p-5 text-left w-full flex flex-col ${bg}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* ── Badges ── */}
      {isRising && !isHot && (
        <span className="rising-badge absolute -top-2 right-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
          ▲ RISING
        </span>
      )}
      {isHot && (
        <span className="hot-badge absolute -top-2 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
          🔥 HOT
        </span>
      )}

      {/* ── Rank row ── */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-xs font-semibold text-slate-400 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-full">
          #{rank}
        </span>

        {/* Rank change */}
        {rankChange !== null && rankChange !== 0 && (
          <span className={`rank-change text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            rankChange > 0
              ? 'text-emerald-700 bg-emerald-100'
              : 'text-rose-600 bg-rose-100'
          }`}>
            {rankChange > 0 ? `▲${rankChange}` : `▼${Math.abs(rankChange)}`}
          </span>
        )}

        {/* Streak indicator */}
        {streak >= 3 && (
          <span className="ml-auto text-[10px] text-orange-500 font-semibold">
            🔥{streak}
          </span>
        )}
      </div>

      {/* ── Sector name ── */}
      <p className="font-semibold text-slate-800 text-sm md:text-base leading-tight mb-3">
        {sector.name}
      </p>

      {/* ── Return % ── */}
      <p className={`font-mono text-xl md:text-2xl font-medium tracking-tight ${pct} mb-3`}>
        {value !== null
          ? `${arrow} ${value > 0 ? '+' : ''}${value.toFixed(1)}%`
          : <span className="text-slate-300 text-sm">No data</span>
        }
      </p>

      {/* ── Breadth bar ── */}
      {breadth !== null && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-slate-400">Breadth</span>
            <span className={`text-[10px] font-mono font-semibold ${
              breadth >= 60 ? 'text-emerald-600' : breadth >= 40 ? 'text-amber-600' : 'text-rose-500'
            }`}>
              {breadth}%
            </span>
          </div>
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`breadth-bar h-full rounded-full ${
                breadth >= 60 ? 'bg-emerald-400' : breadth >= 40 ? 'bg-amber-400' : 'bg-rose-400'
              }`}
              style={{ width: `${breadth}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs text-slate-400">
          {sector.stock_count ? `${sector.stock_count} stocks` : '—'}
        </span>
        <span className="text-[10px] tracking-widest text-slate-300 uppercase font-semibold">
          Tap ↗
        </span>
      </div>
    </button>
  )
}
