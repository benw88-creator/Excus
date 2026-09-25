import { motion } from 'framer-motion'
import SplitText from './SplitText'

/**
 * Section 3. The company-level ask.
 *
 * The hero's canvas is still mounted behind the page — the shader's uProgress
 * uniform has collapsed and dimmed the field by now, so this reads as the same
 * atmosphere at rest rather than a new background.
 */
export default function ClosingCTA() {
  return (
    <section className="relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-6">
      <div className="relative z-10 flex flex-col items-center gap-10 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/70">
          03 — Contact
        </span>

        <SplitText
          as="h2"
          by="chars"
          onEnter
          stagger={0.025}
          className="max-w-4xl text-[11vw] font-semibold leading-[0.9] tracking-[-0.045em] md:text-[6vw]"
        >
          Build what does not exist yet.
        </SplitText>

        <p className="max-w-lg text-sm leading-relaxed text-bone/50">
          Excus works with a small number of operators, engineers and founders each year.
          If you are building something that should already exist, start here.
        </p>

        <motion.a
          href="mailto:hello@excus.com"
          data-cursor
          whileHover="hover"
          initial="rest"
          animate="rest"
          className="group relative mt-2 inline-flex items-center gap-4 overflow-hidden border border-bone/20 px-9 py-4"
        >
          <motion.span
            variants={{ rest: { y: '101%' }, hover: { y: '0%' } }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-amber"
          />
          <span className="relative z-10 font-mono text-[11px] uppercase tracking-[0.28em] transition-colors duration-300 group-hover:text-void">
            Start a conversation
          </span>
          <span className="relative z-10 transition-colors duration-300 group-hover:text-void">→</span>
        </motion.a>
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-6 py-8 font-mono text-[10px] uppercase tracking-[0.28em] text-bone/30 md:px-12">
        <span>Excus — technology company</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </section>
  )
}
