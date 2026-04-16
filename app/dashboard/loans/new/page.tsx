'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const PROPERTY_TYPES = [
  'Multifamily', 'Mixed Use', 'Office', 'Retail', 'Industrial', 'Warehouse',
  'Self Storage', 'Hotel / Motel', 'Mobile Home Park', 'Senior Housing',
  'Student Housing', 'Single Family', 'Condo', 'Townhouse', '2-4 Unit',
  'Land', 'Gas Station', 'Car Wash', 'Auto Dealer', 'Restaurant',
  'Medical Office', 'Assisted Living', 'Church', 'Special Purpose', 'Other',
]

type Contact = { id: string; first_name: string; last_name: string; entity_name: string | null }
type FullContact = Contact & {
  co_borrower_first_name: string | null
  co_borrower_last_name: string | null
  co_borrower_email: string | null
  co_borrower_phone: string | null
}

function NewLoanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillContact      = searchParams.get('contact_id') ?? ''
  const prefillPropertyId   = searchParams.get('property_id') ?? ''
  const prefillStreet       = searchParams.get('address_street') ?? ''
  const prefillCity         = searchParams.get('address_city') ?? ''
  const prefillState        = searchParams.get('address_state') ?? ''
  const prefillZip          = searchParams.get('address_zip') ?? ''
  const prefillPropertyType = searchParams.get('property_type') ?? ''

  const contactLocked = !!prefillContact

  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactId, setContactId] = useState(prefillContact)
  const [coBorrowerId, setCoBorrowerId] = useState('')
  const [fullContact, setFullContact] = useState<FullContact | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/contacts?page=1&limit=500')
      .then((r) => r.json())
      .then((j) => setContacts(j.data ?? []))
  }, [])

  // Fetch full contact details (including co-borrower) when contact is selected
  useEffect(() => {
    if (!contactId) { setFullContact(null); return }
    fetch(`/api/contacts/${contactId}`)
      .then((r) => r.json())
      .then((j) => setFullContact(j))
  }, [contactId])

  const primaryContact = contacts.find((c) => c.id === contactId)
  const hasCoBorrower = !!(fullContact?.co_borrower_first_name)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const form = e.currentTarget
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value?.trim() || null

    const data = {
      contact_id:              contactId || null,
      property_id:             prefillPropertyId || null,
      co_borrower_contact_id:  coBorrowerId || null,
      loan_amount:             get('loan_amount') ? Number(get('loan_amount')) : null,
      loan_purpose:            get('loan_purpose'),
      loan_program:            get('loan_program'),
      financing_preference:    get('financing_preference'),
      property_type:           get('property_type'),
      state:                   get('state'),
      address_street:          get('address_street'),
      address_city:            get('address_city'),
      address_state:           get('address_state'),
      address_zip:             get('address_zip'),
      stage:                   get('stage') ?? 'lead',
    }

    if (!data.contact_id) { setError('Contact is required'); setSaving(false); return }

    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to create loan'); setSaving(false); return }
    router.push(`/dashboard/loans/${json.id}`)
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/pipeline" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Pipeline
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Loan</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">

        {/* Primary borrower — locked if coming from a property */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Borrower *</label>
          {contactLocked ? (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm">
              <span className="text-gray-900 font-medium">
                {primaryContact
                  ? `${primaryContact.first_name} ${primaryContact.last_name}${primaryContact.entity_name ? ` — ${primaryContact.entity_name}` : ''}`
                  : 'Loading…'}
              </span>
              <span className="text-xs text-gray-400">Locked</span>
            </div>
          ) : (
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            >
              <option value="">— Select contact —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}{c.entity_name ? ` — ${c.entity_name}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Co-borrower */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Co-Borrower <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          {hasCoBorrower && (
            <div className="mb-2 bg-blue-50 border border-blue-100 rounded px-3 py-2 text-sm text-blue-800">
              On file: {fullContact!.co_borrower_first_name} {fullContact!.co_borrower_last_name}
              {fullContact!.co_borrower_email && <span className="text-blue-500 ml-2">· {fullContact!.co_borrower_email}</span>}
            </div>
          )}
          <select
            value={coBorrowerId}
            onChange={(e) => setCoBorrowerId(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          >
            <option value="">— None / use contact&apos;s co-borrower on file —</option>
            {contacts
              .filter((c) => c.id !== contactId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}{c.entity_name ? ` — ${c.entity_name}` : ''}
                </option>
              ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
            <input name="loan_amount" type="number" placeholder="500000"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select name="stage" defaultValue="lead"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
              {['lead','qualified','application','underwriting','approved','funded'].map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <select name="loan_purpose"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
              <option value="">— Select —</option>
              <option value="purchase">Purchase</option>
              <option value="refinance">Refinance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
            <select name="loan_program"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
              <option value="">— Select —</option>
              <option value="bridge">Bridge</option>
              <option value="permanent">Permanent</option>
              <option value="rehab">Rehab</option>
              <option value="ground_up">Ground Up</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
          <select name="property_type" defaultValue={prefillPropertyType}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
            <option value="">— Select —</option>
            {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {prefillStreet && (
          <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-800">
            Property: {[prefillStreet, prefillCity, prefillState, prefillZip].filter(Boolean).join(', ')}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
          <input name="address_street" defaultValue={prefillStreet}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input name="address_city" defaultValue={prefillCity}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input name="address_state" maxLength={2} placeholder="NY" defaultValue={prefillState}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
            <input name="address_zip" defaultValue={prefillZip}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-[#003087] text-white px-5 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Loan'}
          </button>
          <Link href="/dashboard/pipeline"
            className="px-5 py-2 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function NewLoanPageWrapper() {
  return <Suspense><NewLoanPage /></Suspense>
}
