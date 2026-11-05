import { useState, type FormEvent } from 'react'
import { useAddPlayer, usePlayers } from '../lib/queries'

export default function Players() {
  const players = usePlayers()
  const addPlayer = useAddPlayer()
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await addPlayer.mutateAsync({ name, nickname, email })
    setName('')
    setNickname('')
    setEmail('')
  }

  const input =
    'w-full rounded-xl border border-pitch-700 bg-pitch-900 px-3 py-2.5 text-chalk outline-none focus:border-gold'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Plantilla</h1>

      <form onSubmit={onSubmit} className="space-y-2 rounded-2xl border border-pitch-700 p-4">
        <p className="text-sm font-semibold">Añadir jugador</p>
        <input className={input} required placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={input} placeholder="Apodo (opcional)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        <input
          className={input}
          type="email"
          placeholder="Email (para que pueda entrar)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted">
          Sin email queda como invitado: suma stats pero no puede entrar ni votar.
        </p>
        {addPlayer.error && <p className="text-sm text-red-400">{addPlayer.error.message}</p>}
        <button
          disabled={addPlayer.isPending}
          className="w-full rounded-xl bg-gold py-2.5 font-bold text-pitch-950 disabled:opacity-50"
        >
          {addPlayer.isPending ? 'Añadiendo…' : 'Añadir'}
        </button>
      </form>

      <ul className="divide-y divide-pitch-800 overflow-hidden rounded-2xl border border-pitch-700">
        {(players.data ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="font-medium">
                {p.name}
                {p.nickname && <span className="text-muted"> · {p.nickname}</span>}
              </p>
              {p.email && <p className="truncate text-xs text-muted">{p.email}</p>}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                p.user_id
                  ? 'bg-pitch-700 text-gold-soft'
                  : p.email
                    ? 'bg-pitch-800 text-muted'
                    : 'border border-pitch-700 text-muted'
              }`}
            >
              {p.user_id ? 'Vinculado' : p.email ? 'Pendiente' : 'Invitado'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
