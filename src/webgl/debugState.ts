/**
 * A plain mutable bag ParticleField writes real computed numbers into, and
 * DebugOverlay polls and displays as on-page text — so what's actually
 * happening on a device we can't attach devtools to can be read off a
 * screenshot instead of guessed at.
 */
export const particleDebug = {
  mobile: false,
  count: 0,
  viewportWidth: 0,
  textWidth: 0,
  textSizeBoost: 0,
  uSize: 0,
  pixelRatio: 0,
  pointSizeMin: 0,
  pointSizeMax: 0,
  glyphPointCount: 0,
  textCount: 0,
  aScaleMin: 0,
  aScaleMax: 0,
  sampleWidth: 0,
  sampleHeight: 0,
  sampleAspect: 0,
  dpr: typeof window !== 'undefined' ? window.devicePixelRatio : 0,
  innerWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
  innerHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  canvasWidth: 0,
  canvasClientWidth: 0,
}
