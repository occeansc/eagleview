'use client'

import { Sector, Period, getPeriodValue } from '@/lib/types'

interface Props {
  sector: Sector
  rank: number
  period: Period
  isHot: boolean
  delay: number
  onClick: () => void
}

export default function SectorCard({ sector, rank, period, isHot, delay, onClick }: Props) {
  const value    = getPeriodValue(sector, period)
  const positive = value !== null && value >= 0
  const negative = value !== null && value < 0

  const bg    = positive ? 'bg-emerald-50  border-emerald-100'
              : negative ? 'bg-rose-50     border-rose-100'
              :             'bg-slate-50   border-slate-200'

  const pct   = positive ? 'text-emerald-700'
              : negative ? 'text-rose-700'
              :             'text-slate-400'

  const arrow = positive ? '↗' : negative ? '↘' : '→'

  return (
    <button
      onClick={onClick}
      className={`sector-card card-appear relative rounded-2xl border p-4 md:p-5 text-left w-full ${bg}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {isHot && (
        <span className="hot-badge absolute -top-2 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
          🔥 HOT
        </span>
      )}

      <div className="mb-2.5">
        <span className="text-xs font-semibold text-slate-400 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-full">
          #{rank}
        </span>
      </div>

      <p className="font-semibold text-slate-800 text-sm md:text-base leading-tight mb-3">
        {sector.name}
      </p>

      <p className={`font-mono text-xl md:text-2xl font-medium tracking-tight ${pct} mb-4`}>
        {value !== null
          ? `${arrow} ${value > 0 ? '+' : ''}${value.toFixed(1)}%`
          : <span className="text-slate-300 text-sm">No data</span>
        }
      </p>

      <div className="flex items-center justify-between">
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
