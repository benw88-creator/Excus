export default function Footer() {
  return (
    <footer className="border-t border-bone/10">
      <div className="mx-auto max-w-3xl px-6 py-10 text-sm leading-relaxed text-bone/70">
        <p className="text-bone">EXCUS LTD</p>
        <p className="mt-1">Company number 17517058</p>
        <p className="mt-1">
          71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ
        </p>
        <p className="mt-3">
          <a href="mailto:hello@excus.co.uk" className="underline hover:text-bone">
            hello@excus.co.uk
          </a>
        </p>

        <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <a href="/privacy" className="underline hover:text-bone">
            Privacy
          </a>
          <a href="/terms" className="underline hover:text-bone">
            Terms
          </a>
          <a href="/vinall/support" className="underline hover:text-bone">
            Vinall support
          </a>
        </p>

        <p className="mt-6 text-xs text-bone/60">© {new Date().getFullYear()} EXCUS LTD</p>
      </div>
    </footer>
  )
}
