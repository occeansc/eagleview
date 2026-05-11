'use client'

import { SectorSnapshot } from '@/lib/types'

interface Props {
  snapshots: SectorSnapshot[]
  positive: boolean
  width?: number
  height?: number
}

export default function Sparkline({ snapshots, positive, width = 80, height = 24 }: Props) {
  const points = snapshots
    .filter(s => s.ytd_pct !== null)
    .map(s => s.ytd_pct as number)

  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1

  const xs = points.map((_, i) => (i / (points.length - 1)) * width)
  const ys = points.map(v => height - ((v - min) / range) * height)

  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')

  const color = positive ? '#10b981' : '#f43f5e'

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="spark-line"
      />
      {/* Last point dot */}
      <circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r="2"
        fill={color}
      />
    </svg>
  )
}
