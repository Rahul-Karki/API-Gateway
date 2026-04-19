import {
  createContext,
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

// ✅ Provider props
type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiClient.get<{ user: User }>("/api/auth/me", {
          withCredentials: true,
        })
        setUser(res.data.user)
        setIsAuthenticated(true)
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined

        if (status === 401 || status === 403) {
          try {
            await apiClient.post("/api/refresh", {})

            const retryRes = await apiClient.get<{ user: User }>("/api/auth/me", {
              withCredentials: true,
            })

            setUser(retryRes.data.user)
            setIsAuthenticated(true)
            return
          } catch {
            setUser(null)
            setIsAuthenticated(false)
          }
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  // ✅ Only re-renders consumers when user, isAuthenticated, or loading actually changes
  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      loading,
      setUser,
      setIsAuthenticated,
    }),
    [user, isAuthenticated, loading]
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