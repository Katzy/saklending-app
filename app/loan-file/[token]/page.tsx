'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

type Contact = {
  first_name: string; last_name: string; email: string; phone: string | null
  entity_name: string | null; sponsor_bio: string | null; credit_score_estimate: number | null
}
type Document = { id: string; doc_type: string; file_name: string; file_size: number | null; url: string | null }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loan = Record<string, any>

type Package = { loan: Loan; contact: Contact | null; documents: Document[] }

function fmt$(v: unknown) {
  const n = Number(v); if (!n) return '—'
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
function fmtPct(num: unknown, den: unknown) {
  const n = Number(num), d = Number(den)
  if (!n || !d) return null
  return ((n / d) * 100).toFixed(1) + '%'
}
function calcNOI(loan: Loan) {
  const gross = Number(loan.gross_annual_income) || 0
  const vac = Number(loan.vacancy_factor_pct) || 5
  const exp = Number(loan.annual_operating_expenses) || 0
  if (!gross) return null
  return gross * (1 - vac / 100) - exp
}

export default function BankPortalPage() {
  const { token } = useParams<{ token: string }>()
  const [password, setPassword] = useState('')
  const [phase, setPhase] = useState<'gate' | 'loading' | 'package' | 'error'>('gate')
  const [decision, setDecision] = useState<'interested' | 'pass' | null>(null)
  const [decisionSending, setDecisionSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [pkg, setPkg] = useState<Package | null>(null)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setPhase('loading')
    const res = await fetch(`/api/bank-links/${token}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrorMsg(json.error ?? 'Access denied')
      setPhase('error')
      return
    }
    setPkg(json)
    setPhase('package')
  }

  // ── Password gate ──────────────────────────────────────────────
  if (phase === 'gate' || phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <Image src="/logo.jpg" alt="SAK Lending" width={120} height={44} className="h-10 w-auto mx-auto mb-4" />
            <h1 className="text-lg font-bold text-gray-900">Loan Package</h1>
            <p className="text-sm text-gray-500 mt-1">Enter the password to access this loan file.</p>
          </div>
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoFocus
              className="w-full border border-gray-300 rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            />
            <button
              type="submit"
              disabled={phase === 'loading'}
              className="w-full bg-[#003087] text-white py-2.5 rounded font-medium text-sm hover:bg-[#002070] disabled:opacity-50"
            >
              {phase === 'loading' ? 'Verifying...' : 'Access Loan File'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm text-center">
          <Image src="/logo.jpg" alt="SAK Lending" width={120} height={44} className="h-10 w-auto mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">{errorMsg}</p>
          <button
            onClick={() => { setPhase('gate'); setErrorMsg(''); setPassword('') }}
            className="text-sm text-[#003087] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ── Loan package ───────────────────────────────────────────────
  async function handleDecision(action: 'interested' | 'pass') {
    setDecisionSending(true)
    await fetch(`/api/bank-links/${token}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setDecision(action)
    setDecisionSending(false)
  }

  if (!pkg) return null
  const { loan, contact, documents } = pkg
  const noi = calcNOI(loan)
  const ltv = fmtPct(loan.loan_amount, loan.purchase_price)
  const arvltv = fmtPct(loan.loan_amount, loan.arv)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#003087] text-white py-4 px-6 flex items-center justify-between">
        <Image src="/logo.jpg" alt="SAK Lending" width={120} height={44} className="h-9 w-auto brightness-0 invert" />
        <div className="text-right text-sm">
          <p className="font-medium">Loan Package — Confidential</p>
          <p className="text-blue-300 text-xs">For lender review only</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

        {/* Decision bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Ready to make a decision?</p>
            <p className="text-xs text-gray-500 mt-0.5">Let SAK Lending know if you want to move forward or pass on this deal.</p>
          </div>
          {decision ? (
            <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${decision === 'interested' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
              {decision === 'interested' ? '✅ We notified SAK Lending you\'re interested.' : '❌ We notified SAK Lending you\'re passing.'}
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleDecision('interested')}
                disabled={decisionSending}
                className="bg-green-600 text-white px-5 py-2 rounded font-medium text-sm hover:bg-green-700 disabled:opacity-50 transition"
              >
                Interested
              </button>
              <button
                onClick={() => handleDecision('pass')}
                disabled={decisionSending}
                className="border border-gray-300 text-gray-700 px-5 py-2 rounded font-medium text-sm hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Pass
              </button>
            </div>
          )}
        </div>

        {/* Borrower — contact info redacted, underwriting info shown */}
        {contact && (
          <Section title="Sponsor">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {contact.entity_name && <Row label="Entity" value={contact.entity_name} />}
              {contact.credit_score_estimate && <Row label="Credit Score Est." value={String(contact.credit_score_estimate)} />}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Contact</p>
                <p className="text-sm text-gray-400 italic">Available through SAK Lending</p>
              </div>
            </div>
            {contact.sponsor_bio && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sponsor Bio</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.sponsor_bio}</p>
              </div>
            )}
          </Section>
        )}

        {/* Loan Request */}
        <Section title="Loan Request">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Row label="Loan Amount" value={fmt$(loan.loan_amount)} />
            <Row label="Purpose" value={loan.loan_purpose} cap />
            <Row label="Program" value={loan.loan_program?.replace('_', ' ')} cap />
            <Row label="Financing" value={loan.financing_preference} cap />
            <Row label="Property Type" value={loan.property_type} />
            <Row label="State" value={loan.state} />
          </div>
          {loan.comments && <NoteBlock label="Comments" text={loan.comments} />}
        </Section>

        {/* Property */}
        <Section title="Property Details">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {(loan.address_street || loan.address_city) && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Address</p>
                <p className="text-gray-800">{[loan.address_street, loan.address_city, loan.address_state, loan.address_zip].filter(Boolean).join(', ')}</p>
              </div>
            )}
            <Row label="Purchase Price" value={fmt$(loan.purchase_price)} />
            <Row label="ARV" value={fmt$(loan.arv)} />
            <Row label="Property Use" value={loan.property_use} cap />
            <Row label="Total Units" value={loan.total_units} />
            <Row label="Building Sq Ft" value={loan.building_sqft ? Number(loan.building_sqft).toLocaleString() + ' sf' : null} />
            <Row label="Year Built" value={loan.year_built} />
            <Row label="Occupancy" value={loan.occupancy_pct ? loan.occupancy_pct + '%' : null} />
            <Row label="Annual Taxes" value={fmt$(loan.annual_taxes)} />
            <Row label="Annual Insurance" value={fmt$(loan.annual_insurance)} />
          </div>
        </Section>

        {/* Income & Expenses */}
        {loan.gross_annual_income && (
          <Section title="Income & Expenses">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Row label="Gross Annual Income" value={fmt$(loan.gross_annual_income)} />
              <Row label="Vacancy Factor" value={loan.vacancy_factor_pct ? loan.vacancy_factor_pct + '%' : '5%'} />
              <Row label="Annual Expenses" value={fmt$(loan.annual_operating_expenses)} />
              {noi !== null && <Row label="NOI (calculated)" value={fmt$(noi)} highlight />}
            </div>
          </Section>
        )}

        {/* Key Metrics */}
        {(ltv || arvltv || loan.exit_strategy) && (
          <Section title="Key Metrics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ltv && <Metric label="LTV" value={ltv} />}
              {arvltv && <Metric label="ARV-LTV" value={arvltv} />}
              {loan.nnn_leases && <Metric label="NNN Leases" value="Yes" />}
            </div>
            {loan.exit_strategy && <NoteBlock label="Exit Strategy" text={loan.exit_strategy} />}
          </Section>
        )}

        {/* Borrower Financials */}
        {loan.total_re_value && (
          <Section title="Borrower Financials">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Row label="Properties Owned" value={loan.properties_owned} />
              <Row label="Total RE Value" value={fmt$(loan.total_re_value)} />
              <Row label="Cash Reserves" value={fmt$(loan.cash_reserves)} />
              <Row label="Investment Assets" value={fmt$(loan.investment_assets)} />
              <Row label="Total Mortgage Debt" value={fmt$(loan.total_mortgage_debt)} />
            </div>
          </Section>
        )}

        {/* Loan Summary */}
        {loan.full_loan_summary && (
          <Section title="Loan Summary">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{loan.full_loan_summary}</p>
          </Section>
        )}

        {/* Documents */}
        <Section title="Documents">
          {documents.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{doc.file_name}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{doc.doc_type?.replace('_', ' ')}</p>
                  </div>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-medium text-[#003087] border border-[#003087] px-3 py-1.5 rounded hover:bg-[#003087] hover:text-white transition">
                      Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        <p className="text-xs text-gray-400 text-center pb-4">
          Confidential — prepared by SAK Lending · {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, value, cap, highlight }: { label: string; value: unknown; cap?: boolean; highlight?: boolean }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? 'font-semibold text-[#003087]' : 'text-gray-800'} ${cap ? 'capitalize' : ''}`}>
        {String(value)}
      </p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-blue-50 rounded-lg p-4 text-center">
      <p className="text-2xl font-bold text-[#003087]">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function NoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>
    </div>
  )
}
