import { NextRequest, NextResponse } from 'next/server'

export interface TickerInfo {
  description:  string | null
  industry:     string | null
  employees:    number | null
  country:      string | null
  website:      string | null
  marketCap:    string | null           // Yahoo's own pre-formatted string, e.g. "3.45T"
  peRatio:      number | null           // trailing P/E, rounded to 1 decimal
  week52High:   number | null           // raw price
  nextEarnings: string | null           // ISO date, e.g. "2026-07-22"
  earningsTime: 'bmo' | 'amc' | 'unspecified' | null
}

const warm = new Map<string, { payload: TickerInfo; at: number }>()
const WARM_TTL = 4 * 60 * 60 * 1000
// Bump this whenever TickerInfo's shape changes — a stale cache entry from
// before a schema change would otherwise silently mask new fields for up
// to WARM_TTL, exactly what happened when marketCap/peRatio/week52High/
// nextEarnings/earningsTime were added but existing cached entries (keyed
// only by symbol) kept being served without them.
const SCHEMA_VERSION = 'v3'

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


const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
const YAHOO_SESSION_TTL = 55 * 60 * 1000
let yahooSession: { crumb: string; cookie: string; at: number } | null = null

function cookieHeaderFromSetCookie(headers: Headers): string {
  // Node/undici exposes comma-joined Set-Cookie through get('set-cookie') in
  // this runtime. We only need the first name=value pair from each cookie.
  const raw = headers.get('set-cookie') ?? ''
  return raw
    .split(/,(?=\s*[^;,=]+=[^;,]+)/g)
    .map(part => part.trim().split(';')[0])
    .filter(Boolean)
    .join('; ')
}

async function getYahooSession(forceRefresh = false): Promise<{ crumb: string; cookie: string } | null> {
  if (!forceRefresh && yahooSession && Date.now() - yahooSession.at < YAHOO_SESSION_TTL) {
    return yahooSession
  }

  try {
    // fc.yahoo.com intentionally returns 404, but it reliably sets Yahoo's A3
    // cookie with small headers. finance.yahoo.com pages can trigger undici
    // header-overflow errors because Yahoo sends very large response headers.
    const landing = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': YAHOO_UA, 'Accept': '*/*' },
      cache: 'no-store',
    })
    const cookie = cookieHeaderFromSetCookie(landing.headers)
    if (!cookie) {
      console.warn('[ticker-info] Yahoo session bootstrap returned no cookies')
      return null
    }

    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': YAHOO_UA, 'Accept': '*/*', 'Cookie': cookie },
      cache: 'no-store',
    })
    if (!crumbRes.ok) {
      console.warn(`[ticker-info] Yahoo crumb fetch not OK — status ${crumbRes.status}`)
      return null
    }

    const crumb = (await crumbRes.text()).trim()
    if (!crumb || crumb.includes('<')) {
      console.warn('[ticker-info] Yahoo crumb fetch returned invalid crumb')
      return null
    }

    yahooSession = { crumb, cookie, at: Date.now() }
    return yahooSession
  } catch (e) {
    console.warn(`[ticker-info] Yahoo session bootstrap exception — ${e}`)
    return null
  }
}

async function fetchYahooQuoteSummary(symbol: string, modules: string, label: string): Promise<any | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const session = await getYahooSession(attempt > 0)
    if (!session) return null

    for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
      try {
        const url = `https://${host}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(session.crumb)}`
        const res = await fetch(url, {
          headers: {
            'User-Agent': YAHOO_UA,
            'Accept': 'application/json',
            'Cookie': session.cookie,
          },
          next: { revalidate: 86400 },
        })
        if (res.status === 401 || res.status === 403) {
          console.warn(`[ticker-info:${symbol}] ${host} ${label} fetch auth rejected — status ${res.status}`)
          yahooSession = null
          break
        }
        if (!res.ok) {
          console.warn(`[ticker-info:${symbol}] ${host} ${label} fetch not OK — status ${res.status}`)
          continue
        }
        const json = await res.json().catch((e) => {
          console.warn(`[ticker-info:${symbol}] ${host} ${label} JSON parse failed — ${e}`)
          return null
        })
        const result = json?.quoteSummary?.result?.[0]
        if (result) return result
        console.warn(`[ticker-info:${symbol}] ${host} ${label}: no result in response. Raw error field: ${JSON.stringify(json?.quoteSummary?.error)}`)
      } catch (e) {
        console.error(`[ticker-info:${symbol}] ${host} ${label}: exception — ${e}`)
      }
    }
  }

  console.warn(`[ticker-info:${symbol}] ${label}: Yahoo quoteSummary exhausted, returning null`)
  return null
}

/* Derives calendar date + BMO/AMC from a Unix-seconds earnings timestamp,
   comparing the actual hour (converted to US/Eastern via Intl, no extra
   timezone library needed) against the 9:30am–4:00pm regular session —
   same technique used in scripts/update_earnings.py, kept independent
   here so this card never depends on that separate daily sync/table. */
function deriveEarningsTiming(unixSeconds: number): { date: string; time: 'bmo' | 'amc' | 'unspecified' } {
  const d = new Date(unixSeconds * 1000)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'
  const minutesSinceMidnight = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10)

  const time =
    minutesSinceMidnight < 9 * 60 + 30 ? 'bmo' :
    minutesSinceMidnight >= 16 * 60    ? 'amc' :
    'unspecified'

  return { date: `${get('year')}-${get('month')}-${get('day')}`, time }
}

