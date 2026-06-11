'use client'

import { SectorSnapshot } from '@/lib/types'
import { useId } from 'react'

interface Props {
  snapshots: SectorSnapshot[]
  positive: boolean
  width?: number
  height?: number
}

export default function Sparkline({ snapshots, positive, width = 80, height = 24 }: Props) {
  const gradId = useId()

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
  const dArea = `${d} L${width},${height} L0,${height} Z`

  // Subtle beautiful aesthetic color grades overriding solid standard
  const colorCode = positive ? '#10B981' : '#F43F5E'

  return (
    <svg width={width} height={height} className="overflow-visible z-0 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
      <defs>
        <linearGradient id={`spark-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorCode} stopOpacity="0.25" />
          <stop offset="60%" stopColor={colorCode} stopOpacity="0.05" />
          <stop offset="100%" stopColor={colorCode} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Path Under-Fill (Smooth Glow) */}
      <path
        d={dArea}
        fill={`url(#spark-${gradId})`}
        className="spark-area"
      />
      {/* Strict path line */}
      <path
        d={d}
        fill="none"
        stroke={colorCode}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="spark-line z-10"
      />
      
      {/* Latest blip ping ring + solid cap styling element */}
      <circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r="3"
        fill={colorCode}
        opacity="0.3"
        className="pulse-blip"
      />
      <circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r="1.5"
        fill="white"
        stroke={colorCode}
        strokeWidth="1"
      />
    </svg>
  )
}