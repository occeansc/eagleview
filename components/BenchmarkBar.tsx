'use client'

import { Benchmark, Period, getPeriodValue } from '@/lib/types'

interface Props {
  benchmarks: Benchmark[]
  period: Period
}

const META: Record<string, { icon: string; short: string }> = {
  '^GSPC': { icon: '📊', short: 'S&P 500' },
  '^IXIC': { icon: '💻', short: 'Nasdaq' },
  '^DJI':  { icon: '🏭', short: 'Dow' },
  'EFA':   { icon: '🌍', short: 'Intl Dev' },
}

export default function BenchmarkBar({ benchmarks, period }: Props) {
  if (!benchmarks.length) return null

  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2.5">
        Market Pulse
      </p>

      {/* 2×2 grid on mobile, single row on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {benchmarks.map((b) => {
          const val  = getPeriodValue(b, period)
          const pos  = val !== null && val >= 0
          const meta = META[b.ticker] ?? { icon: '📈', short: b.name }

          return (
            <div
              key={b.ticker}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                ${pos
                  ? 'bg-emerald-50 border-emerald-100'
                  : 'bg-rose-50 border-rose-100'
                }`}
            >
              <span className="text-base select-none shrink-0">{meta.icon}</span>
              <div className="min-w-0">
                <p className="text-slate-500 text-[10px] font-semibold tracking-wide truncate">
                  {meta.short}
                </p>
                <p className={`font-mono font-semibold text-sm leading-tight ${
                  val === null ? 'text-slate-300' : pos ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {val !== null ? `${pos ? '+' : ''}${val.toFixed(2)}%` : '—'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-slate-300 text-right mt-1.5 italic">via Yahoo Finance</p>
    </div>
  )
}
