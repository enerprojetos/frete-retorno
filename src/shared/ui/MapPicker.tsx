import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { useEffect, useMemo, useState } from 'react'

// Corrige ícones do Leaflet no Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type Props = {
  value: { lat: number; lng: number } | null
  onChange: (v: { lat: number; lng: number }) => void
  height?: number
}

function ClickToSet({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function MapPicker({ value, onChange, height = 320 }: Props) {
  const center = useMemo(() => {
    if (value) return value
    return { lat: -16.6869, lng: -49.2648 } // fallback: Goiânia
  }, [value])

  const [pos, setPos] = useState(center)

  useEffect(() => {
    setPos(center)
  }, [center])

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <MapContainer
        center={[pos.lat, pos.lng]}
        zoom={value ? 11 : 5}
        style={{ height }}
        scrollWheelZoom
      >
        <TileLayer
          // OpenStreetMap tiles
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <ClickToSet
          onPick={(lat, lng) => {
            setPos({ lat, lng })
            onChange({ lat, lng })
          }}
        />
        <Marker
          position={[pos.lat, pos.lng]}
          draggable
          eventHandlers={{
            dragend: (e: L.LeafletEvent) => {
              const m = e.target as L.Marker
              const ll = m.getLatLng()
              setPos({ lat: ll.lat, lng: ll.lng })
              onChange({ lat: ll.lat, lng: ll.lng })
            },
          }}
        />
      </MapContainer>
    </div>
  )
}
