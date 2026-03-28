import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import axios from "axios"
import { AuthContextType , User } from "@/types/auth"

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
        const res = await axios.get<{ user: User }>("/api/auth/me", {
          withCredentials: true,
        })

        setUser(res.data.user)
        setIsAuthenticated(true)
      } catch (error) {
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false) // 🔥 critical
      }
    }

    fetchUser()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        setUser,
        setIsAuthenticated,
      }}
    >
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