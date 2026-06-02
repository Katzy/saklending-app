import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/bank-links/[id]/documents/[doc_id]/url  ([id] = token)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; doc_id: string } },
) {
  const supabase = createServiceClient()

  // Validate the link
  const { data: link } = await supabase
    .from('bank_share_links')
    .select('id, revoked_at, expires_at')
    .eq('token', params.id)
    .single()

  if (!link || link.revoked_at || new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link not valid' }, { status: 403 })
  }

  // Fetch the doc — must belong to this bank link
  const { data: doc } = await supabase
    .from('lender_documents')
    .select('storage_path')
    .eq('id', params.doc_id)
    .eq('bank_link_id', link.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from('loan-documents')
    .createSignedUrl(doc.storage_path, 60 * 5)

  if (error || !data) return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}
