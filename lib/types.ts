export interface Sector {
  id: number
  name: string
  etf_ticker: string
  week_pct: number | null
  month_pct: number | null
  quarter_pct: number | null
  ytd_pct: number | null
  stock_count: number | null
  updated_at: string
}

export interface Holding {
  id: number
  sector_id: number
  holding_rank: number
  holding_name: string
  holding_ticker: string | null
  weight_pct: number | null
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

export function getPeriodValue(sector: Sector, period: Period): number | null {
  switch (period) {
    case '1W':  return sector.week_pct
    case '1M':  return sector.month_pct
    case '3M':  return sector.quarter_pct
    case 'YTD': return sector.ytd_pct
  }
}

export function getBenchmarkValue(b: Benchmark, period: Period): number | null {
  switch (period) {
    case '1W':  return b.week_pct
    case '1M':  return b.month_pct
    case '3M':  return b.quarter_pct
    case 'YTD': return b.ytd_pct
  }
}
