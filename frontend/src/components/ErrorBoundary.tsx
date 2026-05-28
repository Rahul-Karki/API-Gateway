import { Component, ReactNode, ErrorInfo } from "react"

type Props = { children: ReactNode }
type State = { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#050814",
          color: "#fff",
          fontFamily: "'JetBrains Mono', monospace",
          padding: 40,
          textAlign: "center",
          gap: 16,
        }}>
          <div style={{ fontSize: 48, color: "#f87171" }}>⚠</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f87171" }}>Something went wrong</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, maxWidth: 400, lineHeight: 1.6 }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              background: "linear-gradient(135deg, #00ffaa, #00ddff)",
              border: "none",
              borderRadius: 6,
              padding: "10px 24px",
              fontSize: 12,
              fontFamily: "inherit",
              fontWeight: 700,
              color: "#050814",
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}