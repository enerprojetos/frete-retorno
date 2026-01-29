import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '@/shared/ui/AppShell'
import { useAuth } from '@/auth/useAuth'
import { supabase } from '@/shared/lib/supabaseClient'
import { listMyTrips, type TripRow } from '@/features/trips/api/tripsService'

type Stats = {
  openTrips: number
  pendingRequests: number
  acceptedRequests: number
}

export default function DriverHome() {
  const { profile } = useAuth()

  const [stats, setStats] = useState<Stats>({ openTrips: 0, pendingRequests: 0, acceptedRequests: 0 })
  const [recent, setRecent] = useState<TripRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (!profile) return
      setLoading(true)
      setErr(null)

      try {
        const last = await listMyTrips({ limit: 5 })
        setRecent(last)

        const { count: openTrips, error: openTripsErr } = await supabase
          .from('trip')
          .select('id', { count: 'exact', head: true })
          .eq('driver_user_id', profile.id)
          .eq('status', 'OPEN')

        if (openTripsErr) throw openTripsErr

        const { count: pendingReq, error: pendingReqErr } = await supabase
          .from('match_request')
          .select('id', { count: 'exact', head: true })
          .eq('driver_user_id', profile.id)
          .eq('status', 'PENDING')

        if (pendingReqErr) throw pendingReqErr

        const { count: acceptedReq, error: acceptedReqErr } = await supabase
          .from('match_request')
          .select('id', { count: 'exact', head: true })
          .eq('driver_user_id', profile.id)
          .eq('status', 'ACCEPTED')

        if (acceptedReqErr) throw acceptedReqErr

        setStats({
          openTrips: openTrips ?? 0,
          pendingRequests: pendingReq ?? 0,
          acceptedRequests: acceptedReq ?? 0,
        })
      } catch (e: any) {
        setErr(e?.message ?? 'Falha ao carregar painel')
      } finally {
        setLoading(false)
      }
    })()
  }, [profile])

  return (
    <AppShell title="Painel do Motorista">
      {err ? (
        <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm mb-4">{err}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3 mb-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-slate-500">Viagens abertas</div>
          <div className="text-2xl font-semibold mt-1">{loading ? '—' : stats.openTrips}</div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-slate-500">Solicitações pendentes</div>
          <div className="text-2xl font-semibold mt-1">{loading ? '—' : stats.pendingRequests}</div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-slate-500">Contatos liberados</div>
          <div className="text-2xl font-semibold mt-1">{loading ? '—' : stats.acceptedRequests}</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 mb-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="font-medium">Quero trabalhar agora</div>
          <div className="text-sm text-slate-600 mt-1">
            (Próxima evolução) Ver fretes com coleta perto de você, estilo “Uber”.
          </div>
          <div className="mt-3 text-sm text-slate-500">
            Por enquanto, o melhor fluxo é planejar sua viagem e ver os matches.
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Ação principal</div>
            <div className="font-medium mt-1">Frete de Retorno (rota + corredor)</div>
          </div>

          <Link className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm" to="/driver/trips/new">
            Nova viagem
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Link className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100" to="/driver/trips">
          Ver minhas viagens
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-2">Viagens recentes</div>

        {loading ? (
          <div className="text-sm text-slate-600">Carregando…</div>
        ) : recent.length === 0 ? (
          <div className="text-sm text-slate-600">
            Você ainda não cadastrou viagens. Clique em <b>Nova viagem</b> para começar.
          </div>
        ) : (
          <div className="grid gap-2">
            {recent.map((t) => (
              <div key={t.id} className="rounded-xl border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {t.origin_label ?? 'Origem'} → {t.destination_label ?? 'Destino'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Status: {t.status} • Corredor: {(t.corridor_radius_m / 1000).toFixed(0)} km
                  </div>
                </div>

                <Link className="shrink-0 text-sm underline" to={`/driver/trips/${t.id}/matches`}>
                  Matches
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
