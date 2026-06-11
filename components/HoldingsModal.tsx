'use client'

import { useEffect, useState } from 'react'
import {
  SectorHolding, Sector, Benchmark, Period,
  HasPeriodValues, getPeriodValue, getMomentumDelta,
  getBreadth, formatPrice,
} from '@/lib/types'
import { getSupabaseClient } from '@/lib/supabase'
import { CloseIcon, ZapIcon } from './Icons'

interface Props {
  sector:     Sector
  period:     Period
  benchmarks: Benchmark[]
  onClose:    () => void
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const sectorVal     = getPeriodValue(sector, period)
  const momentumDelta = getMomentumDelta(sector, period)
  const breadth       = getBreadth(sector, period)
  const pos           = sectorVal !== null && sectorVal >= 0
  const pctClass      = pos ? 'text-emerald-600 drop-shadow-[0_2px_4px_rgba(16,185,129,0.1)]' : 'text-rose-600 drop-shadow-[0_2px_4px_rgba(244,63,94,0.1)]'
  const streak        = sector.streak ?? 0

  const sorted = [...holdings].sort((a, b) =>
    (getPeriodValue(b, period) ?? -Infinity) - (getPeriodValue(a, period) ?? -Infinity)
  )
  const posCount = sorted.filter(h => (getPeriodValue(h, period) ?? 0) >= 0).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all duration-300 ease-out"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Sleeker structure mimicking elevated applications native modals */}
      <div className="modal-panel bg-[#FAFAFA] w-full sm:max-w-2xl sm:rounded-[32px] rounded-t-[32px] border border-white/20 flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden transform-gpu will-change-transform shadow-[0_-4px_32px_rgba(0,0,0,0.1)] sm:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)]">

        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 bg-white/50 backdrop-blur z-20 sticky top-0 rounded-t-[32px]">
          <div className="w-10 h-1 bg-black/15 rounded-full" />
        </div>

        {/* ── Top Floating Action Header ────────────────────────── */}
        <div className="relative px-6 pt-5 pb-5 shrink-0 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.02)] z-10 border-b border-slate-100/70">
          
          <button
              onClick={onClose}
              className="absolute right-5 top-5 w-[36px] h-[36px] bg-slate-50 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Close"
          >
              <CloseIcon size={16} className="stroke-[2.5px]" />
          </button>

          <h2 className="text-[26px] pr-10 font-black tracking-tight text-slate-900 mb-1 leading-none font-sans drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">{sector.name}</h2>
          
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 mt-4">
             <div className="flex items-baseline gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 w-fit shadow-sm shadow-slate-100 inset-ring-0 inset-ring-white backdrop-blur">
                <span className={`font-mono text-[28px] font-extrabold leading-none tabular-nums ${pctClass}`}>
                  {sectorVal !== null ? `${sectorVal > 0 ? '+' : ''}${sectorVal.toFixed(2)}%` : '—'}
                </span>
                <span className="text-[12px] uppercase font-bold tracking-widest text-slate-400 shrink-0">{period} Avg</span>
             </div>
             
