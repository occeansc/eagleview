'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal }                  from 'react-dom'
import type { SectorHolding }            from '@/lib/types'
import { formatPrice }                   from '@/lib/types'
import { CloseIcon }                     from './Icons'
import type { TickerInfo }               from '@/app/api/ticker-info/[symbol]/route'

interface Props {
  holding:    SectorHolding
  sectorName: string
  onClose:    () => void
}

/* ── Layer 3: client-side module-level cache ────────────────────────────────
   Lives for the JS module lifetime (browser session). Shared across every
   modal open — opening NVDA from HoldingsModal then from the Screener reuses
   the same cached object with zero additional requests. GC'd automatically
   when the user navigates away. No TTL logic needed at this layer.          */
const clientCache = new Map<string, TickerInfo>()

/* ── Tile palette — consistent with HeatmapClient ──────────────────────── */
type Pal = { bg: string; text: string; muted: string }
function pal(pct: number | null): Pal {
  if (pct === null)             return { bg: '#f8fafc', text: '#94a3b8', muted: '#cbd5e1' }
  if (pct > -0.5 && pct < 0.5) return { bg: '#f1f5f9', text: '#475569', muted: '#94a3b8' }
  if (pct >= 20)  return { bg: '#14532d', text: '#ffffff', muted: '#86efac' }
  if (pct >= 10)  return { bg: '#15803d', text: '#ffffff', muted: '#d1fae5' }
  if (pct >=  3)  return { bg: '#22c55e', text: '#ffffff', muted: '#dcfce7' }
  if (pct >= 0.5) return { bg: '#bbf7d0', text: '#14532d', muted: '#166534' }
  if (pct <= -20) return { bg: '#7f1d1d', text: '#ffffff', muted: '#fca5a5' }
  if (pct <= -10) return { bg: '#b91c1c', text: '#ffffff', muted: '#fecaca' }
  if (pct <=  -3) return { bg: '#ef4444', text: '#ffffff', muted: '#fecdd3' }
  return                 { bg: '#fecdd3', text: '#7f1d1d', muted: '#e11d48' }
}

