/**
 * Rasterises a word into a cloud of normalised points so the particle field
 * can borrow a subset of its own particles to spell it out, rather than
 * layering separate text geometry on top of the nebula.
 */

const FONT_SIZE = 220
const SAMPLE_GAP = 2
const ALPHA_THRESHOLD = 128

export function sampleTextPoints(text: string) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  ctx.font = `900 ${FONT_SIZE}px "Arial Black", system-ui, sans-serif`
  const measured = ctx.measureText(text).width

  const width = Math.ceil(measured) + 60
  const height = Math.ceil(FONT_SIZE * 1.3)
  canvas.width = width
  canvas.height = height

  // Sizing the canvas resets the context, so font/fill have to be reapplied.
  ctx.font = `900 ${FONT_SIZE}px "Arial Black", system-ui, sans-serif`
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(text, width / 2, height / 2)

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
