'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePasswordRequired } from '@/lib/borrower-context'

const STAGES = ['lead', 'qualified', 'application', 'underwriting', 'approved', 'funded']
const STAGE_LABELS: Record<string, string> = {
  lead: 'In Review',
  qualified: 'Qualified',
  application: 'Application',
  underwriting: 'Underwriting',
  approved: 'Approved',
  funded: 'Funded',
}

type Loan = {
  id: string
  loan_amount: number | null
  loan_program: string | null
  loan_purpose: string | null
  property_type: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  stage: string
  is_dead: boolean
}

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
  home_address_street: string | null
  home_address_city: string | null
  home_address_state: string | null
  home_address_zip: string | null
}

export default function BorrowerProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loans, setLoans] = useState<Loan[]>([])
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
    Promise.all([
      fetch('/api/borrower/profile').then((r) => r.json()),
      fetch('/api/borrower/loans').then((r) => r.json()),
    ]).then(([profileData, loansData]) => {
      if (profileData?.id) { setProfile(profileData); setDraft(profileData) }
      setLoans(Array.isArray(loansData) ? loansData.filter((l: Loan) => !l.is_dead) : [])
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

      {/* Primary Residence */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Primary Residence</h2>
          <p className="text-xs text-gray-400 mt-0.5">Your personal address — not eligible for SAK Lending financing.</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <PField label="Street Address" value={profile.home_address_street ?? ''} editValue={draft.home_address_street ?? ''} editing={editing} onChange={(v) => setDraft({ ...draft, home_address_street: v || null })} />
          <div className="grid grid-cols-3 gap-3">
            <PField label="City" value={profile.home_address_city ?? ''} editValue={draft.home_address_city ?? ''} editing={editing} onChange={(v) => setDraft({ ...draft, home_address_city: v || null })} />
            <PField label="State" value={profile.home_address_state ?? ''} editValue={draft.home_address_state ?? ''} editing={editing} onChange={(v) => setDraft({ ...draft, home_address_state: v || null })} />
            <PField label="Zip" value={profile.home_address_zip ?? ''} editValue={draft.home_address_zip ?? ''} editing={editing} onChange={(v) => setDraft({ ...draft, home_address_zip: v || null })} />
          </div>
        </div>
      </div>

      {/* Loan Pipeline Status */}
      {loans.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Loan Status</h2>
          <div className="space-y-4">
            {loans.map((loan) => {
              const currentIdx = STAGES.indexOf(loan.stage)
              const label = loan.address_street
                ?? (loan.address_city ? `${loan.address_city}, ${loan.address_state ?? ''}` : null)
                ?? loan.property_type
                ?? 'Loan'
              const sublabel = loan.address_street && loan.address_city
                ? [loan.address_city, loan.address_state, loan.address_zip].filter(Boolean).join(', ')
                : null
              return (
                <div key={loan.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{label}</p>
                      {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">
                        {[loan.loan_program?.replace(/_/g, ' '), loan.loan_purpose].filter(Boolean).join(' · ')}
                        {loan.loan_amount ? ` · $${Number(loan.loan_amount).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#003087] bg-blue-50 px-2.5 py-1 rounded-full">
                      {STAGE_LABELS[loan.stage] ?? loan.stage}
                    </span>
                  </div>
                  {/* Progress steps */}
                  <div className="flex items-center gap-0">
                    {STAGES.map((stage, idx) => {
                      const done = idx < currentIdx
                      const active = idx === currentIdx
                      const isLast = idx === STAGES.length - 1
                      return (
                        <div key={stage} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              done   ? 'bg-[#003087] text-white' :
                              active ? 'bg-[#003087] text-white ring-4 ring-blue-100' :
                                       'bg-gray-100 text-gray-400'
                            }`}>
                              {done ? '✓' : idx + 1}
                            </div>
                            <p className={`text-[10px] mt-1 text-center leading-tight ${active ? 'text-[#003087] font-semibold' : 'text-gray-400'}`}>
                              {STAGE_LABELS[stage]}
                            </p>
                          </div>
                          {!isLast && (
                            <div className={`flex-1 h-0.5 mb-4 mx-1 ${idx < currentIdx ? 'bg-[#003087]' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
