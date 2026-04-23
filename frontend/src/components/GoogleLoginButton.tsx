import { memo } from "react"
import { GoogleLogin } from "@react-oauth/google"
import { useNavigate } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"
import apiClient from "@/services/apiClient"

type GoogleAuthButtonProps = {
  className?: string
}

const GoogleAuthButton = ({ className }: GoogleAuthButtonProps) => {
  const navigate = useNavigate()
  const { setUser, setIsAuthenticated } = useAuth()

  return (
    <div className={`google-wrapper ${className || ""}`}>
      <div className="google-frame">
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            try {
              if (!credentialResponse.credential) {
                alert("Google login failed")
                return
              }

              await apiClient.post(
                "/api/auth/google-login",
                { token: credentialResponse.credential },
                { withCredentials: true }
              )

              const userRes = await apiClient.get("/api/auth/me")
              setUser(userRes.data.user)
              setIsAuthenticated(true)

              navigate("/api-tester")
            } catch (err: any) {
              alert(err.response?.data?.message || "Google login failed")
            }
          }}
          onError={() => console.log("Login Failed")}
          theme="outline"
          size="large"
          shape="rectangular"
          text="signin_with"
          width={280}
        />
      </div>
    </div>
  )
}

export default memo(GoogleAuthButton)