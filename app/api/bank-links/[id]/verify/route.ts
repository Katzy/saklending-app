import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
})

// POST /api/bank-links/[id]/verify  (params.id holds the token value)
// Verifies password and returns full loan package on success
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: 'password required' }, { status: 400 })

  const supabase = createServiceClient()

  // Find the link by token
  const { data: link, error: linkError } = await supabase
    .from('bank_share_links')
    .select('id, loan_id, password_hash, expires_at, revoked_at, decision, label')
    .eq('token', params.id)
    .single()

  if (linkError || !link) return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  if (link.revoked_at)   return NextResponse.json({ error: 'This link has been revoked' }, { status: 403 })
  if (new Date(link.expires_at) < new Date()) return NextResponse.json({ error: 'This link has expired' }, { status: 403 })

  const valid = await bcrypt.compare(password, link.password_hash)
  if (!valid) return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })

  // Fetch full loan package
  const { data: loan } = await supabase
    .from('loans')
    .select('*')
    .eq('id', link.loan_id)
    .single()

  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

  // Fetch contact
  const { data: contact } = loan.contact_id
    ? await supabase.from('contacts').select('first_name, last_name, email, phone, entity_name, sponsor_bio, credit_score_estimate').eq('id', loan.contact_id).single()
    : { data: null }

  // Fetch documents
  const { data: documents } = await supabase
    .from('documents')
    .select('id, doc_type, file_name, storage_path, file_size')
    .eq('loan_id', link.loan_id)

  // Generate signed URLs for documents
  const docs = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from('loan-documents')
        .createSignedUrl(doc.storage_path, 60 * 60 * 4) // 4hr
      return { ...doc, url: signed?.signedUrl ?? null }
    })
  )

  // Generate signed URLs for all property images
  const imgPaths: string[] = (loan.property_image_paths ?? []).length > 0
    ? loan.property_image_paths
    : loan.property_image_path ? [loan.property_image_path] : []
  const imgSigned = await Promise.all(
    imgPaths.map((p: string) => supabase.storage.from('loan-documents').createSignedUrl(p, 60 * 60 * 4))
  )
  const property_image_urls = imgSigned.map((r) => r.data?.signedUrl ?? null).filter(Boolean) as string[]
  const property_image_url = property_image_urls[0] ?? null

  // Fetch this lender's own uploads
  const { data: lenderDocs } = await supabase
    .from('lender_documents')
    .select('id, file_name, doc_label, file_size, storage_path, created_at')
    .eq('bank_link_id', link.id)
    .order('created_at', { ascending: false })

  const myUploads = await Promise.all(
    (lenderDocs ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from('loan-documents')
        .createSignedUrl(doc.storage_path, 60 * 60 * 4)
      return { ...doc, url: signed?.signedUrl ?? null }
    })
  )

  // Notify admin that a bank viewed this loan package
  if (process.env.RESEND_API_KEY) {
    const lenderLabel = link.label ?? 'A lender'
    const propertyLabel = loan.address_city
      ? `${loan.address_street ?? ''} ${loan.address_city}, ${loan.address_state ?? ''}`.trim()
      : loan.property_type ?? 'Unknown property'
    await transporter.sendMail({
      from: '"SAK Lending" <support@saklending.com>',
      to: 'scott@saklending.com',
      subject: `👀 ${lenderLabel} viewed loan package — ${propertyLabel}`,
      text: [
        `${lenderLabel} just logged in to view the loan package.`,
        ``,
        `Property: ${propertyLabel}`,
        loan.loan_amount ? `Loan Amount: $${Number(loan.loan_amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : null,
        `Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`,
        ``,
        `Log in to your dashboard to follow up.`,
      ].filter(Boolean).join('\n'),
    }).catch(() => {})
  }

  return NextResponse.json({
    loan,
    contact,
    documents: docs,
    property_image_url,
    property_image_urls,
    decision: link.decision ?? null,
    my_uploads: myUploads,
    bank_link_id: link.id,
  })
}
