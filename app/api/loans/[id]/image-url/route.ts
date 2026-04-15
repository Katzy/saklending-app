import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/loans/[id]/image-url — returns a short-lived signed URL for the showcase image
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  const { data: loan } = await supabase
    .from('loans')
    .select('property_image_path')
    .eq('id', params.id)
    .single()

  if (!loan?.property_image_path) return NextResponse.json({ url: null })

  const { data } = await supabase.storage
    .from('loan-documents')
    .createSignedUrl(loan.property_image_path, 60 * 60 * 4) // 4hr

  return NextResponse.json({ url: data?.signedUrl ?? null })
}
