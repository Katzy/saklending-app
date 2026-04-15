import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/contacts?search=&source=&page=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const source = searchParams.get('source') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 25

  const supabase = createServiceClient()
  let query = supabase
    .from('contacts')
    .select('id, created_at, first_name, last_name, email, phone, source, entity_name', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (source) {
    query = query.eq('source', source)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize })
}

// POST /api/contacts — create manually
export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert({ ...body, source: body.source ?? 'manual' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
