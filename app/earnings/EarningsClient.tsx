'use client'

import { useState, useMemo } from 'react'
import type { TickerEarnings, SectorHolding } from '@/lib/types'
import { SearchIcon, SunIcon, MoonIcon, CalendarIcon } from '@/components/Icons'
import TickerModal from '@/components/TickerModal'

interface Props {
  earnings: TickerEarnings[]
  holdings: (SectorHolding & { sectors: { name: string } })[]
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

  if (sameDay(d, today))    return 'Today'
  if (sameDay(d, tomorrow)) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

function formatDateSub(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function EarningsClient({ earnings, holdings }: Props) {
  const [query,  setQuery]  = useState('')
  const [sector, setSector] = useState<string>('all')
  const [selectedTicker, setSelectedTicker] = useState<(SectorHolding & { sectors: { name: string } }) | null>(null)

  const holdingByTicker = useMemo(() => {
    const map = new Map<string, SectorHolding & { sectors: { name: string } }>()
    for (const h of holdings) map.set(h.ticker, h)
    return map
  }, [holdings])

  const sectorNames = useMemo(() => {
    const set = new Set(earnings.map(e => e.sector_name).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [earnings])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return earnings.filter(e => {
      if (sector !== 'all' && e.sector_name !== sector) return false
      if (q && !e.ticker.toLowerCase().includes(q) && !e.company_name.toLowerCase().includes(q)) return false
      return true
    })
  }, [earnings, query, sector])

  const TIME_ORDER: Record<string, number> = { bmo: 0, unspecified: 1, amc: 2 }

  const grouped = useMemo(() => {
    const map = new Map<string, TickerEarnings[]>()
    for (const e of filtered) {
      if (!e.earnings_date) continue
      if (!map.has(e.earnings_date)) map.set(e.earnings_date, [])
      map.get(e.earnings_date)!.push(e)
    }
    const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
    // Within each date: BMO (pre-market) first, then unspecified, then AMC
    // (after-close) last — matches the actual chronological order these
    // releases happen in during a real trading day.
    for (const [, rows] of entries) {
      rows.sort((a, b) => (TIME_ORDER[a.earnings_time ?? 'unspecified'] ?? 1) - (TIME_ORDER[b.earnings_time ?? 'unspecified'] ?? 1))
    }
    return entries
  }, [filtered])

  const lastSynced = useMemo(() => {
    if (earnings.length === 0) return null
    return earnings.reduce((latest, e) => (e.updated_at > latest ? e.updated_at : latest), earnings[0].updated_at)
  }, [earnings])

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[22px] font-black tracking-tight text-slate-900 dark:text-slate-100 mb-1">
          Earnings Calendar
        </h2>
        <p className="text-[12px] text-slate-400 dark:text-slate-500">
          {filtered.length.toLocaleString()} upcoming · estimated dates via Yahoo Finance
        </p>
      </div>

      {/* Filters panel */}
      <div
        className="rounded-[22px] p-4 mb-5 space-y-3"
        style={{
          background: 'var(--bg-surface-1)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-glass)',
        }}
      >
        <div className="relative">
          <SearchIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search ticker or company…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/20 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300 transition-all placeholder:text-slate-400 dark:text-slate-500"
          />
        </div>

        <select
          value={sector}
          onChange={e => setSector(e.target.value)}
          className="w-full text-[13px] bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/20 rounded-[12px] px-3 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all"
        >
          <option value="all">All sectors</option>
          {sectorNames.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Grouped results */}
      {grouped.length === 0 ? (
        <div className="text-center py-16">
          <CalendarIcon size={28} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-[13px]">No upcoming earnings match</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([dateIso, rows]) => (
            <div key={dateIso}>
              <h3 className="flex items-baseline gap-1.5 text-[13px] font-black text-slate-700 dark:text-slate-300 mb-2 px-1">
                {formatDateHeader(dateIso)}
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                  {formatDateSub(dateIso)}
                </span>
                <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold ml-auto">
                  {rows.length}
                </span>
              </h3>
              <div
                className="rounded-[18px] overflow-hidden divide-y divide-slate-50 dark:divide-white/5"
                style={{
                  background: 'var(--bg-surface-1)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-glass)',
                }}
              >
                {rows.map(e => {
                  const holding = holdingByTicker.get(e.ticker)
                  return (
                    <div
                      key={e.ticker}
                      onClick={() => holding && setSelectedTicker(holding)}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${holding ? 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/5' : ''}`}
                    >
                      <span className="font-mono text-[11px] font-black px-1.5 py-1 rounded-[8px] bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/20 shrink-0">
                        {e.ticker}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                          {e.company_name}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {e.sector_name}
                        </p>
                      </div>
                      {e.earnings_time === 'bmo' && (
                        <span className="flex items-center gap-1 text-[9px] font-black tracking-wide bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/25 px-2 py-1 rounded-full shrink-0">
                          <SunIcon size={9} /> BMO
                        </span>
                      )}
                      {e.earnings_time === 'amc' && (
                        <span className="flex items-center gap-1 text-[9px] font-black tracking-wide bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-500/25 px-2 py-1 rounded-full shrink-0">
                          <MoonIcon size={9} /> AMC
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>Eagleview v4.4.27</span>
        {lastSynced && (
          <span>
            Last sync: {new Date(lastSynced).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })}
          </span>
        )}
      </div>

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
