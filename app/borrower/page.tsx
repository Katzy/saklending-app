'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import RequestLoanForm from '@/components/borrower/RequestLoanForm'

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
}

type Property = {
  id: string
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  property_type: string | null
}

const STAGE_COLORS: Record<string, string> = {
  lead:         'bg-gray-100 text-gray-600',
  qualified:    'bg-blue-100 text-blue-700',
  application:  'bg-yellow-100 text-yellow-700',
  underwriting: 'bg-purple-100 text-purple-700',
  approved:     'bg-green-100 text-green-700',
  funded:       'bg-emerald-100 text-emerald-700',
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'In Review',
  qualified: 'Qualified',
  application: 'Application',
  underwriting: 'Underwriting',
  approved: 'Approved',
  funded: 'Funded',
}

export default function BorrowerHomePage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequest, setShowRequest] = useState(false)

  async function load() {
    const [loansRes, propsRes] = await Promise.all([
      fetch('/api/borrower/loans'),
      fetch('/api/borrower/properties'),
    ])
    const loansData = await loansRes.json()
    const propsData = await propsRes.json()
    setLoans(Array.isArray(loansData) ? loansData : [])
    setProperties(Array.isArray(propsData) ? propsData : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Loans</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track the status of your loan applications.</p>
        </div>
        <button onClick={() => setShowRequest(true)}
          className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070]">
          + Request Loan
        </button>
      </div>

      {showRequest && (
        <RequestLoanForm
          properties={properties}
          onCancel={() => setShowRequest(false)}
          onSuccess={() => { setShowRequest(false); load() }}
        />
      )}

      {loading && <p className="text-gray-400">Loading...</p>}

      {!loading && loans.length === 0 && !showRequest && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-500">No active loans on file yet.</p>
          <p className="text-gray-400 text-sm mt-1">Use the button above to submit a loan request.</p>
        </div>
      )}

      <div className="space-y-3">
        {loans.map((loan) => (
          <Link
            key={loan.id}
            href={`/borrower/loans/${loan.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[#003087] hover:shadow-sm transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">
                  {loan.address_city
                    ? `${loan.address_city}, ${loan.address_state ?? ''}`
                    : loan.property_type ?? 'Property'}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {[
                    loan.loan_program?.replace('_', ' '),
                    loan.loan_purpose,
                    loan.loan_amount ? `$${Number(loan.loan_amount).toLocaleString()}` : null,
                  ].filter(Boolean).join(' · ')}
                </p>
                {loan.address_street && (
                  <p className="text-xs text-gray-400 mt-1">{loan.address_street}</p>
                )}
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${STAGE_COLORS[loan.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                {STAGE_LABELS[loan.stage] ?? loan.stage}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
