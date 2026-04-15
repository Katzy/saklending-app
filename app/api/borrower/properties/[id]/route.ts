import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getBorrowerContact } from '@/lib/auth/getBorrowerContact'

async function verifyOwnership(supabase: ReturnType<typeof createServiceClient>, propertyId: string, contactId: string) {
  const { data } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('contact_id', contactId)
    .single()
  return !!data
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  if (!await verifyOwnership(supabase, params.id, auth.contact_id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { id: _id, contact_id: _cid, created_at: _ca, ...updates } = body

  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getBorrowerContact()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  if (!await verifyOwnership(supabase, params.id, auth.contact_id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Soft delete — preserve record for admin audit trail
  const { error } = await supabase
    .from('properties')
    .update({ deleted_at: new Date().toISOString(), deleted_by: 'borrower' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
