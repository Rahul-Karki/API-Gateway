import { Navigate } from "react-router-dom"
import { ReactNode } from "react"
import { useAuth } from "../context/AuthContext"

type ProtectedRouteProps = {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth()

  // ⏳ wait for auth check
  if (loading) {
    return <></>
  }

  // ❌ not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // ✅ logged in
  return <>{children}</>
}

export default ProtectedRoute