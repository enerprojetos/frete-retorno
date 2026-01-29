import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/auth/useAuth'

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [freights, setFreights] = useState(0)
  const [trips, setTrips] = useState(0)

  useEffect(() => {
    ;(async () => {
      const a = await supabase.from('freight').select('id', { count: 'exact', head: true })
      const b = await supabase.from('trip').select('id', { count: 'exact', head: true })
      if (!a.error) setFreights(a.count ?? 0)
      if (!b.error) setTrips(b.count ?? 0)
    })()
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin</h1>
        <button className="rounded-xl border px-3 py-2" onClick={() => signOut()}>
          Sair
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow space-y-2">
        <p className="text-sm text-slate-500">Olá, {profile?.full_name}</p>
        <p className="text-lg font-semibold">Fretes (todos): {freights}</p>
        <p className="text-lg font-semibold">Viagens (todas): {trips}</p>
      </div>
    </div>
  )
}
