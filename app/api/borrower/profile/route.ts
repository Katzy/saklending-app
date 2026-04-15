import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getBorrowerContact } from '@/lib/auth/getBorrowerContact'

export async function GET() {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, entity_name, credit_score_estimate, can_provide_tax_returns, sponsor_bio')
    .eq('id', auth.contact_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // Only allow borrower to update safe fields
  const allowed = ['first_name', 'last_name', 'phone', 'entity_name']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const supabase = createServiceClient()
  const { error } = await supabase.from('contacts').update(update).eq('id', auth.contact_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
