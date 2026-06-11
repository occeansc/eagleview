'use client'

import { Sector, RegimeType, computeRegime } from '@/lib/types'
import { TrendingUpIcon, TrendingDownIcon } from './Icons'

interface Props {
  sectors: Sector[]
}

const CONFIG: Record<RegimeType, {
  label: string
  sub: string
  bg: string
  border: string
  text: string
  accent: string
}> = {
  'risk-on': {
    label:  'Risk-ON',
    sub:    'Growth sectors leading',
    bg:     'bg-emerald-50',
    border: 'border-emerald-200',
    text:   'text-emerald-800',
    accent: 'text-emerald-600',
  },
  'risk-off': {
    label:  'Risk-OFF',
    sub:    'Defensive rotation underway',
    bg:     'bg-rose-50',
    border: 'border-rose-200',
    text:   'text-rose-800',
    accent: 'text-rose-500',
  },
  'mixed': {
    label:  'Mixed',
    sub:    'No clear sector leadership',
    bg:     'bg-slate-50',
    border: 'border-slate-200',
    text:   'text-slate-700',
    accent: 'text-slate-500',
  },
  'loading': {
    label:  '—',
    sub:    '',
    bg:     'bg-slate-50',
    border: 'border-slate-100',
    text:   'text-slate-400',
    accent: 'text-slate-300',
  },
}

export default function MarketRegime({ sectors }: Props) {
  const regime = computeRegime(sectors)
  const cfg    = CONFIG[regime]

  return (
    <div className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border ${cfg.bg} ${cfg.border} select-none`}>
      {regime === 'risk-on'  && <TrendingUpIcon   size={14} className={cfg.accent} />}
      {regime === 'risk-off' && <TrendingDownIcon  size={14} className={cfg.accent} />}
      {regime === 'mixed'    && (
        <span className={`w-3.5 h-0.5 rounded-full bg-current ${cfg.accent}`} />
      )}
      <div>
        <span className={`text-xs font-bold tracking-wide ${cfg.text}`}>{cfg.label}</span>
        {cfg.sub && (
          <span className={`text-[10px] ml-1.5 ${cfg.accent}`}>{cfg.sub}</span>
        )}
      </div>
    </div>
  )
}
