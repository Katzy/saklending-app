import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// Returns the contact_id for the currently authenticated borrower.
// Tries three methods in order:
//  1. user_metadata.contact_id — set at invite time (fastest)
//  2. user_profiles table — created when Scott sends invite
//  3. contacts table by email — reliable fallback if 1 & 2 miss
export async function getBorrowerContact(): Promise<{ user_id: string; contact_id: string } | null> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient()

  // 1. Check user_metadata (set via inviteUserByEmail data param)
  const metaContactId = user.user_metadata?.contact_id as string | undefined
  if (metaContactId) {
    // Ensure user_profiles record exists (create if missing)
    await service.from('user_profiles').upsert(
      { id: user.id, contact_id: metaContactId, role: 'borrower' },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    return { user_id: user.id, contact_id: metaContactId }
  }

  // 2. Check user_profiles table
  const { data: profile } = await service
    .from('user_profiles')
    .select('contact_id')
    .eq('id', user.id)
    .single()

  if (profile?.contact_id) {
    return { user_id: user.id, contact_id: profile.contact_id }
  }

  // 3. Look up contact by email — works as long as the invite was sent
  //    to the same email address that's in the contacts table
  if (user.email) {
    const { data: contact } = await service
      .from('contacts')
      .select('id')
      .eq('email', user.email)
      .single()

    if (contact?.id) {
      // Backfill user_profiles so future requests hit method 2
      await service.from('user_profiles').upsert(
        { id: user.id, contact_id: contact.id, role: 'borrower' },
        { onConflict: 'id' }
      )
      return { user_id: user.id, contact_id: contact.id }
    }
  }

  return null
}
