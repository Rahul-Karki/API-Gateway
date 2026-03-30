import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { Sparkles } from "lucide-react"

import apiClient from "@/services/apiClient"
import { useAuth } from "@/context/AuthContext"
import GoogleAuthButton from "./GoogleLoginButton"
import { Link } from "react-router-dom"

type FormData = {
  email: string
  password: string
}

export default function LoginForm() {
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  })

  const [message, setMessage] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [timer, setTimer] = useState<number>(0)

  // =========================
  // INPUT CHANGE
  // =========================
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  // =========================
  // LOGIN
  // =========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setMessage("Please enter email and password")
      return
    }

    setLoading(true);
    setMessage("");

    try {
    await apiClient.post("/api/auth/login", formData)

      const userRes = await apiClient.get("/api/auth/me")
      setUser(userRes.data.user)

      setMessage("Login successful")
      navigate("/home")
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // TIMER
  // =========================
  const startTimer = () => {
    setTimer(60)
  }

  useEffect(() => {
    if (timer === 0) return

    const id = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [timer])

  // =========================
  // FORGOT PASSWORD
  // =========================
  const handleForgotPassword = async () => {
    if (!formData.email) {
      setMessage("Please enter your email first")
      return
    }
    setMessage("");

    try {
      setLoading(true)

      await apiClient.post("/api/auth/forgot-password", {
        email: formData.email,
      })
      console.log('Forgot password request successful',formData.email);
      setMessage("Check your email for reset link")
      startTimer()
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Glow effects */}
        <div className="glow glow-1" />
        <div className="glow glow-2" />

        {/* Header */}
        <div className="login-header">
          <div className="icon-box">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="font-display">Welcome back</h2>
            <p>Sign in to continue</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* EMAIL */}
          <div className="field">
            <label>Email</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* PASSWORD */}
          <div className="field">
            <div className="field-row">
              <label>Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || timer > 0}
              >
                {timer > 0 ? `Resend in ${timer}s` : "Forgot?"}
              </button>
            </div>

            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {/* MESSAGE */}
          {message && <div className="message">{message}</div>}

          {/* BUTTON */}
          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "Logging in..." : "Sign in"}
          </button>

          {/* Divider */}
          <div className="divider">
            <span>or continue with</span>
          </div>

          {/* Google */}
          <GoogleAuthButton />
         <p className="signup-text">
  Already have an account?{" "}
  <Link to="/signup" className="signup-link">
    Sign up
  </Link>
</p>
         
   </form>
      </div>
    </div>
  )
}