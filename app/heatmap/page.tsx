import type { Metadata } from 'next'
import { createSupabaseClient } from '@/lib/supabase'
import HeatmapClient from './HeatmapClient'
import type { Sector, Benchmark } from '@/lib/types'

export const metadata: Metadata = { title: 'Heatmap' }
export const revalidate = 900

export default async function HeatmapPage() {
  const supabase = createSupabaseClient()
  const [{ data: sectors }, { data: benchmarks }] = await Promise.all([
    supabase.from('sectors').select('*'),
    supabase.from('benchmarks').select('*'),
  ])
  return (
    <main className="min-h-dvh">
      <HeatmapClient
        sectors={(sectors ?? []) as Sector[]}
        benchmarks={(benchmarks ?? []) as Benchmark[]}
      />
    </main>
  )
}
