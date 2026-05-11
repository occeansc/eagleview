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

  const spx     = benchmarks.find(b => b.ticker === '^GSPC')
  const pinned  = useMemo(() =>
    ready ? sectors.filter(s => pinnedIds.includes(s.id)) : [],
    [sectors, pinnedIds, ready]
  )
  const sorted  = useMemo(() =>
    [...pinned].sort((a, b) => (getPeriodValue(b, period) ?? -Infinity) - (getPeriodValue(a, period) ?? -Infinity)),
    [pinned, period]
  )

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Watchlist</h2>
          <p className="text-sm text-slate-400">
            {sorted.length} sector{sorted.length !== 1 ? 's' : ''} pinned ·{' '}
            tap the bookmark on any sector card to add
          </p>
        </div>
        {sorted.length > 0 && <PeriodToggle selected={period} onChange={setPeriod} />}
      </div>

      {sorted.length === 0 ? (
        <EmptyWatchlist sectors={sectors} pinnedIds={pinnedIds} toggle={toggle} />
      ) : (
        <>
          {/* ── Watchlist table ──────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-5">
            <div className="grid grid-cols-[1fr_repeat(4,72px)_40px] text-[10px] font-bold tracking-widest text-slate-400 uppercase px-4 py-3 border-b border-slate-100 bg-slate-50">
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
                  className="grid grid-cols-[1fr_repeat(4,72px)_40px] items-center px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer"
                  onClick={() => setSelected(sector)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{sector.name}</p>
                      {sc === 'gold'   && <span className="text-[9px] font-bold text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">GOLD</span>}
                      {sc === 'silver' && <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">SILVER</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{sector.stock_count} stocks · breadth {sector.breadth_ytd ?? '—'}%</p>
                  </div>

                  {PERIODS.map(p => {
                    const val  = getPeriodValue(sector, p)
                    const pos  = val !== null && val >= 0
                    const bold = p === period
                    return (
                      <span key={p} className={`font-mono text-xs text-right ${bold ? 'font-bold' : ''} ${
                        val === null ? 'text-slate-300' : pos
                          ? bold ? 'text-emerald-600' : 'text-emerald-500'
                          : bold ? 'text-rose-600'    : 'text-rose-400'
                      }`}>
                        {val !== null ? `${pos ? '+' : ''}${val.toFixed(1)}%` : '—'}
                      </span>
                    )
                  })}

                  <button
                    onClick={e => { e.stopPropagation(); toggle(sector.id) }}
                    className="text-amber-400 hover:text-rose-400 transition-colors flex justify-center"
                    title="Remove from watchlist"
                  >
                    <BookmarkIcon size={15} filled />
                  </button>
                </div>
              )
            })}
          </div>

          {/* ── Quick stats ────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PERIODS.map(p => {
              const returns = sorted.map(s => getPeriodValue(s, p)).filter((v): v is number => v !== null)
              const avg = returns.length ? returns.reduce((a,b) => a+b, 0) / returns.length : null
              const pos = avg !== null && avg >= 0
              return (
                <div key={p} className="bg-white rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">{p} avg</p>
                  <p className={`font-mono text-lg font-semibold ${avg === null ? 'text-slate-300' : pos ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {avg !== null ? `${pos ? '+' : ''}${avg.toFixed(1)}%` : '—'}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {pos ? <TrendingUpIcon size={11} className="text-emerald-500" /> : <TrendingDownIcon size={11} className="text-rose-400" />}
                    <span className="text-[10px] text-slate-400">
                      {sorted.filter(s => (getPeriodValue(s, p) ?? 0) >= 0).length}/{sorted.length} positive
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {selected && (
        <HoldingsModal sector={selected} period={period} benchmarks={benchmarks} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function EmptyWatchlist({ sectors, pinnedIds, toggle }: {
  sectors: Sector[]; pinnedIds: number[]
  toggle: (id: number) => void
}) {
  return (
    <div className="text-center py-12">
      <BookmarkIcon size={40} className="mx-auto mb-4 text-slate-200" />
      <p className="text-slate-600 font-semibold text-lg mb-2">No sectors pinned yet</p>
      <p className="text-slate-400 text-sm mb-8">Tap the bookmark icon on any sector card to track it here.</p>

      <div className="max-w-sm mx-auto">
        <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3">Quick-add</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {sectors.slice(0, 8).map(s => (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                pinnedIds.includes(s.id)
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <BookmarkIcon size={11} filled={pinnedIds.includes(s.id)} />
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
