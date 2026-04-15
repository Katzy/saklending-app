'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoanData = Record<string, any>
type Note = { id: string; created_at: string; content: string }

const STAGES = ['lead', 'qualified', 'application', 'underwriting', 'approved', 'funded']

const PROPERTY_TYPES = [
  'Multifamily', 'Mixed Use', 'Office', 'Retail', 'Industrial', 'Warehouse',
  'Self Storage', 'Hotel / Motel', 'Mobile Home Park', 'Senior Housing',
  'Student Housing', 'Single Family', 'Condo', 'Townhouse', '2-4 Unit',
  'Land', 'Gas Station', 'Car Wash', 'Auto Dealer', 'Restaurant',
  'Medical Office', 'Assisted Living', 'Church', 'Special Purpose', 'Other',
]

function fmt$(v: unknown) {
  const n = Number(v)
  if (!n) return ''
  return `$${n.toLocaleString()}`
}
function pct(num: unknown, den: unknown) {
  const n = Number(num), d = Number(den)
  if (!n || !d) return null
  return ((n / d) * 100).toFixed(1) + '%'
}
function calcNOI(loan: LoanData) {
  const gross = Number(loan.gross_annual_income) || 0
  const vac   = Number(loan.vacancy_factor_pct) || 5
  const exp   = Number(loan.annual_operating_expenses) || 0
  if (!gross) return null
  return gross * (1 - vac / 100) - exp
}
function calcNetWorth(loan: LoanData) {
  const assets = (Number(loan.total_re_value) || 0) + (Number(loan.cash_reserves) || 0)
    + (Number(loan.investment_assets) || 0) + (Number(loan.personal_property_value) || 0)
    + (Number(loan.other_business_value) || 0)
  const liab = (Number(loan.total_mortgage_debt) || 0) + (Number(loan.credit_card_debt) || 0)
    + (Number(loan.other_loans) || 0) + (Number(loan.taxes_bills_owed) || 0)
  if (!assets && !liab) return null
  return assets - liab
}
function calcTotalProject(loan: LoanData) {
  const price = Number(loan.purchase_price) || Number(loan.original_purchase_price) || 0
  const capex = Number(loan.capex_spent_to_date) || 0
  const newCosts = Number(loan.new_construction_costs) || 0
  if (!price) return null
  return price + capex + newCosts
}

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [loan, setLoan] = useState<LoanData | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [draft, setDraft] = useState<LoanData>({})
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [deadModal, setDeadModal] = useState(false)
  const [deadReason, setDeadReason] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Bank links
  type BankLink = { id: string; token: string; label: string | null; expires_at: string; revoked_at: string | null; created_at: string }
  const [bankLinks, setBankLinks] = useState<BankLink[]>([])
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkPassword, setLinkPassword] = useState('')
  const [linkDays, setLinkDays] = useState('30')
  const [linkEmail, setLinkEmail] = useState('')
  const [linkContactName, setLinkContactName] = useState('')
  const [creatingLink, setCreatingLink] = useState(false)
  const [newLinkUrl, setNewLinkUrl] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchLoan = useCallback(async () => {
    const res = await fetch(`/api/loans/${id}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setLoan(data)
    setDraft(data)
    setLoading(false)
    // If there's a showcase image, fetch signed URL
    if (data.property_image_path) {
      const imgRes = await fetch(`/api/loans/${id}/image-url`)
      if (imgRes.ok) { const j = await imgRes.json(); setImageUrl(j.url) }
    }
  }, [id, router])

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/loans/${id}/notes`)
    if (res.ok) setNotes(await res.json())
  }, [id])

  const fetchBankLinks = useCallback(async () => {
    const res = await fetch(`/api/bank-links?loan_id=${id}`)
    if (res.ok) setBankLinks(await res.json())
  }, [id])

  useEffect(() => { fetchLoan(); fetchNotes(); fetchBankLinks() }, [fetchLoan, fetchNotes, fetchBankLinks])

  async function saveLoan() {
    setSaving(true)
    setSaveError('')
    // Strip joined/read-only fields that aren't loan columns
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contacts, co_borrower, id: _id, created_at, ...payload } = draft
    const res = await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      await fetchLoan()
      setEditing(false)
    } else {
      const json = await res.json()
      setSaveError(json.error ?? 'Save failed')
    }
    setSaving(false)
  }

  async function changeStage(stage: string) {
    await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    await fetchLoan()
  }

  async function markDead() {
    await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_dead: true, dead_reason: deadReason, dead_at: new Date().toISOString() }),
    })
    setDeadModal(false)
    await fetchLoan()
  }

  async function unmarkDead() {
    await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_dead: false, dead_reason: null, dead_at: null }),
    })
    await fetchLoan()
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return
    setAddingNote(true)
    await fetch(`/api/loans/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newNote }),
    })
    setNewNote('')
    await fetchNotes()
    setAddingNote(false)
  }

  async function createBankLink() {
    if (!linkPassword) return
    setCreatingLink(true)
    const res = await fetch('/api/bank-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loan_id: id,
        password: linkPassword,
        label: linkLabel || null,
        expires_days: Number(linkDays),
        recipient_email: linkEmail || null,
        recipient_name: linkContactName || null,
        app_url: window.location.origin,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const url = `${window.location.origin}/loan-file/${data.token}`
      setNewLinkUrl(url)
      setEmailSent(!!data.email_sent)
      setLinkLabel(''); setLinkPassword(''); setLinkDays('30')
      setLinkEmail(''); setLinkContactName('')
      setShowLinkForm(false)
      await fetchBankLinks()
    }
    setCreatingLink(false)
  }

  async function revokeLink(linkId: string) {
    await fetch(`/api/bank-links/${linkId}/revoke`, { method: 'PATCH' })
    await fetchBankLinks()
    if (newLinkUrl) setNewLinkUrl(null)
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/loans/${id}/image`, { method: 'POST', body: fd })
    if (res.ok) {
      const imgRes = await fetch(`/api/loans/${id}/image-url`)
      if (imgRes.ok) { const j = await imgRes.json(); setImageUrl(j.url) }
    }
    setImageUploading(false)
  }

  async function toggleHomepage(val: boolean) {
    await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_on_homepage: val }),
    })
    await fetchLoan()
  }

  function set(key: string, val: unknown) { setDraft((d) => ({ ...d, [key]: val })) }

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>
  if (!loan) return (
    <div className="py-12 text-center">
      <p className="text-gray-500">Loan not found.</p>
      <Link href="/dashboard/pipeline" className="text-sm text-[#003087] hover:underline mt-2 block">← Back to Pipeline</Link>
    </div>
  )

  type ContactShape = { first_name: string; last_name: string; email: string; entity_name?: string }
  const contact = (loan.contacts ?? null) as ContactShape | null
  const isFunded = loan.stage === 'funded'
  const isRefinance = draft.loan_purpose === 'refinance'
  const isConstruction = ['rehab', 'ground_up'].includes(String(draft.loan_program))
  const isSFR = ['Single Family', 'Condo', 'Townhouse', '2-4 Unit'].includes(String(draft.property_type))

  const noi = calcNOI(draft)
  const netWorth = calcNetWorth(draft)
  const totalProject = calcTotalProject(draft)
  const ltv = pct(draft.loan_amount, draft.purchase_price)
  const arvltv = pct(draft.loan_amount, draft.arv)
  const ltc = pct(draft.loan_amount, totalProject)

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/dashboard/pipeline" className="text-gray-400 hover:text-gray-600 text-sm block mb-1">
            ← Pipeline
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {loan.address_city
              ? `${loan.address_city}, ${loan.address_state ?? ''}`
              : (String(loan.property_type ?? 'Loan'))}
          </h1>
          {contact && (
            <Link href={`/dashboard/contacts/${loan.contact_id}`} className="text-sm text-[#003087] hover:underline mt-0.5 block">
              {contact.first_name} {contact.last_name}
              {contact.entity_name ? ` — ${contact.entity_name}` : ''}
            </Link>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {loan.is_dead ? (
            <button onClick={unmarkDead} className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-50">
              Restore
            </button>
          ) : (
            <button onClick={() => setDeadModal(true)} className="border border-red-300 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50">
              Mark Dead
            </button>
          )}
          {!editing ? (
            <button onClick={() => setEditing(true)} className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-50">
              Edit
            </button>
          ) : (
            <>
              <button onClick={saveLoan} disabled={saving} className="bg-[#003087] text-white px-4 py-1.5 rounded text-sm hover:bg-[#002070] disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setDraft(loan); setSaveError('') }} className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-50">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      {saveError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Save error: {saveError}
        </div>
      )}

      {/* Dead banner */}
      {loan.is_dead && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Dead / Withdrawn</strong>{loan.dead_reason ? ` — ${loan.dead_reason}` : ''}
        </div>
      )}

      {/* Stage selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Stage</p>
        <div className="flex gap-2 flex-wrap">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => !editing && changeStage(s)}
              className={`px-3 py-1.5 rounded text-sm font-medium capitalize transition ${
                loan.stage === s
                  ? 'bg-[#003087] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loan Request ── */}
      <Section title="Loan Request">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <F label="Loan Amount" k="loan_amount" type="number" prefix="$" {...{ draft, set, editing }} />
          <FSelect label="Purpose" k="loan_purpose" options={['purchase','refinance']} {...{ draft, set, editing }} />
          <FSelect label="Program" k="loan_program" options={['bridge','permanent','rehab','ground_up']} {...{ draft, set, editing }} />
          <FSelect label="Financing Preference" k="financing_preference" options={['institutional','private']} {...{ draft, set, editing }} />
          <FSelect label="Property Type" k="property_type" options={PROPERTY_TYPES} {...{ draft, set, editing }} />
          <F label="State" k="state" {...{ draft, set, editing }} />
        </div>
        <div className="mt-3">
          <F label="Comments" k="comments" multiline {...{ draft, set, editing }} />
        </div>
      </Section>

      {/* ── Property Details ── */}
      <Section title="Property Details">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <F label="Street Address" k="address_street" className="col-span-2" {...{ draft, set, editing }} />
          <F label="City" k="address_city" {...{ draft, set, editing }} />
          <F label="State" k="address_state" {...{ draft, set, editing }} />
          <F label="Zip" k="address_zip" {...{ draft, set, editing }} />
          <F label="Purchase Price" k="purchase_price" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="ARV (After Repair Value)" k="arv" type="number" prefix="$" {...{ draft, set, editing }} />
          <FSelect label="Property Use" k="property_use" options={['investment','owner_user']} {...{ draft, set, editing }} />
          <F label="Total Units" k="total_units" type="number" {...{ draft, set, editing }} />
          <F label="Commercial Units" k="commercial_units" type="number" {...{ draft, set, editing }} />
          <F label="Residential Units" k="residential_units" type="number" {...{ draft, set, editing }} />
          <F label="Section 8 Units" k="section8_units" type="number" {...{ draft, set, editing }} />
          <F label="Occupied Comm. Units" k="occupied_commercial_units" type="number" {...{ draft, set, editing }} />
          <F label="Occupied Res. Units" k="occupied_residential_units" type="number" {...{ draft, set, editing }} />
          <F label="Building Sq Ft" k="building_sqft" type="number" {...{ draft, set, editing }} />
          <F label="Lot Size (SF)" k="lot_size_sf" type="number" {...{ draft, set, editing }} />
          <F label="Year Built" k="year_built" type="number" {...{ draft, set, editing }} />
          <F label="Floors" k="floors" type="number" {...{ draft, set, editing }} />
          <F label="Buildings" k="buildings" type="number" {...{ draft, set, editing }} />
          <F label="Occupancy %" k="occupancy_pct" type="number" suffix="%" {...{ draft, set, editing }} />
          <F label="Annual Taxes" k="annual_taxes" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Annual Insurance" k="annual_insurance" type="number" prefix="$" {...{ draft, set, editing }} />
        </div>
        <div className="flex gap-4 mt-3">
          <FCheck label="Deferred Maintenance" k="deferred_maintenance" {...{ draft, set, editing }} />
          <FCheck label="Code Violations" k="code_violations" {...{ draft, set, editing }} />
        </div>
      </Section>

      {/* ── SFR (conditional) ── */}
      {isSFR && (
        <Section title="SFR Details">
          <div className="grid grid-cols-3 gap-4">
            <F label="Bedrooms" k="bedrooms" type="number" {...{ draft, set, editing }} />
            <F label="Bathrooms" k="bathrooms" type="number" {...{ draft, set, editing }} />
            <F label="Garage Spaces" k="garage_spaces" type="number" {...{ draft, set, editing }} />
          </div>
        </Section>
      )}

      {/* ── Income & Expenses ── */}
      <Section title="Income & Expenses">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FSelect label="Actual or Proforma" k="income_actual_or_proforma" options={['actual','proforma']} {...{ draft, set, editing }} />
          <F label="Gross Annual Income" k="gross_annual_income" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Vacancy Factor %" k="vacancy_factor_pct" type="number" suffix="%" {...{ draft, set, editing }} />
          <F label="Annual Operating Expenses" k="annual_operating_expenses" type="number" prefix="$" {...{ draft, set, editing }} />
        </div>
        {noi !== null && (
          <CalcRow label="NOI (calculated)" value={`$${Math.round(noi).toLocaleString()}`} />
        )}
      </Section>

      {/* ── Refinance (conditional) ── */}
      {isRefinance && (
        <Section title="Refinance Details">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <F label="Date Acquired" k="date_acquired" type="date" {...{ draft, set, editing }} />
            <F label="Original Purchase Price" k="original_purchase_price" type="number" prefix="$" {...{ draft, set, editing }} />
            <F label="Existing Loan Balance" k="existing_loan_balance" type="number" prefix="$" {...{ draft, set, editing }} />
            <F label="Refinance Purpose" k="refinance_purpose" {...{ draft, set, editing }} />
            <F label="Cashout Amount" k="cashout_amount" type="number" prefix="$" {...{ draft, set, editing }} />
            <F label="Existing Lender" k="existing_lender" {...{ draft, set, editing }} />
          </div>
          <div className="flex gap-4 mt-3">
            <FCheck label="Prepayment Penalty" k="prepayment_penalty" {...{ draft, set, editing }} />
            <FCheck label="Mortgage Current" k="mortgage_current" {...{ draft, set, editing }} />
          </div>
          <div className="mt-3">
            <F label="CapEx Summary" k="capex_summary" multiline {...{ draft, set, editing }} />
          </div>
        </Section>
      )}

      {/* ── Construction / Rehab (conditional) ── */}
      {isConstruction && (
        <Section title="Construction / Rehab">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <F label="CapEx Spent to Date" k="capex_spent_to_date" type="number" prefix="$" {...{ draft, set, editing }} />
            <F label="New Construction Costs to Completion" k="new_construction_costs" type="number" prefix="$" {...{ draft, set, editing }} />
          </div>
          {totalProject !== null && (
            <>
              <CalcRow label="Total Project Cost (calculated)" value={fmt$(totalProject)} />
              {ltc && <CalcRow label="LTC (calculated)" value={ltc} />}
            </>
          )}
        </Section>
      )}

      {/* ── Borrower Financials ── */}
      <Section title="Borrower Financials">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <F label="Properties Owned" k="properties_owned" type="number" {...{ draft, set, editing }} />
          <F label="Total RE Value" k="total_re_value" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Cash Reserves" k="cash_reserves" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Investment Assets" k="investment_assets" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Personal Property Value" k="personal_property_value" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Other Business Value" k="other_business_value" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Total Mortgage Debt" k="total_mortgage_debt" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Credit Card Debt" k="credit_card_debt" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Other Loans" k="other_loans" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Taxes / Bills Owed" k="taxes_bills_owed" type="number" prefix="$" {...{ draft, set, editing }} />
        </div>
        {netWorth !== null && (
          <CalcRow label="Est. Net Worth (calculated)" value={fmt$(netWorth)} />
        )}
      </Section>

      {/* ── Calculated Ratios ── */}
      {(ltv || arvltv) && (
        <Section title="Calculated Ratios">
          <div className="flex gap-6 flex-wrap text-sm">
            {ltv && <CalcRow label="LTV" value={ltv} />}
            {arvltv && <CalcRow label="ARV-LTV" value={arvltv} />}
          </div>
        </Section>
      )}

      {/* ── Deal Summary ── */}
      <Section title="Deal Summary">
        <FCheck label="NNN Leases" k="nnn_leases" {...{ draft, set, editing }} />
        <div className="mt-3">
          <F label="Exit Strategy" k="exit_strategy" {...{ draft, set, editing }} />
        </div>
        <div className="mt-3">
          <F label="Full Loan Summary" k="full_loan_summary" multiline rows={5} {...{ draft, set, editing }} />
        </div>
      </Section>

      {/* ── Property Showcase (funded loans) ── */}
      {isFunded && (
        <Section title="Homepage Showcase">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-3">
                Upload a property photo and enable the toggle to feature this deal on the public homepage.
              </p>
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(loan.show_on_homepage)}
                    onChange={(e) => toggleHomepage(e.target.checked)}
                    className="rounded"
                  />
                  Show on homepage
                </label>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadImage} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={imageUploading}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {imageUploading ? 'Uploading...' : loan.property_image_path ? 'Replace Photo' : 'Upload Photo'}
              </button>
            </div>
            {imageUrl && (
              <div className="w-40 h-28 relative rounded overflow-hidden border border-gray-200 flex-shrink-0">
                <Image src={imageUrl} alt="Property" fill className="object-cover" unoptimized />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Notes ── */}
      <Section title="Notes">
        <form onSubmit={submitNote} className="flex gap-2 mb-4">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          />
          <button
            type="submit"
            disabled={addingNote || !newNote.trim()}
            className="bg-[#003087] text-white px-4 py-2 rounded text-sm hover:bg-[#002070] disabled:opacity-50"
          >
            Add
          </button>
        </form>
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="border-l-2 border-gray-200 pl-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Bank Links ── */}
      <Section title="Bank Portal Links">
        <p className="text-sm text-gray-500 mb-4">
          Generate a password-protected link to share this loan package with a lender. The link expires automatically.
        </p>

        {/* Newly created link — show prominently */}
        {newLinkUrl && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800 mb-2">
              {emailSent ? 'Link created and emailed to lender.' : 'Link created — copy it now:'}
            </p>
            <div className="flex items-center gap-2">
              <input readOnly value={newLinkUrl} className="flex-1 border border-green-300 rounded px-3 py-1.5 text-sm bg-white font-mono" />
              <button onClick={() => copyLink(newLinkUrl)}
                className="bg-green-700 text-white px-3 py-1.5 rounded text-sm hover:bg-green-800 whitespace-nowrap">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-green-600 mt-2">
              {emailSent
                ? 'The lender received the link and password by email. The password is not recoverable — save it separately.'
                : 'Share this link along with the password you set. The password is not recoverable — save it separately.'}
            </p>
          </div>
        )}

        {/* Existing links */}
        {bankLinks.length > 0 && (
          <div className="space-y-2 mb-4">
            {bankLinks.map((link) => {
              const isActive = !link.revoked_at && new Date(link.expires_at) > new Date()
              const linkUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/loan-file/${link.token}`
              return (
                <div key={link.id} className={`flex items-center justify-between p-3 rounded-lg border text-sm ${isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                  <div>
                    <p className="font-medium text-gray-800">{link.label || 'Unnamed link'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isActive ? `Expires ${new Date(link.expires_at).toLocaleDateString()}` : link.revoked_at ? 'Revoked' : 'Expired'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isActive && (
                      <button onClick={() => copyLink(linkUrl)}
                        className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50">
                        Copy URL
                      </button>
                    )}
                    {isActive && (
                      <button onClick={() => revokeLink(link.id)}
                        className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded hover:bg-red-50">
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Create link form */}
        {showLinkForm ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contact name (optional)</label>
                <input value={linkContactName} onChange={(e) => setLinkContactName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Lender / label (optional)</label>
                <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="e.g. First National Bank"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Send to email (optional — leave blank to just copy the link)</label>
                <input type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)}
                  placeholder="lender@bank.com"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Password *</label>
                <input type="text" value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="Set a strong password"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Expires in</label>
                <select value={linkDays} onChange={(e) => setLinkDays(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={createBankLink} disabled={creatingLink || !linkPassword}
                className="bg-[#003087] text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
                {creatingLink ? (linkEmail ? 'Sending...' : 'Generating...') : (linkEmail ? 'Generate & Send' : 'Generate Link')}
              </button>
              <button onClick={() => setShowLinkForm(false)}
                className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowLinkForm(true)}
            className="text-sm text-[#003087] font-medium hover:underline">
            + Generate New Link
          </button>
        )}
      </Section>

      {/* Dead modal */}
      {deadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Mark as Dead / Withdrawn</h2>
            <p className="text-sm text-gray-600 mb-3">Reason (optional):</p>
            <input
              value={deadReason}
              onChange={(e) => setDeadReason(e.target.value)}
              placeholder="e.g. Borrower withdrew, Rate issues..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeadModal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={markDead} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
                Mark Dead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  )
}

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 mt-3 text-sm">
      <span className="text-gray-500">{label}:</span>
      <span className="font-semibold text-[#003087]">{value}</span>
    </div>
  )
}

type FProps = {
  label: string; k: string; draft: LoanData; set: (k: string, v: unknown) => void
  editing: boolean; type?: string; multiline?: boolean; rows?: number
  prefix?: string; suffix?: string; className?: string
}
function F({ label, k, draft, set, editing, type = 'text', multiline, rows = 3, prefix, suffix, className = '' }: FProps) {
  const val = draft[k] ?? ''
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {editing ? (
        multiline ? (
          <textarea
            rows={rows}
            value={String(val)}
            onChange={(e) => set(k, e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          />
        ) : (
          <div className="flex items-center">
            {prefix && <span className="text-gray-500 text-sm mr-1">{prefix}</span>}
            <input
              type={type}
              value={String(val)}
              onChange={(e) => set(k, type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            />
            {suffix && <span className="text-gray-500 text-sm ml-1">{suffix}</span>}
          </div>
        )
      ) : (
        <p className="text-sm text-gray-800">
          {val !== '' && val !== null && val !== undefined
            ? `${prefix ?? ''}${type === 'number' ? Number(val).toLocaleString() : String(val)}${suffix ?? ''}`
            : '—'}
        </p>
      )}
    </div>
  )
}

type FSelectProps = { label: string; k: string; draft: LoanData; set: (k: string, v: unknown) => void; editing: boolean; options: string[] }
function FSelect({ label, k, draft, set, editing, options }: FSelectProps) {
  const val = String(draft[k] ?? '')
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {editing ? (
        <select
          value={val}
          onChange={(e) => set(k, e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
        >
          <option value="">— Select —</option>
          {options.map((o) => (
            <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
          ))}
        </select>
      ) : (
        <p className="text-sm text-gray-800 capitalize">{val.replace(/_/g, ' ') || <span className="text-gray-400">—</span>}</p>
      )}
    </div>
  )
}

type FCheckProps = { label: string; k: string; draft: LoanData; set: (k: string, v: unknown) => void; editing: boolean }
function FCheck({ label, k, draft, set, editing }: FCheckProps) {
  const val = Boolean(draft[k])
  return editing ? (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
      <input type="checkbox" checked={val} onChange={(e) => set(k, e.target.checked)} className="rounded" />
      {label}
    </label>
  ) : (
    <p className="text-sm text-gray-700">{label}: <strong>{val ? 'Yes' : 'No'}</strong></p>
  )
}
