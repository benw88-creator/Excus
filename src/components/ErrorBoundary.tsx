import { Component, type ReactNode } from 'react'

type Props = { fallback: ReactNode; children: ReactNode }
type State = { hasError: boolean }

/**
 * Catches a render-time throw — a WebGL context that fails to create, a lazy
 * chunk that fails to fetch — and degrades to `fallback` instead of taking
 * down everything mounted above it. Error boundaries only catch render and
 * lifecycle errors, never promise rejections or event handlers, which is why
 * this is placed around render-time risk specifically (the WebGL scene,
 * and the whole app as a last resort) rather than wired to window.onerror.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
