import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { useEnvironment } from '../hooks/useEnvironment'
import RedactedGlitch from './RedactedGlitch'

type Venture = {
  id: string
  name: string
  domain: string
  status: string
  /** Live ventures with a public destination link out to it. */
  url?: string
  /** Unnamed bets are rendered as redacted blocks rather than invented names. */
  redacted?: boolean
}

// Unannounced bets (redacted placeholders) are held back from the public
// page until there is something to name — see RedactedGlitch, still wired
// below for whenever one is ready to show. Consumerland is held back the
// same way for now — not redacted, just not listed — and goes back in by
// uncommenting the line below.
const VENTURES: Venture[] = [
  { id: 'v1', name: 'Vinall', domain: 'Music ranking', status: 'Live', url: 'https://vinall.xyz' },
  // { id: 'v2', name: 'Consumerland', domain: 'Shopping without the cost', status: 'Built' },
]

const ROW_H = 108
/** Scroll budget per row (svh), on top of a flat base for the header/settle
 *  time. Keeps pacing consistent as ventures are added rather than a fixed
 *  total that gets more cramped every time a row is added. */
const BASE_SVH = 150
const PER_ROW_SVH = 33

/**
 * Section 2. The ledger of what the company is building.
 *
 * Rows are absolutely positioned and animated with transform and opacity only —
 * animating `top` would force a layout pass on every scroll frame. Held with
 * `position: sticky` for the same reason as the Manifesto: no pin spacer, so
 * nothing below it shifts.
 */
export default function Ventures() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const { reducedMotion, mobile } = useEnvironment()
  const scrub = !reducedMotion && !mobile

  useGSAP(
    () => {
      if (reducedMotion) return

      if (!scrub) {
        // Mobile gets no scroll-jacking (see useEnvironment), but that
        // shouldn't mean the ledger just appears fully-formed the instant it
        // scrolls into the DOM — a plain one-shot reveal per row, triggered
        // as each one enters view, is what the desktop's scrubbed version
        // reduces to without a pinned stage to scrub against.
        gsap.fromTo(
          '[data-ventures-intro]',
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: '[data-ventures-intro]', start: 'top 88%', once: true },
          },
        )

        VENTURES.forEach((v) => {
          gsap.fromTo(
            `[data-venture="${v.id}"]`,
            { opacity: 0, y: 28 },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: 'power3.out',
              scrollTrigger: { trigger: `[data-venture="${v.id}"]`, start: 'top 90%', once: true },
            },
          )
        })

        return
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
        },
      })

      VENTURES.forEach((v, i) => {
        tl.fromTo(
          `[data-venture="${v.id}"]`,
          { opacity: 0, yPercent: 40, filter: 'blur(6px)' },
          { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out' },
          i * 0.55,
        )
        // The rule under each row draws itself as the row settles.
        tl.fromTo(
          `[data-rule="${v.id}"]`,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.8, ease: 'power3.inOut' },
          i * 0.55,
        )
      })

      // Same drift as the Manifesto: never let a sticky section sit fully still.
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
    { scope: root, dependencies: [scrub, mobile, reducedMotion] },
  )

  const body = (
    <div data-drift className="mx-auto w-full max-w-6xl will-change-transform">
      <div className="grid gap-10 md:grid-cols-[1fr_1.5fr] md:items-end">
        <div data-ventures-intro>
          <p className="max-w-sm text-lg leading-relaxed text-bone/70 md:text-xl">
            Excus builds and operates its own products.
          </p>
        </div>

        <div className="relative w-full" style={{ height: VENTURES.length * ROW_H }}>
          {VENTURES.map((v, i) => (
            <div
              key={v.id}
              data-venture={v.id}
              className="absolute inset-x-0 will-change-[transform,opacity]"
              style={{ top: i * ROW_H, height: ROW_H }}
            >
              <div
                data-rule={v.id}
                className="h-px w-full origin-left bg-bone/15 will-change-transform"
              />
              <div className="flex items-baseline justify-between gap-6 pt-6">
                <div className="min-w-0">
                  {v.url ? (
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-cursor
                      className="group inline-flex items-baseline gap-2 truncate text-3xl font-medium tracking-[-0.02em] transition-colors hover:text-amber md:text-4xl"
                    >
                      <span className="truncate">{v.name}</span>
                      <span className="text-base text-bone/30 transition-colors group-hover:text-amber md:text-lg">
                        ↗
                      </span>
                    </a>
                  ) : (
                    <p
                      className={`truncate text-3xl font-medium tracking-[-0.02em] md:text-4xl ${
                        v.redacted ? 'text-bone/25' : ''
                      }`}
                    >
                      {v.redacted ? <RedactedGlitch text={v.name} /> : v.name}
                    </p>
                  )}
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.24em] text-bone/40">
                    {v.domain}
                  </p>
                </div>
                <span
                  className={`shrink-0 border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.24em] ${
                    v.status === 'Live'
                      ? 'live-pulse border-amber/50 text-amber'
                      : v.status === 'Built'
                        ? 'border-bone/40 text-bone/70'
                        : 'border-bone/15 text-bone/35'
                  }`}
                >
                  {v.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (!scrub) {
    return (
      <section className="relative w-full px-6 py-24 md:px-16">
        <span className="mb-16 block font-mono text-[10px] uppercase tracking-[0.3em] text-amber/70">
          02 — Ventures
        </span>
        {body}
      </section>
    )
  }

  return (
    <section
      ref={root}
      className="relative w-full"
      style={{ height: `${BASE_SVH + VENTURES.length * PER_ROW_SVH}svh` }}
    >
      <div ref={stage} className="sticky top-0 flex h-[100svh] w-full items-center px-6 md:px-16">
        <span className="absolute left-6 top-16 font-mono text-[10px] uppercase tracking-[0.3em] text-amber/70 md:left-16">
          02 — Ventures
        </span>
        {body}
      </div>
    </section>
  )
}
