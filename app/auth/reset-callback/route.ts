import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Server-side handler for the password reset PKCE code exchange.
// The email link redirects here instead of directly to /auth/reset so that
// the code verifier (stored in cookies by createBrowserClient) is readable
// server-side, regardless of which browser or device clicks the link.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const response = NextResponse.redirect(new URL('/auth/reset', origin))

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return response
  }

  // Exchange failed — send back to login with an error flag
  return NextResponse.redirect(new URL('/login?reset_error=1', origin))
}
