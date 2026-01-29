import { Navigate, useLocation } from 'react-router-dom'
import { getDemoUser, type DemoRole } from './demoAuth'

type Props = {
  allow?: DemoRole[]
  children: React.ReactNode
}

/**
 * Guard simples para demo:
 * - se não houver demoUser -> manda para /demo/login
 * - se allow for informado, exige role compatível
 */
export default function RequireDemoAuth({ allow, children }: Props) {
  const loc = useLocation()
  const user = getDemoUser()

  if (!user) return <Navigate to="/demo/login" replace state={{ from: loc.pathname }} />

  if (allow && allow.length > 0 && !allow.includes(user.role) && user.role !== 'OPERATOR') {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="font-semibold">Acesso negado (demo)</div>
          <div className="text-sm text-amber-800 mt-1">
            Seu perfil atual: <b>{user.role}</b>. Esta página requer: {allow.join(', ')}.
          </div>
          <a className="text-sm underline mt-2 inline-block" href="/demo/login">
            Trocar perfil
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
