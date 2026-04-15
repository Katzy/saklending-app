import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
})

export async function POST(req: NextRequest) {
  try {
    const { contact_id, email } = await req.json()
    if (!contact_id || !email) {
      return NextResponse.json({ error: 'contact_id and email required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    let userId: string

    // Try new-user invite first
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/borrower/profile`,
      data: { contact_id, role: 'borrower' },
    })

    if (inviteError) {
      if (!inviteError.message.toLowerCase().includes('already')) {
        return NextResponse.json({ error: inviteError.message }, { status: 500 })
      }

      // User already exists — generate a magic login link instead
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/borrower/profile` },
      })

      if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

      userId = linkData.user.id
      const magicLink = linkData.properties.action_link

      // Update their metadata so getBorrowerContact can find them
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { contact_id, role: 'borrower' },
      })

      // Send the magic link via email (non-fatal if email fails)
      let emailSent = false
      try {
        await transporter.sendMail({
          from: `"SAK Lending" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Your SAK Lending Portal Link',
          html: `
            <p>Hello,</p>
            <p>Click the link below to access your SAK Lending borrower portal:</p>
            <p><a href="${magicLink}" style="background:#003087;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Access My Portal</a></p>
            <p>This link expires in 24 hours.</p>
            <p>SAK Lending</p>
          `,
        })
        emailSent = true
      } catch (emailErr) {
        console.error('Email send failed:', emailErr)
      }

      // Upsert user_profiles record
      const { error: profileError } = await supabase.from('user_profiles').upsert(
        { id: userId, contact_id, role: 'borrower' },
        { onConflict: 'id' }
      )
      if (profileError) console.error('user_profiles upsert failed:', profileError.message)

      return NextResponse.json({
        ok: true,
        existing_user: true,
        email_sent: emailSent,
        // Return link so dashboard can display it if email failed
        magic_link: emailSent ? undefined : magicLink,
      })
    } else {
      userId = inviteData.user.id
    }

    // Upsert user_profiles record (new user path)
    const { error: profileError } = await supabase.from('user_profiles').upsert(
      { id: userId, contact_id, role: 'borrower' },
      { onConflict: 'id' }
    )

    if (profileError) {
      console.error('user_profiles upsert failed:', profileError.message)
    }

    return NextResponse.json({ ok: true, existing_user: false, email_sent: true })
  } catch (err) {
    console.error('Invite error:', err)
    return NextResponse.json({ error: 'Invite failed. Check server logs.' }, { status: 500 })
  }
}
