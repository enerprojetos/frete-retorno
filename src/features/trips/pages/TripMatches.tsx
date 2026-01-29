import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import AppShell from '@/shared/ui/AppShell'
import { getTripById, getTripMatchesViaFunction, type TripMatch, type TripUiRow } from '@/features/trips/api/tripsService'
import { supabase } from '@/shared/lib/supabaseClient'

import TripVisualMap from '@/features/trips/components/TripVisualMap'
import { getRoutePreview } from '@/shared/api/routePreview'

import { brlFromCents } from '@/shared/lib/money'


import {
  cancelMatchRequest,
  getMatchRequestDetail,
  listRequestsForTrip,
  proposeMatchRequest,
  type MatchRequestRow,
  type MatchRequestStatus,
  type MatchRequestDetail,
} from '@/features/matches/api/matchRequestService'

type LatLng = { lat: number; lng: number }

/**
 * ORS geojson costuma vir com:
 * features[0].properties.way_points = índices (no array geometry.coordinates)
 * que indicam onde cada waypoint (origem, coleta, entrega, destino) “caiu” na rota.
 *
 * idx: 0=origem, 1=coleta, 2=entrega, 3=destino (no seu caso com 4 pontos)
 */
function orsSnappedWaypoint(geo: any, idx: number): LatLng | null {
  const coords = geo?.features?.[0]?.geometry?.coordinates
  const wayPoints = geo?.features?.[0]?.properties?.way_points

  if (!Array.isArray(coords) || !Array.isArray(wayPoints)) return null
  const wp = wayPoints[idx]
  if (typeof wp !== 'number') return null

  const c = coords[wp]
  if (!Array.isArray(c) || c.length < 2) return null

  const [lng, lat] = c
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  return { lat, lng }
}


type GeoJSONPoint = { type: 'Point'; coordinates: [number, number] }
type TripVisualRow = {
  trip_id: string
  corridor_radius_m: number
  origin_geojson: GeoJSONPoint | null
  destination_geojson: GeoJSONPoint | null
  route_geojson: any | null
  corridor_geojson: any | null
}

type FreightLite = {
  id: string
  pickup_label: string | null
  dropoff_label: string | null
  status: string | null

  pickup_geom: GeoJSONPoint | null
  dropoff_geom: GeoJSONPoint | null
  pickup_radius_m: number | null
  dropoff_radius_m: number | null

  // ✅ preços/distância (vindos do banco)
  price_total_cents: number | null
  driver_payout_cents: number | null
  distance_m: number | null
  duration_s: number | null
  currency: string | null
}




function km(m: number) {
  return `${(m / 1000).toFixed(1)} km`
}

function statusLabel(s: MatchRequestStatus) {
  switch (s) {
    case 'PENDING':
      return 'PENDENTE'
    case 'ACCEPTED':
      return 'ACEITO'
    case 'REJECTED':
      return 'RECUSADO'
    case 'CANCELLED':
      return 'CANCELADO'
    default:
      return s
  }
}

