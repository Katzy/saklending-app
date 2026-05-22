import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/server'

async function sendEmail(subject: string, text: string) {
  if (!process.env.RESEND_API_KEY) return
  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
  })
  await transporter.sendMail({
    from: '"SAK Lending" <support@saklending.com>',
    to: 'scott@saklending.com',
    subject,
    text,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('[docuseal/webhook] event_type:', body.event_type)

  // Notify when a borrower opens their signing link
  if (body.event_type === 'form.viewed') {
    const submitter = body.data
    const name = submitter?.name ?? 'Someone'
    const email = submitter?.email ?? ''
    const loanId = submitter?.metadata?.loan_id ?? submitter?.submission?.metadata?.loan_id ?? ''

    const supabase = createServiceClient()
    let addressLine = ''
    if (loanId) {
      const { data: loan } = await supabase.from('loans').select('address_street').eq('id', loanId).single()
      if (loan?.address_street) addressLine = ` for ${loan.address_street}`
    }

    await sendEmail(
      `Broker agreement opened — ${name}`,
      `${name}${email ? ` (${email})` : ''} just opened the broker agreement${addressLine}.`,
    )
    return NextResponse.json({ ok: true })
  }

  // Only act on fully completed submissions
  if (body.event_type !== 'submission.completed') {
    return NextResponse.json({ ok: true })
  }

  const submission = body.data
  // loan_id is stored on the First Party submitter's metadata
  const loanId = submission?.submitters?.find(
    (s: { metadata?: { loan_id?: string } }) => s.metadata?.loan_id
  )?.metadata?.loan_id ?? submission?.metadata?.loan_id
  console.log('[docuseal/webhook] loan_id:', loanId, '| documents:', submission?.documents?.length ?? 0)

  if (!loanId) {
    console.warn('[docuseal/webhook] No loan_id in metadata — skipping')
    return NextResponse.json({ ok: true })
  }

  // Find the completed document download URL
  const documents: { name: string; url: string }[] = submission.documents ?? []
  if (!documents.length) {
    console.warn('[docuseal/webhook] No documents in payload')
    return NextResponse.json({ ok: true })
  }

  const doc = documents[0]
  const supabase = createServiceClient()

  // Build filename from borrower last name + property street address
  const submitters: { role: string; name: string }[] = submission.submitters ?? []
  const borrower = submitters.find((s) => s.role === 'First Party')
  const nameParts = (borrower?.name ?? '').trim().split(/\s+/)
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] ?? 'borrower'

  const { data: loanRow } = await supabase.from('loans').select('address_street').eq('id', loanId).single()
  const street = loanRow?.address_street ?? ''

  const safe = (s: string) => s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  const fileName = `broker_agreement_${safe(lastName)}_${safe(street)}.pdf`

  // Download the completed PDF from Docuseal
  const pdfRes = await fetch(doc.url, {
    headers: { 'X-Auth-Token': process.env.DOCUSEAL_API_KEY! },
  })
  if (!pdfRes.ok) {
    console.error('Failed to download completed PDF from Docuseal')
    return NextResponse.json({ error: 'download failed' }, { status: 500 })
  }

  const pdfBuffer = await pdfRes.arrayBuffer()
  const storagePath = `loans/${loanId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('loan-documents')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf' })

  if (uploadError) {
    console.error('Supabase upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { error: dbError } = await supabase.from('documents').insert({
    loan_id: loanId,
    doc_type: 'broker_agreement',
    file_name: fileName,
    storage_path: storagePath,
    file_size: pdfBuffer.byteLength,
    uploaded_by_label: 'docuseal',
  })

  if (dbError) {
    console.error('DB insert error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
