import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useActiveSeason, usePlayers, useRegisterMatch } from '../lib/queries'
import { displayName, type LineupEntry, type Team } from '../lib/types'

type Row = Omit<LineupEntry, 'player_id' | 'team'> & { team: Team | null }
const emptyRow: Row = { team: null, goals: 0, assists: 0, is_goalkeeper: false }
const today = () => new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD en hora local

export default function NewMatch() {
  const navigate = useNavigate()
  const season = useActiveSeason()
  const players = usePlayers()
  const register = useRegisterMatch()

  const [playedAt, setPlayedAt] = useState(today)
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<Record<string, Row>>({})

  const rowOf = (id: string) => rows[id] ?? emptyRow
  const update = (id: string, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [id]: { ...rowOf(id), ...patch } }))

  const lineup: LineupEntry[] = Object.entries(rows)
    .filter(([, r]) => r.team)
    .map(([player_id, r]) => ({ ...r, player_id, team: r.team! }))

  const goalsA = lineup.filter((p) => p.team === 'A').reduce((s, p) => s + p.goals, 0)
  const goalsB = lineup.filter((p) => p.team === 'B').reduce((s, p) => s + p.goals, 0)
  const countA = lineup.filter((p) => p.team === 'A').length
  const countB = lineup.filter((p) => p.team === 'B').length
  const mismatch = goalsA !== scoreA || goalsB !== scoreB
  const canSubmit = !!season.data && countA > 0 && countB > 0 && !register.isPending

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!season.data) return
    if (
      mismatch &&
      !confirm(
        `Los goles apuntados (${goalsA}-${goalsB}) no cuadran con el marcador (${scoreA}-${scoreB}). ¿Guardar igualmente? (p. ej. goles en propia)`,
      )
    )
      return
    await register.mutateAsync({
      seasonId: season.data.id,
      playedAt,
      scoreA,
      scoreB,
      lineup,
      notes,
    })
    navigate('/partidos')
  }

  if (players.isLoading || season.isLoading) return <p className="text-muted">Cargando…</p>
  if (!season.data) return <p className="text-muted">No hay temporada activa.</p>

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Registrar partido</h1>

      <div className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
        <label className="text-sm text-muted">
          Fecha
          <input
            type="date"
            value={playedAt}
            max={today()}
            onChange={(e) => setPlayedAt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-pitch-700 bg-pitch-900 px-3 py-2.5 text-chalk"
          />
        </label>
        <ScoreInput label="A" value={scoreA} onChange={setScoreA} />
        <span className="pb-3 text-muted">–</span>
        <ScoreInput label="B" value={scoreB} onChange={setScoreB} />
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Alineaciones</h2>
          <span className="text-xs text-muted">
            A: {countA} · B: {countB}
          </span>
        </div>
        <ul className="divide-y divide-pitch-800 overflow-hidden rounded-2xl border border-pitch-700">
          {(players.data ?? []).map((p) => {
            const r = rowOf(p.id)
            return (
              <li key={p.id} className={`p-3 ${r.team ? 'bg-pitch-900' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`font-medium ${r.team ? '' : 'text-muted'}`}>{displayName(p)}</span>
                  <Segmented value={r.team} onChange={(team) => update(p.id, { team })} />
                </div>
                {r.team && (
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    <Stepper label="⚽ Goles" value={r.goals} onChange={(goals) => update(p.id, { goals })} />
                    <Stepper label="🅰 Asist." value={r.assists} onChange={(assists) => update(p.id, { assists })} />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.is_goalkeeper}
                        onChange={(e) => update(p.id, { is_goalkeeper: e.target.checked })}
                        className="size-4 accent-[var(--color-gold)]"
                      />
                      🧤 Portero
                    </label>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        {(players.data ?? []).length === 0 && (
          <p className="mt-2 text-sm text-muted">Primero añade jugadores en Plantilla.</p>
        )}
      </section>

      <label className="block text-sm text-muted">
        Notas (opcional)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Campo, incidencias, quién trajo el balón…"
          className="mt-1 w-full rounded-xl border border-pitch-700 bg-pitch-900 px-3 py-2.5 text-chalk"
        />
      </label>

      {mismatch && countA + countB > 0 && (
        <p className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-gold-soft">
          Goles apuntados {goalsA}-{goalsB} vs marcador {scoreA}-{scoreB}.
        </p>
      )}
      {register.error && <p className="text-sm text-red-400">{register.error.message}</p>}

      <button
        disabled={!canSubmit}
        className="w-full rounded-xl bg-gold py-3.5 font-bold text-pitch-950 disabled:opacity-40"
      >
        {register.isPending ? 'Guardando…' : 'Guardar partido'}
      </button>
    </form>
  )
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="text-center text-sm text-muted">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 block w-14 rounded-xl border border-pitch-700 bg-pitch-900 py-2.5 text-center text-lg font-bold text-chalk"
      />
    </label>
  )
}

function Segmented({ value, onChange }: { value: Team | null; onChange: (t: Team | null) => void }) {
  const opts: { v: Team | null; label: string }[] = [
    { v: null, label: '—' },
    { v: 'A', label: 'A' },
    { v: 'B', label: 'B' },
  ]
  return (
    <div className="flex overflow-hidden rounded-lg border border-pitch-700 text-sm font-semibold">
      {opts.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onChange(o.v)}
          className={`w-10 py-1.5 ${value === o.v ? 'bg-gold text-pitch-950' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const btn = 'size-8 rounded-lg border border-pitch-700 text-lg leading-none'
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted">{label}</span>
      <button type="button" className={btn} onClick={() => onChange(Math.max(0, value - 1))}>
        −
      </button>
      <span className="w-5 text-center font-bold tabular-nums">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}
