import { FlameIcon, TrendingUpIcon, TrendingDownIcon, AwardIcon } from './Icons'

interface BadgeLegendProps {
  showHot:     boolean
  showRising:  boolean
  showFalling: boolean
  showGold:    boolean
  showSilver:  boolean
}

export default function BadgeLegend({ showHot, showRising, showFalling, showGold, showSilver }: BadgeLegendProps) {
  const terms = [
    showHot && {
      key: 'hot', Icon: FlameIcon, iconClass: 'text-orange-500',
      label: 'Hot', def: 'Top 2 sectors for this timeframe.',
    },
    showRising && {
      key: 'rising', Icon: TrendingUpIcon, iconClass: 'text-sky-500',
      label: 'Rising', def: 'Climbed 5+ ranks since the last sync.',
    },
    showFalling && {
      key: 'falling', Icon: TrendingDownIcon, iconClass: 'text-rose-500',
      label: 'Falling', def: 'Dropped 5+ ranks since the last sync.',
    },
    showGold && {
      key: 'gold', Icon: AwardIcon, iconClass: 'text-amber-500',
      label: 'Gold', def: 'Beats the S&P 500 across 1M, 3M, 6M, and YTD — sustained outperformance.',
    },
    showSilver && {
      key: 'silver', Icon: AwardIcon, iconClass: 'text-slate-400',
      label: 'Silver', def: 'Beats the S&P 500 in 3 of 4 medium-to-long-term timeframes.',
    },
  ].filter((t): t is Exclude<typeof t, false> => t !== false)

  if (terms.length === 0) return null

  return (
    <div className="mt-8 pt-4 border-t border-slate-200/60">
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {terms.map(({ key, Icon, iconClass, label, def }) => (
          <p key={key} className="flex items-baseline gap-1.5 text-[11px] leading-snug">
            <Icon size={11} className={`shrink-0 translate-y-[1px] ${iconClass}`} />
            <span className="font-bold text-slate-500">{label}</span>
            <span className="text-slate-400">{def}</span>
          </p>
        ))}
      </div>
    </div>
  )
}
