import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/loans/[id]/lender-documents — all lender uploads for a loan (admin)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('lender_documents')
    .select('id, file_name, doc_label, file_size, created_at, bank_link_id')
    .eq('loan_id', params.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/loans/[id]/lender-documents — admin uploads a doc on behalf of a lender
// FormData: file + bank_link_id + doc_label
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const bank_link_id = formData.get('bank_link_id') as string | null
  const doc_label = (formData.get('doc_label') as string) || 'other'

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (!bank_link_id) return NextResponse.json({ error: 'bank_link_id required' }, { status: 400 })

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `loans/${params.id}/lender/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('loan-documents')
    .upload(storagePath, file, { contentType: file.type })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data, error: dbError } = await supabase
    .from('lender_documents')
    .insert({ loan_id: params.id, bank_link_id, file_name: file.name, doc_label, storage_path: storagePath, file_size: file.size })
    .select('id, file_name, doc_label, file_size, created_at, bank_link_id')
    .single()
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json(data)
}

// DELETE /api/loans/[id]/lender-documents?doc_id= — admin deletes a lender doc
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const doc_id = new URL(req.url).searchParams.get('doc_id')
  if (!doc_id) return NextResponse.json({ error: 'doc_id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: doc } = await supabase
    .from('lender_documents')
    .select('storage_path')
    .eq('id', doc_id)
    .eq('loan_id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.storage.from('loan-documents').remove([doc.storage_path])
  await supabase.from('lender_documents').delete().eq('id', doc_id)

  return NextResponse.json({ ok: true })
}
