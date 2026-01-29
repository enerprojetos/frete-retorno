import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabaseClient'
import AppShell from '@/shared/ui/AppShell'

type FreightRow = {
  id: string
  shipper_id: string
  pickup_label: string
  dropoff_label: string
  status: string
  created_at: string
}

type TripRow = {
  id: string
  driver_id: string
  origin_label: string
  destination_label: string
  status: string
  route_distance_m: number | null
  route_duration_s: number | null
  created_at: string
}

function km(m: number | null) {
  if (!m) return '—'
  return `${(m / 1000).toFixed(0)} km`
}

function h(s: number | null) {
  if (!s) return '—'
  const hours = Math.round(s / 3600)
  return `${hours} h`
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function StatCard(props: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-slate-600">{props.label}</div>
      <div className="text-3xl font-semibold mt-1">{props.value}</div>
      {props.hint ? <div className="text-xs text-slate-500 mt-2">{props.hint}</div> : null}
    </div>
  )
}

function ActionLink(props: { to: string; title: string; subtitle: string; variant?: 'dark' | 'light' }) {
  const dark = props.variant === 'dark'
  return (
    <Link
      to={props.to}
      className={cx(
        'rounded-2xl border p-4 transition block',
        dark
          ? 'bg-slate-900 text-white border-slate-900 hover:opacity-95'
          : 'bg-white hover:bg-slate-50'
      )}
    >
      <div className={cx('text-sm font-semibold', dark ? 'text-white' : 'text-slate-900')}>{props.title}</div>
      <div className={cx('text-xs mt-1', dark ? 'text-slate-200' : 'text-slate-600')}>{props.subtitle}</div>
    </Link>
  )
}

export default function AdminOverview() {
  const [freightsCount, setFreightsCount] = useState(0)
  const [tripsCount, setTripsCount] = useState(0)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  const [freights, setFreights] = useState<FreightRow[]>([])
  const [trips, setTrips] = useState<TripRow[]>([])

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true)
    setErr(null)

    try {
      // Contagens
      const a = await supabase.from('freight').select('id', { count: 'exact', head: true })
      const b = await supabase.from('trip').select('id', { count: 'exact', head: true })

      // Se sua tabela de solicitações for "match_request" (como no resto do projeto):
      const c = await supabase
        .from('match_request')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING')

      if (a.error) throw a.error
      if (b.error) throw b.error
      if (c.error) {
        // não derruba a tela se a tabela não existir / não tiver permissão
        setPendingRequestsCount(0)
      } else {
        setPendingRequestsCount(c.count ?? 0)
      }

      setFreightsCount(a.count ?? 0)
      setTripsCount(b.count ?? 0)

      // Últimos registros (clicáveis)
      const f = await supabase
        .from('freight')
        .select('id, shipper_id, pickup_label, dropoff_label, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      const t = await supabase
        .from('trip')
        .select('id, driver_id, origin_label, destination_label, status, route_distance_m, route_duration_s, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (f.error) throw f.error
      if (t.error) throw t.error

      setFreights((f.data ?? []) as FreightRow[])
      setTrips((t.data ?? []) as TripRow[])
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao carregar visão geral')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  return (
    <AppShell title="Admin • Operação">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600">
          Você está no modo <b>Operador</b>. Use os atalhos abaixo para navegar e operar o sistema.
        </div>

        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
          onClick={() => void loadAll()}
          disabled={loading}
        >
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {err ? <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm mb-4">{err}</div> : null}

      {/* Atalhos principais */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        <ActionLink
          to="/shipper/freights/new"
          title="Criar novo frete"
          subtitle="Cadastrar uma carga como Empresa"
          variant="dark"
        />
        <ActionLink
          to="/driver/trips/new"
          title="Criar nova viagem"
          subtitle="Cadastrar um retorno como Motorista"
          variant="dark"
        />
        <ActionLink
          to="/shipper/requests"
          title="Solicitações pendentes"
          subtitle="Abrir inbox de pedidos de contato"
        />
        <ActionLink to="/shipper/freights" title="Lista de fretes" subtitle="Ver / editar fretes cadastrados" />
        <ActionLink to="/driver/trips" title="Lista de viagens" subtitle="Ver viagens e abrir matches" />
        <ActionLink to="/shipper" title="Dashboard Empresa" subtitle="Visão do embarcador" />
      </div>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Fretes cadastrados" value={freightsCount} hint="Total na plataforma" />
        <StatCard label="Viagens cadastradas" value={tripsCount} hint="Total na plataforma" />
        <StatCard label="Solicitações pendentes" value={pendingRequestsCount} hint="Match requests em PENDING" />
      </div>

      {/* Últimos itens */}
      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Últimos fretes</div>
            <Link className="text-sm underline text-slate-700" to="/shipper/freights">
              Ver todos
            </Link>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="text-sm text-slate-600">Carregando…</div>
            ) : freights.length === 0 ? (
              <div className="text-sm text-slate-600">Nenhum frete ainda.</div>
            ) : (
              freights.map((r) => (
                <Link
                  key={r.id}
                  to={`/shipper/freights/${r.id}/edit`}
                  className="block rounded-xl border p-3 hover:bg-slate-50 transition"
                  title="Abrir/editar frete"
                >
                  <div className="font-medium">
                    {r.pickup_label} → {r.dropoff_label}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Status: {r.status} • Shipper: {r.shipper_id.slice(0, 8)}… • {String(r.created_at).slice(0, 10)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Últimas viagens</div>
            <Link className="text-sm underline text-slate-700" to="/driver/trips">
              Ver todas
            </Link>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="text-sm text-slate-600">Carregando…</div>
            ) : trips.length === 0 ? (
              <div className="text-sm text-slate-600">Nenhuma viagem ainda.</div>
            ) : (
              trips.map((r) => (
                <Link
                  key={r.id}
                  to={`/driver/trips/${r.id}/matches`}
                  className="block rounded-xl border p-3 hover:bg-slate-50 transition"
                  title="Abrir matches desta viagem"
                >
                  <div className="font-medium">
                    {r.origin_label} → {r.destination_label}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Status: {r.status} • Driver: {r.driver_id.slice(0, 8)}… • {km(r.route_distance_m)} • {h(r.route_duration_s)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
