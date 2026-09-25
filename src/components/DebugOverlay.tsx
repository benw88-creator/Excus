import { useEffect, useRef, useState } from 'react'
import { particleDebug } from '../webgl/debugState'

/**
 * Plain-text readout of live page state, visible only with ?debug=1 in the
 * URL. Exists so a device we have no devtools access to (a real phone,
 * reached only through screenshots) can still tell us what it's actually
 * doing, instead of guessing from what renders.
 */
export default function DebugOverlay() {
  const [enabled, setEnabled] = useState(false)
  const [, setTick] = useState(0)
  const counts = useRef({ scroll: 0, touchstart: 0, touchmove: 0, touchend: 0, wheel: 0 })

  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).get('debug') === '1')
  }, [])

  useEffect(() => {
    if (!enabled) return
    const bump = (key: keyof typeof counts.current) => () => {
      counts.current[key]++
    }
    const onScroll = bump('scroll')
    const onTouchstart = bump('touchstart')
    const onTouchmove = bump('touchmove')
    const onTouchend = bump('touchend')
    const onWheel = bump('wheel')
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('touchstart', onTouchstart, { passive: true })
    window.addEventListener('touchmove', onTouchmove, { passive: true })
    window.addEventListener('touchend', onTouchend, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('touchstart', onTouchstart)
      window.removeEventListener('touchmove', onTouchmove)
      window.removeEventListener('touchend', onTouchend)
      window.removeEventListener('wheel', onWheel)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setTick((t) => t + 1), 300)
    return () => window.clearInterval(id)
  }, [enabled])

  if (!enabled) return null

  const scrollRows: [string, unknown][] = [
    ['scrollY', window.scrollY],
    ['docScrollHeight', document.documentElement.scrollHeight],
    ['maxScrollY', document.documentElement.scrollHeight - window.innerHeight],
    ['htmlClassList', document.documentElement.className || '(none)'],
    ['bodyOverflow', getComputedStyle(document.body).overflow],
    ['htmlOverflow', getComputedStyle(document.documentElement).overflow],
    [
      'lenis',
      (() => {
        const l = (
          window as unknown as {
            lenis?: { scroll: number; isStopped: boolean; isScrolling: boolean | string; velocity: number }
          }
        ).lenis
        return l
          ? `scroll=${l.scroll.toFixed(0)} stopped=${l.isStopped} scrolling=${l.isScrolling} vel=${l.velocity.toFixed(2)}`
          : 'no lenis instance (reducedMotion?)'
      })(),
    ],
    ['evt:scroll', counts.current.scroll],
    ['evt:touchstart', counts.current.touchstart],
    ['evt:touchmove', counts.current.touchmove],
    ['evt:touchend', counts.current.touchend],
    ['evt:wheel', counts.current.wheel],
  ]

  const rows = [...scrollRows, ...Object.entries(particleDebug)]

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] max-h-[70vh] overflow-auto bg-black/85 p-3 font-mono text-[10px] leading-relaxed text-lime-300"
    >
      {rows.map(([key, value]) => (
        <div key={key}>
          {key}: {typeof value === 'number' ? Math.round(value * 1000) / 1000 : String(value)}
        </div>
      ))}
    </div>
  )
}
