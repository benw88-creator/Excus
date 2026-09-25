import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap'
import { useEnvironment } from '../hooks/useEnvironment'

/**
 * A hairline progress rule down the left edge.
 *
 * Its real job is continuity: the sticky sections deliberately hold position
 * while their content resolves, and with nothing else moving the page reads as
 * a series of separate chapters rather than one continuous document. A bar that
 * advances with every pixel of scroll gives the eye constant evidence of
 * progress even while the section behind it is holding.
 */
export default function Progress() {
  const bar = useRef<HTMLDivElement>(null)
  const { reducedMotion } = useEnvironment()

  useGSAP(
    () => {
      if (reducedMotion || !bar.current) return

      gsap.fromTo(
        bar.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: document.documentElement,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.3,
          },
        },
      )
      ScrollTrigger.refresh()
    },
    { dependencies: [reducedMotion] },
  )

  if (reducedMotion) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[80] hidden h-full w-px bg-bone/8 md:block"
    >
      <div ref={bar} className="h-full w-full origin-top bg-amber/60 will-change-transform" />
    </div>
  )
}
