import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '@/shared/ui/AppShell'
import { useAuth } from '@/auth/useAuth'
import { supabase } from '@/shared/lib/supabaseClient'
import { listMyFreights, type FreightUiRow } from '@/features/freights/api/freightsService'

type Stats = {
  openFreights: number
  pendingRequests: number
}

export default function ShipperHome() {
  const { profile } = useAuth()

  const [stats, setStats] = useState<Stats>({ openFreights: 0, pendingRequests: 0 })
  const [recent, setRecent] = useState<FreightUiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (!profile) return
      setLoading(true)
      setErr(null)

      try {
        // Fretes recentes
        const last = await listMyFreights({ limit: 5 })
        setRecent(last)

        // Total de fretes abertos (do usuário)
        const { count: openCount, error: openErr } = await supabase
          .from('freight')
          .select('id', { count: 'exact', head: true })
          .eq('shipper_user_id', profile.id)
          .eq('status', 'OPEN')

        if (openErr) throw openErr

        // Solicitações pendentes (match_request)
        const { count: pendCount, error: pendErr } = await supabase
          .from('match_request')
          .select('id', { count: 'exact', head: true })
          .eq('shipper_user_id', profile.id)
          .eq('status', 'PENDING')

        if (pendErr) throw pendErr

        setStats({
          openFreights: openCount ?? 0,
          pendingRequests: pendCount ?? 0,
        })
      } catch (e: any) {
        setErr(e?.message ?? 'Falha ao carregar painel')
      } finally {
        setLoading(false)
      }
    })()
  }, [profile])

  return (
    <AppShell title="Painel da Empresa">
      {err ? (
        <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm mb-4">{err}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3 mb-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-slate-500">Fretes abertos</div>
          <div className="text-2xl font-semibold mt-1">{loading ? '—' : stats.openFreights}</div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-slate-500">Solicitações pendentes</div>
          <div className="text-2xl font-semibold mt-1">{loading ? '—' : stats.pendingRequests}</div>
        </div>

        <div className="rounded-2xl border bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Ação principal</div>
            <div className="font-medium mt-1">Publicar novo frete</div>
          </div>

          <Link className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm" to="/shipper/freights/new">
            Novo
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Link className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100" to="/shipper/freights">
          Ver meus fretes
        </Link>
        <Link className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100" to="/shipper/inbox">
          Ver solicitações
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-2">Fretes recentes</div>

        {loading ? (
          <div className="text-sm text-slate-600">Carregando…</div>
        ) : recent.length === 0 ? (
          <div className="text-sm text-slate-600">
            Você ainda não publicou fretes. Clique em <b>Novo</b> para começar.
          </div>
        ) : (
          <div className="grid gap-2">
            {recent.map((r) => (
              <div key={r.id} className="rounded-xl border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {r.pickup_label ?? 'Origem'} → {r.dropoff_label ?? 'Destino'}
                  </div>
                  {r.notes ? <div className="text-xs text-slate-500 truncate">{r.notes}</div> : null}
                </div>

                <Link className="shrink-0 text-sm underline" to={`/shipper/freights/${r.id}/edit`}>
                  Editar
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
