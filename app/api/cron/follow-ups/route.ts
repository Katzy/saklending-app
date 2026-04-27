import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'scott@saklending.com'

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
  })
}

function fmt(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function daysOverdue(date: string) {
  const diff = Math.floor((Date.now() - new Date(date + 'T00:00:00').getTime()) / 86400000)
  return diff
}

// GET /api/cron/follow-ups — called daily by Vercel cron
export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Fetch all incomplete tasks that are either overdue/today or have no date
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, notes, due_date, loan_id, loans(address_street, address_city, address_state, loan_amount)')
    .eq('completed', false)
    .or(`due_date.lte.${today},due_date.is.null`)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!tasks || tasks.length === 0) return NextResponse.json({ sent: false, reason: 'no tasks due' })

  // Group tasks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overdue: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dueToday: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const undated: any[] = []

  for (const t of tasks) {
    if (!t.due_date) {
      undated.push(t)
    } else if (t.due_date === today) {
      dueToday.push(t)
    } else {
      overdue.push(t)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function taskRow(t: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loan = t.loans as any
    const loanLabel = loan
      ? [loan.address_street, loan.address_city, loan.address_state].filter(Boolean).join(', ')
      : null
    const overdueLabel = t.due_date && t.due_date < today
      ? ` <span style="color:#dc2626;font-size:11px;">(${daysOverdue(t.due_date)}d overdue)</span>`
      : ''
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;">
          <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${t.title}${overdueLabel}</p>
          ${t.notes ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${t.notes}</p>` : ''}
          ${loanLabel ? `<p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">📍 ${loanLabel}</p>` : ''}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;white-space:nowrap;vertical-align:top;">
          ${t.due_date ? fmt(t.due_date) : 'No date'}
        </td>
      </tr>`
  }

  function section(title: string, color: string, items: NonNullable<typeof tasks>) {
    if (!items.length) return ''
    return `
      <tr><td colspan="2" style="padding:16px 12px 6px;background:#f9fafb;">
        <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${color};">${title} (${items.length})</p>
      </td></tr>
      ${items.map(taskRow).join('')}`
  }

  const todayFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;">
      <div style="background:#003087;padding:20px 28px;border-radius:8px 8px 0 0;">
        <p style="color:white;font-size:18px;font-weight:700;margin:0;">SAK Lending — Daily Tasks</p>
        <p style="color:#93c5fd;font-size:12px;margin:4px 0 0;">${todayFormatted}</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          ${section('Overdue', '#dc2626', overdue)}
          ${section('Due Today', '#d97706', dueToday)}
          ${section('No Date — Persistent', '#6b7280', undated)}
        </table>
      </div>
      <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks" style="color:#003087;">Open Task List</a>
        · SAK Lending CRM
      </p>
    </div>`

  try {
    await getTransporter().sendMail({
      from: '"SAK Lending" <support@saklending.com>',
      to: ADMIN_EMAIL,
      subject: `Tasks — ${overdue.length + dueToday.length} due${undated.length ? `, ${undated.length} pending` : ''}`,
      html,
    })
    return NextResponse.json({ sent: true, overdue: overdue.length, today: dueToday.length, undated: undated.length })
  } catch (err) {
    console.error('Cron email failed:', err)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}
