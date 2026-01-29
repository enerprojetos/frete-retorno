import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import AppShell from '@/shared/ui/AppShell'
import PlaceAutocomplete from '@/shared/ui/PlaceAutocomplete'
import RoutePickerMap from '@/shared/ui/RoutePickerMap'

import { createTripViaFunction } from '@/features/trips/api/tripsService'
import { supabase } from '@/shared/lib/supabaseClient'
import { getRoutePreview } from '@/shared/api/routePreview'

type Place = { label: string; lat: number; lng: number }

export default function TripCreate() {
  const nav = useNavigate()

  const [origin, setOrigin] = useState<Place | null>(null)
  const [destination, setDestination] = useState<Place | null>(null)
  const [corridorKm, setCorridorKm] = useState(30)
  const [profile, setProfile] = useState<'driving-car' | 'driving-hgv'>('driving-hgv')

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [routeGeoJson, setRouteGeoJson] = useState<any | null>(null)

  const canSubmit = useMemo(() => !!origin && !!destination && !saving, [origin, destination, saving])

  // desenhar rota no mapa quando tiver os 2 pontos
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!origin || !destination) {
        setRouteGeoJson(null)
        return
      }
      try {
        const r = await getRoutePreview({
          profile,
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
        })
        setRouteGeoJson(r.route_geojson ?? null)
      } catch {
        if (!cancelled) setRouteGeoJson(null)
      }
    }

    const t = setTimeout(() => void run(), 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, profile])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)

    if (!origin || !destination) {
      setErr('Selecione origem e destino.')
      return
    }

    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id
    if (!userId) {
      setErr('Usuário não autenticado.')
      return
    }

    setSaving(true)
    try {
      await createTripViaFunction({
        driverId: userId,
        origin: { label: origin.label, lat: origin.lat, lng: origin.lng },
        destination: { label: destination.label, lat: destination.lat, lng: destination.lng },
        corridorRadiusM: Math.max(1000, Math.round(corridorKm * 1000)),
        profile,
      })

      alert('Viagem cadastrada ✅')
      nav('/driver', { replace: true })
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao cadastrar viagem')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Nova viagem (Motorista)">
      <form onSubmit={onSubmit} className="grid gap-4">
        {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{err}</div>}

        <div className="rounded-2xl border bg-white p-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <PlaceAutocomplete
              label="Origem da viagem"
              placeholder="Ex.: Goiânia, GO"
              value={origin}
              onChange={setOrigin}
            />

            <PlaceAutocomplete
              label="Destino final"
              placeholder="Ex.: Uberlândia, MG"
              value={destination}
              onChange={setDestination}
            />
          </div>

          <RoutePickerMap
            origin={origin}
            destination={destination}
            onChangeOrigin={setOrigin}
            onChangeDestination={setDestination}
            routeGeoJson={routeGeoJson}
          />
        </div>

        <div className="rounded-2xl border bg-white p-4 space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Corredor (buffer) da rota (km)</label>
              <input
                type="range"
                min={5}
                max={120}
                value={corridorKm}
                onChange={(e) => setCorridorKm(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-slate-600">{corridorKm} km</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Perfil da rota</label>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value as any)}
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
              >
                <option value="driving-hgv">Caminhão (HGV)</option>
                <option value="driving-car">Carro</option>
              </select>
              <div className="text-xs text-slate-500">Usado para calcular a rota no OpenRouteService.</div>
            </div>
          </div>

          <button className="w-full rounded-xl bg-slate-900 text-white px-4 py-2 disabled:opacity-50" disabled={!canSubmit}>
            {saving ? 'Salvando…' : 'Cadastrar viagem'}
          </button>
        </div>
      </form>
    </AppShell>
  )
}
