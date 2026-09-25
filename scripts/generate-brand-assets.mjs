// Generates favicons and the social preview (OG) image from
// public/brand/mark-source.png. Re-run with `node scripts/generate-brand-assets.mjs`
// whenever the source mark or OG copy changes — nothing here is hand-tuned
// per output file, so it's safe to just re-run.
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..'
const publicDir = path.join(root, 'public')
// Kept out of public/ so the raw source isn't shipped in the deployed
// bundle — only the generated, purpose-sized outputs below are.
const sourcePath = path.join(root, 'assets', 'brand', 'mark-source.png')

const VOID = '#0a0908'
const AMBER = '#f5c842'
const BONE = '#f0ede8'

// The source mark has generous black margin around the actual strokes —
// fine at OG-image size, but at favicon sizes it reads as a barely-visible
// smudge. Trimming to the ink's own bounding box first means the strokes
// still fill most of the frame once resized down.
async function trimmedMark() {
  return sharp(sourcePath).trim({ background: VOID, threshold: 12 }).toBuffer()
}

async function squareIcon(size, outName) {
  const trimmed = await trimmedMark()
  const inset = Math.round(size * 0.03)
  const bg = { create: { width: size, height: size, channels: 4, background: VOID } }
  const mark = await sharp(trimmed)
    .resize(size - inset * 2, size - inset * 2, { fit: 'contain', background: VOID })
    // The source mark's strokes are a mid-grey, not pure white — fine at OG
    // size, but at favicon sizes (rendered a few dozen pixels tall in a
    // browser tab) that reads as a nearly-invisible dark smudge. Lifting
    // brightness/contrast here, favicon-only, keeps the OG image's more
    // faithful reproduction untouched.
    .linear(1.6, -20)
    .toBuffer()
  await sharp(bg)
    .composite([{ input: mark, top: inset, left: inset }])
    .flatten({ background: VOID })
    .png()
    .toFile(path.join(publicDir, outName))
  console.log(`wrote ${outName}`)
}

async function ogImage() {
  const markSize = 340
  const trimmed = await trimmedMark()
  const markBuffer = await sharp(trimmed)
    .resize(markSize, markSize, { fit: 'contain', background: VOID })
    .png()
    .toBuffer()
  const markBase64 = markBuffer.toString('base64')

  const width = 1200
  const height = 630

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow1" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stop-color="${AMBER}" stop-opacity="0.20"/>
          <stop offset="35%" stop-color="${AMBER}" stop-opacity="0.05"/>
          <stop offset="70%" stop-color="${VOID}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="glow2" cx="78%" cy="72%" r="45%">
          <stop offset="0%" stop-color="#8a4a8f" stop-opacity="0.16"/>
          <stop offset="70%" stop-color="${VOID}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="${VOID}"/>
      <rect width="${width}" height="${height}" fill="url(#glow1)"/>
      <rect width="${width}" height="${height}" fill="url(#glow2)"/>
      <image x="${(width - markSize) / 2}" y="70" width="${markSize}" height="${markSize}" href="data:image/png;base64,${markBase64}"/>
      <text x="50%" y="470" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="108" letter-spacing="-2" fill="${BONE}">EXCUS</text>
      <text x="50%" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="${BONE}" fill-opacity="0.55">Where innovation meets the new age of technology.</text>
      <text x="90" y="580" font-family="monospace" font-size="16" letter-spacing="3" fill="${AMBER}" fill-opacity="0.7">INDEPENDENT TECHNOLOGY COMPANY</text>
    </svg>
  `

  await sharp(Buffer.from(svg)).png().toFile(path.join(publicDir, 'og-image.png'))
  console.log('wrote og-image.png')
}

await mkdir(publicDir, { recursive: true })
await squareIcon(32, 'favicon-32.png')
await squareIcon(192, 'icon-192.png')
await squareIcon(180, 'apple-touch-icon.png')
await squareIcon(512, 'icon-512.png')
await ogImage()
