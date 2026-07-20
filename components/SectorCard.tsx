'use client'

import {
  Sector, Period, ScorecardLevel, SectorSnapshot,
  getPeriodValue, getRankChange, getBreadth,
} from '@/lib/types'
import { ZapIcon, AwardIcon, FlameIcon, TrendingUpIcon, TrendingDownIcon } from './Icons'
import Sparkline from './Sparkline'

interface Props {
  sector:      Sector
  rank:        number
  period:      Period
  isHot:       boolean
  delay:       number
  scorecard:   ScorecardLevel
  snapshots:   SectorSnapshot[]
  onClick:     () => void
}

export default function SectorCard({
  sector, rank, period, isHot, delay,
  scorecard, snapshots, onClick,
}: Props) {
  const value      = getPeriodValue(sector, period)
  const rankChange = getRankChange(sector, period)
  const breadth    = getBreadth(sector, period)
  const positive   = value !== null && value >= 0
  const negative   = value !== null && value < 0
  const isRising   = rankChange !== null && rankChange >= 5
  const isFalling  = !isHot && !isRising && rankChange !== null && rankChange <= -5
  const streak     = sector.streak ?? 0

  const pctColor    = positive ? 'text-emerald-600 dark:text-emerald-400' : negative ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
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
            ? 'bg-gradient-to-r from-orange-100 via-orange-50 to-rose-50 border-orange-200/70 dark:from-orange-500/10 dark:via-orange-500/5 dark:to-rose-500/10 dark:border-orange-500/20'
            : isRising
              ? 'bg-gradient-to-r from-sky-100 via-sky-50 to-indigo-50 border-sky-200/70 dark:from-sky-500/10 dark:via-sky-500/5 dark:to-indigo-500/10 dark:border-sky-500/20'
              : 'bg-gradient-to-r from-rose-100 via-rose-50 to-pink-50 border-rose-200/70 dark:from-rose-500/10 dark:via-rose-500/5 dark:to-pink-500/10 dark:border-rose-500/20'
        }`}>
          {isHot ? (
            <FlameIcon size={12} className="hot-badge shrink-0 text-orange-500" />
          ) : isRising ? (
            <TrendingUpIcon size={12} className="rising-badge shrink-0 text-sky-500" />
          ) : (
            <TrendingDownIcon size={12} className="shrink-0 text-rose-500 dark:text-rose-400" />
          )}
          <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${
            isHot ? 'text-orange-700 dark:text-orange-400' : isRising ? 'text-sky-700 dark:text-sky-400' : 'text-rose-700 dark:text-rose-300'
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
          <span className="flex items-center justify-center font-bold font-mono text-[11px] w-[26px] h-[26px] rounded-[8px] bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.025)] shrink-0 group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors">
            {rank}
          </span>

          {/* Rank change — compact inline chip */}
          {rankChange !== null && rankChange !== 0 && (
            <span className={`rank-change text-[9px] font-black tracking-tight px-1.5 py-[2px] rounded-[5px] ${
              rankChange > 0
                ? 'text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/25'
                : 'text-rose-600 dark:text-rose-400 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/25'
            }`}>
              {rankChange > 0 ? `▲${rankChange}` : `▼${Math.abs(rankChange)}`}
            </span>
          )}

          {/* Right side: scorecard + streak */}
          <div className="ml-auto flex items-center gap-1.5">
            {scorecard === 'gold' && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold scorecard-gold border border-amber-200/50 dark:border-amber-500/25 bg-amber-50/50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                <AwardIcon size={8} className="text-amber-500" /> GOLD
              </span>
            )}
            {scorecard === 'silver' && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold scorecard-silver bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/20 px-1.5 py-0.5 rounded-full">
                <AwardIcon size={8} /> SLV
              </span>
            )}
            {scorecard === 'bronze' && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold scorecard-bronze bg-orange-50/60 dark:bg-orange-500/10 border border-orange-200/50 dark:border-orange-500/25 px-1.5 py-0.5 rounded-full">
                <AwardIcon size={8} className="text-orange-400/80" /> BRZ
              </span>
            )}
            {streak >= 5 && !scorecard && (
              <span className="flex items-center gap-[2px] text-[9px] font-extrabold text-orange-500/80">
                <ZapIcon size={10} /> {streak}
              </span>
            )}
          </div>
        </div>

        {/* Sector name */}
        <p className="font-bold text-slate-800 dark:text-slate-200 text-[14px] leading-snug tracking-tight mb-2">
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
              <span className="text-slate-300 dark:text-slate-600 text-sm font-medium">No data</span>
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
      <div className="px-4 pt-3 pb-3.5 border-t border-slate-100/80 dark:border-white/10 relative z-10">
        {breadth !== null && (
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] uppercase font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500">Breadth</span>
              <span className={`text-[11px] font-mono font-bold tabular-nums ${
                breadth >= 60 ? 'text-emerald-600 dark:text-emerald-400' : breadth >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'
              }`}>{breadth}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full breadth-track overflow-hidden">
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
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {sector.stock_count ?? '—'} <span className="opacity-75 font-normal">assets</span>
          </span>
          <span className={`text-[10px] tracking-widest font-bold uppercase opacity-50 group-hover:opacity-100 transition-opacity ${
            positive ? 'text-emerald-600 dark:text-emerald-400' : negative ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
          }`}>
            View →
          </span>
        </div>
      </div>
    </button>
  )
}
