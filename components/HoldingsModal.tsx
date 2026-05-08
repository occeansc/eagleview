'use client'

import { useEffect, useState } from 'react'
import { Holding, Sector, Benchmark, Period, getPeriodValue, getBenchmarkValue } from '@/lib/types'
import { getSupabaseClient } from '@/lib/supabase'

interface Props {
  sector: Sector
  period: Period
  benchmarks: Benchmark[]
  onClose: () => void
}

export default function HoldingsModal({ sector, period, benchmarks, onClose }: Props) {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase
      .from('sector_holdings')
      .select('*')
      .eq('sector_id', sector.id)
      .order('holding_rank', { ascending: true })
      .limit(10)
      .then(({ data }) => {
        setHoldings(data ?? [])
        setLoading(false)
      })
  }, [sector.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const sectorVal = getPeriodValue(sector, period)
  const positive  = sectorVal !== null && sectorVal >= 0
  const pctClass  = positive ? 'text-emerald-600' : 'text-rose-600'
  const barClass  = positive ? 'bg-emerald-400'   : 'bg-rose-400'
  const maxW      = holdings.length ? Math.max(...holdings.map(h => h.weight_pct ?? 0), 1) : 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-panel bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono font-medium text-slate-400">{sector.etf_ticker}</span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{sector.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-3xl leading-none -mt-1 -mr-1 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="flex items-baseline gap-2 mt-3">
            <span className={`font-mono text-2xl font-semibold ${pctClass}`}>
              {sectorVal !== null ? `${sectorVal > 0 ? '+' : ''}${sectorVal.toFixed(2)}%` : '—'}
            </span>
            <span className="text-sm text-slate-400">{period}</span>
            {sector.stock_count && (
              <span className="ml-auto text-xs text-slate-400">{sector.stock_count} holdings</span>
            )}
          </div>
        </div>

        {/* ── Scrollable body ─────────────────── */}
        <div className="overflow-y-auto flex-1">

          {/* ── vs Benchmarks ─────────────────── */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4">
              vs Market
            </p>

            <BenchmarkComparison
              sectorName={sector.name}
              sectorVal={sectorVal}
              benchmarks={benchmarks}
              period={period}
            />
          </div>

          {/* ── Holdings ────────────────────────── */}
          <div className="px-6 pt-5 pb-6">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4">
              Top 10 Holdings
            </p>

            {loading ? (
              <LoadingSkeleton />
            ) : holdings.length === 0 ? (
              <EmptyHoldings />
            ) : (
              <div className="space-y-4">
                {holdings.map((h, i) => (
                  <div key={h.id} style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-slate-300 w-4 text-right shrink-0">{h.holding_rank}</span>
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-slate-800 truncate block">{h.holding_name}</span>
                          {h.holding_ticker && (
                            <span className="text-[10px] font-mono text-slate-400">{h.holding_ticker}</span>
                          )}
                        </div>
                        <span className="font-mono text-xs text-slate-600 ml-3 shrink-0">
                          {h.weight_pct !== null ? `${h.weight_pct.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-6 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`weight-bar h-full rounded-full ${barClass}`}
                        style={{ width: `${((h.weight_pct ?? 0) / maxW) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────── */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Eagleview · Yahoo Finance · {sector.etf_ticker}
          </span>
          <a
            href={`https://finance.yahoo.com/quote/${sector.etf_ticker}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
          >
            View ETF ↗
          </a>
        </div>
      </div>
    </div>
  )
}

/* ── Benchmark vs Sector comparison ───────────────────────────────────── */

interface BenchmarkComparisonProps {
  sectorName: string
  sectorVal: number | null
  benchmarks: Benchmark[]
  period: Period
}

function BenchmarkComparison({ sectorName, sectorVal, benchmarks, period }: BenchmarkComparisonProps) {
  if (!benchmarks.length) {
    return <p className="text-xs text-slate-400 italic">No benchmark data available.</p>
  }

  // All values for the bar scale: sector + all benchmarks
  const allVals = [
    sectorVal ?? 0,
    ...benchmarks.map(b => getBenchmarkValue(b, period) ?? 0),
  ]
  const absMax  = Math.max(...allVals.map(Math.abs), 0.1)
  const midX    = 50 // centre % for the axis line

  const barWidth = (val: number) =>
    `${Math.min((Math.abs(val) / absMax) * 45, 45)}%`

  const Row = ({
    label,
    val,
    isSector = false,
    alpha,
  }: {
    label: string
    val: number | null
    isSector?: boolean
    alpha?: number | null
  }) => {
    const pos = val !== null && val >= 0
    const displayVal = val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '—'

    return (
      <div className={`flex items-center gap-2 py-2 ${isSector ? 'font-semibold' : ''}`}>
        {/* Label */}
        <span className={`text-xs w-24 shrink-0 truncate ${isSector ? 'text-slate-700' : 'text-slate-500'}`}>
          {label}
        </span>

        {/* Diverging bar */}
        <div className="flex-1 flex items-center h-5">
          <div className="w-full relative h-5 flex items-center">
            {/* Centre axis */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200" />

            {/* Bar */}
            {val !== null && (
              <div
                className={`absolute h-3 rounded-sm transition-all duration-500
                  ${isSector
                    ? pos ? 'bg-emerald-500' : 'bg-rose-500'
                    : pos ? 'bg-emerald-200' : 'bg-rose-200'
                  }`}
                style={{
                  width: barWidth(val),
                  left:  pos ? midX + '%'   : undefined,
                  right: pos ? undefined     : midX + '%',
                }}
              />
            )}
          </div>
        </div>

        {/* Value */}
        <span className={`font-mono text-xs w-14 text-right shrink-0
          ${val === null ? 'text-slate-300'
            : pos ? 'text-emerald-700' : 'text-rose-700'}`}
        >
          {displayVal}
        </span>

        {/* Alpha badge (benchmarks only) */}
        {alpha !== undefined && alpha !== null && (
          <span className={`text-[10px] font-semibold w-14 text-right shrink-0
            ${alpha >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}
          >
            {alpha >= 0 ? '+' : ''}{alpha.toFixed(1)}%
          </span>
        )}
        {alpha === undefined && (
          <span className="w-14" /> /* spacer to keep grid aligned */
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Column header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-slate-300 w-24 shrink-0" />
        <span className="flex-1" />
        <span className="text-[10px] text-slate-300 w-14 text-right">Return</span>
        <span className="text-[10px] text-slate-300 w-14 text-right">Alpha</span>
      </div>

      {/* Sector row */}
      <Row label={`▸ ${sectorName}`} val={sectorVal} isSector />

      {/* Divider */}
      <div className="my-1 border-t border-slate-100" />

      {/* Benchmark rows */}
      {benchmarks.map((b) => {
        const bVal  = getBenchmarkValue(b, period)
        const alpha = sectorVal !== null && bVal !== null ? sectorVal - bVal : null
        return (
          <Row key={b.ticker} label={b.name} val={bVal} alpha={alpha} />
        )
      })}

      {/* Alpha legend */}
      <p className="text-[10px] text-slate-300 mt-3 italic">
        Alpha = sector return minus benchmark return for {period}
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex justify-between mb-1.5">
            <div className="h-3 bg-slate-100 rounded w-32" />
            <div className="h-3 bg-slate-100 rounded w-10" />
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function EmptyHoldings() {
  return (
    <div className="text-center py-8">
      <p className="text-3xl mb-2">📡</p>
      <p className="text-slate-500 font-medium text-sm">No holdings data yet</p>
      <p className="text-slate-400 text-xs mt-1">Run the data sync to populate holdings.</p>
    </div>
  )
}
