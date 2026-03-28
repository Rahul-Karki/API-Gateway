import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")

  const navigate = useNavigate()
  const token = new URLSearchParams(useLocation().search).get("token")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ Check passwords match
    if (password !== confirmPassword) {
      setMessage("Passwords do not match")
      return
    }

    try {
      await axios.post("http://localhost:8080/api/auth/reset-password", {
        token,
        password,
        confirmPassword,
      })

      setMessage("Password updated successfully")

      // ✅ Redirect after 2 sec
      setTimeout(() => {
        navigate("/") // or "/login"
      }, 1500)

    } catch (err) {
      setMessage("Invalid or expired link")
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Enter new password</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>

              {/* NEW PASSWORD */}
              <Field>
                <FieldLabel htmlFor="password">New Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              {/* CONFIRM PASSWORD */}
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm New Password
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>

              {/* MESSAGE */}
              {message && (
                <p className="text-sm text-center text-red-500">
                  {message}
                </p>
              )}

              {/* BUTTON */}
              <Field>
                <Button type="submit">Update Password</Button>
              </Field>

            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}