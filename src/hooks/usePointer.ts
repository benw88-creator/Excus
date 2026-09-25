/**
 * Raw viewport pointer position, written by a single global listener and read
 * by anything that needs the cursor without going through React Three Fiber's
 * own pointer state.
 *
 * R3F only updates `state.pointer` for events that actually reach the canvas
 * DOM element, decided by normal browser hit-testing. This site's WebGL canvas
 * is a full-viewport fixed backdrop sitting BEHIND the real page content
 * (z-0 under the content's z-10), and every section's own box — even ones with
 * mostly empty background — covers the full width of the page in the document
 * flow. That means the canvas loses hit-testing at literally every pixel any
 * section occupies, and `state.pointer` sits frozen wherever it happened to
 * initialise. Confirmed live: dispatching synthetic pointer/mouse events did
 * not move it at all.
 *
 * A plain module singleton, not React state — this is read every WebGL frame,
 * and pushing it through React would re-render on every mouse move.
 */
const pointer = {
  /** Viewport pixels. */
  x: 0,
  y: 0,
  /** Normalised device coordinates, -1..1, y flipped to match GL's up-positive
   *  convention (same convention R3F's own `state.pointer` uses). */
  nx: 0,
  ny: 0,
  /** True once a real pointer event has landed, so consumers can tell "at the
   *  origin" apart from "never moved". */
  active: false,
}

let listening = false

function onMove(e: PointerEvent) {
  pointer.x = e.clientX
  pointer.y = e.clientY
  pointer.nx = (e.clientX / window.innerWidth) * 2 - 1
  pointer.ny = -(e.clientY / window.innerHeight) * 2 + 1
  pointer.active = true
}

function onLeave() {
  // The cursor has left the window entirely (not just moved to a different
  // element within it) — there is no position to represent any more.
  pointer.active = false
}

/**
 * Idempotent — safe to call from every consumer's mount effect. The listener
 * is cheap (passive, no allocation) and lives for the page's lifetime, so
 * there is no teardown to manage.
 */
export function ensurePointerTracking() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('pointermove', onMove, { passive: true })
  // 'mouseleave' on the document is the standard way to detect the pointer
  // leaving the browser viewport — 'pointerleave'/'mouseleave' on window
  // itself does not reliably fire for this.
  document.addEventListener('mouseleave', onLeave)
  window.addEventListener('blur', onLeave)
}

export { pointer }
