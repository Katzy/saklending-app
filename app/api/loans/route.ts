import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/loans?contact_id=&stage=&page=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contact_id = searchParams.get('contact_id') ?? ''
  const stage = searchParams.get('stage') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 50

  const supabase = createServiceClient()
  let query = supabase
    .from('loans')
    .select(
      'id, created_at, contact_id, property_id, loan_amount, loan_purpose, loan_program, property_type, address_street, address_city, address_state, address_zip, stage, is_dead, dead_reason, stage_updated_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (contact_id) query = query.eq('contact_id', contact_id)
  if (stage) query = query.eq('stage', stage)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize })
}

// POST /api/loans — create new loan
export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('loans')
    .insert({ ...body, stage: body.stage ?? 'lead' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
