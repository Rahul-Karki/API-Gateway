import { useEffect, useRef, useState } from "react"
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
  const hostRef = useRef<HTMLDivElement>(null)
  const [btnWidth, setBtnWidth] = useState<number>(320)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setBtnWidth(Math.max(240, Math.floor(w)))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={hostRef} className={`google-wrapper ${className || ""}`}>
      <div className="google-frame">
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            try {
              await apiClient.post(
                "/api/auth/google-login",
                { token: credentialResponse.credential },
                { withCredentials: true }
              )

              const userRes = await apiClient.get("/api/auth/me")
              setUser(userRes.data.user)
              setIsAuthenticated(true)

              navigate("/home")
            } catch (err: any) {
              alert(err.response?.data?.message || "Google login failed")
            }
          }}
          onError={() => console.log("Login Failed")}
          theme="filled_black"
          size="large"
          shape="pill"
          text="continue_with"
          width={btnWidth}
        />
      </div>
    </div>
  )
}

export default GoogleAuthButton