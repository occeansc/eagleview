import { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const base = (size: number, props: IconProps): Omit<SVGProps<SVGSVGElement>, 'size'> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

/** Eagle / Brand mark */
export function EagleIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size, p)} viewBox="0 0 32 32">
      <path d="M 15 15 C 13 13 9 11 4 13 C 6 14 8 15 9 17 C 11 16 13 16 15 17 Z" fill="currentColor" />
      <path d="M 17 15 C 19 13 23 11 28 13 C 26 14 24 15 23 17 C 21 16 19 16 17 17 Z" fill="currentColor" />
      <ellipse cx="16" cy="17" rx="2" ry="5" fill="currentColor" />
      <circle cx="16" cy="10" r="3" fill="currentColor" />
      <path d="M 14 22 L 13 27 L 16 24 L 19 27 L 18 22 Z" fill="currentColor" />
    </svg>
  )
}

/** Trending up — RISING / positive */
export function TrendingUpIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

/** Trending down */
export function TrendingDownIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  )
}

/** Flame — HOT sectors */
export function FlameIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

/** Zap — streak indicator */
export function ZapIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

/** Star / Pin — watchlist */
export function BookmarkIcon({ size = 24, filled = false, ...p }: IconProps & { filled?: boolean }) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

/** Grid / Heatmap */
export function GridIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

/** Search / Screener */
export function SearchIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

/** Home / Dashboard */
export function HomeIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

/** Globe — international benchmark */
export function GlobeIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

/** Bar chart — S&P / data */
export function BarChartIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  )
}

/** Nasdaq — tech line */
export function LineChartIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

/** Factory / Dow / Industrials */
export function BuildingIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
    </svg>
  )
}

/** Award / Scorecard */
export function AwardIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

/** X close */
export function CloseIcon({ size = 24, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/** Arrow up rank */
export function ArrowUpIcon({ size = 16, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
  )
}

/** Arrow down rank */
export function ArrowDownIcon({ size = 16, ...p }: IconProps) {
  const s = { ...base(size, p), stroke: p.stroke ?? 'currentColor' }
  return (
    <svg {...s}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
  )
}
