'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type Contact = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  source: string
  entity_name: string | null
}

const SOURCE_LABELS: Record<string, string> = {
  quote_form: 'Quote Form',
  contact_form: 'Contact Form',
  manual: 'Manual',
}

export default function ContactsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const search = searchParams.get('search') ?? ''
  const source = searchParams.get('source') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 25

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (source) params.set('source', source)
    params.set('page', String(page))
    const res = await fetch(`/api/contacts?${params}`)
    const json = await res.json()
    setContacts(json.data ?? [])
    setCount(json.count ?? 0)
    setLoading(false)
  }, [search, source, page])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    if (key !== 'page') params.delete('page')
    router.push(`/dashboard/contacts?${params}`)
  }

  const totalPages = Math.ceil(count / pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <Link
          href="/dashboard/contacts/new"
          className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070]"
        >
          + New Contact
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === 'Enter') updateParam('search', (e.target as HTMLInputElement).value)
          }}
          onBlur={(e) => updateParam('search', e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-[#003087]"
        />
        <select
          value={source}
          onChange={(e) => updateParam('source', e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
        >
          <option value="">All Sources</option>
          <option value="quote_form">Quote Form</option>
          <option value="contact_form">Contact Form</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Phone</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Entity</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Source</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Added</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td>
              </tr>
            )}
            {!loading && contacts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No contacts found.</td>
              </tr>
            )}
            {!loading && contacts.map((c) => (
              <tr
                key={c.id}
                className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/dashboard/contacts/${c.id}`)}
              >
                <td className="px-4 py-3 font-medium text-[#003087]">
                  {c.first_name} {c.last_name}
                </td>
                <td className="px-4 py-3 text-gray-700">{c.email}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.entity_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                    {SOURCE_LABELS[c.source] ?? c.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 mt-4 text-sm text-gray-600">
          <span>{count} total</span>
          <div className="flex gap-1 ml-auto">
            {page > 1 && (
              <button
                onClick={() => updateParam('page', String(page - 1))}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            <span className="px-3 py-1">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <button
                onClick={() => updateParam('page', String(page + 1))}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