function fmt(v: number | null, digits = 1) {
  if (v === null) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`
}

function fmtEmployees(n: number | null): string | null {
  if (!n) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M employees`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K employees`
  return `${n} employees`
}

const TILES: { label: string; key: keyof SectorHolding }[] = [
  { label: '1D',  key: 'day_pct'       },
  { label: '1W',  key: 'week_pct'      },
  { label: '1M',  key: 'month_pct'     },
  { label: '3M',  key: 'quarter_pct'   },
  { label: '6M',  key: 'half_year_pct' },
  { label: 'YTD', key: 'ytd_pct'       },
]

/* ── Component ─────────────────────────────────────────────────────────── */
export default function TickerModal({ holding, sectorName, onClose }: Props) {
  const [mounted,  setMounted]  = useState(false)
  const [info,     setInfo]     = useState<TickerInfo | null>(null)
  const [loading,  setLoading]  = useState(true)
  const overlayRef              = useRef<HTMLDivElement>(null)
  const abortRef                = useRef<AbortController | null>(null)

  useEffect(() => { setMounted(true) }, [])

  /* Fetch company info — check client cache first */
  useEffect(() => {
    const ticker = holding.ticker
    if (clientCache.has(ticker)) {
      setInfo(clientCache.get(ticker)!)
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setInfo(null)

    fetch(`/api/ticker-info/${ticker}?company=${encodeURIComponent(holding.company_name)}`, { signal: abortRef.current.signal })
      .then(r => r.json())
      .then((data: TickerInfo) => {
        clientCache.set(ticker, data)   // warm the module-level cache
        setInfo(data)
        setLoading(false)
      })
      .catch(err => {
        if (err.name !== 'AbortError') setLoading(false)
      })

    return () => { abortRef.current?.abort() }
  }, [holding.ticker])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!mounted) return null

  const hasYtd   = holding.ytd_pct !== null
  const pos      = hasYtd && holding.ytd_pct! >= 0
  const neutral  = !hasYtd
  const price    = formatPrice(holding.price ?? null)
  const ytdAbs   = Math.abs(holding.ytd_pct ?? 0)
  const alpha    = hasYtd ? Math.min(0.08 + (ytdAbs / 100) * 0.16, 0.22) : 0
  const gradRgb  = neutral ? '148,163,184' : pos ? '16,185,129' : '244,63,94'
  const headerBg = `linear-gradient(180deg, rgba(${gradRgb},${alpha}) 0%, rgba(255,255,255,0) 100%)`

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 flex flex-col justify-end sm:justify-center sm:items-center sm:p-6 bg-black/30 backdrop-blur-[2px]"
      style={{ zIndex: 10001 }}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="modal-sheet w-full sm:max-w-lg sm:rounded-[28px] rounded-t-[28px] flex flex-col overflow-hidden bg-white">

        {/* ── Gradient header ── */}
        <div className="shrink-0" style={{ background: headerBg }}>
          {/* Drag handle */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className={`w-10 h-1 rounded-full ${neutral ? 'bg-slate-300/50' : pos ? 'bg-emerald-300/50' : 'bg-rose-300/50'}`} />
          </div>

          <div className="px-5 pt-4 sm:pt-5 pb-4 border-b border-slate-100/80 relative">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 bg-white/80 hover:bg-white flex items-center justify-center rounded-full text-slate-400 hover:text-slate-800 transition-colors shadow-sm"
              aria-label="Close"
            >
              <CloseIcon size={13} />
            </button>

            <div className="flex items-center gap-3 pr-10">
              <span className={`font-mono text-[13px] font-black px-2.5 py-1.5 rounded-[9px] shrink-0 border ${
                neutral ? 'bg-slate-50/80  text-slate-600  border-slate-100'
                    : pos ? 'bg-emerald-50/80 text-emerald-700 border-emerald-100'
                    : 'bg-rose-50/80    text-rose-700    border-rose-100'
              }`}>
                {holding.ticker}
              </span>
              <div className="min-w-0">
                <p className="text-[16px] font-black text-slate-900 leading-snug truncate">
                  {holding.company_name}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {sectorName}{price !== '—' ? <> · <span className="font-mono">{price}</span></> : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto overscroll-contain">

          {/* Performance heatmap */}
          <div className="px-5 pt-5 pb-4">
            <p className="text-[8px] font-black tracking-[0.22em] uppercase text-slate-400 mb-3">
              Performance
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TILES.map(({ label, key }) => {
                const v       = holding[key] as number | null
                const pending = v === null
                const p       = pal(v)
                const formatted = fmt(v)
                // Shrink font for large numbers (>6 chars) to prevent overflow
                const numSize = formatted.length > 7 ? 'text-[13px]' : formatted.length > 5 ? 'text-[15px]' : 'text-[17px]'

                if (pending) {
                  return (
                    <div
                      key={label}
                      className="rounded-[12px] pt-3 pb-2.5 px-2 flex flex-col items-start"
                      style={{
                        backgroundColor: 'transparent',
                        border: '1.5px dashed rgba(148,163,184,0.35)',
                      }}
                    >
                      <span className="text-[8px] font-black tracking-[0.18em] uppercase mb-2 leading-none text-slate-400">
                        {label}
                      </span>
                      <span className="text-[12px] font-bold text-slate-300 leading-none">
                        N/A
                      </span>
                    </div>
                  )
                }

                return (
                  <div
                    key={label}
                    className="rounded-[12px] pt-3 pb-2.5 px-2 flex flex-col items-start"
                    style={{ backgroundColor: p.bg }}
                  >
                    <span
                      className="text-[8px] font-black tracking-[0.18em] uppercase mb-2 leading-none"
                      style={{ color: p.muted }}
                    >
                      {label}
                    </span>
                    <span
                      className={`font-black tabular-nums leading-none ${numSize}`}
                      style={{ color: p.text }}
                    >
                      {formatted}
                    </span>
                  </div>
                )
              })}
            </div>

          </div>

          {/* About section */}
          <div className="px-5 pb-5">
            <div className="h-px bg-slate-100 mb-4" />
            <p className="text-[8px] font-black tracking-[0.22em] uppercase text-slate-400 mb-3">
              About
            </p>

            {loading ? (
              /* Skeleton */
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-slate-100 rounded-full w-full" />
                <div className="h-3 bg-slate-100 rounded-full w-[95%]" />
                <div className="h-3 bg-slate-100 rounded-full w-[88%]" />
                <div className="h-3 bg-slate-100 rounded-full w-[70%] mt-1" />
              </div>
            ) : info?.description ? (
              <>
                <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                  {info.description}
                </p>
                {/* Chips row */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {info.industry && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200/60">
                      {info.industry}
                    </span>
                  )}
                  {info.country && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200/60">
                      {info.country}
                    </span>
                  )}
                  {fmtEmployees(info.employees) && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200/60">
                      {fmtEmployees(info.employees)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[12px] text-slate-400 italic">
                Company info unavailable for {holding.ticker}.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-white/90 shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            Eagleview v4.4.10
          </p>
          {info?.website && (
            <a
              href={info.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-slate-400 hover:text-slate-700 underline underline-offset-2 transition-colors"
            >
              Website ↗
            </a>
          )}
        </div>

      </div>
    </div>,
    document.body,
  )
}
