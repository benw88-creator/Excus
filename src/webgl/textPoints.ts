/**
 * Rasterises a word into a cloud of normalised points so the particle field
 * can borrow a subset of its own particles to spell it out, rather than
 * layering separate text geometry on top of the nebula.
 */

const FONT_SIZE = 220
const SAMPLE_GAP = 2
const ALPHA_THRESHOLD = 128
const FONT = `900 ${FONT_SIZE}px "Arial Black", system-ui, sans-serif`

export function sampleTextPoints(text: string) {
  const measuring = document.createElement('canvas').getContext('2d')!
  measuring.font = FONT
  const metrics = measuring.measureText(text)

  // Measured from the actual glyph outlines (not a guessed font-size
  // multiplier), with generous padding on every side — a fixed multiplier
  // clipped descender-free caps like "EXCUS" against the canvas edge on some
  // platforms' metrics, which showed up as a hard-cut flat edge on the
  // rasterised letters.
  const padding = FONT_SIZE * 0.35
  const ascent = metrics.actualBoundingBoxAscent
  const descent = metrics.actualBoundingBoxDescent
  const width = Math.ceil(metrics.width + padding * 2)
  const height = Math.ceil(ascent + descent + padding * 2)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.font = FONT
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'center'
  ctx.fillText(text, width / 2, padding + ascent)

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

  return { points, aspect: width / height }
}
