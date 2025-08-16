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

  // Handle logout specifically
  if (request.nextUrl.pathname === '/auth/logout') {
    // Get current path before logout
    const currentPath = request.nextUrl.searchParams.get('redirect') || request.headers.get('referer') || '/'
    
    // Clear session
    await supabase.auth.signOut()
    
    // Create response that clears cookies
    const logoutResponse = NextResponse.redirect(new URL(currentPath, request.url))
    
    // Clear cookies
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    
    return logoutResponse
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/reset-password']
  
  // Define protected routes
  const protectedRoutes = ['/profile', '/create', '/settings']

  // Redirect logged-in users away from auth pages (login, signup, etc.)
  if (publicRoutes.includes(request.nextUrl.pathname) && session) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/profile'
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // Protect routes that require authentication
  if (protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route)) && !session) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
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