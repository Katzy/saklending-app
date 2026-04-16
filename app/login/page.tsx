'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    const role = data.user?.user_metadata?.role as string | undefined
    router.push(role === 'borrower' ? '/borrower' : '/dashboard')
    router.refresh()
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset-callback`,
    })
    setForgotSent(true)
    setForgotLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.jpg" alt="SAK Lending" width={160} height={60} className="mx-auto h-14 w-auto" />
          <p className="mt-3 text-sm text-gray-500">Sign In</p>
        </div>

        {!showForgot ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            {error && (
              <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#003087] text-white py-2.5 rounded font-medium hover:bg-[#002269] transition-colors disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => { setShowForgot(true); setForgotEmail(email) }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Forgot password?
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8">
            {forgotSent ? (
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-1 font-medium">Check your email</p>
                <p className="text-sm text-gray-500">A password reset link has been sent to <span className="font-medium">{forgotEmail}</span>.</p>
                <button onClick={() => { setShowForgot(false); setForgotSent(false) }}
                  className="mt-4 text-sm text-[#003087] hover:underline">
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">Enter your email and we&apos;ll send a link to reset your password.</p>
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-[#003087] text-white py-2.5 rounded font-medium hover:bg-[#002269] transition-colors disabled:opacity-60"
                  >
                    {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </form>
                <div className="mt-4 text-center">
                  <button onClick={() => setShowForgot(false)} className="text-sm text-gray-400 hover:text-gray-600">
                    Back to sign in
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
