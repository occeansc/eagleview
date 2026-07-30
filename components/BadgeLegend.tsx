'use client'

import { useEffect, useState } from 'react'
import { FlameIcon, TrendingUpIcon, TrendingDownIcon, AwardIcon, InfoIcon, CloseIcon } from './Icons'

type SignalTerm = {
  key: string
  Icon: typeof FlameIcon
  iconClass: string
  label: string
  def: string
}

interface BadgeLegendProps {
  showHot:     boolean
  showRising:  boolean
  showFalling: boolean
  showGold:    boolean
  showSilver:  boolean
  showBronze:  boolean
}

export default function BadgeLegend({ showHot, showRising, showFalling, showGold, showSilver, showBronze }: BadgeLegendProps) {
  const [open, setOpen] = useState(false)

  const terms: SignalTerm[] = [
    showHot ? {
      key: 'hot', Icon: FlameIcon, iconClass: 'text-orange-500',
      label: 'Hot', def: 'Top two sectors in the selected timeframe.',
    } : null,
    showRising ? {
      key: 'rising', Icon: TrendingUpIcon, iconClass: 'text-sky-500',
      label: 'Rising', def: 'Climbed five or more ranks since the last sync.',
    } : null,
    showFalling ? {
      key: 'falling', Icon: TrendingDownIcon, iconClass: 'text-rose-500 dark:text-rose-400',
      label: 'Falling', def: 'Dropped five or more ranks since the last sync.',
    } : null,
    showGold ? {
      key: 'gold', Icon: AwardIcon, iconClass: 'text-amber-500',
      label: 'Gold', def: 'Outperformed the S&P 500 across 1M, 3M, 6M, and YTD.',
    } : null,
    showSilver ? {
      key: 'silver', Icon: AwardIcon, iconClass: 'text-slate-400 dark:text-slate-500',
      label: 'Silver', def: 'Outperformed the S&P 500 in three of four medium- and long-term periods.',
    } : null,
    showBronze ? {
      key: 'bronze', Icon: AwardIcon, iconClass: 'text-orange-400/80',
      label: 'Bronze', def: 'Outperformed the S&P 500 in two of four medium- and long-term periods.',
    } : null,
  ].filter((term): term is SignalTerm => term !== null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (terms.length === 0) return null

  return (
    <>
      <div className="mt-7 flex justify-end border-t border-slate-200/60 pt-3 dark:border-white/10">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 text-[11px] font-semibold text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 dark:text-slate-500 dark:hover:text-slate-200"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Open Signal Guide"
          title="How EagleView ranks sector signals"
        >
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-slate-300/80 text-slate-400 transition-colors group-hover:border-slate-400 group-hover:text-sky-600 dark:border-white/20 dark:text-slate-500 dark:group-hover:border-white/35 dark:group-hover:text-sky-300">
            <InfoIcon size={11} />
          </span>
          <span className="hidden sm:inline">Signal guide</span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="signal-guide-title"
            className="w-full max-w-md rounded-t-[1.5rem] border border-slate-200/70 bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 shadow-[0_-20px_70px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[#101827] dark:shadow-[0_-20px_70px_rgba(0,0,0,0.5)] sm:rounded-[1.25rem] sm:px-6 sm:pb-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-slate-200 dark:bg-white/15 sm:hidden" />
            <div className="mb-5 flex items-start justify-between gap-5">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">EagleView</p>
                <h2 id="signal-guide-title" className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">Signal guide</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">A concise read on the badges visible in this ranking.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20 dark:hover:text-white"
                aria-label="Close Signal Guide"
              >
                <CloseIcon size={15} />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-slate-50/70 dark:border-white/8 dark:bg-white/[0.035]">
              {terms.map(({ key, Icon, iconClass, label, def }, index) => (
                <div key={key} className={`flex gap-3 px-4 py-3.5 ${index > 0 ? 'border-t border-slate-200/70 dark:border-white/8' : ''}`}>
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-white/[0.06] ${iconClass}`}>
                    <Icon size={14} />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{def}</p>
                  </div>
                </div>
              ))}
            </div>

            {(showGold || showSilver || showBronze) && (
              <p className="mt-4 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                Medal badges measure relative performance against the S&amp;P 500 across 1M, 3M, 6M, and YTD.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  )
}
