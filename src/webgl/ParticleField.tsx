import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from './particles.glsl'
import { scrollProgress } from '../lib/progress'
import { pointer as sharedPointer, ensurePointerTracking } from '../hooks/usePointer'
import { sampleTextPoints } from './textPoints'

type Props = { count: number }

const WORD = 'EXCUS'
/** World units, capped — matched to sit comfortably inside the nebula's own
 *  footprint (the cloud spans roughly -12..12 on x, -6.75..6.75 on y — see
 *  the radial distribution below). The actual width used is also clamped to
 *  a fraction of the camera's visible width (see ParticleField), so the word
 *  never overflows the frustum on narrow/portrait viewports. */
const TEXT_WIDTH_MAX = 9.4
/** Fraction of the visible viewport width the word is allowed to fill. */
const TEXT_WIDTH_VIEWPORT_FRACTION = 0.88
/** Slightly in front of the cloud's own centre plane, so the word reads as
 *  the near layer of the same gas rather than buried inside it. */
const TEXT_DEPTH = 1.6
/** Nudges the word up from world-origin to line up with where the hero's
 *  flex layout puts it (nav row + subtitle/scroll block below push the
 *  visual centre above dead centre of the viewport). */
const TEXT_Y_OFFSET = 0.9
/** Cap on how much of the field is ever eligible to spell the word — the
 *  rest stays pure nebula, so the word reads as particles borrowed from the
 *  cloud rather than a separate text layer duplicating it. */
const TEXT_FRACTION = 0.55
/** Text particles are drawn from the brighter/larger end of the size
 *  distribution (rather than the same random range as the nebula), so the
 *  letters read clearly at a glance without the shader having to render them
 *  as solid or flat. */
const TEXT_SCALE_MIN = 0.65
const TEXT_SCALE_MAX = 1.35

/** World units — how far the cursor's push reaches. */
const MOUSE_RADIUS = 2.8
/** World units — how hard a particle at the cursor's centre gets shoved. */
const MOUSE_STRENGTH = 2.2
/** Particles currently forming the word resist the cursor more than loose
 *  nebula particles do, so the word stays recognisable even while it reacts. */
const TEXT_MOUSE_DAMP = 0.55
/** How much of the presence fade-in/out happens per frame. Slower than the
 *  position smoothing below — the on/off transition should read as a fade,
 *  the moment-to-moment tracking should read as immediate-but-not-snappy. */
const PRESENCE_RATE = 3

/** Spring pulling each particle toward its current target (word position
 *  blended with rest position — see formAmount below). */
const SPRING = 5.2
/** Velocity damping per second — how quickly motion bleeds off once nothing
 *  is pushing on a particle. */
const DAMPING = 3.4
/** Small per-particle drift so the field is never perfectly still, even at
 *  rest. */
const TURBULENCE_AMP = 0.045
/** Particles forming the word get most of their turbulence suppressed, so
 *  the shape stays crisp instead of jittering apart. */
const TEXT_TURBULENCE_DAMP = 0.75

/** Fraction of the page's total scroll over which the word disperses into
 *  the surrounding field — chosen to finish within the hero's own scroll
 *  range, so the word is gone well before Manifesto is on screen. */
