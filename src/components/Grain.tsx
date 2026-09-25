import { useEffect, useRef } from 'react'
import { useEnvironment } from '../hooks/useEnvironment'

/**
 * Filmic grain. Generated once into an offscreen canvas and tiled via CSS
 * rather than animated per-frame — a moving grain layer forces a full-screen
 * repaint every frame and is the single most expensive "subtle" effect there is.
 * The drift is a cheap transform on a 4x-oversized tile instead.
 */
export default function Grain() {
  const ref = useRef<HTMLDivElement>(null)
  const { reducedMotion } = useEnvironment()

  useEffect(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx || !ref.current) return

    const image = ctx.createImageData(size, size)
    for (let i = 0; i < image.data.length; i += 4) {
      const v = Math.random() * 255
      image.data[i] = v
      image.data[i + 1] = v
      image.data[i + 2] = v
      image.data[i + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
    ref.current.style.backgroundImage = `url(${canvas.toDataURL()})`
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90] opacity-[0.055] mix-blend-overlay"
      style={{
        backgroundRepeat: 'repeat',
        animation: reducedMotion ? undefined : 'grain-drift 8s steps(6) infinite',
      }}
    />
  )
}
