import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import toast from "react-hot-toast"
import apiClient from "@/services/apiClient"

export default function ResetPasswordForm() {
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [message, setMessage] = useState<string>("")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)

  const navigate = useNavigate()
  const token = new URLSearchParams(useLocation().search).get("token")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 8) {
      toast.error("Please enter password of atleast 8 characters")
      setMessage("Please enter password of atleast 8 characters")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      setMessage("Passwords do not match")
      return
    }

    try {
      await apiClient.post("/api/auth/reset-password", {
        token,
        password,
        confirmPassword,
      })

      toast.success("Password updated successfully! Redirecting to login...")
      setMessage("Password updated successfully")

      setTimeout(() => {
        navigate("/login")
      }, 1500)
    } catch (err) {
      toast.error("Invalid or expired link")
      setMessage("Invalid or expired link")
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Glow */}
        <div className="glow glow-1" />
        <div className="glow glow-2" />

        {/* Header */}
        <div className="login-header">
          <h2 className="font-display">Reset Password</h2>
          <p>Enter your new password below</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* PASSWORD */}
          <div className="field">
            <label>New Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: "100%", paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#4a5568",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <span className="field-hint">
              Must be at least 8 characters
            </span>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="field">
            <label>Confirm Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ width: "100%", paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#4a5568",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0",
                }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* MESSAGE */}
          {message && <div className="message">{message}</div>}

          {/* BUTTON */}
          <button type="submit" className="login-btn">
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
}