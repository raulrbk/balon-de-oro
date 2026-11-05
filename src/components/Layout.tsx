import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthProvider'

export default function Layout() {
  const { isAdmin, signOut } = useAuth()

  const links = [
    { to: '/', label: 'Ranking', icon: '🏆', end: true },
    { to: '/partidos', label: 'Partidos', icon: '⚽', end: true },
    ...(isAdmin
      ? [
          { to: '/partidos/nuevo', label: 'Nuevo', icon: '➕', end: true },
          { to: '/jugadores', label: 'Plantilla', icon: '👥', end: true },
        ]
      : []),
  ]

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="text-sm font-bold uppercase tracking-[0.2em] text-gold">Balón de Oro</span>
        <button onClick={signOut} className="text-xs text-muted hover:text-chalk">
          Salir
        </button>
      </header>

      <main className="flex-1 px-4 pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-pitch-700 bg-pitch-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto flex max-w-xl">
          {links.map((l) => (
            <li key={l.to} className="flex-1">
              <NavLink
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                    isActive ? 'text-gold' : 'text-muted'
                  }`
                }
              >
                <span className="text-lg leading-none">{l.icon}</span>
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
