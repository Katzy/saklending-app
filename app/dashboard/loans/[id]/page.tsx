'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import StreetView from '@/components/StreetView'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoanData = Record<string, any>
type Note = { id: string; created_at: string; content: string }
type Task = { id: string; title: string; notes: string | null; due_date: string | null; completed: boolean; created_at: string }
type AdminDoc = { id: string; doc_type: string; file_name: string; file_size: number | null; uploaded_by_label: string; created_at: string }
type LenderContact = { id: string; lender_id: string; name: string | null; email: string | null; phone: string | null; title: string | null }
type LenderOption = { id: string; company: string | null; contact_name: string | null; email: string | null; lender_contacts: LenderContact[] }

const ADMIN_DOC_TYPES = [
  { value: 'broker_agreement', label: 'Broker Agreement' },
  { value: 'pfs', label: 'Personal Financial Statement (PFS)' },
  { value: 't12', label: 'T-12 Operating Statement' },
  { value: 'rent_roll', label: 'Rent Roll' },
  { value: 'purchase_contract', label: 'Purchase Contract' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'environmental', label: 'Environmental Report' },
  { value: 'other', label: 'Other' },
]

function generateLinkPassword(): string {
  const adj = ['oak','sky','bay','elm','fox','ivy','clay','dune','fern','gold','jade','lake','moss','pine','reef','sage','tide','vale','wolf','zinc']
  const noun = ['bank','bridge','cove','creek','dune','field','grove','hill','inlet','knoll','ledge','marsh','peak','point','ridge','river','rock','shore','stone','trail']
  const num = Math.floor(10 + Math.random() * 90)
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
  return `${pick(adj)}-${pick(noun)}-${num}`
}

function formatBrokerFee(pct: string): string {
  const num = parseFloat(pct)
  if (isNaN(num)) return pct
  const bps = Math.round(num * 100)
  return `${bps} basis points (${num.toFixed(2)}%)`
}

