import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/server'

// PATCH /api/bank-links/[id]/select  ([id] = bank_share_links.id, not token)
// Body: { selected: boolean }
// When selecting a lender, deselects all others on the same loan first.
// If the newly selected lender already has uploaded docs, notifies the borrower.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { selected } = await req.json()
  const supabase = createServiceClient()

  const { data: link } = await supabase
    .from('bank_share_links')
    .select('id, loan_id, label')
    .eq('id', params.id)
    .single()

  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (selected) {
    await supabase.from('bank_share_links').update({ is_selected: false }).eq('loan_id', link.loan_id)
  }

  await supabase.from('bank_share_links').update({ is_selected: selected }).eq('id', params.id)

  // If selecting and lender already has uploaded docs, notify the borrower
  if (selected && process.env.RESEND_API_KEY) {
    const { count } = await supabase
      .from('lender_documents')
      .select('id', { count: 'exact', head: true })
      .eq('bank_link_id', params.id)

    if (count && count > 0) {
      const { data: loan } = await supabase
        .from('loans')
        .select('address_street, address_city, address_state, contact_id')
        .eq('id', link.loan_id)
        .single()

      if (loan?.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('first_name, email')
          .eq('id', loan.contact_id)
          .single()

        if (contact?.email) {
          const addressLine = [loan.address_street, loan.address_city, loan.address_state].filter(Boolean).join(', ') || 'your loan'
          const transporter = nodemailer.createTransport({
            host: 'smtp.resend.com', port: 465, secure: true,
            auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
          })
          await transporter.sendMail({
            from: '"SAK Lending" <support@saklending.com>',
            to: contact.email,
            subject: `Documents available for your loan — ${addressLine}`,
            text: [
              `Hi ${contact.first_name},`,
              ``,
              `There ${count === 1 ? 'is a document' : `are ${count} documents`} available for you to review in your loan file at ${addressLine}.`,
              `Please log in to your borrower portal to view ${count === 1 ? 'it' : 'them'}.`,
              ``,
              `SAK Lending`,
            ].join('\n'),
          })
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
