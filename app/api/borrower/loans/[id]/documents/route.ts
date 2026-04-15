import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getBorrowerContact } from '@/lib/auth/getBorrowerContact'

// POST /api/borrower/loans/[id]/documents — upload a document
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Verify loan belongs to this borrower
  const { data: loan } = await supabase
    .from('loans')
    .select('id')
    .eq('id', params.id)
    .eq('contact_id', auth.contact_id)
    .single()

  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const doc_type = formData.get('doc_type') as string || 'other'
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `loans/${params.id}/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('loan-documents')
    .upload(path, file, { contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data, error: dbError } = await supabase
    .from('documents')
    .insert({
      loan_id: params.id,
      doc_type,
      file_name: file.name,
      storage_path: path,
      file_size: file.size,
      uploaded_by_label: 'borrower',
    })
    .select('id, doc_type, file_name, file_size, created_at')
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/borrower/loans/[id]/documents?doc_id=
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doc_id = new URL(req.url).searchParams.get('doc_id')
  if (!doc_id) return NextResponse.json({ error: 'doc_id required' }, { status: 400 })

  const supabase = createServiceClient()

  // Fetch doc and verify it belongs to this borrower's loan
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, loan_id')
    .eq('id', doc_id)
    .eq('loan_id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify the loan belongs to this borrower
  const { data: loan } = await supabase
    .from('loans').select('id').eq('id', doc.loan_id).eq('contact_id', auth.contact_id).single()
  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.storage.from('loan-documents').remove([doc.storage_path])
  await supabase.from('documents').delete().eq('id', doc_id)
  return NextResponse.json({ ok: true })
}
