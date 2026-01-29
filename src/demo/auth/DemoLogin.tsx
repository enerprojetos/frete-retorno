import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { setDemoUser, type DemoRole } from './demoAuth'

function buildId(role: DemoRole) {
  // ids fixos ajudam a demo (consistência)
  if (role === 'SHIPPER') return 'demo-shipper-1'
  if (role === 'DRIVER') return 'demo-driver-1'
  return 'demo-operator-1'
}

export default function DemoLogin() {
  const navigate = useNavigate()

  const roles = useMemo(
    () =>
      [
        { role: 'SHIPPER' as const, title: 'Empresa (cadastra frete)', next: '/freights/new' },
        { role: 'DRIVER' as const, title: 'Motorista (cadastra viagem)', next: '/trips/new' },
        { role: 'OPERATOR' as const, title: 'Operador (visão geral)', next: '/admin' },
      ] as const,
    []
  )

  function login(role: DemoRole, next: string) {
    setDemoUser({
      id: buildId(role),
      role,
      name:
        role === 'SHIPPER' ? 'Empresa Demo' : role === 'DRIVER' ? 'Motorista Demo' : 'Operador Demo',
    })
    navigate(next)
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Login (demo)</h1>
      <p className="text-sm text-slate-600 mt-1">
        Escolha um perfil para testar o MVP. Isso grava um usuário fake no{' '}
        <code className="text-xs">localStorage</code>.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {roles.map((r) => (
          <button
            key={r.role}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left hover:bg-slate-50"
            onClick={() => login(r.role, r.next)}
          >
            <div className="font-semibold">{r.title}</div>
            <div className="text-xs text-slate-500 mt-1">role: {r.role}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="font-semibold">Como testar rápido</div>
        <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700 space-y-1">
          <li>Entre como <b>Empresa</b> e cadastre 1–3 fretes</li>
          <li>Troque para <b>Motorista</b> e crie uma viagem (corredor 25–50km)</li>
          <li>Veja os <b>matches</b> por proximidade da rota</li>
        </ol>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Depois da demo, isso vira Supabase Auth + RLS. Por enquanto é só para apresentar o conceito.
      </div>
    </div>
  )
}
