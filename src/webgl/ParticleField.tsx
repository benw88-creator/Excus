import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from './particles.glsl'
import { scrollProgress } from '../lib/progress'
import { pointer as sharedPointer, ensurePointerTracking } from '../hooks/usePointer'

type Props = { count: number }

/** World units — see usePointer's docstring for why this needs its own
 *  window-level tracking rather than R3F's built-in pointer state. */
const MOUSE_RADIUS = 2.6
const MOUSE_STRENGTH = 1.9
/** How much of the presence fade-in/out happens per frame. Slower than the
 *  position smoothing below — the on/off transition should read as a fade,
 *  the moment-to-moment tracking should read as immediate-but-not-snappy. */
const PRESENCE_RATE = 3

export default function ParticleField({ count }: Props) {
  const points = useRef<THREE.Points>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const { viewport } = useThree()

  // Screen-space parallax pointer, smoothed on the CPU before it reaches the
  // shader — feeding raw pointer coords in makes the whole-field tilt twitch.
  const pointer = useRef(new THREE.Vector2())
  const pointerTarget = useRef(new THREE.Vector2())

  // Cursor repulsion. The raycaster projects the tracked screen position onto
  // the cloud's centre plane once per frame (cheap, CPU-side); every
  // per-particle distance/falloff calculation happens in the vertex shader,
  // in parallel, for free.
  const raycaster = useRef(new THREE.Raycaster())
  const mousePlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
  const mouseWorld = useRef(new THREE.Vector3())
  const mouseWorldTarget = useRef(new THREE.Vector3())
  const mousePresence = useRef(0)
  const ndc = useRef(new THREE.Vector2())

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const seeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Rejection-free radial distribution: cube root biases points outward so
      // the cloud has a hollow-ish core and reads as volume, not a solid ball.
      const r = Math.cbrt(Math.random()) * 7.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.6
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.9
      positions[i * 3 + 2] = r * Math.cos(phi)

      // random*random biases toward small, with occasional large ones — a
      // few big soft glows among lots of small wisps reads as more organic
      // than a uniform size distribution.
      scales[i] = 0.3 + Math.random() * Math.random() * 1.9
      seeds[i] = Math.random()
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return g
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      uSize: { value: 3.4 },
      uNoiseScale: { value: 0.13 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColorCore: { value: new THREE.Color('#8a8578') },
      uColorAccent: { value: new THREE.Color('#f5c842') },
      uColorEmber: { value: new THREE.Color('#8f4a24') },
      uMouseWorld: { value: new THREE.Vector3() },
      uMouseRadius: { value: MOUSE_RADIUS },
      uMouseStrength: { value: MOUSE_STRENGTH },
      uMousePresence: { value: 0 },
    }),
    [],
  )

  useFrame((state, delta) => {
    ensurePointerTracking()

    const u = material.current?.uniforms
    if (!u) return

    // Clamp delta so a backgrounded tab doesn't jump the field on return.
    const dt = Math.min(delta, 1 / 30)

    u.uTime.value += dt
    // Eased toward the real scroll position, not toward a velocity — see
    // particles.glsl's uProgress comment for why that distinction is the
    // whole fix for the field snapping back and forth on every pause.
    u.uProgress.value += (scrollProgress.value - u.uProgress.value) * Math.min(1, dt * 3)

    // Screen-space parallax — same smoothed-pointer pattern as before, now
    // fed from the reliable window-level tracker instead of R3F's state.
    // pointer, which never updates for a canvas that never wins hit-testing
    // (see usePointer's docstring).
    pointerTarget.current.set(sharedPointer.nx, sharedPointer.ny)
    pointer.current.lerp(pointerTarget.current, Math.min(1, dt * 2.5))
    u.uPointer.value.copy(pointer.current)

    // Cursor repulsion. Raycast the tracked NDC position onto the cloud's
    // centre (z=0) plane to get a world-space point the shader can measure
    // per-particle distance against.
    ndc.current.set(sharedPointer.nx, sharedPointer.ny)
    raycaster.current.setFromCamera(ndc.current, state.camera)
    const hit = raycaster.current.ray.intersectPlane(mousePlane.current, mouseWorldTarget.current)
    if (hit) {
      // Smoothing this target (rather than feeding the raycast straight to the
      // shader) is what keeps the repulsion reading as a field being pushed
      // through rather than particles snapping to follow a jittery cursor —
      // and because distance-to-target changes gradually as a result, a
      // particle's push naturally eases out as the smoothed point moves away,
      // with no separate per-particle spring/velocity needed.
      mouseWorld.current.lerp(mouseWorldTarget.current, Math.min(1, dt * 6))
    }
    u.uMouseWorld.value.copy(mouseWorld.current)

    // Presence fades the whole effect in/out on top of the natural per-
    // particle distance falloff, so it's a deliberate arrival/departure
    // rather than a hard cut when the cursor enters or leaves the window.
    const presenceTarget = sharedPointer.active ? 1 : 0
    mousePresence.current += (presenceTarget - mousePresence.current) * Math.min(1, dt * PRESENCE_RATE)
    u.uMousePresence.value = mousePresence.current

    if (points.current) {
      points.current.rotation.y += dt * 0.02
    }
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
