/**
 * Rasterises a word into a cloud of normalised points so the particle field
 * can borrow a subset of its own particles to spell it out, rather than
 * layering separate text geometry on top of the nebula.
 */

const FONT_SIZE = 220
const SAMPLE_GAP = 2
const ALPHA_THRESHOLD = 128
// Archivo (the site's own display webfont, loaded in index.html) rather
// than a system-font stack. "Arial Black" doesn't exist on Apple platforms,
// so iOS/macOS silently substituted a different bold font with different
// metrics — the letterforms sampled here came out squashed/merged as a
// result, without ever throwing an error. Archivo is a real downloaded font
// file, so it renders identically regardless of platform (see FontGate,
// which makes sure it has actually finished loading before this runs).
const FONT = `900 ${FONT_SIZE}px Archivo, system-ui, sans-serif`

export function sampleTextPoints(text: string) {
  const measuring = document.createElement('canvas').getContext('2d')!
  measuring.font = FONT
  const metrics = measuring.measureText(text)

  // Measured from the actual glyph outlines on every side (not a guessed
  // font-size multiplier, and not the advance width, which a bold/black
  // weight can overhang) — with generous padding, since a too-tight estimate
  // showed up as a hard-cut flat edge on the rasterised letters.
  const padding = FONT_SIZE * 0.5
  const ascent = metrics.actualBoundingBoxAscent
  const descent = metrics.actualBoundingBoxDescent
  const left = metrics.actualBoundingBoxLeft
  const right = metrics.actualBoundingBoxRight
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

  return { points, aspect: width / height }
}
