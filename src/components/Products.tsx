export default function Products() {
  return (
    <section id="products" className="border-t border-bone/10">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <h2 className="text-xl font-semibold tracking-tight text-bone sm:text-2xl">
          Products
        </h2>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
          <img
            src="/vinall-logo.png"
            alt="Vinall logo"
            width={512}
            height={512}
            className="h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-24"
          />
          <div>
            <h3 className="text-lg font-semibold text-bone">Vinall</h3>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-bone/70">
              A music ranking app. Rate the albums and songs you listen to, track
              how your opinion of them changes over time, and discover what to
              listen to next.
            </p>
            <a
              href="https://vinall.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-base text-amber underline underline-offset-4 transition-colors hover:text-amber-deep"
            >
              vinall.xyz
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
