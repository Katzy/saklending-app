'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navLinks = [
  { href: '/',           label: 'Home' },
  { href: '/about',      label: 'About Us' },
  { href: '/services',   label: 'Services' },
  { href: '/contact',    label: 'Contact Us' },
  { href: '/quote',      label: 'Get Quote' },
  { href: '/calculator', label: 'Loan Calculator' },
]

const SERVICE_LINKS = [
  { label: 'Purchase',               href: '/services#purchase' },
  { label: 'Refinance',              href: '/services#refinance' },
  { label: 'Ground-Up Construction', href: '/services#ground-up-construction' },
  { label: 'Short-Term Bridge',      href: '/services#short-term-bridge' },
  { label: 'Small Balance DSCR',     href: '/services#small-balance-dscr' },
  { label: 'CMBS',                   href: '/services#cmbs' },
]

export default function Header() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)

  return (
    <header className="fixed top-0 w-full z-50 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center justify-between px-4 h-16">
        <Link href="/" className="flex-shrink-0" onClick={() => setOpen(false)}>
          <Image
            src="/logo.jpg"
            alt="SAK Lending"
            width={120}
            height={48}
            className="h-12 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-2 py-1 text-sm font-medium rounded transition-colors ${
                pathname === href
                  ? 'text-white bg-[#003087]'
                  : 'text-[#003087] hover:underline'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-0.5 bg-[#003087] transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-[#003087] transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-[#003087] transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Brand blue accent line */}
      <div className="h-0.5 bg-[#003087]" />

      {/* Mobile drawer */}
      {open && (
        <nav className="md:hidden bg-gray-50 border-t border-gray-100 px-4 py-3 flex flex-col gap-1">
          {navLinks.map(({ href, label }) => {
            if (label === 'Services') {
              return (
                <div key={href}>
                  <button
                    onClick={() => setServicesOpen((v) => !v)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded transition-colors ${
                      pathname === href
                        ? 'text-white bg-[#003087]'
                        : 'text-[#003087] hover:bg-blue-50'
                    }`}
                  >
                    <span>Services</span>
                    <span className="text-xs">{servicesOpen ? '▲' : '▼'}</span>
                  </button>
                  {servicesOpen && (
                    <div className="ml-3 mt-1 flex flex-col gap-0.5">
                      <Link
                        href="/services"
                        onClick={() => { setOpen(false); setServicesOpen(false) }}
                        className="px-3 py-2 text-sm text-gray-500 hover:text-[#003087] hover:bg-blue-50 rounded"
                      >
                        All Programs
                      </Link>
                      {SERVICE_LINKS.map(({ label: sLabel, href: sHref }) => (
                        <Link
                          key={sHref}
                          href={sHref}
                          onClick={() => { setOpen(false); setServicesOpen(false) }}
                          className="px-3 py-2 text-sm text-gray-600 hover:text-[#003087] hover:bg-blue-50 rounded"
                        >
                          {sLabel}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2.5 text-sm font-medium rounded transition-colors ${
                  pathname === href
                    ? 'text-white bg-[#003087]'
                    : 'text-[#003087] hover:bg-blue-50'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
