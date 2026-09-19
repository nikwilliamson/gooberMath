import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Without this, any throw during render or an effect unmounts the React root
 * and the page just goes blank — which is untraceable on someone else's phone.
 * Show the error instead.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; stack: string }> {
  state = { error: null as Error | null, stack: '' }

  static getDerivedStateFromError(error: Error) {
    return { error, stack: '' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, stack: info.componentStack ?? '' })
  }

  render() {
    const { error, stack } = this.state
    if (!error) return this.props.children
    return (
      <div
        style={{
          minHeight: '100dvh',
          padding: '24px',
          background: '#080a10',
          color: '#f3f5fa',
          font: '600 13px/1.5 ui-monospace, monospace',
          overflow: 'auto',
        }}
      >
        <p style={{ color: '#f5b21f', fontSize: 16, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          GooberMath hit an error
        </p>
        <p style={{ color: '#ff8a94', whiteSpace: 'pre-wrap' }}>
          {error.name}: {error.message}
        </p>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#8a93a8', fontSize: 11 }}>{error.stack}</pre>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#5b6479', fontSize: 11 }}>{stack}</pre>
        <button
          onClick={() => {
            // A stale service worker can pin a broken build; clear it and reload.
            navigator.serviceWorker?.getRegistrations?.().then((rs) => rs.forEach((r) => void r.unregister()))
            caches?.keys?.().then((ks) => ks.forEach((k) => void caches.delete(k)))
            setTimeout(() => location.reload(), 250)
          }}
          style={{
            marginTop: 18, padding: '12px 18px', borderRadius: 12, border: 0,
            background: '#f5b21f', color: '#1a1204', fontWeight: 800, letterSpacing: '0.1em',
          }}
        >
          RESET AND RELOAD
        </button>
      </div>
    )
  }
}
