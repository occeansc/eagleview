import type { Metadata } from 'next'
import { createSupabaseClient } from '@/lib/supabase'
import EarningsClient from './EarningsClient'
import type { TickerEarnings, SectorHolding } from '@/lib/types'

export const metadata: Metadata = { title: 'Earnings' }
export const revalidate = 900

function getTodayInNewYorkIsoDate(): string {
  // Earnings dates are US-market calendar dates. Use New York time instead of
  // server UTC so a late-evening deploy/server render does not hide today's
  // AMC reports too early for EagleView users.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default async function EarningsPage() {
  const supabase = createSupabaseClient()
  const today = getTodayInNewYorkIsoDate()
  const [earningsRes, holdingsRes] = await Promise.all([
    supabase
      .from('ticker_earnings')
      .select('*')
      .not('earnings_date', 'is', null)
      .gte('earnings_date', today)
      .order('earnings_date', { ascending: true }),
    supabase.from('sector_holdings').select('*, sectors(name)'),
  ])

  return (
    <main className="min-h-dvh">
      <EarningsClient
        earnings={(earningsRes.data ?? []) as TickerEarnings[]}
        holdings={(holdingsRes.data ?? []) as (SectorHolding & { sectors: { name: string } })[]}
      />
    </main>
  )
}
