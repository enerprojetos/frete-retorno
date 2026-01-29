import { useEffect, useState } from 'react'
import AppShell from '@/shared/ui/AppShell'
import { supabase } from '@/shared/lib/supabaseClient'

type Row = {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  driver_display_name: string
  freight_pickup_label: string
  freight_dropoff_label: string
  trip_origin_label: string
  trip_destination_label: string
  created_at: string
}

export default function MatchInbox() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setErr(null)
    const { data, error } = await supabase
      .from('match_request')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })

    if (error) setErr(error.message)
    setRows((data ?? []) as Row[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function respond(id: string, decision: 'ACCEPT' | 'REJECT') {
    const { error } = await supabase.rpc('shipper_respond_match_request', {
      p_match_request_id: id,
      p_decision: decision,
      p_close_freight: false, // se quiser fechar o frete ao aceitar, mude p/ true
    })
    if (error) {
      setErr(error.message)
      return
    }
    await load()
  }

  return (
    <AppShell title="Solicitações de match (Empresa)">
      {loading && <div>Carregando…</div>}
      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{err}</div>}

      <div className="grid gap-3">
        {rows.length === 0 && !loading ? (
          <div className="rounded-2xl border bg-white p-4">Nenhuma solicitação pendente.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-white p-4 space-y-2">
              <div className="font-medium">
                Motorista: {r.driver_display_name}
              </div>

              <div className="text-sm text-slate-700">
                Viagem: <strong>{r.trip_origin_label}</strong> → <strong>{r.trip_destination_label}</strong>
              </div>

              <div className="text-sm text-slate-700">
                Frete: <strong>{r.freight_pickup_label}</strong> → <strong>{r.freight_dropoff_label}</strong>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm"
                  onClick={() => respond(r.id, 'ACCEPT')}
                >
                  Aceitar
                </button>
                <button
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100"
                  onClick={() => respond(r.id, 'REJECT')}
                >
                  Recusar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  )
}
