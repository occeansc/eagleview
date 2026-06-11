'use client'

import { Period } from '@/lib/types'

const PERIODS: Period[] = ['1W', '1M', '3M', 'YTD']

interface Props {
  selected: Period
  onChange: (p: Period) => void
}

export default function PeriodToggle({ selected, onChange }: Props) {
  return (
    <div className="relative flex items-center gap-1 bg-slate-100/70 p-1.5 rounded-[16px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] border border-slate-200/50">
      {PERIODS.map((p) => {
        const isSelected = selected === p
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`relative px-4 py-1.5 rounded-xl text-[13px] font-semibold tracking-wide transition-colors duration-200 ease-out z-10 select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
              isSelected
                ? 'text-slate-900'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/40'
            }`}
          >
            {isSelected && (
              <span className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-black/[0.04] -z-10 transition-transform" />
            )}
            {p}
          </button>
        )
      })}
    </div>
  )
}