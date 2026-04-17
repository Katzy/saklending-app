export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/closed-loans — public endpoint for homepage showcase
// Returns top 6 funded loans over $250K by loan amount, displayed in funded order
export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('loans')
    .select('id, loan_amount, loan_purpose, loan_program, property_type, address_street, address_city, address_state, address_zip, property_image_path, stage_updated_at')
    .eq('stage', 'funded')
    .gte('loan_amount', 250000)
    .order('loan_amount', { ascending: false })
    .limit(6)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort the top-6-by-amount by funded date for display order
  const sorted = (data ?? []).sort((a, b) =>
    new Date(b.stage_updated_at ?? 0).getTime() - new Date(a.stage_updated_at ?? 0).getTime()
  )

  // Generate signed URLs for uploaded images
  const loans = await Promise.all(
    sorted.map(async (loan) => {
      let image_url: string | null = null
      if (loan.property_image_path) {
        const { data: signed } = await supabase.storage
          .from('loan-documents')
          .createSignedUrl(loan.property_image_path, 60 * 60 * 24)
        image_url = signed?.signedUrl ?? null
      }
      return { ...loan, image_url }
    })
  )

  return NextResponse.json(loans, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
