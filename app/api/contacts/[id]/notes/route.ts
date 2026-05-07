import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/contacts/[id]/notes
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('contact_notes')
    .select('id, created_at, content')
    .eq('contact_id', params.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/contacts/[id]/notes
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('contact_notes')
    .insert({ contact_id: params.id, content: content.trim() })
    .select('id, created_at, content')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
