import { Navigate, Route, Routes } from 'react-router'
import type { ReactNode } from 'react'
import { useAuth } from './auth/AuthProvider'
import Layout from './components/Layout'
import Login from './pages/Login'
import Ranking from './pages/Ranking'
import Matches from './pages/Matches'
import NewMatch from './pages/NewMatch'
import Players from './pages/Players'

export default function App() {
  const { session, loading, isMember, signOut } = useAuth()

  if (loading) {
    return <FullScreen>Cargando…</FullScreen>
  }

  if (!session) return <Login />

  if (!isMember) {
    return (
      <FullScreen>
        <p className="text-lg font-semibold">Tu email no está en la plantilla</p>
        <p className="mt-2 text-sm text-muted">
          {session.user.email} no está dado de alta. Pide al admin que te añada con ese email y
          vuelve a entrar.
        </p>
        <button onClick={signOut} className="mt-6 text-sm text-gold underline">
          Salir
        </button>
      </FullScreen>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Ranking />} />
        <Route path="partidos" element={<Matches />} />
        <Route path="partidos/nuevo" element={<AdminOnly><NewMatch /></AdminOnly>} />
        <Route path="jugadores" element={<AdminOnly><Players /></AdminOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/" replace />
}

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  )
}
