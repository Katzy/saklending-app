import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// PATCH /api/bank-links/[id]/revoke
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('bank_share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
