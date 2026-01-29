import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '@/shared/ui/AppShell'
import {
  listMyFreights,
  setFreightStatus,
  type FreightStatus,
  type FreightUiRow,
} from '@/features/freights/api/freightsService'

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function formatDate(iso: string) {
  return String(iso ?? '').slice(0, 10)
}

function km(m: number | null | undefined) {
  if (!m || m <= 0) return '—'
  return `${Math.round(m / 1000)} km`
}

function StatusBadge({ status }: { status: FreightStatus }) {
  const isOpen = status === 'OPEN'
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
      )}
    >
      {isOpen ? 'ABERTO' : 'ENCERRADO'}
    </span>
  )
}

export default function FreightList() {
  const [rows, setRows] = useState<FreightUiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [status, setStatus] = useState<'' | FreightStatus>('')
  const [q, setQ] = useState('')

  // controla "ver mais/menos" por frete
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const clamp3: CSSProperties = {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 3,
    overflow: 'hidden',
  }

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const data = await listMyFreights({ limit: 200, status, q })
      setRows(data)
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao carregar fretes')
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
    let closed = 0
    for (const r of rows) {
      if ((r.status ?? 'OPEN') === 'OPEN') open++
      else closed++
    }
    return { open, closed, total: rows.length }
  }, [rows])

  async function onCloseFreight(id: string) {
    const ok = window.confirm('Encerrar este frete? Ele deixará de aparecer em matches.')
    if (!ok) return

    try {
      await setFreightStatus(id, 'CLOSED')
      setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status: 'CLOSED' } : r)))
    } catch (e: any) {
      alert(e?.message ?? 'Falha ao encerrar frete')
    }
  }

  return (
    <AppShell title="Meus fretes (Empresa)">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <div className="text-sm text-slate-600">
            Total: <b>{summary.total}</b> • Abertos: <b>{summary.open}</b> • Encerrados:{' '}
            <b>{summary.closed}</b>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Dica: use “Encerrar” quando o frete já foi atendido.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100"
            disabled={loading}
          >
            {loading ? 'Atualizando…' : 'Atualizar'}
          </button>

          {/* ✅ NOVO: Inbox de solicitações do processo de match */}
          <Link
            className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-100"
            to="/shipper/requests"
          >
            Solicitações
          </Link>

          <Link
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm"
            to="/shipper/freights/new"
          >
            Novo frete
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
              placeholder="Ex.: Goiânia, SP, retroescavadeira, etc"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | FreightStatus)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
            >
              <option value="">Todos</option>
              <option value="OPEN">Abertos</option>
              <option value="CLOSED">Encerrados</option>
            </select>
          </div>
        </div>
      </div>

      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm mb-4">{err}</div>}

      {rows.length === 0 && !loading ? (
        <div className="rounded-2xl border bg-white p-4">Você ainda não cadastrou nenhum frete.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const s = (r.status ?? 'OPEN') as FreightStatus
            const title = `${r.pickup_label ?? 'Origem'} → ${r.dropoff_label ?? 'Destino'}`
            const isExpanded = !!expanded[r.id]

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
                      Criado em {formatDate(r.created_at)} • Raio coleta: <b>{km(r.pickup_radius_m)}</b> • Raio entrega:{' '}
                      <b>{km(r.dropoff_radius_m)}</b>
                    </div>

                    {r.notes ? (
                      <div className="mt-2">
                        <div
                          className="text-sm text-slate-700 whitespace-pre-wrap break-words"
                          style={isExpanded ? undefined : clamp3}
                        >
                          {r.notes}
                        </div>

                        <button
                          type="button"
                          className="mt-1 text-xs underline text-slate-500 hover:text-slate-700"
                          onClick={() => setExpanded((cur) => ({ ...cur, [r.id]: !cur[r.id] }))}
                        >
                          {isExpanded ? 'Ver menos' : 'Ver mais'}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* ✅ garante que botões não "somem" quando o texto cresce */}
                  <div className="flex flex-wrap gap-2 sm:justify-end shrink-0">
                    <Link
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100"
                      to={`/shipper/freights/${r.id}/edit`}
                    >
                      Editar
                    </Link>

                    {s === 'OPEN' ? (
                      <button
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
                        onClick={() => void onCloseFreight(r.id)}
                      >
                        Encerrar
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
