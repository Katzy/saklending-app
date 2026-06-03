import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
})

// POST /api/borrower/first-login
// Called once on borrower portal load. Sends admin notification on first login.
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  // If already notified, nothing to do
  if (user.app_metadata?.first_login_notified) {
    return NextResponse.json({ ok: true, alreadyNotified: true })
  }

  const service = createServiceClient()

  // Mark as notified using service role (only admin can write app_metadata)
  await service.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, first_login_notified: true },
  })

  // Fetch the contact name if available
  const contactId = user.user_metadata?.contact_id as string | undefined
  let displayName = user.email ?? 'A borrower'
  if (contactId) {
    const { data: contact } = await service
      .from('contacts')
      .select('first_name, last_name, entity_name')
      .eq('id', contactId)
      .single()
    if (contact) {
      displayName = `${contact.first_name} ${contact.last_name}`
      if (contact.entity_name) displayName += ` (${contact.entity_name})`
    }
  }

  if (process.env.RESEND_API_KEY) {
    await transporter.sendMail({
      from: '"SAK Lending" <support@saklending.com>',
      to: 'scott@saklending.com',
      subject: `🔑 First login — ${displayName}`,
      text: [
        `${displayName} just logged into the borrower portal for the first time.`,
        ``,
        `Email: ${user.email}`,
        `Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`,
        ``,
        `Log in to your dashboard to follow up.`,
      ].join('\n'),
    })
  }

  return NextResponse.json({ ok: true })
}
