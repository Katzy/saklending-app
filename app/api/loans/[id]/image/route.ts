import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST /api/loans/[id]/image — upload and append a property image
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const supabase = createServiceClient()
  const ext = file.name.split('.').pop()
  const path = `showcase/${params.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('loan-documents')
    .upload(path, file, { contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Fetch current paths (migrate legacy property_image_path into array if needed)
  const { data: loan } = await supabase
    .from('loans')
    .select('property_image_path, property_image_paths')
    .eq('id', params.id)
    .single()

  const existing: string[] = loan?.property_image_paths ?? []
  const legacy = loan?.property_image_path
  const base = existing.length === 0 && legacy ? [legacy] : existing
  const updated = [...base, path]

  const { error: updateError } = await supabase
    .from('loans')
    .update({ property_image_paths: updated, property_image_path: updated[0] })
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ path, paths: updated })
}

// DELETE /api/loans/[id]/image — remove one image by path
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { path } = await req.json()
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: loan } = await supabase
    .from('loans')
    .select('property_image_path, property_image_paths')
    .eq('id', params.id)
    .single()

  const existing: string[] = loan?.property_image_paths ?? []
  const legacy = loan?.property_image_path
  const base = existing.length === 0 && legacy ? [legacy] : existing
  const updated = base.filter((p) => p !== path)

  await supabase.storage.from('loan-documents').remove([path])

  await supabase
    .from('loans')
    .update({ property_image_paths: updated, property_image_path: updated[0] ?? null })
    .eq('id', params.id)

  return NextResponse.json({ paths: updated })
}
