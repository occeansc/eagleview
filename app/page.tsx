import { createSupabaseClient } from '@/lib/supabase'
import SectorGrid from '@/components/SectorGrid'
import type { Sector, Benchmark } from '@/lib/types'

export const revalidate = 1800

async function getSectors(): Promise<Sector[]> {
  try {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase.from('sectors').select('*')
    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('getSectors failed:', err)
    return []
  }
}

async function getBenchmarks(): Promise<Benchmark[]> {
  try {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase.from('benchmarks').select('*')
    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('getBenchmarks failed:', err)
    return []
  }
}

export default async function Page() {
  const [sectors, benchmarks] = await Promise.all([getSectors(), getBenchmarks()])

  return (
    <main className="min-h-screen">
      <SectorGrid sectors={sectors} benchmarks={benchmarks} />
    </main>
  )
}
