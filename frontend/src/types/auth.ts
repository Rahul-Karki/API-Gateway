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

