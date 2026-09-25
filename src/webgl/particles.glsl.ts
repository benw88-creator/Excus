/**
 * Shared GLSL for the hero field. Kept as strings (rather than .glsl files) so
 * there's no extra Vite plugin in the build for two shaders.
 */

export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;   // 0 at hero, 1 by the closing section — a pure
                              // function of scroll POSITION (see ParticleField),
                              // so driving motion from it is inherently linear
                              // and reversible: scroll down and it increases,
                              // scroll up and it decreases back the same way,
                              // and it holds exactly still the instant you stop.
  uniform vec2  uPointer;    // -1..1, already smoothed on the CPU
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uNoiseScale; // frequency of the low-frequency colour-patch noise

  // Cursor repulsion. uMouseWorld is the cursor raycast onto the cloud's
  // centre plane, already smoothed on the CPU frame to frame — see
  // ParticleField's useFrame for why that smoothing is what keeps this from
  // reading as jittery or snapping rather than any per-particle state here.
  uniform vec3  uMouseWorld;
  uniform float uMouseRadius;   // world units — how far the push reaches
  uniform float uMouseStrength; // world units — how far a particle at the
                                 // cursor's centre gets shoved
  uniform float uMousePresence; // 0..1, fades out when the pointer leaves
                                 // the window entirely

  attribute float aScale;
  attribute float aSeed;

  varying float vSeed;
  varying float vDepth;
  // Low-frequency noise sampled once per particle at its rest position, so
  // colour reads as soft drifting patches of gas rather than per-particle
  // speckle — the difference between a nebula and a starfield.
  varying float vColorNoise;

  // Cheap 3D simplex-ish noise. Not mathematically pretty, but it costs a
  // fraction of real simplex and the field is organic enough that nobody can
  // tell the difference at this scale.
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
              dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
          mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
              dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
      mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
              dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
          mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
              dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y),
      u.z);
  }

  void main() {
    vSeed = aSeed;
    vec3 pos = position;

    // Slow ambient drift — the field is never completely still.
    float t = uTime * 0.06;
    vec3 flow = vec3(
      noise(pos * 0.28 + vec3(t, 0.0, 0.0)),
      noise(pos * 0.28 + vec3(0.0, t, 12.7)),
      noise(pos * 0.22 + vec3(4.3, 0.0, t))
    );
    pos += flow * 0.75;

    // Sampled at a much slower time rate and a different frequency/offset
    // than the flow noise above, so the colour patches drift independently
    // of the positional drift instead of looking locked to it.
    vColorNoise = noise(pos * uNoiseScale + vec3(31.7, -9.2, uTime * 0.015));

    // Scroll position stretches and shears the field along a fixed per-
    // particle direction. This used to be driven by scroll VELOCITY, which
    // decays to zero the instant scrolling stops — so the whole field would
    // visibly ease back toward its resting position on every pause, reading
    // as random back-and-forth motion rather than something scrolling down
    // moves one way and scrolling up undoes. uProgress only ever changes when
    // the actual scroll position changes, in whichever direction it changes,
    // so this now tracks the scrollbar exactly: down moves it forward, up
    // reverses it by precisely the same amount, and it is motionless the
    // instant you stop, at whatever position you stopped at.
    pos.z += uProgress * 6.0 * (0.4 + aSeed);
    pos.x += uProgress * 1.6 * sin(aSeed * 6.2831);

    // Pointer parallax, weighted by depth so near particles move more.
    float depthWeight = smoothstep(-6.0, 6.0, pos.z);
    pos.xy += uPointer * (0.6 + depthWeight * 1.4);

    // Physical repulsion: particles disperse from the cursor's projected
    // position, strongest at the centre and fading smoothly to nothing at the
    // radius edge. Distance is measured in the screen-facing plane only (xy),
    // so the affected area reads as a consistent on-screen circle no matter
    // how deep in the cloud a given particle sits; z is still part of the
    // PUSH direction, so particles behind the cursor get shoved backward too,
    // which is what keeps the effect reading as a 3D disturbance instead of a
    // flat decal moving across the surface.
    vec3 toParticle = pos - uMouseWorld;
    float mouseDist = length(toParticle.xy);
    float influence = smoothstep(uMouseRadius, 0.0, mouseDist);
    // Squared rather than linear falloff — closer reads as noticeably
    // stronger, not just proportionally stronger, which is what makes the
    // dispersal feel like a field being pushed rather than a hard bubble.
    influence *= influence;
    influence *= uMousePresence;
    // Epsilon guards normalize(0) for the vanishingly unlikely case of a
    // particle sitting exactly on the cursor's projected point.
    vec3 pushDir = normalize(vec3(toParticle.xy, toParticle.z * 0.5) + 1e-4);
    pos += pushDir * influence * uMouseStrength;

    // As the page progresses the cloud collapses toward the axis and recedes,
    // so the closing section inherits a calmer version of the same field.
    pos.xy *= mix(1.0, 0.55, uProgress);
    pos.z  -= uProgress * 4.0;

    vDepth = depthWeight;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Perspective-correct point size, clamped so nothing becomes a screen-
    // filling blob when it drifts close to the camera. Bigger and more
    // permissive than a starfield would want — nebula wisps need points that
    // overlap generously so their soft edges (see the fragment shader) blend
    // into continuous cloud rather than staying legible as separate dots.
    float size = uSize * aScale * uPixelRatio;
    gl_PointSize = clamp(size * (8.0 / -mvPosition.z), 0.5, 34.0);
  }
