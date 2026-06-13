'use client'

import { Benchmark, Period, getPeriodValue } from '@/lib/types'
import { BarChartIcon, LineChartIcon, BuildingIcon, GlobeIcon } from './Icons'

interface Props {
  benchmarks: Benchmark[]
  period:     Period
}

const META: Record<string, {
  Icon: React.ComponentType<{ size?: number; className?: string }>
  short: string
}> = {
  '^GSPC': { Icon: BarChartIcon,  short: 'S&P 500'    },
  '^IXIC': { Icon: LineChartIcon, short: 'Nasdaq'      },
  '^DJI':  { Icon: BuildingIcon,  short: 'Dow'         },
  'EFA':   { Icon: GlobeIcon,     short: 'Intl Dev'    },
}

export default function BenchmarkBar({ benchmarks, period }: Props) {
  if (!benchmarks.length) return null

  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <p className="text-[10px] font-bold tracking-[0.20em] text-slate-400 uppercase">
          Market Pulse
        </p>
        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:block opacity-70">
          Via Yahoo Finance
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {benchmarks.map(b => {
          const val  = getPeriodValue(b, period)
          const pos  = val !== null && val >= 0
          const meta = META[b.ticker] ?? { Icon: BarChartIcon, short: b.name }
          const { Icon } = meta
          const bloomColor = pos ? 'bg-emerald-500' : 'bg-rose-500'

          return (
            <div
              key={b.ticker}
              className={`bench-tile relative rounded-[20px] px-4 py-3.5 overflow-hidden group ${
                pos ? 'border-emerald-100/60' : 'border-rose-100/60'
              }`}
            >
              {/* Bloom — top-right corner */}
              <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full blur-[20px] pointer-events-none opacity-[0.14] group-hover:opacity-[0.28] group-hover:scale-[1.6] transition-all duration-600 ${bloomColor}`} />

              {/* Name + icon row */}
              <div className="flex items-center justify-between mb-1.5 relative z-10">
                <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-slate-500 group-hover:text-slate-800 transition-colors">
                  {meta.short}
                </p>
                <Icon
                  size={13}
                  className={`opacity-70 group-hover:opacity-100 transition-opacity ${
                    pos ? 'text-emerald-500' : 'text-rose-400'
                  }`}
                />
              </div>

              {/* Value */}
              <p className={`font-mono font-bold text-[18px] tracking-tight leading-none tabular-nums relative z-10 ${
                val === null ? 'text-slate-300'
                  : pos ? 'text-emerald-600 group-hover:text-emerald-700'
                  : 'text-rose-600 group-hover:text-rose-700'
              } transition-colors`}>
                {val !== null ? `${pos ? '+' : ''}${val.toFixed(2)}%` : '—'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
