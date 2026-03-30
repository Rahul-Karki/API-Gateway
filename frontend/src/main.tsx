import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MantineProvider } from "@mantine/core";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";

console.log("Google Client ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <React.StrictMode>
      <AuthProvider>
        <MantineProvider>
          <App />
        </MantineProvider>
      </AuthProvider>
    </React.StrictMode>
  </GoogleOAuthProvider>
);