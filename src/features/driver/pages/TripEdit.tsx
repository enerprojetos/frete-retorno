import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import AppShell from '@/shared/ui/AppShell'
import PlaceAutocomplete from '@/shared/ui/PlaceAutocomplete'
import MapPicker from '@/shared/ui/MapPicker'
import { useAuth } from '@/auth/useAuth'
import { cancelTrip, getTripById, updateTripViaFunction, type TripRow } from '@/features/trips/api/tripsService'

type Place = { label: string; lat: number; lng: number }

function km(m: number | null | undefined) {
  if (!m || m <= 0) return '—'
  return `${Math.round(m / 1000)} km`
}

export default function TripEdit() {
  const { id } = useParams()
  const tripId = id ?? ''
  const nav = useNavigate()
  const { profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [status, setStatus] = useState<'OPEN' | 'CANCELLED'>('OPEN')
  const [origin, setOrigin] = useState<Place | null>(null)
  const [destination, setDestination] = useState<Place | null>(null)
  const [corridorKm, setCorridorKm] = useState(50)
  const [routeProfile, setRouteProfile] = useState<'driving-car' | 'driving-hgv'>('driving-hgv')

  const originPos = useMemo(() => (origin ? { lat: origin.lat, lng: origin.lng } : null), [origin])
  const destPos = useMemo(() => (destination ? { lat: destination.lat, lng: destination.lng } : null), [destination])

  useEffect(() => {
    if (!tripId) return
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const t = await getTripById(tripId)
        setStatus(t.status ?? 'OPEN')
        setOrigin({ label: t.origin_label, lat: t.origin_lat, lng: t.origin_lng })
        setDestination({ label: t.destination_label, lat: t.destination_lat, lng: t.destination_lng })
        setCorridorKm(Math.max(10, Math.round((t.corridor_radius_m ?? 50000) / 1000)))
        setRouteProfile((t.profile ?? 'driving-hgv') as any)
      } catch (e: any) {
        setErr(e?.message ?? 'Falha ao carregar viagem')
      } finally {
        setLoading(false)
      }
    })()
  }, [tripId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)

    if (!profile?.id) {
      setErr('Perfil não carregado.')
      return
    }
    if (!origin || !destination) {
      setErr('Selecione origem e destino.')
      return
    }

    setSaving(true)
    try {
      const updated: TripRow = await updateTripViaFunction({
        tripId,
        actorUserId: profile.id,
        origin,
        destination,
        corridorRadiusM: Math.max(10_000, Math.round(corridorKm * 1000)),
        profile: routeProfile,
      })

      alert(`Viagem atualizada ✅ (corredor: ${km(updated.corridor_radius_m)})`)
      nav('/driver', { replace: true })
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function onCancelTrip() {
    const ok = window.confirm('Cancelar esta viagem? Ela deixará de fazer matches.')
    if (!ok) return

    try {
      await cancelTrip(tripId)
      alert('Viagem cancelada ✅')
      nav('/driver', { replace: true })
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao cancelar viagem')
    }
  }

  return (
    <AppShell title="Editar viagem (Motorista)">
      <div className="flex items-center justify-between mb-4">
        <Link className="text-sm underline" to="/driver/trips">
          ← Voltar para minhas viagens
        </Link>

        {status === 'OPEN' ? (
          <button
            type="button"
            onClick={() => void onCancelTrip()}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
          >
            Cancelar viagem
          </button>
        ) : (
          <span className="text-sm text-slate-500">Status: CANCELADA</span>
        )}
      </div>

      {loading ? (
        <div>Carregando…</div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4 space-y-4">
            {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{err}</div>}

            <PlaceAutocomplete
              label="Origem"
              placeholder="Ex.: Goiânia, GO"
              value={origin}
              onChange={setOrigin}
            />

            <MapPicker
              value={originPos}
              onChange={(v) =>
                setOrigin((prev) => ({
                  label: prev?.label ?? 'Ponto selecionado no mapa',
                  lat: v.lat,
                  lng: v.lng,
                }))
              }
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Corredor da rota (km)</label>
              <input
                type="range"
                min={10}
                max={120}
                value={corridorKm}
                onChange={(e) => setCorridorKm(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-slate-600">{corridorKm} km</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 space-y-4">
            <PlaceAutocomplete
              label="Destino"
              placeholder="Ex.: São Paulo, SP"
              value={destination}
              onChange={setDestination}
            />

            <MapPicker
              value={destPos}
              onChange={(v) =>
                setDestination((prev) => ({
                  label: prev?.label ?? 'Ponto selecionado no mapa',
                  lat: v.lat,
                  lng: v.lng,
                }))
              }
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">Tipo de rota</label>
              <select
                className="w-full rounded-xl border p-3"
                value={routeProfile}
                onChange={(e) => setRouteProfile(e.target.value as any)}
              >
                <option value="driving-hgv">Caminhão (HGV)</option>
                <option value="driving-car">Carro (demo)</option>
              </select>
            </div>

            <button
              className="w-full rounded-xl bg-slate-900 text-white px-4 py-2 disabled:opacity-50"
              disabled={saving || status !== 'OPEN'}
              title={status !== 'OPEN' ? 'Viagem cancelada não pode ser alterada' : undefined}
            >
              {saving ? 'Recalculando rota…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  )
}
