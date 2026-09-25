import { useEffect, useState } from 'react'

export type Environment = {
  /** User asked the OS for less motion — all scrub/pin choreography is off. */
  reducedMotion: boolean
  /** Coarse pointer or narrow viewport: no scroll-jacking, lighter WebGL. */
  mobile: boolean
  /** A real mouse exists, so the custom cursor is worth mounting. */
  finePointer: boolean
}

const QUERIES = {
  reducedMotion: '(prefers-reduced-motion: reduce)',
  mobile: '(max-width: 900px), (pointer: coarse)',
  finePointer: '(hover: hover) and (pointer: fine)',
} as const

/**
 * QA override: `?motion=force` plays the full choreography and `?motion=reduce`
 * forces the static path, so both branches are testable without changing OS
 * settings — and because headless/automated browsers report reduced motion by
 * default, which would otherwise make the animated path impossible to verify.
 */
function motionOverride(): boolean | null {
  const p = new URLSearchParams(window.location.search).get('motion')
  if (p === 'force') return false
  if (p === 'reduce') return true
  return null
}

function read(): Environment {
  return {
    reducedMotion: motionOverride() ?? window.matchMedia(QUERIES.reducedMotion).matches,
    mobile: window.matchMedia(QUERIES.mobile).matches,
    finePointer: window.matchMedia(QUERIES.finePointer).matches,
  }
}

/**
 * Single source of truth for the three capability questions the site branches on.
 *
 * Read synchronously in the state initialiser rather than in an effect. An
 * effect-set `ready` flag would flip on the first commit, which changes every
 * `useGSAP` dependency array and makes GSAP revert and rebuild each context —
 * and a mount tween that has already applied its `from` values gets torn down
 * mid-flight, leaving elements stuck at opacity 0. This is client-only code, so
 * `window` is always available and there is no hydration mismatch to avoid.
 *
 * The listeners exist so toggling reduced motion in the OS takes effect live.
 */
export function useEnvironment(): Environment {
  const [env, setEnv] = useState<Environment>(read)

  useEffect(() => {
    const update = () => {
      const next = read()
      // Only commit when something actually changed, so unrelated media events
      // can't churn dependency arrays and rebuild the timelines.
      setEnv((prev) =>
        prev.reducedMotion === next.reducedMotion &&
        prev.mobile === next.mobile &&
        prev.finePointer === next.finePointer
          ? prev
          : next,
      )
    }

    const lists = Object.values(QUERIES).map((q) => window.matchMedia(q))
    lists.forEach((l) => l.addEventListener('change', update))
    update()
    return () => lists.forEach((l) => l.removeEventListener('change', update))
  }, [])

  return env
}
