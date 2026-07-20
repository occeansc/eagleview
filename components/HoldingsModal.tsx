'use client'

import { useEffect, useState, useRef, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import {
  SectorHolding, Sector, Benchmark, Period,
  getPeriodValue, getMomentumDelta, getBreadth, getRankChange, formatPrice, PERIOD_LABELS,
} from '@/lib/types'
import { getSupabaseClient } from '@/lib/supabase'
import { CloseIcon, ZapIcon, ChevronDownIcon } from './Icons'
import TickerModal from './TickerModal'

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
  const [holdings, setHoldings]     = useState<SectorHolding[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedTicker, setSelectedTicker] = useState<SectorHolding | null>(null)
  const [localPeriod, setLocalPeriod]   = useState<Period>(period)
  const [dropdownOpen, setDropdownOpen] = useState<'return' | 'ranked' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const scrollRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getSupabaseClient()
      .from('sector_holdings')
      .select('*')
      .eq('sector_id', sector.id)
      .then(({ data }) => { setHoldings(data ?? []); setLoading(false) })
  }, [sector.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onClickOutsideDropdown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(null)
    }
    document.addEventListener('mousedown', onClickOutsideDropdown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClickOutsideDropdown)
    }
  }, [onClose])

  // Lock body scroll — position:fixed (not just overflow:hidden) because
  // iOS Safari can still scroll the background via touch gestures with
  // overflow:hidden alone; fixing position genuinely removes the body
  // from document flow, which iOS respects correctly.
  useEffect(() => {
    const scrollY = window.scrollY
    const body = document.body
    const prev = {
      position: body.style.position, top: body.style.top,
      width: body.style.width, overflow: body.style.overflow,
    }
    body.style.position = 'fixed'
    body.style.top      = `-${scrollY}px`
    body.style.width    = '100%'
    body.style.overflow = 'hidden'
    return () => {
      body.style.position = prev.position
      body.style.top      = prev.top
      body.style.width    = prev.width
      body.style.overflow = prev.overflow
      window.scrollTo(0, scrollY)
    }
  }, [])

  const sectorVal     = getPeriodValue(sector, localPeriod)
  const momentumDelta = getMomentumDelta(sector, localPeriod)
  const breadth       = getBreadth(sector, localPeriod)
  const rankChange    = getRankChange(sector, localPeriod)
  const pos           = sectorVal !== null && sectorVal >= 0
  const pctClass      = pos
    ? 'text-emerald-600 dark:text-emerald-400 drop-shadow-[0_2px_6px_rgba(16,185,129,0.15)]'
    : 'text-rose-600 dark:text-rose-400 drop-shadow-[0_2px_6px_rgba(244,63,94,0.12)]'
  const streak        = sector.streak ?? 0

  // Detect RISING — same logic as SectorCard/SectorGrid
  const periodRankVal =
    localPeriod === '1D' ? (sector.day_rank       ?? 999) :
    localPeriod === '1W' ? (sector.week_rank      ?? 999) :
    localPeriod === '1M' ? (sector.month_rank     ?? 999) :
    localPeriod === '3M' ? (sector.quarter_rank   ?? 999) :
    localPeriod === '6M' ? (sector.half_year_rank ?? 999) :
    localPeriod === '1Y' ? (sector.year_rank      ?? 999) :
    localPeriod === '5Y' ? (sector.five_year_rank ?? 999) :
                           (sector.ytd_rank       ?? 999)
  const isRisingSector = periodRankVal > 2 && rankChange !== null && rankChange >= 5

  // Gradient — RISING gets sky-blue (momentum signal matches the card banner colour)
  // All others use performance direction: emerald for positive, rose for negative
  const magnitude  = Math.abs(sectorVal ?? 0)
  const gradAlpha  = sectorVal === null ? 0 : Math.min(0.08 + (magnitude / 100) * 0.16, 0.22)
  const gradRgb    = isRisingSector ? '56,189,248'       // sky-400
                   : pos            ? '16,185,129'       // emerald
                   :                  '244,63,94'        // rose
  const headerBg   = `linear-gradient(180deg, rgba(${gradRgb},${gradAlpha}) 0%, rgba(255,255,255,0) 100%)`
  const handlePill = isRisingSector ? 'bg-sky-300/50 dark:bg-sky-400/50'
                   : pos            ? 'bg-emerald-300/50 dark:bg-emerald-400/50'
                   :                  'bg-rose-300/50 dark:bg-rose-400/50'

  const sorted = [...holdings].sort((a, b) =>
    (getPeriodValue(b, localPeriod) ?? -Infinity) - (getPeriodValue(a, localPeriod) ?? -Infinity)
  )
  const posCount = sorted.filter(h => (getPeriodValue(h, localPeriod) ?? 0) >= 0).length

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
        {/* ── Unified gradient top section: drag handle + header ── */}
        <div className="shrink-0" style={{ background: headerBg }}>

          {/* Drag handle — mobile, pill now tinted */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className={`w-10 h-1 rounded-full ${handlePill}`} />
          </div>

          {/* ── Sticky header ────────────────────── */}
          <div className="px-6 pt-4 sm:pt-6 pb-5 border-b border-slate-100/70 dark:border-white/10 relative">
            <button
              onClick={onClose}
              className="absolute right-5 top-5 w-8 h-8 bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shadow-sm"
              aria-label="Close"
            >
              <CloseIcon size={14} />
            </button>

            <h2 className="text-[22px] font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight pr-10 mb-4">
              {sector.name}
            </h2>

            {/* Return pill — click to change period */}
            <div className="relative w-fit mb-3">
              <button
                onClick={() => setDropdownOpen(dropdownOpen === 'return' ? null : 'return')}
                className="flex items-baseline gap-2.5 bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 border border-slate-100 dark:border-white/10 hover:border-slate-200 dark:hover:border-white/20 rounded-[14px] px-4 py-2.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] transition-colors"
              >
                <span className={`font-mono text-[28px] font-extrabold leading-none tabular-nums ${pctClass}`}>
                  {sectorVal !== null ? `${sectorVal > 0 ? '+' : ''}${sectorVal.toFixed(2)}%` : '—'}
                </span>
                <span className="text-[10px] uppercase font-black tracking-[0.16em] text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1">
                  {localPeriod} Avg
                  <ChevronDownIcon size={14} className="text-slate-400 dark:text-slate-500" />
                </span>
              </button>
              {dropdownOpen === 'return' && (
                <PeriodDropdown ref={dropdownRef} current={localPeriod} onSelect={p => { setLocalPeriod(p); setDropdownOpen(null) }} side="left" />
              )}
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              {momentumDelta !== null && (
                <span className={`flex items-center font-black tracking-[0.12em] text-[9px] uppercase px-2.5 py-1.5 rounded-[8px] border ${
                  momentumDelta > 0
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25'
                    : momentumDelta < 0
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/25'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/20'
                }`}>
                  {momentumDelta > 0 ? 'Mom Up ↑' : momentumDelta < 0 ? 'Mom Down ↓' : 'Flat'}{' '}
                  {momentumDelta > 0 ? '+' : ''}{momentumDelta.toFixed(1)}%
                </span>
              )}
              {streak >= 5 && (
                <span className="flex items-center gap-1 px-2.5 py-1.5 font-black uppercase rounded-[8px] bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/25 text-[9px] text-orange-600 dark:text-orange-400 tracking-widest">
                  <ZapIcon size={10} /> {streak} syncs
                </span>
              )}
              {!loading && holdings.length > 0 && (
                <span className="text-[12px] ml-auto">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{posCount}↑</span>
                  {' '}
                  <span className="text-rose-500 dark:text-rose-400 font-bold">{holdings.length - posCount}↓</span>
                  {breadth !== null && (
                    <span className="text-slate-400 dark:text-slate-500 text-[11px]"> · {breadth}% breadth</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>{/* end gradient top section */}

        {/* ── Scrollable body ─────────────────── */}
        <div className="overflow-y-auto flex-1 overscroll-contain bg-white dark:bg-slate-900" ref={scrollRef}>

          {/* vs Market */}
          <div className="px-6 py-5 bg-[#FCFCFD] dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
            <p className="text-[9px] font-black tracking-[0.18em] uppercase text-slate-400 dark:text-slate-500 mb-4">
              vs Market
            </p>
            <BenchmarkRows
              sectorVal={sectorVal}
              sectorName={sector.name}
              benchmarks={benchmarks}
              period={localPeriod}
            />
          </div>

          {/* Stocks */}
          <div className="pb-6">
            {/* Sticky table header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-white/10 px-6 py-3 flex items-center justify-between">
              <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                Assessed Assets
                <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-normal text-[11px]">
                  ({sector.stock_count ?? holdings.length})
                </span>
              </p>
              {!loading && (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === 'ranked' ? null : 'ranked')}
                    className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Ranked by {localPeriod}
                    <ChevronDownIcon size={13} className="text-slate-400 dark:text-slate-500" />
                  </button>
                  {dropdownOpen === 'ranked' && (
                    <PeriodDropdown ref={dropdownRef} current={localPeriod} onSelect={p => { setLocalPeriod(p); setDropdownOpen(null) }} side="right" />
                  )}
                </div>
              )}
            </div>

            {/* Column labels */}
            {!loading && sorted.length > 0 && (
              <div className="flex items-center gap-2 px-6 pt-3 pb-1">
                <span className="w-5 shrink-0" />
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-300 dark:text-slate-600 w-12 text-center shrink-0">Ticker</span>
                <span className="flex-1 text-[9px] font-black tracking-widest uppercase text-slate-300 dark:text-slate-600">Company</span>
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-300 dark:text-slate-600 w-16 text-right shrink-0">Price</span>
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-300 dark:text-slate-600 w-14 text-right shrink-0">Return</span>
              </div>
            )}

            {loading ? (
              <LoadingSkeleton />
            ) : sorted.length === 0 ? (
              <EmptyStocks />
            ) : (
              <div className="px-3 mt-1">
                {sorted.map((h, i) => {
                  const val   = getPeriodValue(h, localPeriod)
                  const isPos = val !== null && val >= 0
                  return (
                    <div
                      key={h.id}
                      onClick={() => setSelectedTicker(h)}
                      className="flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <span className="text-[11px] text-slate-300 dark:text-slate-600 w-5 text-right shrink-0 font-mono tabular-nums">
                        {i + 1}
                      </span>
                      <span className={`font-mono text-[11px] font-bold px-1.5 py-1 rounded-[8px] shrink-0 w-12 text-center group-hover:opacity-80 transition-opacity ${
                        isPos ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:text-rose-300'
                      }`}>
                        {h.ticker}
                      </span>
                      <span className="text-[13px] text-slate-600 dark:text-slate-400 font-medium flex-1 truncate min-w-0">
                        {h.company_name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 w-16 text-right shrink-0 tabular-nums">
                        {formatPrice(h.price)}
                      </span>
                      <span className={`font-mono text-[13px] font-bold w-14 text-right shrink-0 tabular-nums ${
                        val === null ? 'text-slate-300 dark:text-slate-600' : isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
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
        <div className="px-6 py-3 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Eagleview v4.4.28 · Yahoo Finance
          </p>
          <p className="text-[10px] text-slate-300 dark:text-slate-600 tabular-nums">
            Last sync: {formatSyncTime(sector.updated_at)}
          </p>
        </div>
      </div>

      {/* Ticker detail — opens stacked on top of this modal (z-[10001]) */}
      {selectedTicker && (
        <TickerModal
          holding={selectedTicker}
          sectorName={sector.name}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </div>
  )
}

/* ── Period dropdown — shared by return pill and "Ranked by" trigger ─────── */

const MODAL_PERIODS: Period[] = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y']

const PeriodDropdown = forwardRef<
  HTMLDivElement,
  { current: Period; onSelect: (p: Period) => void; side: 'left' | 'right' }
>(({ current, onSelect, side }, ref) => (
  <div
    ref={ref}
    className={`absolute top-full mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden min-w-[160px] ${
      side === 'right' ? 'right-0' : 'left-0'
    }`}
  >
    {MODAL_PERIODS.map(p => (
      <button
        key={p}
        onClick={() => onSelect(p)}
        className={`flex items-center justify-between w-full px-4 py-2.5 text-left transition-colors ${
          p === current
            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
        }`}
      >
        <span className={`text-[12px] ${p === current ? 'font-extrabold' : 'font-semibold'}`}>
          {PERIOD_LABELS[p]}
        </span>
        {p === current && <span className="text-[10px] text-emerald-400">✓</span>}
      </button>
    ))}
  </div>
))
PeriodDropdown.displayName = 'PeriodDropdown'

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
        <span className={`text-[12px] w-28 shrink-0 truncate ${bold ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
          {label}
        </span>
        <div className="flex-1 relative h-4 flex items-center">
          <div className="absolute inset-y-0 left-1/2 w-px bg-slate-100 dark:bg-white/10" />
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
          val === null ? 'text-slate-300 dark:text-slate-600' : isPos ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(1)}%` : '—'}
        </span>
        <span className={`text-[10px] font-bold w-12 text-right shrink-0 tabular-nums ${
          alpha == null ? 'invisible' : alpha >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
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
        <span className="text-[9px] text-slate-300 dark:text-slate-600 w-14 text-right tracking-widest uppercase">Return</span>
        <span className="text-[9px] text-slate-300 dark:text-slate-600 w-12 text-right tracking-widest uppercase">Alpha</span>
      </div>
      <Row label={`▸ ${sectorName.length > 16 ? sectorName.slice(0,15)+'…' : sectorName}`} val={sectorVal} bold />
      <div className="my-1.5 border-t border-slate-100 dark:border-white/10" />
      {benchmarks.map(b => {
        const bVal  = getPeriodValue(b, period)
        const alpha = sectorVal != null && bVal != null ? sectorVal - bVal : null
        return <Row key={b.ticker} label={b.name} val={bVal} alpha={alpha} />
      })}
      <p className="text-[9px] text-slate-300 dark:text-slate-600 mt-2">Alpha = sector minus benchmark · {period}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="px-6 pt-4 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-2 py-2 px-3">
          <div className="h-3 w-5 bg-slate-100 dark:bg-white/10 rounded" />
          <div className="h-7 w-12 bg-slate-100 dark:bg-white/10 rounded-[8px]" />
          <div className="h-3 flex-1 bg-slate-100 dark:bg-white/10 rounded" />
          <div className="h-3 w-16 bg-slate-100 dark:bg-white/10 rounded" />
          <div className="h-3 w-14 bg-slate-100 dark:bg-white/10 rounded" />
        </div>
      ))}
    </div>
  )
}

function EmptyStocks() {
  return (
    <div className="text-center py-12 px-6">
      <p className="text-slate-500 dark:text-slate-400 font-semibold text-[13px]">No stock data yet</p>
      <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1">Run the data sync to populate.</p>
    </div>
  )
}
