'use client'

import { SectorSnapshot } from '@/lib/types'

interface Props {
  snapshots: SectorSnapshot[]
  positive:  boolean
  width?:    number
  height?:   number
}

export default function Sparkline({ snapshots, positive, width = 80, height = 26 }: Props) {
  const points = snapshots
    .filter(s => s.ytd_pct !== null)
    .map(s => s.ytd_pct as number)

  if (points.length < 2) return null

  const min   = Math.min(...points)
  const max   = Math.max(...points)
  const range = max - min || 1
  const pad   = 2

  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (width - pad * 2))
  const ys = points.map(v => pad + height - pad * 2 - ((v - min) / range) * (height - pad * 2))

  // Line path
  const linePath = xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${ys[i].toFixed(2)}`)
    .join(' ')

  // Area path — close down to bottom
  const areaPath =
    linePath +
    ` L${xs[xs.length - 1].toFixed(2)},${height - pad}` +
    ` L${xs[0].toFixed(2)},${height - pad} Z`

  const color     = positive ? '#10b981' : '#f43f5e'
  const gradId    = `sg-${positive ? 'p' : 'n'}-${width}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="75%"  stopColor={color} stopOpacity="0.06" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradId})`}
        className="spark-area"
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="spark-line"
      />

      {/* Terminal dot */}
      <circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r="2.2"
        fill={color}
        className="spark-area"
      />
    </svg>
  )
}
