'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type ClosedLoan = {
  id: string
  loan_amount: number | null
  loan_purpose: string | null
  loan_program: string | null
  property_type: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  image_url: string | null
}

function streetViewUrl(loan: ClosedLoan) {
  if (!loan.address_street) return null
  const address = [loan.address_street, loan.address_city, loan.address_state, loan.address_zip]
    .filter(Boolean).join(', ')
  return `/api/streetview?address=${encodeURIComponent(address)}&width=600&height=400`
}

type Rate = { name: string; today: string; thirtyDaysAgo: string }

export default function HomePage() {
  const [rates, setRates] = useState<Rate[]>([])
  const [ratesError, setRatesError] = useState<string | null>(null)
  const [ratesLoading, setRatesLoading] = useState(true)
  const [closedLoans, setClosedLoans] = useState<ClosedLoan[]>([])

  useEffect(() => {
    // Fetch recently closed loans (always runs)
    fetch('/api/closed-loans')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setClosedLoans(Array.isArray(data) ? data : []))
      .catch(() => {})

    // Check localStorage cache (1 hour)
    const cached = localStorage.getItem('sakRates')
    const cachedTime = localStorage.getItem('sakRatesTime')
    if (cached && cachedTime && Date.now() - parseInt(cachedTime) < 3_600_000) {
      const parsed: Rate[] = JSON.parse(cached)
      if (parsed.length && !parsed.every(r => r.today === 'N/A')) {
        setRates(parsed)
        setRatesLoading(false)
        return
      }
    }

    // Single request — server fetches all series sequentially to avoid FRED rate limits
    fetch('/api/rates/all')
      .then((r) => r.ok ? r.json() : null)
      .then((data: Rate[] | null) => {
        if (data && Array.isArray(data) && data.length) {
          setRates(data)
          localStorage.setItem('sakRates', JSON.stringify(data))
          localStorage.setItem('sakRatesTime', Date.now().toString())
          setRatesError(null)
        } else {
          setRatesError('Unable to load rates. Please try again later.')
        }
        setRatesLoading(false)
      })
      .catch(() => {
        setRatesError('Unable to load rates. Please try again later.')
        setRatesLoading(false)
      })

  }, [])

  return (
    <>
      {/* Hero + Rates — desktop: side by side, mobile: stacked */}

      {/* Desktop hero (hidden on mobile) */}
      <div className="hidden md:block relative w-full" style={{ height: '66.67vh' }}>
        {/* Hero image (left 2/3) */}
        <div className="absolute inset-0 right-[33.33%]">
          <Image
            src="/office1.jpg"
            alt="SAK Lending"
            fill
            className="object-cover opacity-70"
            priority
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="text-center text-white px-4 py-3 rounded"
              style={{ background: 'rgba(0,0,0,0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              <h2 className="text-3xl font-bold mb-2">Expert Lending Solutions</h2>
              <p className="text-base">&ldquo;Unlock your business potential with tailored financing.&rdquo;</p>
              <p className="text-base">&ldquo;Competitive rates, personalized service.&rdquo;</p>
              <div className="mt-4 flex gap-3 justify-center">
                <Link href="/quote" className="bg-[#003087] text-white px-5 py-2 rounded font-semibold hover:bg-[#002269] transition-colors text-sm">
                  Get a Quote
                </Link>
                <Link href="/calculator" className="bg-white text-[#003087] px-5 py-2 rounded font-semibold hover:bg-gray-100 transition-colors text-sm">
                  Loan Calculator
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Rates table (right 1/3) */}
        <div className="absolute top-0 right-0 bottom-0 w-[33.33%] bg-[powderblue] flex flex-col overflow-hidden">
          {ratesError && (
            <div className="bg-red-100 text-red-700 text-xs p-2 text-center">{ratesError}</div>
          )}
          <table className="w-full h-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="bg-[#003087] text-white px-2 py-2 text-xs text-left border border-gray-200">Rate</th>
                <th className="bg-[#003087] text-white px-2 py-2 text-xs text-center border border-gray-200">Today</th>
                <th className="bg-[#003087] text-white px-2 py-2 text-xs text-center border border-gray-200">30d Ago</th>
              </tr>
            </thead>
            <tbody>
              {ratesLoading
                ? Array.from({ length: 13 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={3} className="px-2 py-1 text-xs text-center text-gray-400 border border-gray-200 bg-[powderblue]">Loading…</td>
                    </tr>
                  ))
                : rates.map((rate, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1 text-xs border border-gray-200 bg-[powderblue]">{rate.name}</td>
                      <td className="px-2 py-1 text-xs text-center border border-gray-200 bg-[powderblue]">{rate.today}</td>
                      <td className="px-2 py-1 text-xs text-center border border-gray-200 bg-[powderblue]">{rate.thirtyDaysAgo}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 text-center py-1" suppressHydrationWarning>Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Mobile hero (hidden on desktop) */}
      <div className="md:hidden">
        {/* Hero image */}
        <div className="relative w-full h-52">
          <Image src="/office1.jpg" alt="SAK Lending" fill className="object-cover opacity-70" priority />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div
              className="text-center text-white px-4 py-3 rounded w-full max-w-sm"
              style={{ background: 'rgba(0,0,0,0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              <h2 className="text-xl font-bold mb-1">Expert Lending Solutions</h2>
              <p className="text-xs mb-3">Competitive rates, personalized service.</p>
              <div className="flex gap-2 justify-center">
                <Link href="/quote" className="bg-[#003087] text-white px-4 py-1.5 rounded font-semibold hover:bg-[#002269] transition-colors text-xs">
                  Get a Quote
                </Link>
                <Link href="/calculator" className="bg-white text-[#003087] px-4 py-1.5 rounded font-semibold hover:bg-gray-100 transition-colors text-xs">
                  Calculator
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Rates table */}
        <div className="bg-[powderblue]">
          {ratesError && (
            <div className="bg-red-100 text-red-700 text-xs p-2 text-center">{ratesError}</div>
          )}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="bg-[#003087] text-white px-3 py-2 text-xs text-left border border-gray-200">Rate</th>
                <th className="bg-[#003087] text-white px-3 py-2 text-xs text-center border border-gray-200">Today</th>
                <th className="bg-[#003087] text-white px-3 py-2 text-xs text-center border border-gray-200">30d Ago</th>
              </tr>
            </thead>
            <tbody>
              {ratesLoading
                ? Array.from({ length: 13 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={3} className="px-3 py-1.5 text-xs text-center text-gray-400 border border-gray-200">Loading…</td>
                    </tr>
                  ))
                : rates.map((rate, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-xs border border-gray-200">{rate.name}</td>
                      <td className="px-3 py-1.5 text-xs text-center border border-gray-200">{rate.today}</td>
                      <td className="px-3 py-1.5 text-xs text-center border border-gray-200">{rate.thirtyDaysAgo}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 text-center py-1.5" suppressHydrationWarning>Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Services teaser */}
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-[#003087] mb-4">Commercial Loan Solutions</h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          SAK Lending provides end-to-end guidance through the complete loan process — from initial structuring to closing. We act as your dedicated debt concierge, navigating lenders, terms, and timelines on your behalf.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Purchase','Refinance','Ground Up Construction','Short Term Bridge','Small Balance DSCR','CMBS'].map(t => (
            <Link
              key={t}
              href="/services"
              className="border border-[#003087] text-[#003087] rounded px-4 py-3 text-sm font-medium hover:bg-[#003087] hover:text-white transition-colors"
            >
              {t}
            </Link>
          ))}
        </div>
      </div>

      {/* Recently Closed */}
      {closedLoans.length > 0 && (
        <div id="recently-closed" className="bg-gray-50 py-14">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-[#003087] text-center mb-2">Recently Closed</h2>
            <p className="text-gray-500 text-center text-sm mb-8">A sample of deals we&apos;ve recently funded</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {closedLoans.map((loan) => (
                <div key={loan.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  {(loan.image_url || streetViewUrl(loan)) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={loan.image_url ?? streetViewUrl(loan)!}
                      alt={loan.address_city ?? 'Property'}
                      className="h-44 w-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget
                        el.style.display = 'none'
                        el.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`h-44 bg-gradient-to-br from-[#003087] to-[#0050c8] flex items-center justify-center ${(loan.image_url || streetViewUrl(loan)) ? 'hidden' : ''}`}>
                    <span className="text-white text-4xl opacity-30">🏢</span>
                  </div>
                  <div className="p-4">
                    {loan.loan_amount && (
                      <p className="text-xl font-bold text-[#003087]">
                        ${loan.loan_amount >= 1_000_000
                          ? `${(loan.loan_amount / 1_000_000).toFixed(1)}M`
                          : `${(loan.loan_amount / 1_000).toFixed(0)}K`}
                      </p>
                    )}
                    <p className="text-sm text-gray-700 font-medium mt-0.5">
                      {[loan.loan_program, loan.loan_purpose]
                        .filter(Boolean)
                        .map((s) => s!.replace(/\bpermanent\b/gi, 'Long Term').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
                        .join(' · ')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {loan.property_type ?? ''}
                      {loan.address_city ? ` · ${loan.address_city}, ${loan.address_state ?? ''}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