`

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3  uColorCore;
  uniform vec3  uColorAccent;
  uniform vec3  uColorEmber;
  uniform float uProgress;

  varying float vSeed;
  varying float vDepth;
  varying float vColorNoise;

  void main() {
    // Gaussian falloff rather than a hard-edged circle. A smoothstep circle
    // reads as a dot no matter how large it gets; a gaussian has no real
    // edge at all, so once points are large enough to overlap (see the
    // vertex shader's point-size clamp) their soft skirts blend into
    // continuous cloud instead of staying legible as separate discs — that
    // blending is what actually reads as "nebula" rather than "starfield",
    // more than any single colour choice does.
    vec2 uv = gl_PointCoord - 0.5;
    float d2 = dot(uv, uv);
    float alpha = exp(-d2 * 9.0);
    if (alpha < 0.01) discard;

    // Colour is patchy, not speckled: a smoothstep over the same low-
    // frequency noise that's shared by every particle in a neighbourhood
    // (see the vertex shader) gives soft-edged drifting clouds of colour, the
    // way real emission nebulae vary gradually rather than pixel-by-pixel.
    // noise() outputs roughly -1..1 but is not evenly spread across it, so
    // remap to 0..1 first and threshold around its natural midpoint — using
    // the raw -1..1 range directly made "ember" territory too rare to read as
    // anything but the occasional stray fleck rather than a genuine patch.
    float n = vColorNoise * 0.5 + 0.5;
    float gasPatch = smoothstep(0.32, 0.62, n);
    vec3 color = mix(uColorCore, uColorEmber, gasPatch);

    // A rare, sharp amber sparkle on top of the gas — embedded points of
    // light rather than more gas, which is what keeps the cloud from reading
    // as a flat colour wash.
    float sparkle = step(0.94, vSeed);
    color = mix(color, uColorAccent, sparkle);

    // Depth fade keeps the far field from turning into grey soup. Base
    // alpha is deliberately low — with points this large and this softly
    // edged, density comes from additive overlap building brightness where
    // the cloud is thick, not from any single point being opaque.
    alpha *= mix(0.09, 0.5, vDepth) * mix(1.0, 0.4, uProgress);
    alpha *= mix(0.7, 1.15, sparkle);

    gl_FragColor = vec4(color, alpha);
  }
`
