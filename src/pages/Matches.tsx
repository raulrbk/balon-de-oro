import { Link } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { useActiveSeason, useMatches } from '../lib/queries'
import { displayName, type Match, type Team } from '../lib/types'

const dateFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

export default function Matches() {
  const { isAdmin } = useAuth()
  const season = useActiveSeason()
  const matches = useMatches(season.data?.id)

  if (season.isLoading || matches.isLoading) return <p className="text-muted">Cargando…</p>
  if (matches.error) return <p className="text-red-400">{matches.error.message}</p>

  const list = matches.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-black tracking-tight">Partidos</h1>
        {isAdmin && (
          <Link to="/partidos/nuevo" className="text-sm font-semibold text-gold">
            + Registrar
          </Link>
        )}
      </div>

      {list.length === 0 && <p className="text-muted">Todavía no hay partidos esta temporada.</p>}

      {list.map((m) => (
        <MatchCard key={m.id} match={m} />
      ))}
    </div>
  )
}

function MatchCard({ match }: { match: Match }) {
  return (
    <article className="rounded-2xl border border-pitch-700 bg-pitch-900 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">
        {dateFmt.format(new Date(match.played_at + 'T12:00:00'))}
      </p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <TeamSide match={match} team="A" />
        <p className="text-2xl font-black tabular-nums">
          {match.score_a}
          <span className="mx-1 text-muted">–</span>
          {match.score_b}
        </p>
        <TeamSide match={match} team="B" alignRight />
      </div>
      {match.notes && <p className="mt-3 text-sm text-muted">{match.notes}</p>}
    </article>
  )
}

function TeamSide({ match, team, alignRight }: { match: Match; team: Team; alignRight?: boolean }) {
  const players = match.match_players.filter((p) => p.team === team && p.players)
  return (
    <ul className={`space-y-0.5 text-sm ${alignRight ? 'text-right' : ''}`}>
      {players.map((p, i) => (
        <li key={i}>
          {p.is_goalkeeper && '🧤 '}
          {displayName(p.players!)}
          {p.goals > 0 && <span className="text-gold"> {'⚽'.repeat(Math.min(p.goals, 5))}{p.goals > 5 ? `×${p.goals}` : ''}</span>}
          {p.assists > 0 && <span className="text-muted"> 🅰{p.assists > 1 ? `×${p.assists}` : ''}</span>}
        </li>
      ))}
    </ul>
  )
}
