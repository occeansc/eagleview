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

/* ── Layer 1: Yahoo Finance quoteSummary — assetProfile + summaryProfile ──
   Combined into one request per host. assetProfile is the primary source
   (equities); summaryProfile is often populated when assetProfile is empty
   (common for ETFs, trusts, and some foreign-domiciled ADRs). Trying both
   in a single call avoids a second round-trip.                            */
async function fetchYahooAPI(symbol: string): Promise<Partial<TickerInfo> | null> {
  for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
    try {
      const res = await fetch(
        `https://${host}/v10/finance/quoteSummary/${symbol}?modules=assetProfile,summaryProfile`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Eagleview/1.0)', 'Accept': 'application/json' },
          next: { revalidate: 86400 },
        },
      )
      if (!res.ok) continue
      const json = await res.json().catch(() => null)
      const result = json?.quoteSummary?.result?.[0]
      if (!result) continue

      const returnedSymbol = result?.symbol ?? ''
      if (returnedSymbol && returnedSymbol !== symbol) continue

      const asset   = result.assetProfile
      const summary = result.summaryProfile
      const rawDesc = asset?.longBusinessSummary ?? summary?.longBusinessSummary
      if (!rawDesc) continue

      const desc = trimToTwoSentences(rawDesc)
      if (!isCompanyArticle(desc)) continue

      return {
        description: desc,
        industry:    asset?.industry          ?? summary?.industry          ?? null,
        employees:   asset?.fullTimeEmployees  ?? summary?.fullTimeEmployees ?? null,
        country:     asset?.country            ?? summary?.country          ?? null,
        website:     asset?.website            ?? summary?.website          ?? null,
      }
    } catch { continue }
  }
  return null
}

/* ── Layer 2: Yahoo Finance webpage — og:description meta tag ──────────────
   Last-resort Yahoo attempt before Wikipedia. The quoteSummary structured
   API sometimes has nothing (newly-listed tickers, some ADRs) even though
   the profile page itself renders SEO meta tags server-side. Free, keyless,
   fails silently and falls through if Yahoo changes their markup.        */
async function fetchYahooPageMeta(symbol: string): Promise<string | null> {
  try {
    const res = await fetch(`https://finance.yahoo.com/quote/${symbol}/profile/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Eagleview/1.0)' },
      next: { revalidate: 604800 },
    })
    if (!res.ok) return null
    const html = await res.text()

    const ogMatch   = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
    const nameMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
    const raw = ogMatch?.[1] ?? nameMatch?.[1]
    if (!raw) return null

    const decoded = raw
      .replace(/&amp;/g, '&').replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

    if (!isCompanyArticle(decoded)) return null
    return trimToTwoSentences(decoded)
  } catch { return null }
}

/* ── Layer 3: Wikipedia — true last resort ──────────────────────────────── */
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
  const bare = companyName
    .replace(/,?\s+(Inc\.?|Corp\.?|Ltd\.?|LLC|PLC|Holdings?)\.?\s*$/i, '')
    .trim()

  const candidates = [
    companyName,
    bare + ' (company)',
    companyName + ' (company)',
    bare,
  ].filter((v, i, arr) => arr.indexOf(v) === i)

  for (const candidate of candidates) {
    const result = await fetchWikipediaByTitle(candidate)
    if (!result) continue
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

  // Waterfall: Yahoo structured API → Yahoo webpage meta → Wikipedia
  const apiResult = await fetchYahooAPI(symbol)
  let description = apiResult?.description ?? null

  if (!description) {
    description = await fetchYahooPageMeta(symbol)
  }
  if (!description && companyName !== symbol) {
    description = await fetchWikipedia(companyName)
  }

  const payload: TickerInfo = {
    description,
    industry:    apiResult?.industry  ?? null,
    employees:   apiResult?.employees ?? null,
    country:     apiResult?.country   ?? null,
    website:     apiResult?.website   ?? null,
  }

  warm.set(symbol, { payload, at: Date.now() })
  return NextResponse.json(payload, { headers: { 'X-Cache': 'MISS' } })
}
