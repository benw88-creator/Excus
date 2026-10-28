import { useRef } from 'react'
import { motion } from 'framer-motion'
import { gsap, useGSAP } from '../lib/gsap'

const WORD = 'EXCUS'

/**
 * Section 1. Plain static heading over a CSS gradient — no WebGL. There used
 * to be a particle field spelling the word out and dispersing on scroll, cut
 * entirely: it was the single largest and least reliable part of the site
 * (a ~1MB Three.js chunk, a GPU context that can fail outright in a headless
 * or sandboxed environment with no real GPU — exactly where an automated
 * review tool runs), for a cosmetic effect nobody asked to keep. The heading
 * is real DOM text now, always, for every visitor and every crawler.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null)

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
          <a href="#company" data-cursor className="transition-colors hover:text-bone">
            EXCUS LTD
          </a>
          <span className="hidden md:inline">Est. MMXXVI</span>
        </motion.div>

        <div className="flex flex-col items-center">
          <h1 className="select-none text-center font-display text-[24vw] font-semibold leading-[0.78] tracking-[-0.045em] md:text-[19vw]">
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
            EXCUS LTD builds and operates its own software products.
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
