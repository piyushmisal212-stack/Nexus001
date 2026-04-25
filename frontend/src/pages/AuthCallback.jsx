import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { setAuthToken } from "../api";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const session_id = params.get("session_id");

    if (!session_id) {
      navigate("/", { replace: true });
      return;
    }

    (async () => {
      try {
        const r = await api.post("/auth/session", { session_id });
        setAuthToken(r.data.session_token);
        setUser(r.data.user);
        // clean URL
        window.history.replaceState({}, "", "/dashboard");
        if (!r.data.user?.onboarded) {
          navigate("/onboarding", { replace: true, state: { user: r.data.user } });
        } else {
          navigate("/dashboard", { replace: true, state: { user: r.data.user } });
        }
      } catch (e) {
        navigate("/", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
      <div className="text-[#666] text-sm">Signing you in…</div>
    </div>
  );
}
