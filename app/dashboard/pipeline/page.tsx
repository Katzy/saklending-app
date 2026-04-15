'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Loan = {
  id: string
  created_at: string
  contact_id: string
  loan_amount: number | null
  loan_purpose: string | null
  loan_program: string | null
  property_type: string | null
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
  const [loading, setLoading] = useState(true)
  const [showDead, setShowDead] = useState(false)

  useEffect(() => {
    fetch('/api/loans?page=1')
      .then((r) => r.json())
      .then((json) => { setLoans(json.data ?? []); setLoading(false) })
  }, [])

  const active = loans.filter((l) => !l.is_dead)
  const dead   = loans.filter((l) => l.is_dead)

  const byStage = (stage: string) => active.filter((l) => l.stage === stage)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <div className="flex gap-3 items-center">
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
              return (
                <div key={key} className="flex-shrink-0 w-48">
                  <div className={`flex items-center justify-between px-3 py-2 rounded-t text-xs font-semibold ${STAGE_HEADER_COLORS[key]}`}>
                    <span>{label}</span>
                    <span className="bg-white bg-opacity-60 rounded-full px-1.5 py-0.5">{cards.length}</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 border-t-0 rounded-b min-h-[200px] p-2 space-y-2">
                    {cards.map((loan) => (
                      <Link
                        key={loan.id}
                        href={`/dashboard/loans/${loan.id}`}
                        className="block bg-white rounded border border-gray-200 p-3 hover:border-[#003087] hover:shadow-sm transition text-sm"
                      >
                        <p className="font-medium text-gray-900 truncate">
                          {loan.address_city
                            ? `${loan.address_city}, ${loan.address_state ?? ''}`
                            : (loan.property_type ?? 'Loan')}
                        </p>
                        {loan.loan_amount && (
                          <p className="text-[#003087] font-semibold mt-0.5">{fmt(loan.loan_amount)}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1 capitalize">
                          {[loan.loan_program, loan.loan_purpose].filter(Boolean).join(' · ')}
                        </p>
                      </Link>
                    ))}
                    {cards.length === 0 && (
                      <p className="text-xs text-gray-400 text-center pt-6">Empty</p>
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
                            {loan.address_city
                              ? `${loan.address_city}, ${loan.address_state ?? ''}`
                              : (loan.property_type ?? 'Loan')}
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
