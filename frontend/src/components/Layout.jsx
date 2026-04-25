import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";
import { Toaster } from "../components/ui/sonner";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a0a" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="relative">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#1a1a1a" }}>
          <button onClick={() => setMobileOpen(true)} data-testid="mobile-menu-btn" className="p-2 rounded-lg bg-[#111]">
            <Menu size={18} />
          </button>
          <div className="font-bold tracking-wider text-sm">NEXUS 001</div>
          <div className="w-9" />
        </header>
        <div className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </div>
      </main>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
