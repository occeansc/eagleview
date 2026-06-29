'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Sector, Benchmark, Period, PERIOD_LABELS,
  getPeriodValue, computeScorecard,
} from '@/lib/types'
import { useWatchlist } from '@/lib/watchlist'
import { getSupabaseClient } from '@/lib/supabase'
import { BookmarkIcon, TrendingUpIcon, TrendingDownIcon } from '@/components/Icons'
import HoldingsModal from '@/components/HoldingsModal'

// Watchlist shows all 5 periods including 1D — consistent with Dashboard/Heatmap/Screener
const WATCHLIST_PERIODS: Period[] = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y']

const cardStyle = {
  background:  '#ffffff',
  border:      '1px solid rgba(226,232,240,0.55)',
  boxShadow:   '0 1px 0 rgba(255,255,255,1) inset, 0 1px 3px rgba(0,0,0,0.035), 0 2px 8px rgba(0,0,0,0.025)',
}

export default function WatchlistPage() {
  const [sectors,    setSectors]    = useState<Sector[]>([])
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
  const [selected,   setSelected]   = useState<Sector | null>(null)
  const [period,     setPeriod]     = useState<Period>('YTD')
  const [loading,    setLoading]    = useState(true)
  const { pinnedIds, toggle, isPinned, ready } = useWatchlist()

  useEffect(() => {
    const sb = getSupabaseClient()
    Promise.all([sb.from('sectors').select('*'), sb.from('benchmarks').select('*')])
      .then(([s, b]) => {
        setSectors((s.data ?? []) as Sector[])
        setBenchmarks((b.data ?? []) as Benchmark[])
        setLoading(false)
      })
  }, [])

  const spx    = benchmarks.find(b => b.ticker === '^GSPC')
  const pinned = useMemo(() =>
    ready ? sectors.filter(s => pinnedIds.includes(s.id)) : [],
    [sectors, pinnedIds, ready]
  )
  const sorted = useMemo(() =>
    [...pinned].sort((a, b) =>
      (getPeriodValue(b, period) ?? -Infinity) - (getPeriodValue(a, period) ?? -Infinity)
    ), [pinned, period]
  )

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="animate-pulse h-16 rounded-[20px] bg-white/70 border border-slate-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h2 className="text-[22px] font-black tracking-tight text-slate-900">Watchlist</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {sorted.length === 0
              ? 'Pin sectors from the dashboard to track them here'
              : `${sorted.length} sector${sorted.length !== 1 ? 's' : ''} pinned`}
          </p>
        </div>

        {/* Period pills — 5 periods including 1D */}
        {sorted.length > 0 && (
          <div className="flex gap-1 bg-slate-100/70 rounded-full p-1 border border-slate-200/60 shrink-0">
            {WATCHLIST_PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-200 ${
                  period === p
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState sectors={sectors} pinnedIds={pinnedIds} toggle={toggle} />
      ) : (
        <>
          {/* Comparison table */}
          <div className="rounded-[22px] overflow-hidden mb-5" style={cardStyle}>
            <div className="overflow-x-auto">
              <div style={{ minWidth: '530px' }}>
                <div className="grid grid-cols-[1fr_repeat(7,48px)_44px] text-[9px] font-black tracking-[0.18em] uppercase text-slate-400 px-5 py-3 bg-slate-50/70 border-b border-slate-100">
                  <span>Sector</span>
                  {WATCHLIST_PERIODS.map(p => (
                    <span key={p} className={`text-right ${p === period ? 'text-slate-700' : ''}`}>{p}</span>
                  ))}
                  <span />
                </div>

                {sorted.map(sector => {
                  const sc = computeScorecard(sector, spx)
                  return (
                    <div
                      key={sector.id}
                      onClick={() => setSelected(sector)}
                      className="grid grid-cols-[1fr_repeat(7,48px)_44px] items-center px-5 py-3.5 hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 cursor-pointer"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-bold text-slate-800">{sector.name}</p>
                          {sc === 'gold' && (
                            <span className="text-[8px] font-black tracking-widest bg-amber-50 border border-amber-200/70 text-amber-600 px-1.5 py-0.5 rounded-full uppercase">Gold</span>
                          )}
                          {sc === 'silver' && (
                            <span className="text-[8px] font-black tracking-widest bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full uppercase">Silver</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {sector.stock_count} assets
                          {sector.breadth_ytd != null && ` · ${sector.breadth_ytd}% br. YTD`}
                        </p>
                      </div>

                      {WATCHLIST_PERIODS.map(p => {
                        const val  = getPeriodValue(sector, p)
                        const pos  = val !== null && val >= 0
                        const bold = p === period
                        return (
                          <span key={p} className={`font-mono text-right tabular-nums ${bold ? 'font-extrabold' : 'font-semibold'} ${
                            val === null ? 'text-slate-300'
                              : pos ? (bold ? 'text-emerald-600' : 'text-emerald-400')
                              : (bold ? 'text-rose-600' : 'text-rose-300')
                          } ${bold ? 'text-[13px]' : 'text-[11px]'}`}>
                            {val !== null ? `${pos ? '+' : ''}${val.toFixed(1)}%` : '—'}
                          </span>
                        )
                      })}

                      <button
                        onClick={e => { e.stopPropagation(); toggle(sector.id) }}
                        className="flex justify-center items-center w-8 h-8 rounded-full text-amber-400 hover:text-rose-400 hover:bg-rose-50 transition-all"
                        title="Remove"
                      >
                        <BookmarkIcon size={14} filled />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Stats grid — one card per period */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
            {WATCHLIST_PERIODS.map(p => {
              const rets     = sorted.map(s => getPeriodValue(s, p)).filter((v): v is number => v !== null)
              const avg      = rets.length ? rets.reduce((a,b) => a+b,0) / rets.length : null
              const posCount = rets.filter(v => v >= 0).length
              const pos      = avg !== null && avg >= 0
              const active   = p === period
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="rounded-[20px] p-3 sm:p-4 text-left transition-all duration-200"
                  style={active ? {
                    background: avg === null ? '#0f172a'
                      : pos ? '#052e16'
                      :        '#4c0519',
                    border: `1px solid ${avg === null ? '#0f172a' : pos ? '#14532d' : '#881337'}`,
                    boxShadow: pos
                      ? '0 4px 16px rgba(5,46,22,0.35)'
                      : '0 4px 16px rgba(76,5,25,0.35)',
                  } : cardStyle}
                >
                  <p className="text-[9px] font-black tracking-[0.18em] uppercase mb-2 text-slate-400">
                    {p} Avg
                  </p>
                  <p className={`font-mono text-[18px] sm:text-[22px] font-extrabold leading-none tabular-nums mb-2 ${
                    avg === null ? 'text-slate-300'
                      : pos ? (active ? 'text-emerald-400' : 'text-emerald-600')
                      : (active ? 'text-rose-400' : 'text-rose-600')
                  }`}>
                    {avg !== null ? `${pos ? '+' : ''}${avg.toFixed(1)}%` : '—'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {pos
                      ? <TrendingUpIcon  size={11} className={active ? 'text-emerald-400' : 'text-emerald-500'} />
                      : <TrendingDownIcon size={11} className={active ? 'text-rose-400'   : 'text-rose-400'}   />
                    }
                    <span className="text-[10px] font-semibold text-slate-400">
                      {rets.length > 0 ? `${posCount}/${rets.length} +ve` : 'No data'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
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

function EmptyState({ sectors, pinnedIds, toggle }: {
  sectors: Sector[]; pinnedIds: number[]; toggle: (id: number) => void
}) {
  const top = sectors
    .filter(s => s.ytd_pct !== null)
    .sort((a, b) => (b.ytd_pct ?? 0) - (a.ytd_pct ?? 0))
    .slice(0, 6)

  return (
    <div className="text-center py-12">
      <div className="w-14 h-14 rounded-[18px] bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
        <BookmarkIcon size={24} className="text-slate-200" />
      </div>
      <p className="text-slate-700 font-bold text-[15px] mb-1.5">Nothing pinned yet</p>
      <p className="text-slate-400 text-[12px] mb-8 max-w-xs mx-auto leading-relaxed">
        Tap the bookmark icon on any sector card from the Dashboard to start tracking it here.
      </p>
      {top.length > 0 && (
        <div className="max-w-sm mx-auto">
          <p className="text-[9px] font-black tracking-[0.18em] uppercase text-slate-400 mb-3">
            Quick-add top sectors
          </p>
          <div className="flex flex-col gap-2">
            {top.map(s => {
              const pinned = pinnedIds.includes(s.id)
              const pos = (s.ytd_pct ?? 0) >= 0
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[16px] border text-left transition-all ${
                    pinned
                      ? 'bg-amber-50 border-amber-200/70 shadow-[0_2px_8px_rgba(251,191,36,0.12)]'
                      : 'bg-white border-slate-200/60 hover:border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                  }`}
                >
                  <BookmarkIcon size={13} filled={pinned} className={pinned ? 'text-amber-400' : 'text-slate-300'} />
                  <span className="flex-1 text-[13px] font-semibold text-slate-700">{s.name}</span>
                  {s.ytd_pct !== null && (
                    <span className={`font-mono text-[12px] font-bold tabular-nums ${pos ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {pos ? '+' : ''}{s.ytd_pct.toFixed(1)}%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
