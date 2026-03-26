import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { setAccessToken } from "@/utils/storage";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/apiClient";

const GoogleAuthButton = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        try {
          const res = await apiClient.post(
            "/api/auth/google-login",
            {
              token: credentialResponse.credential,
            },
            { withCredentials: true }
          );

          // ✅ 1. Save access token
          setAccessToken(res.data.accessToken);

          // ✅ 2. Fetch user
          const userRes = await apiClient.get("/api/auth/me");

          // ✅ 3. Set user in context
          setUser(userRes.data.user);

          alert("Okk ho gaya ji !!")
          // ✅ 4. Navigate properly
          navigate("/home");

        } catch (err: any) {
          console.error(err);
          alert(err.response?.data?.message || "Google login failed");
        }
      }}
      onError={() => {
        console.log("Login Failed");
      }}
    />
  );
};

export default GoogleAuthButton;