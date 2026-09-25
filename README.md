# Excus

Single-page, scroll-driven site for **Excus**, an independent technology
company. Vinall — a music ranking app — is one of its ventures, listed in
section 02 rather than being the subject of the site.
*Where innovation meets the new age of technology.*

## Run it

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
```

### QA overrides

Automated and headless browsers report `prefers-reduced-motion: reduce`, which
makes the animated path impossible to verify without an override:

| URL | Path |
| --- | --- |
| `/` | whatever the OS reports |
| `/?motion=force` | full choreography, ignores the OS setting |
| `/?motion=reduce` | static fallback, ignores the OS setting |

## Structure

| File | Role |
| --- | --- |
| `App.tsx` | Composition, fixed WebGL backdrop, page-wide progress trigger |
| `components/SmoothScroll.tsx` | Lenis, bridged to the GSAP ticker |
| `components/Hero.tsx` | EXCUS assembles from scattered fragments |
| `components/Manifesto.tsx` | 01 — one sentence at a time, scrubbed, no overlap between lines |
| `components/Ventures.tsx` | 02 — the ledger of what the company is building |
| `components/ClosingCTA.tsx` | 03 — CTA over the continuing shader field |
| `components/Progress.tsx` | Hairline scroll rule, left edge |
| `components/SplitText.tsx` | SplitType wrapper, per-char / per-word reveal |
| `components/Cursor.tsx` | Two-part cursor, `gsap.quickTo` |
| `components/Grain.tsx` | Filmic grain, generated once and tiled |
| `webgl/Hero3D.tsx` | Chooses canvas vs static gradient |
| `webgl/Scene.tsx` | R3F canvas — the lazy-loaded three.js boundary |
| `webgl/ParticleField.tsx` | 26k-point nebula: scroll position, parallax, cursor repulsion |
| `webgl/particles.glsl.ts` | Vertex and fragment shaders |
| `hooks/useEnvironment.ts` | reduced motion / mobile / pointer, read synchronously |
| `hooks/usePointer.ts` | Window-level pointer tracking for the WebGL layer — see below for why |
| `lib/progress.ts` | Page scroll progress read by the shader each frame |

There used to be a fourth section, `FeatureStrip.tsx` ("03 — Method"), a
horizontal scroll-jack strip. It has been removed entirely — not hidden, not
commented out — along with its render in `App.tsx`; `ClosingCTA` was
renumbered from 04 to 03 to close the gap.

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

**The particle field's cursor repulsion tracks the pointer itself, not
R3F's `state.pointer`.** R3F only updates its pointer state for events that
actually reach the canvas DOM element, decided by ordinary browser
hit-testing. This canvas is a full-viewport fixed backdrop sitting *behind*
the real page content, and every section's own box — even ones with mostly
empty background — covers the full width of the page in the document flow.
That means the canvas loses hit-testing at literally every pixel any section
occupies, and `state.pointer` sat frozen at its initial value; confirmed live
by dispatching synthetic pointer events and watching it never move.
`usePointer.ts` is a small module-level singleton with its own `window`-level
`pointermove` listener, read by `ParticleField` every frame regardless of
what the browser thinks should receive the event. The existing screen-space
parallax (`uPointer`) was quietly broken the same way and is fixed by the
same change.

**Cursor repulsion is CPU-raycast, GPU-displaced.** Once per frame,
`ParticleField` raycasts the tracked NDC pointer onto the particle cloud's
centre (z=0) plane — cheap, a single CPU-side ray/plane intersection — and
hands the resulting world point to the shader as `uMouseWorld`. Every
particle's distance-based push (`smoothstep` falloff, squared for a sharper
centre, direction includes z so particles behind the cursor get shoved back
too) happens in the vertex shader, in parallel, for free; nothing per-particle
runs on the CPU. `uMouseWorld` is itself smoothed frame to frame (a lerp, not
raw), which is what keeps the dispersal reading as a field being pushed
through rather than snapping to follow a jittery cursor — there is no
separate per-particle velocity/spring state, the smoothing lives entirely in
the driver. A `uMousePresence` scalar fades the whole effect in on
`pointermove` and out on the pointer leaving the window (`document`
`mouseleave` / `window` `blur`), so arrival and departure read as deliberate
rather than a hard cut.

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

**The particle field's directional drift is driven by scroll POSITION
(`uProgress`), not scroll velocity.** It used to be velocity-driven — Lenis's
own `velocity`, later replaced with a clean delta computed from
`lenis.animatedScroll` to kill an oscillation that metric had under the
buffered-input scheme above (a real sawtooth, confirmed by logging it
alongside a synthetic wheel test). That removed the oscillation but not the
underlying design problem: velocity decays to zero the instant scrolling
stops, by definition, so the field would visibly ease back toward its resting
position on every pause — reported as "particles move backwards and forwards
rather than linear motion." `uProgress` is a pure function of scroll
*position* (already computed for the end-of-page collapse below), so driving
the drift from it instead is inherently linear and reversible: it only
changes when the actual scroll position changes, in whichever direction,
and holds exactly still the instant you stop, at whatever position you
stopped at. Verified live: scrolled to a position, held for 6 seconds with
zero drift in the sampled uniform; scrolled to the top and it returned to
~0; scrolled back to the original position and it returned to the same
value it held the first time (within noise). The velocity pipeline this
replaced (`useScrollVelocity.ts`, the `uVelocity` uniform) had no other
consumer once this changed, so it was deleted rather than left half-dead.

**The nebula look is mostly the fragment shader's falloff and colour, not the
particle count.** Three changes, in order of how much they actually matter:
a gaussian alpha falloff (`exp(-d²·9)`) replaced a smoothstep circle — a
smoothstep circle still reads as a dot no matter how large it gets, because it
has a real edge; a gaussian has none, so once points are large enough to
overlap they blend into continuous cloud instead of staying legible as
separate discs. Point size and the size-variance range both went up
(`uSize` 2.1→3.4, clamp 26→34, JS-side scale distribution biased toward small
with occasional large via `random·random`) so there's enough overlap for that
blending to actually happen. And colour is patchy rather than speckled: a
third colour (`uColorEmber`, a warm rust) blends in via `smoothstep` over a
*low-frequency* noise sample (`uNoiseScale`, shared by neighbouring
particles) rather than the old per-particle random threshold, so it reads as
soft drifting clouds of colour the way a real emission nebula varies
gradually, not per-particle static. `noise()` outputs roughly -1..1 but isn't
evenly spread across that range, so the noise is remapped to 0..1 before
thresholding — thresholding the raw -1..1 output directly made "ember"
territory too rare to read as anything but a stray fleck. A handful of
particles keep a sharp amber `sparkle` on top (`step(0.94, vSeed)`) so the
cloud doesn't read as a flat wash. Base alpha dropped accordingly
(`vDepth` mix 0.18–0.85 → 0.09–0.5) — with points this large and this softly
edged, density has to come from additive overlap building brightness where
the cloud is thick, not from any single point being opaque, or it blows out.
`patch` is a reserved GLSL word (tessellation-related) — do not name a local
variable that if you're editing this shader; it fails to compile with
"illegal use of reserved word" and no other hint.

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

- `prefers-reduced-motion: reduce` → no WebGL (the three.js chunk is never
  fetched), no splitting, no sticky sections, no custom cursor. Every section
  renders as ordinary stacked content with all copy intact.
- Mobile / coarse pointer → no scroll-jacking, native touch momentum, particle
  count dropped from 26k to 7k and DPR capped at 1.5.
- The hero's `<h1>` carries `aria-label="EXCUS"` with the per-letter spans
  hidden, so it is announced as one word.

## Bundle

| Chunk | gzip |
| --- | --- |
| Initial JS | 168 KB |
| `Scene` (three.js, R3F, drei) | 244 KB, lazy |
| CSS | 5 KB |

## Type and colour

Archivo (variable) for display, JetBrains Mono for eyebrow labels. Base
`#0a0908`, accent `#f5c842`, text `#f0ede8` at 92% — taken from Vinall's
existing palette.
