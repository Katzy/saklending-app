export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/closed-loans — public endpoint for homepage showcase
// Returns funded loans over $250K, ordered by most recently funded
export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('loans')
    .select('id, loan_amount, loan_purpose, loan_program, property_type, address_street, address_city, address_state, address_zip')
    .eq('stage', 'funded')
    .gte('loan_amount', 250000)
    .order('stage_updated_at', { ascending: false })
    .limit(12)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
