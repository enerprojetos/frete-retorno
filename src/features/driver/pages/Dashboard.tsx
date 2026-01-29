import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '@/shared/ui/AppShell'
import { supabase } from '@/shared/lib/supabaseClient'
import { listMyTrips, type TripRow } from '@/features/trips/api/tripsService'

type Stats = { openTrips: number; pendingRequests: number; acceptedRequests: number }

export default function DriverDashboard() {
  const [recent, setRecent] = useState<TripRow[]>([])
  const [stats, setStats] = useState<Stats>({ openTrips: 0, pendingRequests: 0, acceptedRequests: 0 })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const last = await listMyTrips({ limit: 5 })
      setRecent(last)

      const { count: openTrips, error: openTripsErr } = await supabase
        .from('trip')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'OPEN')
      if (openTripsErr) throw openTripsErr

      const { count: pendingReq, error: pendingReqErr } = await supabase
        .from('match_request')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING')
      if (pendingReqErr) throw pendingReqErr

      const { count: acceptedReq, error: acceptedReqErr } = await supabase
        .from('match_request')
        .select('id', { count: 'exact', head: true })
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
  }

  useEffect(() => {
    void load()
  }, [])

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
            Próxima evolução: ver fretes com coleta perto de você (estilo “Uber”).
          </div>
          <div className="mt-2 text-xs text-slate-500">
            (Vamos criar essa tela já já, sem quebrar o modo “Frete de Retorno.)
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
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
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
              <div
                key={t.id}
                className="rounded-xl border p-3 max-w-full overflow-hidden flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium break-words sm:truncate">
                    {t.origin_label ?? 'Origem'} → {t.destination_label ?? 'Destino'}
                  </div>

                  <div className="text-xs text-slate-500 break-words">
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
