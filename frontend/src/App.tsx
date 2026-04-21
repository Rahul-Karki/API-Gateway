import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/api-tester"
            element={
              <ProtectedRoute>
                  <Home />
              </ProtectedRoute>
            }
          />
          <Route path="/home" element={<Navigate to="/api-tester" replace />} />
          <Route path="/reset-password" element={<ForgotPassword />} />
          <Route path="/features" element={<FeaturesPage/>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
