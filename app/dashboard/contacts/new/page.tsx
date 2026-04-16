'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewContactPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [addCoBorrower, setAddCoBorrower] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const form = e.currentTarget
    const data: Record<string, string | number | null> = {
      first_name: (form.elements.namedItem('first_name') as HTMLInputElement).value.trim(),
      last_name: (form.elements.namedItem('last_name') as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem('email') as HTMLInputElement).value.trim(),
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value.trim() || null,
      entity_name: (form.elements.namedItem('entity_name') as HTMLInputElement).value.trim() || null,
      credit_score_estimate: (form.elements.namedItem('credit_score_estimate') as HTMLInputElement).value || null,
      notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value.trim() || null,
      source: 'manual',
    }

    if (addCoBorrower) {
      data.co_borrower_first_name = (form.elements.namedItem('co_borrower_first_name') as HTMLInputElement).value.trim() || null
      data.co_borrower_last_name = (form.elements.namedItem('co_borrower_last_name') as HTMLInputElement).value.trim() || null
      data.co_borrower_email = (form.elements.namedItem('co_borrower_email') as HTMLInputElement).value.trim() || null
      data.co_borrower_phone = (form.elements.namedItem('co_borrower_phone') as HTMLInputElement).value.trim() || null
    }

    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to create contact')
      setSaving(false)
      return
    }

    router.push(`/dashboard/contacts/${json.id}`)
  }

  const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]'

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/contacts" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Contacts
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Contact</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">

        {/* Primary borrower */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Borrower</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input name="first_name" required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input name="last_name" required className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input name="email" type="email" required className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input name="phone" type="tel" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entity / Company Name</label>
          <input name="entity_name" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Credit Score Estimate</label>
          <input name="credit_score_estimate" type="number" min="300" max="850" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" rows={3} className={inputClass} />
        </div>

        {/* Co-borrower toggle */}
        <div className="border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={addCoBorrower}
              onChange={(e) => setAddCoBorrower(e.target.checked)}
              className="rounded border-gray-300 text-[#003087] focus:ring-[#003087]"
            />
            <span className="text-sm font-medium text-gray-700">Add Co-Borrower</span>
          </label>
        </div>

        {/* Co-borrower fields */}
        {addCoBorrower && (
          <div className="space-y-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Co-Borrower</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input name="co_borrower_first_name" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input name="co_borrower_last_name" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input name="co_borrower_email" type="email" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input name="co_borrower_phone" type="tel" className={inputClass} />
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#003087] text-white px-5 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Contact'}
          </button>
          <Link
            href="/dashboard/contacts"
            className="px-5 py-2 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
