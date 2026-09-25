import { useRef } from 'react'
import { motion } from 'framer-motion'
import { gsap, useGSAP } from '../lib/gsap'
import { useEnvironment } from '../hooks/useEnvironment'

const WORD = 'EXCUS'

/**
 * Section 1. The word "EXCUS" is no longer DOM type sitting on the particle
 * backdrop — it's spelled out by a subset of the nebula's own particles (see
 * ParticleField), which gather into the word on load and disperse back into
 * the cloud on scroll. The heading below exists only for the reduced-motion
 * path (no WebGL canvas is mounted there at all — see Hero3D) and for
 * assistive tech/SEO the rest of the time, so the word is never actually
 * missing from the page, just invisible where the particles are drawing it
 * instead.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const { reducedMotion } = useEnvironment()

  useGSAP(
    () => {
      // Dissolve on scroll — scrubbed, so the user controls the exit.
      gsap.to('[data-hero-content]', {
        yPercent: -18,
        opacity: 0,
        filter: 'blur(10px)',
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative h-[100svh] w-full overflow-hidden">
      <div
        data-hero-content
        className="relative z-10 flex h-full flex-col justify-between px-6 py-8 will-change-transform md:px-12 md:py-12"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 1 }}
          className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.28em] text-bone/45"
        >
          <span>Independent technology company</span>
          <span className="hidden md:inline">Est. MMXXVI</span>
        </motion.div>

        <div className="flex flex-col items-center">
          <h1
            className={
              reducedMotion
                ? 'select-none text-center font-display text-[24vw] font-semibold leading-[0.78] tracking-[-0.045em] md:text-[19vw]'
                : 'sr-only'
            }
          >
            {WORD}
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.35, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-6"
        >
          <p className="max-w-xl text-center text-sm leading-relaxed text-bone/55 md:text-base">
            Where innovation meets the new age of technology.
          </p>
          <div className="flex flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-bone/35">
            <span>Scroll</span>
            <span className="block h-10 w-px bg-gradient-to-b from-bone/40 to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
