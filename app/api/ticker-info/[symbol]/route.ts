import { NextRequest, NextResponse } from 'next/server'

// Layer 1 (server): warm-instance Map — avoids redundant Yahoo calls
// within the same server process lifetime. In serverless this is per-instance,
// but Next.js fetch cache (Layer 2) handles cross-instance deduplication.
const warm = new Map<string, { payload: TickerInfo; at: number }>()
const WARM_TTL = 4 * 60 * 60 * 1000 // 4h per instance

export interface TickerInfo {
  description: string | null
  industry:    string | null
  employees:   number | null
  country:     string | null
  website:     string | null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { symbol: string } },
) {
  const symbol = params.symbol.toUpperCase()

  // Warm cache hit
  const cached = warm.get(symbol)
  if (cached && Date.now() - cached.at < WARM_TTL) {
    return NextResponse.json(cached.payload, {
      headers: { 'X-Cache': 'HIT' },
    })
  }

  try {
    // Layer 2: Next.js fetch cache revalidates every 24h across all requests
    // — Yahoo Finance is only hit once per ticker per day regardless of users.
    const res  = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=assetProfile`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Eagleview/1.0)' },
        next: { revalidate: 86400 },
      },
    )

    const json    = await res.json()
    const profile = json?.quoteSummary?.result?.[0]?.assetProfile ?? null

    if (!profile) {
      const empty: TickerInfo = { description: null, industry: null, employees: null, country: null, website: null }
      return NextResponse.json(empty)
    }

    // Trim to first 2 clean sentences — Yahoo descriptions are often 500+ words
    const raw      = (profile.longBusinessSummary ?? '') as string
    const sentences = raw.match(/[^.!?]+[.!?]+\s*/g) ?? []
    const summary  = sentences.slice(0, 2).join('').trim() || null

    const payload: TickerInfo = {
      description: summary,
      industry:    profile.industry    ?? null,
      employees:   profile.fullTimeEmployees ?? null,
      country:     profile.country    ?? null,
      website:     profile.website    ?? null,
    }

    warm.set(symbol, { payload, at: Date.now() })
    return NextResponse.json(payload, { headers: { 'X-Cache': 'MISS' } })
  } catch {
    const fallback: TickerInfo = { description: null, industry: null, employees: null, country: null, website: null }
    return NextResponse.json(fallback)
  }
}
