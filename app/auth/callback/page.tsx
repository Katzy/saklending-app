'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    const supabase = createClient()
    const next = searchParams.get('next') ?? '/borrower'

    function redirectAfterMagicLink(dest: string) {
      // Flag that this session came from a magic link so the portal
      // can require the borrower to set a password before proceeding
      if (dest.startsWith('/borrower')) {
        sessionStorage.setItem('pw_required', '1')
      }
      router.replace(dest)
    }

    async function handleCallback() {
      // PKCE code flow
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { redirectAfterMagicLink(next); return }
        setStatus('Link expired or already used. Please request a new one.')
        return
      }

      // Implicit flow — tokens in URL hash
      const hash = window.location.hash.slice(1)
      if (hash) {
        const params = new URLSearchParams(hash)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        const errorCode = params.get('error_code')

        if (errorCode) {
          setStatus('Link expired or already used. Please request a new one.')
          return
        }
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (!error) { redirectAfterMagicLink(next); return }
          setStatus('Link expired or already used. Please request a new one.')
          return
        }
      }

      // Error in query params
      if (searchParams.get('error')) {
        setStatus('Link expired or already used. Please request a new one.')
        return
      }

      // Already-established session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { redirectAfterMagicLink(next); return }

      setStatus('Link expired or already used. Please request a new one.')
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">{status}</p>
        {status !== 'Signing you in…' && (
          <p className="text-sm text-gray-400 mt-2">Contact your broker for a new link.</p>
        )}
      </div>
    </div>
  )
}
