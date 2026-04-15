import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

// POST /api/bank-links/[id]/verify  (params.id holds the token value)
// Verifies password and returns full loan package on success
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: 'password required' }, { status: 400 })

  const supabase = createServiceClient()

  // Find the link by token
  const { data: link, error: linkError } = await supabase
    .from('bank_share_links')
    .select('id, loan_id, password_hash, expires_at, revoked_at')
    .eq('token', params.id)
    .single()

  if (linkError || !link) return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  if (link.revoked_at)   return NextResponse.json({ error: 'This link has been revoked' }, { status: 403 })
  if (new Date(link.expires_at) < new Date()) return NextResponse.json({ error: 'This link has expired' }, { status: 403 })

  const valid = await bcrypt.compare(password, link.password_hash)
  if (!valid) return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })

  // Fetch full loan package
  const { data: loan } = await supabase
    .from('loans')
    .select('*')
    .eq('id', link.loan_id)
    .single()

  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

  // Fetch contact
  const { data: contact } = loan.contact_id
    ? await supabase.from('contacts').select('first_name, last_name, email, phone, entity_name, sponsor_bio, credit_score_estimate').eq('id', loan.contact_id).single()
    : { data: null }

  // Fetch documents
  const { data: documents } = await supabase
    .from('documents')
    .select('id, doc_type, file_name, storage_path, file_size')
    .eq('loan_id', link.loan_id)

  // Generate signed URLs for documents
  const docs = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from('loan-documents')
        .createSignedUrl(doc.storage_path, 60 * 60 * 4) // 4hr
      return { ...doc, url: signed?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ loan, contact, documents: docs })
}
