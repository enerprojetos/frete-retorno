import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { getDemoUser } from '@/demo/auth/demoAuth'
import PlaceAutocomplete from '@/shared/ui/PlaceAutocomplete'
import MapPicker from '@/shared/ui/MapPicker'

import { createFreight, type FreightRow } from '../api/freightsService'

type PlaceValue = { label: string; lat: number; lng: number }

export default function FreightForm() {
  const user = getDemoUser()

  const [pickup, setPickup] = useState<PlaceValue | null>(null)
  const [dropoff, setDropoff] = useState<PlaceValue | null>(null)
  const [pickupRadiusKm, setPickupRadiusKm] = useState(20)
  const [dropoffRadiusKm, setDropoffRadiusKm] = useState(20)
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<FreightRow | null>(null)

  const canSubmit = useMemo(() => {
    return Boolean(user && pickup && dropoff)
  }, [user, pickup, dropoff])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setSuccess(null)

    if (!user || !pickup || !dropoff) return

    try {
      setLoading(true)
      const row = await createFreight({
        shipperId: user.id,
        pickup: {
          label: pickup.label,
          lat: pickup.lat,
          lng: pickup.lng,
          radiusM: Math.round(pickupRadiusKm * 1000),
        },
        dropoff: {
          label: dropoff.label,
          lat: dropoff.lat,
          lng: dropoff.lng,
          radiusM: Math.round(dropoffRadiusKm * 1000),
        },
        notes: notes.trim() ? notes.trim() : null,
      })

      setSuccess(row)
      // Mantemos na mesma tela (melhor UX) e limpamos só observação.
      setNotes('')
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
          <h1 className="text-xl font-semibold">Cadastrar frete (Empresa)</h1>
          <p className="text-sm text-slate-600 mt-1">
            Para testar sem decorar coordenadas: digite o local (autocomplete) ou clique no mapa.
          </p>
        </div>
        <Link className="text-sm underline" to="/demo/login">
          Trocar perfil
        </Link>
      </div>

      {success ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="font-semibold text-emerald-900">Frete cadastrado ✅</div>
          <div className="text-sm text-emerald-900 mt-1">
            {success.pickup_label} → {success.dropoff_label}
          </div>
          <div className="text-sm text-emerald-900 mt-3 flex flex-wrap gap-2">
            <Link
              to="/freights/new"
              className="rounded-xl bg-white border border-emerald-200 px-3 py-2 hover:bg-emerald-100"
            >
              Cadastrar outro frete
            </Link>
            <Link
              to="/trips/new"
              className="rounded-xl bg-emerald-700 text-white px-3 py-2 hover:bg-emerald-800"
            >
              Trocar para Motorista e criar viagem
            </Link>
            <Link
              to="/demo/seed"
              className="rounded-xl bg-white border border-emerald-200 px-3 py-2 hover:bg-emerald-100"
            >
              Criar dados de demo (1 clique)
            </Link>
          </div>
          <div className="text-xs text-emerald-900/80 mt-2">
            Observação: se você estiver como <b>Empresa (SHIPPER)</b>, a página “Criar viagem” exige
            <b> Motorista</b> ou <b>Operador</b>.
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {err}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold">Origem (coleta)</div>
            <div className="mt-3 grid gap-4">
              <PlaceAutocomplete
                label="Buscar local"
                placeholder="Ex.: Goianira, GO"
                value={pickup}
                onChange={setPickup}
              />

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Raio de coleta</label>
                  <span className="text-sm font-semibold">{pickupRadiusKm}km</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={pickupRadiusKm}
                  onChange={(e) => setPickupRadiusKm(Number(e.target.value))}
                  className="mt-2 w-full"
                />
                <div className="text-xs text-slate-500 mt-1">
                  Dica: 10–30km costuma dar bons matches na demo.
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Ou clique no mapa</div>
                <MapPicker
                  value={pickup ? { lat: pickup.lat, lng: pickup.lng } : null}
                  onChange={(v) =>
                    setPickup((cur) => ({
                      label: cur?.label ?? 'Ponto de coleta (mapa)',
                      lat: v.lat,
                      lng: v.lng,
                    }))
                  }
                />
                {pickup ? (
                  <div className="mt-2 text-xs text-slate-600">
                    lat {pickup.lat.toFixed(5)} • lng {pickup.lng.toFixed(5)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold">Destino (entrega)</div>
            <div className="mt-3 grid gap-4">
              <PlaceAutocomplete
                label="Buscar local"
                placeholder="Ex.: São Paulo, SP"
                value={dropoff}
                onChange={setDropoff}
              />

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Raio de entrega</label>
                  <span className="text-sm font-semibold">{dropoffRadiusKm}km</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={dropoffRadiusKm}
                  onChange={(e) => setDropoffRadiusKm(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Ou clique no mapa</div>
                <MapPicker
                  value={dropoff ? { lat: dropoff.lat, lng: dropoff.lng } : null}
                  onChange={(v) =>
                    setDropoff((cur) => ({
                      label: cur?.label ?? 'Ponto de entrega (mapa)',
                      lat: v.lat,
                      lng: v.lng,
                    }))
                  }
                />
                {dropoff ? (
                  <div className="mt-2 text-xs text-slate-600">
                    lat {dropoff.lat.toFixed(5)} • lng {dropoff.lng.toFixed(5)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="font-semibold">Observações</div>
          <textarea
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 min-h-[96px] outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="ex.: retroescavadeira, precisa prancha, janela de coleta..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          disabled={!canSubmit || loading}
          className="rounded-xl bg-slate-900 text-white px-4 py-3 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Cadastrar frete'}
        </button>

        <div className="text-xs text-slate-500">
          Se o autocomplete não retornar nada, clique no mapa para escolher o ponto.
        </div>
      </form>
    </div>
  )
}
