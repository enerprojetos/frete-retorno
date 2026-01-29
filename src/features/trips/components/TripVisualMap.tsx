import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'
import { MapContainer, TileLayer, GeoJSON, Marker, Circle, CircleMarker, useMap } from 'react-leaflet'
import { useEffect, useMemo, useState, useCallback } from 'react'

/** Corrige ícones do Leaflet no Vite */
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type LatLng = { lat: number; lng: number }

type FreightGeom = {
  id: string
  pickup: LatLng
  dropoff: LatLng
  pickupRadiusM?: number | null
  dropoffRadiusM?: number | null
}

type Props = {
  origin: LatLng
  destination: LatLng

  /** rota principal (vamos usar a “remodelada do match”) */
  routeGeoJson?: any | null

  /** corredor/buffer */
  corridorGeoJson?: any | null

  /** rota secundária (ex.: rota original do motorista) */
  altRouteGeoJson?: any | null

  /** normalmente passamos só 1 frete (o selecionado) */
  freights?: FreightGeom[]

  showCorridor?: boolean
  showFreightRadii?: boolean

  /** efeito “fluxo” da rota */
  animateRoute?: boolean
}

function makeLabelIcon(text: string, bg: string) {
  const html = `
    <div style="
      width:30px;height:30px;border-radius:9999px;
      background:${bg}; color:white;
      display:flex;align-items:center;justify-content:center;
      font-weight:900; font-size:13px;
      border:2px solid #fff;
      box-shadow:0 2px 10px rgba(0,0,0,.28);
    ">${text}</div>
  `
  return L.divIcon({
    html,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  })
}

function toPointGeo(latlng: LatLng) {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
  }
}

function safeBoundsFromLayers(layers: any[]) {
  const bounds = new L.LatLngBounds([])
  for (const g of layers) {
    if (!g) continue
    try {
      const b = L.geoJSON(g).getBounds()
      if (b.isValid()) bounds.extend(b)
    } catch { }
  }
  return bounds.isValid() ? bounds : null
}

function extractLinePath(geo: any | null): LatLng[] {
  if (!geo) return []

  // Aceita: FeatureCollection | Feature | Geometry
  const features: any[] =
    geo?.type === 'FeatureCollection'
      ? geo.features ?? []
      : geo?.type === 'Feature'
        ? [geo]
        : [{ type: 'Feature', geometry: geo, properties: {} }]

  const coords: Array<[number, number]> = []

  for (const f of features) {
    const g = f?.geometry
    if (!g) continue

    if (g.type === 'LineString') {
      for (const c of g.coordinates ?? []) coords.push(c)
    } else if (g.type === 'MultiLineString') {
      for (const line of g.coordinates ?? []) for (const c of line ?? []) coords.push(c)
    }
  }

  // coord vem [lng, lat]
  const latlng = coords
    .filter((c) => Array.isArray(c) && c.length >= 2)
    .map((c) => ({ lng: Number(c[0]), lat: Number(c[1]) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

  // downsample para não pesar
  const max = 380
  if (latlng.length <= max) return latlng
  const step = Math.ceil(latlng.length / max)
  return latlng.filter((_, i) => i % step === 0)
}

function MapBridge({ onMap }: { onMap: (m: L.Map) => void }) {
  const map = useMap()
  useEffect(() => onMap(map), [map, onMap])
  return null
}

function RouteFlowDot({ routeGeoJson, enabled }: { routeGeoJson: any | null; enabled: boolean }) {
  const path = useMemo(() => extractLinePath(routeGeoJson), [routeGeoJson])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!enabled) return
    if (path.length < 2) return

    let i = 0
    const step = Math.max(1, Math.floor(path.length / 240)) // velocidade proporcional
    const t = window.setInterval(() => {
      i = (i + step) % path.length
      setIdx(i)
    }, 80)

    return () => window.clearInterval(t)
  }, [enabled, path])

  const p = path[idx]
  if (!enabled || !p) return null

  return (
    <CircleMarker
      center={[p.lat, p.lng]}
      radius={6}
      pathOptions={{
        opacity: 0.9,
        fillOpacity: 1,
        weight: 2,
        color: '#ffffff',
        fillColor: '#0ea5e9',
      }}
    />
  )
}

