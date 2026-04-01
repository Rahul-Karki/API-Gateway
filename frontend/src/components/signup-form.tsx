import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import apiClient from "@/services/apiClient";
import { useAuth } from "@/context/AuthContext";
import GoogleAuthButton from "./GoogleLoginButton.tsx";
import { isStrongPassword } from "@/utils/regex";
import { getPasswordStrength } from "@/utils/strength";
import {} from "react-router-dom";

type FormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignupForm() {
  const navigate = useNavigate();
  const { setUser  } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordStrength, setPasswordStrength] = useState<number>(0);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Update password strength when password field changes
    if (name === "password") {
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      setMessage("Password must be at least 8 characters long");
      return;
    }

    if (!isStrongPassword(formData.password)) {
      setMessage("Password must contain uppercase, lowercase, number, and special character");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      await apiClient.post("/api/auth/signup", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      const userRes = await apiClient.get("/api/auth/me");
      setUser(userRes.data.user);
      navigate("/home");
     
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="font-display">Create Account</h2>
        <p className="subtitle">Start your journey</p>

        <form onSubmit={handleSubmit} className="login-form">
          {/* NAME */}
          <div className="field">
            <label>Full Name</label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* EMAIL */}
          <div className="field">
            <label>Email</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* PASSWORD */}
          <div className="field">
            <label>Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
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
            {formData.password && (
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
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="field">
            <label>Confirm Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
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
          <button className="login-btn" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>

          {/* GOOGLE */}
          <GoogleAuthButton />

          <p className="signup-text">
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
