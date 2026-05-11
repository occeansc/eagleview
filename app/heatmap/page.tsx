import { createSupabaseClient } from '@/lib/supabase'
import HeatmapClient from './HeatmapClient'
import type { Sector, Benchmark } from '@/lib/types'

export const revalidate = 1800

export default async function HeatmapPage() {
  const supabase = createSupabaseClient()
  const [{ data: sectors }, { data: benchmarks }] = await Promise.all([
    supabase.from('sectors').select('*'),
    supabase.from('benchmarks').select('*'),
  ])

  return (
    <main className="min-h-screen">
      <HeatmapClient
        sectors={(sectors ?? []) as Sector[]}
        benchmarks={(benchmarks ?? []) as Benchmark[]}
      />
    </main>
  )
}
