import type { Metadata } from 'next'
import { createSupabaseClient } from '@/lib/supabase'
import ScreenerClient from './ScreenerClient'
import type { SectorHolding, Sector } from '@/lib/types'

export const metadata: Metadata = { title: 'Screener' }
export const revalidate = 900

export default async function ScreenerPage() {
  const supabase = createSupabaseClient()
  const [holdingsRes, sectorsRes] = await Promise.all([
    supabase.from('sector_holdings').select('*, sectors(name)'),
    supabase.from('sectors').select('id, name').order('name'),
  ])
  return (
    <main className="min-h-dvh">
      <ScreenerClient
        holdings={(holdingsRes.data ?? []) as (SectorHolding & { sectors: { name: string } })[]}
        sectors={(sectorsRes.data ?? []) as Pick<Sector, 'id' | 'name'>[]}
      />
    </main>
  )
}
