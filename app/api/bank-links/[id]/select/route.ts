import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// PATCH /api/bank-links/[id]/select  ([id] = bank_share_links.id, not token)
// Body: { selected: boolean }
// When selecting a lender, deselects all others on the same loan first.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { selected } = await req.json()
  const supabase = createServiceClient()

  const { data: link } = await supabase
    .from('bank_share_links')
    .select('id, loan_id')
    .eq('id', params.id)
    .single()

  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (selected) {
    // Deselect all links on this loan, then select the target
    await supabase.from('bank_share_links').update({ is_selected: false }).eq('loan_id', link.loan_id)
  }

  await supabase.from('bank_share_links').update({ is_selected: selected }).eq('id', params.id)

  return NextResponse.json({ ok: true })
}
