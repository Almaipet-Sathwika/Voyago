import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { AppModeProvider } from "./context/AppModeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppModeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppModeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
