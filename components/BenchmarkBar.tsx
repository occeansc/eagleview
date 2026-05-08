'use client'

import { Benchmark, Period, getBenchmarkValue } from '@/lib/types'

interface Props {
  benchmarks: Benchmark[]
  period: Period
}

const ICONS: Record<string, string> = {
  '^GSPC': '📊',
  '^IXIC': '💻',
  '^DJI':  '🏭',
}

export default function BenchmarkBar({ benchmarks, period }: Props) {
  if (!benchmarks.length) return null

  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2.5 pl-0.5">
        Market Pulse
      </p>
      <div className="flex flex-wrap gap-2">
        {benchmarks.map((b) => {
          const val = getBenchmarkValue(b, period)
          const pos = val !== null && val >= 0

          return (
            <div
              key={b.ticker}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium
                ${pos
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}
            >
              <span className="text-base select-none">{ICONS[b.ticker] ?? '📈'}</span>
              <span className="text-slate-600 font-semibold">{b.name}</span>
              <span className={`font-mono font-semibold ${pos ? 'text-emerald-700' : 'text-rose-700'}`}>
                {val !== null
                  ? `${pos ? '+' : ''}${val.toFixed(2)}%`
                  : '—'
                }
              </span>
            </div>
          )
        })}

        <div className="flex items-center ml-auto">
          <p className="text-[10px] text-slate-300 tracking-wide italic">
            via Yahoo Finance
          </p>
        </div>
      </div>
    </div>
  )
}
