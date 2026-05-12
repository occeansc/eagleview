'use client'

import { useState, useEffect, useMemo } from 'react'
import { Sector, Benchmark, Period, PERIODS, PERIOD_LABELS, getPeriodValue, computeScorecard } from '@/lib/types'
import { useWatchlist } from '@/lib/watchlist'
import { getSupabaseClient } from '@/lib/supabase'
import { BookmarkIcon, TrendingUpIcon, TrendingDownIcon } from '@/components/Icons'
import HoldingsModal from '@/components/HoldingsModal'
import PeriodToggle from '@/components/PeriodToggle'

export default function WatchlistPage() {
  const [sectors, setSectors]       = useState<Sector[]>([])
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
  const [selected, setSelected]     = useState<Sector | null>(null)
  const [period, setPeriod]         = useState<Period>('YTD')
  const [loading, setLoading]       = useState(true)
  const { pinnedIds, toggle, isPinned, ready } = useWatchlist()

  useEffect(() => {
    const sb = getSupabaseClient()
    Promise.all([
      sb.from('sectors').select('*'),
      sb.from('benchmarks').select('*'),
    ]).then(([s, b]) => {
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
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6">
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-2xl border border-slate-100" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6">

      {/* ── Header ──────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Watchlist</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {sorted.length === 0
                ? 'Pin sectors from the dashboard to track them here'
                : `${sorted.length} sector${sorted.length !== 1 ? 's' : ''} pinned`
              }
            </p>
          </div>
          {sorted.length > 0 && (
            <PeriodToggle selected={period} onChange={setPeriod} />
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyWatchlist sectors={sectors} pinnedIds={pinnedIds} toggle={toggle} />
      ) : (
        <>
          {/* ── Sector comparison table ──────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
            <div className="overflow-x-auto">
              <div style={{ minWidth: '400px' }}>
                <div className="grid grid-cols-[1fr_repeat(4,64px)_40px] text-[10px] font-bold tracking-widest text-slate-400 uppercase px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                  <span>Sector</span>
                  {PERIODS.map(p => (
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
                      className="grid grid-cols-[1fr_repeat(4,64px)_40px] items-center px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">{sector.name}</p>
                          {sc === 'gold' && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">GOLD</span>
                          )}
                          {sc === 'silver' && (
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">SILVER</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {sector.stock_count} stocks
                          {sector.breadth_ytd != null && ` · ${sector.breadth_ytd}% breadth YTD`}
                        </p>
                      </div>

                      {PERIODS.map(p => {
                        const val  = getPeriodValue(sector, p)
                        const pos  = val !== null && val >= 0
                        const bold = p === period
                        return (
                          <span key={p} className={`font-mono text-xs text-right tabular-nums ${bold ? 'font-bold' : ''} ${
                            val === null ? 'text-slate-300'
                              : pos ? (bold ? 'text-emerald-600' : 'text-emerald-400')
                              : (bold ? 'text-rose-600' : 'text-rose-300')
                          }`}>
                            {val !== null ? `${pos ? '+' : ''}${val.toFixed(1)}%` : '—'}
                          </span>
                        )
                      })}

                      <button
                        onClick={e => { e.stopPropagation(); toggle(sector.id) }}
                        className="flex justify-center text-amber-400 hover:text-rose-400 transition-colors"
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

          {/* ── Stats grid ───────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {PERIODS.map(p => {
              const returns = sorted
                .map(s => getPeriodValue(s, p))
                .filter((v): v is number => v !== null)
              const avg      = returns.length ? returns.reduce((a,b) => a+b,0) / returns.length : null
              const posCount = returns.filter(v => v >= 0).length
              const pos      = avg !== null && avg >= 0
              const active   = p === period
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-2xl border p-3.5 text-left transition-all ${
                    active ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className={`text-[10px] font-bold tracking-widest uppercase mb-1.5 ${active ? 'text-slate-400' : 'text-slate-400'}`}>
                    {PERIOD_LABELS[p]} avg
                  </p>
                  <p className={`font-mono text-xl font-bold ${
                    avg === null ? 'text-slate-300'
                      : pos ? (active ? 'text-emerald-400' : 'text-emerald-600')
                      : (active ? 'text-rose-400' : 'text-rose-600')
                  }`}>
                    {avg !== null ? `${pos ? '+' : ''}${avg.toFixed(1)}%` : '—'}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {pos
                      ? <TrendingUpIcon size={11} className={active ? 'text-emerald-400' : 'text-emerald-500'} />
                      : <TrendingDownIcon size={11} className={active ? 'text-rose-400' : 'text-rose-400'} />
                    }
                    <span className={`text-[10px] ${active ? 'text-slate-400' : 'text-slate-400'}`}>
                      {returns.length > 0
                        ? `${posCount}/${returns.length} positive`
                        : 'No data'
                      }
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

function EmptyWatchlist({ sectors, pinnedIds, toggle }: {
  sectors: Sector[]; pinnedIds: number[]
  toggle: (id: number) => void
}) {
  const topSectors = sectors
    .filter(s => s.ytd_pct !== null)
    .sort((a, b) => (b.ytd_pct ?? 0) - (a.ytd_pct ?? 0))
    .slice(0, 6)

  return (
    <div className="text-center py-10">
      <BookmarkIcon size={36} className="mx-auto mb-4 text-slate-200" />
      <p className="text-slate-600 font-semibold text-base mb-1.5">Nothing pinned yet</p>
      <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">
        Tap the bookmark icon on any sector card from the Dashboard to track it here.
      </p>

      {topSectors.length > 0 && (
        <div className="max-w-sm mx-auto">
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3">
            Quick-add top sectors
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {topSectors.map(s => {
              const pinned = pinnedIds.includes(s.id)
              const pos    = (s.ytd_pct ?? 0) >= 0
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    pinned
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <BookmarkIcon size={10} filled={pinned} />
                  <span>{s.name}</span>
                  {s.ytd_pct !== null && (
                    <span className={`font-mono ${pos ? 'text-emerald-500' : 'text-rose-400'}`}>
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
