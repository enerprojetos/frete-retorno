import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  images: string[]
  intervalMs?: number
  minHeightClassName?: string
  children?: React.ReactNode
  showControls?: boolean
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export default function HeroCarousel({
  images,
  intervalMs = 6500,
  minHeightClassName = 'min-h-[700px]',
  children,
  showControls = true,
}: Props) {
  const safeImages = useMemo(() => images.filter(Boolean), [images])
  const [idx, setIdx] = useState(0)
  const timer = useRef<number | null>(null)

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  }, [])

  // Pré-carrega imagens
  useEffect(() => {
    if (typeof window === 'undefined') return
    safeImages.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [safeImages])

  useEffect(() => {
    if (safeImages.length <= 1) return
    if (reducedMotion) return

    if (timer.current) window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      setIdx((v) => (v + 1) % safeImages.length)
    }, intervalMs)

    return () => {
      if (timer.current) window.clearInterval(timer.current)
      timer.current = null
    }
  }, [intervalMs, reducedMotion, safeImages.length])

  function prev() {
    setIdx((v) => (v - 1 + safeImages.length) % safeImages.length)
  }

  function next() {
    setIdx((v) => (v + 1) % safeImages.length)
  }

  return (
    <div className={cx('relative w-full overflow-hidden flex items-center justify-center', minHeightClassName)}>
      {/* Slides */}
      <div className="absolute inset-0">
        {safeImages.map((src, i) => (
          <div
            key={src + i}
            className={cx(
              'absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700',
              i === idx ? 'opacity-100' : 'opacity-0',
            )}
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.60) 100%), url("' + src + '")',
            }}
          />
        ))}
      </div>

      {/* Conteúdo */}
      <div className="relative z-10">{children}</div>

      {/* Controles */}
      {showControls && safeImages.length > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/80 border border-border-dark hover:bg-white transition"
            aria-label="Imagem anterior"
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>

          <button
            type="button"
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/80 border border-border-dark hover:bg-white transition"
            aria-label="Próxima imagem"
          >
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {safeImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={cx(
                  'h-2.5 w-2.5 rounded-full border border-border-dark transition',
                  i === idx ? 'bg-text-main' : 'bg-white/70',
                )}
                aria-label={`Ir para imagem ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
