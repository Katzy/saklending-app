'use client'

import { useState } from 'react'

const LOAN_TYPES = [
  {
    title: 'New Purchase',
    description: 'Our New Purchase Loan is designed for acquiring commercial properties, offering competitive rates and flexible terms to help you secure your investment. Ideal for businesses looking to expand their real estate portfolio, this loan provides streamlined financing with customized repayment options to suit your financial goals.',
  },
  {
    title: 'Ground Up Construction',
    description: 'Ground Up Construction Loans support the development of new commercial projects from the ground up. These loans provide funding for land acquisition, construction costs, and related expenses, with tailored disbursement schedules to align with your project milestones.',
  },
  {
    title: 'Fix & Flip',
    description: 'Fix and Flip Loans are tailored for investors looking to purchase, renovate, and resell commercial properties for profit. These short-term loans offer flexible terms and quick funding to support rapid project turnaround, helping you maximize returns on your investment.',
  },
  {
    title: 'SBA',
    description: 'Our SBA Loans, backed by the Small Business Administration, offer low interest rates and long repayment terms for small businesses. Ideal for purchasing real estate, equipment, or working capital, these loans provide affordable financing to support your business growth.',
  },
  {
    title: 'Bridge Loan',
    description: 'Bridge Loans provide short-term financing to bridge the gap between immediate capital needs and long-term funding solutions. Perfect for time-sensitive opportunities, these loans offer quick access to funds with flexible repayment options for commercial real estate transactions.',
  },
  {
    title: 'Private Money',
    description: 'Private Money Loans offer fast, flexible financing for unique or non-traditional commercial real estate projects. Sourced from private investors, these loans provide quick approvals and customized terms, ideal for borrowers needing expedited funding or facing unconventional lending scenarios.',
  },
  {
    title: 'Refinance (Cash Out)',
    description: 'Refinance Loans allow you to replace existing commercial property loans with better terms, lower rates, or adjusted repayment schedules. Ideal for optimizing your financing structure, these loans help reduce costs and improve cash flow for your real estate investments.',
  },
]

export default function ServicesPage() {
  const [active, setActive] = useState(0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white rounded shadow-sm p-8">
        <h2 className="text-2xl font-bold text-[#003087] text-center mb-6">Our Services</h2>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {LOAN_TYPES.map((lt, i) => (
            <button
              key={lt.title}
              onClick={() => setActive(i)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                active === i
                  ? 'bg-[#003087] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {lt.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="border border-gray-200 rounded p-5">
          <h3 className="text-lg font-semibold text-[#003087] mb-3">{LOAN_TYPES[active].title}</h3>
          <p className="text-gray-700 text-sm leading-relaxed">{LOAN_TYPES[active].description}</p>
        </div>
      </div>
    </div>
  )
}
