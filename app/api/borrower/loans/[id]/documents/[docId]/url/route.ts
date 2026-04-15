import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getBorrowerContact } from '@/lib/auth/getBorrowerContact'

// GET /api/borrower/loans/[id]/documents/[docId]/url
// Returns a short-lived signed URL for a document the borrower owns.
// Never exposes the raw storage path to the client.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Verify the document belongs to a loan owned by this borrower
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, file_name, loan_id')
    .eq('id', params.docId)
    .eq('loan_id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: loan } = await supabase
    .from('loans')
    .select('id')
    .eq('id', doc.loan_id)
    .eq('contact_id', auth.contact_id)
    .single()

  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from('loan-documents')
    .createSignedUrl(doc.storage_path, 60 * 15) // 15-minute window

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl, file_name: doc.file_name })
}
