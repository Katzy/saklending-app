import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/server'

// POST /api/bank-links/[id]/notify-docs  ([id] = bank_share_links.id)
// Body: { recipient_email, recipient_name, doc_ids: string[], note?: string, app_url: string }
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://saklending.com'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { recipient_email, recipient_name, doc_ids, note } = await req.json()

  if (!recipient_email || !doc_ids?.length) {
    return NextResponse.json({ error: 'recipient_email and doc_ids required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: link } = await supabase
    .from('bank_share_links')
    .select('id, loan_id, token, label, revoked_at, expires_at')
    .eq('id', params.id)
    .single()

  if (!link || link.revoked_at || new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link not valid' }, { status: 403 })
  }

  // Fetch the selected documents
  const { data: docs } = await supabase
    .from('documents')
    .select('id, file_name, doc_type, created_at')
    .in('id', doc_ids)
    .eq('loan_id', link.loan_id)

  if (!docs?.length) return NextResponse.json({ error: 'No matching documents found' }, { status: 404 })

  const { data: loan } = await supabase
    .from('loans')
    .select('address_street, address_city, address_state')
    .eq('id', link.loan_id)
    .single()

  const addressLine = [loan?.address_street, loan?.address_city, loan?.address_state].filter(Boolean).join(', ') || 'the loan'
  const portalUrl = `${SITE_URL}/loan-file/${link.token}`
  const greeting = recipient_name ? `Hi ${recipient_name},` : 'Hello,'

  const DOC_LABELS: Record<string, string> = {
    pfs: 'Personal Financial Statement (PFS)',
    t12: 'T-12 Operating Statement',
    rent_roll: 'Rent Roll',
    broker_agreement: 'Broker Agreement',
    purchase_contract: 'Purchase Contract',
    appraisal: 'Appraisal',
    environmental: 'Environmental Report',
    scope_of_work: 'Scope of Work & Budget',
    tax_return: 'Tax Return',
    bank_statement: 'Bank Statement',
    other: 'Other',
  }

  const fileLines = docs.map((d) => {
    const label = DOC_LABELS[d.doc_type] ?? d.doc_type.replace(/_/g, ' ')
    const date = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `• ${d.file_name} — ${label} (uploaded ${date})`
  }).join('\n')

  const body = [
    greeting,
    ``,
    note ? note : `The following document${docs.length > 1 ? 's have' : ' has'} been added to the loan file for ${addressLine}:`,
    ``,
    fileLines,
    ``,
    `Log in to your portal to view and download them. Use your existing password.`,
    ``,
    portalUrl,
    ``,
    `SAK Lending`,
  ].join('\n')

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com', port: 465, secure: true,
    auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
  })

  await transporter.sendMail({
    from: '"SAK Lending" <support@saklending.com>',
    to: recipient_email,
    subject: `New document${docs.length > 1 ? 's' : ''} available — ${addressLine}`,
    text: body,
  })

  return NextResponse.json({ ok: true })
}
