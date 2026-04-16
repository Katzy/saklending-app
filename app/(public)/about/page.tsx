import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'About Us — SAK Lending',
  description: 'SAK Lending is a commercial mortgage brokerage founded by Scott Katz. Learn about our approach to financing and why borrowers trust us to structure their deals.',
}

const PILLARS = [
  {
    title: 'Capital Markets Perspective',
    body: 'Most brokers know their loan products. Scott knows markets. A background spanning residential lending and institutional trading means he reads rate environments, lender appetite, and deal structure the way a capital markets professional does — not just a form-filler.',
  },
  {
    title: 'Your Debt Concierge',
    body: 'We handle every step — sourcing lenders, structuring the request, managing due diligence, and pushing through to closing. You focus on the deal. We handle the process. If your loan doesn\'t fund, we don\'t get paid.',
  },
  {
    title: 'Lender Network Across 47 States',
    body: 'We work with institutional lenders, private debt funds, CMBS shops, and regional banks across 47 states. That breadth means we can find the right capital source for your property type, deal size, and timeline — not just the lender we always call.',
  },
  {
    title: 'Every Deal Gets a Tailored Approach',
    body: 'A bridge loan for a transitional asset is a different conversation than a CMBS execution on a stabilized retail center. We structure each request for the specific lender audience most likely to say yes at the best terms.',
  },
]

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">

      {/* Bio */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start mb-14">
        <div className="flex-shrink-0 flex flex-col items-center md:items-start">
          <Image
            src="/headshot.jpg"
            alt="Scott Katz"
            width={180}
            height={180}
            className="rounded-xl object-cover w-40 h-40 md:w-44 md:h-44"
          />
          <p className="mt-3 text-sm font-semibold text-gray-800">Scott Katz</p>
          <p className="text-xs text-gray-500">Founder, SAK Lending</p>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            A Different Kind of <span className="text-[#003087]">Commercial Broker</span>
          </h1>
          <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
            <p>
              Scott Katz built his career at the intersection of lending and capital markets. He started in residential mortgage finance, where he learned how deals are structured, how lenders think, and what separates a clean file from a frustrating one. From there, he spent years in options and equities trading — developing a sharp instinct for risk, pricing, and market dynamics that most mortgage professionals never acquire.
            </p>
            <p>
              That combination of hands-on lending experience and institutional market perspective is what he brings to every commercial deal at SAK Lending. When rates move, when lender appetite shifts, when a deal needs to be repackaged for a different capital source — Scott has the background to read those situations and respond.
            </p>
            <p>
              SAK Lending was founded on a simple premise: borrowers deserve a true advocate, not just a broker who passes paper. We act as your dedicated debt concierge — sourcing the right lenders, structuring the request correctly the first time, and managing the process from initial quote through closing.
            </p>
          </div>
        </div>
      </div>

      {/* Pillars */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Borrowers Work With Us</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PILLARS.map(({ title, body }) => (
            <div key={title} className="border border-gray-200 rounded-xl p-5 bg-white">
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-[#003087] rounded-xl px-8 py-10 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Ready to Talk About Your Deal?</h2>
        <p className="text-blue-200 text-sm mb-6">
          Tell us about your property and financing need. We&apos;ll come back with a plan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/quote" className="bg-white text-[#003087] px-8 py-3 rounded font-semibold hover:bg-gray-100 transition-colors">
            Get a Free Quote
          </Link>
          <Link href="/contact" className="border border-white text-white px-8 py-3 rounded font-semibold hover:bg-blue-800 transition-colors">
            Contact Us
          </Link>
        </div>
      </div>

    </div>
  )
}
