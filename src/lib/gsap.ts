import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

// Registered once here; every component imports from this module so plugins
// are never double-registered across HMR boundaries.
gsap.registerPlugin(ScrollTrigger, useGSAP)

export { gsap, ScrollTrigger, useGSAP }

// Dev-only handle so timelines can be inspected from the console.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).gsap = gsap
  ;(window as unknown as Record<string, unknown>).ScrollTrigger = ScrollTrigger
}
