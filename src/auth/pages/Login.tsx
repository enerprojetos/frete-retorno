import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { redirectPathForRole } from '@/auth/authRedirect'

export default function Login() {
  const nav = useNavigate()
  const { signIn, signOut, session, profile, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Se já existe sessão, não faz sentido tentar “logar de novo”.
  // Mostra opção de ir pro painel ou sair pra trocar de conta.
  useEffect(() => {
    if (!loading && session && profile?.role) {
      // você pode comentar essa linha se quiser ficar na tela de login mesmo quando logado
      // nav(redirectPathForRole(profile.role), { replace: true })
    }
  }, [loading, session, profile?.role, nav])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const p = await signIn(email.trim(), password)
      const role = p?.role
      nav(role ? redirectPathForRole(role) : '/shipper', { replace: true })
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao entrar')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    await signOut()
    setErr(null)
  }

  const alreadyLogged = !!session

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Entrar</h1>
          <p className="text-sm text-slate-500">
            Acesse como empresa, motorista ou admin.
          </p>
        </div>

        {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{err}</div>}

        {alreadyLogged ? (
          <div className="rounded-xl border p-4 space-y-3 bg-slate-50">
            <div className="text-sm">
              Você já está logado como:{' '}
              <strong>{profile?.full_name ?? session.user.email ?? 'usuário'}</strong>
              {profile?.role ? (
                <>
                  {' '}
                  <span className="text-slate-500">({profile.role})</span>
                </>
              ) : null}
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 rounded-xl bg-slate-900 text-white px-4 py-2"
                onClick={() => {
                  const role = profile?.role
                  nav(role ? redirectPathForRole(role) : '/shipper', { replace: true })
                }}
              >
                Ir para o painel
              </button>

              <button
                className="rounded-xl border px-4 py-2"
                onClick={handleLogout}
              >
                Sair
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Dica: para trocar de conta, clique em <strong>Sair</strong> aqui.
            </p>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <input
                className="w-full rounded-xl border p-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Senha</label>
              <input
                className="w-full rounded-xl border p-3"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              className="w-full rounded-xl bg-slate-900 text-white px-4 py-2"
              disabled={busy}
            >
              {busy ? 'Entrando...' : 'Entrar'}
            </button>

            <p className="text-sm text-slate-600">
              Não tem conta?{' '}
              <Link className="underline" to="/auth/register">
                Criar agora
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
