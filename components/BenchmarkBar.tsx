'use client'

import { Benchmark, Period, getPeriodValue } from '@/lib/types'
import { BarChartIcon, LineChartIcon, BuildingIcon, GlobeIcon } from './Icons'

interface Props {
  benchmarks: Benchmark[]
  period: Period
}

const META: Record<string, { Icon: React.ComponentType<{size?: number; className?: string}>; short: string }> = {
  '^GSPC': { Icon: BarChartIcon,   short: 'S&P 500'   },
  '^IXIC': { Icon: LineChartIcon,  short: 'Nasdaq'     },
  '^DJI':  { Icon: BuildingIcon,   short: 'Dow'        },
  'EFA':   { Icon: GlobeIcon,      short: 'Intl Dev'   },
}

export default function BenchmarkBar({ benchmarks, period }: Props) {
  if (!benchmarks.length) return null
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3.5 px-1">
         <p className="text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase drop-shadow-sm">
           Market Pulse
         </p>
         <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:inline-block opacity-80">Sync Via Yahoo Finance</span>
      </div>

      {/* Soft rounded elevated UI Capsules layout style replacing flat colored backgrounds */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {benchmarks.map((b) => {
          const val  = getPeriodValue(b, period)
          const pos  = val !== null && val >= 0
          const meta = META[b.ticker] ?? { Icon: BarChartIcon, short: b.name }
          const { Icon } = meta

          return (
            <div key={b.ticker} className={`relative flex flex-col justify-center px-4 py-3.5 rounded-[22px] bg-white border ${pos ? 'border-emerald-100/70 shadow-[0_4px_16px_-4px_rgba(16,185,129,0.06)]' : 'border-rose-100/70 shadow-[0_4px_16px_-4px_rgba(244,63,94,0.06)]'} group transition-all duration-300 hover:-translate-y-[2px] overflow-hidden`}>
              
              {/* Contextual Glowing Gradient Bloom Inside Standard Card Corners */}
              <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-[24px] pointer-events-none -mt-8 -mr-8 transition-transform duration-700 group-hover:scale-[1.8] opacity-15 ${pos ? 'bg-emerald-500' : 'bg-rose-500'}`} />

              <div className="flex justify-between items-start z-10 w-full mb-1">
                <p className="text-slate-500 group-hover:text-slate-800 transition-colors text-[10px] font-bold tracking-widest uppercase">
                  {meta.short}
                </p>
                <Icon size={14} className={`opacity-80 transition-opacity group-hover:opacity-100 ${pos ? 'text-emerald-500' : 'text-rose-400'}`} />
              </div>
              <p className={`font-mono font-bold tracking-tight text-[18px] z-10 ${val === null ? 'text-slate-300' : pos ? 'text-emerald-600 group-hover:text-emerald-700' : 'text-rose-600 group-hover:text-rose-700'} transition-colors leading-none`}>
                {val !== null ? `${pos ? '+' : ''}${val.toFixed(2)}%` : '—'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}