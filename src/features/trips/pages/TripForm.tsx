import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { getDemoUser } from '@/demo/auth/demoAuth'
import PlaceAutocomplete from '@/shared/ui/PlaceAutocomplete'
import MapPicker from '@/shared/ui/MapPicker'

import { createTripViaFunction } from '../api/tripsService'

type PlaceValue = { label: string; lat: number; lng: number }

export default function TripForm() {
  const nav = useNavigate()
  const user = getDemoUser()

  const [origin, setOrigin] = useState<PlaceValue | null>(null)
  const [destination, setDestination] = useState<PlaceValue | null>(null)
  const [corridorKm, setCorridorKm] = useState(50)
  const [profile, setProfile] = useState<'driving-car' | 'driving-hgv'>('driving-hgv')

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const canSubmit = useMemo(() => Boolean(user && origin && destination), [user, origin, destination])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!user || !origin || !destination) return

    try {
      setLoading(true)
      const trip = await createTripViaFunction({
        driverId: user.id,
        origin,
        destination,
        corridorRadiusM: Math.round(corridorKm * 1000),
        profile,
      })
      nav(`/trips/${trip.id}/matches`)
    } catch (e2) {
      setErr(String((e2 as any)?.message ?? e2))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Criar viagem (Motorista)</h1>
          <p className="text-sm text-slate-600 mt-1">
            O sistema calcula a rota e procura fretes dentro do corredor ao redor da rota.
          </p>
        </div>
        <Link className="text-sm underline" to="/demo/login">
          Trocar perfil
        </Link>
      </div>

      {err ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {err}
          <div className="text-xs text-rose-700 mt-2">
            Se aparecer <b>404/401</b>, confira seu arquivo <code>.env</code> e reinicie o{' '}
            <code>npm run dev</code>.
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold">Origem</div>
            <div className="mt-3 grid gap-4">
              <PlaceAutocomplete
                label="Buscar local"
                placeholder="Ex.: Goiânia, GO"
                value={origin}
                onChange={setOrigin}
              />
              <div>
                <div className="text-sm font-medium mb-2">Ou clique no mapa</div>
                <MapPicker
                  value={origin ? { lat: origin.lat, lng: origin.lng } : null}
                  onChange={(v) =>
                    setOrigin((cur) => ({
                      label: cur?.label ?? 'Origem (mapa)',
                      lat: v.lat,
                      lng: v.lng,
                    }))
                  }
                />
                {origin ? (
                  <div className="mt-2 text-xs text-slate-600">
                    lat {origin.lat.toFixed(5)} • lng {origin.lng.toFixed(5)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold">Destino</div>
            <div className="mt-3 grid gap-4">
              <PlaceAutocomplete
                label="Buscar local"
                placeholder="Ex.: São Paulo, SP"
                value={destination}
                onChange={setDestination}
              />
              <div>
                <div className="text-sm font-medium mb-2">Ou clique no mapa</div>
                <MapPicker
                  value={destination ? { lat: destination.lat, lng: destination.lng } : null}
                  onChange={(v) =>
                    setDestination((cur) => ({
                      label: cur?.label ?? 'Destino (mapa)',
                      lat: v.lat,
                      lng: v.lng,
                    }))
                  }
                />
                {destination ? (
                  <div className="mt-2 text-xs text-slate-600">
                    lat {destination.lat.toFixed(5)} • lng {destination.lng.toFixed(5)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="font-semibold">Corredor da rota</div>
          <div className="mt-3 flex items-center gap-4">
            <input
              type="range"
              min={5}
              max={100}
              value={corridorKm}
              onChange={(e) => setCorridorKm(Number(e.target.value))}
              className="w-full"
            />
            <div className="min-w-[88px] text-right">
              <span className="font-semibold">{corridorKm}km</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Para demo: 25–50km costuma gerar matches legais.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="font-semibold">Perfil de rota</div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <button
              type="button"
              className={`rounded-xl px-3 py-2 border ${
                profile === 'driving-car'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setProfile('driving-car')}
            >
              driving-car
            </button>
            <button
              type="button"
              className={`rounded-xl px-3 py-2 border ${
                profile === 'driving-hgv'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setProfile('driving-hgv')}
            >
              driving-hgv (caminhão)
            </button>
          </div>
        </div>

        <button
          disabled={!canSubmit || loading}
          className="rounded-xl bg-slate-900 text-white px-4 py-3 disabled:opacity-50"
        >
          {loading ? 'Calculando rota...' : 'Criar viagem e buscar fretes'}
        </button>

        <div className="text-xs text-slate-500">
          Dica: se você não quiser criar fretes manualmente, use “Dados de demo (1 clique)”.
        </div>

        <div className="text-xs text-slate-500">
          <Link className="underline" to="/demo/seed">
            Abrir dados de demo
          </Link>
        </div>
      </form>
    </div>
  )
}
