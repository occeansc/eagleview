'use client'

import { useEffect, useState } from 'react'
import {
  SectorHolding, Sector, Benchmark, Period,
  getPeriodValue, getMomentumDelta, getBreadth, formatPrice,
} from '@/lib/types'
import { getSupabaseClient } from '@/lib/supabase'
import { CloseIcon, ZapIcon } from './Icons'

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-panel bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">

        {/* Drag handle — mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* ── Header ──────────────────────────────── */}
        <div className="px-5 pt-3 sm:pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-4">
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{sector.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {sector.stock_count ?? holdings.length} stocks · equal-weighted
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 text-slate-400 hover:text-slate-700 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
            >
              <CloseIcon size={16} stroke="currentColor" />
            </button>
          </div>

          {/* Return + badges */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`font-mono text-2xl font-bold ${pctClass}`}>
              {sectorVal !== null ? `${sectorVal > 0 ? '+' : ''}${sectorVal.toFixed(2)}%` : '—'}
            </span>
            <span className="text-sm text-slate-400 font-medium">{period}</span>

            {momentumDelta !== null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                momentumDelta > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : momentumDelta < 0
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                {momentumDelta > 0 ? '↑' : momentumDelta < 0 ? '↓' : '='}{' '}
                {momentumDelta > 0 ? '+' : ''}{momentumDelta.toFixed(1)}%
              </span>
            )}

            {streak >= 5 && (
              <span className="flex items-center gap-1 text-xs text-orange-500 font-semibold ml-auto">
                <ZapIcon size={11} stroke="currentColor" /> {streak} syncs
              </span>
            )}

            {!loading && holdings.length > 0 && (
              <span className="text-xs ml-auto">
                <span className="text-emerald-600 font-semibold">{posCount}↑</span>
                {' '}
                <span className="text-rose-500 font-semibold">{holdings.length - posCount}↓</span>
                {breadth !== null && <span className="text-slate-400"> · {breadth}% breadth</span>}
              </span>
            )}
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────── */}
        <div className="overflow-y-auto flex-1">

          {/* vs Market */}
          <div className="px-5 pt-4 pb-4 border-b border-slate-100">
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

          {/* Stocks */}
          <div className="px-5 pt-4 pb-6">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3">
              Stocks · ranked by {period}
            </p>

            {/* Column labels */}
            {!loading && sorted.length > 0 && (
              <div className="flex items-center gap-2 px-2 mb-1">
                <span className="w-5 shrink-0" />
                <span className="text-[9px] font-bold tracking-widest text-slate-300 uppercase w-12 shrink-0 text-center">Ticker</span>
                <span className="flex-1 text-[9px] font-bold tracking-widest text-slate-300 uppercase">Company</span>
                <span className="text-[9px] font-bold tracking-widest text-slate-300 uppercase w-16 text-right shrink-0">Price</span>
                <span className="text-[9px] font-bold tracking-widest text-slate-300 uppercase w-14 text-right shrink-0">Return</span>
              </div>
            )}

            {loading ? <LoadingSkeleton /> : sorted.length === 0 ? <EmptyStocks /> : (
              <div className="space-y-0.5">
                {sorted.map((h, i) => {
                  const val   = getPeriodValue(h, period)
                  const isPos = val !== null && val >= 0
                  return (
                    <div
                      key={h.id}
                      className="flex items-center gap-2 py-2 px-2 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      {/* Rank */}
                      <span className="text-xs text-slate-300 w-5 text-right shrink-0 tabular-nums">{i + 1}</span>

                      {/* Ticker chip */}
                      <span className={`font-mono text-xs font-bold px-1.5 py-1 rounded-lg shrink-0 w-12 text-center ${
                        isPos ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {h.ticker}
                      </span>

                      {/* Company name */}
                      <span className="text-sm text-slate-600 flex-1 truncate min-w-0">
                        {h.company_name}
                      </span>

                      {/* Price */}
                      <span className="font-mono text-xs text-slate-500 w-16 text-right shrink-0 tabular-nums">
                        {formatPrice(h.price)}
                      </span>

                      {/* Return */}
                      <span className={`font-mono text-sm font-bold w-14 text-right shrink-0 tabular-nums ${
                        val === null ? 'text-slate-300'
                          : isPos ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {val !== null ? `${isPos ? '+' : ''}${val.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            Eagleview v3.1.2 · Yahoo Finance · equal-weighted
          </p>
          <p className="text-[10px] text-slate-300">
            Prices as of last sync
          </p>
        </div>
      </div>
    </div>
  )
}

function BenchmarkComparison({ sectorVal, sectorName, benchmarks, period }: {
  sectorVal: number | null; sectorName: string; benchmarks: Benchmark[]; period: Period
}) {
  if (!benchmarks.length) return null
  const allVals = [sectorVal ?? 0, ...benchmarks.map(b => getPeriodValue(b as unknown as Sector, period) ?? 0)]
  const absMax  = Math.max(...allVals.map(Math.abs), 0.1)

  const Row = ({ label, val, bold, alpha }: {
    label: string; val: number | null; bold?: boolean; alpha?: number | null
  }) => {
    const isPos = val !== null && val >= 0
    const w = `${Math.min((Math.abs(val ?? 0) / absMax) * 44, 44)}%`
    return (
      <div className={`flex items-center gap-2 py-1.5 ${bold ? 'font-semibold' : ''}`}>
        <span className={`text-xs w-28 shrink-0 truncate ${bold ? 'text-slate-800' : 'text-slate-500'}`}>{label}</span>
        <div className="flex-1 relative h-4 flex items-center">
          <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200" />
          {val !== null && (
            <div
              className={`absolute h-2.5 rounded-sm ${
                bold ? (isPos ? 'bg-emerald-500' : 'bg-rose-500')
                     : (isPos ? 'bg-emerald-200' : 'bg-rose-200')
              }`}
              style={{ width: w, left: isPos ? '50%' : undefined, right: isPos ? undefined : '50%' }}
            />
          )}
        </div>
        <span className={`font-mono text-xs w-14 text-right shrink-0 tabular-nums ${
          val === null ? 'text-slate-300' : isPos ? 'text-emerald-700' : 'text-rose-600'
        }`}>
          {val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(1)}%` : '—'}
        </span>
        <span className={`text-[10px] font-bold w-12 text-right shrink-0 tabular-nums ${
          alpha == null ? 'invisible' : alpha >= 0 ? 'text-emerald-600' : 'text-rose-500'
        }`}>
          {alpha != null ? `${alpha >= 0 ? '+' : ''}${alpha.toFixed(1)}%` : '0%'}
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
      <Row label={`▸ ${sectorName.length > 16 ? sectorName.slice(0,15)+'…' : sectorName}`} val={sectorVal} bold />
      <div className="my-1 border-t border-slate-100" />
      {benchmarks.map(b => {
        const bVal  = getPeriodValue(b as unknown as Sector, period)
        const alpha = sectorVal != null && bVal != null ? sectorVal - bVal : null
        return <Row key={b.ticker} label={b.name} val={bVal} alpha={alpha} />
      })}
      <p className="text-[9px] text-slate-300 mt-2">Alpha = sector minus benchmark · {period}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-2 py-2 px-2">
          <div className="h-3 w-5 bg-slate-100 rounded" />
          <div className="h-7 w-12 bg-slate-100 rounded-lg" />
          <div className="h-3 flex-1 bg-slate-100 rounded" />
          <div className="h-3 w-16 bg-slate-100 rounded" />
          <div className="h-3 w-14 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  )
}

function EmptyStocks() {
  return (
    <div className="text-center py-10">
      <p className="text-slate-500 font-medium text-sm">No stock data yet</p>
      <p className="text-slate-400 text-xs mt-1">Run the data sync to populate stocks.</p>
    </div>
  )
}
