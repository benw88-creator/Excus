import { useEffect, useRef, useState } from 'react'
import { useEnvironment } from '../hooks/useEnvironment'

const GLYPHS = ['█', '▓', '▒', '░']

/**
 * A redacted block string that occasionally stutters — one or two
 * characters flicker to a different block glyph for a beat, as if the
 * signal underneath hasn't fully resolved. Purely cosmetic, so it's inert
 * under reduced motion rather than finding a static substitute.
 */
export default function RedactedGlitch({ text }: { text: string }) {
  const { reducedMotion } = useEnvironment()
  const [display, setDisplay] = useState(text)
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (reducedMotion) return

    let cancelled = false

    const scheduleFlicker = () => {
      const delay = 2200 + Math.random() * 2600
      const id = window.setTimeout(() => {
        if (cancelled) return
        const chars = text.split('')
        const flickerCount = 1 + Math.floor(Math.random() * 2)
        for (let i = 0; i < flickerCount; i++) {
          const idx = Math.floor(Math.random() * chars.length)
          chars[idx] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        }
        setDisplay(chars.join(''))

        const revertId = window.setTimeout(() => {
          if (!cancelled) setDisplay(text)
        }, 120 + Math.random() * 140)
        timers.current.push(revertId)

        scheduleFlicker()
      }, delay)
      timers.current.push(id)
    }

    scheduleFlicker()
    return () => {
      cancelled = true
      timers.current.forEach(window.clearTimeout)
      timers.current = []
    }
  }, [text, reducedMotion])

  return <span aria-label="Unannounced venture">{display}</span>
}
