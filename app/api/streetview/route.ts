import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  const width = searchParams.get('width') ?? '640'
  const height = searchParams.get('height') ?? '400'

  if (!address) return new NextResponse(null, { status: 400 })

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  if (!key) return new NextResponse(null, { status: 500 })

  const url = `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${encodeURIComponent(address)}&key=${key}`

  const res = await fetch(url, {
    headers: { Referer: 'https://saklending.com/' },
  })

  if (!res.ok) return new NextResponse(null, { status: res.status })

  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'

  return new NextResponse(buffer, {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' },
  })
}
