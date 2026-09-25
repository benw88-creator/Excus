import { useEffect, useState } from 'react'
import { particleDebug } from '../webgl/debugState'

/**
 * Plain-text readout of ParticleField's live computed numbers, visible only
 * with ?debug=1 in the URL. Exists so a device we have no devtools access to
 * (a real phone, reached only through screenshots) can still tell us what
 * it's actually computing, instead of guessing from what renders.
 */
export default function DebugOverlay() {
  const [enabled, setEnabled] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).get('debug') === '1')
  }, [])

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setTick((t) => t + 1), 300)
    return () => window.clearInterval(id)
  }, [enabled])

  if (!enabled) return null

  const rows = Object.entries(particleDebug)

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] max-h-[60vh] overflow-auto bg-black/85 p-3 font-mono text-[10px] leading-relaxed text-lime-300"
    >
      {rows.map(([key, value]) => (
        <div key={key}>
          {key}: {typeof value === 'number' ? Math.round(value * 1000) / 1000 : String(value)}
        </div>
      ))}
    </div>
  )
}
