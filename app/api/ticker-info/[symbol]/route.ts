import { NextRequest, NextResponse } from 'next/server'

export interface TickerInfo {
  description: string | null
  industry:    string | null
  employees:   number | null
  country:     string | null
  website:     string | null
}

const warm = new Map<string, { payload: TickerInfo; at: number }>()
const WARM_TTL = 4 * 60 * 60 * 1000

const COMPANY_SIGNALS = [
  'company','corporation','incorporated','founded','headquartered',
  'subsidiary','publicly traded','nasdaq','nyse','stock exchange',
  'revenue','employees','chief executive','manufacturer','provider',
  'developer','supplier','semiconductor','pharmaceutical','biotechnology',
  'software','technology','financial','aerospace','energy','healthcare',
]

function isCompanyArticle(text: string): boolean {
  const lower = text.toLowerCase()
  return COMPANY_SIGNALS.some(kw => lower.includes(kw))
}

function trimToTwoSentences(text: string): string {
  return (text.match(/[^.!?]+[.!?]+\s*/g) ?? []).slice(0, 2).join('').trim()
}

async function fetchYahoo(symbol: string, companyName: string): Promise<Partial<TickerInfo> | null> {
  for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
    try {
      const res = await fetch(
        `https://${host}/v10/finance/quoteSummary/${symbol}?modules=assetProfile`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Eagleview/1.0)', 'Accept': 'application/json' },
          next: { revalidate: 86400 },
        },
      )
      if (!res.ok) continue
      const json    = await res.json().catch(() => null)
      const result  = json?.quoteSummary?.result?.[0]
      const profile = result?.assetProfile
      if (!profile?.longBusinessSummary) continue

      // Validate: Yahoo sometimes returns data for wrong ticker.
      // Cross-check that the returned company name is plausible.
      const returnedSymbol = json?.quoteSummary?.result?.[0]?.symbol ?? ''
      if (returnedSymbol && returnedSymbol !== symbol) continue

      const desc = trimToTwoSentences(profile.longBusinessSummary)
      // Further validate: description should mention company-like signals
      if (!isCompanyArticle(desc)) continue

      return {
        description: desc,
        industry:    profile.industry          ?? null,
        employees:   profile.fullTimeEmployees ?? null,
        country:     profile.country           ?? null,
        website:     profile.website           ?? null,
      }
    } catch { continue }
  }
  return null
}

async function fetchWikipediaByTitle(title: string): Promise<{ extract: string; description?: string } | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { next: { revalidate: 604800 } },
    )
    if (!res.ok) return null
    const json = await res.json()
    if (json.type === 'disambiguation' || !json.extract) return null
    return { extract: json.extract, description: json.description }
  } catch { return null }
}

async function fetchWikipedia(companyName: string): Promise<string | null> {
  // Try candidates from most specific to least specific.
  // Keep legal suffixes — they are the disambiguation key.
  // "Alphabet Inc." → correct; "Alphabet" → writing system.
  const bare = companyName
    .replace(/,?\s+(Inc\.?|Corp\.?|Ltd\.?|LLC|PLC|Holdings?)\.?\s*$/i, '')
    .trim()

  const candidates = [
    companyName,                  // "AXT Inc" — try as-is first
    bare + ' (company)',          // "AXT (company)" — Wikipedia disambiguation suffix
    companyName + ' (company)',   // "AXT Inc (company)"
    bare,                         // "AXT" — last resort bare name
  ].filter((v, i, arr) => arr.indexOf(v) === i) // deduplicate

  for (const candidate of candidates) {
    const result = await fetchWikipediaByTitle(candidate)
    if (!result) continue

    // Quality gate: must read as a company/business article
    const fullText = result.extract + ' ' + (result.description ?? '')
    if (!isCompanyArticle(fullText)) continue

    return trimToTwoSentences(result.extract)
  }
  return null
}

export async function GET(req: NextRequest, { params }: { params: { symbol: string } }) {
  const symbol      = params.symbol.toUpperCase()
  const companyName = new URL(req.url).searchParams.get('company') ?? symbol

  const cached = warm.get(symbol)
  if (cached && Date.now() - cached.at < WARM_TTL) {
    return NextResponse.json(cached.payload, { headers: { 'X-Cache': 'HIT' } })
  }

  const yahoo = await fetchYahoo(symbol, companyName)
  const desc  = yahoo?.description
    ?? (companyName !== symbol ? await fetchWikipedia(companyName) : null)

  const payload: TickerInfo = {
    description: desc,
    industry:    yahoo?.industry  ?? null,
    employees:   yahoo?.employees ?? null,
    country:     yahoo?.country   ?? null,
    website:     yahoo?.website   ?? null,
  }

  warm.set(symbol, { payload, at: Date.now() })
  return NextResponse.json(payload, { headers: { 'X-Cache': 'MISS' } })
}
