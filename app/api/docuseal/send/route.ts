import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const DOCUSEAL_API_URL = process.env.DOCUSEAL_API_URL!
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!
const TEMPLATE_ID_1 = process.env.DOCUSEAL_TEMPLATE_ID_1!
const TEMPLATE_ID_2 = process.env.DOCUSEAL_TEMPLATE_ID_2!
const SAK_EMAIL = 'scottalankatz@gmail.com'
const SAK_NAME = 'Scott Katz'

export async function POST(req: NextRequest) {
  // Validate env vars are present
  if (!DOCUSEAL_API_KEY || !DOCUSEAL_API_URL || !TEMPLATE_ID_1 || !TEMPLATE_ID_2) {
    console.error('Missing Docuseal env vars', { DOCUSEAL_API_URL, DOCUSEAL_API_KEY: !!DOCUSEAL_API_KEY, TEMPLATE_ID_1, TEMPLATE_ID_2 })
    return NextResponse.json({ error: 'Docuseal is not configured on this server' }, { status: 500 })
  }

  const body = await req.json()
  const {
    // Mode A: existing loan
    loan_id,
    // Mode B: existing contact, no loan yet
    contact_id,
    property_address: inputAddress,
    // Mode C: brand new — create contact + loan
    first_name,
    last_name,
    email: inputEmail,
    // All modes
    broker_fee,
    borrower_2_name,
    borrower_2_email,
  } = body

  if (!broker_fee) return NextResponse.json({ error: 'broker_fee required' }, { status: 400 })

  const supabase = createServiceClient()
  let borrowerName: string
  let borrowerEmail: string
  let propertyAddress: string
  let resolvedLoanId: string | null = loan_id ?? null

  // ── Mode A: pull everything from existing loan ─────────────────────
  if (loan_id) {
    const { data: loan } = await supabase
      .from('loans')
      .select('contact_id, address_street, address_city, address_state, address_zip')
      .eq('id', loan_id)
      .single()
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name, email')
      .eq('id', loan.contact_id)
      .single()
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    if (!contact.email) return NextResponse.json({ error: 'Borrower has no email address on file. Add one to their contact record first.' }, { status: 400 })

    borrowerName = `${contact.first_name} ${contact.last_name}`
    borrowerEmail = contact.email
    propertyAddress = [
      loan.address_street,
      loan.address_city,
      loan.address_state,
      loan.address_zip,
    ].filter(Boolean).join(', ')

    if (!propertyAddress) return NextResponse.json({ error: 'This loan has no property address on file.' }, { status: 400 })

  // ── Mode B: existing contact, create loan ──────────────────────────
  } else if (contact_id) {
    if (!inputAddress) return NextResponse.json({ error: 'property_address required' }, { status: 400 })

    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name, email')
      .eq('id', contact_id)
      .single()
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    borrowerName = `${contact.first_name} ${contact.last_name}`
    borrowerEmail = contact.email
    propertyAddress = inputAddress

    const { data: newLoan, error: loanErr } = await supabase
      .from('loans')
      .insert({ contact_id, address_street: inputAddress, stage: 'lead' })
      .select('id')
      .single()
    if (loanErr) return NextResponse.json({ error: loanErr.message }, { status: 500 })
    resolvedLoanId = newLoan.id

  // ── Mode C: new contact + new loan ────────────────────────────────
  } else if (first_name && last_name && inputEmail && inputAddress) {
    const { data: newContact, error: contactErr } = await supabase
      .from('contacts')
      .insert({ first_name, last_name, email: inputEmail, source: 'manual' })
      .select('id')
      .single()
    if (contactErr) return NextResponse.json({ error: contactErr.message }, { status: 500 })

    const { data: newLoan, error: loanErr } = await supabase
      .from('loans')
      .insert({ contact_id: newContact.id, address_street: inputAddress, stage: 'lead' })
      .select('id')
      .single()
    if (loanErr) return NextResponse.json({ error: loanErr.message }, { status: 500 })

    borrowerName = `${first_name} ${last_name}`
    borrowerEmail = inputEmail
    propertyAddress = inputAddress
    resolvedLoanId = newLoan.id

  } else {
    return NextResponse.json(
      { error: 'Provide loan_id, contact_id, or first_name/last_name/email/property_address' },
      { status: 400 }
    )
  }

  const twoBorrowers = !!(borrower_2_name && borrower_2_email)
  const templateId = twoBorrowers ? TEMPLATE_ID_2 : TEMPLATE_ID_1

  const prefilledFields = [
    { name: twoBorrowers ? 'borrower_1_name' : 'borrower_name', default_value: borrowerName, readonly: true },
    { name: 'property_address', default_value: propertyAddress, readonly: true },
    { name: 'broker_fee', default_value: broker_fee, readonly: true },
  ]

  const submitters = twoBorrowers
    ? [
        { role: 'First Party',  name: borrowerName,      email: borrowerEmail,      fields: prefilledFields },
        { role: 'Second Party', name: borrower_2_name,   email: borrower_2_email,
          fields: [{ name: 'borrower_2_name', default_value: borrower_2_name, readonly: true }] },
        { role: 'Third Party',  name: SAK_NAME,          email: SAK_EMAIL },
      ]
    : [
        { role: 'First Party',  name: borrowerName, email: borrowerEmail, fields: prefilledFields },
        { role: 'Second Party', name: SAK_NAME,     email: SAK_EMAIL },
      ]

  const res = await fetch(`${DOCUSEAL_API_URL}/submissions`, {
    method: 'POST',
    headers: { 'X-Auth-Token': DOCUSEAL_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_id: Number(templateId),
      send_email: true,
      submitters,
      metadata: resolvedLoanId ? { loan_id: resolvedLoanId } : {},
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('Docuseal error:', data)
    return NextResponse.json({ error: data.error ?? 'Docuseal request failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    loan_id: resolvedLoanId,
    submission_id: data[0]?.submission_id ?? data.id,
  })
}
