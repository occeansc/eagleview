'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  SectorHolding, Sector, Benchmark, Period,
  getPeriodValue, getMomentumDelta, getBreadth, formatPrice,
} from '@/lib/types'
import { getSupabaseClient } from '@/lib/supabase'
import { CloseIcon, ZapIcon } from './Icons'

interface Props {
  sector:     Sector
  period:     Period
  benchmarks: Benchmark[]
  onClose:    () => void
}

/** Format an ISO timestamp as "12 Jun, 14:30" in the user's local timezone */
function formatSyncTime(iso: string): string {
  const d = new Date(iso)
  const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${datePart}, ${timePart}`
}

export default function HoldingsModal(props: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(<ModalContent {...props} />, document.body)
}

function ModalContent({ sector, period, benchmarks, onClose }: Props) {
  const [holdings, setHoldings] = useState<SectorHolding[]>([])
  const [loading, setLoading]   = useState(true)
  const scrollRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getSupabaseClient()
      .from('sector_holdings')
      .select('*')
      .eq('sector_id', sector.id)
      .then(({ data }) => { setHoldings(data ?? []); setLoading(false) })
  }, [sector.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const sectorVal     = getPeriodValue(sector, period)
  const momentumDelta = getMomentumDelta(sector, period)
  const breadth       = getBreadth(sector, period)
  const pos           = sectorVal !== null && sectorVal >= 0
  const pctClass      = pos
    ? 'text-emerald-600 drop-shadow-[0_2px_6px_rgba(16,185,129,0.15)]'
    : 'text-rose-600 drop-shadow-[0_2px_6px_rgba(244,63,94,0.12)]'
  const streak        = sector.streak ?? 0

  const sorted = [...holdings].sort((a, b) =>
    (getPeriodValue(b, period) ?? -Infinity) - (getPeriodValue(a, period) ?? -Infinity)
  )
  const posCount = sorted.filter(h => (getPeriodValue(h, period) ?? 0) >= 0).length

  return (
    /* Full-screen fixed overlay — rendered into document.body via portal */
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center sm:items-center sm:p-6"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Sheet / card */}
      <div
        className="modal-sheet w-full sm:max-w-xl sm:rounded-[28px] rounded-t-[28px] flex flex-col overflow-hidden"
        style={{ maxHeight: 'min(92vh, 760px)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Drag handle — mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-300/60 rounded-full" />
        </div>

        {/* ── Sticky header ────────────────────── */}
        <div className="px-6 pt-4 sm:pt-6 pb-5 bg-white border-b border-slate-100/70 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 w-8 h-8 bg-slate-100 hover:bg-slate-200 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Close"
          >
            <CloseIcon size={14} />
          </button>

          <h2 className="text-[22px] font-black tracking-tight text-slate-900 leading-tight pr-10 mb-4">
            {sector.name}
          </h2>

          {/* Return pill */}
          <div className="flex items-baseline gap-2.5 bg-slate-50 border border-slate-100 rounded-[14px] px-4 py-2.5 w-fit mb-3 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]">
            <span className={`font-mono text-[28px] font-extrabold leading-none tabular-nums ${pctClass}`}>
              {sectorVal !== null
                ? `${sectorVal > 0 ? '+' : ''}${sectorVal.toFixed(2)}%`
                : '—'
              }
            </span>
            <span className="text-[10px] uppercase font-black tracking-[0.16em] text-slate-400 shrink-0">
              {period} Avg
            </span>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {momentumDelta !== null && (
              <span className={`flex items-center font-black tracking-[0.12em] text-[9px] uppercase px-2.5 py-1.5 rounded-[8px] border ${
                momentumDelta > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : momentumDelta < 0
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                {momentumDelta > 0 ? 'Mom Up ↑' : momentumDelta < 0 ? 'Mom Down ↓' : 'Flat'}{' '}
                {momentumDelta > 0 ? '+' : ''}{momentumDelta.toFixed(1)}%
              </span>
            )}
            {streak >= 5 && (
              <span className="flex items-center gap-1 px-2.5 py-1.5 font-black uppercase rounded-[8px] bg-orange-50 border border-orange-100 text-[9px] text-orange-600 tracking-widest">
                <ZapIcon size={10} /> {streak} syncs
              </span>
            )}
            {!loading && holdings.length > 0 && (
              <span className="text-[12px] ml-auto">
                <span className="text-emerald-600 font-bold">{posCount}↑</span>
                {' '}
                <span className="text-rose-500 font-bold">{holdings.length - posCount}↓</span>
                {breadth !== null && (
                  <span className="text-slate-400 text-[11px]"> · {breadth}% breadth</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* ── Scrollable body ─────────────────── */}
        <div className="overflow-y-auto flex-1 overscroll-contain bg-white" ref={scrollRef}>

          {/* vs Market */}
          <div className="px-6 py-5 bg-[#FCFCFD] border-b border-slate-100">
            <p className="text-[9px] font-black tracking-[0.18em] uppercase text-slate-400 mb-4">
              vs Market
            </p>
            <BenchmarkRows
              sectorVal={sectorVal}
              sectorName={sector.name}
              benchmarks={benchmarks}
              period={period}
            />
          </div>

          {/* Stocks */}
          <div className="pb-6">
            {/* Sticky table header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-3 flex items-center justify-between">
              <p className="text-[13px] font-bold text-slate-800">
                Assessed Assets
                <span className="ml-1.5 text-slate-400 font-normal text-[11px]">
                  ({sector.stock_count ?? holdings.length})
                </span>
              </p>
              {!loading && (
                <p className="text-[10px] text-slate-400 font-semibold tracking-wide">
                  Ranked by {period}
                </p>
              )}
            </div>

            {/* Column labels */}
            {!loading && sorted.length > 0 && (
              <div className="flex items-center gap-2 px-6 pt-3 pb-1">
                <span className="w-5 shrink-0" />
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-300 w-12 text-center shrink-0">Ticker</span>
                <span className="flex-1 text-[9px] font-black tracking-widest uppercase text-slate-300">Company</span>
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-300 w-16 text-right shrink-0">Price</span>
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-300 w-14 text-right shrink-0">Return</span>
              </div>
            )}

            {loading ? (
              <LoadingSkeleton />
            ) : sorted.length === 0 ? (
              <EmptyStocks />
            ) : (
              <div className="px-3 mt-1">
                {sorted.map((h, i) => {
                  const val   = getPeriodValue(h, period)
                  const isPos = val !== null && val >= 0
                  return (
                    <div
                      key={h.id}
                      className="flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-[11px] text-slate-300 w-5 text-right shrink-0 font-mono tabular-nums">
                        {i + 1}
                      </span>
                      <span className={`font-mono text-[11px] font-bold px-1.5 py-1 rounded-[8px] shrink-0 w-12 text-center ${
                        isPos ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {h.ticker}
                      </span>
                      <span className="text-[13px] text-slate-600 font-medium flex-1 truncate min-w-0">
                        {h.company_name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 w-16 text-right shrink-0 tabular-nums">
                        {formatPrice(h.price)}
                      </span>
                      <span className={`font-mono text-[13px] font-bold w-14 text-right shrink-0 tabular-nums ${
                        val === null ? 'text-slate-300' : isPos ? 'text-emerald-600' : 'text-rose-500'
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
        <div className="px-6 py-3 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            Eagleview v4.2.5 · Yahoo Finance
          </p>
          <p className="text-[10px] text-slate-300 tabular-nums">
            Last sync: {formatSyncTime(sector.updated_at)}
          </p>
        </div>
      </div>
    </div>
  )
}

function BenchmarkRows({ sectorVal, sectorName, benchmarks, period }: {
  sectorVal:  number | null
  sectorName: string
  benchmarks: Benchmark[]
  period:     Period
}) {
  if (!benchmarks.length) return null
  const allVals = [sectorVal ?? 0, ...benchmarks.map(b => getPeriodValue(b, period) ?? 0)]
  const absMax  = Math.max(...allVals.map(Math.abs), 0.1)

  const Row = ({ label, val, bold, alpha }: {
    label: string; val: number | null; bold?: boolean; alpha?: number | null
  }) => {
    const isPos = val !== null && val >= 0
    const w = `${Math.min((Math.abs(val ?? 0) / absMax) * 44, 44)}%`
    return (
      <div className={`flex items-center gap-2 py-1.5 ${bold ? 'font-semibold' : ''}`}>
        <span className={`text-[12px] w-28 shrink-0 truncate ${bold ? 'text-slate-800' : 'text-slate-500'}`}>
          {label}
        </span>
        <div className="flex-1 relative h-4 flex items-center">
          <div className="absolute inset-y-0 left-1/2 w-px bg-slate-100" />
          {val !== null && (
            <div
              className={`absolute h-2.5 rounded-sm ${
                bold ? (isPos ? 'bg-emerald-500' : 'bg-rose-500') : (isPos ? 'bg-emerald-200' : 'bg-rose-200')
              }`}
              style={{ width: w, left: isPos ? '50%' : undefined, right: isPos ? undefined : '50%' }}
            />
          )}
        </div>
        <span className={`font-mono text-[12px] w-14 text-right shrink-0 tabular-nums ${
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
        <span className="text-[9px] text-slate-300 w-14 text-right tracking-widest uppercase">Return</span>
        <span className="text-[9px] text-slate-300 w-12 text-right tracking-widest uppercase">Alpha</span>
      </div>
      <Row label={`▸ ${sectorName.length > 16 ? sectorName.slice(0,15)+'…' : sectorName}`} val={sectorVal} bold />
      <div className="my-1.5 border-t border-slate-100" />
      {benchmarks.map(b => {
        const bVal  = getPeriodValue(b, period)
        const alpha = sectorVal != null && bVal != null ? sectorVal - bVal : null
        return <Row key={b.ticker} label={b.name} val={bVal} alpha={alpha} />
      })}
      <p className="text-[9px] text-slate-300 mt-2">Alpha = sector minus benchmark · {period}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="px-6 pt-4 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-2 py-2 px-3">
          <div className="h-3 w-5 bg-slate-100 rounded" />
          <div className="h-7 w-12 bg-slate-100 rounded-[8px]" />
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
    <div className="text-center py-12 px-6">
      <p className="text-slate-500 font-semibold text-[13px]">No stock data yet</p>
      <p className="text-slate-400 text-[11px] mt-1">Run the data sync to populate.</p>
    </div>
  )
}
