import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import AppShell from '@/shared/ui/AppShell'
import PlaceAutocomplete from '@/shared/ui/PlaceAutocomplete'
import RoutePickerMap from '@/shared/ui/RoutePickerMap'

import { createFreight } from '@/features/freights/api/freightsService'
import { getRoutePreview } from '@/shared/api/routePreview'
import { useAuth } from '@/auth/useAuth'

import { PRICE_PER_KM_BRL, PLATFORM_FEE_PCT } from '@/shared/config/pricing'
import { brlFromCents } from '@/shared/lib/money'

type Place = { label: string; lat: number; lng: number }

type RouteInfo = {
  distanceM: number | null
  durationS: number | null
}

function calcPricing(distanceM: number) {
  const km = distanceM / 1000
  const totalCents = Math.round(km * PRICE_PER_KM_BRL * 100)
  const payoutCents = Math.round(totalCents * (1 - PLATFORM_FEE_PCT))
  return { totalCents, payoutCents }
}

/**
 * Normaliza o retorno do getRoutePreview() porque ele pode variar conforme sua implementação:
 * - pode vir como { geojson, distanceM, durationS }
 * - ou { route_geojson, distance_m, duration_s }  <-- (seu caso atual)
 * - ou até uma FeatureCollection (type: 'FeatureCollection' e features[0].properties.summary.distance)
 */
function normalizeRoutePreview(res: unknown): { geojson: any | null; distanceM: number | null; durationS: number | null } {
  const r: any = res ?? null
  if (!r) return { geojson: null, distanceM: null, durationS: null }

  const isFeatureCollection = r?.type === 'FeatureCollection' && Array.isArray(r?.features)

  const geojson =
    r?.geojson ??
    r?.route_geojson ??
    r?.routeGeoJson ??
    r?.route_geoJSON ??
    (isFeatureCollection ? r : null)

  const distanceMaybe =
    r?.distanceM ??
    r?.distance_m ??
    r?.distance ??
    r?.summary?.distance ??
    r?.properties?.summary?.distance ??
    r?.features?.[0]?.properties?.summary?.distance ??
    null

  const durationMaybe =
    r?.durationS ??
    r?.duration_s ??
    r?.duration ??
    r?.summary?.duration ??
    r?.properties?.summary?.duration ??
    r?.features?.[0]?.properties?.summary?.duration ??
    null

  return {
    geojson: geojson ?? null,
    distanceM: typeof distanceMaybe === 'number' ? distanceMaybe : null,
    durationS: typeof durationMaybe === 'number' ? durationMaybe : null,
  }
}

export default function FreightCreate() {
  const nav = useNavigate()
  const { profile } = useAuth()

  const [pickup, setPickup] = useState<Place | null>(null)
  const [dropoff, setDropoff] = useState<Place | null>(null)
  const [pickupRadiusKm, setPickupRadiusKm] = useState(50)
  const [dropoffRadiusKm, setDropoffRadiusKm] = useState(50)
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [routeGeoJson, setRouteGeoJson] = useState<any | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)

  const canSubmit = useMemo(() => !!pickup && !!dropoff && !saving, [pickup, dropoff, saving])

  // precificação (derivada da distância)
  const pricing = useMemo(() => {
    const d = routeInfo?.distanceM
    if (!d || d <= 0) return null
    return calcPricing(d)
  }, [routeInfo?.distanceM])

  // ✅ desenhar rota + distância quando tiver os 2 pontos
  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!pickup || !dropoff) {
        setRouteGeoJson(null)
        setRouteInfo(null)
        return
      }

      setRouteLoading(true)
      try {
        const raw = await getRoutePreview({
          profile: 'driving-hgv',
          coordinates: [
            [pickup.lng, pickup.lat],
            [dropoff.lng, dropoff.lat],
          ],
        })

        const norm = normalizeRoutePreview(raw)

        if (!cancelled) {
          setRouteGeoJson(norm.geojson)
          setRouteInfo({ distanceM: norm.distanceM, durationS: norm.durationS })
        }
      } catch {
        if (!cancelled) {
          setRouteGeoJson(null)
          setRouteInfo(null)
        }
      } finally {
        if (!cancelled) setRouteLoading(false)
      }
    }

    // pequeno debounce pra não martelar chamadas enquanto seleciona
    const t = setTimeout(() => void run(), 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)

    if (!pickup || !dropoff) {
      setErr('Selecione origem e destino.')
      return
    }

    if (!profile?.id) {
      setErr('Perfil não carregado ainda. Tente novamente.')
      return
    }

    setSaving(true)
    try {
      await createFreight({
        shipperId: profile.id,

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

        distanceM: routeInfo?.distanceM ?? null,
        durationS: routeInfo?.durationS ?? null,
        priceTotalCents: pricing?.totalCents ?? null,
        driverPayoutCents: pricing?.payoutCents ?? null,
        currency: 'BRL',

        // ⚠️ Nesta etapa estamos só CALCULANDO/EXIBINDO o preço no frontend.
        // Para SALVAR no banco, precisamos:
        // 1) criar colunas (price_total_cents, driver_payout_cents, distance_m, currency)
        // 2) atualizar a RPC create_freight (ou insert) no backend
      })

      alert('Frete cadastrado ✅')
      nav('/shipper', { replace: true })
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao cadastrar frete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Novo frete (Empresa)">
      <form onSubmit={onSubmit} className="grid gap-4">
        {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{err}</div>}

        <div className="rounded-2xl border bg-white p-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <PlaceAutocomplete
              label="Origem do embarque"
              placeholder="Ex.: Goiânia, GO"
              value={pickup}
              onChange={setPickup}
            />
            <PlaceAutocomplete
              label="Destino da entrega"
              placeholder="Ex.: São Paulo, SP"
              value={dropoff}
              onChange={setDropoff}
            />
          </div>

          <RoutePickerMap
            origin={pickup}
            destination={dropoff}
            onChangeOrigin={setPickup}
            onChangeDestination={setDropoff}
            routeGeoJson={routeGeoJson}
          />

          {/* ✅ ÚNICA Estimativa (corrigida) */}
          <div className="rounded-xl border bg-slate-50 p-3">
            <div className="text-sm font-medium text-slate-800">Estimativa</div>

            {routeLoading ? (
              <div className="text-sm text-slate-600 mt-2">Calculando rota e preço…</div>
            ) : routeInfo?.distanceM ? (
              <div className="space-y-1 mt-2">
                <div className="text-sm text-slate-700">
                  Distância: <b>{Math.round(routeInfo.distanceM / 1000)} km</b>
                  {routeInfo.durationS ? (
                    <>
                      {' '}
                      • Tempo: <b>{Math.round(routeInfo.durationS / 60)} min</b>
                    </>
                  ) : null}
                </div>

                {pricing ? (
                  <div className="text-sm text-slate-700">
                    Preço estimado do frete: <b>{brlFromCents(pricing.totalCents)}</b>{' '}
                    <span className="text-xs text-slate-500">(base: R$ {PRICE_PER_KM_BRL}/km)</span>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">Selecione origem e destino para calcular o preço.</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-600 mt-2">Selecione origem e destino para visualizar rota e preço.</div>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4 space-y-2">
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

          <div className="rounded-2xl border bg-white p-4 space-y-4">
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

            <button className="w-full rounded-xl bg-slate-900 text-white px-4 py-2 disabled:opacity-50" disabled={!canSubmit}>
              {saving ? 'Salvando…' : 'Cadastrar frete'}
            </button>
          </div>
        </div>
      </form>
    </AppShell>
  )
}
