import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          const cookieOptions = {
            ...options,
            domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          }
          request.cookies.set({ name, value, ...cookieOptions })
          response.cookies.set({ name, value, ...cookieOptions })
        },
        remove(name: string, options: any) {
          const cookieOptions = {
            ...options,
            domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          }
          request.cookies.set({ name, value: '', ...cookieOptions })
          response.cookies.set({ name, value: '', ...cookieOptions })
        },
      },
    }
  )

  // Refresh session
  const { data: { session } } = await supabase.auth.getSession()

  // Define public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/reset-password']
  
  // Define protected routes
  const protectedRoutes = ['/auth/profile', '/auth/create', '/auth/settings']

  // Redirect logged-in users away from auth pages (login, signup, etc.)
  if (publicRoutes.includes(request.nextUrl.pathname) && session) {
    const profileUrl = new URL('/auth/profile', request.url)
    return NextResponse.redirect(profileUrl)
  }

  // Protect routes that require authentication
  if (protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route)) && !session) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Special handling for create route - check if user has necessary permissions
  if (request.nextUrl.pathname === '/auth/create' && session) {
    // You could add additional permission checks here if needed
    // For example, check if user has a 'creator' role
    // const { data: { user } } = await supabase.auth.getUser()
    // const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
    // if (!profile?.can_create_polls) {
    //   return NextResponse.redirect(new URL('/auth/profile?error=unauthorized', request.url))
    // }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (auth API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}