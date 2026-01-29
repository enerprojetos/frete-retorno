import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import AppShell from '@/shared/ui/AppShell'
import PlaceAutocomplete from '@/shared/ui/PlaceAutocomplete'
import MapPicker from '@/shared/ui/MapPicker'
import {
  getFreightById,
  setFreightStatus,
  updateFreight,
  type FreightStatus,
} from '@/features/freights/api/freightsService'

type Place = { label: string; lat: number; lng: number }

function mToKmRounded(m: number | null | undefined, fallback = 50) {
  if (!m || m <= 0) return fallback
  return Math.max(0, Math.round(m / 1000))
}

export default function FreightEdit() {
  const { id } = useParams()
  const nav = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [status, setStatus] = useState<FreightStatus>('OPEN')
  const [pickup, setPickup] = useState<Place | null>(null)
  const [dropoff, setDropoff] = useState<Place | null>(null)
  const [pickupRadiusKm, setPickupRadiusKm] = useState(50)
  const [dropoffRadiusKm, setDropoffRadiusKm] = useState(50)
  const [notes, setNotes] = useState('')

  const pickupPos = useMemo(() => (pickup ? { lat: pickup.lat, lng: pickup.lng } : null), [pickup])
  const dropoffPos = useMemo(() => (dropoff ? { lat: dropoff.lat, lng: dropoff.lng } : null), [dropoff])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const f = await getFreightById(id)
        setStatus((f.status ?? 'OPEN') as FreightStatus)
        setPickup({ label: f.pickup_label, lat: f.pickup_lat, lng: f.pickup_lng })
        setDropoff({ label: f.dropoff_label, lat: f.dropoff_lat, lng: f.dropoff_lng })
        setPickupRadiusKm(mToKmRounded(f.pickup_radius_m, 50))
        setDropoffRadiusKm(mToKmRounded(f.dropoff_radius_m, 50))
        setNotes(f.notes ?? '')
      } catch (e: any) {
        setErr(e?.message ?? 'Falha ao carregar frete')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return

    setErr(null)
    if (!pickup || !dropoff) {
      setErr('Selecione origem e destino.')
      return
    }

    setSaving(true)
    try {
      await updateFreight(id, {
        pickup: {
          label: pickup.label,
          lat: pickup.lat,
          lng: pickup.lng,
          radiusM: Math.max(0, Math.round(pickupRadiusKm * 1000)),
        },
        dropoff: {
          label: dropoff.label,
          lat: dropoff.lat,
          lng: dropoff.lng,
          radiusM: Math.max(0, Math.round(dropoffRadiusKm * 1000)),
        },
        notes: notes.trim() ? notes.trim() : null,
      })

      alert('Frete atualizado ✅')
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao salvar alterações')
    } finally {
      setSaving(false)
    }
  }

  async function onClose() {
    if (!id) return
    const ok = window.confirm('Encerrar este frete? Ele deixará de aparecer em matches.')
    if (!ok) return

    try {
      await setFreightStatus(id, 'CLOSED')
      setStatus('CLOSED')
      alert('Frete encerrado ✅')
      nav('/shipper', { replace: true })
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao encerrar frete')
    }
  }

  return (
    <AppShell title="Editar frete">
      <div className="flex items-center justify-between mb-4">
        <Link className="text-sm underline" to="/shipper/freights">
          ← Voltar para lista
        </Link>

        {status === 'OPEN' ? (
          <button
            onClick={() => void onClose()}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
          >
            Encerrar frete
          </button>
        ) : (
          <span className="text-sm text-slate-500">Status: ENCERRADO</span>
        )}
      </div>

      {loading ? (
        <div>Carregando…</div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4 space-y-4">
            {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{err}</div>}

            <PlaceAutocomplete
              label="Origem do embarque"
              placeholder="Ex.: Goiânia, GO"
              value={pickup}
              onChange={setPickup}
            />

            <MapPicker
              value={pickupPos}
              onChange={(v) =>
                setPickup((prev) => ({
                  label: prev?.label ?? 'Ponto selecionado no mapa',
                  lat: v.lat,
                  lng: v.lng,
                }))
              }
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Raio de coleta (km)</label>
              <input
                type="range"
                min={5}
                max={120}
                value={pickupRadiusKm}
                onChange={(e) => setPickupRadiusKm(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-slate-600">{pickupRadiusKm} km</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 space-y-4">
            <PlaceAutocomplete
              label="Destino da entrega"
              placeholder="Ex.: São Paulo, SP"
              value={dropoff}
              onChange={setDropoff}
            />

            <MapPicker
              value={dropoffPos}
              onChange={(v) =>
                setDropoff((prev) => ({
                  label: prev?.label ?? 'Ponto selecionado no mapa',
                  lat: v.lat,
                  lng: v.lng,
                }))
              }
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Raio de entrega (km)</label>
              <input
                type="range"
                min={5}
                max={120}
                value={dropoffRadiusKm}
                onChange={(e) => setDropoffRadiusKm(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-slate-600">{dropoffRadiusKm} km</div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Observações</label>
              <textarea
                className="w-full rounded-xl border p-3 min-h-[110px]"
                placeholder="Ex.: equipamento pesado, precisa de prancha, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              className="w-full rounded-xl bg-slate-900 text-white px-4 py-2 disabled:opacity-50"
              disabled={saving || status !== 'OPEN'}
              title={status !== 'OPEN' ? 'Frete encerrado não pode ser alterado' : undefined}
            >
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  )
}
