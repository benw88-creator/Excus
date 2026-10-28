# Excus

The website for **EXCUS LTD**, a UK-registered technology company, at
excus.co.uk. Deliberately plain: a static-feeling one-page site plus two
static HTML pages, no animation library, no WebGL, no router.

## Run it

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
```

## Structure

| Path | Role |
| --- | --- |
| `index.html` | Page shell, meta tags, and a plain-HTML fallback inside `#root` for anything that doesn't run JavaScript |
| `src/App.tsx` | `Header` + `Home` + `Products` + `Footer`, nothing else |
| `src/components/Header.tsx` | Wordmark + three nav links: Home, Products, Support |
| `src/components/Home.tsx` | "EXCUS LTD" and one factual sentence |
| `src/components/Products.tsx` | Vinall: logo, description, link to vinall.xyz |
| `src/components/Footer.tsx` | Legal entity, company number, registered office, contact, Privacy/Terms/Support links |
| `src/components/ErrorBoundary.tsx` | Generic render-error catcher, wired once at the top of `main.tsx` |
| `src/components/StaticFallback.tsx` | What that boundary shows instead of a blank page — mirrors the homepage |
| `public/privacy.html`, `public/terms.html` | Excus's own legal pages, plain HTML |
| `public/vinall/support.html` | Vinall's support page — FAQ, contact, links to Vinall's own privacy/terms, account deletion. Public, no login, stable URL for the App Store Support URL field |
| `public/vinall-logo.png` | Vinall's actual app icon, copied from the Vinall project |

## Why it looks like this

This used to be a scroll-driven, WebGL-animated site (Three.js particle
field, GSAP scroll-jacking, a custom cursor, film grain). All of it was
removed deliberately, not trimmed:

- **A particle hero that spells out "EXCUS" is cosmetic risk on a page whose
  only job is to prove a real company is behind it.** A ~1MB chunk, a GPU
  context that can fail with no real GPU — exactly the kind of environment
  an automated review tool runs in — none of that risk is proportionate to
  a hero effect on a verification-critical company website.
- **Viewport-width type sizing (`text-[9vw]` and similar) reads differently
  on every monitor.** On an unusually wide or narrow screen, or at a zoom
  level nobody tested at, the same rule can render as either a few
  unreadable pixels or a headline the size of the screen. Every size here is
  a fixed, rem-based Tailwind class instead — constant at any viewport
  width, growing only through `sm:`/`md:` breakpoints.
- **Scroll-jacked, sticky, multi-second reveal animations are a liability
  when the one thing the page needs to do is communicate three facts
  clearly**: who the company is, what it makes, how to reach it. A visitor
  (or a reviewer) scrolling past a company's registered details mid-fade-in
  is a worse outcome than just showing the details.

What's left: plain semantic HTML, Tailwind for layout and spacing, no JS
library beyond React itself. `prefers-reduced-motion` only has to disable
one thing — the smooth anchor-scroll on the nav links — because there is
nothing else left that moves.

## Company details

Legal name, company number and registered office in the footer and on
`/vinall/support` are taken from the live Companies House record for
**EXCUS LTD (17517058)** and should be re-checked there before ever being
changed: https://find-and-update.company-information.service.gov.uk/company/17517058

## Email

The only public address is **hello@excus.co.uk**, used consistently as a
`mailto:` link in the footer and on the Vinall support page. It forwards via
Cloudflare Email Routing — that routing is configured outside this repo and
nothing here should reference where it forwards to.
