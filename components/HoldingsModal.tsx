'use client'

import { useEffect, useState } from 'react'
import {
  SectorHolding, Sector, Benchmark, Period,
  getPeriodValue, getMomentumDelta, getBreadth,
} from '@/lib/types'
import { getSupabaseClient } from '@/lib/supabase'

interface Props {
  sector: Sector
  period: Period
  benchmarks: Benchmark[]
  onClose: () => void
}

export default function HoldingsModal({ sector, period, benchmarks, onClose }: Props) {
  const [holdings, setHoldings] = useState<SectorHolding[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getSupabaseClient()
      .from('sector_holdings')
      .select('*')
      .eq('sector_id', sector.id)
      .then(({ data }) => { setHoldings(data ?? []); setLoading(false) })
  }, [sector.id])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const sectorVal     = getPeriodValue(sector, period)
  const momentumDelta = getMomentumDelta(sector, period)
  const breadth       = getBreadth(sector, period)
  const pos           = sectorVal !== null && sectorVal >= 0
  const pctClass      = pos ? 'text-emerald-600' : 'text-rose-600'
  const streak        = sector.streak ?? 0

  const sorted = [...holdings].sort((a, b) => {
    const av = getPeriodValue(a, period) ?? -Infinity
    const bv = getPeriodValue(b, period) ?? -Infinity
    return bv - av
  })
  const posCount = sorted.filter(h => (getPeriodValue(h, period) ?? 0) >= 0).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-panel bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 pr-8">{sector.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {sector.stock_count ?? holdings.length} stocks · equal-weighted
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 text-slate-400 hover:text-slate-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-2xl"
            >×</button>
          </div>

          {/* Return + momentum delta + streak */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`font-mono text-2xl font-semibold ${pctClass}`}>
              {sectorVal !== null ? `${sectorVal > 0 ? '+' : ''}${sectorVal.toFixed(2)}%` : '—'}
            </span>
            <span className="text-sm text-slate-400">{period}</span>

            {momentumDelta !== null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                momentumDelta > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : momentumDelta < 0 ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                {momentumDelta > 0 ? '↑' : momentumDelta < 0 ? '↓' : '='} {momentumDelta > 0 ? '+' : ''}{momentumDelta.toFixed(1)}%
              </span>
            )}

            {streak >= 3 && (
              <span className="text-xs text-orange-500 font-semibold ml-auto">
                🔥 {streak} streak
              </span>
            )}

            {!loading && holdings.length > 0 && (
              <span className="text-xs font-medium ml-auto">
                <span className="text-emerald-600">{posCount}↑</span>
                {' '}
                <span className="text-rose-500">{holdings.length - posCount}↓</span>
                {breadth !== null && <span className="text-slate-400 ml-1">· {breadth}% breadth</span>}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── vs Market ─────────────────────────────── */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3">
              vs Market
            </p>
            <BenchmarkComparison
              sectorVal={sectorVal}
              sectorName={sector.name}
              benchmarks={benchmarks}
              period={period}
            />
          </div>

          {/* ── Stocks ranked ──────────────────────────── */}
          <div className="px-6 pt-5 pb-6">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4">
              Stocks · ranked by {period}
            </p>

            {loading ? <LoadingSkeleton />
              : sorted.length === 0 ? <EmptyStocks />
              : (
                <div className="space-y-0.5">
                  {sorted.map((h, i) => {
                    const val   = getPeriodValue(h, period)
                    const isPos = val !== null && val >= 0
                    return (
                      <div
                        key={h.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs text-slate-300 w-5 text-right shrink-0">{i + 1}</span>
                        <span className={`font-mono text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 min-w-[44px] text-center ${
                          isPos ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {h.ticker}
                        </span>
                        <span className="text-sm text-slate-600 flex-1 truncate min-w-0">
                          {h.company_name}
                        </span>
                        <span className={`font-mono text-sm font-semibold shrink-0 ${
                          val === null ? 'text-slate-300'
                            : isPos ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {val !== null ? `${isPos ? '+' : ''}${val.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 shrink-0">
          <p className="text-xs text-slate-400">Eagleview v3.1 · Yahoo Finance · equal-weighted</p>
        </div>
      </div>
    </div>
  )
}

function BenchmarkComparison({ sectorVal, sectorName, benchmarks, period }: {
  sectorVal: number | null; sectorName: string; benchmarks: Benchmark[]; period: Period
}) {
  if (!benchmarks.length) return null
  const allVals = [sectorVal ?? 0, ...benchmarks.map(b => getPeriodValue(b, period) ?? 0)]
  const absMax  = Math.max(...allVals.map(Math.abs), 0.1)

  const Row = ({ label, val, bold, alpha }: {
    label: string; val: number | null; bold?: boolean; alpha?: number | null
  }) => {
    const isPos = val !== null && val >= 0
    const w = `${Math.min((Math.abs(val ?? 0) / absMax) * 45, 45)}%`
    return (
      <div className={`flex items-center gap-2 py-1.5 ${bold ? 'font-semibold' : ''}`}>
        <span className={`text-xs w-28 shrink-0 truncate ${bold ? 'text-slate-700' : 'text-slate-500'}`}>{label}</span>
        <div className="flex-1 relative h-4 flex items-center">
          <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200" />
          {val !== null && (
            <div
              className={`absolute h-2.5 rounded-sm ${bold
                ? isPos ? 'bg-emerald-500' : 'bg-rose-500'
                : isPos ? 'bg-emerald-200' : 'bg-rose-200'}`}
              style={{ width: w, left: isPos ? '50%' : undefined, right: isPos ? undefined : '50%' }}
            />
          )}
        </div>
        <span className={`font-mono text-xs w-14 text-right shrink-0 ${
          val === null ? 'text-slate-300' : isPos ? 'text-emerald-700' : 'text-rose-600'}`}>
          {val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '—'}
        </span>
        <span className={`text-[10px] font-semibold w-12 text-right shrink-0 ${
          alpha == null ? 'text-transparent' : alpha >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
          {alpha != null ? `${alpha >= 0 ? '+' : ''}${alpha.toFixed(1)}%` : '·'}
        </span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-28 shrink-0" /><span className="flex-1" />
        <span className="text-[10px] text-slate-300 w-14 text-right">Return</span>
        <span className="text-[10px] text-slate-300 w-12 text-right">Alpha</span>
      </div>
      <Row label={`▸ ${sectorName}`} val={sectorVal} bold />
      <div className="my-1 border-t border-slate-100" />
      {benchmarks.map(b => {
        const bVal  = getPeriodValue(b, period)
        const alpha = sectorVal != null && bVal != null ? sectorVal - bVal : null
        return <Row key={b.ticker} label={b.name} val={bVal} alpha={alpha} />
      })}
      <p className="text-[10px] text-slate-300 mt-2 italic">Alpha = sector minus benchmark · {period}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-3 py-2 px-3">
          <div className="h-3 w-4 bg-slate-100 rounded" />
          <div className="h-5 w-14 bg-slate-100 rounded" />
          <div className="h-3 flex-1 bg-slate-100 rounded" />
          <div className="h-3 w-12 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  )
}

function EmptyStocks() {
  return (
    <div className="text-center py-10">
      <p className="text-3xl mb-2">📡</p>
      <p className="text-slate-500 font-medium text-sm">No stock data yet</p>
      <p className="text-slate-400 text-xs mt-1">Run the data sync to populate stocks.</p>
    </div>
  )
}
