import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/services/authApi";
import { setAccessToken } from "@/utils/storage";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import apiClient from "@/services/apiClient";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

   const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const navigate = useNavigate();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

   async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const res = await apiClient.post("/api/users/login", {
        email: formData.email,
        password: formData.password,
      })

      setAccessToken(res.data.accessToken);
      console.log(res.data)

      
      alert("Login successful")
      navigate("/home") 

    } catch (err: any) {
      console.error(err)
      if (err.response) {
        alert(err.response.data.message || "Login failed")
      } else {
        alert("Server not reachable")
      }
    }
  }


  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid w-full gap-6">
            <FieldGroup>
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
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
              </Field>
              <Field>
                <Button type="submit">Login</Button>
                <Button variant="outline" type="button">
                  Login with Google
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="/">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
