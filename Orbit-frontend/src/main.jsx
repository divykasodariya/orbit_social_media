// ============================================
// FIXED main.jsx - Remove StrictMode During Debug
// ============================================

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  // ❌ TEMPORARILY REMOVE StrictMode to debug
  // <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  // </React.StrictMode>
);

// ✅ NOTE: You can add StrictMode back after fixing the infinite loop
// StrictMode is only for development - it doesn't affect production builds