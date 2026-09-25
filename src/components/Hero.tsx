import { useRef } from 'react'
import { motion } from 'framer-motion'
import { gsap, useGSAP } from '../lib/gsap'
import { useEnvironment } from '../hooks/useEnvironment'

const WORD = 'EXCUS'

/**
 * Section 1. The letters of EXCUS assemble from scattered fragments, then the
 * whole hero dissolves on scroll so section 2 emerges through it rather than
 * cutting.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const letters = useRef<(HTMLSpanElement | null)[]>([])
  const { reducedMotion } = useEnvironment()

  useGSAP(
    () => {
      if (reducedMotion) return
      const chars = letters.current.filter(Boolean) as HTMLSpanElement[]

      // Assembly: each letter arrives from its own random offset and rotation,
      // so it reads as fragments finding their place rather than a stagger.
      //
      // fromTo, not from: gsap.from takes the element's CURRENT value as its
      // destination, and React StrictMode runs this effect twice. The first
      // pass writes opacity:0 inline, so a second gsap.from would capture 0 as
      // the end value and animate 0 to 0, completing the timeline still
      // invisible. Stating both ends explicitly makes the effect
      // idempotent no matter how many times it runs.
      const tl = gsap.timeline({ delay: 0.25 })
      tl.fromTo(
        chars,
        {
          yPercent: () => gsap.utils.random(-140, 140),
          xPercent: () => gsap.utils.random(-90, 90),
          rotate: () => gsap.utils.random(-45, 45),
          scale: () => gsap.utils.random(0.4, 1.8),
          filter: 'blur(14px)',
          opacity: 0,
        },
        {
          yPercent: 0,
          xPercent: 0,
          rotate: 0,
          scale: 1,
          filter: 'blur(0px)',
          opacity: 1,
          duration: 1.6,
          ease: 'expo.out',
          stagger: { each: 0.07, from: 'random' },
        },
      )

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
    { scope: root, dependencies: [reducedMotion] },
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
            aria-label={WORD}
            className="flex select-none justify-center font-display text-[24vw] font-semibold leading-[0.78] tracking-[-0.045em] md:text-[19vw]"
          >
            {WORD.split('').map((char, i) => (
              <span
                key={i}
                aria-hidden
                ref={(el) => {
                  letters.current[i] = el
                }}
                className="inline-block will-change-transform"
              >
                {char}
              </span>
            ))}
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
