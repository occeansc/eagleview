import type { Metadata } from 'next'
import { createSupabaseClient } from '@/lib/supabase'
import EarningsClient from './EarningsClient'
import type { TickerEarnings, SectorHolding } from '@/lib/types'

export const metadata: Metadata = { title: 'Earnings' }
export const revalidate = 900

export default async function EarningsPage() {
  const supabase = createSupabaseClient()
  const [earningsRes, holdingsRes] = await Promise.all([
    supabase
      .from('ticker_earnings')
      .select('*')
      .not('earnings_date', 'is', null)
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
