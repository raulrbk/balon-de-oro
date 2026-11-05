import { useActiveSeason, useStandings } from '../lib/queries'
import { displayName, type Standing } from '../lib/types'

export default function Ranking() {
  const season = useActiveSeason()
  const standings = useStandings(season.data?.id)

  if (season.isLoading || standings.isLoading) return <p className="text-muted">Cargando…</p>
  if (season.error || standings.error)
    return <p className="text-red-400">{(season.error ?? standings.error)!.message}</p>
  if (!season.data) return <p className="text-muted">No hay ninguna temporada activa.</p>

  const rows = standings.data ?? []
  const totalMatches = rows[0]?.season_matches ?? 0
  const minMatches = Math.ceil(totalMatches * season.data.min_attendance)
  const candidates = rows.filter((r) => r.eligible)
  const others = rows.filter((r) => !r.eligible)

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-black tracking-tight">{season.data.name}</h1>
        <p className="text-sm text-muted">
          {totalMatches} partidos jugados · mínimo para optar: {minMatches}
        </p>
      </section>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-pitch-700 p-6 text-center text-muted">
          Aún no hay partidos. El primero que se registre abre el ranking.
        </p>
      ) : (
        <>
          {candidates[0] && <Leader row={candidates[0]} />}
          <Table title="Candidatos" rows={candidates} startAt={1} />
          {others.length > 0 && (
            <Table title="Sin el mínimo de partidos" rows={others} muted />
          )}
          <Legend
            s={season.data}
          />
        </>
      )}
    </div>
  )
}

function Leader({ row }: { row: Standing }) {
  return (
    <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-pitch-800 to-pitch-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold">Líder</p>
      <p className="mt-1 text-2xl font-black">{displayName(row)}</p>
      <p className="mt-1 text-sm text-muted">
        {row.points} pts · {row.goals} goles · {row.assists} asist. · {row.mvps} MVP
      </p>
    </div>
  )
}

function Table({
  title,
  rows,
  startAt,
  muted,
}: {
  title: string
  rows: Standing[]
  startAt?: number
  muted?: boolean
}) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h2>
      <div className={`overflow-hidden rounded-2xl border border-pitch-700 ${muted ? 'opacity-70' : ''}`}>
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-pitch-900 text-[11px] uppercase text-muted">
            <tr>
              <th className="w-8 py-2 pl-3 text-left">#</th>
              <th className="py-2 text-left">Jugador</th>
              <th className="py-2 text-center" title="Partidos jugados">PJ</th>
              <th className="py-2 text-center" title="Goles">G</th>
              <th className="py-2 text-center" title="Asistencias">A</th>
              <th className="py-2 text-center" title="MVPs">MVP</th>
              <th className="py-2 pr-3 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.player_id} className="border-t border-pitch-800">
                <td className="py-2.5 pl-3 text-muted">{startAt ? startAt + i : '–'}</td>
                <td className="py-2.5 font-medium">{displayName(r)}</td>
                <td className="py-2.5 text-center text-muted">{r.played}</td>
                <td className="py-2.5 text-center">{r.goals}</td>
                <td className="py-2.5 text-center">{r.assists}</td>
                <td className="py-2.5 text-center">{r.mvps}</td>
                <td className="py-2.5 pr-3 text-right font-bold text-gold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Legend({ s }: { s: { pts_win: number; pts_draw: number; pts_goal: number; pts_assist: number; pts_clean_sheet: number; pts_mvp: number } }) {
  return (
    <p className="text-xs leading-relaxed text-muted">
      Victoria {s.pts_win} · Empate {s.pts_draw} · Gol {s.pts_goal} · Asistencia {s.pts_assist} ·
      Portería a cero {s.pts_clean_sheet} · MVP {s.pts_mvp}
    </p>
  )
}
