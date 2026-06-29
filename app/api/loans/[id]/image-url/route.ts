import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/loans/[id]/image-url — returns signed URLs for all property images
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  const { data: loan } = await supabase
    .from('loans')
    .select('property_image_path, property_image_paths')
    .eq('id', params.id)
    .single()

  const existing: string[] = loan?.property_image_paths ?? []
  const legacy = loan?.property_image_path
  const paths = existing.length === 0 && legacy ? [legacy] : existing

  if (!paths.length) return NextResponse.json({ url: null, urls: [] })

  const signed = await Promise.all(
    paths.map((p) => supabase.storage.from('loan-documents').createSignedUrl(p, 60 * 60 * 4))
  )
  const urls = signed.map((r) => r.data?.signedUrl ?? null).filter(Boolean) as string[]

  return NextResponse.json({ url: urls[0] ?? null, urls, paths })
}
