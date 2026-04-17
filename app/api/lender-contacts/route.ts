import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('lender_contacts')
    .insert({
      lender_id: body.lender_id,
      name: body.name || null,
      email: body.email || null,
      phone: body.phone || null,
      title: body.title || null,
      notes: body.notes || null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
