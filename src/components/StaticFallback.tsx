/**
 * Last-resort content for the top-level ErrorBoundary in main.tsx — if
 * anything in the app throws during render, this is what's shown instead of
 * a blank page. Deliberately plain: no GSAP, no scroll choreography, nothing
 * that could itself be the thing that's broken.
 *
 * Mirrors the no-JS fallback baked into index.html's #root by hand (same
 * facts, different markup since that one can't depend on Tailwind having
 * loaded correctly either). Keep both in sync.
 */
export default function StaticFallback() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 font-display text-bone/85">
      <h1 className="mb-4 text-3xl font-semibold tracking-[-0.02em]">EXCUS LTD</h1>
      <p className="mb-8 leading-relaxed text-bone/65">
        An independent UK technology company building its own software products.{' '}
        <a href="https://vinall.xyz" className="text-bone underline">
          Vinall
        </a>
        , a music ranking app, is live.
      </p>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-bone/40">Company number</dt>
          <dd>17517058</dd>
        </div>
        <div>
          <dt className="text-bone/40">Registered office</dt>
          <dd>71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ</dd>
        </div>
        <div>
          <dt className="text-bone/40">Contact</dt>
          <dd>
            <a href="mailto:hello@excus.co.uk" className="underline">
              hello@excus.co.uk
            </a>
          </dd>
        </div>
      </dl>
      <p className="mt-10 text-xs text-bone/40">
        <a href="/privacy" className="underline">
          Privacy
        </a>{' '}
        &middot;{' '}
        <a href="/terms" className="underline">
          Terms
        </a>
      </p>
    </main>
  )
}
