import { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import apiClient from "@/services/apiClient"
import { setAccessToken } from "@/utils/storage"
import { useAuth } from "@/context/AuthContext"
import GoogleAuthButton from "./ui/GoogleLoginButton"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState(0)

  // =========================
  // HANDLE INPUT CHANGE
  // =========================
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
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

    try {
      setLoading(true)

      const res = await apiClient.post("/api/auth/login", formData)

      // ✅ store access token
      setAccessToken(res.data.accessToken)

      // ✅ get user
      const userRes = await apiClient.get("/api/auth/me")
      setUser(userRes.data.user)

      setMessage("Login successful")

      alert("Login suucees");

      // ✅ redirect
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

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // =========================
  // FORGOT PASSWORD
  // =========================
  const handleForgotPassword = async () => {
    if (!formData.email) {
      setMessage("Please enter your email first")
      return
    }

    try {
      setLoading(true)

      await axios.post("http://localhost:8080/api/auth/forgot-password", {
        email: formData.email,
      })

      setMessage("Check your email for reset link")
      startTimer()

    } catch (err: any) {
      setMessage(err.response?.data?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // UI
  // =========================
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6">
            <FieldGroup>

              {/* EMAIL */}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </Field>

              {/* PASSWORD */}
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading || timer > 0}
                    className="ml-auto text-sm text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {timer > 0
                      ? `Resend in ${timer}s`
                      : "Forgot your password?"}
                  </button>
                </div>

                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
              </Field>

              {/* MESSAGE */}
              {message && (
                <p className="text-sm text-center text-green-600">
                  {message}
                </p>
              )}

              {/* BUTTONS */}
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>

                <GoogleAuthButton />

                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <a href="/signup">Sign up</a>
                </FieldDescription>
              </Field>

            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}