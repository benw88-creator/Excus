import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { useEnvironment } from '../hooks/useEnvironment'

const DETAILS: { label: string; value: string; href?: string }[] = [
  { label: 'Legal entity', value: 'EXCUS LTD' },
  { label: 'Company number', value: '17517058' },
  {
    label: 'Registered office',
    value: '71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ',
  },
  { label: 'Contact', value: 'hello@excus.co.uk', href: 'mailto:hello@excus.co.uk' },
]

/**
 * Section 3. The company, on the record.
 *
 * A plain one-shot reveal rather than the sticky/scrub stages above it — this
 * is reference material someone scans, not a beat in the narrative.
 */
export default function Company() {
  const root = useRef<HTMLElement>(null)
  const { reducedMotion } = useEnvironment()

  useGSAP(
    () => {
      if (reducedMotion) return

      gsap.fromTo(
        '[data-company-reveal]',
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: root.current, start: 'top 85%', once: true },
        },
      )
    },
    { scope: root, dependencies: [reducedMotion] },
  )

  return (
    <section id="company" ref={root} className="relative w-full scroll-mt-16 px-6 py-24 md:px-16">
      <span className="mb-16 block font-mono text-[10px] uppercase tracking-[0.3em] text-amber/70">
        03 — Company
      </span>

      <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-[1fr_1.5fr] md:items-start">
        <div data-company-reveal>
          <p className="max-w-sm text-lg leading-relaxed text-bone/70 md:text-xl">
            Excus is an independent UK technology company building its own software
            products.{' '}
            <a
              href="https://vinall.xyz"
              target="_blank"
              rel="noopener noreferrer"
              data-cursor
              className="text-bone underline decoration-bone/30 underline-offset-4 transition-colors hover:text-amber hover:decoration-amber"
            >
              Vinall
            </a>
            , a music ranking app, is live; Consumerland, a shopping platform, is built.
            Both are operated by EXCUS LTD.
          </p>
        </div>

        <dl
          data-company-reveal
          className="grid gap-y-6 border-t border-bone/15 pt-8 sm:grid-cols-2 sm:gap-x-10"
        >
          {DETAILS.map((d) => (
            <div key={d.label}>
              <dt className="font-mono text-[10px] uppercase tracking-[0.24em] text-bone/40">
                {d.label}
              </dt>
              <dd className="mt-2 text-sm text-bone/70">
                {d.href ? (
                  <a href={d.href} data-cursor className="transition-colors hover:text-amber">
                    {d.value}
                  </a>
                ) : (
                  d.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
