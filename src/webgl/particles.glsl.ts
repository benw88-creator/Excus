/**
 * Shared GLSL for the hero field. Kept as strings (rather than .glsl files) so
 * there's no extra Vite plugin in the build for two shaders.
 *
 * Physics — the spring-to-target, cursor repulsion and turbulence that decide
 * where each particle actually sits — all happens on the CPU in
 * ParticleField's useFrame, once per particle, so the same simulation governs
 * both the nebula and the particles currently spelling the word. What's left
 * here is purely decorative motion layered on top of that simulated position:
 * ambient flow noise, colour, and the pointer-parallax/late-scroll recede
 * that were always cheaper as a per-vertex shader pass than as CPU work.
 */

export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;   // 0 at hero, 1 by the closing section — drives
                              // the late-page collapse/recede below only;
                              // the word-formation blend lives on the CPU.
  uniform vec2  uPointer;    // -1..1, already smoothed on the CPU
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uNoiseScale; // frequency of the low-frequency colour-patch noise

  attribute float aScale;
  attribute float aSeed;

  varying float vSeed;
  varying float vScale;
  varying float vDepth;
  // Low-frequency noise sampled once per particle at its simulated position,
  // so colour reads as soft drifting patches of gas rather than per-particle
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
    vScale = aScale;
    vec3 pos = position;

    // Slow ambient drift — the field is never completely still, even where
    // the CPU simulation has a particle held at rest.
    float t = uTime * 0.06;
    vec3 flow = vec3(
      noise(pos * 0.28 + vec3(t, 0.0, 0.0)),
      noise(pos * 0.28 + vec3(0.0, t, 12.7)),
      noise(pos * 0.22 + vec3(4.3, 0.0, t))
    );
    pos += flow * 0.45;

    // Sampled at a much slower time rate and a different frequency/offset
    // than the flow noise above, so the colour patches drift independently
    // of the positional drift instead of looking locked to it.
    vColorNoise = noise(pos * uNoiseScale + vec3(31.7, -9.2, uTime * 0.015));

    // Pointer parallax, weighted by depth so near particles move more. Purely
    // decorative — a uniform shift shared by every particle, so it moves the
    // word exactly as much as the field around it and never threatens
    // legibility.
    float depthWeight = smoothstep(-6.0, 6.0, pos.z);
    pos.xy += uPointer * (0.6 + depthWeight * 1.4);

    // As the page progresses past the word-formation range, the whole cloud
    // collapses toward the axis and recedes, so the closing section inherits
    // a calmer version of the same field.
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

  uniform vec3  uColorCore;   // deep space blue — the bulk of the gas
  uniform vec3  uColorViolet; // purple/violet patches
  uniform vec3  uColorSpark;  // bright white-blue points of light
  uniform float uProgress;

  varying float vSeed;
  varying float vScale;
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
    // remap to 0..1 first and threshold around its natural midpoint.
    float n = vColorNoise * 0.5 + 0.5;
    float gasPatch = smoothstep(0.32, 0.62, n);
    vec3 color = mix(uColorCore, uColorViolet, gasPatch);

    // A rare, sharp white-blue sparkle on top of the gas — embedded points of
    // light rather than more gas, which is what keeps the cloud from reading
    // as a flat colour wash.
    float sparkle = step(0.94, vSeed);
    color = mix(color, uColorSpark, sparkle);

    // Larger particles read as slightly brighter/closer, smaller ones as
    // dimmer background wisps — density variation instead of a uniform field.
    float sizeBrightness = mix(0.65, 1.25, smoothstep(0.3, 1.8, vScale));

    // Depth fade keeps the far field from turning into grey soup. Base
    // alpha is deliberately low — with points this large and this softly
    // edged, density comes from additive overlap building brightness where
    // the cloud is thick, not from any single point being opaque.
    alpha *= mix(0.08, 0.42, vDepth) * mix(1.0, 0.4, uProgress) * sizeBrightness;
    alpha *= mix(0.7, 1.3, sparkle);

    gl_FragColor = vec4(color, alpha);
  }
`
