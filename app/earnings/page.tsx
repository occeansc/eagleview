import type { Metadata } from 'next'
import { createSupabaseClient } from '@/lib/supabase'
import EarningsClient from './EarningsClient'
import type { TickerEarnings } from '@/lib/types'

export const metadata: Metadata = { title: 'Earnings' }
export const revalidate = 900

export default async function EarningsPage() {
  const supabase = createSupabaseClient()
  const { data } = await supabase
    .from('ticker_earnings')
    .select('*')
    .not('earnings_date', 'is', null)
    .order('earnings_date', { ascending: true })

  return (
    <main className="min-h-dvh">
      <EarningsClient earnings={(data ?? []) as TickerEarnings[]} />
    </main>
  )
}
