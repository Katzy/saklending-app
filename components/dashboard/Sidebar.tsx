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

type SidebarProps = {
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleNavClick = () => {
    onClose?.()
  }

  return (
    <aside className={`
      fixed top-0 left-0 h-full w-56 bg-[#003087] flex flex-col z-40
      transition-transform duration-200
      md:translate-x-0
      ${open ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-blue-800 flex items-center justify-between">
        <Link href="/dashboard" onClick={handleNavClick}>
          <Image src="/logo.jpg" alt="SAK Lending" width={120} height={44} className="h-10 w-auto brightness-0 invert" />
        </Link>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden text-blue-300 hover:text-white p-1"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
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
