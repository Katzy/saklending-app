import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    firstName, lastName, phone, email, loanAmount, propertyValue, noi,
    propertyType, loanType, comments, alreadyOwned,
    addressStreet, addressCity, addressState, addressZip,
  } = body

  if (!firstName || !lastName || !email || !loanAmount) {
    return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Create contact, or find existing one by email
  let contact: { id: string } | null = null
  const { data: inserted } = await supabase
    .from('contacts')
    .insert({ first_name: firstName, last_name: lastName, phone, email, source: 'quote_form' })
    .select('id')
    .single()

  if (inserted) {
    contact = inserted
  } else {
    // Already exists — look up by email
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    contact = existing ?? null
  }

  // Map quote form loan type display values to internal DB values
  const loanProgramMap: Record<string, string> = {
    'Purchase (5 – 30 yr)':              'permanent',
    'Refinance (5 – 30 yr)':             'permanent',
    'Ground-Up Construction (12 – 36 mo)': 'ground_up',
    'Bridge (6 mo – 3 yr)':              'bridge',
    'Small Balance DSCR (5 – 30 yr)':    'permanent',
    'CMBS (5 – 10 yr)':                  'permanent',
  }
  const loanPurposeMap: Record<string, string> = {
    'Purchase (5 – 30 yr)':              'purchase',
    'Refinance (5 – 30 yr)':             'refinance',
    'Ground-Up Construction (12 – 36 mo)': 'purchase',
    'Bridge (6 mo – 3 yr)':              'purchase',
    'Small Balance DSCR (5 – 30 yr)':    'purchase',
    'CMBS (5 – 10 yr)':                  'purchase',
  }

  // Create loan record
  if (contact?.id) {
    const { error: loanError } = await supabase.from('loans').insert({
      contact_id: contact.id,
      loan_amount: parseFloat(loanAmount),
      purchase_price: propertyValue ? parseFloat(propertyValue) : null,
      noi: noi ? parseFloat(noi) : null,
      property_type: propertyType,
      loan_program: loanProgramMap[loanType] ?? null,
      loan_purpose: loanPurposeMap[loanType] ?? null,
      address_street: addressStreet || null,
      address_city: addressCity || null,
      address_state: addressState || null,
      address_zip: addressZip || null,
      stage: 'lead',
    })

    if (loanError) {
      console.error('Quote loan insert error:', loanError.message)
      return NextResponse.json({ error: loanError.message }, { status: 500 })
    }

    // Create property record if borrower already owns it
    if (alreadyOwned && addressStreet) {
      const { data: existingProp } = await supabase
        .from('properties')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('address_street', addressStreet)
        .maybeSingle()

      if (!existingProp) {
        await supabase.from('properties').insert({
          contact_id: contact.id,
          address_street: addressStreet,
          address_city: addressCity || null,
          address_state: addressState || null,
          address_zip: addressZip || null,
          property_type: propertyType || null,
        })
      }
    }
  }

  const addressLine = [addressStreet, addressCity, addressState, addressZip].filter(Boolean).join(', ') || 'Not provided'

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
Property Address: ${addressLine}
Already Owned: ${alreadyOwned ? 'Yes' : 'No'}
Comments: ${comments || 'None'}
      `.trim(),
    })
  }

  return NextResponse.json({ message: 'Quote request received!' })
}
