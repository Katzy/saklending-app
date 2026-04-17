import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  let query = supabase
    .from('lenders')
    .select('*, lender_contacts(*)')
    .order('company', { ascending: true })

  if (type) query = query.eq('lender_type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  // CSV bulk import
  if (Array.isArray(body)) {
    const rows = body.map((r) => ({
      company: r.company || r.bank || null,
      contact_name: r.contact_name || r.name || null,
      email: r.email || null,
      phone: r.phone || r.phone_number || null,
      lender_type: r.lender_type || null,
      states: r.states || [],
      loan_programs: r.loan_programs || [],
      loan_purposes: r.loan_purposes || [],
      property_types: r.property_types || [],
      preferred_property_types: r.preferred_property_types || [],
      min_loan_amount: r.min_loan_amount || null,
      max_loan_amount: r.max_loan_amount || null,
      notes: r.notes || null,
      active: true,
    }))
    const { data, error } = await supabase.from('lenders').insert(rows).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ inserted: data?.length ?? 0 })
  }

  // Single insert
  const { data, error } = await supabase
    .from('lenders')
    .insert({
      company: body.company || null,
      contact_name: body.contact_name || null,
      email: body.email || null,
      phone: body.phone || null,
      lender_type: body.lender_type || null,
      states: body.states || [],
      loan_programs: body.loan_programs || [],
      loan_purposes: body.loan_purposes || [],
      property_types: body.property_types || [],
      preferred_property_types: body.preferred_property_types || [],
      min_loan_amount: body.min_loan_amount || null,
      max_loan_amount: body.max_loan_amount || null,
      notes: body.notes || null,
      active: true,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
