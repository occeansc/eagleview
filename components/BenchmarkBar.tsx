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
    <div className="mb-6">
      <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2.5">
        Market Pulse
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {benchmarks.map((b) => {
          const val  = getPeriodValue(b, period)
          const pos  = val !== null && val >= 0
          const meta = META[b.ticker] ?? { Icon: BarChartIcon, short: b.name }
          const { Icon } = meta
          return (
            <div key={b.ticker} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${pos ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <Icon size={16} className={pos ? 'text-emerald-600' : 'text-rose-500'} />
              <div className="min-w-0">
                <p className="text-slate-500 text-[10px] font-semibold tracking-wide">{meta.short}</p>
                <p className={`font-mono font-semibold text-sm ${val === null ? 'text-slate-300' : pos ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {val !== null ? `${pos ? '+' : ''}${val.toFixed(2)}%` : '—'}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-slate-300 text-right mt-1.5">via Yahoo Finance</p>
    </div>
  )
}
