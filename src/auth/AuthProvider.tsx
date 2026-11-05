import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthState = {
  session: Session | null
  loading: boolean
  playerId: string | null
  isAdmin: boolean
  isMember: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    // No llamar a supabase dentro de este callback (puede bloquearse):
    // solo guardamos la sesión y el efecto de abajo hace el resto.
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setPlayerId(null)
      setIsAdmin(false)
      return
    }
    let cancelled = false
    setProfileLoading(true)
    Promise.all([
      supabase.rpc('claim_player'),
      supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle(),
    ]).then(([claim, admin]) => {
      if (cancelled) return
      setPlayerId((claim.data as string | null) ?? null)
      setIsAdmin(!!admin.data)
      setProfileLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const value: AuthState = {
    session,
    loading: sessionLoading || profileLoading,
    playerId,
    isAdmin,
    isMember: isAdmin || playerId !== null,
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
