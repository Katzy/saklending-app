'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  onClose: () => void
  // Mode A: existing loan (handled on loan page, not here)
  // Mode B: existing contact
  contactId?: string
  contactName?: string
  contactEmail?: string
  // Mode C: ad-hoc (no contact or loan yet)
  adhoc?: boolean
}

export default function BrokerAgreementModal({
  onClose,
  contactId,
  contactName,
  contactEmail,
  adhoc = false,
}: Props) {
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [brokerFee, setBrokerFee] = useState('')
  const [twoBorrowers, setTwoBorrowers] = useState(false)
  const [borrower2Name, setBorrower2Name] = useState('')
  const [borrower2Email, setBorrower2Email] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setSending(true)
    setError(null)

    const payload: Record<string, string> = { broker_fee: brokerFee }

    if (contactId) {
      payload.contact_id = contactId
      payload.property_address = propertyAddress
    } else {
      payload.first_name = firstName
      payload.last_name = lastName
      payload.email = email
      payload.property_address = propertyAddress
    }

    if (twoBorrowers) {
      payload.borrower_2_name = borrower2Name
      payload.borrower_2_email = borrower2Email
    }

    const res = await fetch('/api/docuseal/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSending(false)

    if (!res.ok) {
      setError(json.error ?? 'Failed to send agreement')
      return
    }

    setSent(true)
    setTimeout(() => {
      onClose()
      // Navigate to the new loan if one was created
      if (json.loan_id) router.push(`/dashboard/loans/${json.loan_id}`)
    }, 1500)
  }

  const canSubmit =
    !!brokerFee &&
    !!propertyAddress &&
    (contactId || (firstName && lastName && email)) &&
    (!twoBorrowers || (borrower2Name && borrower2Email))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[480px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Send Broker Agreement</h2>
        <p className="text-sm text-gray-500 mb-4">
          {contactId
            ? `Sending to ${contactName}. A new loan will be created for this property.`
            : 'A new contact and loan will be created automatically.'}
        </p>

        <div className="space-y-4">
          {/* Ad-hoc: name + email fields */}
          {!contactId && (
            <>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="borrower@example.com"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Property Address</label>
            <input
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="123 Main St, Providence, RI 02903"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Broker Fee</label>
            <input
              value={brokerFee}
              onChange={(e) => setBrokerFee(e.target.value)}
              placeholder="e.g. 150 basis points (1.50%)"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={twoBorrowers}
              onChange={(e) => setTwoBorrowers(e.target.checked)}
              className="rounded"
            />
            Add a co-borrower
          </label>

          {twoBorrowers && (
            <div className="space-y-3 pl-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Co-Borrower Name</label>
                <input
                  value={borrower2Name}
                  onChange={(e) => setBorrower2Name(e.target.value)}
                  placeholder="Full name"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Co-Borrower Email</label>
                <input
                  type="email"
                  value={borrower2Email}
                  onChange={(e) => setBorrower2Email(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {sent && <p className="text-sm text-green-600 font-medium">Agreement sent successfully!</p>}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending || !canSubmit}
            className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send for Signature'}
          </button>
        </div>
      </div>
    </div>
  )
}
