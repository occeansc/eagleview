import { createSupabaseClient } from '@/lib/supabase'
import SectorGrid from '@/components/SectorGrid'
import type { Sector, Benchmark, SectorSnapshot } from '@/lib/types'

export const revalidate = 300 // 5 min — keep post-sync prices fresh without hammering Supabase

async function getData() {
  const supabase = createSupabaseClient()
  const [sectorsRes, benchmarksRes, snapshotsRes] = await Promise.all([
    supabase.from('sectors').select('*'),
    supabase.from('benchmarks').select('*'),
    supabase
      .from('sector_snapshots')
      .select('sector_id, ytd_pct, synced_at')
      .order('synced_at', { ascending: true })
      .limit(1000),
  ])
  return {
    sectors:    (sectorsRes.data    ?? []) as Sector[],
    benchmarks: (benchmarksRes.data ?? []) as Benchmark[],
    snapshots:  (snapshotsRes.data  ?? []) as SectorSnapshot[],
  }
}

export default async function Page() {
  const { sectors, benchmarks, snapshots } = await getData()

  const snapshotMap: Record<number, SectorSnapshot[]> = {}
  for (const s of snapshots) {
    if (!snapshotMap[s.sector_id]) snapshotMap[s.sector_id] = []
    snapshotMap[s.sector_id].push(s)
  }

  return (
    <main className="min-h-dvh">
      <SectorGrid
        sectors={sectors}
        benchmarks={benchmarks}
        snapshots={snapshotMap}
      />
    </main>
  )
}
