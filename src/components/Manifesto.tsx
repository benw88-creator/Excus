import { useRef } from 'react'
import SplitText from './SplitText'
import { gsap, useGSAP } from '../lib/gsap'
import { useEnvironment } from '../hooks/useEnvironment'

const LINE = 'Excus takes an idea, and brings it to life.'

/** Viewports of scroll the sticky stage holds for, covering a full fade-in,
 *  hold and fade-out. Below ~1 the hold gets too short to comfortably read
 *  the sentence before it moves on. */
const PER_LINE = 1.15

const FADE_IN = 0.4
const HOLD = 1.0
const FADE_OUT = 0.4

/**
 * Section 1. A single line, scrubbed in and out under one sticky stage.
 *
 * Held in place with CSS `position: sticky` rather than ScrollTrigger's `pin`.
 * Pinning injects a spacer element into the document, which shifts every
 * section below it — and ScrollTrigger measures trigger positions with those
 * spacers reverted, so with several pinned sections in a row the later ones
 * resolve to positions thousands of pixels too high and the sections render on
 * top of each other. Sticky keeps the real layout static, so every trigger
 * measures the position the element actually has.
 */
export default function Manifesto() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const { reducedMotion, mobile } = useEnvironment()
  const scrub = !reducedMotion && !mobile

  useGSAP(
    () => {
      if (!scrub) return

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
        },
      })

      tl.fromTo(
        '[data-line]',
        { opacity: 0, yPercent: 22, filter: 'blur(10px)' },
        { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: FADE_IN, ease: 'power2.out' },
        0,
      )

      tl.to('[data-line]', {
        opacity: 0,
        yPercent: -22,
        filter: 'blur(10px)',
        duration: FADE_OUT,
        ease: 'power2.in',
      }, FADE_IN + HOLD)

      // A slow drift across the section's whole scroll range. A sticky
      // section that goes completely static reads as the page having
      // stopped rather than as one continuous document. This keeps every
      // scrolled pixel visible.
      gsap.fromTo(
        '[data-drift]',
        { y: 36 },
        {
          y: -36,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          },
        },
      )

      // Dissolve the whole stage as the section runs out, so the next one
      // emerges through it instead of the sticky block cutting away.
      gsap.to(stage.current, {
        opacity: 0,
        filter: 'blur(8px)',
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'bottom 88%',
          end: 'bottom 30%',
          scrub: true,
        },
      })
    },
    { scope: root, dependencies: [scrub] },
  )

  if (!scrub) {
    return (
      <section className="relative w-full px-6 py-24 md:px-16">
        <SplitText
          as="p"
          by="words"
          onEnter
          stagger={0.045}
          className="max-w-3xl text-[7vw] font-medium leading-[1.08] tracking-[-0.03em] md:text-[4vw]"
        >
          {LINE}
        </SplitText>
      </section>
    )
  }

  return (
    <section
      ref={root}
      className="relative w-full"
      style={{ height: `${100 + PER_LINE * 100}svh` }}
    >
      <div ref={stage} className="sticky top-0 flex h-[100svh] w-full items-center px-6 md:px-16">
        <div
          data-drift
          className="mx-auto grid w-full max-w-5xl place-items-center will-change-transform"
        >
          <p
            data-line
            className="text-[5.5vw] font-medium leading-[1.06] tracking-[-0.03em] opacity-0 will-change-[transform,opacity]"
          >
            {LINE}
          </p>
        </div>
      </div>
    </section>
  )
}
