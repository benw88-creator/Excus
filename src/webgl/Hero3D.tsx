import { Suspense, lazy } from 'react'
import { useEnvironment } from '../hooks/useEnvironment'

// three.js, R3F and drei are ~1MB of the bundle. Loading them lazily keeps them
// out of the initial payload, and off the wire entirely for anyone on reduced
// motion, who never renders a canvas.
const Scene = lazy(() => import('./Scene'))

/**
 * Static stand-in used for reduced motion and as the Suspense fallback, so the
 * backdrop never flashes empty black while the WebGL chunk loads.
 */
export function GradientFallback() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(60% 50% at 50% 45%, rgba(245,200,66,0.16) 0%, rgba(245,200,66,0.04) 35%, rgba(10,9,8,0) 70%), radial-gradient(40% 40% at 70% 70%, rgba(138,133,120,0.10) 0%, rgba(10,9,8,0) 70%)',
      }}
    />
  )
}

export default function Hero3D() {
  const { reducedMotion, mobile } = useEnvironment()

  // No WebGL at all under reduced motion — a drifting particle field is the
  // exact thing the setting exists to switch off.
  if (reducedMotion) return <GradientFallback />

  return (
    <Suspense fallback={<GradientFallback />}>
      <Scene mobile={mobile} />
    </Suspense>
  )
}
