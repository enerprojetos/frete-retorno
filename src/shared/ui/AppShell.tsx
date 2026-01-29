import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { redirectPathForRole } from '@/auth/authRedirect'

export default function AppShell({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  const { profile, signOut } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()

  async function logout() {
    await signOut()
    nav('/auth/login', { replace: true })
  }

  const role = profile?.role

  const navItems = [
    { to: '/shipper', label: 'Fretes', show: role === 'SHIPPER' || role === 'OPERATOR' },
    { to: '/driver', label: 'Viagens', show: role === 'DRIVER' || role === 'OPERATOR' },
    { to: '/admin', label: 'Admin', show: role === 'OPERATOR' },
  ].filter((x) => x.show)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              FR
            </div>
            <div>
              <div className="font-semibold leading-tight">
                {title ?? 'Frete de Retorno'}
              </div>
              <div className="text-xs text-slate-600 leading-tight">
                {role ? `Logado como ${role}` : '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Sair
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-6xl px-4 pb-3 flex flex-wrap gap-2">
          {navItems.map((it) => {
            const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + '/')
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`rounded-xl px-3 py-2 text-sm border ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                {it.label}
              </Link>
            )
          })}

          {role ? (
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-sm border bg-white border-slate-200 hover:bg-slate-50"
              onClick={() => nav(redirectPathForRole(role), { replace: true })}
            >
              Meu painel
            </button>
          ) : null}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
