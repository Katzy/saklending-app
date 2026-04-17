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

  // Temp debug: also query the specific loan directly
  const { data: debugRow } = await supabase
    .from('loans')
    .select('id, property_type, stage, loan_amount')
    .eq('id', '3e454fcd-8dc6-4617-96ce-77a20e690122')
    .single()

  return NextResponse.json({ data: data ?? [], debug: debugRow }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
