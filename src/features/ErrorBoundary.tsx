import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed)
      return (
        <main className="mx-auto max-w-xl space-y-4 p-8">
          <h1 className="font-display text-2xl">Could not open this screen</h1>
          <p>Reload the app to try again.</p>
          <button
            type="button"
            className="rounded-full bg-indigo px-4 py-2 text-paper"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </main>
      )
    return this.props.children
  }
}
