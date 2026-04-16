import Link from 'next/link'

export const metadata = {
  title: 'Contact — SAK Lending',
  description: 'Get in touch with SAK Lending. Call or email us directly — we typically respond within one business day.',
}

export default function ContactPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-[#003087] py-16 px-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Get in Touch</h1>
        <p className="text-blue-200 text-sm sm:text-base max-w-md mx-auto">
          We typically respond within one business day. For a formal loan inquiry, use our quote form.
        </p>
      </div>

      {/* Contact cards */}
      <div className="max-w-2xl mx-auto px-4 -mt-8 mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Phone */}
          <a
            href="tel:+14016777359"
            className="group bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col items-center text-center hover:border-[#003087] hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#003087] transition-colors">
              <svg className="w-5 h-5 text-[#003087] group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Phone</p>
            <p className="text-xl font-bold text-gray-900 group-hover:text-[#003087] transition-colors">(401) 677-7359</p>
            <p className="text-xs text-gray-400 mt-2">Click to call</p>
          </a>

          {/* Email */}
          <a
            href="mailto:info@saklending.com"
            className="group bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col items-center text-center hover:border-[#003087] hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#003087] transition-colors">
              <svg className="w-5 h-5 text-[#003087] group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Email</p>
            <p className="text-lg font-bold text-gray-900 group-hover:text-[#003087] transition-colors break-all">info@saklending.com</p>
            <p className="text-xs text-gray-400 mt-2">Click to send</p>
          </a>

        </div>

        {/* Loan inquiry nudge */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl px-6 py-5 text-center">
          <p className="text-sm text-gray-600">
            Looking to finance a property?{' '}
            <Link href="/quote" className="text-[#003087] font-semibold hover:underline">
              Submit a quote request
            </Link>
            {' '}and we&apos;ll put together a financing plan for you.
          </p>
        </div>
      </div>
    </div>
  )
}
