import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/closed-loans — public endpoint for homepage showcase
// Returns funded loans where show_on_homepage = true, with signed image URLs
export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('loans')
    .select('id, loan_amount, loan_purpose, loan_program, property_type, address_city, address_state, property_image_path')
    .eq('show_on_homepage', true)
    .eq('stage', 'funded')
    .order('stage_updated_at', { ascending: false })
    .limit(12)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URLs for images
  const loans = await Promise.all(
    (data ?? []).map(async (loan) => {
      let image_url: string | null = null
      if (loan.property_image_path) {
        const { data: signed } = await supabase.storage
          .from('loan-documents')
          .createSignedUrl(loan.property_image_path, 60 * 60 * 24) // 24hr TTL
        image_url = signed?.signedUrl ?? null
      }
      return { ...loan, image_url }
    })
  )

  return NextResponse.json(loans)
}
