import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import "./global.css"
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import ForgotPassword from "./pages/ResetPassword";
import FeaturesPage from "./pages/FeaturesPage";



function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1e293b",
            color: "#f1f5f9",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "16px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
            fontFamily: "inherit",
          },
          success: {
            icon: "✓",
            style: {
              background: "#064e3b",
              color: "#86efac",
              border: "1px solid #22c55e",
            },
          },
          error: {
            icon: "✕",
            style: {
              background: "#7f1d1d",
              color: "#fca5a5",
              border: "1px solid #ef4444",
            },
          },
          loading: {
            style: {
              background: "#1e3a8a",
              color: "#93c5fd",
              border: "1px solid #3b82f6",
            },
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                  <Home />
              </ProtectedRoute>
            }
          />
          <Route path="/reset-password" element={<ForgotPassword />} />
          <Route path="/features" element={<FeaturesPage/>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
