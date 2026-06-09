export interface Sector {
  id: number
  name: string
  week_pct: number | null
  month_pct: number | null
  quarter_pct: number | null
  ytd_pct: number | null
  stock_count: number | null
  updated_at: string
  ytd_rank: number | null
  week_rank: number | null
  month_rank: number | null
  quarter_rank: number | null
  ytd_rank_change: number | null
  week_rank_change: number | null
  month_rank_change: number | null
  quarter_rank_change: number | null
  streak: number | null
  breadth_1w: number | null
  breadth_1m: number | null
  breadth_3m: number | null
  breadth_ytd: number | null
  prev_week_pct: number | null
  prev_month_pct: number | null
  prev_quarter_pct: number | null
  prev_ytd_pct: number | null
}

export interface SectorHolding {
  id: number
  sector_id: number
  ticker: string
  company_name: string
  week_pct: number | null
  month_pct: number | null
  quarter_pct: number | null
  ytd_pct: number | null
  price: number | null
  // joined field (optional, available in screener)
  sectors?: { name: string }
}

/** Format a price value with appropriate decimals and $ sign */
export function formatPrice(price: number | null): string {
  if (price === null) return '—'
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (price >= 10)   return `$${price.toFixed(2)}`
  if (price >= 1)    return `$${price.toFixed(3)}`
  return `$${price.toFixed(4)}`  // sub-$1 stocks (penny stocks)
}

export interface Benchmark {
  id: number
  name: string
  ticker: string
  week_pct: number | null
  month_pct: number | null
  quarter_pct: number | null
  ytd_pct: number | null
  updated_at: string
}

export interface SectorSnapshot {
  sector_id: number
  ytd_pct: number | null
  week_pct: number | null
  synced_at: string
}

export type Period = '1W' | '1M' | '3M' | 'YTD'
export type ScorecardLevel = 'gold' | 'silver' | 'bronze' | null

export const PERIOD_LABELS: Record<Period, string> = {
  '1W':  '1 Week',
  '1M':  '1 Month',
  '3M':  '3 Months',
  'YTD': 'Year to Date',
}

export const PERIODS: Period[] = ['1W', '1M', '3M', 'YTD']

export function getPeriodValue(
  s: Sector | SectorHolding | Benchmark,
  period: Period,
): number | null {
  switch (period) {
    case '1W':  return s.week_pct
    case '1M':  return s.month_pct
    case '3M':  return s.quarter_pct
    case 'YTD': return s.ytd_pct
  }
}

export function getRankChange(s: Sector, period: Period): number | null {
  switch (period) {
    case '1W':  return s.week_rank_change
    case '1M':  return s.month_rank_change
    case '3M':  return s.quarter_rank_change
    case 'YTD': return s.ytd_rank_change
  }
}

export function getBreadth(s: Sector, period: Period): number | null {
  switch (period) {
    case '1W':  return s.breadth_1w
    case '1M':  return s.breadth_1m
    case '3M':  return s.breadth_3m
    case 'YTD': return s.breadth_ytd
  }
}

export function getMomentumDelta(s: Sector, period: Period): number | null {
  let curr: number | null = null
  let prev: number | null = null
  switch (period) {
    case '1W':  curr = s.week_pct;    prev = s.prev_week_pct;    break
    case '1M':  curr = s.month_pct;   prev = s.prev_month_pct;   break
    case '3M':  curr = s.quarter_pct; prev = s.prev_quarter_pct; break
    case 'YTD': curr = s.ytd_pct;     prev = s.prev_ytd_pct;     break
  }
  return curr !== null && prev !== null ? Math.round((curr - prev) * 10) / 10 : null
}

/** Scorecard: how many periods does this sector beat the S&P 500? */
export function computeScorecard(sector: Sector, spx: Benchmark | undefined): ScorecardLevel {
  if (!spx) return null
  const periods: Period[] = ['1W', '1M', '3M', 'YTD']
  const beats = periods.filter(p => {
    const sv = getPeriodValue(sector, p)
    const bv = getPeriodValue(spx, p)
    return sv !== null && bv !== null && sv > bv
  }).length
  if (beats === 4) return 'gold'
  if (beats === 3) return 'silver'
  if (beats === 2) return 'bronze'
  return null
}
