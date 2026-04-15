'use client'

import { useState } from 'react'

type Results = {
  monthlyPI: string
  monthlyIO: string
  ltv: string
  capRate: string
  dscr: string
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CalculatorPage() {
  const [form, setForm] = useState({
    purchasePrice: '', loanAmount: '', noi: '', ltv: '', interestRate: '', loanTerm: '',
  })
  const [results, setResults] = useState<Results | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: value }
      const price = parseFloat(next.purchasePrice) || 0
      const loan = parseFloat(next.loanAmount) || 0
      const ltv = parseFloat(next.ltv) || 0

      if (name === 'ltv' && price > 0 && !isNaN(parseFloat(value))) {
        next.loanAmount = Math.round((parseFloat(value) / 100) * price).toString()
      } else if (name === 'purchasePrice' && price > 0) {
        if (ltv > 0) next.loanAmount = Math.round((ltv / 100) * price).toString()
        else if (loan > 0) next.ltv = ((loan / price) * 100).toFixed(2)
      } else if (name === 'loanAmount' && loan > 0 && price > 0) {
        next.ltv = ((loan / price) * 100).toFixed(2)
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const price = parseFloat(form.purchasePrice)
    const principal = parseFloat(form.loanAmount)
    const noi = parseFloat(form.noi)
    const ltv = parseFloat(form.ltv)
    const monthlyRate = parseFloat(form.interestRate) / 100 / 12
    const payments = parseFloat(form.loanTerm) * 12

    if (!price || price <= 0) return setError('Purchase Price must be greater than 0')
    if (!principal || principal <= 0) return setError('Loan Amount must be greater than 0')
    if (principal > price) return setError('Loan Amount cannot exceed Purchase Price')
    if (!noi || noi <= 0) return setError('NOI must be greater than 0')
    if (!ltv || ltv < 0 || ltv > 100) return setError('LTV must be between 0% and 100%')
    if (!monthlyRate || monthlyRate <= 0) return setError('Interest Rate must be greater than 0')
    if (!payments || payments <= 0) return setError('Loan Term must be greater than 0')

    const x = Math.pow(1 + monthlyRate, payments)
    const monthlyPI = (principal * x * monthlyRate) / (x - 1)
    const monthlyIO = principal * monthlyRate
    const capRate = (noi / price) * 100
    const dscr = (noi / 12) / monthlyPI

    if (!isFinite(monthlyPI)) return setError('Please check your numbers')

    setResults({
      monthlyPI: fmt(monthlyPI),
      monthlyIO: fmt(monthlyIO),
      ltv: ltv.toFixed(2),
      capRate: capRate.toFixed(2),
      dscr: dscr.toFixed(2),
    })
  }

  const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]'
  const labelClass = 'block text-sm font-medium mb-1'

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded shadow-sm p-8">
        <h2 className="text-2xl font-bold text-[#003087] text-center mb-6">Loan Calculator</h2>

        {error && (
          <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">{error}</div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          <form onSubmit={handleSubmit} className="flex-1 space-y-3">
            <div>
              <label className={labelClass}>Purchase Price ($)</label>
              <input name="purchasePrice" type="number" min="0" value={form.purchasePrice} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Loan Amount ($)</label>
              <input name="loanAmount" type="number" min="0" value={form.loanAmount} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>LTV (%)</label>
              <input name="ltv" type="number" min="0" max="100" step="0.01" value={form.ltv} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Net Operating Income / yr ($)</label>
              <input name="noi" type="number" min="0" value={form.noi} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Interest Rate (%)</label>
              <input name="interestRate" type="number" min="0" step="0.01" value={form.interestRate} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Loan Term (years)</label>
              <input name="loanTerm" type="number" min="1" value={form.loanTerm} onChange={handleChange} className={inputClass} />
            </div>
            <button
              type="submit"
              className="w-full bg-[#003087] text-white py-2 rounded font-medium hover:bg-[#002269] transition-colors"
            >
              Calculate
            </button>
          </form>

          {results && (
            <div className="flex-1 bg-gray-50 rounded p-5 space-y-3">
              <h3 className="font-semibold text-[#003087] mb-2">Results</h3>
              {[
                { label: 'Monthly P&I', value: `$${results.monthlyPI}` },
                { label: 'Monthly Interest Only', value: `$${results.monthlyIO}` },
                { label: 'LTV', value: `${results.ltv}%` },
                { label: 'Cap Rate', value: `${results.capRate}%` },
                { label: 'DSCR', value: results.dscr },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-200 pb-2">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-1">
                For illustrative purposes only. Contact SAK Lending for a personalized quote.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
