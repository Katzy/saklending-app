import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

function getTransporter() {
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
    })
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  })
}

function fmt$(v: unknown) {
  const n = Number(v)
  if (!n) return null
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// POST /api/bank-links — create a bank share link for a loan
export async function POST(req: NextRequest) {
  const { loan_id, password, label, expires_days, recipient_email, recipient_name, app_url } = await req.json()
  if (!loan_id || !password) {
    return NextResponse.json({ error: 'loan_id and password required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const token = crypto.randomBytes(24).toString('hex')
  const password_hash = await bcrypt.hash(password, 10)
  const expires_at = new Date(
    Date.now() + (Number(expires_days) || 30) * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data, error } = await supabase
    .from('bank_share_links')
    .insert({ loan_id, token, password_hash, expires_at, label: label || null })
    .select('id, token, expires_at, label')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email if recipient provided
  let email_sent = false
  if (recipient_email) {
    const portalUrl = `${app_url || process.env.NEXT_PUBLIC_APP_URL}/loan-file/${token}`
    const expiryDate = new Date(expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    // Fetch loan details for the overview
    const { data: loan } = await supabase
      .from('loans')
      .select('loan_amount, loan_program, loan_purpose, property_type, address_street, address_city, address_state, address_zip, purchase_price, arv')
      .eq('id', loan_id)
      .single()

    const greeting = recipient_name ? `Hello ${recipient_name},` : 'Hello,'
    const lenderLabel = label || recipient_name || 'Lender'

    const propertyAddress = loan
      ? [loan.address_street, loan.address_city, loan.address_state, loan.address_zip].filter(Boolean).join(', ')
      : null

    const overviewRows = loan ? [
      loan.loan_amount     ? `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;">Loan Amount</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${fmt$(loan.loan_amount)}</td></tr>` : '',
      loan.loan_program    ? `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;">Program</td><td style="padding:6px 0;font-size:13px;color:#111827;text-transform:capitalize;">${loan.loan_program.replace('_', ' ')}</td></tr>` : '',
      loan.loan_purpose    ? `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;">Purpose</td><td style="padding:6px 0;font-size:13px;color:#111827;text-transform:capitalize;">${loan.loan_purpose}</td></tr>` : '',
      loan.property_type   ? `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;">Property Type</td><td style="padding:6px 0;font-size:13px;color:#111827;">${loan.property_type}</td></tr>` : '',
      loan.purchase_price  ? `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;">Purchase Price</td><td style="padding:6px 0;font-size:13px;color:#111827;">${fmt$(loan.purchase_price)}</td></tr>` : '',
      loan.arv             ? `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;">ARV</td><td style="padding:6px 0;font-size:13px;color:#111827;">${fmt$(loan.arv)}</td></tr>` : '',
    ].filter(Boolean).join('') : ''

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;">
        <div style="background:#003087;padding:20px 28px;border-radius:8px 8px 0 0;">
          <p style="color:white;font-size:18px;font-weight:700;margin:0;">SAK Lending — Loan Package</p>
          <p style="color:#93c5fd;font-size:12px;margin:4px 0 0;">Confidential — for lender review only</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:28px;">
          <p style="font-size:14px;margin:0 0 16px;">${greeting}</p>
          <p style="font-size:14px;margin:0 0 20px;color:#374151;">
            Please find a loan package prepared for your review. Use the link and password below to access the full deal summary and documents.
          </p>

          ${propertyAddress ? `<p style="font-size:13px;color:#6b7280;margin:0 0 16px;">📍 ${propertyAddress}</p>` : ''}

          ${overviewRows ? `
          <table style="border-collapse:collapse;margin-bottom:24px;width:100%;">
            ${overviewRows}
          </table>` : ''}

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
            <p style="font-size:12px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:.05em;">Portal Password</p>
            <p style="font-size:16px;font-weight:700;color:#111827;margin:0;font-family:monospace;">${password}</p>
          </div>

          <a href="${portalUrl}" style="display:inline-block;background:#003087;color:white;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;margin-bottom:20px;">
            View Loan Package →
          </a>

          <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">
            This link expires on ${expiryDate}. If you have any questions, reply to this email or contact SAK Lending directly.
          </p>
        </div>
        <p style="font-size:11px;color:#d1d5db;text-align:center;margin-top:16px;">
          Prepared by SAK Lending · Confidential
        </p>
      </div>
    `

    try {
      await getTransporter().sendMail({
        from: '"SAK Lending" <support@saklending.com>',
        to: recipient_email,
        subject: `Loan Package${propertyAddress ? ` — ${propertyAddress}` : ''}`,
        html,
      })
      email_sent = true
    } catch (err) {
      console.error('Bank link email failed:', err)
    }
  }

  return NextResponse.json({ ...data, email_sent })
}

// GET /api/bank-links?loan_id= — list links for a loan
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const loan_id = searchParams.get('loan_id')
  if (!loan_id) return NextResponse.json({ error: 'loan_id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bank_share_links')
    .select('id, token, label, expires_at, revoked_at, created_at')
    .eq('loan_id', loan_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
