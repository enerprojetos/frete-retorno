import { clearDemoUser, getDemoUser } from '@/demo/auth/demoAuth'
import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function DemoShell({ children }: { children: React.ReactNode }) {
  const user = getDemoUser()
  const nav = useNavigate()
  const loc = useLocation()

  function logout() {
    clearDemoUser()
    nav('/demo/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              FR
            </div>
            <div>
              <div className="font-semibold leading-tight">Frete de Retorno — MVP</div>
              <div className="text-xs text-slate-600 leading-tight">
                rota + corredor + match por proximidade
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-slate-600">Logado:</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                  {user.role}
                </span>
                <span className="text-xs text-slate-700">{user.name}</span>
              </div>
            ) : null}

            <button
              onClick={logout}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Trocar perfil
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-6xl px-4 pb-3 flex flex-wrap gap-2">
          <Link
            to="/demo/login"
            className={`rounded-xl px-3 py-2 text-sm border ${
              loc.pathname.startsWith('/demo/login')
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            Login (demo)
          </Link>
          <Link
            to="/freights/new"
            className={`rounded-xl px-3 py-2 text-sm border ${
              loc.pathname.startsWith('/freights')
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            Cadastrar frete
          </Link>
          <Link
            to="/trips/new"
            className={`rounded-xl px-3 py-2 text-sm border ${
              loc.pathname.startsWith('/trips/new')
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            Criar viagem
          </Link>
          <Link
            to="/demo/seed"
            className={`rounded-xl px-3 py-2 text-sm border ${
              loc.pathname.startsWith('/demo/seed')
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            Dados de demo (1 clique)
          </Link>

          {user?.role === 'OPERATOR' ? (
            <Link
              to="/admin"
              className={`rounded-xl px-3 py-2 text-sm border ${
                loc.pathname.startsWith('/admin')
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              Admin
            </Link>
          ) : null}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
