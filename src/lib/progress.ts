/**
 * Page-wide scroll progress (0..1), written by a single ScrollTrigger in App
 * and read every frame by the WebGL scene.
 *
 * A plain module object rather than state or context: the shader samples it in
 * useFrame, and pushing it through React would re-render the tree ~60x/sec.
 */
export const scrollProgress = { value: 0 }
