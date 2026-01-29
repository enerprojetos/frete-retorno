import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '@/shared/ui/AppShell'
import { cancelTrip, listMyTrips, type TripRow } from '@/features/trips/api/tripsService'

function km(m: number | null | undefined) {
  if (!m || m <= 0) return '—'
  return `${Math.round(m / 1000)} km`
}

function hours(s: number | null | undefined) {
  if (!s || s <= 0) return '—'
  return `${(s / 3600).toFixed(1)} h`
}

function formatDate(iso: string) {
  return String(iso ?? '').slice(0, 10)
}

function StatusBadge({ status }: { status: 'OPEN' | 'CANCELLED' }) {
  const isOpen = status === 'OPEN'
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700',
      ].join(' ')}
    >
      {isOpen ? 'ABERTA' : 'CANCELADA'}
    </span>
  )
}

export default function TripList() {
  const [rows, setRows] = useState<TripRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [status, setStatus] = useState<'' | 'OPEN' | 'CANCELLED'>('')
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const data = await listMyTrips({ limit: 200, status, q })
      setRows(data)
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao carregar viagens')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    const t = setTimeout(() => void load(), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const summary = useMemo(() => {
    let open = 0
    let cancelled = 0
    for (const r of rows) {
      if ((r.status ?? 'OPEN') === 'OPEN') open++
      else cancelled++
    }
    return { total: rows.length, open, cancelled }
  }, [rows])

  async function onCancel(id: string) {
    const ok = window.confirm('Cancelar esta viagem? Ela deixará de fazer matches.')
    if (!ok) return

    try {
      await cancelTrip(id)
      setRows((cur) => cur.map((t) => (t.id === id ? { ...t, status: 'CANCELLED' } : t)))
    } catch (e: any) {
      alert(e?.message ?? 'Falha ao cancelar')
    }
  }

  return (
    <AppShell title="Minhas viagens (Motorista)">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <div className="text-sm text-slate-600">
            Total: <b>{summary.total}</b> • Abertas: <b>{summary.open}</b> • Canceladas:{' '}
            <b>{summary.cancelled}</b>
          </div>
          <div className="text-xs text-slate-500 mt-1">Edite ou cancele viagens aqui.</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100"
            disabled={loading}
          >
            {loading ? 'Atualizando…' : 'Atualizar'}
          </button>

          <Link className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm" to="/driver/trips/new">
            Nova viagem
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">Buscar</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex.: Goiânia, São Paulo..."
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
            >
              <option value="">Todos</option>
              <option value="OPEN">Abertas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm mb-4">{err}</div>}

      {rows.length === 0 && !loading ? (
        <div className="rounded-2xl border bg-white p-4">Você ainda não cadastrou viagens.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const s = (r.status ?? 'OPEN') as 'OPEN' | 'CANCELLED'
            const title = `${r.origin_label ?? 'Origem'} → ${r.destination_label ?? 'Destino'}`

            return (
              <div key={r.id} className="rounded-2xl border bg-white p-4 overflow-hidden">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="font-medium truncate" title={title}>
                        {title}
                      </div>
                      <StatusBadge status={s} />
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      Criada em {formatDate(r.created_at)} • Corredor: <b>{km(r.corridor_radius_m)}</b> • Distância:{' '}
                      <b>{km(r.route_distance_m)}</b> • Duração: <b>{hours(r.route_duration_s)}</b>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end shrink-0">
                    <Link
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100"
                      to={`/driver/trips/${r.id}/edit`}
                    >
                      Editar
                    </Link>

                    <Link
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100"
                      to={`/driver/trips/${r.id}/matches`}
                    >
                      Matches
                    </Link>

                    {s === 'OPEN' ? (
                      <button
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
                        onClick={() => void onCancel(r.id)}
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400 break-all">ID: {r.id}</div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
