import Link from 'next/link'

const LOAN_TYPES = [
  {
    title: 'Purchase',
    tagline: 'Acquisition financing for income-producing commercial real estate.',
    description: 'We source and structure purchase loans from a deep network of institutional and private lenders. Whether you\'re buying your first investment property or adding to a large portfolio, we match the deal to the right capital source and manage the process to closing.',
    attributes: [
      { label: 'Loan Size',      value: '$250K – $50M+' },
      { label: 'Max LTV',        value: 'Up to 80%' },
      { label: 'Term',           value: '3 – 30 years' },
      { label: 'Amortization',   value: '20 – 30 years' },
      { label: 'Recourse',       value: 'Full or partial' },
    ],
    propertyTypes: 'Multifamily · Mixed-Use · Office · Retail · Industrial · Self-Storage · Hospitality',
  },
  {
    title: 'Refinance',
    tagline: 'Lower your rate, pull equity, or restructure existing debt.',
    description: 'Rate-and-term or cash-out refinancing on stabilized commercial properties. We analyze your current loan against today\'s market and identify programs that improve your debt structure — whether the goal is reduced payments, liquidity, or positioning for a future sale.',
    attributes: [
      { label: 'Loan Size',      value: '$250K – $50M+' },
      { label: 'Max LTV',        value: 'Up to 75%' },
      { label: 'Term',           value: '5 – 30 years' },
      { label: 'Amortization',   value: '20 – 30 years' },
      { label: 'Cash-Out',       value: 'Available' },
    ],
    propertyTypes: 'Multifamily · Mixed-Use · Office · Retail · Industrial · NNN · Self-Storage',
  },
  {
    title: 'Ground-Up Construction',
    tagline: 'From lot to certificate of occupancy.',
    description: 'Construction financing for new commercial development. Loans are structured to cover land, hard costs, and soft costs with a draw schedule aligned to your construction timeline. We work with lenders who understand development timelines and can move through underwriting efficiently.',
    attributes: [
      { label: 'Loan Size',      value: '$1M – $100M+' },
      { label: 'Max LTC',        value: 'Up to 85%' },
      { label: 'Term',           value: '12 – 36 months' },
      { label: 'Draw Schedule',  value: 'Milestone-based' },
      { label: 'Recourse',       value: 'Typically full' },
    ],
    propertyTypes: 'Multifamily · Mixed-Use · Industrial · Self-Storage · Retail · Office',
  },
  {
    title: 'Short-Term Bridge',
    tagline: 'Fast, flexible financing for time-sensitive acquisitions and repositioning.',
    description: 'Bridge loans provide short-term capital to acquire, reposition, or stabilize a property while longer-term financing is arranged. They\'re ideal when speed is critical, a property needs lease-up before it qualifies for permanent debt, or a borrower needs to close before a conventional loan can be processed.',
    attributes: [
      { label: 'Loan Size',      value: '$250K – $50M+' },
      { label: 'Max LTV',        value: 'Up to 75%' },
      { label: 'Term',           value: '6 – 36 months' },
      { label: 'Payments',       value: 'Interest-only' },
      { label: 'Recourse',       value: 'Full or partial' },
    ],
    propertyTypes: 'Multifamily · Mixed-Use · Office · Retail · Industrial · Self-Storage · Hospitality',
  },
  {
    title: 'Small Balance DSCR',
    tagline: 'Cash flow-based underwriting for investment properties.',
    description: 'Debt service coverage ratio loans for stabilized income-producing properties. Underwriting focuses on property cash flow rather than personal income — making these a strong fit for investors with multiple properties, complex tax returns, or self-employment income.',
    attributes: [
      { label: 'Loan Size',      value: '$250K – $2.5M' },
      { label: 'Max LTV',        value: 'Up to 80%' },
      { label: 'Min DSCR',       value: '1.00x' },
      { label: 'Term',           value: '5 – 30 years' },
      { label: 'Amortization',   value: '25 – 30 years' },
    ],
    propertyTypes: 'Multifamily · Mixed-Use · Retail · NNN · Self-Storage · Industrial',
  },
  {
    title: 'CMBS',
    tagline: 'Fixed-rate, non-recourse financing for stabilized properties.',
    description: 'Commercial Mortgage-Backed Securities loans offer long-term fixed rates and non-recourse terms for stabilized, income-producing properties. Best suited for borrowers who want rate certainty and limited personal liability on larger, well-occupied assets.',
    attributes: [
      { label: 'Loan Size',      value: '$2M – $100M+' },
      { label: 'Max LTV',        value: 'Up to 75%' },
      { label: 'Term',           value: '5 – 10 years' },
      { label: 'Amortization',   value: '25 – 30 years' },
      { label: 'Recourse',       value: 'Non-recourse' },
    ],
    propertyTypes: 'Multifamily · Office · Retail · Industrial · Hospitality · Self-Storage · Mixed-Use',
  },
]

export default function ServicesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Loan Programs</h1>
        <p className="text-gray-500 max-w-xl mx-auto text-sm">
          SAK Lending arranges commercial real estate financing across six core programs.
          Every deal is different — we find the right fit for your property, timeline, and goals.
        </p>
      </div>

      <div className="space-y-6">
        {LOAN_TYPES.map((loan) => (
          <div key={loan.title} id={loan.title.toLowerCase().replace(/[\s()]/g, '-').replace(/-+/g, '-')} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#003087] px-6 py-4">
              <h2 className="text-lg font-bold text-white">{loan.title}</h2>
              <p className="text-blue-200 text-sm mt-0.5">{loan.tagline}</p>
            </div>

            <div className="p-6">
              {/* Description */}
              <p className="text-gray-600 text-sm leading-relaxed mb-6">{loan.description}</p>

              {/* Attributes grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-5">
                {loan.attributes.map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>

              {/* Property types */}
              <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-gray-500">
                <span className="font-medium text-gray-700 mr-1">Property types:</span>
                {loan.propertyTypes.split(' · ').map((type) => (
                  <span key={type} className="bg-blue-50 text-[#003087] px-2 py-0.5 rounded-full">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-10 text-center">
        <p className="text-gray-500 text-sm mb-4">Not sure which program fits your deal? We&apos;ll help you figure it out.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/quote" className="bg-[#003087] text-white px-8 py-3 rounded font-semibold hover:bg-[#002269] transition-colors">
            Get a Free Quote
          </Link>
          <Link href="/contact" className="border border-[#003087] text-[#003087] px-8 py-3 rounded font-semibold hover:bg-blue-50 transition-colors">
            Talk to Us
          </Link>
        </div>
      </div>
    </div>
  )
}
