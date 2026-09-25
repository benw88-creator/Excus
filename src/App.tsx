import { useRef } from 'react'
import SmoothScroll from './components/SmoothScroll'
import Cursor from './components/Cursor'
import Grain from './components/Grain'
import Progress from './components/Progress'
import Hero from './components/Hero'
import Manifesto from './components/Manifesto'
import Ventures from './components/Ventures'
import ClosingCTA from './components/ClosingCTA'
import Hero3D from './webgl/Hero3D'
import { ScrollTrigger, useGSAP } from './lib/gsap'
import { scrollProgress } from './lib/progress'

export default function App() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      // One page-wide progress trigger feeding the shader uniform. A single
      // trigger rather than per-section ones keeps the per-frame WebGL read cheap.
      ScrollTrigger.create({
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          scrollProgress.value = self.progress
        },
      })

      // Fonts load after first paint and reflow every split line, which
      // invalidates the measured start/end of everything below them.
      document.fonts?.ready.then(() => ScrollTrigger.refresh())
    },
    { scope: root },
  )

  return (
    <SmoothScroll>
      <Cursor />
      <Grain />
      <Progress />

      {/* Fixed backdrop rather than a canvas inside the hero: the shader's
          uProgress uniform collapses and dims the field as the page advances,
          so the closing section inherits the same atmosphere at rest instead of
          cutting to a different background. One WebGL context for the whole
          page also means nothing remounts mid-scroll. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <Hero3D />
      </div>

      <div ref={root} className="relative z-10">
        <Hero />
        <Manifesto />
        <Ventures />
        <ClosingCTA />
      </div>
    </SmoothScroll>
  )
}
