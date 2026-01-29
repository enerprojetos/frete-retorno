import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { listFreights, type FreightRow } from '@/features/freights/api/freightsService'
import { listMyTrips as listTrips, type TripRow } from '@/features/trips/api/tripsService'


function fmtDt(s: string) {
  try {
    return new Date(s).toLocaleString()
  } catch {
    return s
  }
}

export default function AdminDashboard() {
  const [freights, setFreights] = useState<FreightRow[]>([])
  const [trips, setTrips] = useState<TripRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function run() {
      try {
        setLoading(true)
        setErr(null)
        const [f, t] = await Promise.all([
          listFreights(50),
          listTrips({ limit: 50 })
        ])
        if (!alive) return
        setFreights(f)
        setTrips(t)
      } catch (e) {
        if (!alive) return
        setErr(String((e as any)?.message ?? e))
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [])

  const counts = useMemo(() => {
    const openFreights = freights.filter((f) => f.status === 'OPEN').length
    const openTrips = trips.filter((t) => t.status === 'OPEN').length
    return { freights: freights.length, openFreights, trips: trips.length, openTrips }
  }, [freights, trips])

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-semibold">Visão Geral (Operador)</h1>
      <p className="text-sm text-slate-600 mt-1">
        Lista rápida do que foi criado no Supabase (fretes e viagens).
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-600">Fretes</div>
          <div className="text-2xl font-semibold mt-1">{counts.freights}</div>
          <div className="text-xs text-slate-500 mt-1">Abertos: {counts.openFreights}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-600">Viagens</div>
          <div className="text-2xl font-semibold mt-1">{counts.trips}</div>
          <div className="text-xs text-slate-500 mt-1">Abertas: {counts.openTrips}</div>
        </div>

        <Link
          to="/demo/seed"
          className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
        >
          <div className="font-semibold">Dados de demo</div>
          <div className="text-sm text-slate-600 mt-1">Crie fretes prontos com 1 clique</div>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="font-semibold">Fluxo</div>
          <div className="text-sm text-slate-600 mt-1">
            Empresa cria frete → Motorista cria viagem → Matches
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 text-sm text-slate-600">Carregando...</div>
      ) : err ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {err}
          <div className="text-xs text-rose-700 mt-2">
            Dica: se for erro de permissão/URL, confira seu arquivo <code>.env</code> e reinicie o
            <code> npm run dev</code>.
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Últimos fretes</h2>
              <Link className="text-sm underline" to="/freights/new">
                Cadastrar frete
              </Link>
            </div>
            <div className="mt-3 grid gap-2">
              {freights.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  Nenhum frete ainda.
                </div>
              ) : (
                freights.slice(0, 10).map((f) => (
                  <div key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-medium">{f.pickup_label} → {f.dropoff_label}</div>
                    <div className="text-xs text-slate-500 mt-1">{fmtDt(f.created_at)} • {f.status}</div>
                    {f.notes ? <div className="text-sm text-slate-700 mt-2">{f.notes}</div> : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Últimas viagens</h2>
              <Link className="text-sm underline" to="/trips/new">
                Criar viagem
              </Link>
            </div>
            <div className="mt-3 grid gap-2">
              {trips.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  Nenhuma viagem ainda.
                </div>
              ) : (
                trips.slice(0, 10).map((t) => (
                  <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-medium">{t.origin_label} → {t.destination_label}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {fmtDt(t.created_at)} • corredor {Math.round(t.corridor_radius_m / 1000)}km • {t.profile}
                    </div>
                    <div className="mt-2">
                      <Link className="text-sm underline" to={`/trips/${t.id}/matches`}>
                        Ver matches
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="font-semibold">Configuração rápida</div>
        <div className="text-sm text-slate-600 mt-1">
          Se “Criar viagem” falhar, quase sempre é <b>Functions URL</b> errada ou a função não está
          publicada no Supabase.
        </div>
        <ul className="mt-3 text-sm list-disc pl-5 text-slate-700">
          <li>
            Confirme no arquivo <code>.env</code>: <code>VITE_SUPABASE_FUNCTIONS_URL</code>
          </li>
          <li>
            Reinicie o dev server após editar: pare com <code>Ctrl+C</code> e rode <code>npm run dev</code>
          </li>
        </ul>
      </div>
    </div>
  )
}
