import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Only act on fully completed submissions
  if (body.event_type !== 'submission.completed') {
    return NextResponse.json({ ok: true })
  }

  const submission = body.data
  const loanId = submission?.metadata?.loan_id
  if (!loanId) return NextResponse.json({ ok: true })

  // Find the completed document download URL
  const documents: { name: string; url: string }[] = submission.documents ?? []
  if (!documents.length) return NextResponse.json({ ok: true })

  const doc = documents[0]

  // Download the completed PDF from Docuseal
  const pdfRes = await fetch(doc.url, {
    headers: { 'X-Auth-Token': process.env.DOCUSEAL_API_KEY! },
  })
  if (!pdfRes.ok) {
    console.error('Failed to download completed PDF from Docuseal')
    return NextResponse.json({ error: 'download failed' }, { status: 500 })
  }

  const pdfBuffer = await pdfRes.arrayBuffer()
  const fileName = `broker_agreement_executed_${Date.now()}.pdf`
  const storagePath = `loans/${loanId}/${fileName}`

  const supabase = createServiceClient()

  const { error: uploadError } = await supabase.storage
    .from('loan-documents')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf' })

  if (uploadError) {
    console.error('Supabase upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { error: dbError } = await supabase.from('documents').insert({
    loan_id: loanId,
    doc_type: 'broker_agreement',
    file_name: fileName,
    storage_path: storagePath,
    file_size: pdfBuffer.byteLength,
    uploaded_by_label: 'docuseal',
  })

  if (dbError) {
    console.error('DB insert error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
