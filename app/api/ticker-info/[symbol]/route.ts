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

// Keywords that indicate a Wikipedia article is about a company
const COMPANY_SIGNALS = [
  'company','corporation','incorporated','founded','headquartered',
  'subsidiary','publicly traded','nasdaq','nyse','stock exchange',
  'revenue','employees','ceo','chief executive','products','services',
  'manufacturer','provider','developer','supplier',
]

function isCompanyArticle(extract: string): boolean {
  const lower = extract.toLowerCase()
  return COMPANY_SIGNALS.some(kw => lower.includes(kw))
}

function trimToTwoSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) ?? []
  return sentences.slice(0, 2).join('').trim()
}

async function fetchYahoo(symbol: string): Promise<Partial<TickerInfo> | null> {
  for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
    try {
      const res = await fetch(
        `https://${host}/v10/finance/quoteSummary/${symbol}?modules=assetProfile`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
          next: { revalidate: 86400 },
        },
      )
      if (!res.ok) continue
      const json    = await res.json().catch(() => null)
      const profile = json?.quoteSummary?.result?.[0]?.assetProfile
      if (!profile?.longBusinessSummary) continue
      return {
        description: trimToTwoSentences(profile.longBusinessSummary),
        industry:    profile.industry         ?? null,
        employees:   profile.fullTimeEmployees ?? null,
        country:     profile.country          ?? null,
        website:     profile.website          ?? null,
      }
    } catch { continue }
  }
  return null
}

async function fetchWikipediaByTitle(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { next: { revalidate: 604800 } },
    )
    if (!res.ok) return null
    const json = await res.json()
    if (json.type === 'disambiguation' || !json.extract) return null
    if (!isCompanyArticle(json.extract)) return null
    return trimToTwoSentences(json.extract)
  } catch { return null }
}

async function fetchWikipedia(companyName: string): Promise<string | null> {
  // Strategy: try increasingly specific queries until one returns a company article.
  // Do NOT strip legal suffixes — they are the key disambiguation signal.
  // "Alphabet Inc." → correct; "Alphabet" → finds the alphabet writing system.
  const candidates = [
    companyName,                                    // e.g. "AXT Inc"
    companyName.replace(/\.$/, ''),                 // remove trailing period
    companyName + ' (company)',                     // Wikipedia disambiguation suffix
  ]
  // Also try without trailing "Inc"/"Corp" but with "(company)" appended
  const bare = companyName
    .replace(/,?\s+(Inc\.?|Corp\.?|Ltd\.?|LLC|PLC|Holdings?)\.?\s*$/i, '')
    .trim()
  if (bare !== companyName) candidates.push(bare + ' (company)')

  for (const candidate of candidates) {
    const result = await fetchWikipediaByTitle(candidate)
    if (result) return result
  }
  return null
}

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } },
) {
  const symbol      = params.symbol.toUpperCase()
  const companyName = new URL(req.url).searchParams.get('company') ?? symbol

  const cached = warm.get(symbol)
  if (cached && Date.now() - cached.at < WARM_TTL) {
    return NextResponse.json(cached.payload, { headers: { 'X-Cache': 'HIT' } })
  }

  const yahoo = await fetchYahoo(symbol)
  const desc  = yahoo?.description
    ?? (companyName !== symbol ? await fetchWikipedia(companyName) : null)

  const payload: TickerInfo = {
    description: desc,
    industry:    yahoo?.industry   ?? null,
    employees:   yahoo?.employees  ?? null,
    country:     yahoo?.country    ?? null,
    website:     yahoo?.website    ?? null,
  }

  warm.set(symbol, { payload, at: Date.now() })
  return NextResponse.json(payload, { headers: { 'X-Cache': 'MISS' } })
}
