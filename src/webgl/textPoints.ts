/**
 * Rasterises a word into a cloud of normalised points so the particle field
 * can borrow a subset of its own particles to spell it out, rather than
 * layering separate text geometry on top of the nebula.
 */

const FONT_SIZE = 220
const SAMPLE_GAP = 2
const ALPHA_THRESHOLD = 128
// A system-font stack, not a webfont. This canvas is sampled as soon as the
// component mounts, with no guarantee a network-loaded font (Archivo, or
// before that "Arial Black", which doesn't exist on Apple platforms at all)
// has actually finished downloading by then — if it hasn't, the browser
// silently substitutes and sometimes synthesises a heavier "fake bold" from
// whatever's already available, which can render letters thick enough to
// merge into each other with no error anywhere to signal it. Every name
// here is a font the OS itself ships, so it's available synchronously, with
// no loading race, on every platform.
const FONT = `900 ${FONT_SIZE}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

export function sampleTextPoints(text: string) {
  const measuring = document.createElement('canvas').getContext('2d')!
  measuring.font = FONT
  const metrics = measuring.measureText(text)

  // Measured from the actual glyph outlines on every side (not a guessed
  // font-size multiplier, and not the advance width, which a bold/black
  // weight can overhang) — with generous padding, since a too-tight estimate
  // showed up as a hard-cut flat edge on the rasterised letters. Falls back
  // to a plain font-size-relative box if a platform's TextMetrics doesn't
  // support the actualBoundingBox* fields (all zero/NaN), rather than
  // silently rasterising into a degenerate canvas.
  const padding = FONT_SIZE * 0.5
  const metricsUsable = [
    metrics.actualBoundingBoxAscent,
    metrics.actualBoundingBoxDescent,
    metrics.actualBoundingBoxLeft,
    metrics.actualBoundingBoxRight,
  ].every((n) => Number.isFinite(n) && n !== 0)
  const ascent = metricsUsable ? metrics.actualBoundingBoxAscent : FONT_SIZE * 0.8
  const descent = metricsUsable ? metrics.actualBoundingBoxDescent : FONT_SIZE * 0.2
  const left = metricsUsable ? metrics.actualBoundingBoxLeft : 0
  const right = metricsUsable ? metrics.actualBoundingBoxRight : metrics.width
  const width = Math.ceil(left + right + padding * 2)
  const height = Math.ceil(ascent + descent + padding * 2)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.font = FONT
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  // 'left', matching the default alignment measureText used above — drawn at
  // (padding + left) so the ink's actual left edge lands exactly at
  // `padding` from the canvas edge, symmetric with the right/top/bottom
  // margins regardless of how the glyphs overhang their advance width.
  ctx.textAlign = 'left'
  ctx.fillText(text, padding + left, padding + ascent)

  const { data } = ctx.getImageData(0, 0, width, height)
  const points: { x: number; y: number }[] = []

  for (let y = 0; y < height; y += SAMPLE_GAP) {
    for (let x = 0; x < width; x += SAMPLE_GAP) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > ALPHA_THRESHOLD) {
        // Centred, -0.5..0.5 on each axis, y flipped to match GL's up-positive
        // convention.
        points.push({ x: (x - width / 2) / width, y: -(y - height / 2) / height })
      }
    }
  }

  return { points, aspect: width / height, width, height }
}
