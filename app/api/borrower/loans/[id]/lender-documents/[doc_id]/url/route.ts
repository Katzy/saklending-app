import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getBorrowerContact } from '@/lib/auth/getBorrowerContact'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; doc_id: string } },
) {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Verify loan belongs to borrower
  const { data: loan } = await supabase
    .from('loans')
    .select('id')
    .eq('id', params.id)
    .eq('contact_id', auth.contact_id)
    .single()

  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch the lender doc — must belong to the selected bank for this loan
  const { data: selectedLink } = await supabase
    .from('bank_share_links')
    .select('id')
    .eq('loan_id', params.id)
    .eq('is_selected', true)
    .maybeSingle()

  if (!selectedLink) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: doc } = await supabase
    .from('lender_documents')
    .select('storage_path')
    .eq('id', params.doc_id)
    .eq('bank_link_id', selectedLink.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from('loan-documents')
    .createSignedUrl(doc.storage_path, 60 * 5)

  if (error || !data) return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}
