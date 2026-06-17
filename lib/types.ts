// ─────────────────────────────────────────────────────────────────────────────
//  Eagleview v4.0 — Type System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Any object that carries period return values.
 * Used by getPeriodValue() — accepts Sector, SectorHolding, or Benchmark
 * without requiring dirty casts.
 */
export interface HasPeriodValues {
  day_pct:     number | null
  week_pct:    number | null
  month_pct:   number | null
  quarter_pct: number | null
  ytd_pct:     number | null
}

export interface Sector extends HasPeriodValues {
  id:           number
  name:         string
  stock_count:  number | null
  updated_at:   string
  // v3.0 ranks
  day_rank:         number | null
  ytd_rank:         number | null
  week_rank:        number | null
  month_rank:       number | null
  quarter_rank:     number | null
  day_rank_change:     number | null
  ytd_rank_change:     number | null
  week_rank_change:    number | null
  month_rank_change:   number | null
  quarter_rank_change: number | null
  // v3.0 streak + breadth
  streak:       number | null
  breadth_1d:   number | null
  breadth_1w:   number | null
  breadth_1m:   number | null
  breadth_3m:   number | null
  breadth_ytd:  number | null
  // v3.0 previous values for momentum delta
  prev_day_pct:     number | null
  prev_week_pct:    number | null
  prev_month_pct:   number | null
  prev_quarter_pct: number | null
  prev_ytd_pct:     number | null
}

export interface SectorHolding extends HasPeriodValues {
  id:           number
  sector_id:    number
  ticker:       string
  company_name: string
  price:        number | null
  // joined (available in screener)
  sectors?: { name: string }
}

export interface Benchmark extends HasPeriodValues {
  id:         number
  name:       string
  ticker:     string
  updated_at: string
}

export interface SectorSnapshot {
  sector_id: number
  ytd_pct:   number | null
  week_pct:  number | null
  synced_at: string
}

export type Period         = '1D' | '1W' | '1M' | '3M' | 'YTD'
export type ScorecardLevel = 'gold' | 'silver' | 'bronze' | null
export type RegimeType     = 'risk-on' | 'risk-off' | 'mixed' | 'loading'

export const PERIODS: Period[] = ['1W', '1M', '3M', 'YTD']

export const PERIOD_LABELS: Record<Period, string> = {
  '1D':  '1 Day',
  '1W':  '1 Week',
  '1M':  '1 Month',
  '3M':  '3 Months',
  'YTD': 'Year to Date',
}

// ─── Period helpers ───────────────────────────────────────────────────────────

export function getPeriodValue(s: HasPeriodValues, period: Period): number | null {
  switch (period) {
    case '1D':  return s.day_pct
    case '1W':  return s.week_pct
    case '1M':  return s.month_pct
    case '3M':  return s.quarter_pct
    case 'YTD': return s.ytd_pct
  }
}

export function getRankChange(s: Sector, period: Period): number | null {
  switch (period) {
    case '1D':  return s.day_rank_change
    case '1W':  return s.week_rank_change
    case '1M':  return s.month_rank_change
    case '3M':  return s.quarter_rank_change
    case 'YTD': return s.ytd_rank_change
  }
}

export function getBreadth(s: Sector, period: Period): number | null {
  switch (period) {
    case '1D':  return s.breadth_1d
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
    case '1D':  curr = s.day_pct;     prev = s.prev_day_pct;     break
    case '1W':  curr = s.week_pct;    prev = s.prev_week_pct;    break
    case '1M':  curr = s.month_pct;   prev = s.prev_month_pct;   break
    case '3M':  curr = s.quarter_pct; prev = s.prev_quarter_pct; break
    case 'YTD': curr = s.ytd_pct;     prev = s.prev_ytd_pct;     break
  }
  if (curr === null || prev === null) return null
  return Math.round((curr - prev) * 10) / 10
}

/** Scorecard: periods where sector beats S&P 500 */
export function computeScorecard(sector: Sector, spx: Benchmark | undefined): ScorecardLevel {
  if (!spx) return null
  const beats = PERIODS.filter(p => {
    const sv = getPeriodValue(sector, p)
    const bv = getPeriodValue(spx, p)
    return sv !== null && bv !== null && sv > bv
  }).length
  if (beats === 4) return 'gold'
  if (beats === 3) return 'silver'
  if (beats === 2) return 'bronze'
  return null
}

// ─── Market Regime ────────────────────────────────────────────────────────────

const GROWTH_SECTORS = new Set([
  'Semiconductors', 'Software & Cloud', 'AI & Machine Learning',
  'Digital Assets & Crypto', 'Space & Satellites', 'Photonics & Optical',
  'Quantum Computing', 'Power & Data Centers', 'Robotics & Automation',
])

const DEFENSIVE_SECTORS = new Set([
  'Real Estate & REITs', 'Traditional Finance', 'Nuclear & Uranium',
  'Pharma & MedTech', 'Defense & Aerospace', 'Travel & Hospitality',
  'Consumer & E-commerce', 'Industrials & Materials',
])

export function computeRegime(sectors: Sector[]): RegimeType {
  if (!sectors.length) return 'loading'
  const top7 = [...sectors]
    .filter(s => s.ytd_pct !== null)
    .sort((a, b) => (b.ytd_pct ?? 0) - (a.ytd_pct ?? 0))
    .slice(0, 7)
  const growthCount    = top7.filter(s => GROWTH_SECTORS.has(s.name)).length
  const defensiveCount = top7.filter(s => DEFENSIVE_SECTORS.has(s.name)).length
  if (growthCount >= 4)    return 'risk-on'
  if (defensiveCount >= 4) return 'risk-off'
  return 'mixed'
}

// ─── Price formatting ─────────────────────────────────────────────────────────

export function formatPrice(price: number | null): string {
  if (price === null) return '—'
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (price >= 10)   return `$${price.toFixed(2)}`
  if (price >= 1)    return `$${price.toFixed(3)}`
  return `$${price.toFixed(4)}`
}
