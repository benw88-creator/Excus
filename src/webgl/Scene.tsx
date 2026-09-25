import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Preload } from '@react-three/drei'
import ParticleField from './ParticleField'

/**
 * Everything that touches three.js lives behind this module so it can be code
 * split as one chunk. Under reduced motion the chunk is never requested at all.
 */
export default function Scene({ mobile }: { mobile: boolean }) {
  return (
    <Canvas
      // Cap DPR: the fragment shader is fill-rate bound, and a 3x retina phone
      // renders ~9x the pixels for no visible gain.
      dpr={[1, mobile ? 1.5 : 2]}
      camera={{ position: [0, 0, 11], fov: 48 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Suspense fallback={null}>
        <ParticleField count={mobile ? 7000 : 26000} />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
