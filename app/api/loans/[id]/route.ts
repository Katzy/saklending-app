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
  return NextResponse.json({ ok: true })
}
