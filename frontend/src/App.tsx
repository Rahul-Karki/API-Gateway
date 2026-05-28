import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import "./global.css"

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Home = lazy(() => import("./pages/Home"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const ForgotPassword = lazy(() => import("./pages/ResetPassword"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));

const PAGE_LOADING = (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#050814",
    color: "#00ffaa",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
  }}>
    <span style={{
      width: 16, height: 16,
      border: "2px solid rgba(0,255,170,0.2)",
      borderTopColor: "#00ffaa",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      marginRight: 12,
      display: "inline-block",
    }} />
    Loading...
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={PAGE_LOADING}>
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
              <Route path="/features" element={<FeaturesPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
