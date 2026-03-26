import  apiClient  from "./apiClient";
import { type AuthResponse, type SignupRequest } from  "../types/auth";

export async function signup(data: SignupRequest): Promise<AuthResponse> {
  const res = await apiClient.post("/api/auth/signup", data);
  return res.data;
}