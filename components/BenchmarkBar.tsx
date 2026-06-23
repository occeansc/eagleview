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

          // Magnitude-aware glow — benchmarks are smaller-scale than sectors
          const mag       = Math.abs(val ?? 0)
          const baseAlpha = Math.min(0.08 + (mag / 50) * 0.18, 0.28)
          const hoverAlpha = Math.min(baseAlpha + 0.14, 0.42)
          const rgb       = pos ? '16,185,129' : '244,63,94'
          const baseGlow  = `radial-gradient(circle at top right, rgba(${rgb},${baseAlpha.toFixed(2)}) 0%, transparent 60%)`
          const hoverGlow = `radial-gradient(circle at top right, rgba(${rgb},${hoverAlpha.toFixed(2)}) 0%, transparent 68%)`

          return (
            <div
              key={b.ticker}
              className={`bench-tile relative rounded-[20px] px-4 py-3.5 overflow-hidden group ${
                pos ? 'border-emerald-100/60' : 'border-rose-100/60'
              }`}
            >
              {/* Base glow — magnitude-aware, always visible */}
              <div
                className="absolute inset-0 rounded-[20px] overflow-hidden pointer-events-none"
                style={{ background: baseGlow }}
              />
              {/* Hover glow — amplified */}
              <div
                className="absolute inset-0 rounded-[20px] overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: hoverGlow }}
              />

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
