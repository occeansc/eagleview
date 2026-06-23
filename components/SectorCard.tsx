'use client'

import {
  Sector, Period, ScorecardLevel, SectorSnapshot,
  getPeriodValue, getRankChange, getBreadth,
} from '@/lib/types'
import { ZapIcon, BookmarkIcon, AwardIcon, FlameIcon, TrendingUpIcon, TrendingDownIcon } from './Icons'
import Sparkline from './Sparkline'

interface Props {
  sector:      Sector
  rank:        number
  period:      Period
  isHot:       boolean
  delay:       number
  isPinned:    boolean
  scorecard:   ScorecardLevel
  snapshots:   SectorSnapshot[]
  onClick:     () => void
  onTogglePin: (e: React.MouseEvent) => void
}

export default function SectorCard({
  sector, rank, period, isHot, delay,
  isPinned, scorecard, snapshots, onClick, onTogglePin,
}: Props) {
  const value      = getPeriodValue(sector, period)
  const rankChange = getRankChange(sector, period)
  const breadth    = getBreadth(sector, period)
  const positive   = value !== null && value >= 0
  const negative   = value !== null && value < 0
  const isRising   = rankChange !== null && rankChange >= 5
  const isFalling  = !isHot && !isRising && rankChange !== null && rankChange <= -5
  const streak     = sector.streak ?? 0

  const pctColor    = positive ? 'text-emerald-600' : negative ? 'text-rose-500' : 'text-slate-400'
  const glowRgb     = positive ? '16,185,129' : negative ? '244,63,94' : '148,163,184'
  const borderHover = positive ? 'hover:border-emerald-200/60' : negative ? 'hover:border-rose-200/60' : ''

  // Subtle performance tint — magnitude-aware, capped low so 22 cards stay clean
  const tintAlpha = value === null ? 0 : Math.min(0.04 + Math.abs(value) / 100 * 0.07, 0.10)
  const tintColor = positive ? `rgba(16,185,129,${tintAlpha})` : negative ? `rgba(244,63,94,${tintAlpha})` : 'transparent'

  return (
    <button
      onClick={onClick}
      className={`sector-card ${positive ? 'positive' : negative ? 'negative' : ''} card-appear group relative rounded-[22px] text-left w-full flex flex-col outline-none overflow-hidden focus-visible:ring-2 focus-visible:ring-indigo-400 ${borderHover}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Hover glow — radial gradient, bottom-right */}
      <div
        className="absolute inset-0 rounded-[22px] overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at bottom right, rgba(${glowRgb},0.20) 0%, transparent 55%)` }}
      />

      {/* Performance tint — always visible, very subtle top gradient, magnitude-aware */}
      {tintAlpha > 0 && (
        <div
          className="absolute inset-x-0 top-0 h-3/5 rounded-t-[22px] pointer-events-none z-0"
          style={{ background: `linear-gradient(180deg, ${tintColor} 0%, transparent 100%)` }}
        />
      )}

      {/* ── HOT / RISING inline top banner — never buried, more prominent ── */}
      {(isHot || isRising || isFalling) && (
        <div className={`w-full px-3.5 py-2 rounded-t-[22px] border-b flex items-center gap-2 relative z-10 ${
          isHot
            ? 'bg-gradient-to-r from-orange-100 via-orange-50 to-rose-50 border-orange-200/70'
            : isRising
              ? 'bg-gradient-to-r from-sky-100 via-sky-50 to-indigo-50 border-sky-200/70'
              : 'bg-gradient-to-r from-rose-100 via-rose-50 to-pink-50 border-rose-200/70'
        }`}>
          {isHot ? (
            <FlameIcon size={12} className="hot-badge shrink-0 text-orange-500" />
          ) : isRising ? (
            <TrendingUpIcon size={12} className="rising-badge shrink-0 text-sky-500" />
          ) : (
            <TrendingDownIcon size={12} className="shrink-0 text-rose-500" />
          )}
          <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${
            isHot ? 'text-orange-700' : isRising ? 'text-sky-700' : 'text-rose-700'
          }`}>
            {isHot ? 'Hot' : isRising ? 'Rising' : 'Falling'}
          </span>
        </div>
      )}

      {/* ── Upper canvas ─────────────────────────── */}
      <div className="px-4 pt-3.5 pb-3 flex-1 flex flex-col relative z-10">

        {/* Rank row */}
        <div className="flex items-center gap-1.5 mb-3">
          {/* Rank chip */}
          <span className="flex items-center justify-center font-bold font-mono text-[11px] w-[26px] h-[26px] rounded-[8px] bg-slate-50 text-slate-500 border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.025)] shrink-0 group-hover:bg-white transition-colors">
            {rank}
          </span>

          {/* Rank change — compact inline chip */}
          {rankChange !== null && rankChange !== 0 && (
            <span className={`rank-change text-[9px] font-black tracking-tight px-1.5 py-[2px] rounded-[5px] ${
              rankChange > 0
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                : 'text-rose-600 bg-rose-50 border border-rose-100'
            }`}>
              {rankChange > 0 ? `▲${rankChange}` : `▼${Math.abs(rankChange)}`}
            </span>
          )}

          {/* Right side: scorecard + streak + pin */}
          <div className="ml-auto flex items-center gap-1.5">
            {scorecard === 'gold' && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold scorecard-gold border border-amber-200/50 bg-amber-50/50 px-1.5 py-0.5 rounded-full">
                <AwardIcon size={8} className="text-amber-500" /> GOLD
              </span>
            )}
            {scorecard === 'silver' && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold scorecard-silver bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full">
                <AwardIcon size={8} /> SLV
              </span>
            )}
            {streak >= 5 && !scorecard && (
              <span className="flex items-center gap-[2px] text-[9px] font-extrabold text-orange-500/80">
                <ZapIcon size={10} /> {streak}
              </span>
            )}

            <button
              onClick={e => { e.stopPropagation(); onTogglePin(e) }}
              className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                isPinned
                  ? 'bg-amber-100/70 text-amber-500'
                  : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'
              }`}
              aria-label="Pin"
            >
              <BookmarkIcon size={12} filled={isPinned} />
            </button>
          </div>
        </div>

        {/* Sector name */}
        <p className="font-bold text-slate-800 text-[14px] leading-snug tracking-tight mb-2">
          {sector.name}
        </p>

        {/* Return + sparkline */}
        <div className="flex items-end justify-between mt-auto gap-2">
          <p className={`font-mono text-[22px] font-semibold tracking-[-0.03em] tabular-nums ${pctColor}`}>
            {value !== null ? (
              <>
                {positive ? '↑' : negative ? '↓' : ''}
                {value !== null ? Math.abs(value).toFixed(1) + '%' : ''}
              </>
            ) : (
              <span className="text-slate-300 text-sm font-medium">No data</span>
            )}
          </p>
          {snapshots.length >= 2 && (
            <div className="shrink-0 group-hover:-translate-x-0.5 transition-transform duration-500">
              <Sparkline snapshots={snapshots} positive={positive} width={56} height={22} />
            </div>
          )}
        </div>
      </div>

      {/* ── Footer canvas ─────────────────────────── */}
      <div className="px-4 pt-3 pb-3.5 border-t border-slate-100/80 relative z-10">
        {breadth !== null && (
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] uppercase font-bold tracking-[0.18em] text-slate-400">Breadth</span>
              <span className={`text-[11px] font-mono font-bold tabular-nums ${
                breadth >= 60 ? 'text-emerald-600' : breadth >= 40 ? 'text-amber-600' : 'text-rose-500'
              }`}>{breadth}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full breadth-track overflow-hidden">
              <div
                className={`breadth-bar h-full rounded-full ${
                  breadth >= 60 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : breadth >= 40 ? 'bg-gradient-to-r from-amber-300 to-amber-500'
                  : 'bg-gradient-to-r from-rose-400 to-rose-500'
                }`}
                style={{ width: `${breadth}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            {sector.stock_count ?? '—'} <span className="opacity-75 font-normal">assets</span>
          </span>
          <span className={`text-[10px] tracking-widest font-bold uppercase opacity-50 group-hover:opacity-100 transition-opacity ${
            positive ? 'text-emerald-600' : negative ? 'text-rose-500' : 'text-slate-400'
          }`}>
            View →
          </span>
        </div>
      </div>
    </button>
  )
}
