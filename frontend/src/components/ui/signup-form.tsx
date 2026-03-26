import { useState } from "react"
import { useNavigate } from "react-router-dom"

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
import GoogleAuthButton from "./GoogleLoginButton"

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {

  const navigate = useNavigate()
  const { setUser } = useAuth()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  // =========================
  // HANDLE INPUT
  // =========================
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ validations
    if (formData.password.length < 8) {
      setMessage("Password must be at least 8 characters long")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match")
      return
    }

    try {
      setLoading(true)

      const res = await apiClient.post("/api/auth/signup", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      })

      // ✅ store access token
      setAccessToken(res.data.accessToken)

      // ✅ fetch user
      const userRes = await apiClient.get("/api/auth/me")

      // ✅ set user in context
      setUser(userRes.data.user)

      setMessage("Signup successful")
      alert("Login suucees");
      // ✅ redirect
      navigate("/home")

    } catch (err: any) {
      setMessage(err.response?.data?.message || "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // UI
  // =========================
  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>

            {/* NAME */}
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Field>

            {/* EMAIL */}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <FieldDescription>
                We’ll never share your email.
              </FieldDescription>
            </Field>

            {/* PASSWORD */}
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>

            {/* CONFIRM PASSWORD */}
            <Field>
              <FieldLabel htmlFor="confirmPassword">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
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
                {loading ? "Creating..." : "Create Account"}
              </Button>

              <GoogleAuthButton />

              <FieldDescription className="text-center">
                Already have an account?{" "}
                <a href="/login">Sign in</a>
              </FieldDescription>
            </Field>

          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}