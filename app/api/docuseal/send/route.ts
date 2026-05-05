import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const DOCUSEAL_API_URL = process.env.DOCUSEAL_API_URL!
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!
const TEMPLATE_ID_1 = process.env.DOCUSEAL_TEMPLATE_ID_1!
const TEMPLATE_ID_2 = process.env.DOCUSEAL_TEMPLATE_ID_2!
const SAK_EMAIL = 'scottalankatz@gmail.com'
const SAK_NAME = 'Scott Katz'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    loan_id,
    broker_fee,
    // Manual overrides (ad-hoc mode, no loan_id)
    borrower_name: manualBorrowerName,
    borrower_email: manualBorrowerEmail,
    borrower_2_name,
    borrower_2_email,
    property_address: manualAddress,
  } = body

  if (!broker_fee) return NextResponse.json({ error: 'broker_fee required' }, { status: 400 })

  let borrowerName = manualBorrowerName
  let borrowerEmail = manualBorrowerEmail
  let propertyAddress = manualAddress

  // Pull from DB if loan_id provided
  if (loan_id) {
    const supabase = createServiceClient()
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

    borrowerName = `${contact.first_name} ${contact.last_name}`
    borrowerEmail = contact.email
    propertyAddress = [
      loan.address_street,
      loan.address_city,
      loan.address_state,
      loan.address_zip,
    ].filter(Boolean).join(', ')
  }

  if (!borrowerName || !borrowerEmail || !propertyAddress) {
    return NextResponse.json(
      { error: 'borrower_name, borrower_email, and property_address are required' },
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
        {
          role: 'First Party',
          name: borrowerName,
          email: borrowerEmail,
          fields: prefilledFields,
        },
        {
          role: 'Second Party',
          name: borrower_2_name,
          email: borrower_2_email,
          fields: [{ name: 'borrower_2_name', default_value: borrower_2_name, readonly: true }],
        },
        {
          role: 'Third Party',
          name: SAK_NAME,
          email: SAK_EMAIL,
        },
      ]
    : [
        {
          role: 'First Party',
          name: borrowerName,
          email: borrowerEmail,
          fields: prefilledFields,
        },
        {
          role: 'Second Party',
          name: SAK_NAME,
          email: SAK_EMAIL,
        },
      ]

  const payload = {
    template_id: Number(templateId),
    send_email: true,
    submitters,
    metadata: loan_id ? { loan_id } : {},
  }

  const res = await fetch(`${DOCUSEAL_API_URL}/submissions`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': DOCUSEAL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('Docuseal error:', data)
    return NextResponse.json({ error: data.error ?? 'Docuseal request failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, submission_id: data[0]?.submission_id ?? data.id })
}
