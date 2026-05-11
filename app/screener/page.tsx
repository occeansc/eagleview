import { createSupabaseClient } from '@/lib/supabase'
import ScreenerClient from './ScreenerClient'
import type { SectorHolding, Sector } from '@/lib/types'

export const revalidate = 1800

export default async function ScreenerPage() {
  const supabase = createSupabaseClient()
  const [holdingsRes, sectorsRes] = await Promise.all([
    supabase.from('sector_holdings').select('*, sectors(name)'),
    supabase.from('sectors').select('id, name'),
  ])
  return (
    <main className="min-h-screen">
      <ScreenerClient
        holdings={(holdingsRes.data ?? []) as (SectorHolding & { sectors: { name: string } })[]}
        sectors={(sectorsRes.data ?? []) as Pick<Sector, 'id' | 'name'>[]}
      />
    </main>
  )
}
