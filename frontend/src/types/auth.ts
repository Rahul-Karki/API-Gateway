export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    name: string;
    email: string;
    password: string;
}   

export interface AuthResponse {
  message?: string;
}

export type User = {
  _id: string
  name: string
  email: string
}

// ✅ Context type
export type AuthContextType = {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  sessionChecked: boolean
  logout: () => Promise<void>
  setUser: React.Dispatch<React.SetStateAction<User | null>>
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
}
