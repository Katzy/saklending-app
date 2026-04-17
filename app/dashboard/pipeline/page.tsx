'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

type Loan = {
  id: string
  created_at: string
  contact_id: string
  loan_amount: number | null
  loan_purpose: string | null
  loan_program: string | null
  property_type: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  stage: string
  is_dead: boolean
  dead_reason: string | null
}

const STAGES = [
  { key: 'lead',          label: 'Lead' },
  { key: 'qualified',     label: 'Qualified' },
  { key: 'application',   label: 'Application' },
  { key: 'underwriting',  label: 'Underwriting' },
  { key: 'approved',      label: 'Approved' },
  { key: 'funded',        label: 'Funded' },
]

const STAGE_HEADER_COLORS: Record<string, string> = {
  lead:         'bg-gray-100 text-gray-700',
  qualified:    'bg-blue-100 text-blue-700',
  application:  'bg-yellow-100 text-yellow-700',
  underwriting: 'bg-purple-100 text-purple-700',
  approved:     'bg-green-100 text-green-700',
  funded:       'bg-emerald-100 text-emerald-700',
}

function fmt(amount: number | null) {
  if (!amount) return null
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

export default function PipelinePage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [contactMap, setContactMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showDead, setShowDead] = useState(false)
  const [showFunded, setShowFunded] = useState(false)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const draggingId = useRef<string | null>(null)

  useEffect(() => {
    fetch('/api/loans?page=1')
      .then((r) => r.json())
      .then(async (json) => {
        const data: Loan[] = json.data ?? []
        setLoans(data)
        // Fetch borrower last names
        const ids = Array.from(new Set(data.map((l) => l.contact_id).filter(Boolean)))
        if (ids.length) {
          const res = await fetch(`/api/contacts?page=1&limit=500`)
          const cj = await res.json()
          const map: Record<string, string> = {}
          for (const c of (cj.data ?? [])) map[c.id] = c.last_name
          setContactMap(map)
        }
        setLoading(false)
      })
  }, [])

  const active  = loans.filter((l) => !l.is_dead)
  const dead    = loans.filter((l) => l.is_dead)
  const funded  = active.filter((l) => l.stage === 'funded')
  const byStage = (stage: string) => {
    const stageLoans = active.filter((l) => l.stage === stage)
    if (stage === 'funded' && !showFunded) return stageLoans.slice(0, 1)
    return stageLoans
  }

  function handleDragStart(e: React.DragEvent, loanId: string) {
    draggingId.current = loanId
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, stage: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }

  function handleDragLeave() {
    setDragOverStage(null)
  }

  async function handleDrop(e: React.DragEvent, newStage: string) {
    e.preventDefault()
    setDragOverStage(null)
    const id = draggingId.current
    if (!id) return

    const loan = loans.find((l) => l.id === id)
    if (!loan || loan.stage === newStage) return

    // Optimistic update
    setLoans((prev) => prev.map((l) => l.id === id ? { ...l, stage: newStage } : l))

    const res = await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })

    if (!res.ok) {
      // Revert on failure
      setLoans((prev) => prev.map((l) => l.id === id ? { ...l, stage: loan.stage } : l))
    }

    draggingId.current = null
  }

  function handleDragEnd() {
    setDragOverStage(null)
    draggingId.current = null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showFunded}
              onChange={(e) => setShowFunded(e.target.checked)}
              className="rounded"
            />
            Show Funded ({funded.length})
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDead}
              onChange={(e) => setShowDead(e.target.checked)}
              className="rounded"
            />
            Show Dead / Withdrawn ({dead.length})
          </label>
          <Link
            href="/dashboard/loans/new"
            className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070]"
          >
            + New Loan
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading...</div>
      ) : (
        <>
          {/* Kanban */}
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map(({ key, label }) => {
              const cards = byStage(key)
              const isOver = dragOverStage === key
              return (
                <div
                  key={key}
                  className="flex-shrink-0 w-48"
                  onDragOver={(e) => handleDragOver(e, key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, key)}
                >
                  <div className={`flex items-center justify-between px-3 py-2 rounded-t text-xs font-semibold ${STAGE_HEADER_COLORS[key]}`}>
                    <span>{label}</span>
                    <span className="bg-white bg-opacity-60 rounded-full px-1.5 py-0.5">
                      {key === 'funded' ? funded.length : cards.length}
                    </span>
                  </div>
                  <div className={`border border-gray-200 border-t-0 rounded-b min-h-[200px] p-2 space-y-2 transition-colors ${
                    isOver ? 'bg-blue-50 border-[#003087]' : 'bg-gray-50'
                  }`}>
                    {cards.map((loan) => (
                      <div
                        key={loan.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, loan.id)}
                        onDragEnd={handleDragEnd}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <Link
                          href={`/dashboard/loans/${loan.id}`}
                          draggable={false}
                          onClick={(e) => {
                            // Prevent navigation if we just finished dragging
                            if (draggingId.current) e.preventDefault()
                          }}
                          className="block bg-white rounded border border-gray-200 p-3 hover:border-[#003087] hover:shadow-sm transition text-sm select-none"
                        >
                          <p className="font-medium text-gray-900 truncate text-xs">
                            {loan.address_street ?? loan.address_city ?? loan.property_type ?? 'Loan'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {[loan.address_city, loan.address_state].filter(Boolean).join(', ')}
                          </p>
                          {loan.loan_amount && (
                            <p className="text-[#003087] font-semibold mt-0.5">{fmt(loan.loan_amount)}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1 capitalize">
                            {[loan.loan_program, loan.loan_purpose].filter(Boolean).join(' · ')}
                          </p>
                          {contactMap[loan.contact_id] && (
                            <p className="text-xs text-gray-400 truncate">{contactMap[loan.contact_id]}</p>
                          )}
                        </Link>
                      </div>
                    ))}
                    {cards.length === 0 && (
                      <p className={`text-xs text-center pt-6 ${isOver ? 'text-[#003087]' : 'text-gray-400'}`}>
                        {isOver ? 'Drop here' : 'Empty'}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Dead / Withdrawn */}
          {showDead && dead.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Dead / Withdrawn ({dead.length})
              </h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Property</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Amount</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Program</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dead.map((loan) => (
                      <tr key={loan.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <Link href={`/dashboard/loans/${loan.id}`} className="text-[#003087] hover:underline">
                            {loan.address_street ?? loan.address_city ?? loan.property_type ?? 'Loan'}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-gray-700">{fmt(loan.loan_amount) ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-600 capitalize">{loan.loan_program ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-500">{loan.dead_reason ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
