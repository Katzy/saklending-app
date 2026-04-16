'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import StreetView from '@/components/StreetView'

type Contact = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  entity_name: string | null
  credit_score_estimate: number | null
  can_provide_tax_returns: boolean | null
  sponsor_bio: string | null
  notes: string | null
  source: string
  co_borrower_first_name: string | null
  co_borrower_last_name: string | null
  co_borrower_email: string | null
  co_borrower_phone: string | null
}

type Property = {
  id: string
  created_at: string
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  property_type: string | null
  date_acquired: string | null
  purchase_price: number | null
  mortgage_holder: string | null
  mortgage_balance: number | null
  monthly_payment: number | null
  interest_rate: number | null
  loan_maturity_date: string | null
  notes: string | null
  deleted_at: string | null
  deleted_by: string | null
}

type Loan = {
  id: string
  created_at: string
  loan_amount: number | null
  loan_purpose: string | null
  loan_program: string | null
  property_type: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  stage: string
  property_id: string | null
  is_dead: boolean
}

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700',
  qualified: 'bg-blue-100 text-blue-700',
  application: 'bg-yellow-100 text-yellow-700',
  underwriting: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  funded: 'bg-emerald-100 text-emerald-700',
}

const PROPERTY_TYPES = [
  'Multifamily', 'Mixed Use', 'Office', 'Retail', 'Industrial', 'Warehouse',
  'Self Storage', 'Hotel / Motel', 'Mobile Home Park', 'Senior Housing',
  'Student Housing', 'Single Family', 'Condo', 'Townhouse', '2-4 Unit',
  'Land', 'Gas Station', 'Car Wash', 'Auto Dealer', 'Restaurant',
  'Medical Office', 'Assisted Living', 'Church', 'Special Purpose', 'Other',
]

