'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  SectorHolding, Period, PERIOD_LABELS,
  getPeriodValue, formatPrice,
} from '@/lib/types'
import { useWatchlist } from '@/lib/watchlist'
import { getSupabaseClient } from '@/lib/supabase'
import { BookmarkIcon, TrendingUpIcon, TrendingDownIcon } from '@/components/Icons'
import TickerModal from '@/components/TickerModal'

const WATCHLIST_PERIODS: Period[] = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y']

type WatchlistHolding = SectorHolding & { sectors?: { name: string } }

const cardStyle = {
  background:  'var(--bg-surface-1)',
  border:      '1px solid var(--border-subtle)',
  boxShadow:   'var(--shadow-glass)',
}

export default function WatchlistPage() {
  const [holdings, setHoldings] = useState<WatchlistHolding[]>([])
  const [selectedTicker, setSelectedTicker] = useState<WatchlistHolding | null>(null)
  const [period, setPeriod] = useState<Period>('YTD')
  const [loading, setLoading] = useState(true)
  const { pinnedTickers, toggle, isPinned, ready } = useWatchlist()

  useEffect(() => {
    getSupabaseClient()
      .from('sector_holdings')
      .select('*, sectors(name)')
      .then(({ data }) => {
        setHoldings((data ?? []) as WatchlistHolding[])
        setLoading(false)
      })
  }, [])

  const rows = useMemo(() => {
    if (!ready || pinnedTickers.length === 0) return []
    const selected = new Set(pinnedTickers)
    const byTicker: Record<string, WatchlistHolding> = {}
    for (const h of holdings) {
      if (!selected.has(h.ticker.toUpperCase())) continue
      const current = byTicker[h.ticker]
      const value = getPeriodValue(h, period) ?? -Infinity
      const currentValue = current ? getPeriodValue(current, period) ?? -Infinity : -Infinity
      if (!current || value > currentValue) byTicker[h.ticker] = h
    }
    return Object.values(byTicker).sort((a, b) =>
      (getPeriodValue(b, period) ?? -Infinity) - (getPeriodValue(a, period) ?? -Infinity)
    )
  }, [holdings, period, pinnedTickers, ready])

  const posCount = rows.filter(h => (getPeriodValue(h, period) ?? 0) >= 0).length

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="animate-pulse h-16 rounded-[20px] bg-white/70 dark:bg-slate-900/70 border border-slate-100 dark:border-white/10" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h2 className="text-[22px] font-black tracking-tight text-slate-900 dark:text-slate-100">Watchlist</h2>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
            {rows.length === 0
              ? 'Tap the bookmark icon on any stock to track it here'
              : `${rows.length} stock${rows.length !== 1 ? 's' : ''} · ${PERIOD_LABELS[period]}`}
          </p>
        </div>

        {rows.length > 0 && (
          <div className="period-control shrink-0" style={{ maxWidth: '100%' }}>
            <div className="period-control-inner">
              {WATCHLIST_PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`period-pill ${period === p ? 'period-pill-active' : ''}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="rounded-[22px] overflow-hidden mb-5" style={cardStyle}>
            <div className="hidden sm:block overflow-x-auto">
              <div style={{ minWidth: '800px' }}>
                <div className="grid grid-cols-[36px_72px_minmax(160px,280px)_72px_repeat(8,54px)] gap-x-2 text-[9px] font-black tracking-[0.18em] uppercase text-slate-400 dark:text-slate-500 px-4 py-3 bg-slate-50/70 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                  <span />
                  <span>Ticker</span>
                  <span>Company</span>
                  <span className="text-right">Price</span>
                  {WATCHLIST_PERIODS.map(p => (
                    <span key={p} className={`text-right ${p === period ? 'text-slate-700 dark:text-slate-300' : ''}`}>{p}</span>
                  ))}
                </div>

                <div className="divide-y divide-slate-50 dark:divide-white/5">
                  {rows.map(h => (
                    <WatchlistRow
                      key={h.ticker}
                      holding={h}
                      period={period}
                      onSelect={() => setSelectedTicker(h)}
                      onToggle={e => { e.stopPropagation(); toggle(h.ticker) }}
                      isPinned={isPinned(h.ticker)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="sm:hidden divide-y divide-slate-50 dark:divide-white/5">
              {rows.map(h => (
                <WatchlistMobileRow
                  key={`${h.ticker}-m`}
                  holding={h}
                  period={period}
                  onSelect={() => setSelectedTicker(h)}
                  onToggle={e => { e.stopPropagation(); toggle(h.ticker) }}
                  isPinned={isPinned(h.ticker)}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
            {WATCHLIST_PERIODS.map(p => {
              const rets = rows.map(s => getPeriodValue(s, p)).filter((v): v is number => v !== null)
              const avg = rets.length ? rets.reduce((a,b) => a+b,0) / rets.length : null
              const periodPosCount = rets.filter(v => v >= 0).length
              const pos = avg !== null && avg >= 0
              const active = p === period
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="rounded-[20px] p-3 sm:p-4 text-left transition-all duration-200"
                  style={active ? {
                    background: avg === null ? '#0f172a' : pos ? '#052e16' : '#4c0519',
                    border: `1px solid ${avg === null ? '#0f172a' : pos ? '#14532d' : '#881337'}`,
                    boxShadow: pos ? '0 4px 16px rgba(5,46,22,0.35)' : '0 4px 16px rgba(76,5,25,0.35)',
                  } : cardStyle}
                >
                  <p className="text-[9px] font-black tracking-[0.18em] uppercase mb-2 text-slate-400 dark:text-slate-500">
                    {p} Avg
                  </p>
                  <p className={`font-mono text-[18px] sm:text-[22px] font-extrabold leading-none tabular-nums mb-2 ${
                    avg === null ? 'text-slate-300 dark:text-slate-600'
                      : pos ? (active ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400')
                      : (active ? 'text-rose-400' : 'text-rose-600 dark:text-rose-400')
                  }`}>
                    {avg !== null ? `${pos ? '+' : ''}${avg.toFixed(1)}%` : '—'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {pos
                      ? <TrendingUpIcon size={11} className={active ? 'text-emerald-400' : 'text-emerald-500'} />
                      : <TrendingDownIcon size={11} className={active ? 'text-rose-400' : 'text-rose-400'} />
                    }
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      {rets.length > 0 ? `${periodPosCount}/${rets.length} +ve` : 'No data'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 mt-5 tracking-widest">
        EAGLEVIEW V4.4.25 · TICKER WATCHLIST
      </p>

      {selectedTicker && (
        <TickerModal
          holding={selectedTicker}
          sectorName={selectedTicker.sectors?.name ?? ''}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </div>
  )
}

function WatchlistToggle({ active, onClick, size = 14 }: { active: boolean; onClick: (e: React.MouseEvent) => void; size?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center rounded-full transition-all ${
        active
          ? 'text-amber-400 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
          : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
      }`}
      aria-label={active ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-pressed={active}
    >
      <BookmarkIcon size={size} filled={active} />
    </button>
  )
}

function WatchlistRow({ holding, period, onSelect, onToggle, isPinned }: {
  holding: WatchlistHolding; period: Period; onSelect: () => void; onToggle: (e: React.MouseEvent) => void; isPinned: boolean
}) {
  const val = getPeriodValue(holding, period)
  const isPos = val !== null && val >= 0
  const sectorName = holding.sectors?.name ?? ''
  return (
    <div
      onClick={onSelect}
      className={`grid grid-cols-[36px_72px_minmax(160px,280px)_72px_repeat(8,54px)] gap-x-2 items-center px-4 py-2.5 transition-colors cursor-pointer ${
        isPos ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-500/10' : 'hover:bg-rose-50/40 dark:hover:bg-rose-500/10'
      }`}
    >
      <WatchlistToggle active={isPinned} onClick={onToggle} />
      <span className={`font-mono text-[11px] font-black px-1.5 py-1 rounded-[8px] text-center inline-block shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
        isPos ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/25' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-500/25'
      }`}>
        {holding.ticker}
      </span>
      <div className="min-w-0 px-2">
        <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{holding.company_name}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sectorName}</p>
      </div>
      <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 text-right tabular-nums">
        {formatPrice(holding.price ?? null)}
      </span>
      {WATCHLIST_PERIODS.map(p => {
        const v = getPeriodValue(holding, p)
        const pos = v !== null && v >= 0
        const bold = p === period
        return (
          <span key={p} className={`font-mono text-right tabular-nums ${
            bold ? `text-[13px] font-extrabold ${pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`
                 : `text-[11px] ${pos ? 'text-emerald-400' : 'text-rose-300'}`
          }`}>
            {v !== null ? `${pos ? '+' : ''}${v.toFixed(1)}%` : '—'}
          </span>
        )
      })}
    </div>
  )
}

function WatchlistMobileRow({ holding, period, onSelect, onToggle, isPinned }: {
  holding: WatchlistHolding; period: Period; onSelect: () => void; onToggle: (e: React.MouseEvent) => void; isPinned: boolean
}) {
  const val = getPeriodValue(holding, period)
  const isPos = val !== null && val >= 0
  const sectorName = holding.sectors?.name ?? ''
  return (
    <div
      onClick={onSelect}
      className={`grid grid-cols-[32px_58px_1fr_66px_64px] gap-x-2 items-center px-3 py-2.5 transition-colors cursor-pointer ${
        isPos ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-500/10' : 'hover:bg-rose-50/40 dark:hover:bg-rose-500/10'
      }`}
    >
      <WatchlistToggle active={isPinned} onClick={onToggle} size={13} />
      <span className={`font-mono text-[10px] font-black px-1 py-1 rounded-[7px] text-center inline-block ${
        isPos ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/25' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-500/25'
      }`}>
        {holding.ticker}
      </span>
      <div className="min-w-0 px-1.5">
        <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{holding.company_name}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sectorName}</p>
      </div>
      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 text-right tabular-nums">
        {formatPrice(holding.price ?? null)}
      </span>
      <span className={`font-mono text-[13px] font-extrabold text-right tabular-nums ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {val !== null ? `${isPos ? '+' : ''}${val.toFixed(1)}%` : '—'}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-14 h-14 rounded-[18px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center mx-auto mb-4 shadow-sm">
        <BookmarkIcon size={24} className="text-slate-200 dark:text-slate-700" />
      </div>
      <p className="text-slate-700 dark:text-slate-300 font-bold text-[15px] mb-1.5">Nothing saved yet</p>
      <p className="text-slate-400 dark:text-slate-500 text-[12px] max-w-xs mx-auto leading-relaxed">
        Tap the bookmark icon on any stock from Holdings or Screener.
      </p>
    </div>
  )
}
