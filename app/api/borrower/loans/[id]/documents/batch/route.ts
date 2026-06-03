import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/server'
import { getBorrowerContact } from '@/lib/auth/getBorrowerContact'

// POST /api/borrower/loans/[id]/documents/batch
// FormData: files[] + doc_types[] (parallel arrays, one entry per file)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: loan } = await supabase
    .from('loans')
    .select('id, address_street, address_city, address_state, contact_id')
    .eq('id', params.id)
    .eq('contact_id', auth.contact_id)
    .single()

  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const files = formData.getAll('file') as File[]
  const docTypes = formData.getAll('doc_type') as string[]

  if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 })

  const inserted: { id: string; doc_type: string; file_name: string; file_size: number | null; created_at: string }[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const doc_type = docTypes[i] || 'other'
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `loans/${params.id}/${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('loan-documents')
      .upload(path, file, { contentType: file.type })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({ loan_id: params.id, doc_type, file_name: file.name, storage_path: path, file_size: file.size, uploaded_by_label: 'borrower' })
      .select('id, doc_type, file_name, file_size, created_at')
      .single()
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    if (data) inserted.push(data)
  }

  // One email to Scott summarizing all uploads
  if (process.env.RESEND_API_KEY && inserted.length) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name')
      .eq('id', loan.contact_id)
      .single()

    const borrowerName = contact ? `${contact.first_name} ${contact.last_name}` : 'A borrower'
    const addressLine = [loan.address_street, loan.address_city, loan.address_state].filter(Boolean).join(', ') || 'their loan'
    const fileList = inserted.map(d => `• ${d.file_name} (${d.doc_type})`).join('\n')

    const transporter = nodemailer.createTransport({
      host: 'smtp.resend.com', port: 465, secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
    })
    await transporter.sendMail({
      from: '"SAK Lending" <support@saklending.com>',
      to: 'scott@saklending.com',
      subject: `${borrowerName} uploaded ${inserted.length} document${inserted.length > 1 ? 's' : ''} — ${addressLine}`,
      text: `${borrowerName} uploaded the following to their loan at ${addressLine}:\n\n${fileList}`,
    })
  }

  return NextResponse.json({ ok: true, documents: inserted })
}
