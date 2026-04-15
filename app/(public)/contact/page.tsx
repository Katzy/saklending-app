'use client'

import { useState } from 'react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setForm({ name: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="bg-white rounded shadow-sm p-8">
        <h2 className="text-2xl font-bold text-[#003087] text-center mb-6">Contact Us</h2>

        {status === 'success' ? (
          <div className="text-center py-6">
            <p className="text-gray-700 font-medium">Thank you for your message.</p>
            <p className="text-gray-500 text-sm mt-1">We will get back to you soon! — SAK Lending Team</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 text-[#003087] text-sm underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && (
              <div className="bg-red-50 text-red-700 rounded p-3 text-sm">
                Failed to send message. Please try again.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087] resize-y"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-[#003087] text-white py-2 rounded font-medium hover:bg-[#002269] transition-colors disabled:opacity-60"
            >
              {status === 'submitting' ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500 text-center">
          <p>Email: info@saklending.com &nbsp;|&nbsp; Phone: (401) 677-7359</p>
        </div>
      </div>
    </div>
  )
}
