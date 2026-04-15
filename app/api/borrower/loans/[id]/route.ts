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

  return NextResponse.json({ loan, documents: documents ?? [] })
}
