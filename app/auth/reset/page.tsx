'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Supabase puts the recovery tokens in the URL hash
    // onAuthStateChange fires with event PASSWORD_RECOVERY once tokens are processed
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
        subscription.unsubscribe()
      }
    })

    // Also handle the hash directly in case the event already fired
    const hash = window.location.hash.slice(1)
    if (hash) {
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      const type = params.get('type')
      if (access_token && refresh_token && type === 'recovery') {
        supabase.auth.setSession({ access_token, refresh_token }).then(() => {
          setReady(true)
          subscription.unsubscribe()
        })
      }
    }

    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return }

    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    // Redirect based on role
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.user_metadata?.role as string | undefined
    router.push(role === 'borrower' ? '/borrower' : '/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.jpg" alt="SAK Lending" width={160} height={60} className="mx-auto h-14 w-auto" />
          <p className="mt-3 text-sm text-gray-500">Set New Password</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          {!ready ? (
            <p className="text-sm text-gray-500 text-center">Verifying reset link…</p>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 rounded p-3 text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#003087] text-white py-2.5 rounded font-medium hover:bg-[#002269] transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Set Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
