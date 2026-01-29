import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type Place = { label: string; lat: number; lng: number }
type LatLng = { lat: number; lng: number }

function makeLabelIcon(text: string, bg: string) {
  const html = `
    <div style="
      width:28px;height:28px;border-radius:9999px;
      background:${bg}; color:white;
      display:flex;align-items:center;justify-content:center;
      font-weight:800; font-size:13px;
      border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.25);
    ">${text}</div>
  `
  return L.divIcon({
    html,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  })
}

function toPointGeo(p: LatLng) {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  }
}

function FitBounds({ layers }: { layers: any[] }) {
  const map = useMap()

  useEffect(() => {
    const bounds = new L.LatLngBounds([])
    for (const g of layers) {
      if (!g) continue
      try {
        const b = L.geoJSON(g).getBounds()
        if (b.isValid()) bounds.extend(b)
      } catch {}
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] })
  }, [map, layers])

  return null
}

function ClickToSet({
//  active,
  onSet,
}: {
  active: 'origin' | 'destination'
  onSet: (pos: LatLng) => void
}) {
  useMapEvents({
    click(e) {
      onSet({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export default function RoutePickerMap(props: {
  origin: Place | null
  destination: Place | null
  onChangeOrigin: (p: Place | null) => void
  onChangeDestination: (p: Place | null) => void
  routeGeoJson?: any | null
  height?: number
}) {
  const { origin, destination, onChangeOrigin, onChangeDestination, routeGeoJson, height = 420 } = props

  const [active, setActive] = useState<'origin' | 'destination'>(() => (origin ? 'destination' : 'origin'))

  useEffect(() => {
    if (!origin) setActive('origin')
    else if (!destination) setActive('destination')
  }, [origin, destination])

  const originIcon = useMemo(() => makeLabelIcon('A', '#0f172a'), [])
  const destIcon = useMemo(() => makeLabelIcon('B', '#0f172a'), [])

  const layersForBounds = useMemo(() => {
    const pts: any[] = []
    if (origin) pts.push(toPointGeo({ lat: origin.lat, lng: origin.lng }))
    if (destination) pts.push(toPointGeo({ lat: destination.lat, lng: destination.lng }))
    return [routeGeoJson, ...pts].filter(Boolean)
  }, [routeGeoJson, origin, destination])

  const center = useMemo(() => {
    if (origin) return [origin.lat, origin.lng] as [number, number]
    if (destination) return [destination.lat, destination.lng] as [number, number]
    return [-16.6869, -49.2648] as [number, number] // Goiânia fallback
  }, [origin, destination])

  function setByClick(pos: LatLng) {
    if (active === 'origin') {
      onChangeOrigin({ label: origin?.label ?? 'Ponto selecionado no mapa', lat: pos.lat, lng: pos.lng })
      return
    }
    onChangeDestination({ label: destination?.label ?? 'Ponto selecionado no mapa', lat: pos.lat, lng: pos.lng })
  }

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-2 p-3 border-b bg-slate-50">
        <div className="text-xs text-slate-600">
          Clique no mapa para marcar: <b>{active === 'origin' ? 'Origem (A)' : 'Destino (B)'}</b>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-xl border px-3 py-1.5 text-xs ${active === 'origin' ? 'bg-slate-900 text-white' : 'bg-white'}`}
            onClick={() => setActive('origin')}
          >
            Marcar origem
          </button>
          <button
            type="button"
            className={`rounded-xl border px-3 py-1.5 text-xs ${active === 'destination' ? 'bg-slate-900 text-white' : 'bg-white'}`}
            onClick={() => setActive('destination')}
          >
            Marcar destino
          </button>
        </div>
      </div>

      <MapContainer center={center} zoom={6} style={{ height }} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <FitBounds layers={layersForBounds} />

        <ClickToSet active={active} onSet={setByClick} />

        {routeGeoJson ? (
          <GeoJSON
            data={routeGeoJson}
            style={() => ({
              weight: 5,
              opacity: 0.9,
            })}
          />
        ) : null}

        {origin ? (
          <Marker
            position={[origin.lat, origin.lng]}
            icon={originIcon}
            draggable
            eventHandlers={{
              dragend(e) {
                const ll = (e.target as any).getLatLng()
                onChangeOrigin({ label: origin.label ?? 'Origem', lat: ll.lat, lng: ll.lng })
              },
            }}
          />
        ) : null}

        {destination ? (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={destIcon}
            draggable
            eventHandlers={{
              dragend(e) {
                const ll = (e.target as any).getLatLng()
                onChangeDestination({ label: destination.label ?? 'Destino', lat: ll.lat, lng: ll.lng })
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  )
}
