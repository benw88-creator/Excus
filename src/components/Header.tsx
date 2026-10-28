export default function Header() {
  return (
    <header className="border-b border-bone/10">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5">
        <a href="#top" className="text-lg font-semibold tracking-tight text-bone">
          EXCUS
        </a>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#top" className="text-bone/70 transition-colors hover:text-bone">
            Home
          </a>
          <a href="#products" className="text-bone/70 transition-colors hover:text-bone">
            Products
          </a>
          <a href="/vinall/support" className="text-bone/70 transition-colors hover:text-bone">
            Support
          </a>
        </nav>
      </div>
    </header>
  )
}