function fmtDuration(seconds: number) {
  const totalMin = Math.max(0, Math.round(seconds / 60))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function googleMapsDirUrl(points: Array<{ lat: number; lng: number }>) {
  if (points.length < 2) return 'https://www.google.com/maps'
  const origin = points[0]
  const destination = points[points.length - 1]
  const waypoints = points.slice(1, -1).map((p) => `${p.lat},${p.lng}`).join('|')

  const params = new URLSearchParams()
  params.set('api', '1')
  params.set('origin', `${origin.lat},${origin.lng}`)
  params.set('destination', `${destination.lat},${destination.lng}`)
  params.set('travelmode', 'driving')
  if (waypoints) params.set('waypoints', waypoints)

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function wazeNavUrl(dest: { lat: number; lng: number }) {
  return `https://www.waze.com/ul?ll=${dest.lat}%2C${dest.lng}&navigate=yes`
}


function StatusBadge({ status }: { status: MatchRequestStatus }) {
  const cls =
    status === 'ACCEPTED'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'PENDING'
        ? 'bg-amber-100 text-amber-800'
        : status === 'REJECTED'
          ? 'bg-rose-100 text-rose-800'
          : 'bg-slate-200 text-slate-700'

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {statusLabel(status)}
    </span>
  )
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

function pointToLatLng(p: GeoJSONPoint | null | undefined) {
  if (!p) return null
  const [lng, lat] = p.coordinates
  return { lat, lng }
}

function toLngLat(p: { lat: number; lng: number }) {
  return [p.lng, p.lat] as [number, number]
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}



export default function TripMatches() {
  const { id } = useParams()
  const tripId = id ?? ''

  const [matches, setMatches] = useState<TripMatch[]>([])
  const [freights, setFreights] = useState<Record<string, FreightLite>>({})
  const [tripVis, setTripVis] = useState<TripVisualRow | null>(null)

  const [requestsByFreightId, setRequestsByFreightId] = useState<Record<string, MatchRequestRow>>({})
  const [detailByRequestId, setDetailByRequestId] = useState<Record<string, MatchRequestDetail | null>>({})

  const [selectedFreightId, setSelectedFreightId] = useState<string | null>(null)

  const [altRouteGeoJson, setAltRouteGeoJson] = useState<any | null>(null)
  const [altRouteLoading, setAltRouteLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [busyFreightId, setBusyFreightId] = useState<string | null>(null)
  const [busyDetailReqId, setBusyDetailReqId] = useState<string | null>(null)

  const [tripInfo, setTripInfo] = useState<TripUiRow | null>(null)

  const [showOriginalRoute, setShowOriginalRoute] = useState(false)
  const [showCorridor, setShowCorridor] = useState(false)

  const [altRouteMeta, setAltRouteMeta] = useState<{ distance_m: number | null; duration_s: number | null } | null>(null)

  const [snappedStops, setSnappedStops] = useState<{
    pickup: { lat: number; lng: number } | null
    dropoff: { lat: number; lng: number } | null
  }>({
    pickup: null,
    dropoff: null,
  })

  const [matchRouteStatus, setMatchRouteStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [, setMatchRouteError] = useState<string | null>(null)



  async function loadAll() {
    if (!tripId) return

    setLoading(true)
    setErr(null)

    try {
      // 1) Matches (Edge Function)
      const m = await getTripMatchesViaFunction(tripId, 50)
      setMatches(m)

      const trip = await getTripById(tripId)
      setTripInfo(trip)

      // 2) Visual da viagem (rota + corredor/buffer)
      const { data: vis, error: visErr } = await supabase
        .rpc('get_trip_visual', { p_trip_id: tripId })
        .maybeSingle()

      if (visErr) throw visErr
      setTripVis((vis ?? null) as TripVisualRow | null)

      // 3) Requests do processo (match_request)
      try {
        const reqs = await listRequestsForTrip(tripId)
        const map: Record<string, MatchRequestRow> = {}
        for (const r of reqs) map[r.freight_id] = r
        setRequestsByFreightId(map)
      } catch {
        setRequestsByFreightId({})
      }

      // 4) Dados do frete (labels + geoms + raios)
      const ids = m.map((x) => x.freight_id).filter(Boolean)
      if (ids.length > 0) {
        const { data, error } = await supabase
          .from('freight')
          .select('id,pickup_label,dropoff_label,status,pickup_geom,dropoff_geom,pickup_radius_m,dropoff_radius_m,' + 'price_total_cents,driver_payout_cents,distance_m,duration_s,currency')
          .in('id', ids)

        if (!error) {
          const map: Record<string, FreightLite> = {}
            ; (data ?? []).forEach((f: any) => {
              map[f.id] = f as FreightLite
            })
          setFreights(map)
        } else {
          setFreights({})
        }
      } else {
        setFreights({})
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao carregar matches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, tripInfo?.profile])

  const sorted = useMemo(() => [...matches].sort((a, b) => b.score - a.score), [matches])

  // Sempre manter um match selecionado válido (e selecionar o primeiro automaticamente)
  useEffect(() => {
    if (sorted.length === 0) {
      setSelectedFreightId(null)
      setAltRouteGeoJson(null)
      return
    }

    if (!selectedFreightId) {
      setSelectedFreightId(sorted[0].freight_id)
      return
    }

    const exists = sorted.some((x) => x.freight_id === selectedFreightId)
    if (!exists) setSelectedFreightId(sorted[0].freight_id)
  }, [sorted, selectedFreightId])

  const mapOrigin = pointToLatLng(tripVis?.origin_geojson)
  const mapDestination = pointToLatLng(tripVis?.destination_geojson)

  const selectedFreightGeom = useMemo(() => {
    if (!selectedFreightId) return null

    const f = freights[selectedFreightId]
    if (!f?.pickup_geom || !f?.dropoff_geom) return null

    const pickup = pointToLatLng(f.pickup_geom)
    const dropoff = pointToLatLng(f.dropoff_geom)
    if (!pickup || !dropoff) return null

    return {
      id: f.id,
      pickup,
      dropoff,
      pickupRadiusM: f.pickup_radius_m,
      dropoffRadiusM: f.dropoff_radius_m,
    }
  }, [selectedFreightId, freights])

  // ✅ MAPA deve receber apenas 1 frete (o selecionado) para não poluir
      const displayFreightGeom = useMemo(() => {
      if (!selectedFreightGeom) return null
      return {
        ...selectedFreightGeom,
        pickup: snappedStops.pickup ?? selectedFreightGeom.pickup,
        dropoff: snappedStops.dropoff ?? selectedFreightGeom.dropoff,
      }
    }, [selectedFreightGeom, snappedStops.pickup, snappedStops.dropoff])

    const mapFreights = useMemo(() => (displayFreightGeom ? [displayFreightGeom] : []), [displayFreightGeom])

  // ✅ rota alternativa (origem -> coleta -> entrega -> destino) quando troca o match selecionado
  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!mapOrigin || !mapDestination || !selectedFreightGeom) {
        setAltRouteGeoJson(null)
        setSnappedStops({ pickup: null, dropoff: null })
        setAltRouteMeta?.(null as any) // se existir altRouteMeta no seu arquivo
        return
      }

      
      setMatchRouteStatus('loading')
      setMatchRouteError(null)
      setAltRouteGeoJson(null) // limpa a rota anterior pra não parecer “travado”
      setAltRouteLoading(true)

      try {
        const coords: Array<[number, number]> = [
          toLngLat(mapOrigin),
          toLngLat(selectedFreightGeom.pickup),
          toLngLat(selectedFreightGeom.dropoff),
          toLngLat(mapDestination),
        ]

        // 1) tenta HGV
        let r: { route_geojson: any; distance_m: number | null; duration_s: number | null } | null = null
        try {
          r = await getRoutePreview({ profile: 'driving-hgv', coordinates: coords })
        } catch {
          // 2) fallback carro
          r = await getRoutePreview({ profile: 'driving-car', coordinates: coords })
        }

        const geo = (r as any)?.route_geojson ?? (r as any)?.geojson ?? null

        // ✅ pega exatamente onde o ORS encaixou (snap) coleta/entrega na rota
        const pickupSnap = geo ? orsSnappedWaypoint(geo, 1) : null
        const dropoffSnap = geo ? orsSnappedWaypoint(geo, 2) : null

        if (!cancelled) {
          setAltRouteGeoJson(geo)
          setMatchRouteStatus('ok')
          setSnappedStops({ pickup: pickupSnap, dropoff: dropoffSnap })

          // (opcional) se você já tem altRouteMeta no arquivo, agora sim preencha:
          if (typeof setAltRouteMeta === 'function') {
            setAltRouteMeta({
              distance_m: (r as any)?.distance_m ?? null,
              duration_s: (r as any)?.duration_s ?? null,
            })
          }
        }

        if (!cancelled) {
          setAltRouteGeoJson(geo)
          setMatchRouteStatus('ok')
          setAltRouteMeta({
            distance_m: r?.distance_m ?? null,
            duration_s: r?.duration_s ?? null,
          })
        }
      } catch {
        if (!cancelled) {
          setAltRouteGeoJson(null)
          setAltRouteMeta(null)

          setMatchRouteStatus('error')
          setMatchRouteError('Falha ao calcular rota do match (passando por coleta e entrega).')

          if (!cancelled) {
          setSnappedStops({ pickup: null, dropoff: null })
          if (typeof setAltRouteMeta === 'function') setAltRouteMeta(null)
        }


        }
      } finally {
        if (!cancelled) setAltRouteLoading(false)
      }
    }


    void run()
    return () => {
      cancelled = true
    }
  }, [
    mapOrigin?.lat,
    mapOrigin?.lng,
    mapDestination?.lat,
    mapDestination?.lng,
    selectedFreightGeom?.id,
    selectedFreightGeom?.pickup?.lat,
    selectedFreightGeom?.pickup?.lng,
    selectedFreightGeom?.dropoff?.lat,
    selectedFreightGeom?.dropoff?.lng,
  ])

  // ✅ rota principal vs overlay (modo Uber-like)

  const primaryRoute = matchRouteStatus === 'ok' ? altRouteGeoJson : null



  async function onPropose(freightId: string) {
    if (!tripId) return
    setBusyFreightId(freightId)
    setErr(null)
    try {
      const row = await proposeMatchRequest(tripId, freightId)
      setRequestsByFreightId((cur) => ({ ...cur, [freightId]: row }))
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao solicitar contato')
    } finally {
      setBusyFreightId(null)
    }
  }

  async function onCancelRequest(freightId: string, reqId: string) {
    setBusyFreightId(freightId)
    setErr(null)
    try {
      const row = await cancelMatchRequest(reqId)
      setRequestsByFreightId((cur) => ({ ...cur, [freightId]: row }))
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao cancelar solicitação')
    } finally {
      setBusyFreightId(null)
    }
  }

  async function onLoadContact(reqId: string) {
    setBusyDetailReqId(reqId)
    setErr(null)
    try {
      const detail = await getMatchRequestDetail(reqId)
      setDetailByRequestId((cur) => ({ ...cur, [reqId]: detail }))
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao buscar contato')
    } finally {
      setBusyDetailReqId(null)
    }
  }



  return (
    <AppShell title="Matches da viagem">
      <div className="flex items-center justify-between mb-4">
        <Link className="text-sm underline text-slate-700" to="/driver">
          ← Voltar para minhas viagens
        </Link>

        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100"
          onClick={() => void loadAll()}
          disabled={loading}
        >
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {loading && <div>Carregando…</div>}
      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{err}</div>}

      {/* ✅ MAPA: rota + corredor + (apenas) o frete selecionado */}
      {!loading && !err && mapOrigin && mapDestination ? (
        <div className="mb-4 space-y-2">
          {(() => {
            const f = selectedFreightId ? freights[selectedFreightId] : null
            const canBuildNav =
              !!mapOrigin && !!mapDestination && !!selectedFreightGeom?.pickup && !!selectedFreightGeom?.dropoff

            const fullRoutePoints = canBuildNav
              ? [mapOrigin!, selectedFreightGeom!.pickup, selectedFreightGeom!.dropoff, mapDestination!]
              : []

            const googleFull = canBuildNav ? googleMapsDirUrl(fullRoutePoints) : undefined
            const wazePickup = selectedFreightGeom?.pickup ? wazeNavUrl(selectedFreightGeom.pickup) : undefined
            const wazeDropoff = selectedFreightGeom?.dropoff ? wazeNavUrl(selectedFreightGeom.dropoff) : undefined

            return (
              <div className="rounded-2xl border bg-white p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">Rota do match</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      Início → Coleta → Entrega → Final
                    </div>

                    {altRouteLoading ? (
                      <div className="mt-1 text-xs text-slate-500">Calculando rota remodelada…</div>
                    ) : altRouteMeta?.distance_m ? (
                      <div className="mt-1 text-sm text-slate-700">
                        Total: <b>{Math.round(altRouteMeta.distance_m / 1000)} km</b>
                        {altRouteMeta.duration_s ? (
                          <span className="text-slate-500"> • {fmtDuration(altRouteMeta.duration_s)}</span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500">
                        Selecione um match para gerar a rota remodelada.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {googleFull ? (
                      <a
                        className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm hover:opacity-95"
                        href={googleFull}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Abrir rota completa (com coleta e entrega) no Google Maps"
                      >
                        Abrir no Google Maps
                      </a>
                    ) : (
                      <button className="rounded-xl bg-slate-200 text-slate-600 px-3 py-2 text-sm" disabled>
                        Abrir no Google Maps
                      </button>
                    )}

                    {wazePickup ? (
                      <a
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                        href={wazePickup}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Navegar para a coleta no Waze"
                      >
                        Waze: Coleta
                      </a>
                    ) : null}

                    {wazeDropoff ? (
                      <a
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                        href={wazeDropoff}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Navegar para a entrega no Waze"
                      >
                        Waze: Entrega
                      </a>
                    ) : null}

                    <button
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowOriginalRoute((v) => !v)
                      }}
                      title="Mostra a rota original do motorista por cima (tracejada)"
                    >
                      {showOriginalRoute ? 'Ocultar rota original' : 'Mostrar rota original'}
                    </button>

                    <button
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowCorridor((v) => !v)
                      }}
                      title="O corredor é útil para análise, mas costuma poluir no uso do dia a dia"
                    >
                      {showCorridor ? 'Ocultar corredor' : 'Mostrar corredor'}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">1) Início</div>
                    <div className="font-medium text-slate-800 break-words">{tripInfo?.origin_label ?? '—'}</div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">2) Coleta</div>
                    <div className="font-medium text-slate-800 break-words">{f?.pickup_label ?? '—'}</div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">3) Entrega</div>
                    <div className="font-medium text-slate-800 break-words">{f?.dropoff_label ?? '—'}</div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">4) Final</div>
                    <div className="font-medium text-slate-800 break-words">{tripInfo?.destination_label ?? '—'}</div>
                  </div>
                </div>
              </div>
            )
          })()}

          {altRouteLoading ? <div className="text-xs text-slate-500">Calculando rota com coleta/entrega…</div> : null}

          {!altRouteLoading && selectedFreightGeom && !altRouteGeoJson ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Não foi possível calcular a rota passando por <b>Coleta</b> e <b>Entrega</b>.
              Isso pode acontecer quando o ponto está fora de estrada ou há restrições. Tente outro match.
            </div>
          ) : null}

          {matchRouteStatus === 'error' ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 mb-3">
              Não foi possível calcular a rota do match passando por <b>Coleta</b> e <b>Entrega</b>.
              Exibindo a rota original do motorista (tracejada).
            </div>
          ) : null}


          <TripVisualMap
            origin={mapOrigin}
            destination={mapDestination}
            routeGeoJson={primaryRoute}
            altRouteGeoJson={(showOriginalRoute || matchRouteStatus === 'error') ? (tripVis?.route_geojson ?? null) : null}
            corridorGeoJson={tripVis?.corridor_geojson ?? null}
            freights={mapFreights}
            showCorridor={showCorridor}
            showFreightRadii={false}
          />

        </div>
      ) : null}

      {!loading && !err && sorted.length === 0 ? (
        <div className="rounded-2xl border bg-white p-4">Nenhum match encontrado para esta viagem.</div>
      ) : null}

      <div className="grid gap-3">
        {sorted.map((m) => {
          const f = freights[m.freight_id]
          const req = requestsByFreightId[m.freight_id] ?? null
          const reqStatus = req?.status ?? null

          const title = `${f?.pickup_label ?? 'Origem'} → ${f?.dropoff_label ?? 'Destino'}`
          const freightOpen = (f?.status ?? 'OPEN') === 'OPEN'

          const canPropose = !reqStatus || reqStatus === 'REJECTED' || reqStatus === 'CANCELLED'
          const isBusy = busyFreightId === m.freight_id
          const isSelected = selectedFreightId === m.freight_id

          const detail = req?.id ? detailByRequestId[req.id] : null
          const hasContact =
            reqStatus === 'ACCEPTED' && !!detail && (detail.shipper_contact_phone || detail.driver_phone)

          return (
            <div
              key={`${m.freight_id}-${m.pickup_pos}-${m.dropoff_pos}`}
              className={cx(
                'rounded-2xl border bg-white p-4 overflow-hidden cursor-pointer transition',
                isSelected ? 'border-slate-900 ring-2 ring-slate-200' : 'hover:bg-slate-50'
              )}
              onClick={() => setSelectedFreightId(m.freight_id)}
              title="Clique para ver este match no mapa"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="font-medium truncate" title={title}>
                      {title}
                    </div>

                    {reqStatus ? (
                      <StatusBadge status={reqStatus} />
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                        SEM SOLICITAÇÃO
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    Score: <strong>{m.score.toFixed(2)}</strong> • Coleta: <strong>{km(m.pickup_dist_m)}</strong> •
                    Entrega: <strong>{km(m.dropoff_dist_m)}</strong>
                  </div>

                  {/* ✅ Valor para o motorista (já com desconto) */}
                  {f?.driver_payout_cents != null ? (
                    <div className="mt-2 text-sm text-slate-800">
                      Você recebe: <b>{brlFromCents(f.driver_payout_cents)}</b>
                      {f.distance_m ? (
                        <span className="text-xs text-slate-500"> • Carga: {Math.round(f.distance_m / 1000)} km</span>
                      ) : null}

                      {isSelected && altRouteMeta?.distance_m ? (
                        <span className="text-xs text-slate-500"> • Rota total: {Math.round(altRouteMeta.distance_m / 1000)} km</span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-slate-500">Preço não informado.</div>
                  )}


                  {!freightOpen ? (
                    <div className="mt-2 text-xs text-rose-600">
                      Este frete não está mais aberto (pode ter sido encerrado).
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 flex flex-wrap gap-2 justify-end">
                  {reqStatus === 'PENDING' ? (
                    <button
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        req && void onCancelRequest(m.freight_id, req.id)
                      }}
                      disabled={isBusy}
                    >
                      {isBusy ? 'Cancelando…' : 'Cancelar solicitação'}
                    </button>
                  ) : null}

                  {reqStatus === 'ACCEPTED' ? (
                    <button
                      className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        req && void onLoadContact(req.id)
                      }}
                      disabled={!req || busyDetailReqId === req.id}
                    >
                      {busyDetailReqId === req?.id ? 'Carregando…' : 'Ver contato'}
                    </button>
                  ) : null}

                  {canPropose ? (
                    <button
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        void onPropose(m.freight_id)
                      }}
                      disabled={isBusy || !freightOpen}
                      title={!freightOpen ? 'Frete encerrado' : undefined}
                    >
                      {isBusy ? 'Solicitando…' : reqStatus ? 'Solicitar novamente' : 'Solicitar contato'}
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Contatos (somente quando ACCEPTED e RPC devolver dados) */}
              {reqStatus === 'ACCEPTED' ? (
                <div className="mt-3 rounded-xl border bg-slate-50 p-3">
                  {hasContact ? (
                    <div className="text-sm text-slate-700 space-y-2">
                      <div>
                        <div className="text-xs text-slate-500">Empresa</div>
                        <div className="font-medium">{req?.shipper_display_name ?? 'Empresa'}</div>

                        {detail?.shipper_contact_name ? <div className="text-sm">{detail.shipper_contact_name}</div> : null}

                        {detail?.shipper_contact_phone ? (
                          <div className="mt-1 flex flex-wrap gap-2 items-center">
                            <span className="text-sm">📞 {detail.shipper_contact_phone}</span>
                            <a
                              className="text-sm underline"
                              href={`https://wa.me/${normalizePhone(detail.shipper_contact_phone)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WhatsApp
                            </a>
                          </div>
                        ) : null}
                      </div>

                      {detail?.driver_phone ? (
                        <div>
                          <div className="text-xs text-slate-500">Seu telefone (motorista)</div>
                          <div className="text-sm">📞 {detail.driver_phone}</div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">
                      Contato liberado, mas ainda não carregado. Clique em <strong>“Ver contato”</strong>.
                    </div>
                  )}
                </div>
              ) : null}

              <div className="text-xs text-slate-400 mt-2 break-all">Freight ID: {m.freight_id}</div>
            </div>
          )
        })}
      </div>
    </AppShell>
  )
}
