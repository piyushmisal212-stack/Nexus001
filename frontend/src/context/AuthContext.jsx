import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setAuthToken } from "../api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
      return r.data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // CRITICAL: skip /me if returning from OAuth callback (AuthCallback handles it)
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setAuthToken(null);
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, refresh, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
