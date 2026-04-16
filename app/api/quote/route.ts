import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { firstName, lastName, phone, email, loanAmount, propertyValue, noi, propertyType, loanType, state, comments } = body

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
      purchase_price: propertyValue ? parseFloat(propertyValue) : null,
      noi: noi ? parseFloat(noi) : null,
      property_type: propertyType,
      loan_program: loanType,
      state,
      comments,
      stage: 'lead',
    })
  }

  // Send email notification
  if (process.env.RESEND_API_KEY) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
    })
    await transporter.sendMail({
      from: '"SAK Lending" <support@saklending.com>',
      to: 'scott@saklending.com',
      subject: `New Quote Request: ${firstName} ${lastName}`,
      text: `
New Quote Request
----------------
Name: ${firstName} ${lastName}
Phone: ${phone}
Email: ${email}
Loan Amount: $${loanAmount}
Property Value: ${propertyValue ? '$' + Number(propertyValue).toLocaleString() : 'Not provided'}
NOI: ${noi ? '$' + Number(noi).toLocaleString() : 'Not provided'}
Property Type: ${propertyType}
Loan Type: ${loanType}
State: ${state}
Comments: ${comments || 'None'}
      `.trim(),
    })
  }

  return NextResponse.json({ message: 'Quote request received!' })
}
