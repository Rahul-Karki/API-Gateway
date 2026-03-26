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
import GoogleAuthButton from "./GoogleLoginButton"

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {

   const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if(formData.password.length < 8) {
      alert("Password must be at least 8 characters long")
      return
    }

    if(formData.password !== formData.confirmPassword) {
      alert("Passwords do not match")
      return
    }

    try {
      const res = await apiClient.post("/api/users/signup", {
       name: formData.name,
      email: formData.email,
      password: formData.password,
      })

      console.log(res.data)
      setAccessToken(res.data.accessToken)

      alert("Signup successful")

      navigate("/home")
     

    } catch (err) {
      console.error(err)
      alert("Something went wrong")
    }
  }

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
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input id="name" type="text" placeholder="John Doe" onChange={handleChange} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                onChange={handleChange}
                required
              />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password"  value={formData.password} onChange={handleChange} required />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input id="confirmPassword" type="password"  value={formData.confirmPassword}    onChange={handleChange} required />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit">Create Account</Button>
                <GoogleAuthButton />
                <FieldDescription className="px-6 text-center">
                  Already have an account? <a href="/login">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
