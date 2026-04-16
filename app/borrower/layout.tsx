'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { PasswordRequiredContext } from '@/lib/borrower-context'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/borrower',            label: 'My Loans' },
  { href: '/borrower/profile',    label: 'My Profile' },
  { href: '/borrower/properties', label: 'My Properties' },
]


export default function BorrowerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [pwRequired, setPwRequired] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    setPwRequired(sessionStorage.getItem('pw_required') === '1')
    setChecked(true)
  }, [])

  // Redirect to profile until password is set
  useEffect(() => {
    if (checked && pwRequired && pathname !== '/borrower/profile') {
      router.replace('/borrower/profile')
    }
  }, [checked, pwRequired, pathname])

  function clearPwRequired() {
    sessionStorage.removeItem('pw_required')
    setPwRequired(false)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <PasswordRequiredContext.Provider value={{ clear: clearPwRequired }}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
            <Link href="/borrower">
              <Image src="/logo.jpg" alt="SAK Lending" width={100} height={36} className="h-8 w-auto" />
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map(({ href, label }) => {
                const active = pathname === href || (href !== '/borrower' && pathname.startsWith(href))
                if (pwRequired && href !== '/borrower/profile') {
                  return (
                    <span key={href} className="px-3 py-1.5 rounded text-sm font-medium text-gray-300 cursor-not-allowed">
                      {label}
                    </span>
                  )
                }
                return (
                  <Link key={href} href={href}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      active ? 'bg-[#003087] text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}>
                    {label}
                  </Link>
                )
              })}
              <button onClick={signOut} className="ml-3 text-sm text-gray-400 hover:text-gray-600">
                Sign out
              </button>
            </nav>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </PasswordRequiredContext.Provider>
  )
}
