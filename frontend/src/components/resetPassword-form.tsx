import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import apiClient from "@/services/apiClient"
import { isStrongPassword } from "@/utils/regex"
import { getPasswordStrength } from "@/utils/strength"

export default function ResetPasswordForm() {
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [message, setMessage] = useState<string>("")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)
  const [passwordStrength, setPasswordStrength] = useState<number>(0)

  const navigate = useNavigate()
  const token = new URLSearchParams(useLocation().search).get("token")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 8) {
      setMessage("Please enter password of atleast 8 characters")
      return
    }

    if (!isStrongPassword(password)) {
      setMessage("Password must contain uppercase, lowercase, number, and special character (@$!%*?&)")
      return
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match")
      return
    }

    try {
      await apiClient.post("/api/auth/reset-password", {
        token,
        password,
        confirmPassword,
      })

      setMessage("Password updated successfully")

      setTimeout(() => {
        navigate("/login")
      }, 1500)
    } catch (err) {
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordStrength(getPasswordStrength(e.target.value));
                }}
                required
                style={{ width: "100%", paddingRight: "40px" }}
                placeholder="Min 8 chars, uppercase, lowercase, number, symbol"
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
            
            {/* Password Strength Meter */}
            {password && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      style={{
                        height: "4px",
                        flex: 1,
                        borderRadius: "2px",
                        background:
                          level <= passwordStrength
                            ? passwordStrength === 1
                              ? "#ef4444"
                              : passwordStrength === 2
                              ? "#f97316"
                              : passwordStrength === 3
                              ? "#eab308"
                              : "#22c55e"
                            : "#e5e7eb",
                        transition: "all 0.3s ease",
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: "12px", color: "#4a5568" }}>
                  {passwordStrength === 1 && "Weak password"}
                  {passwordStrength === 2 && "Fair password"}
                  {passwordStrength === 3 && "Good password"}
                  {passwordStrength === 4 && "✓ Strong password"}
                </div>
              </div>
            )}
            
            <span className="field-hint">
              Must be: 8+ chars, uppercase, lowercase, number, symbol (@$!%*?&)
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