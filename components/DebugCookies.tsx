'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugCookies() {
  useEffect(() => {
    console.log('All cookies:', document.cookie)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Supabase session:', session)
    })
  }, [])

  return null
}