const FORM_RANGE = 0.15
/** Seconds for the word to gather itself out of the cloud on first mount. */
const INTRO_SECONDS = 1.6

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export default function ParticleField({ count }: Props) {
  const points = useRef<THREE.Points>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const { viewport } = useThree()

  // Screen-space parallax pointer, smoothed on the CPU before it reaches the
  // shader — feeding raw pointer coords in makes the whole-field tilt twitch.
  const pointer = useRef(new THREE.Vector2())
  const pointerTarget = useRef(new THREE.Vector2())

  // Cursor repulsion. The raycaster projects the tracked screen position onto
  // the plane the word sits on once per frame (cheap, CPU-side); the actual
  // per-particle physics below runs against that single smoothed world point.
  const raycaster = useRef(new THREE.Raycaster())
  const mousePlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), -TEXT_DEPTH))
  const mouseWorld = useRef(new THREE.Vector3())
  const mouseWorldTarget = useRef(new THREE.Vector3())
  const mousePresence = useRef(0)
  const ndc = useRef(new THREE.Vector2())

  const clock = useRef(0)
  const introRamp = useRef(0)

  // Everything the physics loop touches lives in plain typed arrays, not
  // three.js objects or React state — this runs once per particle, every
  // frame, and the only thing that needs to reach the GPU is the final
  // position buffer.
  const sim = useMemo(() => {
    const textWidth = Math.min(TEXT_WIDTH_MAX, viewport.width * TEXT_WIDTH_VIEWPORT_FRACTION)
    const textYOffset = TEXT_Y_OFFSET * (textWidth / TEXT_WIDTH_MAX)

    const home = new Float32Array(count * 3) // resting nebula position
    const word = new Float32Array(count * 3) // target when spelling EXCUS
    const pos = new Float32Array(count * 3) // live, simulated position
    const vel = new Float32Array(count * 3)
    const scale = new Float32Array(count)
    const seed = new Float32Array(count)
    const isText = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Rejection-free radial distribution: cube root biases points outward so
      // the cloud has a hollow-ish core and reads as volume, not a solid ball.
      const r = Math.cbrt(Math.random()) * 7.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      const x = r * Math.sin(phi) * Math.cos(theta) * 1.6
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.9
      const z = r * Math.cos(phi)

      const idx = i * 3
      home[idx] = x
      home[idx + 1] = y
      home[idx + 2] = z
      pos[idx] = x
      pos[idx + 1] = y
      pos[idx + 2] = z

      // random*random biases toward small, with occasional large ones — a
      // few big soft glows among lots of small wisps reads as more organic
      // than a uniform size distribution.
      scale[i] = 0.3 + Math.random() * Math.random() * 1.9
      seed[i] = Math.random()
    }

    // Borrow a subset of particles to spell the word. Shuffling which
    // particle index gets which glyph point (rather than assigning in raster
    // order) means no correlation between a particle's seed/size and where
    // in the word it ends up.
    const { points: glyphPoints, aspect } = sampleTextPoints(WORD)
    const textHeight = textWidth / aspect
    const order = Array.from({ length: count }, (_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = order[i]
      order[i] = order[j]
      order[j] = tmp
    }

    const textCount = Math.min(glyphPoints.length, Math.floor(count * TEXT_FRACTION))
    for (let i = 0; i < count; i++) {
      const particle = order[i]
      const idx = particle * 3
      if (i < textCount) {
        const p = glyphPoints[i]
        word[idx] = p.x * textWidth
        word[idx + 1] = p.y * textHeight + textYOffset
        word[idx + 2] = TEXT_DEPTH
        isText[particle] = 1
        // Redraw this particle's size from the brighter/larger band rather
        // than keeping whatever the general nebula distribution gave it.
        scale[particle] = TEXT_SCALE_MIN + Math.random() * (TEXT_SCALE_MAX - TEXT_SCALE_MIN)
      } else {
        word[idx] = home[idx]
        word[idx + 1] = home[idx + 1]
        word[idx + 2] = home[idx + 2]
      }
    }

    return { home, word, pos, vel, scale, seed, isText }
  }, [count, viewport.width])

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positionAttr = new THREE.BufferAttribute(sim.pos, 3)
    positionAttr.setUsage(THREE.DynamicDrawUsage)
    g.setAttribute('position', positionAttr)
    g.setAttribute('aScale', new THREE.BufferAttribute(sim.scale, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(sim.seed, 1))
    g.setAttribute('aIsText', new THREE.BufferAttribute(sim.isText, 1))
    return g
  }, [sim])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      // Smaller on narrow viewports — the word is scaled down to fit the same
      // frustum, and full-size points would blur its letterforms together.
      uSize: { value: viewport.width > 8 ? 3.4 : 2.5 },
      uNoiseScale: { value: 0.13 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColorCore: { value: new THREE.Color('#171a3d') },
      uColorViolet: { value: new THREE.Color('#5b3fa6') },
      // A subtle rose-magenta complement to the blue/violet base — a third
      // hue, not a second gradient, so the field reads as a proper mixed
      // nebula rather than a two-colour ramp with white stars on top.
      uColorComplement: { value: new THREE.Color('#8a4a8f') },
      uColorSpark: { value: new THREE.Color('#e6ecff') },
    }),
    [viewport.width],
  )

  useFrame((state, delta) => {
    ensurePointerTracking()

    const u = material.current?.uniforms
    if (!u) return

    // Clamp delta so a backgrounded tab doesn't jump the field on return.
    const dt = Math.min(delta, 1 / 30)
    clock.current += dt
    u.uTime.value = clock.current

    // Eased toward the real scroll position, not toward a velocity — driving
    // the late-page recede from POSITION rather than velocity means it holds
    // exactly still the instant scrolling stops, in whichever direction it
    // was last moving.
    u.uProgress.value += (scrollProgress.value - u.uProgress.value) * Math.min(1, dt * 3)

    // How much of the word should be formed right now: 1 at the very top of
    // the page, easing smoothly to 0 within FORM_RANGE of scroll — a pure
    // function of scroll position, so it is exactly reversible with no
    // special-casing for "half formed". introRamp additionally ramps this
    // from 0 on first mount, so the word visibly gathers out of the cloud
    // instead of appearing pre-assembled.
    introRamp.current = Math.min(1, introRamp.current + dt / INTRO_SECONDS)
    const scrollForm = 1 - smoothstep(0, FORM_RANGE, scrollProgress.value)
    const form = scrollForm * introRamp.current

    // Screen-space parallax — same smoothed-pointer pattern as before, fed
    // from the reliable window-level tracker instead of R3F's state.pointer,
    // which never updates for a canvas that never wins hit-testing (see
    // usePointer's docstring).
    pointerTarget.current.set(sharedPointer.nx, sharedPointer.ny)
    pointer.current.lerp(pointerTarget.current, Math.min(1, dt * 2.5))
    u.uPointer.value.copy(pointer.current)

    // Cursor repulsion. Raycast the tracked NDC position onto the plane the
    // word sits on to get a world-space point the physics loop below measures
    // real 3D distance against.
    ndc.current.set(sharedPointer.nx, sharedPointer.ny)
    raycaster.current.setFromCamera(ndc.current, state.camera)
    const hit = raycaster.current.ray.intersectPlane(mousePlane.current, mouseWorldTarget.current)
    if (hit) {
      // Smoothing this target (rather than feeding the raycast straight into
      // the physics) is what keeps the repulsion reading as a field being
      // pushed through rather than particles snapping to follow a jittery
      // cursor.
      mouseWorld.current.lerp(mouseWorldTarget.current, Math.min(1, dt * 6))
    }

    // Presence fades the whole effect in/out on top of the natural per-
    // particle distance falloff, so it's a deliberate arrival/departure
    // rather than a hard cut when the cursor enters or leaves the window.
    const presenceTarget = sharedPointer.active ? 1 : 0
    mousePresence.current += (presenceTarget - mousePresence.current) * Math.min(1, dt * PRESENCE_RATE)

    const { home, word, pos, vel, seed, isText } = sim
    const mx = mouseWorld.current.x
    const my = mouseWorld.current.y
    const mz = mouseWorld.current.z
    const presence = mousePresence.current
    const t = clock.current
    const dampFactor = Math.max(0, 1 - DAMPING * dt)

    for (let i = 0; i < count; i++) {
      const ix = i * 3
      const iy = ix + 1
      const iz = ix + 2
      const text = isText[i]

      // Target is the word position when formed, the cloud's own rest
      // position when dispersed — a single lerp covers both ends and every
      // point between.
      const tx = home[ix] + (word[ix] - home[ix]) * form
      const ty = home[iy] + (word[iy] - home[iy]) * form
      const tz = home[iz] + (word[iz] - home[iz]) * form

      let ax = (tx - pos[ix]) * SPRING
      let ay = (ty - pos[iy]) * SPRING
      let az = (tz - pos[iz]) * SPRING

      // Organic per-particle turbulence, damped hard on particles currently
      // forming the word so the shape stays legible while it's held.
      const turbDamp = 1 - text * TEXT_TURBULENCE_DAMP
      ax += Math.sin(t * 0.5 + seed[i] * 31.0) * TURBULENCE_AMP * turbDamp
      ay += Math.cos(t * 0.43 + seed[i] * 17.0) * TURBULENCE_AMP * turbDamp
      az += Math.sin(t * 0.37 + seed[i] * 53.0) * TURBULENCE_AMP * turbDamp

      // Cursor repulsion in real 3D — particles behind the cursor get less
      // push than particles at its depth, which is what keeps this reading
      // as a physical disturbance in a volume rather than a flat decal.
      const dx = pos[ix] - mx
      const dy = pos[iy] - my
      const dz = pos[iz] - mz
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-4
      if (dist < MOUSE_RADIUS) {
        const falloff = 1 - dist / MOUSE_RADIUS
        const strength = MOUSE_STRENGTH * falloff * falloff * presence * (1 - text * TEXT_MOUSE_DAMP)
        ax += (dx / dist) * strength
        ay += (dy / dist) * strength
        az += (dz / dist) * strength * 0.5
      }

      vel[ix] = (vel[ix] + ax * dt) * dampFactor
      vel[iy] = (vel[iy] + ay * dt) * dampFactor
      vel[iz] = (vel[iz] + az * dt) * dampFactor

      pos[ix] += vel[ix] * dt
      pos[iy] += vel[iy] * dt
      pos[iz] += vel[iz] * dt
    }

    const attr = points.current?.geometry.attributes.position as THREE.BufferAttribute | undefined
    if (attr) attr.needsUpdate = true
  })

  return (
    <points ref={points} geometry={geometry} scale={viewport.width > 8 ? 1 : 0.7}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
