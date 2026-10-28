import { Component, type ReactNode } from 'react'

type Props = { fallback: ReactNode; children: ReactNode }
type State = { hasError: boolean }

/**
 * Catches a render-time throw and degrades to `fallback` instead of taking
 * down everything mounted above it. Used once, at the top of main.tsx, as a
 * last resort against anything unexpected crashing the whole app — error
 * boundaries only catch render and lifecycle errors, never promise
 * rejections or event handlers, which is why this isn't wired to
 * window.onerror instead.
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
