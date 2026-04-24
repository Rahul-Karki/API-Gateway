import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from "react"
import axios from "axios"
import { AuthContextType , User } from "@/types/auth"
import apiClient from "@/services/apiClient"

// ✅ createContext with undefined (safe pattern)
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// React 18 StrictMode mounts, unmounts, and re-mounts components in dev.
// Keep the auth bootstrap single-flight so the initial refresh/me requests do not double-fire.
let hasBootstrappedSession = false

// ✅ Provider props
type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionChecked, setSessionChecked] = useState(false)

  const isPublicRoute = (pathname: string) => {
    return (
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/features" ||
      pathname === "/reset-password"
    )
  }

  useEffect(() => {
    if (hasBootstrappedSession) {
      return
    }

    hasBootstrappedSession = true

    const bootstrapSession = async () => {
      try {
        // First, try to refresh the session to get new tokens
        // This will fail silently if no valid refresh token exists (e.g., first visit)
        try {
          await apiClient.post("/api/refresh", {})
        } catch (_refreshError) {
          // Refresh failed or no session - continue to check if we have a session anyway
          // The /me endpoint will catch 401 and not retry (by design)
        }

        // Now try to fetch current user with potentially refreshed tokens
        const res = await apiClient.get<{ user: User }>("/api/auth/me", {
          withCredentials: true,
        })

        setUser(res.data.user)
        setIsAuthenticated(true)
      } catch (error) {
        // Failed to get user - no valid session
        const status = axios.isAxiosError(error) ? error.response?.status : undefined

        // For 401/403, this means refresh or auth failed
        if (status === 401 || status === 403) {
          setUser(null)
          setIsAuthenticated(false)
        } else if (status === 0) {
          // Network error - don't change state, might be a transient issue
          setUser(null)
          setIsAuthenticated(false)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      } finally {
        setLoading(false)
        setSessionChecked(true)
      }
    }

    bootstrapSession()
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/api/auth/logout", {})
    } finally {
      setUser(null)
      setIsAuthenticated(false)
    }
  }, [])

  // ✅ Only re-renders consumers when user, isAuthenticated, or loading actually changes
  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      loading,
      sessionChecked,
      logout,
      setUser,
      setIsAuthenticated,
    }),
    [user, isAuthenticated, loading, sessionChecked, logout]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ✅ custom hook (safe)
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}