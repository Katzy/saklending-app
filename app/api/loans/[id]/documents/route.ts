import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/loans/[id]/documents — list all docs for a loan (admin)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('documents')
    .select('id, doc_type, file_name, file_size, uploaded_by_label, created_at')
    .eq('loan_id', params.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/loans/[id]/documents — upload a document (admin)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const doc_type = (formData.get('doc_type') as string) || 'other'
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

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
      uploaded_by_label: 'admin',
    })
    .select('id, doc_type, file_name, file_size, created_at, uploaded_by_label')
    .single()
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/loans/[id]/documents?doc_id= — delete a document (admin)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const doc_id = new URL(req.url).searchParams.get('doc_id')
  if (!doc_id) return NextResponse.json({ error: 'doc_id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', doc_id)
    .eq('loan_id', params.id)
    .single()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.storage.from('loan-documents').remove([doc.storage_path])
  await supabase.from('documents').delete().eq('id', doc_id)
  return NextResponse.json({ ok: true })
}
