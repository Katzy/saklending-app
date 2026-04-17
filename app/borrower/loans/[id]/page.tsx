'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import StreetView from '@/components/StreetView'

type Loan = {
  id: string
  loan_amount: number | null
  loan_purpose: string | null
  loan_program: string | null
  property_type: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  stage: string
  purchase_price: number | null
  arv: number | null
}

type Doc = {
  id: string
  doc_type: string
  file_name: string
  file_size: number | null
  created_at: string
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'In Review', qualified: 'Qualified', application: 'Application',
  underwriting: 'Underwriting', approved: 'Approved', funded: 'Funded',
}

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-600', qualified: 'bg-blue-100 text-blue-700',
  application: 'bg-yellow-100 text-yellow-700', underwriting: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700', funded: 'bg-emerald-100 text-emerald-700',
}

const DOC_TYPES = [
  { value: 'purchase_contract', label: 'Purchase Contract' },
  { value: 'scope_of_work', label: 'Scope of Work & Budget' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'environmental', label: 'Environmental Report' },
  { value: 'rent_roll', label: 'Rent Roll' },
  { value: 't12', label: 'T-12 Operating Statement' },
  { value: 'tax_return', label: 'Tax Return' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'pfs', label: 'Personal Financial Statement (PFS)' },
  { value: 'other', label: 'Other' },
]

function fmt$(v: unknown) {
  const n = Number(v); if (!n) return null
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function BorrowerLoanDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [loan, setLoan] = useState<Loan | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [docType, setDocType] = useState('other')
  const [otherDocName, setOtherDocName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/borrower/loans/${id}`)
    if (!res.ok) return
    const json = await res.json()
    setLoan(json.loan)
    setDocs(json.documents)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')

    const resolvedDocType = docType === 'other' && otherDocName.trim()
      ? otherDocName.trim()
      : docType

    const fd = new FormData()
    fd.append('file', file)
    fd.append('doc_type', resolvedDocType)

    const res = await fetch(`/api/borrower/loans/${id}/documents`, { method: 'POST', body: fd })
    if (res.ok) {
      setUploadMsg(`"${file.name}" uploaded successfully.`)
      await fetchData()
    } else {
      const json = await res.json()
      setUploadMsg(`Upload failed: ${json.error}`)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function deleteDoc(docId: string) {
    setDeleting(docId)
    await fetch(`/api/borrower/loans/${id}/documents?doc_id=${docId}`, { method: 'DELETE' })
    setDocs((prev) => prev.filter((d) => d.id !== docId))
    setDeleting(null)
  }

  async function viewDoc(docId: string) {
    setViewing(docId)
    const res = await fetch(`/api/borrower/loans/${id}/documents/${docId}/url`)
    if (res.ok) {
      const { url } = await res.json()
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    setViewing(null)
  }

  async function downloadDoc(docId: string, fileName: string) {
    setDownloading(docId)
    const res = await fetch(`/api/borrower/loans/${id}/documents/${docId}/url`)
    if (res.ok) {
      const { url } = await res.json()
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.rel = 'noopener noreferrer'
      a.click()
    }
    setDownloading(null)
  }

  if (loading) return <p className="text-gray-400">Loading...</p>
  if (!loan) return <p className="text-gray-500">Loan not found.</p>

  return (
    <div className="max-w-2xl">
      <Link href="/borrower" className="text-gray-400 hover:text-gray-600 text-sm block mb-4">
        ← My Loans
      </Link>

      {/* Loan summary */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
        <StreetView
          street={loan.address_street}
          city={loan.address_city}
          state={loan.address_state}
          zip={loan.address_zip}
          width={800}
          height={300}
          className="w-full object-cover h-48 sm:h-64"
        />
        <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {loan.address_street ?? loan.address_city ?? loan.property_type ?? 'Your Loan'}
            </h1>
            {(loan.address_city || loan.address_state) && (
              <p className="text-sm text-gray-500 mt-0.5">{[loan.address_city, loan.address_state, loan.address_zip].filter(Boolean).join(', ')}</p>
            )}
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${STAGE_COLORS[loan.stage] ?? 'bg-gray-100 text-gray-600'}`}>
            {STAGE_LABELS[loan.stage] ?? loan.stage}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {loan.loan_amount && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Loan Amount</p>
              <p className="text-gray-800 mt-0.5 font-semibold">{fmt$(loan.loan_amount)}</p>
            </div>
          )}
          {loan.loan_program && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Program</p>
              <p className="text-gray-800 mt-0.5 capitalize">{loan.loan_program.replace('_', ' ')}</p>
            </div>
          )}
          {loan.loan_purpose && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Purpose</p>
              <p className="text-gray-800 mt-0.5 capitalize">{loan.loan_purpose}</p>
            </div>
          )}
          {loan.property_type && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Property Type</p>
              <p className="text-gray-800 mt-0.5">{loan.property_type}</p>
            </div>
          )}
          {loan.purchase_price && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Purchase Price</p>
              <p className="text-gray-800 mt-0.5">{fmt$(loan.purchase_price)}</p>
            </div>
          )}
          {loan.arv && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">ARV</p>
              <p className="text-gray-800 mt-0.5">{fmt$(loan.arv)}</p>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Document upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Documents</h2>
        <p className="text-sm text-gray-500 mb-5">
          Upload documents for your broker. Select the document type before uploading.
        </p>

        {/* Upload control */}
        <div className="flex gap-3 items-center mb-5 flex-wrap">
          <select
            value={docType}
            onChange={(e) => { setDocType(e.target.value); setOtherDocName('') }}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          >
            {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {docType === 'other' && (
            <input
              type="text"
              placeholder="Document name"
              value={otherDocName}
              onChange={(e) => setOtherDocName(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] w-48"
            />
          )}
          <input ref={fileRef} type="file" onChange={upload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Choose File & Upload'}
          </button>
        </div>

        {uploadMsg && (
          <div className={`mb-4 px-3 py-2 rounded text-sm ${uploadMsg.startsWith('Upload failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {uploadMsg}
          </div>
        )}

        {/* Document list */}
        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 gap-4">
                {/* Doc type label — prominent left column */}
                <div className="w-44 flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {DOC_TYPES.find(t => t.value === doc.doc_type)?.label ?? doc.doc_type}
                  </p>
                </div>
                {/* File name + metadata */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-600 truncate">{doc.file_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc.file_size ? fmtSize(doc.file_size) : ''}
                    {doc.file_size ? ' · ' : ''}{new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => viewDoc(doc.id)}
                    disabled={viewing === doc.id}
                    className="text-xs text-[#003087] hover:underline disabled:opacity-50"
                    title="Open in browser"
                  >
                    {viewing === doc.id ? '...' : 'View'}
                  </button>
                  <span className="text-gray-200">|</span>
                  <button
                    onClick={() => downloadDoc(doc.id, doc.file_name)}
                    disabled={downloading === doc.id}
                    className="text-xs text-[#003087] hover:underline disabled:opacity-50"
                    title="Save to device"
                  >
                    {downloading === doc.id ? '...' : 'Download'}
                  </button>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    disabled={deleting === doc.id}
                    className="text-gray-300 hover:text-red-400 text-sm disabled:opacity-50"
                    title="Remove"
                  >
                    {deleting === doc.id ? '...' : '✕'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
