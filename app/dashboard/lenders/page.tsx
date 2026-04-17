'use client'

import { useEffect, useRef, useState } from 'react'

const LENDER_TYPES = [
  { value: 'institutional', label: 'Institutional' },
  { value: 'alt_a',         label: 'Alt-A' },
  { value: 'private',       label: 'Private' },
  { value: 'dscr',          label: 'DSCR' },
]

const LOAN_PROGRAMS = [
  { value: 'bridge',    label: 'Bridge' },
  { value: 'long_term', label: 'Long Term' },
  { value: 'rehab',     label: 'Rehab' },
  { value: 'ground_up', label: 'Ground Up' },
  { value: 'dscr',      label: 'DSCR' },
  { value: 'cmbs',      label: 'CMBS' },
]

const LOAN_PURPOSES = [
  { value: 'purchase',  label: 'Purchase' },
  { value: 'refinance', label: 'Refinance' },
]

const PROPERTY_TYPES = [
  'Multifamily 5+ Units', 'Multifamily 2-4 Units', 'Mixed Use', 'Office', 'Retail',
  'Industrial', 'Warehouse', 'Self Storage', 'Hotel / Motel', 'Mobile Home Park',
  'Senior Housing', 'Student Housing', 'Single Family', 'Condo', 'Townhouse',
  'Land', 'Gas Station', 'Car Wash', 'Auto Dealer', 'Restaurant',
  'Medical Office', 'Assisted Living', 'Church', 'Special Purpose',
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

type Lender = {
  id: string
  company: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  lender_type: string | null
  states: string[]
  loan_programs: string[]
  loan_purposes: string[]
  property_types: string[]
  preferred_property_types: string[]
  min_loan_amount: number | null
  max_loan_amount: number | null
  notes: string | null
  active: boolean
}

const BLANK: Partial<Lender> = {
  company: '', contact_name: '', email: '', phone: '',
  lender_type: null, states: [], loan_programs: [], loan_purposes: [],
  property_types: [], preferred_property_types: [],
  min_loan_amount: null, max_loan_amount: null, notes: '', active: true,
}

function fmt$(n: number | null) {
  if (!n) return ''
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function toggleArr(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

export default function LendersPage() {
  const [lenders, setLenders] = useState<Lender[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Partial<Lender>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addDraft, setAddDraft] = useState<Partial<Lender>>(BLANK)
  const [addSaving, setAddSaving] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const csvRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch('/api/lenders')
    const data = await res.json()
    setLenders(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function getDraft(lender: Lender): Partial<Lender> {
    return drafts[lender.id] ?? lender
  }

  function setDraft(id: string, patch: Partial<Lender>) {
    setDrafts(d => ({ ...d, [id]: { ...(drafts[id] ?? lenders.find(l => l.id === id)!), ...patch } }))
  }

  async function save(id: string) {
    const draft = drafts[id]
    if (!draft) return
    setSaving(id)
    await fetch(`/api/lenders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    await load()
    setDrafts(d => { const n = { ...d }; delete n[id]; return n })
    setSaving(null)
  }

  async function addLender() {
    setAddSaving(true)
    await fetch('/api/lenders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addDraft),
    })
    await load()
    setAddDraft(BLANK)
    setShowAdd(false)
    setAddSaving(false)
  }

  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg('Importing...')
    const text = await file.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
    const rows = lines.slice(1).map(line => {
      // Handle quoted CSV fields
      const vals: string[] = []
      let cur = '', inQuote = false
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote }
        else if (ch === ',' && !inQuote) { vals.push(cur.trim()); cur = '' }
        else { cur += ch }
      }
      vals.push(cur.trim())
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
    }).filter(r => Object.values(r).some(v => v))

    const res = await fetch('/api/lenders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
    const json = await res.json()
    if (res.ok) {
      setImportMsg(`Imported ${json.inserted} lenders.`)
      await load()
    } else {
      setImportMsg(`Import failed: ${json.error}`)
    }
    if (csvRef.current) csvRef.current.value = ''
    setTimeout(() => setImportMsg(''), 4000)
  }

  const filtered = lenders.filter(l => {
    if (typeFilter !== 'all' && l.lender_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        l.company?.toLowerCase().includes(q) ||
        l.contact_name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Banks & Lenders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{lenders.filter(l => l.active).length} active lenders</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {importMsg && <span className="text-sm text-gray-600">{importMsg}</span>}
          <input ref={csvRef} type="file" accept=".csv" onChange={handleCsv} className="hidden" />
          <button onClick={() => csvRef.current?.click()}
            className="border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-50">
            Import CSV
          </button>
          <button onClick={() => { setShowAdd(true); setExpandedId(null) }}
            className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070]">
            + Add Lender
          </button>
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[{ value: 'all', label: 'All' }, ...LENDER_TYPES].map(t => (
          <button key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              typeFilter === t.value
                ? 'border-[#003087] text-[#003087]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            <span className="ml-1.5 text-xs text-gray-400">
              {t.value === 'all'
                ? lenders.length
                : lenders.filter(l => l.lender_type === t.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        placeholder="Search by company, name, or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:border-[#003087]"
      />

      {/* Add form */}
      {showAdd && (
        <div className="bg-white border border-[#003087] rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New Lender</h2>
          <LenderForm draft={addDraft} onChange={patch => setAddDraft(d => ({ ...d, ...patch }))} />
          <div className="flex gap-2 mt-4">
            <button onClick={addLender} disabled={addSaving}
              className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
              {addSaving ? 'Saving...' : 'Save Lender'}
            </button>
            <button onClick={() => { setShowAdd(false); setAddDraft(BLANK) }}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-gray-400 text-sm">Loading...</p>}

      {/* Table */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-500">No lenders found.</p>
        </div>
      )}

      <div className="space-y-1">
        {filtered.map(lender => {
          const expanded = expandedId === lender.id
          const draft = getDraft(lender)
          const isDirty = !!drafts[lender.id]

          return (
            <div key={lender.id} className={`bg-white rounded-lg border ${expanded ? 'border-[#003087]' : 'border-gray-200'} overflow-hidden`}>
              {/* Row summary */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => setExpandedId(expanded ? null : lender.id)}
              >
                <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-2 items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{lender.company || '—'}</p>
                    <p className="text-xs text-gray-500 truncate">{lender.contact_name || ''}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600 truncate">{lender.email || '—'}</p>
                    <p className="text-xs text-gray-400 truncate">{lender.phone || ''}</p>
                  </div>
                  <div className="hidden md:block">
                    {lender.lender_type && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {LENDER_TYPES.find(t => t.value === lender.lender_type)?.label}
                      </span>
                    )}
                  </div>
                  <div className="hidden md:block text-xs text-gray-500">
                    {[
                      lender.loan_programs.map(p => LOAN_PROGRAMS.find(x => x.value === p)?.label).filter(Boolean).join(', '),
                      (lender.min_loan_amount || lender.max_loan_amount)
                        ? `${fmt$(lender.min_loan_amount) || '—'} – ${fmt$(lender.max_loan_amount) || '—'}`
                        : null,
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className="text-gray-400 text-xs ml-2">{expanded ? '▲' : '▼'}</span>
              </div>

              {/* Expanded edit panel */}
              {expanded && (
                <div className="border-t border-gray-100 px-4 py-5">
                  <LenderForm draft={draft} onChange={patch => setDraft(lender.id, patch)} />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => save(lender.id)}
                      disabled={!isDirty || saving === lender.id}
                      className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50"
                    >
                      {saving === lender.id ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setDrafts(d => { const n = { ...d }; delete n[lender.id]; return n }) }}
                      disabled={!isDirty}
                      className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-40"
                    >
                      Revert
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LenderForm({ draft, onChange }: { draft: Partial<Lender>; onChange: (p: Partial<Lender>) => void }) {
  const pts = draft.property_types ?? []
  const prefs = draft.preferred_property_types ?? []
  const states = draft.states ?? []
  const programs = draft.loan_programs ?? []
  const purposes = draft.loan_purposes ?? []

  return (
    <div className="space-y-5">
      {/* Basic info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Company / Bank</label>
          <input value={draft.company ?? ''} onChange={e => onChange({ company: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Contact Name</label>
          <input value={draft.contact_name ?? ''} onChange={e => onChange({ contact_name: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</label>
          <input type="email" value={draft.email ?? ''} onChange={e => onChange({ email: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone</label>
          <input value={draft.phone ?? ''} onChange={e => onChange({ phone: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
      </div>

      {/* Type + loan range */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Lender Type</label>
          <select value={draft.lender_type ?? ''} onChange={e => onChange({ lender_type: e.target.value || null })}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
            <option value="">— Select —</option>
            {LENDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Min Loan</label>
          <input type="number" value={draft.min_loan_amount ?? ''} onChange={e => onChange({ min_loan_amount: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g. 500000"
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Max Loan</label>
          <input type="number" value={draft.max_loan_amount ?? ''} onChange={e => onChange({ max_loan_amount: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g. 10000000"
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Active</label>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={draft.active ?? true} onChange={e => onChange({ active: e.target.checked })} className="rounded" />
            <span className="text-sm text-gray-700">Active</span>
          </label>
        </div>
      </div>

      {/* Loan programs */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Loan Programs</label>
        <div className="flex flex-wrap gap-2">
          {LOAN_PROGRAMS.map(p => (
            <label key={p.value} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={programs.includes(p.value)}
                onChange={() => onChange({ loan_programs: toggleArr(programs, p.value) })}
                className="rounded" />
              <span className="text-sm text-gray-700">{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Loan purposes */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Loan Purposes</label>
        <div className="flex gap-4">
          {LOAN_PURPOSES.map(p => (
            <label key={p.value} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={purposes.includes(p.value)}
                onChange={() => onChange({ loan_purposes: toggleArr(purposes, p.value) })}
                className="rounded" />
              <span className="text-sm text-gray-700">{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Property types — Does + Prefers (star) */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Property Types</label>
        <p className="text-xs text-gray-400 mb-2">Check = does it. Star (⭐) = prefers it.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1.5">
          {PROPERTY_TYPES.map(pt => {
            const does = pts.includes(pt)
            const pref = prefs.includes(pt)
            return (
              <div key={pt} className="flex items-center gap-1.5">
                <input type="checkbox" checked={does}
                  onChange={() => {
                    const newPts = toggleArr(pts, pt)
                    const newPrefs = newPts.includes(pt) ? prefs : prefs.filter(p => p !== pt)
                    onChange({ property_types: newPts, preferred_property_types: newPrefs })
                  }}
                  className="rounded flex-shrink-0" />
                <span className={`text-sm flex-1 ${does ? 'text-gray-800' : 'text-gray-400'}`}>{pt}</span>
                {does && (
                  <button type="button"
                    onClick={() => onChange({ preferred_property_types: toggleArr(prefs, pt) })}
                    className={`text-sm flex-shrink-0 ${pref ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}
                    title="Mark as preferred">
                    ★
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* States */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          States ({states.length} selected)
          <button type="button" onClick={() => onChange({ states: states.length === US_STATES.length ? [] : [...US_STATES] })}
            className="ml-2 text-[#003087] hover:underline normal-case font-normal">
            {states.length === US_STATES.length ? 'Deselect all' : 'Select all'}
          </button>
        </label>
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-1">
          {US_STATES.map(s => (
            <label key={s} className={`flex items-center justify-center text-xs py-1 rounded border cursor-pointer transition-colors ${
              states.includes(s)
                ? 'bg-[#003087] text-white border-[#003087]'
                : 'text-gray-500 border-gray-200 hover:border-gray-400'
            }`}>
              <input type="checkbox" checked={states.includes(s)}
                onChange={() => onChange({ states: toggleArr(states, s) })}
                className="sr-only" />
              {s}
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</label>
        <textarea rows={2} value={draft.notes ?? ''} onChange={e => onChange({ notes: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] resize-y" />
      </div>
    </div>
  )
}
