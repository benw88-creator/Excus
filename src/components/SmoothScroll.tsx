import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { useEnvironment } from '../hooks/useEnvironment'

/**
 * How much of the outstanding wheel input is released into Lenis's target each
 * frame. This is the first of two filters — see INTAKE_NOTE below.
 */
const INTAKE = 0.055
/** How hard Lenis then chases that target. The second filter. */
const LERP = 0.16
const LERP_MOBILE = 0.18
/**
 * Multiplies raw wheel delta before it enters the intake buffer above, so the
 * same physical scrolling covers more of the page per second — this is the
 * actual lever for "time to reach the bottom", not `wheelMultiplier` in the
 * Lenis config below, which never runs: returning `false` from `virtualScroll`
 * makes Lenis's own `onVirtualScroll` bail out before it reaches its
 * `wheelMultiplier` handling, since we're intercepting the event ourselves
 * (see INTAKE_NOTE). Because INTAKE and LERP form a linear system, scaling the
 * input here scales every frame's output by the same constant and leaves the
 * shape and timing of the response — the part that makes it feel smooth
 * rather than chunky — completely unchanged; only the distance per notch
 * changes. Confirmed live after tuning this: settle time and per-frame
 * variation were unchanged from the pre-scaling measurements in README.md.
 */
const WHEEL_SPEED = 1.85

/**
 * Replaces native scroll with Lenis and — critically — drives it from GSAP's
 * ticker so smooth scroll and ScrollTrigger share one clock.
 *
 * Without the ticker bridge, ScrollTrigger samples the native scroll position
 * while Lenis is still interpolating toward it, so every pinned section and
 * every `scrub: true` timeline lags behind the content by a frame or more.
 *
 * INTAKE_NOTE — why the wheel input is buffered rather than handed straight to
 * Lenis:
 *
 * Exponential smoothing (a plain lerp) has its highest velocity on the very
 * first frame and decays from there, so the distance moved in that first frame
 * is `lerp x delta` — about 6px for one wheel notch at a responsive lerp. That
 * initial lurch is the part that reads as a hop. Lowering the lerp shrinks it,
 * but first-frame distance and settle time are inverses under exponential
 * smoothing: getting the first frame under a pixel needs a lerp so low the page
 * takes nearly two seconds to come to rest, which just trades a hop for lag.
 *
 * Feeding the input through its own exponential release puts two first-order
 * filters in series, which is a second-order response: it starts at zero
 * velocity, accelerates, then settles. The first frame becomes sub-pixel
 * without the long tail, because the two time constants add rather than one
 * having to absorb the whole job.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const { reducedMotion, mobile } = useEnvironment()

  useEffect(() => {
    // Reduced motion: leave native scroll completely alone.
    if (reducedMotion) return

    /** Wheel distance accepted but not yet handed to Lenis. */
    let pending = 0

    const lenis = new Lenis({
      lerp: mobile ? LERP_MOBILE : LERP,
      wheelMultiplier: 1,
      smoothWheel: true,
      // Native momentum beats interpolated touch scroll on iOS — dragging a
      // smoothed page feels detached from the finger.
      syncTouch: false,
      touchMultiplier: 2.0,
      // This component already refuses to construct Lenis at all when the user
      // wants reduced motion, and that check honours the ?motion= override.
      // Leaving Lenis's own check on means it silently falls back to native
      // scroll whenever the OS reports reduce — which looks like the smoothing
      // is simply broken, with no warning anywhere.
      respectReducedMotion: false,
      // Take wheel input away from Lenis and buffer it (see INTAKE_NOTE).
      // Returning false makes Lenis ignore the event entirely, which also skips
      // its own preventDefault, so that has to happen here or the browser
      // scrolls natively underneath the smoothed position.
      //
      // Only wheel is intercepted. Touch still goes through Lenis untouched, so
      // native momentum is preserved.
      virtualScroll: (data: { deltaY: number; event: Event }) => {
        if (!data.event.type.includes('wheel')) return true
        if (data.event.cancelable) data.event.preventDefault()
        pending += data.deltaY * WHEEL_SPEED
        return false
      },
    })

    // Dev-only handle for tuning the feel from the console.
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).lenis = lenis
    }

    lenis.on('scroll', () => {
      ScrollTrigger.update()
    })

    const lerp = mobile ? LERP_MOBILE : LERP

    const tick = (time: number) => {
      if (pending !== 0) {
        // scrollTo with programmatic:false leaves lerp undefined, which applies
        // the move instantly — the interpolation has to be asked for by name.
        const opts = { programmatic: false, lerp }
        // Flush the remainder once it is too small to be worth a frame, so the
        // buffer cannot hold a fraction of a pixel open indefinitely.
        if (Math.abs(pending) < 0.5) {
          lenis.scrollTo(lenis.targetScroll + pending, opts)
          pending = 0
        } else {
          const chunk = pending * INTAKE
          pending -= chunk
          lenis.scrollTo(lenis.targetScroll + chunk, opts)
        }
      }
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(tick)
    // lagSmoothing hides dropped frames by fudging time, which desynchronises
    // Lenis from ScrollTrigger. Off.
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [reducedMotion, mobile])

  return <>{children}</>
}
