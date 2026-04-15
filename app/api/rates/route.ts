import { NextRequest, NextResponse } from 'next/server'

const cache = new Map<string, { data: unknown; expires: number }>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const series_id = searchParams.get('series_id')
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!series_id) {
    return NextResponse.json({ error: 'series_id is required' }, { status: 400 })
  }

  const cacheKey = `${series_id}_${start ?? ''}_${end ?? ''}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data)
  }

  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'FRED_API_KEY not configured' }, { status: 500 })
  }

  const url = new URL('https://api.stlouisfed.org/fred/series/observations')
  url.searchParams.set('series_id', series_id)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('file_type', 'json')
  if (start) url.searchParams.set('observation_start', start)
  if (end) url.searchParams.set('observation_end', end)

  const response = await fetch(url.toString())
  if (!response.ok) {
    const text = await response.text()
    return NextResponse.json({ error: response.statusText, details: text }, { status: response.status })
  }

  const data = await response.json()

  // Cache for 24 hours
  cache.set(cacheKey, { data, expires: Date.now() + 24 * 60 * 60 * 1000 })

  return NextResponse.json(data)
}
