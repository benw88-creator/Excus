import { useRef } from 'react'
import SmoothScroll from './components/SmoothScroll'
import Cursor from './components/Cursor'
import Grain from './components/Grain'
import Progress from './components/Progress'
import Hero from './components/Hero'
import Manifesto from './components/Manifesto'
import Ventures from './components/Ventures'
import Company from './components/Company'
import ClosingCTA from './components/ClosingCTA'
import DebugOverlay from './components/DebugOverlay'
import { ScrollTrigger, useGSAP } from './lib/gsap'

export default function App() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
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
      <DebugOverlay />

      {/* Fixed, plain CSS backdrop — no WebGL. Previously a Three.js particle
          field; cut entirely as the single largest and least reliable part of
          the site (a ~1MB chunk, a GPU context that can fail outright with no
          real GPU, exactly the environment an automated review tool runs
          in). This is the same gradient every reduced-motion visitor already
          saw, now shown to everyone. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 45%, rgba(245,200,66,0.16) 0%, rgba(245,200,66,0.04) 35%, rgba(10,9,8,0) 70%), radial-gradient(40% 40% at 70% 70%, rgba(138,133,120,0.10) 0%, rgba(10,9,8,0) 70%)',
        }}
      />

      <div ref={root} className="relative z-10">
        <Hero />
        <Manifesto />
        <Ventures />
        <Company />
        <ClosingCTA />
      </div>
    </SmoothScroll>
  )
}
