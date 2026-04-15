import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Role is stored in user_metadata when Scott invites a borrower
  // Admin accounts have no role set (undefined)
  const role = user?.user_metadata?.role as string | undefined
  const isBorrower = role === 'borrower'

  // ── Protect /dashboard — admin only ──────────────────────────
  if (path.startsWith('/dashboard')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    if (isBorrower) return NextResponse.redirect(new URL('/borrower', request.url))
  }

  // ── Protect /borrower — borrowers only ───────────────────────
  if (path.startsWith('/borrower')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    // Admin can access borrower portal for testing
  }

  // ── /login — redirect if already logged in ───────────────────
  if (path === '/login' && user) {
    const dest = isBorrower ? '/borrower' : '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/borrower/:path*', '/login'],
}
