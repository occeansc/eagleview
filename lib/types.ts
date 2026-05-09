export interface Sector {
  id: number
  name: string
  week_pct: number | null
  month_pct: number | null
  quarter_pct: number | null
  ytd_pct: number | null
  stock_count: number | null
  updated_at: string
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

export function getPeriodValue(s: Sector | SectorHolding | Benchmark, period: Period): number | null {
  switch (period) {
    case '1W':  return s.week_pct
    case '1M':  return s.month_pct
    case '3M':  return s.quarter_pct
    case 'YTD': return s.ytd_pct
  }
}
