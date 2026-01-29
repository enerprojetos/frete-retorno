import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { UserRole } from './authRedirect'
import { redirectPathForRole } from './authRedirect'

export default function ProtectedRoute({
  allow,
  children,
}: {
  allow?: UserRole[]
  children: React.ReactNode
}) {
  const { loading, session, profile, refreshProfile, signOut } = useAuth()

  // ✅ só boot inicial do app
  if (loading) return <div className="p-6">Carregando...</div>

  if (!session) return <Navigate to="/auth/login" replace />

  if (!profile) {
    return (
      <div className="p-6 space-y-3">
        <div className="font-medium">Não foi possível carregar seu perfil.</div>
        <div className="text-sm text-slate-600">
          Isso pode acontecer ao alternar de janela (ALT+TAB) se houver oscilação.
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100"
            onClick={() => void refreshProfile()}
          >
            Tentar novamente
          </button>
          <button
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
            onClick={() => void signOut()}
          >
            Sair
          </button>
        </div>
      </div>
    )
  }

  if (allow && allow.length > 0 && !allow.includes(profile.role)) {
    return <Navigate to={redirectPathForRole(profile.role)} replace />
  }

  return <>{children}</>
}
