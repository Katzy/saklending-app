import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, message } = body

  if (!name?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Name and message are required' }, { status: 400 })
  }

  // Save to Supabase
  const supabase = createServiceClient()
  const nameParts = name.trim().split(' ')
  const first_name = nameParts[0]
  const last_name = nameParts.slice(1).join(' ') || ''

  await supabase.from('contacts').insert({
    first_name,
    last_name,
    notes: message.trim(),
    source: 'contact_form',
  })

  // Send email notification
  if (process.env.RESEND_API_KEY) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
    })
    await transporter.sendMail({
      from: '"SAK Lending" <support@saklending.com>',
      to: 'scott@saklending.com',
      subject: `Contact Form: ${name}`,
      text: `Name: ${name}\n\nMessage:\n${message}`,
    })
  }

  return NextResponse.json({ message: 'Message sent successfully!' })
}
