import { NextResponse } from 'next/server'

const SERIES = [
  { id: 'DPRIME',       name: 'PRIME RATE' },
  { id: 'SOFR',         name: 'SOFR' },
  { id: 'SOFR30DAYAVG', name: '30 DAY AVG SOFR' },
  { id: 'GS1',          name: '1 YR CMT' },
  { id: 'GS3',          name: '3 YR CMT' },
  { id: 'GS5',          name: '5 YR CMT' },
  { id: 'GS7',          name: '7 YR CMT' },
  { id: 'DGS1',         name: '1 YR TREASURY' },
  { id: 'DGS3',         name: '3 YR TREASURY' },
  { id: 'DGS5',         name: '5 YR TREASURY' },
  { id: 'DGS7',         name: '7 YR TREASURY' },
  { id: 'DGS10',        name: '10 YR TREASURY' },
  { id: 'DGS30',        name: '30 YR TREASURY' },
]

// Server-side cache — survives across requests in the same process
let serverCache: { rates: { name: string; today: string; thirtyDaysAgo: string }[]; expires: number } | null = null

export const dynamic = 'force-dynamic'

export async function GET() {
  if (serverCache && serverCache.expires > Date.now()) {
    return NextResponse.json(serverCache.rates)
  }

  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'FRED_API_KEY not configured' }, { status: 500 })

  const end = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
  const start = new Date(Date.now() - 45 * 86_400_000).toISOString().split('T')[0]
  const thirtyDaysAgoTarget = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0]

  const results: { name: string; today: string; thirtyDaysAgo: string }[] = []

  // Fetch sequentially to avoid FRED rate limiting
  for (const { id, name } of SERIES) {
    try {
      const url = new URL('https://api.stlouisfed.org/fred/series/observations')
      url.searchParams.set('series_id', id)
      url.searchParams.set('api_key', apiKey)
      url.searchParams.set('file_type', 'json')
      url.searchParams.set('observation_start', start)
      url.searchParams.set('observation_end', end)

      const res = await fetch(url.toString())
      if (!res.ok) { results.push({ name, today: 'N/A', thirtyDaysAgo: 'N/A' }); continue }

      const data = await res.json()
      const obs = (data.observations ?? [])
        .filter((o: { value: string }) => o.value && o.value !== '.' && !isNaN(parseFloat(o.value)))
        .sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date))

      if (!obs.length) { results.push({ name, today: 'N/A', thirtyDaysAgo: 'N/A' }); continue }

      const today = parseFloat(obs[0].value).toFixed(3) + '%'
      const prev = obs.find((o: { date: string }) => o.date <= thirtyDaysAgoTarget)
      const thirtyDaysAgo = prev ? parseFloat(prev.value).toFixed(3) + '%' : 'N/A'

      results.push({ name, today, thirtyDaysAgo })
    } catch {
      results.push({ name, today: 'N/A', thirtyDaysAgo: 'N/A' })
    }
  }

  // Cache for 1 hour server-side
  serverCache = { rates: results, expires: Date.now() + 60 * 60 * 1000 }

  return NextResponse.json(results)
}
