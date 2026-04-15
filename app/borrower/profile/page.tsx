'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePasswordRequired } from '../layout'

type Profile = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  entity_name: string | null
  credit_score_estimate: number | null
  can_provide_tax_returns: boolean | null
  sponsor_bio: string | null
}

export default function BorrowerProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Profile>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const { clear: clearPwRequired } = usePasswordRequired()
  const [isOtp, setIsOtp] = useState(false)
  const [pwDone, setPwDone] = useState(false) // true = hide password form permanently

  // Password section
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const pwSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/borrower/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d?.id) { setProfile(d); setDraft(d) }
        setLoading(false)
      })

    setIsOtp(sessionStorage.getItem('pw_required') === '1')

    // Hide password form if they already have a password:
    // - They logged in with a password (amr contains 'password'), OR
    // - We stored the flag in localStorage from a previous session
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]))
        const methods: string[] = (payload.amr ?? []).map((a: any) => a.method ?? a)
        if (methods.includes('password')) { setPwDone(true); return }
      } catch {}
      if (localStorage.getItem(`pw_set_${session.user.id}`) === '1') {
        setPwDone(true)
      }
    })
  }, [])

  async function save() {
    setSaving(true)
    const res = await fetch('/api/borrower/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    if (res.ok) {
      const updated = await fetch('/api/borrower/profile').then((r) => r.json())
      setProfile(updated)
      setDraft(updated)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function setPassword() {
    if (newPassword.length < 8) {
      setPwMsg({ ok: false, text: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: 'Passwords do not match.' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPwMsg({ ok: false, text: error.message })
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setIsOtp(false)
      setPwDone(true)
      clearPwRequired()
      // Persist so the form stays hidden on future visits
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) localStorage.setItem(`pw_set_${user.id}`, '1')
      })
    }
    setPwSaving(false)
  }

  // Scroll to password section if navigated via anchor
  useEffect(() => {
    if (window.location.hash === '#set-password' && pwSectionRef.current) {
      pwSectionRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [loading])

  if (loading) return <p className="text-gray-400">Loading...</p>
  if (!profile) return null

  return (
    <div className="max-w-xl">
      {isOtp && (
        <div className="mb-6 px-4 py-4 bg-amber-50 border border-amber-300 rounded-xl">
          <p className="text-sm font-semibold text-amber-800 mb-1">Set a password to continue</p>
          <p className="text-sm text-amber-700">You signed in with a one-time link. Create a password below so you can log in anytime without needing a new link from your broker.</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your contact information on file with SAK Lending.</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50">
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setDraft(profile) }}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          Profile updated successfully.
        </div>
      )}

      {isOtp && <PasswordCard pwSectionRef={pwSectionRef} newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} pwSaving={pwSaving} pwMsg={pwMsg} onSave={setPassword} />}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <PField label="First Name" value={profile.first_name} editValue={draft.first_name ?? ''} editing={editing} onChange={(v) => setDraft({ ...draft, first_name: v })} />
          <PField label="Last Name" value={profile.last_name} editValue={draft.last_name ?? ''} editing={editing} onChange={(v) => setDraft({ ...draft, last_name: v })} />
        </div>

        <PField label="Email" value={profile.email} editValue={profile.email} editing={false} onChange={() => {}}
          hint="Contact your broker to update your email." />

        <PField label="Phone" value={profile.phone ?? ''} editValue={draft.phone ?? ''} editing={editing} onChange={(v) => setDraft({ ...draft, phone: v || null })} />

        <PField label="Entity / Company Name" value={profile.entity_name ?? ''} editValue={draft.entity_name ?? ''} editing={editing} onChange={(v) => setDraft({ ...draft, entity_name: v || null })} />

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Credit Score Estimate</label>
          <p className="text-sm text-gray-800">{profile.credit_score_estimate ?? <span className="text-gray-400">—</span>}</p>
          <p className="text-xs text-gray-400 mt-0.5">Maintained by your broker.</p>
        </div>

        {profile.sponsor_bio && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sponsor Bio</label>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.sponsor_bio}</p>
          </div>
        )}
      </div>

      {/* Set / Change Password (always shown at bottom for returning users) */}
      {!isOtp && !pwDone && <PasswordCard pwSectionRef={pwSectionRef} newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} pwSaving={pwSaving} pwMsg={pwMsg} onSave={setPassword} />}
      {pwDone && (
        <div className="mt-6 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          Password set. You can now log in anytime at <span className="font-medium">/login</span> with your email and password.
        </div>
      )}
    </div>
  )
}

function PasswordCard({ pwSectionRef, newPassword, setNewPassword, confirmPassword, setConfirmPassword, pwSaving, pwMsg, onSave }: {
  pwSectionRef: React.RefObject<HTMLDivElement>
  newPassword: string; setNewPassword: (v: string) => void
  confirmPassword: string; setConfirmPassword: (v: string) => void
  pwSaving: boolean; pwMsg: { ok: boolean; text: string } | null
  onSave: () => void
}) {
  return (
    <div ref={pwSectionRef} id="set-password" className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">Set Password</h2>
      <p className="text-xs text-gray-400 mb-4">Create a password so you can log in anytime without needing a new link.</p>
      {pwMsg && (
        <div className={`mb-4 px-3 py-2 rounded text-sm ${pwMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {pwMsg.text}
        </div>
      )}
      <div className="space-y-3 max-w-sm">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">New Password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <button onClick={onSave} disabled={pwSaving || !newPassword || !confirmPassword}
          className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
          {pwSaving ? 'Saving...' : 'Set Password'}
        </button>
      </div>
    </div>
  )
}

function PField({ label, value, editValue, editing, onChange, hint }: {
  label: string; value: string; editValue: string; editing: boolean
  onChange: (v: string) => void; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {editing ? (
        <input value={editValue} onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
      ) : (
        <p className="text-sm text-gray-800">{value || <span className="text-gray-400">—</span>}</p>
      )}
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}
