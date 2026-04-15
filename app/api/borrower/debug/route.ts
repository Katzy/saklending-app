import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ authenticated: false, authError: authError?.message })

  const service = createServiceClient()

  const { data: profile } = await service
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: contactByEmail } = user.email
    ? await service.from('contacts').select('id, first_name, last_name, email').eq('email', user.email).single()
    : { data: null }

  return NextResponse.json({
    authenticated: true,
    user_id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
    user_profiles_record: profile,
    contact_by_email: contactByEmail,
  })
}
