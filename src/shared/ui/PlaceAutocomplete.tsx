import { useEffect, useMemo, useRef, useState } from 'react'
import { compactPlaceLabel } from '@/shared/lib/placeLabel'

type NominatimAddress = {
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  state?: string
  state_code?: string
  [k: string]: string | undefined
}

type Place = {
  display_name: string
  lat: string
  lon: string
  address?: NominatimAddress
}

type Value = { label: string; lat: number; lng: number }

type Props = {
  label: string
  placeholder?: string
  value?: Value | null
  onChange: (val: Value | null) => void
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export default function PlaceAutocomplete({ label, placeholder, value, onChange }: Props) {
  // ✅ mostra sempre compacto no input (inclusive se vier label antigo do banco)
  const [q, setQ] = useState(compactPlaceLabel(value?.label ?? ''))
  const debouncedQ = useDebouncedValue(q, 350)

  const [items, setItems] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setQ(compactPlaceLabel(value?.label ?? ''))
  }, [value?.label])

  function formatFromNominatim(p: Place): string {
    const addr = p.address

    const city =
      addr?.city ??
      addr?.town ??
      addr?.village ??
      addr?.municipality ??
      addr?.county ??
      p.display_name.split(',')[0]?.trim()

    // UF via ISO BR-XX dentro do address
    let uf: string | null = null
    if (addr) {
      for (const v of Object.values(addr)) {
        const m = (v ?? '').match(/^BR-([A-Z]{2})$/)
        if (m?.[1]) {
          uf = m[1]
          break
        }
      }
      if (!uf && addr.state_code && addr.state_code.length === 2) uf = addr.state_code.toUpperCase()
      if (!uf && addr.state) uf = compactPlaceLabel(addr.state).split('/')[1]?.trim() ?? null
    }

    if (city && uf) return `${city} / ${uf}`

    // fallback: compacta display_name
    return compactPlaceLabel(p.display_name)
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    let alive = true
    const controller = new AbortController()

    async function run() {
      const text = debouncedQ.trim()
      setErrorMsg(null)

      if (text.length < 3) {
        setItems([])
        return
      }

      try {
        setLoading(true)

        const url =
          `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            format: 'jsonv2',
            q: text,
            limit: '6',
            addressdetails: '1', // ✅ mudança principal
            countrycodes: 'br',
          }).toString()

        const resp = await fetch(url, {
          signal: controller.signal,
          headers: {
            'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
          },
        })

        if (!resp.ok) {
          const raw = await resp.text().catch(() => '')
          const msg = `Erro no autocomplete (HTTP ${resp.status})`
          console.error('[PlaceAutocomplete] Nominatim error:', {
            status: resp.status,
            url,
            body: raw?.slice?.(0, 300),
          })
          if (!alive) return
          setItems([])
          setErrorMsg(
            resp.status === 429
              ? 'Muitas buscas em pouco tempo (limite do serviço). Tente novamente em alguns segundos.'
              : `${msg}. Veja o console (F12) para detalhes.`
          )
          return
        }

        const json = (await resp.json()) as Place[]
        if (!alive) return
        setItems(Array.isArray(json) ? json : [])
      } catch (e: any) {
        if (!alive) return
        if (e?.name === 'AbortError') return

        console.error('[PlaceAutocomplete] fetch failed:', e)
        setItems([])
        setErrorMsg('Falha ao buscar sugestões. Veja o console (F12) para detalhes.')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }

    run()
    return () => {
      alive = false
      controller.abort()
    }
  }, [debouncedQ])

  const hint = useMemo(() => {
    if (q.trim().length < 3) return 'Digite pelo menos 3 letras…'
    if (loading) return 'Buscando…'
    if (errorMsg) return errorMsg
    if (items.length === 0) return 'Nenhum resultado'
    return null
  }, [q, loading, items.length, errorMsg])

  function pick(p: Place) {
    const lat = Number(p.lat)
    const lng = Number(p.lon)
    const lbl = formatFromNominatim(p)

    onChange({ label: lbl, lat, lng })
    setQ(lbl)
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setQ('')
    setItems([])
    setErrorMsg(null)
  }

  return (
    <div className="grid gap-2" ref={boxRef}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-900">{label}</label>
        {value ? (
          <button type="button" className="text-xs text-slate-600 underline" onClick={clear}>
            limpar
          </button>
        ) : null}
      </div>

      <div className="relative">
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          placeholder={placeholder ?? 'Ex.: Goiânia, GO'}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />

        {open ? (
          <div className="absolute z-[2000] mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {hint ? (
              <div className="px-3 py-2 text-sm text-slate-600">{hint}</div>
            ) : (
              <div className="max-h-72 overflow-auto">
                {items.map((p, idx) => (
                  <button
                    type="button"
                    key={`${p.lat}-${p.lon}-${idx}`}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => pick(p)}
                  >
                    <div className="font-medium line-clamp-1">{formatFromNominatim(p)}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{p.display_name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      lat {Number(p.lat).toFixed(5)} • lng {Number(p.lon).toFixed(5)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
