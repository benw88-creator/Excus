import { useRef } from 'react'
import SplitText from './SplitText'
import { gsap, useGSAP } from '../lib/gsap'
import { useEnvironment } from '../hooks/useEnvironment'

const LINES = [
  'Excus takes an idea, and brings it to life.',
  'We sweat the details other people skip.',
  "If it's not good, and it's not easy — it's not done.",
]

/** Viewports of scroll per line, covering a full fade-in, hold, fade-out and
 *  gap (the constants just below). Below ~1 the hold gets too short to
 *  comfortably read a full sentence before it moves on. */
const PER_LINE = 1.15

/**
 * Timeline units (arbitrary — GSAP maps whatever total this produces onto the
 * section's full scroll range, see PER_LINE above for the part that actually
 * controls pacing). Proportions only: fade-in is brief, the hold is most of
 * the segment, fade-out mirrors the fade-in, and the gap is a genuine beat of
 * nothing between lines.
 *
 * That gap is the fix for the overlap bug this section used to have: the
 * previous timeline had each line's fade-OUT running in the exact same window
 * as the next line's fade-IN, so for a real stretch of scroll both sentences
 * were partially visible at once, overlapping directly since they share the
 * same on-screen position — unreadable, and worse the longer either sentence
 * was. Here line i's fade-out finishes and holds at opacity 0 for GAP units
 * before line i+1's fade-in begins, so there is no scroll position, on any
 * viewport, where two lines are ever simultaneously above zero opacity.
 */
const FADE_IN = 0.4
const HOLD = 1.0
const FADE_OUT = 0.4
const GAP = 0.15
const SEGMENT = FADE_IN + HOLD + FADE_OUT + GAP

/**
 * Section 1. One sentence at a time under a single scrubbed timeline, so the
 * user scrubs the copy rather than triggering it. Each line fades in, holds,
 * fades out, and only then does the next one begin — see the GAP constant
 * above for why that separation exists.
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

      const lines = gsap.utils.toArray<HTMLElement>('[data-line]')

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
        },
      })

      lines.forEach((line, i) => {
        const start = i * SEGMENT

        tl.fromTo(
          line,
          { opacity: 0, yPercent: 22, filter: 'blur(10px)' },
          { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: FADE_IN, ease: 'power2.out' },
          start,
        )

        // The line then simply holds at opacity 1 — no tween needed, nothing
        // else touches this property until the fade-out below.

        if (i < lines.length - 1) {
          tl.to(
            line,
            { opacity: 0, yPercent: -22, filter: 'blur(10px)', duration: FADE_OUT, ease: 'power2.in' },
            start + FADE_IN + HOLD,
          )
        }
      })

      // A slow drift across the section's whole scroll range. The cross-fades
      // leave moments where nothing is moving, and a sticky section that goes
      // completely static reads as the page having stopped rather than as one
      // continuous document. This keeps every scrolled pixel visible.
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
        <span className="mb-16 block font-mono text-[10px] uppercase tracking-[0.3em] text-amber/70">
          01 — Manifesto
        </span>
        <div className="flex flex-col gap-24">
          {LINES.map((line) => (
            <SplitText
              key={line}
              as="p"
              by="words"
              onEnter
              stagger={0.045}
              className="max-w-3xl text-[7vw] font-medium leading-[1.08] tracking-[-0.03em] md:text-[4vw]"
            >
              {line}
            </SplitText>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section
      ref={root}
      className="relative w-full"
      style={{ height: `${100 + LINES.length * PER_LINE * 100}svh` }}
    >
      <div ref={stage} className="sticky top-0 flex h-[100svh] w-full items-center px-6 md:px-16">
        <span className="absolute left-6 top-16 font-mono text-[10px] uppercase tracking-[0.3em] text-amber/70 md:left-16">
          01 — Manifesto
        </span>

        {/* Grid stacking rather than absolute + -translate-y-1/2: GSAP writes
            the `transform` property wholesale, so a Tailwind translate class on
            an animated element is silently discarded and the copy sits off
            centre. Stacking every line in one grid cell needs no transform. */}
        <div
          data-drift
          className="mx-auto grid w-full max-w-5xl place-items-center will-change-transform"
        >
          {LINES.map((line) => (
            <p
              key={line}
              data-line
              className="[grid-area:1/1] text-[5.5vw] font-medium leading-[1.06] tracking-[-0.03em] opacity-0 will-change-[transform,opacity]"
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
