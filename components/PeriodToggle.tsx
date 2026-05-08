'use client'

import { Period } from '@/lib/types'

const PERIODS: Period[] = ['1W', '1M', '3M', 'YTD']

interface Props {
  selected: Period
  onChange: (p: Period) => void
}

export default function PeriodToggle({ selected, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200">
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            selected === p
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  )
}
