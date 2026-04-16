import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/server'
import { getBorrowerContact } from '@/lib/auth/getBorrowerContact'

export async function GET() {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('loans')
    .select('id, created_at, loan_amount, loan_purpose, loan_program, property_type, property_id, address_street, address_city, address_state, stage, is_dead')
    .eq('contact_id', auth.contact_id)
    .eq('is_dead', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = createServiceClient()

  // Fetch borrower name for the notification email
  const { data: contact } = await supabase
    .from('contacts')
    .select('first_name, last_name, email, entity_name')
    .eq('id', auth.contact_id)
    .single()

  const { data, error } = await supabase
    .from('loans')
    .insert({
      contact_id: auth.contact_id,
      property_id: body.property_id ?? null,
      loan_amount: body.loan_amount ?? null,
      purchase_price: body.purchase_price ?? null,
      noi: body.noi ?? null,
      loan_purpose: body.loan_purpose ?? null,
      loan_program: body.loan_program ?? null,
      property_type: body.property_type ?? null,
      address_street: body.address_street ?? null,
      address_city: body.address_city ?? null,
      address_state: body.address_state ?? null,
      address_zip: body.address_zip ?? null,
      stage: 'lead',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email notification to admin
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      })

      const borrowerName = contact
        ? [contact.first_name, contact.last_name].filter(Boolean).join(' ')
        : 'Unknown Borrower'
      const borrowerLine = contact?.entity_name
        ? `${borrowerName} — ${contact.entity_name}`
        : borrowerName

      const address = [body.address_street, body.address_city, body.address_state, body.address_zip]
        .filter(Boolean).join(', ') || 'Not provided'

      const details = [
        `Borrower:      ${borrowerLine}`,
        contact?.email ? `Email:         ${contact.email}` : null,
        `Property:      ${address}`,
        body.loan_purpose   ? `Purpose:        ${body.loan_purpose}` : null,
        body.loan_program   ? `Program:        ${body.loan_program.replace('_', ' ')}` : null,
        body.loan_amount    ? `Loan Amount:    $${Number(body.loan_amount).toLocaleString()}` : null,
        body.purchase_price ? `Property Value: $${Number(body.purchase_price).toLocaleString()}` : null,
        body.noi            ? `NOI:            $${Number(body.noi).toLocaleString()}` : null,
      ].filter(Boolean).join('\n')

      const loanUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://saklending.com'}/dashboard/loans/${data.id}`

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: 'scott@saklending.com',
        subject: `New Loan Request — ${borrowerName} — ${address}`,
        text: `A borrower has submitted a new loan request.\n\n${details}\n\nView in dashboard:\n${loanUrl}`,
      })
    } catch {
      // Email failure is non-fatal — loan was already created
    }
  }

  return NextResponse.json({ id: data.id })
}
