'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Property = {
  id: string
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  property_type: string | null
}

type Props = {
  properties: Property[]
  prefillPropertyId?: string
  onCancel: () => void
  onSuccess?: () => void
}

const LOAN_PROGRAMS = [
  { value: 'bridge', label: 'Bridge' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'rehab', label: 'Rehab' },
  { value: 'ground_up', label: 'Ground Up Construction' },
]

export default function RequestLoanForm({ properties, prefillPropertyId, onCancel, onSuccess }: Props) {
  const router = useRouter()
  const [selectedPropId, setSelectedPropId] = useState(prefillPropertyId ?? '__new__')
  const [loanPurpose, setLoanPurpose] = useState('')
  const [loanProgram, setLoanProgram] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [propertyValue, setPropertyValue] = useState('')
  const [noi, setNoi] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedProp = properties.find((p) => p.id === selectedPropId)

  function handlePropertySelect(id: string) {
    setSelectedPropId(id)
    if (id === '__new__') {
      setStreet(''); setCity(''); setState(''); setZip('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const addressStreet = selectedProp ? selectedProp.address_street : street || null
    const addressCity   = selectedProp ? selectedProp.address_city   : city  || null
    const addressState  = selectedProp ? selectedProp.address_state  : state || null
    const addressZip    = selectedProp ? selectedProp.address_zip    : zip   || null

    if (!addressStreet) { setError('Street address is required.'); setSaving(false); return }

    const res = await fetch('/api/borrower/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id:    selectedProp ? selectedProp.id : null,
        loan_purpose:   loanPurpose  || null,
        loan_program:   loanProgram  || null,
        loan_amount:    loanAmount   ? Number(loanAmount) : null,
        purchase_price: propertyValue ? Number(propertyValue) : null,
        noi:            noi ? Number(noi) : null,
        property_type:  selectedProp ? selectedProp.property_type : null,
        address_street: addressStreet,
        address_city:   addressCity,
        address_state:  addressState,
        address_zip:    addressZip,
      }),
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to submit request'); setSaving(false); return }

    if (onSuccess) onSuccess()
    router.push(`/borrower/loans/${json.id}`)
  }

  return (
    <div className="bg-white rounded-xl border border-[#003087] p-6 mb-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">Request a Loan</h2>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
        SAK Lending finances commercial and investment properties only. Primary residences are not eligible.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Property selector */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Property <span className="text-red-400">*</span>
          </label>
          <select
            value={selectedPropId}
            onChange={(e) => handlePropertySelect(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {[p.address_street, p.address_city, p.address_state].filter(Boolean).join(', ')}
              </option>
            ))}
            <option value="__new__">— New / different address —</option>
          </select>
        </div>

        {/* Selected property summary or new address fields */}
        {selectedProp ? (
          <div className="bg-blue-50 border border-blue-100 rounded px-3 py-2 text-sm text-blue-800">
            {[selectedProp.address_street, selectedProp.address_city, selectedProp.address_state, selectedProp.address_zip]
              .filter(Boolean).join(', ')}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Street Address <span className="text-red-400">*</span>
              </label>
              <input
                value={street} onChange={(e) => setStreet(e.target.value)} required
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">State</label>
              <input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} placeholder="FL"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Zip</label>
              <input value={zip} onChange={(e) => setZip(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
          </div>
        )}

        {/* Loan details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Loan Purpose</label>
            <select value={loanPurpose} onChange={(e) => setLoanPurpose(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
              <option value="">— Select —</option>
              <option value="purchase">Purchase</option>
              <option value="refinance">Refinance</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Loan Program</label>
            <select value={loanProgram} onChange={(e) => setLoanProgram(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
              <option value="">— Select —</option>
              {LOAN_PROGRAMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Loan Amount (optional)</label>
            <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="e.g. 500000"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Property Value (optional)</label>
            <input type="number" value={propertyValue} onChange={(e) => setPropertyValue(e.target.value)} placeholder="Purchase price or current value"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">NOI (optional)</label>
            <input type="number" value={noi} onChange={(e) => setNoi(e.target.value)} placeholder="Net operating income"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving}
            className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
            {saving ? 'Submitting...' : 'Submit Request'}
          </button>
          <button type="button" onClick={onCancel}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
