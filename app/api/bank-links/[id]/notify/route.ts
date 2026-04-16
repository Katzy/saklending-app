import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
})

// POST /api/bank-links/[id]/notify
// [id] = token. Body: { action: 'interested' | 'pass', label?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { action, label } = await req.json()
  if (!action || !['interested', 'pass'].includes(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: link } = await supabase
    .from('bank_share_links')
    .select('loan_id, label, expires_at, revoked_at')
    .eq('token', params.id)
    .single()

  if (!link) return NextResponse.json({ error: 'link not found' }, { status: 404 })
  if (link.revoked_at) return NextResponse.json({ error: 'link revoked' }, { status: 403 })

  const { data: loan } = await supabase
    .from('loans')
    .select('loan_amount, property_type, address_city, address_state, loan_program, loan_purpose')
    .eq('id', link.loan_id)
    .single()

  const propertyLabel = loan?.address_city
    ? `${loan.address_city}, ${loan.address_state ?? ''}`
    : loan?.property_type ?? 'Unknown property'

  const loanAmount = loan?.loan_amount
    ? '$' + Number(loan.loan_amount).toLocaleString('en-US', { maximumFractionDigits: 0 })
    : null

  const actionLabel = action === 'interested' ? '✅ Interested' : '❌ Pass'
  const linkLabel = link.label ?? label ?? 'Unknown lender'

  if (process.env.RESEND_API_KEY) {
    await transporter.sendMail({
      from: '"SAK Lending" <support@saklending.com>',
      to: 'scott@saklending.com',
      subject: `${actionLabel} — ${linkLabel} on ${propertyLabel}`,
      text: [
        `Lender decision on loan package`,
        ``,
        `Decision: ${action === 'interested' ? 'INTERESTED' : 'PASS'}`,
        `Lender: ${linkLabel}`,
        `Property: ${propertyLabel}`,
        loanAmount ? `Loan Amount: ${loanAmount}` : null,
        loan?.loan_program ? `Program: ${loan.loan_program}` : null,
        ``,
        `Log in to your dashboard to follow up.`,
      ].filter(Boolean).join('\n'),
    })
  }

  return NextResponse.json({ ok: true })
}
