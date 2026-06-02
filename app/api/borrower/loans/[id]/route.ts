import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getBorrowerContact } from '@/lib/auth/getBorrowerContact'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Verify this loan belongs to this borrower
  const { data: loan, error } = await supabase
    .from('loans')
    .select('*')
    .eq('id', params.id)
    .eq('contact_id', auth.contact_id)
    .single()

  if (error || !loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch documents for this loan
  const { data: documents } = await supabase
    .from('documents')
    .select('id, doc_type, file_name, file_size, created_at')
    .eq('loan_id', params.id)
    .order('created_at', { ascending: false })

  // Fetch lender documents from the selected bank only
  const { data: selectedLink } = await supabase
    .from('bank_share_links')
    .select('id, label')
    .eq('loan_id', params.id)
    .eq('is_selected', true)
    .maybeSingle()

  let lender_documents: { id: string; file_name: string; doc_label: string; file_size: number | null; created_at: string }[] = []
  let selected_lender_label: string | null = null

  if (selectedLink) {
    selected_lender_label = selectedLink.label ?? null
    const { data: lenderDocs } = await supabase
      .from('lender_documents')
      .select('id, file_name, doc_label, file_size, created_at')
      .eq('bank_link_id', selectedLink.id)
      .order('created_at', { ascending: false })
    lender_documents = lenderDocs ?? []
  }

  return NextResponse.json({ loan, documents: documents ?? [], lender_documents, selected_lender_label })
}
