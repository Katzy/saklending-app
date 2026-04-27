import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/tasks?loan_id= — list tasks (optionally filtered by loan)
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const loan_id = new URL(req.url).searchParams.get('loan_id')

  let query = supabase
    .from('tasks')
    .select('id, title, notes, due_date, loan_id, completed, completed_at, created_at, loans(address_street, address_city, address_state)')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (loan_id) query = query.eq('loan_id', loan_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/tasks — create a task
export async function POST(req: NextRequest) {
  const { title, notes, due_date, loan_id } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({ title: title.trim(), notes: notes || null, due_date: due_date || null, loan_id: loan_id || null })
    .select('id, title, notes, due_date, loan_id, completed, completed_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
