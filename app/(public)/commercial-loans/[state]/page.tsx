import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

const STATES: Record<string, string> = {
  'alabama':        'Alabama',
  'arizona':        'Arizona',
  'arkansas':       'Arkansas',
  'california':     'California',
  'colorado':       'Colorado',
  'connecticut':    'Connecticut',
  'delaware':       'Delaware',
  'florida':        'Florida',
  'georgia':        'Georgia',
  'idaho':          'Idaho',
  'illinois':       'Illinois',
  'indiana':        'Indiana',
  'iowa':           'Iowa',
  'kansas':         'Kansas',
  'kentucky':       'Kentucky',
  'louisiana':      'Louisiana',
  'maine':          'Maine',
  'maryland':       'Maryland',
  'massachusetts':  'Massachusetts',
  'michigan':       'Michigan',
  'minnesota':      'Minnesota',
  'mississippi':    'Mississippi',
  'missouri':       'Missouri',
  'montana':        'Montana',
  'nebraska':       'Nebraska',
  'new-hampshire':  'New Hampshire',
  'new-jersey':     'New Jersey',
  'new-mexico':     'New Mexico',
  'new-york':       'New York',
  'north-carolina': 'North Carolina',
  'north-dakota':   'North Dakota',
  'ohio':           'Ohio',
  'oklahoma':       'Oklahoma',
  'oregon':         'Oregon',
  'pennsylvania':   'Pennsylvania',
  'rhode-island':   'Rhode Island',
  'south-carolina': 'South Carolina',
  'south-dakota':   'South Dakota',
  'tennessee':      'Tennessee',
  'texas':          'Texas',
  'utah':           'Utah',
  'vermont':        'Vermont',
  'virginia':       'Virginia',
  'washington':     'Washington',
  'west-virginia':  'West Virginia',
  'wisconsin':      'Wisconsin',
  'wyoming':        'Wyoming',
}

export function generateStaticParams() {
  return Object.keys(STATES).map((state) => ({ state }))
}

export async function generateMetadata(
  { params }: { params: { state: string } }
): Promise<Metadata> {
  const name = STATES[params.state]
  if (!name) return {}

  return {
    title: `Commercial Real Estate Loans in ${name} | SAK Lending`,
    description: `SAK Lending arranges commercial real estate financing in ${name} — bridge loans, ground-up construction, fix & flip, SBA, and permanent financing. Competitive rates, fast closings. Get a free quote today.`,
    openGraph: {
      title: `Commercial Real Estate Loans in ${name} | SAK Lending`,
      description: `Bridge loans, construction, fix & flip, SBA, and permanent financing in ${name}. SAK Lending guides you from application to closing.`,
    },
  }
}

const LOAN_TYPES = [
  { label: 'Purchase',                desc: 'Acquisition financing for multifamily, mixed-use, office, retail, industrial, and other commercial properties.' },
  { label: 'Refinance',               desc: 'Rate-and-term or cash-out refinancing on stabilized commercial properties to lower your rate or pull equity.' },
  { label: 'Ground-Up Construction',  desc: 'Construction loans covering land, hard costs, and soft costs with draw schedules tied to your build timeline.' },
  { label: 'Short-Term Bridge',       desc: 'Fast, flexible financing for acquisitions, repositioning, or lease-up while permanent financing is arranged.' },
  { label: 'Small Balance DSCR',      desc: 'Income-property loans ($250K–$2.5M) underwritten on property cash flow — ideal for investors with complex returns.' },
  { label: 'CMBS',                    desc: 'Fixed-rate, non-recourse loans for stabilized income-producing properties with strong occupancy and cash flow.' },
]

export default function StateLandingPage({ params }: { params: { state: string } }) {
  const name = STATES[params.state]
  if (!name) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">

      {/* Hero */}
      <div className="text-center mb-12">
        <p className="text-sm font-semibold text-[#003087] uppercase tracking-widest mb-2">Commercial Real Estate Financing</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Commercial Loans in {name}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          SAK Lending is a commercial mortgage broker serving investors and developers across {name}.
          We source and structure financing from a deep network of institutional and private lenders —
          so you get competitive terms without spending weeks shopping deals yourself.
        </p>
        <Link
          href="/quote"
          className="inline-block bg-[#003087] text-white px-8 py-3 rounded font-semibold hover:bg-[#002269] transition-colors"
        >
          Get a Free Quote
        </Link>
      </div>

      {/* Loan Types */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Loan Programs Available in {name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LOAN_TYPES.map(({ label, desc }) => (
            <div key={label} className="border border-gray-200 rounded-lg p-5 bg-white">
              <h3 className="font-semibold text-[#003087] mb-1">{label}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 rounded-xl p-8 mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
        <ol className="space-y-4">
          {[
            { step: '1', title: 'Submit a quote request', desc: 'Tell us about your property, loan need, and timeline. Takes about 5 minutes.' },
            { step: '2', title: 'We structure the deal', desc: 'We review your request and identify the best lenders and programs for your specific situation.' },
            { step: '3', title: 'Term sheet in hand', desc: 'We present you with competitive term sheets and walk you through the options — no obligation.' },
            { step: '4', title: 'Close with confidence', desc: 'We manage the process from application through closing, keeping you informed every step of the way.' },
          ].map(({ step, title, desc }) => (
            <li key={step} className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#003087] text-white flex items-center justify-center text-sm font-bold">
                {step}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{title}</p>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* CTA */}
      <div className="text-center border border-[#003087] rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Finance Your Next Deal in {name}?</h2>
        <p className="text-gray-600 mb-6">
          Submit a quick quote request and we&apos;ll get back to you within one business day.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/quote"
            className="bg-[#003087] text-white px-8 py-3 rounded font-semibold hover:bg-[#002269] transition-colors"
          >
            Get a Free Quote
          </Link>
          <Link
            href="/contact"
            className="border border-[#003087] text-[#003087] px-8 py-3 rounded font-semibold hover:bg-blue-50 transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>

    </div>
  )
}