function parseBrokerFee(formatted: string): string {
  const m = formatted.match(/\((\d+\.?\d*)%\)/)
  return m ? m[1] : ''
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const STAGES = ['lead', 'qualified', 'application', 'underwriting', 'approved', 'funded']

const PROPERTY_TYPES = [
  'Multifamily', 'Multifamily 2-4 Units', 'Mixed Use', 'Office', 'Retail', 'Industrial', 'Warehouse',
  'Self Storage', 'Hotel / Motel', 'Mobile Home Park', 'Senior Housing',
  'Student Housing', 'Single Family', 'Condo', 'Townhouse', '2-4 Unit',
  'Land', 'Gas Station', 'Car Wash', 'Auto Dealer', 'Restaurant',
  'Medical Office', 'Assisted Living', 'Church', 'Special Purpose', 'Other',
]

function fmt$(v: unknown) {
  const n = Number(v)
  if (!n) return ''
  return `$${n.toLocaleString()}`
}
function pct(num: unknown, den: unknown) {
  const n = Number(num), d = Number(den)
  if (!n || !d) return null
  return ((n / d) * 100).toFixed(1) + '%'
}
function calcNOI(loan: LoanData) {
  const gross = Number(loan.gross_annual_income) || 0
  const vac   = Number(loan.vacancy_factor_pct) || 5
  const exp   = Number(loan.annual_operating_expenses) || 0
  if (!gross) return null
  return gross * (1 - vac / 100) - exp
}
function calcNetWorth(loan: LoanData) {
  const assets = (Number(loan.total_re_value) || 0) + (Number(loan.cash_reserves) || 0)
    + (Number(loan.investment_assets) || 0) + (Number(loan.personal_property_value) || 0)
    + (Number(loan.other_business_value) || 0)
  const liab = (Number(loan.total_mortgage_debt) || 0) + (Number(loan.credit_card_debt) || 0)
    + (Number(loan.other_loans) || 0) + (Number(loan.taxes_bills_owed) || 0)
  if (!assets && !liab) return null
  return assets - liab
}
function calcTotalProject(loan: LoanData) {
  const price = Number(loan.purchase_price) || Number(loan.original_purchase_price) || 0
  const capex = Number(loan.capex_spent_to_date) || 0
  const newCosts = Number(loan.new_construction_costs) || 0
  if (!price) return null
  return price + capex + newCosts
}

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [loan, setLoan] = useState<LoanData | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [draft, setDraft] = useState<LoanData>({})
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [deadModal, setDeadModal] = useState(false)
  const [deadReason, setDeadReason] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [imagePaths, setImagePaths] = useState<string[]>([])
  const [imageIndex, setImageIndex] = useState(0)
  const [imageLightbox, setImageLightbox] = useState(false)
  const [imageDeleting, setImageDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Bank links
  type BankLink = { id: string; token: string; label: string | null; expires_at: string; revoked_at: string | null; created_at: string; decision: string | null; is_selected: boolean; recipient_email: string | null; recipient_name: string | null }
  type LenderDoc = { id: string; file_name: string; doc_label: string; file_size: number | null; created_at: string; bank_link_id: string; lender_label: string | null }
  const [bankLinks, setBankLinks] = useState<BankLink[]>([])
  const [lenderDocs, setLenderDocs] = useState<LenderDoc[]>([])
  const [lenderDocUploading, setLenderDocUploading] = useState(false)
  const [lenderDocBankLinkId, setLenderDocBankLinkId] = useState('')
  const [lenderDocLabel, setLenderDocLabel] = useState('other')
  const lenderDocFileRef = useRef<HTMLInputElement>(null)
  // Notify bank modal
  const [notifyLink, setNotifyLink] = useState<BankLink | null>(null)
  const [notifyDocIds, setNotifyDocIds] = useState<Set<string>>(new Set())
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyName, setNotifyName] = useState('')
  const [notifyNote, setNotifyNote] = useState('')
  const [notifySending, setNotifySending] = useState(false)
  const [notifySent, setNotifySent] = useState(false)
  const [notifyError, setNotifyError] = useState<string | null>(null)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkPassword, setLinkPassword] = useState('')
  const [linkDays, setLinkDays] = useState('30')
  const [linkEmail, setLinkEmail] = useState('')
  const [linkContactName, setLinkContactName] = useState('')
  const [creatingLink, setCreatingLink] = useState(false)
  const [newLinkUrl, setNewLinkUrl] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)
  // Lender autocomplete
  const [lenderOptions, setLenderOptions] = useState<LenderOption[]>([])
  const [lenderSuggestions, setLenderSuggestions] = useState<LenderOption[]>([])
  const [selectedLender, setSelectedLender] = useState<LenderOption | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const lenderInputRef = useRef<HTMLInputElement>(null)
  const lenderOptionsRef = useRef<LenderOption[]>([])

  // Documents
  const [docs, setDocs] = useState<AdminDoc[]>([])
  const [docUploading, setDocUploading] = useState(false)
  const [adminDocType, setAdminDocType] = useState('broker_agreement')
  const [otherAdminDocName, setOtherAdminDocName] = useState('')
  const adminDocFileRef = useRef<HTMLInputElement>(null)

  // Broker agreement modal
  const [showAgreementModal, setShowAgreementModal] = useState(false)
  const [agreementHnw, setAgreementHnw] = useState(false)
  const [agreementBrokerFee, setAgreementBrokerFee] = useState('')
  const [agreementTwoBorrowers, setAgreementTwoBorrowers] = useState(false)
  const [agreementBorrower2Name, setAgreementBorrower2Name] = useState('')
  const [agreementBorrower2Email, setAgreementBorrower2Email] = useState('')
  const [agreementSending, setAgreementSending] = useState(false)
  const [agreementSent, setAgreementSent] = useState(false)
  const [agreementError, setAgreementError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendConfirm, setResendConfirm] = useState(false)
  const [resendFee, setResendFee] = useState('')
  const [resendError, setResendError] = useState<string | null>(null)

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskAdding, setTaskAdding] = useState(false)

  const fetchLoan = useCallback(async () => {
    const res = await fetch(`/api/loans/${id}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setLoan(data)
    setDraft(data)
    setLoading(false)
    // Fetch signed URLs for all property images
    if (data.property_image_path || data.property_image_paths?.length) {
      const imgRes = await fetch(`/api/loans/${id}/image-url`)
      if (imgRes.ok) { const j = await imgRes.json(); setImageUrls(j.urls ?? []); setImagePaths(j.paths ?? []); setImageIndex(0) }
    }
  }, [id, router])

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/loans/${id}/notes`)
    if (res.ok) setNotes(await res.json())
  }, [id])

  const fetchBankLinks = useCallback(async () => {
    const res = await fetch(`/api/bank-links?loan_id=${id}`)
    if (res.ok) {
      const links: BankLink[] = await res.json()
      setBankLinks(links)
      // Fetch all lender docs for this loan
      const res2 = await fetch(`/api/loans/${id}/lender-documents`)
      if (res2.ok) {
        const raw: { id: string; file_name: string; doc_label: string; file_size: number | null; created_at: string; bank_link_id: string }[] = await res2.json()
        const withLabel = raw.map((d) => ({
          ...d,
          lender_label: links.find((l) => l.id === d.bank_link_id)?.label ?? null,
        }))
        setLenderDocs(withLabel)
      }
    }
  }, [id])

  const fetchLenders = useCallback(async () => {
    const res = await fetch('/api/lenders')
    if (res.ok) {
      const data = await res.json()
      lenderOptionsRef.current = data
      setLenderOptions(data)
    }
  }, [])

  const fetchDocs = useCallback(async () => {
    const res = await fetch(`/api/loans/${id}/documents`)
    if (res.ok) setDocs(await res.json())
  }, [id])

  const fetchTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?loan_id=${id}`)
    if (res.ok) setTasks(await res.json())
  }, [id])

  useEffect(() => { fetchLoan(); fetchNotes(); fetchBankLinks(); fetchDocs(); fetchTasks(); fetchLenders() }, [fetchLoan, fetchNotes, fetchBankLinks, fetchDocs, fetchTasks, fetchLenders])

  async function saveLoan() {
    setSaving(true)
    setSaveError('')
    // Strip joined/read-only fields that aren't loan columns
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contacts, co_borrower, id: _id, created_at, ...payload } = draft
    const res = await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      await fetchLoan()
      setEditing(false)
    } else {
      const json = await res.json()
      setSaveError(json.error ?? 'Save failed')
    }
    setSaving(false)
  }

  async function changeStage(stage: string) {
    await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    await fetchLoan()
  }

  async function markDead() {
    await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_dead: true, dead_reason: deadReason, dead_at: new Date().toISOString() }),
    })
    setDeadModal(false)
    await fetchLoan()
  }

  async function unmarkDead() {
    await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_dead: false, dead_reason: null, dead_at: null }),
    })
    await fetchLoan()
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return
    setAddingNote(true)
    await fetch(`/api/loans/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newNote }),
    })
    setNewNote('')
    await fetchNotes()
    setAddingNote(false)
  }

  async function createBankLink() {
    if (!linkPassword) return
    setCreatingLink(true)
    const res = await fetch('/api/bank-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loan_id: id,
        password: linkPassword,
        label: linkLabel || null,
        expires_days: Number(linkDays),
        recipient_email: linkEmail || null,
        recipient_name: linkContactName || null,
        app_url: window.location.origin,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const url = `${window.location.origin}/loan-file/${data.token}`
      setNewLinkUrl(url)
      setEmailSent(!!data.email_sent)
      setLinkLabel(''); setLinkPassword(''); setLinkDays('30')
      setLinkEmail(''); setLinkContactName(''); setSelectedLender(null)
      setShowLinkForm(false)
      await fetchBankLinks()
    }
    setCreatingLink(false)
  }

  async function revokeLink(linkId: string) {
    await fetch(`/api/bank-links/${linkId}/revoke`, { method: 'PATCH' })
    await fetchBankLinks()
    if (newLinkUrl) setNewLinkUrl(null)
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImageUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/loans/${id}/image`, { method: 'POST', body: fd })
    if (res.ok) {
      const imgRes = await fetch(`/api/loans/${id}/image-url`)
      if (imgRes.ok) {
        const j = await imgRes.json()
        setImageUrls(j.urls ?? [])
        setImagePaths(j.paths ?? [])
        setImageIndex((j.urls?.length ?? 1) - 1) // jump to the newly added image
      }
    } else {
      const j = await res.json()
      setSaveError(j.error ?? 'Image upload failed')
    }
    setImageUploading(false)
  }

  async function deleteImage(path: string) {
    setImageDeleting(true)
    await fetch(`/api/loans/${id}/image`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    const imgRes = await fetch(`/api/loans/${id}/image-url`)
    if (imgRes.ok) {
      const j = await imgRes.json()
      setImageUrls(j.urls ?? [])
      setImagePaths(j.paths ?? [])
      setImageIndex(0)
    }
    setImageDeleting(false)
  }

  async function toggleHomepage(val: boolean) {
    await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_on_homepage: val }),
    })
    await fetchLoan()
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskTitle.trim()) return
    setTaskAdding(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: taskTitle, due_date: taskDate || null, loan_id: id }),
    })
    setTaskTitle(''); setTaskDate('')
    await fetchTasks()
    setTaskAdding(false)
  }

  async function toggleTask(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    })
    await fetchTasks()
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    await fetchTasks()
  }

  async function uploadAdminDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setDocUploading(true)
    const resolvedDocType = adminDocType === 'other' && otherAdminDocName.trim()
      ? otherAdminDocName.trim()
      : adminDocType
    const fd = new FormData()
    fd.append('file', file)
    fd.append('doc_type', resolvedDocType)
    await fetch(`/api/loans/${id}/documents`, { method: 'POST', body: fd })
    await fetchDocs()
    setDocUploading(false)
    setOtherAdminDocName('')
    if (adminDocFileRef.current) adminDocFileRef.current.value = ''
  }

  async function deleteAdminDoc(docId: string) {
    await fetch(`/api/loans/${id}/documents?doc_id=${docId}`, { method: 'DELETE' })
    await fetchDocs()
  }

  async function viewDoc(docId: string) {
    const res = await fetch(`/api/loans/${id}/documents/${docId}/url`)
    if (!res.ok) return
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  async function viewLenderDoc(docId: string, bankLinkId: string) {
    const link = bankLinks.find((l) => l.id === bankLinkId)
    if (!link) return
    const res = await fetch(`/api/bank-links/${link.token}/documents/${docId}/url`)
    if (!res.ok) return
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  async function uploadLenderDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !lenderDocBankLinkId) return
    setLenderDocUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('bank_link_id', lenderDocBankLinkId)
    fd.append('doc_label', lenderDocLabel)
    await fetch(`/api/loans/${id}/lender-documents`, { method: 'POST', body: fd })
    await fetchBankLinks()
    setLenderDocUploading(false)
    if (lenderDocFileRef.current) lenderDocFileRef.current.value = ''
  }

  async function deleteLenderDoc(docId: string) {
    await fetch(`/api/loans/${id}/lender-documents?doc_id=${docId}`, { method: 'DELETE' })
    setLenderDocs((prev) => prev.filter((d) => d.id !== docId))
  }

  function openNotifyModal(link: BankLink) {
    setNotifyLink(link)
    setNotifyEmail(link.recipient_email ?? '')
    setNotifyName(link.recipient_name ?? '')
    setNotifyNote('')
    setNotifyDocIds(new Set())
    setNotifySent(false)
  }

  async function sendNotification() {
    if (!notifyLink || !notifyEmail || !notifyDocIds.size) return
    setNotifySending(true)
    setNotifyError(null)
    try {
      const res = await fetch(`/api/bank-links/${notifyLink.id}/notify-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: notifyEmail,
          recipient_name: notifyName,
          doc_ids: Array.from(notifyDocIds),
          note: notifyNote || undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        setNotifyError(j.error ?? 'Failed to send notification')
      } else {
        setNotifySent(true)
        setTimeout(() => { setNotifyLink(null); setNotifySent(false); setNotifyError(null) }, 1500)
      }
    } catch {
      setNotifyError('Network error — please try again')
    } finally {
      setNotifySending(false)
    }
  }

  async function toggleSelected(linkId: string, currentlySelected: boolean) {
    await fetch(`/api/bank-links/${linkId}/select`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected: !currentlySelected }),
    })
    await fetchBankLinks()
  }

  async function sendBrokerAgreement() {
    setAgreementSending(true)
    setAgreementError(null)
    try {
      const res = await fetch('/api/docuseal/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_id: id,
          broker_fee: formatBrokerFee(agreementBrokerFee),
          hnw: agreementHnw,
          ...(agreementTwoBorrowers && {
            borrower_2_name: agreementBorrower2Name,
            borrower_2_email: agreementBorrower2Email,
          }),
        }),
      })
      const text = await res.text()
      let json: { error?: string; ok?: boolean } = {}
      try { json = JSON.parse(text) } catch { /* non-JSON response */ }
      if (!res.ok) {
        setAgreementError(json.error ?? 'Failed to send agreement')
      } else {
        setAgreementSent(true)
        setTimeout(() => {
          setShowAgreementModal(false)
          setAgreementSent(false)
          setAgreementHnw(false)
          setAgreementBrokerFee('')
          setAgreementTwoBorrowers(false)
          setAgreementBorrower2Name('')
          setAgreementBorrower2Email('')
        }, 2000)
      }
    } catch (e) {
      setAgreementError('Network error — please try again')
    } finally {
      setAgreementSending(false)
    }
  }

  async function resendBrokerAgreement() {
    if (!resendFee) return
    setResending(true)
    setResendError(null)
    try {
      const res = await fetch('/api/docuseal/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan_id: id, broker_fee: formatBrokerFee(resendFee) }),
      })
      const text = await res.text()
      let json: { error?: string } = {}
      try { json = JSON.parse(text) } catch { /* non-JSON */ }
      if (!res.ok) {
        setResendError(json.error ?? 'Resend failed — please try again')
      } else {
        setResendConfirm(false)
        setResendFee('')
        await fetchLoan()
      }
    } catch {
      setResendError('Network error — please try again')
    } finally {
      setResending(false)
    }
  }

  function set(key: string, val: unknown) { setDraft((d) => ({ ...d, [key]: val })) }

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>
  if (!loan) return (
    <div className="py-12 text-center">
      <p className="text-gray-500">Loan not found.</p>
      <Link href="/dashboard/pipeline" className="text-sm text-[#003087] hover:underline mt-2 block">← Back to Pipeline</Link>
    </div>
  )

  type ContactShape = { first_name: string; last_name: string; email: string; entity_name?: string }
  const contact = (loan.contacts ?? null) as ContactShape | null
  const isFunded = loan.stage === 'funded'
  const isRefinance = ['refinance', 'refinance_rate_term', 'refinance_cash_out'].includes(String(draft.loan_purpose))
  const isConstruction = ['rehab', 'ground_up'].includes(String(draft.loan_program))
  const isSFR = ['Single Family', 'Condo', 'Townhouse', '2-4 Unit'].includes(String(draft.property_type))

  const noi = calcNOI(draft)
  const netWorth = calcNetWorth(draft)
  const totalProject = calcTotalProject(draft)
  const ltv = pct(draft.loan_amount, draft.appraised_value)
  const arvltv = pct(draft.loan_amount, draft.arv)
  const ltc = pct(draft.loan_amount, totalProject)

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/dashboard/pipeline" className="text-gray-400 hover:text-gray-600 text-sm block mb-1">
            ← Pipeline
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {loan.address_city
              ? `${loan.address_city}, ${loan.address_state ?? ''}`
              : (String(loan.property_type ?? 'Loan'))}
          </h1>
          {contact && (
            <Link href={`/dashboard/contacts/${loan.contact_id}`} className="text-sm text-[#003087] hover:underline mt-0.5 block">
              {contact.first_name} {contact.last_name}
              {contact.entity_name ? ` — ${contact.entity_name}` : ''}
            </Link>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {loan.is_dead ? (
            <button onClick={unmarkDead} className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-50">
              Restore
            </button>
          ) : (
            <button onClick={() => setDeadModal(true)} className="border border-red-300 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50">
              Mark Dead
            </button>
          )}
          {!editing ? (
            <button onClick={() => setEditing(true)} className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-50">
              Edit
            </button>
          ) : (
            <>
              <button onClick={saveLoan} disabled={saving} className="bg-[#003087] text-white px-4 py-1.5 rounded text-sm hover:bg-[#002070] disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setDraft(loan); setSaveError('') }} className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-50">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      {saveError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Save error: {saveError}
        </div>
      )}

      {/* Dead banner */}
      {loan.is_dead && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Dead / Withdrawn</strong>{loan.dead_reason ? ` — ${loan.dead_reason}` : ''}
        </div>
      )}

      {/* Stage selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Stage</p>
        <div className="flex gap-2 flex-wrap">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => !editing && changeStage(s)}
              className={`px-3 py-1.5 rounded text-sm font-medium capitalize transition ${
                loan.stage === s
                  ? 'bg-[#003087] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Property image carousel ── */}
      {(imageUrls.length > 0 || loan.address_street) && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
          <div className="relative group">
            {/* Main image */}
            <div className="cursor-zoom-in" onClick={() => imageUrls.length > 0 && setImageLightbox(true)}>
              {imageUrls.length > 0 ? (
                <Image src={imageUrls[imageIndex]} alt="Property" width={900} height={600} className="w-full object-contain max-h-96" />
              ) : (
                <StreetView
                  street={loan.address_street}
                  city={loan.address_city}
                  state={loan.address_state}
                  zip={loan.address_zip}
                  width={900}
                  height={300}
                  className="w-full object-cover h-52"
                />
              )}
              {imageUrls.length > 0 && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center pointer-events-none">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 px-2 py-1 rounded transition-all">
                    Click to expand
                  </span>
                </div>
              )}
            </div>
            {/* Carousel arrows */}
            {imageUrls.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setImageIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length) }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 hover:bg-opacity-60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
                >
                  ‹
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setImageIndex((i) => (i + 1) % imageUrls.length) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 hover:bg-opacity-60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
                >
                  ›
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-40 text-white text-xs px-2 py-0.5 rounded-full">
                  {imageIndex + 1} / {imageUrls.length}
                </div>
              </>
            )}
          </div>
          <div className="px-4 py-2 flex items-center justify-between border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {imageUrls.length > 0 ? `Photo ${imageIndex + 1} of ${imageUrls.length}` : 'Google Street View'}
            </p>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadImage} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={imageUploading}
                className="text-xs text-[#003087] hover:underline disabled:opacity-50">
                {imageUploading ? 'Uploading...' : '+ Add photo'}
              </button>
              {imageUrls.length > 0 && imagePaths[imageIndex] && (
                <button
                  onClick={() => deleteImage(imagePaths[imageIndex])}
                  disabled={imageDeleting}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  {imageDeleting ? 'Removing...' : 'Remove this photo'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Loan Request ── */}
      <Section title="Loan Request">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <F label="Loan Amount" k="loan_amount" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Interest Rate %" k="interest_rate" type="number" suffix="%" {...{ draft, set, editing }} />
          <FSelect label="Fixed Term" k="loan_term_years" options={['1','3','5','10','30']} labels={['1yr Fixed','3yr Fixed','5yr Fixed','10yr Fixed','30yr Fixed']} numeric {...{ draft, set, editing }} />
          <FSelect label="Amortization" k="amortization_years" options={['20','25','30']} labels={['20yr','25yr','30yr']} numeric {...{ draft, set, editing }} />
          <FCheck label="Interest Only" k="interest_only" {...{ draft, set, editing }} />
          <FSelect label="Purpose" k="loan_purpose" options={['purchase','refinance_rate_term','refinance_cash_out']} labels={['Purchase','Rate & Term Refinance','Cash-Out Refinance']} {...{ draft, set, editing }} />
          <FSelect label="Program" k="loan_program" options={['bridge','permanent','rehab','ground_up']} labels={['Bridge','Long Term','Rehab','Ground Up Construction']} {...{ draft, set, editing }} />
          <FSelect label="Financing Preference" k="financing_preference" options={['institutional','private']} {...{ draft, set, editing }} />
          <FSelect label="Property Type" k="property_type" options={PROPERTY_TYPES} {...{ draft, set, editing }} />
          <FCheck label="Show rate to borrower" k="show_rate_to_borrower" {...{ draft, set, editing }} />
        </div>
        <div className="mt-3">
          <F label="Comments" k="comments" multiline {...{ draft, set, editing }} />
        </div>
      </Section>

      {/* ── Property Details ── */}
      <Section title="Property Details">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <F label="Street Address" k="address_street" className="col-span-2" {...{ draft, set, editing }} />
          <F label="City" k="address_city" {...{ draft, set, editing }} />
          <F label="State" k="address_state" {...{ draft, set, editing }} />
          <F label="Zip" k="address_zip" {...{ draft, set, editing }} />
          <F label="Purchase Price" k="purchase_price" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Appraised Value" k="appraised_value" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="ARV (After Repair Value)" k="arv" type="number" prefix="$" {...{ draft, set, editing }} />
          <FSelect label="Property Use" k="property_use" options={['investment','owner_user']} {...{ draft, set, editing }} />
          <F label="Total Units" k="total_units" type="number" {...{ draft, set, editing }} />
          <F label="Commercial Units" k="commercial_units" type="number" {...{ draft, set, editing }} />
          <F label="Residential Units" k="residential_units" type="number" {...{ draft, set, editing }} />
          <F label="Section 8 Units" k="section8_units" type="number" {...{ draft, set, editing }} />
          <F label="Occupied Comm. Units" k="occupied_commercial_units" type="number" {...{ draft, set, editing }} />
          <F label="Occupied Res. Units" k="occupied_residential_units" type="number" {...{ draft, set, editing }} />
          <F label="Building Sq Ft" k="building_sqft" type="number" {...{ draft, set, editing }} />
          <F label="Lot Size (SF)" k="lot_size_sf" type="number" {...{ draft, set, editing }} />
          <F label="Year Built" k="year_built" type="number" {...{ draft, set, editing }} />
          <F label="Floors" k="floors" type="number" {...{ draft, set, editing }} />
          <F label="Buildings" k="buildings" type="number" {...{ draft, set, editing }} />
          <F label="Occupancy %" k="occupancy_pct" type="number" suffix="%" {...{ draft, set, editing }} />
          <F label="Annual Taxes" k="annual_taxes" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Annual Insurance" k="annual_insurance" type="number" prefix="$" {...{ draft, set, editing }} />
        </div>
        <div className="flex gap-4 mt-3">
          <FCheck label="Deferred Maintenance" k="deferred_maintenance" {...{ draft, set, editing }} />
          <FCheck label="Code Violations" k="code_violations" {...{ draft, set, editing }} />
        </div>
      </Section>

      {/* ── SFR (conditional) ── */}
      {isSFR && (
        <Section title="SFR Details">
          <div className="grid grid-cols-3 gap-4">
            <F label="Bedrooms" k="bedrooms" type="number" {...{ draft, set, editing }} />
            <F label="Bathrooms" k="bathrooms" type="number" {...{ draft, set, editing }} />
            <F label="Garage Spaces" k="garage_spaces" type="number" {...{ draft, set, editing }} />
          </div>
        </Section>
      )}

      {/* ── Income & Expenses ── */}
      <Section title="Income & Expenses">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FSelect label="Actual or Proforma" k="income_actual_or_proforma" options={['actual','proforma']} {...{ draft, set, editing }} />
          <F label="Gross Annual Income" k="gross_annual_income" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Vacancy Factor %" k="vacancy_factor_pct" type="number" suffix="%" {...{ draft, set, editing }} />
          <F label="Annual Operating Expenses" k="annual_operating_expenses" type="number" prefix="$" {...{ draft, set, editing }} />
        </div>
        {noi !== null && (
          <CalcRow label="NOI (calculated)" value={`$${Math.round(noi).toLocaleString()}`} />
        )}
      </Section>

      {/* ── Refinance (conditional) ── */}
      {isRefinance && (
        <Section title="Refinance Details">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <F label="Date Acquired" k="date_acquired" type="date" {...{ draft, set, editing }} />
            <F label="Original Purchase Price" k="original_purchase_price" type="number" prefix="$" {...{ draft, set, editing }} />
            <F label="Existing Loan Balance" k="existing_loan_balance" type="number" prefix="$" {...{ draft, set, editing }} />
            <F label="Refinance Purpose" k="refinance_purpose" {...{ draft, set, editing }} />
            <F label="Cashout Amount" k="cashout_amount" type="number" prefix="$" {...{ draft, set, editing }} />
            <F label="Existing Lender" k="existing_lender" {...{ draft, set, editing }} />
          </div>
          <div className="flex gap-4 mt-3">
            <FCheck label="Prepayment Penalty" k="prepayment_penalty" {...{ draft, set, editing }} />
            <FCheck label="Mortgage Current" k="mortgage_current" {...{ draft, set, editing }} />
          </div>
          <div className="mt-3">
            <F label="CapEx Summary" k="capex_summary" multiline {...{ draft, set, editing }} />
          </div>
        </Section>
      )}

      {/* ── Construction / Rehab (conditional) ── */}
      {isConstruction && (
        <Section title="Construction / Rehab">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <F label="CapEx Spent to Date" k="capex_spent_to_date" type="number" prefix="$" {...{ draft, set, editing }} />
            <F label="New Construction Costs to Completion" k="new_construction_costs" type="number" prefix="$" {...{ draft, set, editing }} />
          </div>
          {totalProject !== null && (
            <>
              <CalcRow label="Total Project Cost (calculated)" value={fmt$(totalProject)} />
              {ltc && <CalcRow label="LTC (calculated)" value={ltc} />}
            </>
          )}
        </Section>
      )}

      {/* ── Borrower Financials ── */}
      <Section title="Borrower Financials">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <F label="Properties Owned" k="properties_owned" type="number" {...{ draft, set, editing }} />
          <F label="Total RE Value" k="total_re_value" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Cash Reserves" k="cash_reserves" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Investment Assets" k="investment_assets" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Personal Property Value" k="personal_property_value" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Other Business Value" k="other_business_value" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Total Mortgage Debt" k="total_mortgage_debt" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Credit Card Debt" k="credit_card_debt" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Other Loans" k="other_loans" type="number" prefix="$" {...{ draft, set, editing }} />
          <F label="Taxes / Bills Owed" k="taxes_bills_owed" type="number" prefix="$" {...{ draft, set, editing }} />
        </div>
        {netWorth !== null && (
          <CalcRow label="Est. Net Worth (calculated)" value={fmt$(netWorth)} />
        )}
      </Section>

      {/* ── Calculated Ratios ── */}
      {(ltv || arvltv) && (
        <Section title="Calculated Ratios">
          <div className="flex gap-6 flex-wrap text-sm">
            {ltv && <CalcRow label="LTV" value={ltv} />}
            {arvltv && <CalcRow label="ARV-LTV" value={arvltv} />}
          </div>
        </Section>
      )}

      {/* ── Deal Summary ── */}
      <Section title="Deal Summary">
        <FCheck label="NNN Leases" k="nnn_leases" {...{ draft, set, editing }} />
        <div className="mt-3">
          <F label="Exit Strategy" k="exit_strategy" {...{ draft, set, editing }} />
        </div>
        <div className="mt-3">
          <F label="Full Loan Summary" k="full_loan_summary" multiline rows={5} {...{ draft, set, editing }} />
        </div>
      </Section>

      {/* ── Property Showcase (funded loans) ── */}
      {isFunded && (
        <Section title="Homepage Showcase">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-3">
                Upload a property photo and enable the toggle to feature this deal on the public homepage.
              </p>
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(loan.show_on_homepage)}
                    onChange={(e) => toggleHomepage(e.target.checked)}
                    className="rounded"
                  />
                  Show on homepage
                </label>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadImage} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={imageUploading}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {imageUploading ? 'Uploading...' : loan.property_image_path ? 'Replace Photo' : 'Upload Photo'}
              </button>
            </div>
            {imageUrls[0] && (
              <div className="w-40 h-28 relative rounded overflow-hidden border border-gray-200 flex-shrink-0">
                <Image src={imageUrls[0]} alt="Property" fill className="object-cover" unoptimized />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Tasks ── */}
      <Section title="Tasks">
        <form onSubmit={addTask} className="flex gap-2 mb-4">
          <input
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
            placeholder="Add a task..."
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          />
          <input
            type="date"
            value={taskDate}
            onChange={e => setTaskDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          />
          <button type="submit" disabled={taskAdding || !taskTitle.trim()}
            className="bg-[#003087] text-white px-3 py-1.5 rounded text-sm hover:bg-[#002070] disabled:opacity-50">
            Add
          </button>
        </form>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No tasks yet.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => {
              const isOpen = !task.completed
              return (
                <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border text-sm group ${isOpen ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                  <button
                    onClick={() => toggleTask(task)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${task.completed ? 'bg-[#003087] border-[#003087]' : 'border-gray-300 hover:border-[#003087]'}`}
                  >
                    {task.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <p className={`flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
                  {task.due_date && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <button onClick={() => deleteTask(task.id)}
                    className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs flex-shrink-0">
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* ── Documents ── */}
      <Section title="Documents">
        <p className="text-xs text-gray-500 mb-3">
          Upload broker agreements and other deal docs. Borrower-uploaded docs also appear here.
        </p>

        {/* Send / Resend Broker Agreement */}
        <div className="mb-4 flex gap-2 items-center">
          <button
            onClick={() => { setShowAgreementModal(true); setAgreementError(null) }}
            className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070]"
          >
            Send Broker Agreement
          </button>
          {loan?.broker_fee_sent && (
            !resendConfirm ? (
              <button
                onClick={() => {
                  setResendFee(parseBrokerFee(loan.broker_fee_sent))
                  setResendError(null)
                  setResendConfirm(true)
                }}
                className="border border-[#003087] text-[#003087] px-4 py-2 rounded text-sm font-medium hover:bg-blue-50"
              >
                Resend Agreement
              </button>
            ) : (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col gap-2 w-72">
                <p className="text-xs font-medium text-gray-600">Confirm broker fee to resend</p>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={resendFee}
                  onChange={(e) => setResendFee(e.target.value)}
                  placeholder="e.g. 1.5"
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
                {resendFee && !isNaN(parseFloat(resendFee)) && (
                  <p className="text-xs text-gray-500">
                    Will read: <span className="font-medium text-gray-700">{formatBrokerFee(resendFee)}</span>
                  </p>
                )}
                {resendError && <p className="text-xs text-red-600">{resendError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={resendBrokerAgreement}
                    disabled={resending || !resendFee}
                    className="bg-[#003087] text-white px-3 py-1.5 rounded text-sm hover:bg-[#002070] disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend'}
                  </button>
                  <button
                    onClick={() => { setResendConfirm(false); setResendError(null) }}
                    className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <div className="flex gap-2 items-center mb-4 flex-wrap">
          <select
            value={adminDocType}
            onChange={(e) => { setAdminDocType(e.target.value); setOtherAdminDocName('') }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          >
            {ADMIN_DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {adminDocType === 'other' && (
            <input
              value={otherAdminDocName}
              onChange={(e) => setOtherAdminDocName(e.target.value)}
              placeholder="Describe document..."
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            />
          )}
          <input ref={adminDocFileRef} type="file" onChange={uploadAdminDoc} className="hidden" />
          <button
            onClick={() => adminDocFileRef.current?.click()}
            disabled={docUploading}
            className="border border-[#003087] text-[#003087] px-4 py-1.5 rounded text-sm hover:bg-blue-50 disabled:opacity-50"
          >
            {docUploading ? 'Uploading...' : '+ Upload'}
          </button>
        </div>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No documents yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                <div>
                  <p className="font-medium text-gray-800">{doc.file_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ADMIN_DOC_TYPES.find(t => t.value === doc.doc_type)?.label ?? doc.doc_type.replace(/_/g, ' ')}
                    {' · '}{doc.uploaded_by_label}
                    {doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ''}
                  </p>
                </div>
                <div className="flex gap-3 ml-4 flex-shrink-0">
                  <button
                    onClick={() => viewDoc(doc.id)}
                    className="text-xs text-[#003087] hover:underline"
                  >
                    View
                  </button>
                  <button
                    onClick={() => deleteAdminDoc(doc.id)}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Notes ── */}
      <Section title="Notes">
        <form onSubmit={submitNote} className="flex gap-2 mb-4">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          />
          <button
            type="submit"
            disabled={addingNote || !newNote.trim()}
            className="bg-[#003087] text-white px-4 py-2 rounded text-sm hover:bg-[#002070] disabled:opacity-50"
          >
            Add
          </button>
        </form>
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="border-l-2 border-gray-200 pl-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Bank Links ── */}
      <Section title="Bank Portal Links">
        <p className="text-sm text-gray-500 mb-4">
          Generate a password-protected link to share this loan package with a lender. The link expires automatically.
        </p>

        {/* Newly created link — show prominently */}
        {newLinkUrl && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800 mb-2">
              {emailSent ? 'Link created and emailed to lender.' : 'Link created — copy it now:'}
            </p>
            <div className="flex items-center gap-2">
              <input readOnly value={newLinkUrl} className="flex-1 border border-green-300 rounded px-3 py-1.5 text-sm bg-white font-mono" />
              <button onClick={() => copyLink(newLinkUrl)}
                className="bg-green-700 text-white px-3 py-1.5 rounded text-sm hover:bg-green-800 whitespace-nowrap">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-green-600 mt-2">
              {emailSent
                ? 'The lender received the link and password by email. The password is not recoverable — save it separately.'
                : 'Share this link along with the password you set. The password is not recoverable — save it separately.'}
            </p>
          </div>
        )}

        {/* Existing links */}
        {bankLinks.length > 0 && (
          <div className="space-y-2 mb-4">
            {bankLinks.map((link) => {
              const isActive = !link.revoked_at && new Date(link.expires_at) > new Date()
              const linkUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/loan-file/${link.token}`
              const decisionBadge = link.decision === 'interested'
                ? <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Interested</span>
                : link.decision === 'pass'
                ? <span className="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">Pass</span>
                : <span className="text-xs text-gray-400">No response</span>
              return (
                <div key={link.id} className={`p-3 rounded-lg border text-sm ${isActive ? (link.is_selected ? 'border-[#003087] bg-blue-50' : 'border-gray-200 bg-white') : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{link.label || 'Unnamed link'}</p>
                      {decisionBadge}
                      {link.is_selected && <span className="text-xs font-semibold text-[#003087]">★ Selected</span>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {isActive && (
                        <button
                          onClick={() => toggleSelected(link.id, link.is_selected)}
                          className={`text-xs px-3 py-1.5 rounded border ${link.is_selected ? 'border-[#003087] text-[#003087] hover:bg-blue-50' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {link.is_selected ? 'Deselect' : 'Select'}
                        </button>
                      )}
                      {isActive && (
                        <button onClick={() => copyLink(linkUrl)}
                          className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50">
                          Copy URL
                        </button>
                      )}
                      {isActive && (
                        <button onClick={() => openNotifyModal(link)}
                          className="text-xs border border-blue-200 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-50">
                          Notify Bank
                        </button>
                      )}
                      {isActive && (
                        <button onClick={() => revokeLink(link.id)}
                          className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded hover:bg-red-50">
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {isActive ? `Expires ${new Date(link.expires_at).toLocaleDateString()}` : link.revoked_at ? 'Revoked' : 'Expired'}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Create link form */}
        {showLinkForm ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 relative">
                <label className="block text-xs text-gray-500 mb-1">Lender / bank (optional)</label>
                <input
                  ref={lenderInputRef}
                  value={linkLabel}
                  onChange={(e) => {
                    const val = e.target.value
                    setLinkLabel(val)
                    setSelectedLender(null)
if (val.trim().length > 0) {
                      const q = val.toLowerCase()
                      setLenderSuggestions(lenderOptionsRef.current.filter(l => l.company?.toLowerCase().includes(q)))
                      setShowSuggestions(true)
                    } else {
                      setLenderSuggestions([])
                      setShowSuggestions(false)
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="e.g. First National Bank"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
                {showSuggestions && lenderSuggestions.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded shadow-md mt-0.5 max-h-48 overflow-y-auto text-sm">
                    {lenderSuggestions.map(l => (
                      <li
                        key={l.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onMouseDown={() => {
                          setLinkLabel(l.company || '')
                          setSelectedLender(l)
                          setShowSuggestions(false)
                          // Collect all contacts for this lender
                          const contacts: { name: string | null; email: string | null }[] = []
                          if (l.contact_name || l.email) contacts.push({ name: l.contact_name, email: l.email })
                          l.lender_contacts.forEach(c => { if (c.name || c.email) contacts.push({ name: c.name, email: c.email }) })
                          if (contacts.length === 1) {
                            setLinkContactName(contacts[0].name || '')
                            setLinkEmail(contacts[0].email || '')
                          } else {
                            // Reset so user picks from dropdown
                            setLinkContactName('')
                            setLinkEmail('')
                          }
                        }}
                      >
                        <span className="font-medium">{l.company}</span>
                        {l.contact_name && <span className="text-gray-400 ml-2 text-xs">{l.contact_name}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Contact picker — shown when lender selected and has multiple contacts */}
              {selectedLender && (() => {
                const contacts: { name: string | null; email: string | null }[] = []
                if (selectedLender.contact_name || selectedLender.email) contacts.push({ name: selectedLender.contact_name, email: selectedLender.email })
                selectedLender.lender_contacts.forEach(c => { if (c.name || c.email) contacts.push({ name: c.name, email: c.email }) })
                if (contacts.length <= 1) return null
                return (
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Send to (choose contact)</label>
                    <select
                      value={`${linkContactName}||${linkEmail}`}
                      onChange={(e) => {
                        const [name, email] = e.target.value.split('||')
                        setLinkContactName(name)
                        setLinkEmail(email)
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                    >
                      <option value="||">— select a contact —</option>
                      {contacts.map((c, i) => (
                        <option key={i} value={`${c.name || ''}||${c.email || ''}`}>
                          {[c.name, c.email].filter(Boolean).join(' — ')}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })()}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Contact name (optional)</label>
                <input value={linkContactName} onChange={(e) => setLinkContactName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Send to email (optional — leave blank to just copy the link)</label>
                <input type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)}
                  placeholder="lender@bank.com"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Password *</label>
                <input type="text" value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="Auto-generated — edit if needed"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Expires in</label>
                <select value={linkDays} onChange={(e) => setLinkDays(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={createBankLink} disabled={creatingLink || !linkPassword}
                className="bg-[#003087] text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50">
                {creatingLink ? (linkEmail ? 'Sending...' : 'Generating...') : (linkEmail ? 'Generate & Send' : 'Generate Link')}
              </button>
              <button onClick={() => { setShowLinkForm(false); setSelectedLender(null); setLinkLabel(''); setLinkEmail(''); setLinkContactName('') }}
                className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setShowLinkForm(true); setLinkPassword(generateLinkPassword()) }}
            className="text-sm text-[#003087] font-medium hover:underline">
            + Generate New Link
          </button>
        )}
      </Section>

      {/* ── Lender Uploads ── */}
      <Section title="Lender Uploads">
        <p className="text-xs text-gray-500 mb-3">Documents uploaded by lenders through their portal, or added by you on their behalf. Select a lender above to share their uploads with the borrower.</p>

        {/* Admin upload form */}
        {bankLinks.filter(l => !l.revoked_at).length > 0 && (
          <div className="flex gap-2 items-center mb-4 flex-wrap">
            <select
              value={lenderDocBankLinkId}
              onChange={(e) => setLenderDocBankLinkId(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            >
              <option value="">— Select bank —</option>
              {bankLinks.filter(l => !l.revoked_at).map(l => (
                <option key={l.id} value={l.id}>{l.label || 'Unnamed link'}</option>
              ))}
            </select>
            <input
              type="text"
              value={lenderDocLabel}
              onChange={(e) => setLenderDocLabel(e.target.value)}
              placeholder="Label (e.g. Term Sheet)"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] w-44"
            />
            <input ref={lenderDocFileRef} type="file" onChange={uploadLenderDoc} className="hidden" />
            <button
              onClick={() => lenderDocFileRef.current?.click()}
              disabled={lenderDocUploading || !lenderDocBankLinkId}
              className="border border-[#003087] text-[#003087] px-4 py-1.5 rounded text-sm hover:bg-blue-50 disabled:opacity-50"
            >
              {lenderDocUploading ? 'Uploading...' : '+ Upload'}
            </button>
          </div>
        )}

        {lenderDocs.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No lender uploads yet.</p>
        ) : (
          <div className="space-y-2">
            {lenderDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                <div>
                  <p className="font-medium text-gray-800">{doc.file_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc.doc_label.replace(/_/g, ' ')}
                    {doc.lender_label ? ` · ${doc.lender_label}` : ''}
                    {doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ''}
                  </p>
                </div>
                <div className="flex gap-3 ml-4 flex-shrink-0">
                  <button
                    onClick={() => viewLenderDoc(doc.id, doc.bank_link_id)}
                    className="text-xs text-[#003087] hover:underline"
                  >
                    View
                  </button>
                  <button
                    onClick={() => deleteLenderDoc(doc.id)}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Broker Agreement modal */}
      {showAgreementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[480px]">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Send Broker Agreement</h2>
            <p className="text-sm text-gray-500 mb-4">
              Pre-filled with borrower name and property address from this loan.
            </p>

            <div className="space-y-4">
              {/* Template selector */}
              <div className="flex gap-2">
                {[
                  { value: false, label: 'Standard' },
                  { value: true,  label: 'High Net Worth' },
                ].map(({ value, label }) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => setAgreementHnw(value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      agreementHnw === value
                        ? 'bg-[#003087] text-white border-[#003087]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-[#003087]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Broker Fee (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={agreementBrokerFee}
                  onChange={(e) => setAgreementBrokerFee(e.target.value)}
                  placeholder="e.g. 1.5"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
                {agreementBrokerFee && !isNaN(parseFloat(agreementBrokerFee)) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Will read: <span className="font-medium text-gray-700">{formatBrokerFee(agreementBrokerFee)}</span>
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreementTwoBorrowers}
                  onChange={(e) => setAgreementTwoBorrowers(e.target.checked)}
                  className="rounded"
                />
                Add a co-borrower
              </label>

              {agreementTwoBorrowers && (
                <div className="space-y-3 pl-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Co-Borrower Name</label>
                    <input
                      value={agreementBorrower2Name}
                      onChange={(e) => setAgreementBorrower2Name(e.target.value)}
                      placeholder="Full name"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Co-Borrower Email</label>
                    <input
                      type="email"
                      value={agreementBorrower2Email}
                      onChange={(e) => setAgreementBorrower2Email(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                    />
                  </div>
                </div>
              )}

              {agreementError && (
                <p className="text-sm text-red-600">{agreementError}</p>
              )}

              {agreementSent && (
                <p className="text-sm text-green-600 font-medium">Agreement sent successfully!</p>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setShowAgreementModal(false); setAgreementError(null); setAgreementHnw(false) }}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={sendBrokerAgreement}
                disabled={agreementSending || !agreementBrokerFee || (agreementTwoBorrowers && (!agreementBorrower2Name || !agreementBorrower2Email))}
                className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50"
              >
                {agreementSending ? 'Sending...' : 'Send for Signature'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notify Bank modal */}
      {notifyLink && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[520px] max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Notify Bank of Documents</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select documents to notify <strong>{notifyLink.label || 'this lender'}</strong> about. They&apos;ll receive an email with the list and their portal link.
            </p>

            <div className="overflow-y-auto flex-1 space-y-4">
              {/* Document checklist */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Documents</p>
                {docs.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No documents on this loan yet.</p>
                ) : (
                  <div className="space-y-1">
                    {docs.map((doc) => {
                      const label = ADMIN_DOC_TYPES.find((t) => t.value === doc.doc_type)?.label ?? doc.doc_type.replace(/_/g, ' ')
                      const date = new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      return (
                        <label key={doc.id} className="flex items-start gap-2.5 p-2 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifyDocIds.has(doc.id)}
                            onChange={(e) => {
                              setNotifyDocIds((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(doc.id)
                                else next.delete(doc.id)
                                return next
                              })
                            }}
                            className="mt-0.5 rounded"
                          />
                          <div className="text-sm">
                            <p className="font-medium text-gray-800">{doc.file_name}</p>
                            <p className="text-xs text-gray-400">{label} · Uploaded {date}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Email fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recipient Email *</label>
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="lender@bank.com"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recipient Name</label>
                  <input
                    value={notifyName}
                    onChange={(e) => setNotifyName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Custom Note (optional — replaces default message)</label>
                <textarea
                  rows={3}
                  value={notifyNote}
                  onChange={(e) => setNotifyNote(e.target.value)}
                  placeholder="Leave blank for the default document notification message..."
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
              </div>

              {notifySent && <p className="text-sm text-green-600 font-medium">Notification sent successfully!</p>}
              {notifyError && <p className="text-sm text-red-600">{notifyError}</p>}
            </div>

            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setNotifyLink(null)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={sendNotification}
                disabled={notifySending || !notifyEmail || notifyDocIds.size === 0}
                className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50"
              >
                {notifySending ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {imageLightbox && imageUrls[imageIndex] && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 cursor-zoom-out p-4"
          onClick={() => setImageLightbox(false)}
        >
          <img src={imageUrls[imageIndex]} alt="Property" className="max-w-full max-h-full object-contain rounded shadow-2xl" />
        </div>
      )}

      {/* Dead modal */}
      {deadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Mark as Dead / Withdrawn</h2>
            <p className="text-sm text-gray-600 mb-3">Reason (optional):</p>
            <input
              value={deadReason}
              onChange={(e) => setDeadReason(e.target.value)}
              placeholder="e.g. Borrower withdrew, Rate issues..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeadModal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={markDead} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
                Mark Dead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  )
}

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 mt-3 text-sm">
      <span className="text-gray-500">{label}:</span>
      <span className="font-semibold text-[#003087]">{value}</span>
    </div>
  )
}

type FProps = {
  label: string; k: string; draft: LoanData; set: (k: string, v: unknown) => void
  editing: boolean; type?: string; multiline?: boolean; rows?: number
  prefix?: string; suffix?: string; className?: string
}
function F({ label, k, draft, set, editing, type = 'text', multiline, rows = 3, prefix, suffix, className = '' }: FProps) {
  const val = draft[k] ?? ''
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {editing ? (
        multiline ? (
          <textarea
            rows={rows}
            value={String(val)}
            onChange={(e) => set(k, e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          />
        ) : (
          <div className="flex items-center">
            {prefix && <span className="text-gray-500 text-sm mr-1">{prefix}</span>}
            <input
              type={type}
              value={String(val)}
              onChange={(e) => set(k, type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            />
            {suffix && <span className="text-gray-500 text-sm ml-1">{suffix}</span>}
          </div>
        )
      ) : (
        <p className="text-sm text-gray-800">
          {val !== '' && val !== null && val !== undefined
            ? `${prefix ?? ''}${type === 'number' ? Number(val).toLocaleString() : String(val)}${suffix ?? ''}`
            : '—'}
        </p>
      )}
    </div>
  )
}

type FSelectProps = { label: string; k: string; draft: LoanData; set: (k: string, v: unknown) => void; editing: boolean; options: string[]; labels?: string[]; numeric?: boolean }
function FSelect({ label, k, draft, set, editing, options, labels, numeric }: FSelectProps) {
  const val = String(draft[k] ?? '')
  const displayLabel = (o: string, i: number) => labels?.[i] ?? o.replace(/_/g, ' ')
  const currentLabel = () => {
    const i = options.indexOf(val)
    return i >= 0 ? displayLabel(val, i) : val.replace(/_/g, ' ')
  }
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {editing ? (
        <select
          value={val}
          onChange={(e) => set(k, numeric && e.target.value ? Number(e.target.value) : e.target.value || null)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
        >
          <option value="">— Select —</option>
          {options.map((o, i) => (
            <option key={o} value={o}>{displayLabel(o, i)}</option>
          ))}
        </select>
      ) : (
        <p className="text-sm text-gray-800 capitalize">{currentLabel() || <span className="text-gray-400">—</span>}</p>
      )}
    </div>
  )
}

type FCheckProps = { label: string; k: string; draft: LoanData; set: (k: string, v: unknown) => void; editing: boolean }
function FCheck({ label, k, draft, set, editing }: FCheckProps) {
  const val = Boolean(draft[k])
  return editing ? (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
      <input type="checkbox" checked={val} onChange={(e) => set(k, e.target.checked)} className="rounded" />
      {label}
    </label>
  ) : (
    <p className="text-sm text-gray-700">{label}: <strong>{val ? 'Yes' : 'No'}</strong></p>
  )
}
