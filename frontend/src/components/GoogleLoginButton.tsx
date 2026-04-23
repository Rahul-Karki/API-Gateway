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
    <div
      className={className || ""}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        borderRadius: 12,
        padding: "2px 0",
      }}
    >
      <GoogleLogin
        type="standard"
        text="signin_with"
        size="large"
        shape="rectangular"
        width={320}
        logo_alignment="center"
        theme="filled_black"
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
        onError={() => {
          console.log("Login Failed")
        }}
      />
    </div>
  )
}

export default memo(GoogleAuthButton)