             {/* Badge/Tags Metrics cluster grouped */}
             <div className="flex items-center gap-2 flex-wrap">
               {momentumDelta !== null && (
                <span className={`flex items-center font-bold tracking-widest text-[9px] uppercase px-2.5 py-1.5 rounded-[8px] border shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] ${
                  momentumDelta > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : momentumDelta < 0 ? 'bg-rose-100 text-rose-800 border-rose-200' 
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {momentumDelta > 0 ? 'MOMENTUM UP  ↑' : momentumDelta < 0 ? 'MOMENTUM DOWN  ↓' : 'FLAT'} {' '} {momentumDelta > 0 ? '+' : ''}{momentumDelta.toFixed(1)}%
                </span>
              )}
               {streak >= 5 && (
                 <span className="flex items-center tracking-widest px-2.5 py-1.5 gap-[4px] font-black uppercase rounded-[8px] bg-orange-50 border border-orange-100 text-[9px] text-orange-600">
                   <ZapIcon size={12} stroke="currentColor" fill="currentColor"/> {streak} SYNCS
                 </span>
               )}
             </div>
          </div>
          
        </div>

        {/* ── Scrollable Internals ──────────────────────── */}
        <div className="overflow-y-auto flex-1 bg-white relative">
          
          <div className="px-6 py-6 border-b border-slate-100 bg-[#FCFDFD]">
             <BenchmarkComparison sectorVal={sectorVal} sectorName={sector.name} benchmarks={benchmarks} period={period} />
          </div>

          <div className="pb-8">
            <div className="px-6 py-4 flex items-center justify-between">
                <div>
                   <p className="text-[13px] font-bold text-slate-800">Assessed Assets ({sector.stock_count ?? holdings.length})</p>
                   {!loading && (
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                        Breadth Market Pull: <span className="text-emerald-500 font-bold bg-emerald-50 px-1 py-0.5 rounded shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)] tabular-nums">{posCount}↑</span>  <span className="text-rose-500 font-bold bg-rose-50 px-1 py-0.5 rounded shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)] tabular-nums">{holdings.length - posCount}↓</span>
                      </p>
                   )}
                </div>
                <p className="text-[10px] tracking-widest text-slate-300 font-bold uppercase p-2 border border-slate-100 rounded-lg">Sort: {period}</p>
            </div>

            {loading ? <LoadingSkeleton /> : sorted.length === 0 ? <EmptyStocks /> : (
              <div className="flex flex-col relative w-full overflow-hidden text-[13px] antialiased">
                <div className="sticky top-0 bg-white/95 backdrop-blur z-20 grid grid-cols-[36px_60px_minmax(120px,1fr)_80px_72px] sm:grid-cols-[40px_70px_minmax(150px,1fr)_100px_80px] text-[10px] font-bold tracking-widest uppercase text-slate-400 py-3 border-y border-slate-100 px-4 sm:px-6 drop-shadow-[0_1px_4px_rgba(0,0,0,0.015)] shadow-[0_6px_10px_-8px_rgba(0,0,0,0.04)]">
                   <span className="text-center">#</span>
                   <span className="pl-1">TKR</span>
                   <span>Asset Details</span>
                   <span className="text-right">Valuation</span>
                   <span className="text-right pr-1">% Ret</span>
                </div>
                {sorted.map((h, i) => {
                  const val   = getPeriodValue(h, period)
                  const isPos = val !== null && val >= 0
                  return (
                    <div key={h.id} className="grid grid-cols-[36px_60px_minmax(120px,1fr)_80px_72px] sm:grid-cols-[40px_70px_minmax(150px,1fr)_100px_80px] px-4 sm:px-6 py-2.5 items-center hover:bg-slate-50/70 border-b border-slate-50 transition-colors tabular-nums">
                       <span className="text-xs text-slate-300 font-medium text-center opacity-70">{i + 1}</span>
                       <div className="pl-1"><span className={`font-mono text-[11px] font-bold tracking-tighter px-2.5 py-1 rounded-md text-center shrink-0 border ${isPos ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' : 'bg-rose-50 text-rose-700 border-rose-100/50'}`}>{h.ticker}</span></div>
                       <span className="font-semibold text-slate-800 text-[13px] sm:text-[14px] truncate overflow-hidden min-w-0 pr-4">{h.company_name}</span>
                       <span className="font-mono text-slate-500 font-semibold text-right pr-2 text-[12px]">{formatPrice(h.price)}</span>
                       <span className={`font-mono font-bold text-right text-[13px] ${val === null ? 'text-slate-300' : isPos ? 'text-emerald-600' : 'text-rose-600'}`}>{val !== null ? `${isPos ? '+' : ''}${val.toFixed(1)}%` : '—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/95 px-6 py-3.5 border-t border-slate-200/80 shrink-0 flex items-center justify-between z-10 sticky bottom-0 shadow-[0_-8px_20px_-8px_rgba(0,0,0,0.04)]">
           <div className="flex flex-col sm:flex-row gap-0 sm:gap-4 sm:items-center w-full max-w-none text-[10px] uppercase font-bold text-slate-300 tracking-wider">
               <span>Yahoo Finance Data Sync ✦</span>
               <span className="hidden sm:inline-flex opacity-50 ml-auto">End EOD Print Evaluated Equities Equal Wt. Model</span>
           </div>
        </div>

      </div>
    </div>
  )
}

function BenchmarkComparison({ sectorVal, sectorName, benchmarks, period }: { sectorVal: number | null, sectorName: string, benchmarks: Benchmark[], period: Period }) {
  if (!benchmarks.length) return null

  const allVals = [sectorVal ?? 0, ...benchmarks.map(b => getPeriodValue(b, period) ?? 0)]
  const absMax  = Math.max(...allVals.map(Math.abs), 0.1)

  const Row = ({ label, val, bold, alpha }: { label: string; val: number | null; bold?: boolean; alpha?: number | null }) => {
    const isPos = val !== null && val >= 0
    const w = `${Math.min((Math.abs(val ?? 0) / absMax) * 44, 44)}%`
    return (
      <div className={`flex items-center gap-3 py-2 ${bold ? 'font-bold' : 'font-medium hover:bg-slate-50/50 rounded-xl px-1.5 transition-colors -ml-1.5'}`}>
        <span className={`text-[11px] sm:text-xs tracking-wider uppercase truncate flex-[2_2_20%] max-w-[120px] ${bold ? 'text-slate-900 drop-shadow-sm' : 'text-slate-400'}`}>
          {bold && <span className="opacity-40 font-mono tracking-tighter mr-1 text-[13px] align-bottom">▸</span>} {label}
        </span>
        <div className="flex-1 relative h-6 flex items-center z-0 px-2 flex-[4_4_50%]">
          <div className="absolute inset-y-0 left-1/2 w-px border-l border-dashed border-slate-200 -translate-x-1/2 -z-10" />
          {val !== null && (
            <div
              className={`absolute h-[12px] sm:h-[16px] rounded-full ring-1 ring-white shadow-sm transition-all duration-700 ease-out z-10 ${
                bold ? (isPos ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 ring-emerald-50' : 'bg-gradient-to-r from-rose-400 to-rose-500 ring-rose-50')
                     : (isPos ? 'bg-emerald-300 opacity-90' : 'bg-rose-300 opacity-90')
              }`}
              style={{ width: w, left: isPos ? '50%' : undefined, right: isPos ? undefined : '50%' }}
            />
          )}
        </div>
        <div className="flex flex-col flex-[1.5_1.5_15%] text-right shrink-0">
          <span className={`font-mono text-xs tabular-nums drop-shadow-sm font-semibold tracking-tighter leading-tight ${val === null ? 'text-slate-300' : isPos ? 'text-emerald-700' : 'text-rose-700'}`}>
            {val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '—'}
          </span>
          {!bold && alpha != null && (
            <span className={`text-[9px] font-black uppercase mt-[2px] tabular-nums tracking-widest ${alpha >= 0 ? 'text-indigo-500' : 'text-orange-500 opacity-80'}`}>
               a  {alpha >= 0 ? '+' : ''}{alpha.toFixed(1)}%
            </span>
          )}
          {bold && <span className="text-[9px] uppercase tracking-widest font-black text-slate-300 mt-[2px] leading-tight">M. Ret</span>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Row label={sectorName.length > 14 ? sectorName.slice(0, 14) + '…' : sectorName} val={sectorVal} bold />
      <div className="my-2 border-t border-slate-200/50 shadow-[0_1px_0_rgba(255,255,255,1)] w-full" />
      <div className="pl-1 pt-1 border-l-2 border-slate-100 rounded-bl-sm pb-1 flex flex-col gap-0.5">
          {benchmarks.map(b => {
            const bVal  = getPeriodValue(b, period)
            const alpha = sectorVal != null && bVal != null ? sectorVal - bVal : null
            return <Row key={b.ticker} label={b.name} val={bVal} alpha={alpha} />
          })}
      </div>
      <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-4 mb-2"><span className="text-indigo-400">a (Alpha Deviation Value)</span>  Computed via Selected Timeframe Diff Value Offset versus Baseline Market Averages</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 px-6 pt-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-3 w-full">
          <div className="h-4 w-6 bg-slate-200 rounded shrink-0 opacity-40" />
          <div className="h-7 w-[64px] bg-slate-200 rounded-[8px] opacity-60" />
          <div className="h-4 flex-1 bg-slate-100/80 rounded" />
          <div className="h-4 w-20 bg-slate-100/80 rounded" />
        </div>
      ))}
    </div>
  )
}

function EmptyStocks() { return <div className="text-center py-20 px-4 text-slate-500"><p className="font-bold">No assets cached for this framework node.</p><p className="text-sm font-medium mt-1 text-slate-400">Initialize upstream synchronizing event block resolution pipelines to execute population.</p></div> }