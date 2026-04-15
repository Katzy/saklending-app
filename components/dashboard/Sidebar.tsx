'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard',           label: 'Overview',  icon: '📊' },
  { href: '/dashboard/pipeline',  label: 'Pipeline',  icon: '🏗️' },
  { href: '/dashboard/contacts',  label: 'Contacts',  icon: '👥' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-[#003087] flex flex-col z-40">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-blue-800">
        <Link href="/dashboard">
          <Image src="/logo.jpg" alt="SAK Lending" width={120} height={44} className="h-10 w-auto brightness-0 invert" />
        </Link>
        <p className="text-blue-300 text-xs mt-1">Dashboard</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                active
                  ? 'bg-white text-[#003087]'
                  : 'text-blue-100 hover:bg-blue-800'
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Public site link + sign out */}
      <div className="px-3 py-4 border-t border-blue-800 space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded text-sm text-blue-300 hover:bg-blue-800 transition-colors"
        >
          <span>🌐</span> Public Site
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-blue-300 hover:bg-blue-800 transition-colors text-left"
        >
          <span>→</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
