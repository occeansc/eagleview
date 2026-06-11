'use client'

import { Sector, Period, ScorecardLevel, SectorSnapshot, getPeriodValue, getRankChange, getBreadth } from '@/lib/types'
import { FlameIcon, TrendingUpIcon, ZapIcon, BookmarkIcon, AwardIcon } from './Icons'
import Sparkline from './Sparkline'

interface Props {
  sector: Sector; rank: number; period: Period; isHot: boolean; delay: number
  isPinned: boolean; scorecard: ScorecardLevel; snapshots: SectorSnapshot[]
  onClick: () => void; onTogglePin: (e: React.MouseEvent) => void
}

export default function SectorCard({ sector, rank, period, isHot, delay, isPinned, scorecard, snapshots, onClick, onTogglePin }: Props) {
  const value      = getPeriodValue(sector, period)
  const rankChange = getRankChange(sector, period)
  const breadth    = getBreadth(sector, period)
  const positive   = value !== null && value >= 0
  const negative   = value !== null && value < 0
  const isRising   = rankChange !== null && rankChange >= 5
  const streak     = sector.streak ?? 0
  const showStreak = streak >= 5

  const borderTheme = positive ? 'border-emerald-100/50 hover:border-emerald-200/80 hover:shadow-emerald-500/10' 
                               : negative ? 'border-rose-100/50 hover:border-rose-200/80 hover:shadow-rose-500/10' 
                               : 'border-slate-100 hover:border-slate-200'

  const fontColor = positive ? 'text-emerald-600' : negative ? 'text-rose-600' : 'text-slate-400'
  const indicator = positive ? <span className="inline-block -translate-y-px opacity-75 drop-shadow-sm font-semibold">&uarr;</span> : negative ? <span className="inline-block -translate-y-px opacity-75 drop-shadow-sm font-semibold">&darr;</span> : null

  return (
    <button 
      onClick={onClick} 
      className={`sector-card card-appear relative bg-white border rounded-[24px] p-5 text-left flex flex-col group overflow-hidden transition-all duration-400 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 shadow-sm ${borderTheme}`} 
      style={{ animationDelay: `${delay}ms` }}
    >
      
      {/* Contextual Card Bloom/Vibe (Glass aesthetic interior gradient logic instead of flat blocking the background entirely) */}
      <div className={`absolute bottom-[-15%] right-[-10%] w-[120px] h-[120px] rounded-full blur-[40px] pointer-events-none transition-all duration-1000 group-hover:scale-[1.8] group-hover:opacity-[0.20] opacity-[0.08] ${positive ? 'bg-emerald-600' : negative ? 'bg-rose-600' : 'bg-slate-400'}`} />

      {/* Decorative Flags (Hot/Rising overlay relative structure untouched so badges still appear appropriately attached externally generally but cleanly wrapped inner elements now push it) */}
      
      <div className="flex items-center gap-2 mb-3">
        <span className={`flex items-center justify-center font-bold font-mono tracking-tighter w-[26px] h-[26px] text-[11px] rounded-[8px] bg-slate-50 text-slate-500 border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] shrink-0 group-hover:bg-white transition-colors`}>
          {rank}
        </span>
        
        {rankChange !== null && rankChange !== 0 && (
          <span className={`rank-change flex items-center justify-center font-black tracking-widest text-[9px] px-2 py-0.5 rounded-[6px] border ${rankChange > 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-100 shadow-[0_1px_4px_rgba(16,185,129,0.1)]' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
             {rankChange > 0 ? '▲ ' : '▼ '}{Math.abs(rankChange)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5 overflow-visible">
            {scorecard === 'gold' && (
              <span className="flex items-center justify-center font-bold tracking-widest text-[9px] px-1.5 py-0.5 rounded-full scorecard-gold border border-amber-200/50 bg-amber-50/50 backdrop-blur-sm relative uppercase shadow-[0_2px_10px_rgba(251,191,36,0.3)] z-10"><AwardIcon size={10} className="mr-0.5 drop-shadow-sm text-amber-500 stroke-2" />Gold</span>
            )}
            {scorecard === 'silver' && (
              <span className="flex items-center gap-0.5 uppercase tracking-widest text-[9px] font-bold scorecard-silver px-1.5 py-0.5 bg-slate-50 rounded-full border border-slate-200 z-10"><AwardIcon size={10} className="stroke-slate-400" />Silver</span>
            )}
            
            {showStreak && !scorecard && (
              <span className="flex items-center tracking-widest gap-[2px] font-extrabold text-[10px] text-orange-500/80 uppercase">
                 <ZapIcon size={10} stroke="currentColor" fill="currentColor" opacity="0.6"/>{streak}
              </span>
            )}

            <div onClick={onTogglePin} className={`flex items-center justify-center w-[24px] h-[24px] rounded-full transition-all duration-300 z-20 cursor-pointer ${isPinned ? 'bg-amber-100/60 shadow-[inset_0_2px_8px_rgba(251,191,36,0.2)] text-amber-500 hover:scale-110' : 'bg-transparent text-slate-300 hover:text-slate-500 hover:bg-slate-50'}`} aria-label="Pin relative control overlay intercept wrapper via Div click override" onClickCapture={(e)=>{e.stopPropagation(); onTogglePin(e as any)}}>
                <BookmarkIcon size={13} filled={isPinned} className="drop-shadow-sm" />
            </div>
        </div>
      </div>
      
      {/* Absolute Absolute Pin overrides - We swapped top layer so removing floating element directly applied originally as standard position top-3 absolute allowed layout clashes, we keep items embedded natively inline above flex now cleanly.*/}

      {isHot && (
        <span className="hot-badge absolute -top-1.5 left-6 shadow-[0_2px_8px_rgba(239,68,68,0.4)] flex items-center gap-[2px] bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full z-10 ring-2 ring-white">
          <FlameIcon size={8} strokeWidth="3" />
          HOT
        </span>
      )}
      {isRising && !isHot && (
        <span className="rising-badge absolute -top-1.5 left-6 shadow-[0_2px_8px_rgba(56,189,248,0.3)] flex items-center gap-[2px] bg-gradient-to-r from-sky-400 to-indigo-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full z-10 ring-2 ring-white">
          <TrendingUpIcon size={8} strokeWidth="3" />
          RISING
        </span>
      )}


      <p className="font-bold text-slate-800 text-[14.5px] leading-snug tracking-tight mb-2 max-w-[85%]">{sector.name}</p>

      <div className="flex items-center justify-between mt-auto mb-3.5 gap-2 relative z-10">
        <p className={`font-mono text-[22px] font-semibold tracking-[-0.04em] ${fontColor}`}>
          {value !== null ? <span className="flex items-center gap-[3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.015)]">{indicator}{Math.abs(value).toFixed(1)}%</span> : <span className="text-slate-300 text-sm">N/A</span>}
        </p>
        
        {snapshots.length >= 2 && <div className="-mr-1 shrink-0 transform-gpu group-hover:-translate-x-1 transition-transform duration-500"><Sparkline snapshots={snapshots} positive={positive} width={52} height={20} /></div>}
      </div>

      {breadth !== null && (
        <div className="mb-4 pt-1 flex items-center justify-between w-full opacity-90 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 shrink-0 mr-3 drop-shadow-[0_1px_0_rgba(255,255,255,1)]">Breadth</span>
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden shrink-0 transform-gpu">
               <div className={`breadth-bar h-full rounded-full transition-all duration-1000 ease-out ${breadth >= 60 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : breadth >= 40 ? 'bg-gradient-to-r from-amber-300 to-amber-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`} style={{ width: `${breadth}%` }} />
            </div>
            <span className={`text-[11px] font-mono font-semibold shrink-0 tabular-nums ${breadth >= 60 ? 'text-emerald-600' : breadth >= 40 ? 'text-amber-600' : 'text-rose-500'}`}>{breadth}%</span>
          </div>
        </div>
      )}

      {/* Structured Card Action Metatab replacing unassociated raw items giving robust design borders */}
      <div className="flex items-center justify-between mt-1 pt-3.5 border-t border-slate-100/80">
         <span className="text-xs text-slate-400 font-medium">{sector.stock_count ?? '—'} <span className="opacity-80 font-normal">assets</span></span>
         <span className={`text-[10px] tracking-widest font-bold uppercase transition-colors flex items-center gap-1 opacity-70 group-hover:opacity-100 ${positive ? 'text-emerald-600 group-hover:text-emerald-700' : negative ? 'text-rose-500 group-hover:text-rose-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
            View &rarr;
         </span>
      </div>
    </button>
  )
}