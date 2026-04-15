import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { firstName, lastName, phone, email, loanAmount, propertyType, loanType, state, comments } = body

  if (!firstName || !lastName || !email || !loanAmount) {
    return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Create or find contact
  const { data: contact } = await supabase
    .from('contacts')
    .insert({
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      source: 'quote_form',
    })
    .select('id')
    .single()

  // Create loan record
  if (contact?.id) {
    await supabase.from('loans').insert({
      contact_id: contact.id,
      loan_amount: parseFloat(loanAmount),
      property_type: propertyType,
      loan_program: loanType,
      state,
      comments,
      stage: 'lead',
    })
  }

  // Send email notification
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    })
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'scott@saklending.com',
      subject: `New Quote Request: ${firstName} ${lastName}`,
      text: `
New Quote Request
----------------
Name: ${firstName} ${lastName}
Phone: ${phone}
Email: ${email}
Loan Amount: $${loanAmount}
Property Type: ${propertyType}
Loan Type: ${loanType}
State: ${state}
Comments: ${comments || 'None'}
      `.trim(),
    })
  }

  return NextResponse.json({ message: 'Quote request received!' })
}
