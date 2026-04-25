import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Nudge from "./pages/Nudge";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
import Layout from "./components/Layout";
import { Toaster } from "./components/ui/sonner";

function Protected({ children, requireOnboarding = true }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}><div className="text-[#666] text-sm">Loading…</div></div>;
  if (!user) return <Navigate to="/" replace />;
  if (requireOnboarding && !user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user && user.onboarded) return <Navigate to="/dashboard" replace />;
  if (user && !user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Process Emergent OAuth callback first (URL fragment) — before route matching
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  return (
    <Routes>
      <Route path="/" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/onboarding" element={<Protected requireOnboarding={false}><Onboarding /></Protected>} />
      <Route path="/dashboard" element={<Protected><Layout><Dashboard /></Layout></Protected>} />
      <Route path="/transactions" element={<Protected><Layout><Transactions /></Layout></Protected>} />
      <Route path="/nudge" element={<Protected><Layout><Nudge /></Layout></Protected>} />
      <Route path="/insights" element={<Protected><Layout><Insights /></Layout></Protected>} />
      <Route path="/settings" element={<Protected><Layout><Settings /></Layout></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster theme="dark" position="bottom-right" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
