import React from "react";
import FloatingRupees from "../components/FloatingRupees";

export default function Login() {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogle = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-6" style={{ background: "#0a0a0a" }} data-testid="login-page">
      <FloatingRupees count={18} />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at top, rgba(59,130,246,0.10), transparent 60%)"
      }} />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="text-[10px] tracking-[0.4em] uppercase text-[#666] font-semibold mb-4">Peer lending recovery</div>

        <h1 className="wordmark text-6xl sm:text-7xl font-black tracking-tighter leading-none">
          NEXUS
          <span className="text-[#3b82f6] ml-2 not-italic" style={{ WebkitTextFillColor: "#3b82f6" }}>001</span>
        </h1>

        <p className="mt-5 text-lg text-[#bdbdbd] font-medium">
          Your money. Your terms. <span className="text-white">No awkward asks.</span>
        </p>
        <p className="mt-2 text-sm text-[#666] max-w-sm mx-auto">
          Track informal loans with friends, send polite reminders, and get paid back via UPI — all in one place.
        </p>

        <button
          onClick={handleGoogle}
          data-testid="google-login-btn"
          className="mt-10 mx-auto flex items-center justify-center gap-3 w-full max-w-xs px-5 py-3.5 rounded-2xl bg-white text-[#0a0a0a] font-semibold hover:bg-[#f3f4f6] transition active:translate-y-px"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c11.4 0 19.1-8 19.1-19.5 0-1.2-.1-2.3-.5-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 18.9 13 24 13c3.1 0 5.8 1.2 8 3.1l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 43.5c4.9 0 9.4-1.9 12.7-4.9l-5.9-5c-2 1.4-4.4 2.2-6.8 2.2-5.3 0-9.8-3.4-11.4-8l-6.5 5C9.6 39.2 16.2 43.5 24 43.5z"/>
            <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l5.9 5c4-3.7 6.4-9.2 6.4-15.5 0-1.2-.1-2.3-.5-3z"/>
          </svg>
          Continue with Google
        </button>

        <div className="mt-5 text-xs text-[#666] flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] inline-block" />
          Login required to prevent ghosted borrowers
        </div>
      </div>
    </div>
  );
}
