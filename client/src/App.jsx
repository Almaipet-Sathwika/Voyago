import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import HostDashboard from "./pages/HostDashboard.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import ChatBot from "./components/ChatBot.jsx";

function DocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith("/stayora")) document.title = "Stayora · Voyago";
    else if (pathname.startsWith("/tripora")) document.title = "Tripora · Voyago";
    else if (pathname.startsWith("/login")) document.title = "Log in · Voyago";
    else if (pathname.startsWith("/register")) document.title = "Sign up · Voyago";
    else if (pathname.startsWith("/my-bookings")) document.title = "My bookings · Voyago";
    else if (pathname.startsWith("/host")) document.title = "Host · Voyago";
    else document.title = "Voyago";
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <DocumentTitle />
      <Navbar />
      <ChatBot />
      <Routes>
        <Route path="/" element={<Navigate to="/tripora" replace />} />
        <Route path="/tripora" element={<Home />} />
        <Route path="/stayora" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/host" element={<HostDashboard />} />
      </Routes>
    </div>
  );
}
