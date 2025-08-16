// lib/supabase.ts
import { createBrowserClient, CookieOptions } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
      cookies: {
        getAll: () => {
          if (typeof document === 'undefined') return []
          
          return document.cookie.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=')
            return { name, value: decodeURIComponent(value) }
          })
        },
        setAll: (cookies: { name: string; value: string; options?: CookieOptions }[]) => {
          if (typeof document === 'undefined') return
          
          cookies.forEach(({ name, value, options }) => {
            const cookieOptions: CookieOptions = {
              path: '/',
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
            }

            let cookieString = `${name}=${encodeURIComponent(value)}`
            if (cookieOptions.path) cookieString += `; path=${cookieOptions.path}`
            if (cookieOptions.domain) cookieString += `; domain=${cookieOptions.domain}`
            if (cookieOptions.secure) cookieString += '; secure'
            if (cookieOptions.sameSite) cookieString += `; samesite=${cookieOptions.sameSite}`

            if (cookieOptions.expires) {
              const expiresDate =
                cookieOptions.expires instanceof Date
                  ? cookieOptions.expires
                  : typeof cookieOptions.expires === 'number'
                    ? new Date(Date.now() + cookieOptions.expires * 1000)
                    : new Date(cookieOptions.expires)
              cookieString += `; expires=${expiresDate.toUTCString()}`
            }

            document.cookie = cookieString
          })
        }
      }
    }
  )
}

// Optional: keep a singleton version if you want one instance globally
export const supabase = createClient()
