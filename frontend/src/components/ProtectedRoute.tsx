import { Navigate } from "react-router-dom"
import { ReactNode } from "react"
import { useAuth } from "../context/AuthContext"

type ProtectedRouteProps = {
  children: ReactNode
}

function LoadingSpinner() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#050814",
      color: "#00ffaa",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      gap: 12,
    }}>
      <span style={{
        width: 16, height: 16,
        border: "2px solid rgba(0,255,170,0.2)",
        borderTopColor: "#00ffaa",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <span>Verifying session...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute