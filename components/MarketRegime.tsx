'use client'

import { Sector, RegimeType, computeRegime } from '@/lib/types'
import { TrendingUpIcon, TrendingDownIcon } from './Icons'
import { useTheme } from './ThemeProvider'

const CONFIG: Record<RegimeType, {
  label:  string
  sub:    string
  dot:    string
  pill:   string
  text:   string
  accent: string
}> = {
  'risk-on': {
    label:  'Risk-ON',
    sub:    'Growth sectors leading',
    dot:    'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
    pill:   'bg-emerald-50/90 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/25',
    text:   'text-emerald-800 dark:text-emerald-300',
    accent: 'text-emerald-500',
  },
  'risk-off': {
    label:  'Risk-OFF',
    sub:    'Defensive rotation',
    dot:    'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]',
    pill:   'bg-rose-50/90 dark:bg-rose-500/10 border-rose-200/60 dark:border-rose-500/25',
    text:   'text-rose-800 dark:text-rose-300',
    accent: 'text-rose-500 dark:text-rose-400',
  },
  'mixed': {
    label:  'Mixed',
    sub:    'No clear leadership',
    dot:    'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    pill:   'bg-amber-50/90 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/25',
    text:   'text-amber-800 dark:text-amber-300',
    accent: 'text-amber-500',
  },
  'loading': {
    label:  '—',
    sub:    '',
    dot:    'bg-slate-300 dark:bg-slate-600',
    pill:   'bg-slate-50/60 dark:bg-white/5 border-slate-200/40 dark:border-white/20',
    text:   'text-slate-400 dark:text-slate-500',
    accent: 'text-slate-300 dark:text-slate-600',
  },
}

export default function MarketRegime({ sectors }: { sectors: Sector[] }) {
  const regime = computeRegime(sectors)
  const cfg    = CONFIG[regime]
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm ${cfg.pill}`}
      style={{
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 4px rgba(0,0,0,0.3)'
          : '0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Pulsing dot */}
      <span className="relative flex items-center justify-center w-2 h-2">
        <span className={`absolute inline-flex w-full h-full rounded-full pulse-blip ${cfg.dot} opacity-60`} />
        <span className={`relative w-2 h-2 rounded-full ${cfg.dot}`} />
      </span>

      {/* Label + sub */}
      <span className={`text-[10px] font-bold tracking-wide ${cfg.text}`}>
        {cfg.label}
      </span>
      {cfg.sub && regime !== 'loading' && (
        <span className={`regime-sub text-[9px] ${cfg.accent} hidden sm:inline`}>
          · {cfg.sub}
        </span>
      )}

      {regime === 'risk-on'  && <TrendingUpIcon   size={11} className={cfg.accent} />}
      {regime === 'risk-off' && <TrendingDownIcon  size={11} className={cfg.accent} />}
    </div>
  )
}
