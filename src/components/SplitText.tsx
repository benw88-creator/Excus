import { useRef, type ComponentPropsWithoutRef } from 'react'
import SplitType from 'split-type'
import { gsap, useGSAP } from '../lib/gsap'
import { useEnvironment } from '../hooks/useEnvironment'

/** A closed set rather than ElementType: a fully polymorphic `as` collapses
 *  every other prop to `never` under the app's stricter tsconfig. */
type Tag = 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4'

type Props = ComponentPropsWithoutRef<'div'> & {
  children: string
  as?: Tag
  /** Split granularity. Chars read as assembly, words as a statement. */
  by?: 'chars' | 'words'
  /** Wait for the element to enter the viewport instead of firing on mount. */
  onEnter?: boolean
  delay?: number
  stagger?: number
  duration?: number
}

/**
 * Per-character (or per-word) reveal.
 *
 * SplitType rewrites the element's innerHTML, so `children` must be a plain
 * string — nested elements would be destroyed by the split. The cleanup calls
 * revert() so React re-renders and HMR don't accumulate duplicated markup.
 *
 * Under reduced motion the text is simply rendered, never split.
 */
export default function SplitText({
  children,
  as: Component = 'div',
  by = 'chars',
  onEnter = false,
  delay = 0,
  stagger = 0.02,
  duration = 0.9,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { reducedMotion } = useEnvironment()

  useGSAP(
    () => {
      if (!ref.current || reducedMotion) return

      const split = new SplitType(ref.current, {
        types: by === 'chars' ? 'lines,chars' : 'lines,words',
        lineClass: 'split-line',
        charClass: 'split-char',
        wordClass: 'split-word',
      })
      const targets = by === 'chars' ? split.chars : split.words
      if (!targets?.length) return

      // fromTo rather than from: gsap.from reads the element's current value as
      // its destination, and StrictMode runs this effect twice, so the second
      // pass would inherit the first pass's offset position as the end state.
      gsap.fromTo(
        targets,
        {
          yPercent: 108,
          // A touch of rotation stops a pure Y slide reading as a cheap marquee.
          rotate: by === 'chars' ? 4 : 0,
        },
        {
          yPercent: 0,
          rotate: 0,
          duration,
          ease: 'power4.out',
          stagger,
          delay,
          scrollTrigger: onEnter
            ? { trigger: ref.current, start: 'top 88%', once: true }
            : undefined,
        },
      )

      return () => split.revert()
    },
    { scope: ref, dependencies: [reducedMotion, children] },
  )

  return (
    <Component ref={ref as React.Ref<never>} {...rest}>
      {children}
    </Component>
  )
}
