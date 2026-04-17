import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/loans/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('loans')
    .select('*, contacts!contact_id(first_name, last_name, email, entity_name), co_borrower:contacts!co_borrower_contact_id(first_name, last_name, email, entity_name)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/loans/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const supabase = createServiceClient()

  // If stage is changing, update stage_updated_at
  const update = { ...body }
  if (body.stage) update.stage_updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('loans')
    .update(update)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // When a loan is funded, auto-create a property for the borrower if one doesn't exist
  if (body.stage === 'funded') {
    const { data: loan } = await supabase
      .from('loans')
      .select('contact_id, address_street, address_city, address_state, address_zip, property_type, loan_amount')
      .eq('id', params.id)
      .single()

    if (loan?.contact_id && loan.address_street) {
      // Check if this property already exists for this contact
      const { data: existing } = await supabase
        .from('properties')
        .select('id')
        .eq('contact_id', loan.contact_id)
        .eq('address_street', loan.address_street)
        .maybeSingle()

      if (!existing) {
        await supabase.from('properties').insert({
          contact_id: loan.contact_id,
          address_street: loan.address_street,
          address_city: loan.address_city,
          address_state: loan.address_state,
          address_zip: loan.address_zip,
          property_type: loan.property_type,
          mortgage_balance: loan.loan_amount,
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
