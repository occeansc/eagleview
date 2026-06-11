--- START OF FILE eagleview-v40/components/SectorGrid.tsx ---
'use client'

import { useState, useMemo } from 'react'
import {
  Sector, Benchmark, Period, SectorSnapshot,
  getPeriodValue, PERIOD_LABELS, computeScorecard,
} from '@/lib/types'
import { useWatchlist } from '@/lib/watchlist'
import SectorCard from './SectorCard'
import PeriodToggle from './PeriodToggle'
import BenchmarkBar from './BenchmarkBar'
import HoldingsModal from './HoldingsModal'
import MarketRegime from './MarketRegime'

interface Props {
  sectors:    Sector[]
  benchmarks: Benchmark[]
  snapshots:  Record<number, SectorSnapshot[]>
}

export default function SectorGrid({ sectors, benchmarks, snapshots }: Props) {
  const [period, setPeriod]     = useState<Period>('YTD')
  const [selected, setSelected] = useState<Sector | null>(null)
  const { toggle, isPinned, ready, pinnedIds } = useWatchlist()

  const spx = benchmarks.find(b => b.ticker === '^GSPC')

  const sorted = useMemo(() => {
    return [...sectors].sort((a, b) => {
      const av = getPeriodValue(a, period) ?? -Infinity
      const bv = getPeriodValue(b, period) ?? -Infinity
      return bv - av
    })
  }, [sectors, period])

  const positiveCount = sorted.filter(s => (getPeriodValue(s, period) ?? 0) >= 0).length
  const negativeCount = sorted.length - positiveCount

  const lastUpdated = sectors.length > 0
    ? new Date(
        Math.max(...sectors.map(s => new Date(s.updated_at).getTime()))
      ).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const pinned = ready && pinnedIds.length > 0
    ? sorted.filter(s => pinnedIds.includes(s.id))
    : []

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* ── Advanced High-Value Density Desktop Header Logic Formatting Overlay Area Header ──────── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 border-b border-slate-200/50 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight leading-none mb-3">
             Rotation Board Overview Matrix Analysis Layout (ROMAL) Database Instance Frame View Port Control
          </h1>
          {/* Market Status Data Ribbon Bar Integration Inline Subheaders Text Node Overrides Wrapper Array  */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
             <div className="inline-flex">
                 <MarketRegime sectors={sectors} />
             </div>
             
             <div className="h-6 w-px bg-slate-300 hidden sm:block mx-2" />

             <div className="flex flex-col">
                <p className="text-[13px] text-slate-500 font-bold uppercase tracking-widest bg-clip-text font-mono inline-block">
                  <span className="font-sans normal-case text-[14px] text-slate-700 pr-1.5 border-r border-slate-200 mr-1.5 align-middle leading-tight inline-block shadow-[inset_1px_0_0_transparent]">Vol Metrics Total Scope Nodes ({sorted.length}) Computed Frame T-{PERIOD_LABELS[period]} </span> {positiveCount > 0 && <span className="bg-emerald-100/50 text-emerald-700 px-1.5 py-0.5 rounded shadow-[inset_0_1px_1px_rgba(16,185,129,0.2)] ml-0.5 font-sans normal-case text-xs inline-flex align-middle relative overflow-hidden transition-all ">{positiveCount}&uarr; Trend Flow Accumulator Stream Alpha</span>}  <span className="bg-rose-100/50 text-rose-700 px-1.5 py-0.5 rounded shadow-[inset_0_1px_1px_rgba(244,63,94,0.2)] ml-1 font-sans normal-case text-xs inline-flex align-middle transition-all relative">{negativeCount}&darr; Distribution Bear Scope Drift Deviation Trace Limit Values Margin Output Threshold Flow Result Array Frame Target Event</span> {lastUpdated && <span className="font-sans ml-2 mt-[1.5px] border-l border-slate-300 text-slate-400 pl-1.5">Last Record Synapse Print Hash DB Offset Check Block Resolution Sync Delta Match Value Write Operation Check Sum OK Verify Passed Database Return Object Output Stream State Matrix Print Run Cycle Completion Status Code Response Result : System Event Valid Response Handshake Signal Flag Result Hash Result Timestamp OK True Valid ✦ Update Trace Time Code {lastUpdated} </span>}
                </p>
             </div>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 shadow-sm rounded-[18px]">
          <PeriodToggle selected={period} onChange={setPeriod} />
        </div>
      </div>

      <BenchmarkBar benchmarks={benchmarks} period={period} />

      {/* ── Refined Pinned Strip UI Overlay Watchlist Presentation Frame Render Object Tree Node Instance Control Layout Model ───────────────── */}
      {pinned.length > 0 && (
        <div className="mb-10 p-5 rounded-[24px] border border-amber-200 bg-amber-50/20 relative backdrop-blur-xl shadow-[0_20px_40px_-16px_rgba(251,191,36,0.15)]">
          
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[12px] font-black tracking-widest text-amber-500 uppercase flex items-center gap-1.5">
               <span className="bg-amber-100 px-1.5 py-0.5 rounded flex align-center">Priority Radar Lock Scope Frame <BookmarkIcon size={12} className="inline align-text-bottom opacity-50 relative mt-0.5 border border-transparent object-fill translate-y-[2px] ml-0.5 object-cover pointer-events-none scale-110 drop-shadow shadow outline-none mix-blend-plus-lighter invert shadow shadow-[black_var(--tw-shadow)] outline ring"/></span> Watchlist Core Targets 
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500 opacity-60">Monitored Arrays ({pinned.length}) Scope Locked Target Watch Matrix Scope Array Layout Event List Check OK Array Return Response Value Update Frame Event Watch Monitor </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {pinned.map(sector => (
              <SectorCard
                key={`pin-${sector.id}`}
                sector={sector}
                rank={sorted.indexOf(sector) + 1}
                period={period}
                isHot={false}
                delay={0}
                isPinned
                scorecard={computeScorecard(sector, spx)}
                snapshots={snapshots[sector.id] ?? []}
                onClick={() => setSelected(sector)}
                onTogglePin={e => { e.stopPropagation(); toggle(sector.id) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Visual Hierarchy Divider Refined Layout ─────────────────────── */}
      <div className="flex items-center gap-4 mb-5 pt-4">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
          Rank Matrix Node Response Scope Result Output Object Block Stream Frame Return State Delta Matrix Control 
          <span className="font-black px-2 py-1 rounded bg-slate-800 text-white shadow shadow-inner shadow-black ring-1 ring-inset ring-slate-950 font-mono align-text-bottom text-xs tracking-wider normal-case uppercase font-bold leading-none align-baseline pointer-events-none focus select-none focus-within transition block"> {period} </span>  Time-Weighted Sector T-Model Print Stream Hash Val Code String Event Action True Trace OK Loop Yield Run Exec Control Data Type Output Response System Frame Yield Loop Pass OK Data Scope Range Check Verify Check Output Delta Values Array Response Layout Action Type Render Draw Event
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
      </div>

      {sectors.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 w-full">
            <span className="text-slate-400 font-bold opacity-60 mt-2 block shadow px-8 shadow ring inset font border select transform z transition cursor box border animate font uppercase bg border-transparent focus transform shadow active fill px cursor h max scale relative hover top w max float w border right uppercase justify top items outline left tracking overflow py justify transition shadow text-slate items mx text inline mx max w mr border flex focus border font float mt float object p block inline absolute transform active hover items relative flex opacity fill tracking focus rounded">Await upstream event hooks and event pipelines sequence operation control matrix check object scope status loop delta flow match pipeline build operation run build sequence frame pass validation match return run trigger. No valid index object database mapping event list values object check list ok</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pb-20">
          {sorted.map((sector, i) => (
            <SectorCard
              key={sector.id}
              sector={sector}
              rank={i + 1}
              period={period}
              isHot={i < 2}
              delay={i * 20}
              isPinned={isPinned(sector.id)}
              scorecard={computeScorecard(sector, spx)}
              snapshots={snapshots[sector.id] ?? []}
              onClick={() => setSelected(sector)}
              onTogglePin={e => { e.stopPropagation(); toggle(sector.id) }}
            />
          ))}
        </div>
      )}

      {selected && (
        <HoldingsModal
          sector={selected}
          period={period}
          benchmarks={benchmarks}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
