import { NextResponse } from 'next/server'

let serverCache: { rates: { name: string; today: string; thirtyDaysAgo: string }[]; expires: number } | null = null

export const dynamic = 'force-dynamic'

const N_A = 'N/A'
const fmt = (v: number | null | undefined) => (v != null && !isNaN(v) ? v.toFixed(2) + '%' : N_A)
const yyyymm = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`

// ── FRED helpers (Prime, SOFR, 30-day SOFR only) ─────────────────

const FRED_SERIES = [
  { id: 'DPRIME',       name: 'PRIME RATE' },
  { id: 'SOFR',         name: 'SOFR' },
  { id: 'SOFR30DAYAVG', name: '30 DAY AVG SOFR' },
]

async function fetchFredRates(apiKey: string, start: string, end: string, thirtyDaysAgoTarget: string) {
  const results: { name: string; today: string; thirtyDaysAgo: string }[] = []
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  for (const { id, name } of FRED_SERIES) {
    await sleep(300)
    try {
      const url = new URL('https://api.stlouisfed.org/fred/series/observations')
      url.searchParams.set('series_id', id)
      url.searchParams.set('api_key', apiKey)
      url.searchParams.set('file_type', 'json')
      url.searchParams.set('observation_start', start)
      url.searchParams.set('observation_end', end)
      const res = await fetch(url.toString(), { cache: 'no-store' })
      if (!res.ok) { results.push({ name, today: N_A, thirtyDaysAgo: N_A }); continue }
      const data = await res.json()
      const obs = (data.observations ?? [])
        .filter((o: { value: string }) => o.value && o.value !== '.' && !isNaN(parseFloat(o.value)))
        .sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date))

      if (!obs.length) { results.push({ name, today: N_A, thirtyDaysAgo: N_A }); continue }
      const today = parseFloat(obs[0].value).toFixed(2) + '%'
      const prev = obs.find((o: { date: string }) => o.date <= thirtyDaysAgoTarget)
      results.push({ name, today, thirtyDaysAgo: prev ? parseFloat(prev.value).toFixed(2) + '%' : N_A })
    } catch {
      results.push({ name, today: N_A, thirtyDaysAgo: N_A })
    }
  }
  return results
}

// ── Treasury XML helpers ──────────────────────────────────────────

async function fetchTreasury(ym: string): Promise<string | null> {
  const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${ym}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return res.text()
  } catch (e) { console.error(`[rates] Treasury ${ym} error:`, e); return null }
}

type TEntry = { date: string; fields: Record<string, number | null> }
const TREASURY_FIELDS = ['BC_1YEAR', 'BC_3YEAR', 'BC_5YEAR', 'BC_7YEAR', 'BC_10YEAR', 'BC_30YEAR']

function parseTreasury(xml: string): TEntry[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []
  return entries.flatMap((entry) => {
    const dateMatch = entry.match(/<d:NEW_DATE[^>]*>([^T<]+)/)
    if (!dateMatch) return []
    const date = dateMatch[1].trim()
    const fields: Record<string, number | null> = {}
    for (const f of TREASURY_FIELDS) {
      const m = entry.match(new RegExp(`<d:${f}[^>]*>([^<]+)<\\/d:${f}>`))
      fields[f] = m ? parseFloat(m[1]) : null
    }
    return [{ date, fields }]
  })
}

function pickTreasury(entries: TEntry[], targetDate: string): TEntry | null {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  return sorted.find((e) => e.date <= targetDate) ?? null
}

// ── Main handler ──────────────────────────────────────────────────

export async function GET() {
  if (serverCache && serverCache.expires > Date.now()) {
    return NextResponse.json(serverCache.rates)
  }

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const prevDate = new Date(Date.now() - 30 * 86_400_000)
  const prevStr = prevDate.toISOString().split('T')[0]
  const startStr = new Date(Date.now() - 60 * 86_400_000).toISOString().split('T')[0]
  const currYM = yyyymm(now)
  const prevYM = yyyymm(prevDate)

  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'FRED_API_KEY not configured' }, { status: 500 })

  const [fredRates, tNowXml, tPrevXml] = await Promise.all([
    fetchFredRates(apiKey, startStr, todayStr, prevStr),
    fetchTreasury(currYM),
    prevYM !== currYM ? fetchTreasury(prevYM) : Promise.resolve(null),
  ])

  const allTreasury = [
    ...(tNowXml ? parseTreasury(tNowXml) : []),
    ...(tPrevXml ? parseTreasury(tPrevXml) : []),
  ]
  const tToday = pickTreasury(allTreasury, todayStr)
  const tPrev  = pickTreasury(allTreasury, prevStr)
  const tv = (f: string, e: TEntry | null) => fmt(e?.fields[f] ?? null)

  const results = [
    ...fredRates,
    { name: '1 YR TREASURY',  today: tv('BC_1YEAR',  tToday), thirtyDaysAgo: tv('BC_1YEAR',  tPrev) },
    { name: '3 YR TREASURY',  today: tv('BC_3YEAR',  tToday), thirtyDaysAgo: tv('BC_3YEAR',  tPrev) },
    { name: '5 YR TREASURY',  today: tv('BC_5YEAR',  tToday), thirtyDaysAgo: tv('BC_5YEAR',  tPrev) },
    { name: '7 YR TREASURY',  today: tv('BC_7YEAR',  tToday), thirtyDaysAgo: tv('BC_7YEAR',  tPrev) },
    { name: '10 YR TREASURY', today: tv('BC_10YEAR', tToday), thirtyDaysAgo: tv('BC_10YEAR', tPrev) },
    { name: '30 YR TREASURY', today: tv('BC_30YEAR', tToday), thirtyDaysAgo: tv('BC_30YEAR', tPrev) },
  ]

  serverCache = { rates: results, expires: Date.now() + 60 * 60 * 1000 }
  return NextResponse.json(results)
}
