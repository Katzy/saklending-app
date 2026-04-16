'use client'

import { useState } from 'react'

type Props = {
  street: string | null | undefined
  city: string | null | undefined
  state: string | null | undefined
  zip?: string | null | undefined
  width?: number
  height?: number
  className?: string
}

function buildUrl(
  street: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
  zip: string | null | undefined,
  width: number,
  height: number,
) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  if (!key || !street) return null
  const address = [street, city, state, zip].filter(Boolean).join(', ')
  return `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${encodeURIComponent(address)}&key=${key}&return_error_code=true`
}

export default function StreetView({ street, city, state, zip, width = 640, height = 400, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const url = buildUrl(street, city, state, zip, width, height)

  if (!url || failed) return null

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Street view of property"
      width={width}
      height={height}
      onError={() => setFailed(true)}
      className={className}
    />
  )
}
