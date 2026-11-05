import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-5xl">🏆</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Balón de Oro</h1>
        <p className="mt-1 text-muted">Las stats de la pachanga, en serio.</p>

        {status === 'sent' ? (
          <div className="mt-10 rounded-2xl border border-pitch-700 bg-pitch-900 p-5">
            <p className="font-semibold">Revisa tu email 📩</p>
            <p className="mt-1 text-sm text-muted">
              Te hemos mandado un enlace a <span className="text-chalk">{email}</span>. Ábrelo en
              este mismo móvil para entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 space-y-3">
            <label className="block text-sm text-muted" htmlFor="email">
              Tu email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-xl border border-pitch-700 bg-pitch-900 px-4 py-3 outline-none focus:border-gold"
            />
            <button
              disabled={status === 'sending'}
              className="w-full rounded-xl bg-gold py-3 font-bold text-pitch-950 disabled:opacity-60"
            >
              {status === 'sending' ? 'Enviando…' : 'Entrar con enlace mágico'}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
