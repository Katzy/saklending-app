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

const PURPOSE_LABEL: Record<string, string> = {
  purchase: 'Purchase',
  refinance: 'Refinance',
  refinance_rate_term: 'Rate & Term Refinance',
  refinance_cash_out: 'Cash-Out Refinance',
  ground_up: 'Ground Up Construction',
}

const PROGRAM_LABEL: Record<string, string> = {
  bridge: 'Short Term Bridge',
  permanent: 'Long Term Permanent',
  rehab: 'Rehab',
  ground_up: 'Ground Up Construction',
}

const DOC_LABEL: Record<string, string> = {
  pfs: 'Personal Financial Statement (PFS)',
  t12: 'T-12 Operating Statement',
  rent_roll: 'Rent Roll',
  broker_agreement: 'Broker Agreement',
  purchase_contract: 'Purchase Contract',
  appraisal: 'Appraisal',
  environmental: 'Environmental Report',
  scope_of_work: 'Scope of Work & Budget',
  tax_return: 'Tax Return',
  bank_statement: 'Bank Statement',
  other: 'Other',
}

function fmt$(v: unknown) {
  const n = Number(v); if (!n) return '—'
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
function fmt$null(v: unknown) {
  const n = Number(v); if (!n) return null
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
function calcNetWorth(loan: Loan) {
  const assets = (Number(loan.total_re_value) || 0) + (Number(loan.cash_reserves) || 0)
    + (Number(loan.investment_assets) || 0) + (Number(loan.personal_property_value) || 0)
    + (Number(loan.other_business_value) || 0)
  const liab = (Number(loan.total_mortgage_debt) || 0) + (Number(loan.credit_card_debt) || 0)
    + (Number(loan.other_loans) || 0) + (Number(loan.taxes_bills_owed) || 0)
  if (!assets && !liab) return null
  return assets - liab
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
  const netWorth = calcNetWorth(loan)

  // LTV from current property value (purchase_price); ARV-LTV from arv
  const ltv = fmtPct(loan.loan_amount, loan.purchase_price)
  const arvltv = fmtPct(loan.loan_amount, loan.arv)
  const capRate = noi && loan.purchase_price ? fmtPct(noi, loan.purchase_price) : null

  const purposeDisplay = PURPOSE_LABEL[loan.loan_purpose] ?? loan.loan_purpose?.replace(/_/g, ' ')
  const programDisplay = PROGRAM_LABEL[loan.loan_program] ?? loan.loan_program?.replace(/_/g, ' ')

  const hasAnyFinancials = loan.gross_annual_income || loan.vacancy_factor_pct || loan.annual_operating_expenses
  const hasAnyBorrowerFinancials = loan.total_re_value || loan.cash_reserves || loan.investment_assets ||
    loan.total_mortgage_debt || loan.properties_owned

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

        {/* ── Loan Snapshot ── */}
        <div className="bg-[#003087] rounded-lg p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-3">Loan Snapshot</p>
          {(loan.address_street || loan.address_city) && (
            <p className="text-lg font-bold mb-3">
              {[loan.address_street, loan.address_city, loan.address_state, loan.address_zip].filter(Boolean).join(', ')}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SnapStat label="Loan Amount" value={fmt$(loan.loan_amount)} />
            <SnapStat label="Purpose" value={purposeDisplay} />
            <SnapStat label="Program" value={programDisplay} />
            <SnapStat label="Property Type" value={loan.property_type} />
          </div>
        </div>

        {/* Key Metrics */}
        {(ltv || arvltv || capRate || noi) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ltv && <MetricCard label="LTV" value={ltv} />}
            {arvltv && <MetricCard label="ARV-LTV" value={arvltv} />}
            {capRate && <MetricCard label="Cap Rate" value={capRate} />}
            {noi && <MetricCard label="NOI" value={fmt$(noi)} />}
          </div>
        )}

        {/* Sponsor */}
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
            <Row label="Purpose" value={purposeDisplay} />
            <Row label="Program" value={programDisplay} />
            {loan.loan_term_years && <Row label="Term" value={`${loan.loan_term_years}yr`} />}
            {loan.interest_rate && <Row label="Rate Requested" value={`${loan.interest_rate}%`} />}
            {loan.amortization_years && <Row label="Amortization" value={`${loan.amortization_years}yr`} />}
            {loan.interest_only && <Row label="Interest Only" value="Yes" />}
            {loan.purchase_price && <Row label="Current Property Value" value={fmt$(loan.purchase_price)} />}
            {ltv && <Row label="LTV" value={ltv} highlight />}
            {arvltv && <Row label="ARV-LTV" value={arvltv} highlight />}
          </div>
          {loan.comments && <NoteBlock label="Comments" text={loan.comments} />}
          {loan.full_loan_summary && <NoteBlock label="Loan Summary" text={loan.full_loan_summary} />}
        </Section>

        {/* Property Details */}
        <Section title="Property Details">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {(loan.address_street || loan.address_city) && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Address</p>
                <p className="text-gray-800">{[loan.address_street, loan.address_city, loan.address_state, loan.address_zip].filter(Boolean).join(', ')}</p>
              </div>
            )}
            <Row label="ARV" value={fmt$null(loan.arv)} />
            <Row label="Property Use" value={loan.property_use} cap />
            <Row label="Total Units" value={loan.total_units} />
            <Row label="Building Sq Ft" value={loan.building_sqft ? Number(loan.building_sqft).toLocaleString() + ' sf' : null} />
            <Row label="Year Built" value={loan.year_built} />
            <Row label="Occupancy" value={loan.occupancy_pct ? loan.occupancy_pct + '%' : null} />
            <Row label="Annual Taxes" value={fmt$null(loan.annual_taxes)} />
            <Row label="Annual Insurance" value={fmt$null(loan.annual_insurance)} />
            {loan.nnn_leases && <Row label="NNN Leases" value="Yes" />}
          </div>
          {loan.exit_strategy && <NoteBlock label="Exit Strategy" text={loan.exit_strategy} />}
        </Section>

        {/* Income & Expenses */}
        <Section title="Income & Expenses">
          {hasAnyFinancials ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Row label="Income Type" value={loan.income_actual_or_proforma} cap />
              <Row label="Gross Annual Income" value={fmt$null(loan.gross_annual_income)} />
              <Row label="Vacancy Factor" value={loan.vacancy_factor_pct ? loan.vacancy_factor_pct + '%' : null} />
              <Row label="Annual Expenses" value={fmt$null(loan.annual_operating_expenses)} />
              {noi !== null && <Row label="NOI (calculated)" value={fmt$(noi)} highlight />}
              {capRate && <Row label="Cap Rate (calculated)" value={capRate} highlight />}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Operating income data will be provided with the T-12 and Rent Roll.</p>
          )}
        </Section>

        {/* Borrower Financials */}
        <Section title="Borrower Financials">
          {hasAnyBorrowerFinancials ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Row label="Properties Owned" value={loan.properties_owned} />
              <Row label="Total RE Value" value={fmt$null(loan.total_re_value)} />
              <Row label="Cash Reserves" value={fmt$null(loan.cash_reserves)} />
              <Row label="Investment Assets" value={fmt$null(loan.investment_assets)} />
              <Row label="Total Mortgage Debt" value={fmt$null(loan.total_mortgage_debt)} />
              {netWorth !== null && <Row label="Est. Net Worth" value={fmt$(netWorth)} highlight />}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">PFS and borrower financial details to be provided.</p>
          )}
        </Section>

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
                    <p className="text-xs text-gray-400 mt-0.5">{DOC_LABEL[doc.doc_type] ?? doc.doc_type.replace(/_/g, ' ')}</p>
                  </div>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-medium text-[#003087] border border-[#003087] px-3 py-1.5 rounded hover:bg-[#003087] hover:text-white transition flex-shrink-0 ml-4">
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

function SnapStat({ label, value }: { label: string; value: unknown }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-blue-300 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-white">{String(value)}</p>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
      <p className="text-2xl font-bold text-[#003087]">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function Row({ label, value, cap, highlight }: { label: string; value: unknown; cap?: boolean; highlight?: boolean }) {
  if (value === null || value === undefined || value === '' || value === '—') return null
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? 'font-semibold text-[#003087]' : 'text-gray-800'} ${cap ? 'capitalize' : ''}`}>
        {String(value)}
      </p>
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
