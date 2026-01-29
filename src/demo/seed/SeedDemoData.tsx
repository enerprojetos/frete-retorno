import { useState } from 'react'
import { getDemoUser } from '@/demo/auth/demoAuth'
import { createFreight, listFreights } from '@/features/freights/api/freightsService'

type SeedPoint = { label: string; lat: number; lng: number }

const GOIANIA: SeedPoint = { label: 'Goiânia, GO', lat: -16.6869, lng: -49.2648 }
const GOIANIRA: SeedPoint = { label: 'Goianira, GO', lat: -16.4942, lng: -49.4267 }
const ANAPOLIS: SeedPoint = { label: 'Anápolis, GO', lat: -16.3286, lng: -48.9534 }

const SAO_PAULO: SeedPoint = { label: 'São Paulo, SP', lat: -23.5505, lng: -46.6333 }
const CAMPINAS: SeedPoint = { label: 'Campinas, SP', lat: -22.9056, lng: -47.0608 }
const UBERLANDIA: SeedPoint = { label: 'Uberlândia, MG', lat: -18.9146, lng: -48.2754 }

export default function SeedDemoData() {
  const user = getDemoUser()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function seed() {
    if (!user) return
    setMsg(null)
    setLoading(true)

    try {
      const existing = await listFreights(500)
      if (existing.length >= 3) {
        setMsg(`Já existem ${existing.length} fretes. (Não criei mais para evitar bagunça)`)
        return
      }

      const seeds = [
        {
          pickup: GOIANIRA,
          dropoff: SAO_PAULO,
          notes: 'Retroescavadeira • janela flexível • frete de retorno',
        },
        {
          pickup: ANAPOLIS,
          dropoff: CAMPINAS,
          notes: 'Plataforma elevatória • precisa prancha',
        },
        {
          pickup: GOIANIA,
          dropoff: UBERLANDIA,
          notes: 'Gerador industrial • carga paletizada',
        },
      ]

      for (const s of seeds) {
        await createFreight({
          shipperId: user.id,
          pickup: { ...s.pickup, radiusM: 0 },
          dropoff: { ...s.dropoff, radiusM: 0 },
          notes: s.notes,
        })
      }

      setMsg('✅ Dados de demo criados! Agora vá em “Criar viagem” e teste.')
    } catch (e) {
      setMsg('Erro ao criar seed: ' + String((e as any)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Dados de Demo (1 clique)</h1>
      <p className="text-sm text-slate-600 mt-1">
        Cria alguns fretes típicos para você testar o match sem precisar pensar em coordenadas.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <button
          disabled={loading}
          onClick={seed}
          className="rounded-xl bg-slate-900 text-white px-4 py-3 disabled:opacity-50"
        >
          {loading ? 'Criando…' : 'Criar fretes de demo'}
        </button>

        {msg ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            {msg}
          </div>
        ) : null}

        <div className="mt-4 text-xs text-slate-500">
          Dica: depois crie uma viagem Goiânia → São Paulo com corredor 25–50km.
        </div>
      </div>
    </div>
  )
}
