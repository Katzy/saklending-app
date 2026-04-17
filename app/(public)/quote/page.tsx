'use client'

import { useState } from 'react'
import { DateTime } from 'luxon'

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
]

const PROPERTY_TYPES = [
  'Multifamily 5+ Units','Multifamily 2-4 Units','Office','Retail','Industrial','Mixed-Use','Hotel',
  'Self-Storage','Mobile Home Park','Senior Housing','Student Housing',
  'Single Family','Residential Portfolio',
  'Commercial Portfolio','Medical Building','RV Park','Assisted Living',
  'Ground-Up Construction Site','Vacant Land','Other',
]

const LOAN_TYPES = [
  'Purchase (5 – 30 yr)',
  'Refinance (5 – 30 yr)',
  'Ground-Up Construction (12 – 36 mo)',
  'Bridge (6 mo – 3 yr)',
  'Small Balance DSCR (5 – 30 yr)',
  'CMBS (5 – 10 yr)',
]

function getThankYouMessage() {
  const now = DateTime.local().setZone('America/New_York')
  const isWeekend = now.weekday === 6 || now.weekday === 7
  const isFridayAfternoon = now.weekday === 5 && now.hour >= 12
  if (isWeekend || isFridayAfternoon) return 'We will reach out to you on Monday!'
  if (now.hour < 12) return 'One of our team will reach out to you by end of business today.'
  return 'One of our team will reach out to you within 24 hours.'
}

export default function QuotePage() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    loanAmount: '', propertyValue: '', noi: '', propertyType: '', loanType: '',
    addressStreet: '', addressCity: '', addressState: '', addressZip: '',
    comments: '',
  })
  const [alreadyOwned, setAlreadyOwned] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, alreadyOwned }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-bold text-[#003087] mb-2">Thank you for your inquiry.</h2>
          <p className="text-gray-600">Your business and your time are important to us.</p>
          <p className="text-gray-600 mt-1">{getThankYouMessage()}</p>
          <p className="text-gray-500 text-sm mt-1">— SAK Lending Team</p>
          <button
            onClick={() => { setStatus('idle'); setAlreadyOwned(false); setForm({ firstName:'',lastName:'',phone:'',email:'',loanAmount:'',propertyValue:'',noi:'',propertyType:'',loanType:'',addressStreet:'',addressCity:'',addressState:'',addressZip:'',comments:'' }) }}
            className="mt-6 text-[#003087] text-sm underline"
          >
            Submit another request
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded shadow-sm p-8">
        <h2 className="text-2xl font-bold text-[#003087] text-center mb-6">Request a Quote</h2>

        {status === 'error' && (
          <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">
            Failed to submit. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input required value={form.firstName} onChange={set('firstName')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input required value={form.lastName} onChange={set('lastName')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone *</label>
              <input required type="tel" value={form.phone} onChange={set('phone')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={set('email')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loan Amount *</label>
              <input required type="number" min="0" value={form.loanAmount} onChange={set('loanAmount')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Property Value</label>
              <input type="number" min="0" value={form.propertyValue} onChange={set('propertyValue')} placeholder="Purchase price or current value"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">NOI</label>
              <input type="number" min="0" value={form.noi} onChange={set('noi')} placeholder="Net operating income"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Property Street Address</label>
              <input value={form.addressStreet} onChange={set('addressStreet')} placeholder="123 Main St"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input value={form.addressCity} onChange={set('addressCity')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">State *</label>
                <select required value={form.addressState} onChange={set('addressState')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]">
                  <option value="">Select…</option>
                  {US_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zip</label>
                <input value={form.addressZip} onChange={set('addressZip')} maxLength={10}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={alreadyOwned}
                  onChange={(e) => setAlreadyOwned(e.target.checked)}
                  className="rounded"
                />
                I already own this property
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Property Type *</label>
              <select required value={form.propertyType} onChange={set('propertyType')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]">
                <option value="">Select type…</option>
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loan Type *</label>
              <select required value={form.loanType} onChange={set('loanType')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]">
                <option value="">Select type…</option>
                {LOAN_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Comments</label>
            <textarea rows={4} value={form.comments} onChange={set('comments')}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087] resize-y" />
          </div>
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full bg-[#003087] text-white py-2.5 rounded font-medium hover:bg-[#002269] transition-colors disabled:opacity-60"
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit Quote Request'}
          </button>
        </form>
      </div>
    </div>
  )
}
