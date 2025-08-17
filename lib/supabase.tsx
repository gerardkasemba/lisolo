import { createBrowserClient, type CookieOptions } from '@supabase/ssr'
import { RealtimeChannel } from '@supabase/realtime-js'

// ---- Create client with correct options ----
export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        heartbeatIntervalMs: 15000, // Supported
        timeout: 60000,             // Supported
        reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000), // Fixed type for tries
        // Removed maxReconnectAttempts as it’s not a valid option
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

  return client
}

// ---- Singleton client instance ----
export const supabase = createClient()

// ---- Realtime channel manager ----
export class RealtimeManager {
  private static channels: Map<string, RealtimeChannel> = new Map()

  static getChannel(pollId: number): RealtimeChannel {
    const channelKey = `poll_${pollId}`

    if (!this.channels.has(channelKey)) {
      const channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'polls',
            filter: `id=eq.${pollId}`
          },
          (payload) => {
            console.log('Change received:', payload)
          }
        )
        .subscribe((status, err) => {
          console.log(`Channel "${channelKey}" status:`, status)
          if (err) console.error(`Channel "${channelKey}" error:`, err.message)
        })

      this.channels.set(channelKey, channel)
    }

    return this.channels.get(channelKey)!
  }

  static removeChannel(pollId: number): void {
    const channelKey = `poll_${pollId}`
    const channel = this.channels.get(channelKey)
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelKey)
    }
  }
}