const BLANK_PROP = {
  address_street: '', address_city: '', address_state: '', address_zip: '',
  property_type: '', date_acquired: '', purchase_price: '',
  mortgage_holder: '', mortgage_balance: '', monthly_payment: '',
  interest_rate: '', loan_maturity_date: '', notes: '',
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [contact, setContact] = useState<Contact | null>(null)
  const [loans, setLoans] = useState<Loan[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [magicLink, setMagicLink] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Contact>>({})

  // Property add/edit state
  const [showAddProp, setShowAddProp] = useState(false)
  const [propDraft, setPropDraft] = useState(BLANK_PROP)
  const [savingProp, setSavingProp] = useState(false)
  const [editingPropId, setEditingPropId] = useState<string | null>(null)
  const [propEditDraft, setPropEditDraft] = useState<Partial<Property>>({})
  const [savingPropEdit, setSavingPropEdit] = useState(false)

  const fetchContact = useCallback(async () => {
    const res = await fetch(`/api/contacts/${id}`)
    if (!res.ok) { router.push('/dashboard/contacts'); return }
    const data = await res.json()
    setContact(data)
    setEditData(data)
    setLoading(false)
  }, [id, router])

  const fetchLoans = useCallback(async () => {
    const res = await fetch(`/api/loans?contact_id=${id}`)
    if (res.ok) { const j = await res.json(); setLoans(j.data ?? []) }
  }, [id])

  const fetchProperties = useCallback(async () => {
    const res = await fetch(`/api/properties?contact_id=${id}`)
    if (res.ok) setProperties(await res.json())
  }, [id])

  useEffect(() => {
    fetchContact()
    fetchLoans()
    fetchProperties()
  }, [fetchContact, fetchLoans, fetchProperties])

  async function saveContact() {
    setSaving(true)
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    })
    if (res.ok) { await fetchContact(); setEditing(false) }
    setSaving(false)
  }

  async function inviteBorrower() {
    if (!contact) return
    setInviting(true)
    setInviteMsg('')
    setMagicLink(null)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: id, email: contact.email }),
    })
    const json = await res.json()
    if (res.ok) {
      if (json.magic_link) {
        setInviteMsg(`Existing user — email delivery failed. Copy the link below to send manually:`)
        setMagicLink(json.magic_link)
      } else {
        setInviteMsg(`Invite sent to ${contact.email}`)
      }
    } else {
      setInviteMsg(`Error: ${json.error}`)
    }
    setInviting(false)
  }

  async function addProperty() {
    setSavingProp(true)
    // Convert empty strings to null so Postgres doesn't reject numeric fields
    const payload = Object.fromEntries(
      Object.entries(propDraft).map(([k, v]) => [k, v === '' ? null : v])
    )
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: id, ...payload }),
    })
    if (res.ok) {
      await fetchProperties()
      setPropDraft(BLANK_PROP)
      setShowAddProp(false)
    }
    setSavingProp(false)
  }

  async function deleteProperty(propId: string) {
    await fetch(`/api/properties/${propId}`, { method: 'DELETE' })
    setProperties((prev) => prev.filter((p) => p.id !== propId))
  }

  async function savePropertyEdit(propId: string) {
    setSavingPropEdit(true)
    const payload = Object.fromEntries(
      Object.entries(propEditDraft).map(([k, v]) => [k, v === '' ? null : v])
    )
    await fetch(`/api/properties/${propId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await fetchProperties()
    setEditingPropId(null)
    setSavingPropEdit(false)
  }

  // Build URL for new loan pre-filled from a property
  function newLoanFromProperty(prop: Property) {
    const params = new URLSearchParams({ contact_id: id, property_id: prop.id })
    if (prop.address_street) params.set('address_street', prop.address_street)
    if (prop.address_city)   params.set('address_city', prop.address_city)
    if (prop.address_state)  params.set('address_state', prop.address_state)
    if (prop.address_zip)    params.set('address_zip', prop.address_zip)
    if (prop.property_type)  params.set('property_type', prop.property_type)
    return `/dashboard/loans/new?${params}`
  }

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>
  if (!contact) return null

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/dashboard/contacts" className="text-gray-400 hover:text-gray-600 text-sm block mb-1">
            ← Contacts
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {contact.first_name} {contact.last_name}
          </h1>
          {contact.entity_name && (
            <p className="text-gray-500 text-sm mt-0.5">{contact.entity_name}</p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={inviteBorrower} disabled={inviting}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {inviting ? 'Sending...' : 'Invite Borrower'}
          </button>
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50">
              Edit
            </button>
          ) : (
            <>
              <button onClick={saveContact} disabled={saving}
                className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setEditData(contact) }}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {inviteMsg && (
        <div className={`mb-4 px-4 py-3 rounded text-sm ${inviteMsg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {inviteMsg}
          {magicLink && (
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={magicLink}
                className="flex-1 bg-white border border-green-300 rounded px-2 py-1 text-xs text-gray-700 font-mono"
              />
              <button
                onClick={() => { navigator.clipboard.writeText(magicLink); toast.success('Link copied!') }}
                className="text-xs bg-green-700 text-white px-2 py-1 rounded hover:bg-green-800"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      {/* Contact Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Contact Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" value={contact.first_name} editValue={editData.first_name ?? ''} editing={editing} onChange={(v) => setEditData({ ...editData, first_name: v })} />
          <Field label="Last Name" value={contact.last_name} editValue={editData.last_name ?? ''} editing={editing} onChange={(v) => setEditData({ ...editData, last_name: v })} />
          <Field label="Email" value={contact.email} editValue={editData.email ?? ''} editing={editing} onChange={(v) => setEditData({ ...editData, email: v })} />
          <Field label="Phone" value={contact.phone ?? ''} editValue={editData.phone ?? ''} editing={editing} onChange={(v) => setEditData({ ...editData, phone: v || null })} />
          <Field label="Entity / Company" value={contact.entity_name ?? ''} editValue={editData.entity_name ?? ''} editing={editing} onChange={(v) => setEditData({ ...editData, entity_name: v || null })} />
          <Field label="Credit Score Est." value={contact.credit_score_estimate ? String(contact.credit_score_estimate) : ''} editValue={editData.credit_score_estimate ? String(editData.credit_score_estimate) : ''} editing={editing} type="number" onChange={(v) => setEditData({ ...editData, credit_score_estimate: v ? Number(v) : null })} />
        </div>

        {/* Co-Borrower */}
        {(contact.co_borrower_first_name || editing) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Co-Borrower</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" value={contact.co_borrower_first_name ?? ''} editValue={editData.co_borrower_first_name ?? ''} editing={editing} onChange={(v) => setEditData({ ...editData, co_borrower_first_name: v || null })} />
              <Field label="Last Name" value={contact.co_borrower_last_name ?? ''} editValue={editData.co_borrower_last_name ?? ''} editing={editing} onChange={(v) => setEditData({ ...editData, co_borrower_last_name: v || null })} />
              <Field label="Email" value={contact.co_borrower_email ?? ''} editValue={editData.co_borrower_email ?? ''} editing={editing} onChange={(v) => setEditData({ ...editData, co_borrower_email: v || null })} />
              <Field label="Phone" value={contact.co_borrower_phone ?? ''} editValue={editData.co_borrower_phone ?? ''} editing={editing} onChange={(v) => setEditData({ ...editData, co_borrower_phone: v || null })} />
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Source</label>
          <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 capitalize">
            {contact.source.replace('_', ' ')}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {editing ? (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={editData.can_provide_tax_returns ?? false}
                onChange={(e) => setEditData({ ...editData, can_provide_tax_returns: e.target.checked })} className="rounded" />
              Can provide tax returns
            </label>
          ) : (
            <span className="text-sm text-gray-700">
              Tax returns: <strong>{contact.can_provide_tax_returns ? 'Yes' : 'No'}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Sponsor Bio */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Sponsor Bio</h2>
        {editing ? (
          <textarea rows={4} value={editData.sponsor_bio ?? ''}
            onChange={(e) => setEditData({ ...editData, sponsor_bio: e.target.value || null })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            placeholder="Brief borrower/sponsor bio for loan packages..." />
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {contact.sponsor_bio || <span className="text-gray-400 italic">None</span>}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Notes</h2>
        {editing ? (
          <textarea rows={4} value={editData.notes ?? ''}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value || null })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            placeholder="Internal notes..." />
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {contact.notes || <span className="text-gray-400 italic">None</span>}
          </p>
        )}
      </div>

      {/* ── Properties / SREO ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Properties</h2>
          {!showAddProp && (
            <button onClick={() => setShowAddProp(true)}
              className="text-xs text-[#003087] font-medium hover:underline">
              + Add Property
            </button>
          )}
        </div>

        {properties.filter(p => !p.deleted_at).length === 0 && !showAddProp && (
          <p className="text-sm text-gray-400 italic">No properties yet. Add one to start a loan.</p>
        )}

        <div className="space-y-3">
          {properties.filter(p => !p.deleted_at).map((prop) => {
            const linkedLoans = loans.filter(l =>
              l.property_id === prop.id ||
              (l.address_street && prop.address_street &&
                l.address_street.trim().toLowerCase() === prop.address_street.trim().toLowerCase())
            )
            const hasActiveLoan = linkedLoans.some(l => !l.is_dead && l.stage !== 'funded')
            return (
            <div key={prop.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Card header — always visible */}
              <div className="flex items-stretch">
                <StreetView
                  street={prop.address_street}
                  city={prop.address_city}
                  state={prop.address_state}
                  zip={prop.address_zip}
                  width={200}
                  height={200}
                  className="w-24 flex-shrink-0 object-cover self-stretch"
                />
                <div className="flex-1 min-w-0 p-4">
                <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {[prop.address_street, prop.address_city, prop.address_state, prop.address_zip]
                      .filter(Boolean).join(', ') || 'Address not entered'}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    {prop.property_type && <span>{prop.property_type}</span>}
                    {prop.mortgage_holder && <span>Bank: {prop.mortgage_holder}</span>}
                    {prop.mortgage_balance && <span>Balance: ${Number(prop.mortgage_balance).toLocaleString()}</span>}
                    {prop.monthly_payment && <span>Pmt: ${Number(prop.monthly_payment).toLocaleString()}/mo</span>}
                    {prop.interest_rate && <span>Rate: {prop.interest_rate}%</span>}
                    {prop.loan_maturity_date && <span>Due: {new Date(prop.loan_maturity_date + 'T00:00:00').toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {linkedLoans.map(l => (
                    <Link key={l.id} href={`/dashboard/loans/${l.id}`}
                      className="border border-[#003087] text-[#003087] px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-50 whitespace-nowrap">
                      {l.loan_program ? l.loan_program.replace('_', ' ') : (l.address_city || 'Loan')} ↗
                    </Link>
                  ))}
                  {hasActiveLoan ? (
                    <span className="text-xs text-gray-400 italic px-1">Loan in progress</span>
                  ) : (
                    <Link href={newLoanFromProperty(prop)}
                      className="bg-[#003087] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-[#002070] whitespace-nowrap">
                      + New Loan
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      if (editingPropId === prop.id) {
                        setEditingPropId(null)
                      } else {
                        setEditingPropId(prop.id)
                        setPropEditDraft({ ...prop })
                      }
                    }}
                    className="text-gray-400 hover:text-[#003087] text-xs px-1 font-medium"
                  >
                    {editingPropId === prop.id ? 'Close' : 'Edit'}
                  </button>
                  <button onClick={() => deleteProperty(prop.id)}
                    className="text-gray-300 hover:text-red-400 text-sm px-1" title="Remove">
                    ✕
                  </button>
                </div>
                </div>
                </div>
              </div>

              {/* Inline edit panel */}
              {editingPropId === prop.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Street Address</label>
                      <input value={propEditDraft.address_street ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, address_street: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">City</label>
                      <input value={propEditDraft.address_city ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, address_city: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">State</label>
                        <input value={propEditDraft.address_state ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, address_state: e.target.value })}
                          maxLength={2} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Zip</label>
                        <input value={propEditDraft.address_zip ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, address_zip: e.target.value })}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Property Type</label>
                      <select value={propEditDraft.property_type ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, property_type: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
                        <option value="">— Select —</option>
                        {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Mortgage / Financing</p>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Date Acquired</label>
                      <input type="date" value={propEditDraft.date_acquired ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, date_acquired: e.target.value || null })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Purchase Price</label>
                      <input type="number" value={propEditDraft.purchase_price ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, purchase_price: e.target.value ? Number(e.target.value) : null })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Lender / Bank</label>
                      <input value={propEditDraft.mortgage_holder ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, mortgage_holder: e.target.value || null })}
                        placeholder="e.g. Chase, Wells Fargo..."
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Mortgage Balance</label>
                      <input type="number" value={propEditDraft.mortgage_balance ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, mortgage_balance: e.target.value ? Number(e.target.value) : null })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Monthly Payment</label>
                      <input type="number" value={propEditDraft.monthly_payment ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, monthly_payment: e.target.value ? Number(e.target.value) : null })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Interest Rate %</label>
                      <input type="number" step="0.01" value={propEditDraft.interest_rate ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, interest_rate: e.target.value ? Number(e.target.value) : null })}
                        placeholder="6.5"
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Loan Maturity Date</label>
                      <input type="date" value={propEditDraft.loan_maturity_date ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, loan_maturity_date: e.target.value || null })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Notes</label>
                      <input value={propEditDraft.notes ?? ''} onChange={(e) => setPropEditDraft({ ...propEditDraft, notes: e.target.value || null })}
                        placeholder="e.g. 8-unit building, occupied..."
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => savePropertyEdit(prop.id)} disabled={savingPropEdit}
                      className="bg-[#003087] text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
                      {savingPropEdit ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setEditingPropId(null)}
                      className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>

        {/* Add property form */}
        {showAddProp && (
          <div className="mt-3 border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">New Property</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Street Address <span className="text-red-400">*</span></label>
                <input required value={propDraft.address_street} onChange={(e) => setPropDraft({ ...propDraft, address_street: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">City</label>
                <input value={propDraft.address_city} onChange={(e) => setPropDraft({ ...propDraft, address_city: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">State</label>
                  <input value={propDraft.address_state} onChange={(e) => setPropDraft({ ...propDraft, address_state: e.target.value })}
                    maxLength={2} placeholder="NY"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Zip</label>
                  <input value={propDraft.address_zip} onChange={(e) => setPropDraft({ ...propDraft, address_zip: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Property Type</label>
                <select value={propDraft.property_type} onChange={(e) => setPropDraft({ ...propDraft, property_type: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
                  <option value="">— Select —</option>
                  {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Mortgage / Financing</p>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Date Acquired</label>
                <input type="date" value={propDraft.date_acquired} onChange={(e) => setPropDraft({ ...propDraft, date_acquired: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Purchase Price</label>
                <input type="number" value={propDraft.purchase_price} onChange={(e) => setPropDraft({ ...propDraft, purchase_price: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Lender / Bank</label>
                <input value={propDraft.mortgage_holder} onChange={(e) => setPropDraft({ ...propDraft, mortgage_holder: e.target.value })}
                  placeholder="e.g. Chase, Wells Fargo..."
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mortgage Balance</label>
                <input type="number" value={propDraft.mortgage_balance} onChange={(e) => setPropDraft({ ...propDraft, mortgage_balance: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Monthly Payment</label>
                <input type="number" value={propDraft.monthly_payment} onChange={(e) => setPropDraft({ ...propDraft, monthly_payment: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Interest Rate %</label>
                <input type="number" step="0.01" value={propDraft.interest_rate} onChange={(e) => setPropDraft({ ...propDraft, interest_rate: e.target.value })}
                  placeholder="6.5"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Loan Maturity Date</label>
                <input type="date" value={propDraft.loan_maturity_date} onChange={(e) => setPropDraft({ ...propDraft, loan_maturity_date: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
                <input value={propDraft.notes} onChange={(e) => setPropDraft({ ...propDraft, notes: e.target.value })}
                  placeholder="e.g. 8-unit building, fully occupied..."
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={addProperty} disabled={savingProp}
                className="bg-[#003087] text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
                {savingProp ? 'Saving...' : 'Add Property'}
              </button>
              <button onClick={() => { setShowAddProp(false); setPropDraft(BLANK_PROP) }}
                className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Deleted properties — admin only */}
        {properties.some(p => p.deleted_at) && (
          <details className="mt-4">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
              {properties.filter(p => p.deleted_at).length} property removed by borrower — click to view
            </summary>
            <div className="mt-2 space-y-2">
              {properties.filter(p => p.deleted_at).map((prop) => (
                <div key={prop.id} className="border border-red-100 bg-red-50 rounded-lg p-3 text-xs text-gray-600">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-gray-700">
                      {[prop.address_street, prop.address_city, prop.address_state, prop.address_zip].filter(Boolean).join(', ') || 'No address'}
                    </p>
                    <span className="text-red-400 whitespace-nowrap">
                      Removed {new Date(prop.deleted_at!).toLocaleDateString()} by {prop.deleted_by}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
                    {prop.property_type && <span>Type: {prop.property_type}</span>}
                    {prop.date_acquired && <span>Acquired: {new Date(prop.date_acquired + 'T00:00:00').toLocaleDateString()}</span>}
                    {prop.purchase_price && <span>Purchase: ${Number(prop.purchase_price).toLocaleString()}</span>}
                    {prop.mortgage_holder && <span>Lender: {prop.mortgage_holder}</span>}
                    {prop.mortgage_balance && <span>Balance: ${Number(prop.mortgage_balance).toLocaleString()}</span>}
                    {prop.monthly_payment && <span>Payment: ${Number(prop.monthly_payment).toLocaleString()}/mo</span>}
                    {prop.interest_rate && <span>Rate: {prop.interest_rate}%</span>}
                    {prop.loan_maturity_date && <span>Due: {new Date(prop.loan_maturity_date + 'T00:00:00').toLocaleDateString()}</span>}
                    {prop.notes && <span>Notes: {prop.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Linked Loans */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Loans</h2>
          <Link href={`/dashboard/loans/new?contact_id=${id}`}
            className="text-xs text-[#003087] font-medium hover:underline">
            + New Loan (no property)
          </Link>
        </div>

        {loans.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No loans yet.</p>
        ) : (
          <div className="space-y-2">
            {loans.map((loan) => (
              <Link key={loan.id} href={`/dashboard/loans/${loan.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {(() => {
                      const linkedProp = properties.find(p =>
                        p.id === loan.property_id ||
                        (p.address_street && loan.address_street &&
                          p.address_street.trim().toLowerCase() === loan.address_street.trim().toLowerCase())
                      )
                      const addr = linkedProp
                        ? [linkedProp.address_street, linkedProp.address_city, linkedProp.address_state].filter(Boolean).join(', ')
                        : loan.address_city ? `${loan.address_city}, ${loan.address_state ?? ''}` : loan.property_type ?? 'Loan'
                      return addr
                    })()}
                    {loan.loan_program ? ` — ${loan.loan_program.replace('_', ' ')}` : ''}
                    {loan.loan_amount ? ` — $${loan.loan_amount.toLocaleString()}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(loan.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 items-center">
                  {loan.is_dead && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Dead</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${STAGE_COLORS[loan.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                    {loan.stage}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, editValue, editing, onChange, type = 'text' }: {
  label: string; value: string; editValue: string; editing: boolean
  onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {editing ? (
        <input type={type} value={editValue} onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
      ) : (
        <p className="text-sm text-gray-800">{value || <span className="text-gray-400">—</span>}</p>
      )}
    </div>
  )
}
