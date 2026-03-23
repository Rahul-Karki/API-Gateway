import  apiClient  from "./apiClient";
import { type LoginRequest, type AuthResponse } from  "../types/auth";

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiClient.post("/api/users/login", data);
  return res.data;
}