/**
 * Last-resort content for the top-level ErrorBoundary in main.tsx — if
 * anything in the app throws during render, this is what's shown instead of
 * a blank page. Mirrors the real homepage content by hand; keep both in
 * sync.
 */
export default function StaticFallback() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-bone/85">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight">EXCUS LTD</h1>
      <p className="mb-8 leading-relaxed text-bone/70">
        EXCUS LTD is a UK-registered technology company. We build and operate our
        own software products, including{' '}
        <a href="https://vinall.xyz" className="text-bone underline">
          Vinall
        </a>
        , a music ranking app.
      </p>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-bone/40">Registered in</dt>
          <dd>England and Wales, company number 17517058</dd>
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
      <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-bone/40">
        <a href="/privacy" className="underline">
          Privacy
        </a>
        <a href="/terms" className="underline">
          Terms
        </a>
        <a href="/vinall/support" className="underline">
          Vinall support
        </a>
      </p>
    </main>
  )
}
