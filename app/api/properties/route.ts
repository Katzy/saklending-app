import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/properties?contact_id=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contact_id = searchParams.get('contact_id')
  if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('contact_id', contact_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/properties
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('properties')
    .insert(body)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
