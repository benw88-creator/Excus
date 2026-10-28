# Excus

Single-page, scroll-driven site for **EXCUS LTD**, an independent UK
technology company. Vinall — a music ranking app — is one of its products,
listed in section 02 rather than being the subject of the site.

## Run it

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
```

### QA overrides

Automated and headless browsers report `prefers-reduced-motion: reduce`,
which makes the scrubbed/sticky path impossible to verify without an
override:

| URL | Path |
| --- | --- |
| `/` | whatever the OS reports |
| `/?motion=force` | full choreography, ignores the OS setting |
| `/?motion=reduce` | static fallback, ignores the OS setting |

## Structure

| File | Role |
| --- | --- |
| `App.tsx` | Composition, fixed CSS gradient backdrop |
| `components/SmoothScroll.tsx` | Lenis, bridged to the GSAP ticker |
| `components/Hero.tsx` | Static "EXCUS" heading over the gradient |
| `components/Manifesto.tsx` | 01 — one sentence at a time, scrubbed, no overlap between lines |
| `components/Ventures.tsx` | 02 — the ledger of what the company is building |
| `components/Company.tsx` | 03 — legal entity, registered office, contact |
| `components/ClosingCTA.tsx` | 04 — CTA, footer |
| `components/Progress.tsx` | Hairline scroll rule, left edge |
| `components/SplitText.tsx` | SplitType wrapper, per-char / per-word reveal |
| `components/Cursor.tsx` | Two-part cursor, `gsap.quickTo` |
| `components/Grain.tsx` | Filmic grain, generated once and tiled |
| `components/ErrorBoundary.tsx` | Generic render-error catcher, used once at the top of `main.tsx` |
| `components/StaticFallback.tsx` | What that boundary shows instead of a blank page |
| `hooks/useEnvironment.ts` | reduced motion / mobile / pointer, read synchronously |

There used to be a fourth section, `FeatureStrip.tsx` ("03 — Method"), a
horizontal scroll-jack strip. It has been removed entirely — not hidden, not
commented out — along with its render in `App.tsx`; `ClosingCTA` was
renumbered from 04 to 03 to close the gap, then back to 04 once `Company`
took slot 03.

**There used to be a WebGL particle field here too — a ~1MB Three.js/R3F
scene spelling "EXCUS" out of 26,000 points and dispersing them on scroll.
Removed entirely, deliberately, not parked.** It was the single largest and
least reliable thing on the site: a GPU context that can fail outright with
no real GPU (exactly the kind of headless/sandboxed environment an automated
review tool runs in), a lazy chunk that could fail to fetch, and — found
during an Apple Developer Program organisation-verification pass — a site
whose core content depended on a mobile-specific quality tier (fewer
particles, smaller canvas) that was never actually verified against a real
phone, only ever tuned against whatever debug numbers a previous real-device
session happened to produce. None of that risk is proportionate to a
cosmetic hero effect on a company's own verification-critical website. The
heading is now plain DOM text, unconditionally, for every visitor and every
crawler.

## Decisions worth knowing before you edit

**Lenis drives ScrollTrigger, not the other way round.** `SmoothScroll` adds
Lenis's `raf` to `gsap.ticker` and calls `ScrollTrigger.update()` on every Lenis
scroll, with `lagSmoothing(0)`. Remove that bridge and every scrubbed timeline
lags the content by a frame or more.

**Sections are held with CSS `position: sticky`, not ScrollTrigger's `pin`.**
Pinning injects a spacer into the document, which shifts everything below it —
and ScrollTrigger measures trigger positions with those spacers reverted, so
with several pinned sections in sequence the later ones resolve thousands of
pixels too high and render on top of each other. `refreshPriority` does not fix
it. Sticky keeps the real layout static and every trigger measures true.

**Never use `gsap.from` in a component.** It reads the element's *current* value
as its destination, and React StrictMode runs effects twice — the first pass
writes the start values inline, so the second captures them as the end values
and animates 0 to 0. Everything here is `fromTo` with both ends stated.

**`useEnvironment` reads its media queries synchronously in the state
initialiser.** An effect-set `ready` flag flips on first commit, which changes
every `useGSAP` dependency array and makes GSAP revert and rebuild each context
mid-flight.

**`gsap.from` is unsafe for anything reactive, and so is any implicit-overlap
crossfade.** Two related traps surfaced in this codebase:

`gsap.from` reads the element's *current* value as its destination, and React
StrictMode runs effects twice — the first pass writes the start values
inline, so the second captures them as the end values and animates 0 to 0.
Everything here is `fromTo` with both ends stated.

The Manifesto's crossfade had a second, subtler version of the same class of
bug: line *i*'s fade-out and line *i*+1's fade-in were scheduled in the exact
same timeline window, so for a real stretch of scroll both sentences were
partially visible at once, directly overlapping since they share the same
on-screen position. `Manifesto.tsx` now gives every line an explicit
fade-in/hold/fade-out/gap segment (`SEGMENT` in the file), with the gap being
a real beat where a line is fully faded out before the next one starts
fading in — verified by sampling computed opacity across 140+ scroll
positions at three different viewport sizes with never more than one line
above 4% opacity at once.

**Scroll feel.** Three things had to be right here.

Lenis takes `lerp`, not `duration`/`easing` — a duration-based config starts a
fresh eased tween on every wheel event, so a normal scroll reads as a series of
hops.

`respectReducedMotion` must be passed as `false`. It defaults to true, which
makes Lenis silently fall back to native scroll whenever the OS reports reduce,
with no warning anywhere. This component already refuses to construct Lenis at
all in that case, so its own check is redundant — but left on, anyone with
reduced motion enabled in the OS who uses `?motion=force` gets every animation
and no smoothing, which looks exactly like the smoothing is broken.

Finally, wheel input is buffered rather than handed straight to Lenis. A plain
lerp has its highest velocity on the very first frame, so that frame moves
`lerp x delta` — about 6px for one notch at a responsive lerp, which is the bit
that reads as a lurch. First-frame distance and settle time are inverses under
exponential smoothing, so lowering the lerp to fix it just trades a hop for lag:
measured, a 1.6px first frame costs a 1086ms settle. Releasing the input through
its own exponential (`INTAKE`) puts two first-order filters in series, which is
a second-order response — it starts at zero velocity, accelerates, then settles.

Measured impulse response for one wheel notch, and continuity under sustained
input:

| | First frame | Settle to 90% | Stalled frames | Frame-to-frame variation |
| --- | --- | --- | --- | --- |
| Native (Lenis disabled) | 40px | 100ms | 27.4% | 141% |
| Plain lerp 0.13 | 5.6px | 291ms | 0.3% | 26% |
| Intake 0.055 + lerp 0.16 | **0px** | 407ms | **0–0.3%** | **9–11%** |

Only wheel is intercepted; touch still goes through Lenis untouched so native
momentum is preserved. Because returning `false` from `virtualScroll` also
skips Lenis's own `preventDefault`, this component calls it directly — which
means `data-lenis-prevent` is bypassed for wheel. There are no nested scrollers
here; add one and that has to be handled in the hook.

The sticky sections each carry a slow scrubbed drift, and a hairline progress
rule runs down the left edge, so a section that is holding never reads as the
page having stopped.

**Scroll speed is `WHEEL_SPEED` in `SmoothScroll.tsx`, not Lenis's
`wheelMultiplier`.** That config option never runs for wheel input: returning
`false` from `virtualScroll` makes Lenis's own `onVirtualScroll` bail out
before it reaches its `wheelMultiplier` handling, since this component
intercepts and buffers the event itself (see the intake explanation above).
`WHEEL_SPEED` multiplies the raw delta before it enters that buffer instead.
Because the intake/lerp scheme is a linear system, scaling the input scales
every frame's output by the same constant and leaves the shape and timing of
the response — the part that makes it feel smooth rather than chunky —
unchanged; only the distance per notch changes. Confirmed with a controlled
same-session A/B (not a comparison against numbers from an earlier session,
which turned out to vary run to run by wheel-event/`rAF` phase alignment
alone): stall percentage and frame-to-frame variation at `WHEEL_SPEED = 1`
and `= 1.85` were statistically indistinguishable, and a direct distance
measurement (fixed synthetic wheel input, `scrollY` reached) confirmed the
multiplier applies at very close to its configured value. `touchMultiplier`
went up by the same rough proportion for consistency, though it was already
live before this change — only the wheel path was silently bypassing its
config.

**Performance.** Animated properties are transform/opacity/filter only; rows are
absolutely positioned and translated rather than reordered; grain is generated
once into a data URI and drifts by transform rather than repainting. Measured
across a full-page scroll: median 6.1 ms/frame, 2 frames over 20 ms; under 4x
CPU throttling, median 6.2 ms and p95 19.2 ms.

**The cursor-hiding rule needs `!important`, and reduced motion must not carry
its own copy of it.** `Cursor.tsx` adds `.has-custom-cursor` to `<body>` only
when it mounts a custom cursor, and the CSS rule that turns the system arrow
off is scoped to that class. A second rule used to exist, turning the arrow
*back on* under `@media (prefers-reduced-motion: reduce)` — redundant on its
own (`Cursor.tsx` already refuses to add the class when reduced motion is on)
but actively wrong the moment those two conditions could disagree, e.g. the
`?motion=force` QA override with the OS still set to reduced motion: the class
was present, and the two same-specificity rules fought on cascade order alone,
with the reduced-motion one landing later and winning — system arrow visible,
silently, with nothing else on the page showing anything was wrong. Confirmed
via computed style (`cursor: auto` where `none` was expected) before the fix,
`cursor: none` after. Removed the redundant rule and added `!important` to the
real one, so it wins regardless of any later-declared, equal-specificity
`cursor` utility a future component might add.

## Accessibility and fallbacks

- `prefers-reduced-motion: reduce` → no splitting, no sticky/scrubbed
  sections, no custom cursor. Every section renders as ordinary stacked
  content with all copy intact, same as everyone else.
- Mobile / coarse pointer → no scroll-jacking, native touch momentum.
- No JavaScript at all → index.html's `#root` carries real static content
  (company name, what it does, legal details, contact), replaced instantly
  once React mounts. See `index.html` and `StaticFallback.tsx`.
- Anything that throws during render → caught by the top-level
  `ErrorBoundary` in `main.tsx`, which shows `StaticFallback` instead of a
  blank page.

## Bundle

| Chunk | gzip |
| --- | --- |
| Initial JS | 168 KB |
| CSS | 5 KB |

There is exactly one JS chunk now — no WebGL, nothing lazy-loaded.

## Type and colour

Archivo (variable) for display, JetBrains Mono for eyebrow labels. Base
`#0a0908`, accent `#f5c842`, text `#f0ede8` at 92% — taken from Vinall's
existing palette.
