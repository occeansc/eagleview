import { NextRequest, NextResponse } from 'next/server'

export interface TickerInfo {
  description: string | null
  industry:    string | null
  employees:   number | null
  country:     string | null
  website:     string | null
  source:      'yahoo' | 'wikipedia' | null
}

// Warm-instance cache — avoids redundant fetches within the same server process
const warm = new Map<string, { payload: TickerInfo; at: number }>()
const WARM_TTL = 4 * 60 * 60 * 1000 // 4 hours

function trimToTwoSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) ?? []
  return sentences.slice(0, 2).join('').trim()
}

/* ── Source 1: Yahoo Finance ──────────────────────────────── */
async function fetchYahoo(symbol: string): Promise<Partial<TickerInfo> | null> {
  try {
    // Try query2 first (less frequently blocked), then query1
    for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
      const res = await fetch(
        `https://${host}/v10/finance/quoteSummary/${symbol}?modules=assetProfile`,
        {
          headers: {
            'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept':          'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          next: { revalidate: 86400 }, // Next.js cache: 24h
        },
      )
      if (!res.ok) continue
      const json    = await res.json().catch(() => null)
      const profile = json?.quoteSummary?.result?.[0]?.assetProfile
      if (!profile?.longBusinessSummary) continue

      return {
        description: trimToTwoSentences(profile.longBusinessSummary),
        industry:    profile.industry    ?? null,
        employees:   profile.fullTimeEmployees ?? null,
        country:     profile.country    ?? null,
        website:     profile.website    ?? null,
        source:      'yahoo',
      }
    }
  } catch { /* fall through */ }
  return null
}

/* ── Source 2: Wikipedia (reliable fallback for all public companies) ── */
async function fetchWikipedia(companyName: string): Promise<Partial<TickerInfo> | null> {
  // Strip common legal suffixes for a cleaner Wikipedia lookup
  const clean = companyName
    .replace(/,?\s+(Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|LLC|PLC|Group|Holdings?|Technologies?|Systems?|Semiconductor)\.?\s*$/i, '')
    .trim()

  try {
    const encoded = encodeURIComponent(clean)
    const res     = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { next: { revalidate: 604800 } }, // 7-day cache — descriptions rarely change
    )
    if (!res.ok) return null
    const json = await res.json()
    // Skip disambiguation pages
    if (json.type === 'disambiguation' || !json.extract) return null
    return {
      description: trimToTwoSentences(json.extract),
      source:      'wikipedia',
    }
  } catch { return null }
}

/* ── Route handler ──────────────────────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: { symbol: string } },
) {
  const url         = new URL(_req.url)
  const symbol      = params.symbol.toUpperCase()
  const companyName = url.searchParams.get('company') ?? symbol

  // Warm cache check
  const cached = warm.get(symbol)
  if (cached && Date.now() - cached.at < WARM_TTL) {
    return NextResponse.json(cached.payload, { headers: { 'X-Cache': 'HIT' } })
  }

  // Try Yahoo Finance first; fall back to Wikipedia
  const yahoo = await fetchYahoo(symbol)
  const wiki  = (!yahoo?.description && companyName !== symbol)
    ? await fetchWikipedia(companyName)
    : null

  const payload: TickerInfo = {
    description: yahoo?.description ?? wiki?.description ?? null,
    industry:    yahoo?.industry    ?? null,
    employees:   yahoo?.employees   ?? null,
    country:     yahoo?.country     ?? null,
    website:     yahoo?.website     ?? null,
    source:      yahoo?.source ?? wiki?.source ?? null,
  }

  warm.set(symbol, { payload, at: Date.now() })
  return NextResponse.json(payload, { headers: { 'X-Cache': 'MISS' } })
}
