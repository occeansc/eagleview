'use client'

import { Period, PERIODS } from '@/lib/types'

interface Props {
  selected: Period
  onChange: (p: Period) => void
}

export default function PeriodToggle({ selected, onChange }: Props) {
  return (
    <div className="period-control shrink-0">
      <div className="period-control-inner">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`period-pill ${selected === p ? 'period-pill-active' : ''}`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
