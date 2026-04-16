'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import RequestLoanForm from '@/components/borrower/RequestLoanForm'
import StreetView from '@/components/StreetView'

type Property = {
  id: string
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  property_type: string | null
  property_use: string | null
  date_acquired: string | null
  purchase_price: number | null
  mortgage_holder: string | null
  mortgage_balance: number | null
  monthly_payment: number | null
  interest_rate: number | null
  loan_maturity_date: string | null
  notes: string | null
}

type HomeAddress = {
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
}

const BLANK: Partial<Property> = {
  address_street: '', address_city: '', address_state: '', address_zip: '',
  property_type: '', property_use: 'investment', date_acquired: '', purchase_price: null,
  mortgage_holder: '', mortgage_balance: null, monthly_payment: null,
  interest_rate: null, loan_maturity_date: '', notes: '',
}

function fmt$(v: unknown) {
  const n = Number(v); if (!n) return null
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function BorrowerPropertiesPage() {
  type BorrowerLoan = { id: string; property_id: string | null; address_street: string | null; loan_program: string | null; address_city: string | null; stage: string }
  const [properties, setProperties] = useState<Property[]>([])
  const [loans, setLoans] = useState<BorrowerLoan[]>([])
  const [home, setHome] = useState<HomeAddress | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState<Partial<Property>>(BLANK)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Property>>({})
  const [requestLoanPropId, setRequestLoanPropId] = useState<string | null>(null)

  async function load() {
    const [propsRes, loansRes, profileRes] = await Promise.all([
      fetch('/api/borrower/properties'),
      fetch('/api/borrower/loans'),
      fetch('/api/borrower/profile'),
    ])
    const propsData = await propsRes.json()
    const loansData = await loansRes.json()
    const profileData = await profileRes.json()
    setProperties(Array.isArray(propsData) ? propsData : [])
    setLoans(Array.isArray(loansData) ? loansData : [])
    if (profileData?.home_address_street) {
      setHome({
        street: profileData.home_address_street,
        city: profileData.home_address_city,
        state: profileData.home_address_state,
        zip: profileData.home_address_zip,
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addProperty() {
    setSaving(true)
    const clean = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [k, v === '' ? null : v])
    )
    const res = await fetch('/api/borrower/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean),
    })
    if (res.ok) {
      await load()
      setDraft(BLANK)
      setShowAdd(false)
    }
    setSaving(false)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const clean = Object.fromEntries(
      Object.entries(editDraft).map(([k, v]) => [k, v === '' ? null : v])
    )
    await fetch(`/api/borrower/properties/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean),
    })
    await load()
    setEditingId(null)
    setSaving(false)
  }

  function propertyHasLoans(prop: Property) {
    return loans.some(
      (l) =>
        l.property_id === prop.id ||
        (l.address_street &&
          prop.address_street &&
          l.address_street.toLowerCase() === prop.address_street.toLowerCase() &&
          l.address_city?.toLowerCase() === prop.address_city?.toLowerCase())
    )
  }

  async function deleteProperty(id: string) {
    if (!confirm('Remove this property?')) return
    await fetch(`/api/borrower/properties/${id}`, { method: 'DELETE' })
    setProperties((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Properties</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your real estate portfolio on file with SAK Lending.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setRequestLoanPropId('__header__'); setShowAdd(false) }}
            className="border border-[#003087] text-[#003087] px-4 py-2 rounded text-sm font-medium hover:bg-blue-50">
            + Request Loan
          </button>
          <button onClick={() => setShowAdd(true)}
            className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070]">
            + Add Property
          </button>
        </div>
      </div>

      {/* Request loan form (header-level, no prefill) */}
      {requestLoanPropId === '__header__' && (
        <RequestLoanForm
          properties={properties}
          onCancel={() => setRequestLoanPropId(null)}
          onSuccess={() => setRequestLoanPropId(null)}
        />
      )}

      {/* Add property form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-[#003087] p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New Property</h2>
          <PropertyForm draft={draft} onChange={setDraft} />
          <div className="flex gap-2 mt-4">
            <button onClick={addProperty} disabled={saving}
              className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Property'}
            </button>
            <button onClick={() => { setShowAdd(false); setDraft(BLANK) }}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-gray-400">Loading...</p>}

      {!loading && properties.length === 0 && !showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-500">No properties on file yet.</p>
          <p className="text-gray-400 text-sm mt-1">Add your properties to build your real estate profile.</p>
        </div>
      )}

      {/* Primary residence — from profile, not eligible for financing */}
      {home && (
        <div className="mb-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-stretch">
            <StreetView street={home.street} city={home.city} state={home.state} zip={home.zip}
              width={300} height={300} className="w-32 sm:w-40 flex-shrink-0 object-cover self-stretch" />
            <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-gray-900 text-sm leading-snug">
                    {[home.street, home.city, home.state, home.zip].filter(Boolean).join(', ')}
                  </p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                    Primary Residence
                  </span>
                </div>
                <p className="text-xs text-gray-400 italic">Not eligible for SAK Lending financing.</p>
              </div>
              <a href="/borrower/profile" className="text-xs text-[#003087] hover:underline mt-2 self-start">
                Edit in profile →
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {properties.map((prop) => (
          <div key={prop.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {editingId === prop.id ? (
              <div className="p-5">
                <PropertyForm draft={editDraft} onChange={setEditDraft} />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => saveEdit(prop.id)} disabled={saving}
                    className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Square-left image + details layout */}
                <div className="flex items-stretch">
                  <StreetView
                    street={prop.address_street}
                    city={prop.address_city}
                    state={prop.address_state}
                    zip={prop.address_zip}
                    width={300}
                    height={300}
                    className="w-32 sm:w-40 flex-shrink-0 object-cover self-stretch"
                  />
                  <div className="p-4 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm leading-snug">
                          {[prop.address_street, prop.address_city, prop.address_state, prop.address_zip]
                            .filter(Boolean).join(', ') || 'Address not on file'}
                        </p>
                        {prop.property_type && (
                          <p className="text-xs text-gray-500 mt-0.5">{prop.property_type}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {prop.property_use === 'second_home' && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Second Home
                          </span>
                        )}
                        <button onClick={() => { setEditingId(prop.id); setEditDraft(prop) }}
                          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded">
                          Edit
                        </button>
                        {propertyHasLoans(prop) ? (
                          <span title="Cannot remove a property with an active loan"
                            className="text-xs text-gray-300 border border-gray-100 px-2 py-1 rounded cursor-not-allowed">
                            Remove
                          </span>
                        ) : (
                          <button onClick={() => deleteProperty(prop.id)}
                            className="text-xs text-red-400 hover:text-red-600 border border-red-100 px-2 py-1 rounded">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                      {prop.purchase_price && <Stat label="Purchase Price" value={fmt$(prop.purchase_price)!} />}
                      {prop.mortgage_balance && <Stat label="Balance" value={fmt$(prop.mortgage_balance)!} />}
                      {prop.interest_rate && <Stat label="Rate" value={`${prop.interest_rate}%`} />}
                      {prop.loan_maturity_date && <Stat label="Loan Due" value={new Date(prop.loan_maturity_date + 'T00:00:00').toLocaleDateString()} />}
                    </div>

                    {(() => {
                      const linked = loans.filter(
                        (l) =>
                          l.property_id === prop.id ||
                          (l.address_street && prop.address_street &&
                            l.address_street.toLowerCase() === prop.address_street.toLowerCase() &&
                            l.address_city?.toLowerCase() === prop.address_city?.toLowerCase())
                      )
                      const hasActiveLoan = linked.some(l => l.stage !== 'funded')
                      return (
                        <div className="mt-3">
                          {linked.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {linked.map((l) => (
                                <Link key={l.id} href={`/borrower/loans/${l.id}`}
                                  className="inline-flex items-center gap-1 text-xs text-[#003087] border border-[#003087] px-2 py-1 rounded hover:bg-blue-50">
                                  {l.loan_program
                                    ? l.loan_program.charAt(0).toUpperCase() + l.loan_program.slice(1)
                                    : 'Loan'}{' '}— {l.stage}
                                </Link>
                              ))}
                            </div>
                          )}
                          {prop.property_use === 'second_home' ? (
                            <p className="text-xs text-gray-400 italic">Not eligible for SAK Lending financing.</p>
                          ) : hasActiveLoan ? (
                            <p className="text-xs text-gray-400 italic">Loan in progress.</p>
                          ) : requestLoanPropId === prop.id ? (
                            <RequestLoanForm
                              properties={properties.filter(p => p.property_use !== 'second_home')}
                              prefillPropertyId={prop.id}
                              onCancel={() => setRequestLoanPropId(null)}
                              onSuccess={() => setRequestLoanPropId(null)}
                            />
                          ) : (
                            <button
                              onClick={() => { setRequestLoanPropId(prop.id); setShowAdd(false) }}
                              className="text-xs text-[#003087] border border-[#003087] px-2 py-1 rounded hover:bg-blue-50">
                              + Request Loan
                            </button>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PropertyForm({ draft, onChange }: { draft: Partial<Property>; onChange: (d: Partial<Property>) => void }) {
  const set = (key: keyof Property) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.value
    onChange({ ...draft, [key]: val === '' ? null : val })
  }
  const setNum = (key: keyof Property) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange({ ...draft, [key]: val === '' ? null : Number(val) })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Street Address <span className="text-red-400">*</span></label>
          <input required value={draft.address_street ?? ''} onChange={set('address_street')}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Property Use</label>
          <select value={draft.property_use ?? 'investment'} onChange={set('property_use')}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
            <option value="investment">Investment / Commercial</option>
            <option value="second_home">Second Home</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">City</label>
          <input value={draft.address_city ?? ''} onChange={set('address_city')}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">State</label>
          <input value={draft.address_state ?? ''} onChange={set('address_state')} maxLength={2} placeholder="FL"
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Property Type</label>
          <input value={draft.property_type ?? ''} onChange={set('property_type')} placeholder="e.g. SFR, Multifamily"
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date Acquired</label>
          <input type="date" value={draft.date_acquired ?? ''} onChange={set('date_acquired')}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Purchase Price</label>
          <input type="number" value={draft.purchase_price ?? ''} onChange={setNum('purchase_price')}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Lender / Bank</label>
          <input value={draft.mortgage_holder ?? ''} onChange={set('mortgage_holder')}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Mortgage Balance</label>
          <input type="number" value={draft.mortgage_balance ?? ''} onChange={setNum('mortgage_balance')}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Monthly Payment</label>
          <input type="number" value={draft.monthly_payment ?? ''} onChange={setNum('monthly_payment')}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Interest Rate (%)</label>
          <input type="number" step="0.01" value={draft.interest_rate ?? ''} onChange={setNum('interest_rate')}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Loan Maturity Date</label>
          <input type="date" value={draft.loan_maturity_date ?? ''} onChange={set('loan_maturity_date')}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</label>
        <textarea value={draft.notes ?? ''} onChange={set('notes')} rows={2}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}
