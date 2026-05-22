import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; doc_id: string } },
) {
  const supabase = createServiceClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', params.doc_id)
    .eq('loan_id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from('loan-documents')
    .createSignedUrl(doc.storage_path, 60 * 5) // 5-minute link

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Failed to generate URL' }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}
