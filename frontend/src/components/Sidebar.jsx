import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ListChecks, Megaphone, BarChart3, Settings, LogOut, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/transactions", label: "Transactions", icon: ListChecks, testid: "nav-transactions" },
  { to: "/nudge", label: "Nudge Center", icon: Megaphone, testid: "nav-nudge" },
  { to: "/insights", label: "Insights", icon: BarChart3, testid: "nav-insights" },
  { to: "/settings", label: "Settings", icon: Settings, testid: "nav-settings" },
];

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="h-full w-[260px] shrink-0 flex flex-col" style={{ background: "#0c0c0c", borderRight: "1px solid #1a1a1a" }} data-testid="sidebar">
      <div className="px-5 py-6 border-b" style={{ borderColor: "#1a1a1a" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
            <Wallet size={16} color="#fff" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-tight">NEXUS 001</div>
            <div className="text-[10px] text-[--text-muted] tracking-[0.2em] uppercase" style={{ color: "#666" }}>Lending Tracker</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            onClick={onNavigate}
            data-testid={it.testid}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <it.icon size={18} />
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: "#1a1a1a" }}>
        <button onClick={() => navigate("/settings")} data-testid="sidebar-user" className="w-full text-left flex items-center gap-3 p-2 rounded-xl hover:bg-[#161616] transition">
          {user?.picture ? (
            <img src={user.picture} alt="" className="w-9 h-9 rounded-full" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#1a1a1a]" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user?.name || "—"}</div>
            <div className="text-xs text-[#888] truncate">{user?.upi_id || user?.email}</div>
          </div>
        </button>
        <button onClick={logout} data-testid="logout-btn" className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-[#bbb] hover:bg-[#161616] transition">
          <LogOut size={14} /> Logout
        </button>
      </div>
    </aside>
  );
}
