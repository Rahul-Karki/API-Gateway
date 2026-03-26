import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiClient from "@/services/apiClient";

const ProtectedRoute = ({ children }: any) => {
  const { user, setUser, loading, setLoading } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await apiClient.get("/api/users/me");
        setUser(res.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (!user) checkAuth();
  }, []);


  if (!user) return <Navigate to="/login" />;

  return children;
};

export default ProtectedRoute;