export default function TripVisualMap({
  origin,
  destination,
  routeGeoJson,
  corridorGeoJson,
  altRouteGeoJson,
  freights = [],
  showCorridor = false,
  showFreightRadii = false,
  animateRoute = true,
}: Props) {
  const center = useMemo(() => [origin.lat, origin.lng] as [number, number], [origin])
  const [map, setMap] = useState<L.Map | null>(null)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracyM?: number } | null>(null)
  const [locating, setLocating] = useState(false)

  const startIcon = useMemo(() => makeLabelIcon('I', '#0f172a'), [])
  const endIcon = useMemo(() => makeLabelIcon('F', '#0f172a'), [])
  const pickupIcon = useMemo(() => makeLabelIcon('C', '#16a34a'), [])
  const dropoffIcon = useMemo(() => makeLabelIcon('E', '#dc2626'), [])

  const layersForBounds = useMemo(() => {
    const pts: any[] = [toPointGeo(origin), toPointGeo(destination)]
    for (const f of freights) {
      pts.push(toPointGeo(f.pickup), toPointGeo(f.dropoff))
    }
    return [routeGeoJson, altRouteGeoJson, showCorridor ? corridorGeoJson : null, ...pts].filter(Boolean)
  }, [origin, destination, freights, routeGeoJson, altRouteGeoJson, corridorGeoJson, showCorridor])

  // Fit automático sempre que rota/pontos mudarem
  useEffect(() => {
    if (!map) return
    const bounds = safeBoundsFromLayers(layersForBounds)
    if (bounds) map.fitBounds(bounds, { padding: [26, 26] })
  }, [map, layersForBounds])

  const onFit = useCallback(() => {
    if (!map) return
    const bounds = safeBoundsFromLayers(layersForBounds)
    if (bounds) map.fitBounds(bounds, { padding: [26, 26] })
  }, [map, layersForBounds])

  const onLocate = useCallback(() => {
    if (!map) return
    if (!navigator.geolocation) return

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const acc = pos.coords.accuracy
        setUserPos({ lat, lng, accuracyM: acc })
        map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.7 })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [map])

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white relative">
      {/* Overlay: controles + legenda */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <div className="rounded-xl bg-white/95 border border-slate-200 shadow-sm p-2 flex gap-2">
          <button
            className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50"
            type="button"
            onClick={onFit}
            title="Ajustar mapa para mostrar todos os pontos"
          >
            Ajustar
          </button>

          <button
            className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
            type="button"
            onClick={onLocate}
            disabled={locating}
            title="Centralizar na sua localização"
          >
            {locating ? 'Localizando…' : 'Minha localização'}
          </button>
        </div>

        <div className="rounded-xl bg-white/95 border border-slate-200 shadow-sm p-2 text-[11px] text-slate-700">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-[3px] rounded bg-[#2563eb]" />
            <span>Rota do match</span>
          </div>
          {altRouteGeoJson ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-3 h-[3px] rounded bg-[#64748b]" style={{ opacity: 0.8 }} />
              <span>Rota original (opcional)</span>
            </div>
          ) : null}
        </div>
      </div>

      <MapContainer center={center} zoom={6} style={{ height: 440 }} scrollWheelZoom>
        <MapBridge onMap={setMap} />

        {/* Tiles mais limpos que OSM default */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />

        {/* Corredor */}
        {showCorridor && corridorGeoJson ? (
          <GeoJSON
            data={corridorGeoJson}
            style={() => ({
              weight: 1,
              opacity: 0.55,
              fillOpacity: 0.08,
              color: '#0f172a',
            })}
          />
        ) : null}

        {/* rota secundária (original) */}
        {altRouteGeoJson ? (
          <GeoJSON
            data={altRouteGeoJson}
            style={() => ({
              weight: 4,
              opacity: 0.7,
              dashArray: '8 10',
              color: '#64748b',
            })}
          />
        ) : null}

        {/* rota principal com casing (contorno branco) */}
        {routeGeoJson ? (
          <>
            <GeoJSON
              data={routeGeoJson}
              style={() => ({
                weight: 10,
                opacity: 0.85,
                color: '#ffffff',
              })}
            />
            <GeoJSON
              data={routeGeoJson}
              style={() => ({
                weight: 6,
                opacity: 0.95,
                color: '#2563eb',
              })}
            />
            <RouteFlowDot routeGeoJson={routeGeoJson} enabled={animateRoute} />
          </>
        ) : null}

        {/* Pontos principais */}
        <Marker position={[origin.lat, origin.lng]} icon={startIcon} />
        <Marker position={[destination.lat, destination.lng]} icon={endIcon} />

        {/* Coleta/Entrega do match selecionado */}
        {freights.map((f) => (
          <div key={f.id}>
            <Marker position={[f.pickup.lat, f.pickup.lng]} icon={pickupIcon} />
            <Marker position={[f.dropoff.lat, f.dropoff.lng]} icon={dropoffIcon} />

            {showFreightRadii && f.pickupRadiusM ? (
              <Circle
                center={[f.pickup.lat, f.pickup.lng]}
                radius={f.pickupRadiusM}
                pathOptions={{ opacity: 0.25, fillOpacity: 0.06, color: '#16a34a' }}
              />
            ) : null}

            {showFreightRadii && f.dropoffRadiusM ? (
              <Circle
                center={[f.dropoff.lat, f.dropoff.lng]}
                radius={f.dropoffRadiusM}
                pathOptions={{ opacity: 0.25, fillOpacity: 0.06, color: '#dc2626' }}
              />
            ) : null}
          </div>
        ))}

        {/* Localização do usuário (se capturada) */}
        {userPos ? (
          <>
            <CircleMarker
              center={[userPos.lat, userPos.lng]}
              radius={7}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#0ea5e9', fillOpacity: 1 }}
            />
            {userPos.accuracyM ? (
              <Circle
                center={[userPos.lat, userPos.lng]}
                radius={userPos.accuracyM}
                pathOptions={{ color: '#0ea5e9', opacity: 0.25, fillOpacity: 0.08 }}
              />
            ) : null}
          </>
        ) : null}
      </MapContainer>
    </div>
  )
}
 