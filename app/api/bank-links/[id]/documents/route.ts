import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/server'

const SAK_EMAIL = 'scott@saklending.com'

async function sendEmail(to: string | string[], subject: string, text: string) {
  if (!process.env.RESEND_API_KEY) return
  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
  })
  await transporter.sendMail({
    from: '"SAK Lending" <support@saklending.com>',
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    text,
  })
}

// POST /api/bank-links/[id]/documents  ([id] = token)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  // Validate link
  const { data: link } = await supabase
    .from('bank_share_links')
    .select('id, loan_id, label, decision, is_selected, revoked_at, expires_at')
    .eq('token', params.id)
    .single()

  if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  if (link.revoked_at) return NextResponse.json({ error: 'Link revoked' }, { status: 403 })
  if (new Date(link.expires_at) < new Date()) return NextResponse.json({ error: 'Link expired' }, { status: 403 })
  if (link.decision !== 'interested') return NextResponse.json({ error: 'You must express interest before uploading' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const doc_label = (formData.get('doc_label') as string) || 'other'
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `loans/${link.loan_id}/lender/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('loan-documents')
    .upload(storagePath, file, { contentType: file.type })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: doc, error: dbError } = await supabase
    .from('lender_documents')
    .insert({
      loan_id: link.loan_id,
      bank_link_id: link.id,
      file_name: file.name,
      doc_label,
      storage_path: storagePath,
      file_size: file.size,
    })
    .select('id, file_name, doc_label, file_size, created_at')
    .single()
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Fetch loan address and borrower email for notifications
  const { data: loan } = await supabase
    .from('loans')
    .select('address_street, address_city, address_state, contact_id')
    .eq('id', link.loan_id)
    .single()

  const addressLine = [loan?.address_street, loan?.address_city, loan?.address_state].filter(Boolean).join(', ') || 'your loan'
  const lenderLabel = link.label || 'Your lender'

  // Always notify Scott
  const sakSubject = `${lenderLabel} uploaded a document — ${addressLine}`
  const sakBody = `${lenderLabel} uploaded "${file.name}" (${doc_label}) to the loan at ${addressLine}.`
  await sendEmail(SAK_EMAIL, sakSubject, sakBody)

  // Notify borrower only if this lender is selected
  if (link.is_selected && loan?.contact_id) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, email')
      .eq('id', loan.contact_id)
      .single()

    if (contact?.email) {
      const borrowerSubject = `New document available for your loan — ${addressLine}`
      const borrowerBody = [
        `Hi ${contact.first_name},`,
        ``,
        `A new document has been uploaded to your loan file at ${addressLine}.`,
        `Please log in to your borrower portal to review it.`,
        ``,
        `SAK Lending`,
      ].join('\n')
      await sendEmail(contact.email, borrowerSubject, borrowerBody)
    }
  }

  return NextResponse.json({ ok: true, doc })
}

// DELETE /api/bank-links/[id]/documents?doc_id=  ([id] = token)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const doc_id = new URL(req.url).searchParams.get('doc_id')
  if (!doc_id) return NextResponse.json({ error: 'doc_id required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: link } = await supabase
    .from('bank_share_links')
    .select('id, revoked_at, expires_at')
    .eq('token', params.id)
    .single()

  if (!link || link.revoked_at || new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link not valid' }, { status: 403 })
  }

  const { data: doc } = await supabase
    .from('lender_documents')
    .select('storage_path')
    .eq('id', doc_id)
    .eq('bank_link_id', link.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.storage.from('loan-documents').remove([doc.storage_path])
  await supabase.from('lender_documents').delete().eq('id', doc_id)

  return NextResponse.json({ ok: true })
}
