export interface Sector {
  id: number
  name: string
  week_pct: number | null
  month_pct: number | null
  quarter_pct: number | null
  ytd_pct: number | null
  stock_count: number | null
  updated_at: string
  // v3.0 — ranks
  ytd_rank: number | null
  week_rank: number | null
  month_rank: number | null
  quarter_rank: number | null
  // v3.0 — rank deltas (positive = moved up)
  ytd_rank_change: number | null
  week_rank_change: number | null
  month_rank_change: number | null
  quarter_rank_change: number | null
  // v3.0 — streak (consecutive syncs YTD-positive)
  streak: number | null
  // v3.0 — breadth (% of stocks positive)
  breadth_1w: number | null
  breadth_1m: number | null
  breadth_3m: number | null
  breadth_ytd: number | null
  // v3.0 — previous values for momentum delta
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

export type Period = '1W' | '1M' | '3M' | 'YTD'

export const PERIOD_LABELS: Record<Period, string> = {
  '1W':  '1 Week',
  '1M':  '1 Month',
  '3M':  '3 Months',
  'YTD': 'Year to Date',
}

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
