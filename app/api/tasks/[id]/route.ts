import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// PATCH /api/tasks/[id] — update (title, notes, due_date, loan_id, completed)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const supabase = createServiceClient()

  const update: Record<string, unknown> = {}
  if ('title'     in body) update.title     = body.title
  if ('notes'     in body) update.notes     = body.notes
  if ('due_date'  in body) update.due_date  = body.due_date
  if ('loan_id'   in body) update.loan_id   = body.loan_id
  if ('completed' in body) {
    update.completed    = body.completed
    update.completed_at = body.completed ? new Date().toISOString() : null
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', params.id)
    .select('id, title, notes, due_date, loan_id, completed, completed_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/tasks/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('tasks').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
