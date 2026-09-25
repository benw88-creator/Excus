import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { useEnvironment } from '../hooks/useEnvironment'

/**
 * Two-part cursor: a hard dot that tracks the pointer exactly, and a soft ring
 * that lags behind it. Both are moved with gsap.quickTo — a pre-compiled
 * setter that skips tween allocation, so pointermove stays allocation-free.
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const { finePointer, reducedMotion } = useEnvironment()
  const enabled = finePointer && !reducedMotion

  useEffect(() => {
    if (!enabled) return
    document.body.classList.add('has-custom-cursor')
    return () => document.body.classList.remove('has-custom-cursor')
  }, [enabled])

  useEffect(() => {
    if (!enabled || !dot.current || !ring.current) return

    const dotX = gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power3' })
    const dotY = gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power3' })
    const ringX = gsap.quickTo(ring.current, 'x', { duration: 0.55, ease: 'power3' })
    const ringY = gsap.quickTo(ring.current, 'y', { duration: 0.55, ease: 'power3' })

    const move = (e: PointerEvent) => {
      dotX(e.clientX)
      dotY(e.clientY)
      ringX(e.clientX)
      ringY(e.clientY)
    }

    // Grow the ring over anything the user can act on.
    const over = (e: PointerEvent) => {
      const interactive = (e.target as HTMLElement)?.closest?.('a, button, [data-cursor]')
      gsap.to(ring.current, {
        scale: interactive ? 1.9 : 1,
        borderColor: interactive ? 'rgb(245 200 66 / 0.9)' : 'rgb(240 237 232 / 0.35)',
        duration: 0.35,
        ease: 'power3.out',
      })
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      <div
        ref={ring}
        className="absolute -left-5 -top-5 h-10 w-10 rounded-full border border-bone/35 will-change-transform"
      />
      <div
        ref={dot}
        className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-amber will-change-transform"
      />
    </div>
  )
}
