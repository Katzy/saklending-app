import Image from 'next/image'

export const metadata = { title: 'About Us — SAK Lending' }

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white rounded shadow-sm p-8">
        <h2 className="text-2xl font-bold text-[#003087] text-center mb-6">About Us</h2>
        <p className="text-gray-700 mb-8">
          SAK Lending provides clients with end to end guidance during the complete loan process.
          Each loan requires a nuanced approach and our goal is to shield you from the stress of
          the loan process while securing the best rates available. If your loan doesn&apos;t fund,
          we don&apos;t get paid.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Image
            src="/headshot.jpg"
            alt="Scott Katz"
            width={150}
            height={150}
            className="rounded-full object-cover w-36 h-36 flex-shrink-0"
          />
          <div>
            <h3 className="text-lg font-semibold text-[#003087] mb-2">Scott Katz — Founder</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Scott Katz founded SAK Lending to provide bespoke financing solutions for commercial
              real estate projects. With over 20 years of experience in financial markets, Scott has
              built a reputation for securing competitive rates and terms for his clients, navigating
              complex transactions with ease. His commitment to transparency and client success drives
              SAK Lending&apos;s mission to simplify the loan process while maximizing value.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
