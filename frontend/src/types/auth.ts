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
    accessToken: string;
}

export interface User{
    id: string
    email: string;
}

export type AuthContextType = {
  user: User | null;
  setUser: (user: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void; // ✅ ADD THIS
};