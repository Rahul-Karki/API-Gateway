import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect } from "react";
import { toast } from "react-toastify";
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
import { initializeToast } from "./utils/toastNotifier";



function App() {
  useEffect(() => {
    initializeToast(toast);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
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