/* ── Layer 1a: assetProfile + summaryProfile + summaryDetail ─────────────────
   The stable, historically-reliable module combo — this worked fine before
   calendarEvents was ever added. Kept together since none of these three
   have shown any of the "works once then fails" behavior calendarEvents
   exhibits (see fetchYahooCalendar below). */
async function fetchYahooProfile(symbol: string): Promise<{
  description: string | null; industry: string | null; employees: number | null
  country: string | null; website: string | null
  marketCap: string | null; peRatio: number | null; week52High: number | null
} | null> {
  const result = await fetchYahooQuoteSummary(symbol, 'assetProfile,summaryProfile,summaryDetail', 'profile')
  if (!result) return null

  const asset   = result.assetProfile
  const summary = result.summaryProfile
  const detail  = result.summaryDetail

  console.log(`[ticker-info:${symbol}] profile: assetProfile=${!!asset} summaryProfile=${!!summary} summaryDetail=${!!detail}`)

  const marketCap:  string | null = detail?.marketCap?.fmt ?? null
  const peRatio:    number | null = typeof detail?.trailingPE?.raw === 'number'
    ? Math.round(detail.trailingPE.raw * 10) / 10 : null
  const week52High: number | null = typeof detail?.fiftyTwoWeekHigh?.raw === 'number'
    ? detail.fiftyTwoWeekHigh.raw : null

  const rawDesc = asset?.longBusinessSummary ?? summary?.longBusinessSummary
  let description: string | null = null
  if (rawDesc) {
    const candidate = trimToTwoSentences(rawDesc)
    if (isCompanyArticle(candidate)) description = candidate
  }

  return {
    description,
    industry:  asset?.industry          ?? summary?.industry          ?? null,
    employees: asset?.fullTimeEmployees ?? summary?.fullTimeEmployees ?? null,
    country:   asset?.country           ?? summary?.country           ?? null,
    website:   asset?.website           ?? summary?.website           ?? null,
    marketCap, peRatio, week52High,
  }
}

/* ── Layer 1b: calendarEvents — fully isolated, independent request ──────────
   This module has shown a distinct "works the first call, then consistently
   fails on every subsequent call" pattern in production — a signature much
   more consistent with Yahoo requiring stricter session/crumb handling for
   this specific module than with a plain code bug. Kept completely separate
   from fetchYahooProfile above so that if/when this fails, it only costs
   the "Next Earnings" stat — market cap, P/E, and 52-week high keep working
   regardless of what calendarEvents does. */
async function fetchYahooCalendar(symbol: string): Promise<{ nextEarnings: string | null; earningsTime: 'bmo' | 'amc' | 'unspecified' | null }> {
  const result = await fetchYahooQuoteSummary(symbol, 'calendarEvents', 'calendar')
  const calendar = result?.calendarEvents
  const earningsDates = calendar?.earnings?.earningsDate
  console.log(`[ticker-info:${symbol}] calendar: result=${!!result} calendarEvents=${!!calendar} earningsDate=${JSON.stringify(earningsDates)}`)
  if (!Array.isArray(earningsDates) || earningsDates.length === 0) {
    return { nextEarnings: null, earningsTime: null }
  }

  const soonest = earningsDates
    .map((e: any) => e?.raw)
    .filter((ts: any) => typeof ts === 'number' && ts * 1000 >= Date.now())
    .sort((a: number, b: number) => a - b)[0]
  if (!soonest) return { nextEarnings: null, earningsTime: null }

  const derived = deriveEarningsTiming(soonest)
  return { nextEarnings: derived.date, earningsTime: derived.time }
}

/* ── Layer 2: Yahoo Finance webpage — og:description meta tag ──────────────
   Last-resort Yahoo attempt before Wikipedia. The quoteSummary structured
   API sometimes has nothing (newly-listed tickers, some ADRs) even though
   the profile page itself renders SEO meta tags server-side. Free, keyless,
   fails silently and falls through if Yahoo changes their markup.        */
async function fetchYahooPageMeta(symbol: string): Promise<string | null> {
  try {
    const res = await fetch(`https://finance.yahoo.com/quote/${symbol}`, {
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

  const cached = warm.get(`${symbol}:${SCHEMA_VERSION}`)
  if (cached && Date.now() - cached.at < WARM_TTL) {
    return NextResponse.json(cached.payload, { headers: { 'X-Cache': 'HIT' } })
  }

  // Waterfall: Yahoo structured API → Yahoo webpage meta → Wikipedia
  const [profileResult, calendarResult] = await Promise.all([
    fetchYahooProfile(symbol),
    fetchYahooCalendar(symbol),
  ])
  let description = profileResult?.description ?? null

  if (!description) {
    description = await fetchYahooPageMeta(symbol)
  }
  if (!description && companyName !== symbol) {
    description = await fetchWikipedia(companyName)
  }

  const payload: TickerInfo = {
    description,
    industry:     profileResult?.industry     ?? null,
    employees:    profileResult?.employees    ?? null,
    country:      profileResult?.country      ?? null,
    website:      profileResult?.website      ?? null,
    marketCap:    profileResult?.marketCap    ?? null,
    peRatio:      profileResult?.peRatio      ?? null,
    week52High:   profileResult?.week52High   ?? null,
    nextEarnings: calendarResult?.nextEarnings ?? null,
    earningsTime: calendarResult?.earningsTime ?? null,
  }

  warm.set(`${symbol}:${SCHEMA_VERSION}`, { payload, at: Date.now() })
  return NextResponse.json(payload, { headers: { 'X-Cache': 'MISS' } })
}
